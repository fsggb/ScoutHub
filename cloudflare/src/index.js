// Serveur Cloudflare de ScoutHub (Workers + D1, plan gratuit).
//  POST /chat     : relais ChatGDB. Vérifie le jeton signé par le serveur ScoutHub (Apps Script), applique les limites
//                   de crédits, transmet la requête à Claude et renvoie la réponse au fil de l'eau ; la consommation
//                   est enregistrée dans D1 une fois la réponse terminée.
//  POST /credits  : crédits restants de la personne.
//  GET  /direct/{id} (WebSocket) : partage en direct de ScoutMap (itinéraire, azimuts, grand jeu) : positions, discussion,
//                   carte ; tout arrive déjà chiffré par le navigateur (la clé n'est que dans le lien), le serveur ne lit rien.
//  GET  /ign/{z}/{x}/{y}.jpg (ou /scan25/…, adresse attendue par ScoutMap) : tuile des cartes IGN (SCAN 25) ; la clé IGN est ajoutée ici et n'est jamais visible.
// Secrets : ANTHROPIC_KEY (clé Claude, jamais visible du navigateur), RELAIS_SECRET (partagé avec le serveur ScoutHub).
const MODELES = { "claude-haiku-5-5": [0.10, 0.50], "claude-sonnet-5-5": [2, 10] };   // $ par million de jetons (entrée, sortie)
const MAX_JETONS = 16000, CREDIT_DOLLARS = 0.001;

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const b64url = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

function cors(env, origine) {
  const ok = String(env.ORIGINES || "").split(",").map(s => s.trim()).filter(Boolean);
  return {
    "Access-Control-Allow-Origin": ok.includes(origine) ? origine : ok[0] || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-scouthub-jeton",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
// Jeton = charge (JSON en base64url : e = adresse, r = rôle, x = expiration) + "." + HMAC-SHA256 hexadécimal
async function verifierJeton(jeton, secret) {
  const [charge, signature] = String(jeton || "").split(".");
  if (!charge || !signature || !secret) return null;
  const cle = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const attendu = hex(await crypto.subtle.sign("HMAC", cle, enc.encode(charge)));
  if (attendu.length !== signature.length) return null;
  let diff = 0; for (let i = 0; i < attendu.length; i++) diff |= attendu.charCodeAt(i) ^ signature.charCodeAt(i);
  if (diff) return null;
  let p; try { p = JSON.parse(new TextDecoder().decode(b64url(charge))); } catch { return null; }
  return p && p.e && p.x > Date.now() ? p : null;
}
function cout(modele, u, recherches) {
  const p = MODELES[modele] || MODELES["claude-haiku-5-5"];
  const entree = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) * 1.25 + (u.cache_read_input_tokens || 0) * 0.1;
  const dollars = (entree * p[0] + (u.output_tokens || 0) * p[1]) / 1e6 + recherches * 0.01;
  return { dollars, credits: Math.max(1, Math.ceil(dollars / CREDIT_DOLLARS - 1e-9)) };
}
async function etatCredits(env, qui) {
  const email = qui.e, maintenant = Date.now(), h = (+env.FENETRE_HEURES || 5) * 3600000, sem = 7 * 86400000;
  const r = await env.DB.prepare(
    "SELECT COALESCE(SUM(CASE WHEN ts > ?2 THEN credits END), 0) AS fenetre, MIN(CASE WHEN ts > ?2 THEN ts END) AS premierF, " +
    "COALESCE(SUM(credits), 0) AS semaine, MIN(ts) AS premierS, COUNT(*) AS appels, COALESCE(SUM(entree), 0) AS entree, " +
    "COALESCE(SUM(sortie), 0) AS sortie, COALESCE(SUM(recherches), 0) AS recherches, COALESCE(SUM(dollars), 0) AS dollars FROM usage WHERE email = ?1 AND ts > ?3"
  ).bind(email, maintenant - h, maintenant - sem).first();
  const t = await env.DB.prepare("SELECT COUNT(*) AS appels, COALESCE(SUM(entree), 0) AS entree, COALESCE(SUM(sortie), 0) AS sortie, COALESCE(SUM(recherches), 0) AS recherches, COALESCE(SUM(dollars), 0) AS dollars FROM usage WHERE email = ?1").bind(email).first();
  const dans = ms => { const hh = Math.max(1, Math.round(ms / 3600000)); return hh >= 48 ? "dans " + Math.round(hh / 24) + " j" : "dans " + hh + " h"; };
  const bonus = Math.max(0, Math.min(+qui.b || 0, +env.BONUS_MAX || 40)), maxF = +env.CREDITS_FENETRE || 30, maxS = (+env.CREDITS_SEMAINE || 60) + bonus;
  const rond = x => Math.round(x * 10000) / 10000;
  return {
    illimite: qui.r === "admin",
    fenetre: { max: maxF, utilise: r.fenetre, reste: Math.max(0, maxF - r.fenetre), renouvellement: r.premierF ? dans(r.premierF + h - maintenant) : "à votre première question" },
    semaine: { max: maxS, utilise: r.semaine, reste: Math.max(0, maxS - r.semaine), bonus, renouvellement: r.premierS ? dans(r.premierS + sem - maintenant) : "à votre première question" },
    usage: { semaine: { appels: r.appels, entree: r.entree, sortie: r.sortie, recherches: r.recherches, dollars: rond(r.dollars) }, total: { appels: t.appels, entree: t.entree, sortie: t.sortie, recherches: t.recherches, dollars: rond(t.dollars) } },
    plafondDollars: rond(((+env.CREDITS_SEMAINE || 60) + (+env.BONUS_MAX || 40)) * CREDIT_DOLLARS)
  };
}
// Lit une copie du flux SSE pour en tirer la consommation, puis l'enregistre
async function enregistrer(env, email, modele, flux) {
  const rd = flux.getReader(), dec = new TextDecoder(); let buf = "", recherches = 0; const u = {};
  for (;;) {
    const { value, done } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const ligne = buf.slice(0, i).split("\n").find(l => l.startsWith("data:")); buf = buf.slice(i + 2);
      if (!ligne) continue; let d; try { d = JSON.parse(ligne.slice(5)); } catch { continue; }
      if (d.type === "message_start" && d.message && d.message.usage) Object.assign(u, d.message.usage);
      else if (d.type === "message_delta" && d.usage) Object.assign(u, d.usage);
      else if (d.type === "content_block_start" && d.content_block && d.content_block.type === "server_tool_use" && d.content_block.name === "web_search") recherches++;
    }
  }
  const c = cout(modele, u, recherches);
  await env.DB.prepare("INSERT INTO usage (email, ts, modele, entree, sortie, recherches, dollars, credits) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
    .bind(email, Date.now(), modele, (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0), u.output_tokens || 0, recherches, c.dollars, c.credits).run();
}

// ---------- Relais des cartes IGN ----------
const COUCHES_IGN = ["GEOGRAPHICALGRIDSYSTEMS.MAPS", "GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR", "GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR.CV", "GEOGRAPHICALGRIDSYSTEMS.MAPS.BDUNI.J1"];
// Les images de carte ne peuvent pas porter de jeton : l'accès est limité aux pages du site (en-tête Referer),
// aux niveaux de zoom utiles et à la France (large) ; chaque tuile est gardée 30 jours dans le cache de Cloudflare.
async function tuileIgn(req, env, ctx, url) {
  const m = url.pathname.match(/^\/(?:ign|scan25)\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})(?:\.jpg)?$/);
  const refus = (s, t) => new Response(t, { status: s, headers: { "content-type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
  if (!m) return refus(404, "Tuile inconnue.");
  const z = +m[1], x = +m[2], y = +m[3];
  if (z < 6 || z > 18 || x >= 2 ** z || y >= 2 ** z) return refus(400, "Niveau de zoom hors limites.");
  // Pages autorisées : le site, et le poste de développement (localhost) pour les essais
  const ref = req.headers.get("Referer") || req.headers.get("Origin") || "", ok = String(env.ORIGINES || "").split(",").map(s => s.trim()).filter(Boolean).concat(["http://localhost", "http://127.0.0.1"]);
  if (!ok.some(o => ref === o || ref.startsWith(o + "/") || ref.startsWith(o + ":"))) return refus(403, "Carte réservée aux applications de ScoutHub.");
  const couche = COUCHES_IGN.includes(url.searchParams.get("couche")) ? url.searchParams.get("couche") : "";
  const cache = caches.default, cleCache = new Request("https://cache.scouthub/ign/" + (couche ? couche + "/" : "") + z + "/" + x + "/" + y + ".jpg");
  let res = await cache.match(cleCache);
  if (!res) {
    const cle = env.IGN_SCAN25_KEY && typeof env.IGN_SCAN25_KEY.get === "function" ? await env.IGN_SCAN25_KEY.get() : env.IGN_SCAN25_KEY;
    if (!cle) return refus(503, "Clé IGN absente.");
    const nom = couche || env.IGN_COUCHE || "GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR", k = encodeURIComponent(cle);
    // Deux adresses IGN (WMTS puis TMS) : si la première est en panne, la seconde prend le relais
    const sources = [
      "https://data.geopf.fr/private/wmts?apikey=" + k + "&SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=" + encodeURIComponent(nom) + "&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX=" + z + "&TILEROW=" + y + "&TILECOL=" + x,
      "https://data.geopf.fr/private/tms/1.0.0/" + encodeURIComponent(nom) + "/" + z + "/" + x + "/" + y + ".jpeg?apikey=" + k
    ];
    let amont = null;
    for (const src of sources) { try { amont = await fetch(src, { headers: { "User-Agent": "ScoutHub-FSGGB" } }); if (amont.ok) break; } catch { amont = null; } }
    if (!amont) return refus(502, "IGN injoignable.");
    if (!amont.ok) { const detail = (await amont.text()).replace(/<[^>]+>/g, " ").replace(/apikey=[^&\s]*/gi, "apikey=…").replace(/\s+/g, " ").trim().slice(0, 160); return refus(amont.status === 404 ? 404 : 502, "Tuile IGN indisponible (" + amont.status + ") : " + detail); }
    res = new Response(amont.body, { status: 200, headers: { "content-type": amont.headers.get("content-type") || "image/jpeg", "cache-control": "public, max-age=2592000", "Access-Control-Allow-Origin": "*" } });
    ctx.waitUntil(cache.put(cleCache, res.clone()));
  }
  return res;
}

// ---------- Partage en direct (Durable Object : un objet par partage, connexions WebSocket en hibernation) ----------
const sha = async t => hex(await crypto.subtle.digest("SHA-256", enc.encode(String(t))));
const MAX_CHAT = 80, MAX_CARTE = 1500000, DUREE_VIE = 3 * 86400000;
export class Partage {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("WebSocket attendu.", { status: 426 });
    const paire = new WebSocketPair(); this.state.acceptWebSocket(paire[1]);
    return new Response(null, { status: 101, webSocket: paire[0] });
  }
  async lire() {
    const s = this.state.storage, v = await s.get(["owner", "admtok", "carte", "carteT", "chat", "pos", "closed"]);
    return { owner: v.get("owner") || null, admtok: v.get("admtok") || null, carte: v.get("carte") || null, carteT: v.get("carteT") || 0, chat: v.get("chat") || [], pos: v.get("pos") || {}, closed: !!v.get("closed") };
  }
  envoyer(ws, o) { try { ws.send(JSON.stringify(o)); } catch { /* fermé */ } }
  diffuser(o, sauf) { const t = JSON.stringify(o); for (const ws of this.state.getWebSockets()) if (ws !== sauf) { try { ws.send(t); } catch { /* fermé */ } } }
  async vivant() { await this.state.storage.setAlarm(Date.now() + DUREE_VIE); }       // effacé 3 jours après la dernière activité
  async alarm() { await this.state.storage.deleteAll(); }
  async webSocketMessage(ws, brut) {
    let m; try { m = JSON.parse(typeof brut === "string" ? brut : new TextDecoder().decode(brut)); } catch { return; }
    if (!m || typeof m.t !== "string" || String(brut).length > MAX_CARTE + 4000) return;
    const s = this.state.storage, moi = ws.deserializeAttachment() || {}, maintenant = Date.now();
    const d = await this.lire(), chaine = (x, n) => typeof x === "string" && x.length <= n;
    if (m.t === "bonjour") {
      // uid : identifiant aléatoire de l'appareil ; proprio : secret du créateur ; adm : lien administrateur
      if (!chaine(m.uid, 40) || !m.uid) return this.envoyer(ws, { t: "erreur", m: "Identifiant manquant." });
      const info = { uid: m.uid, proprio: false, admin: false };
      if (m.creer && !d.owner && chaine(m.proprio, 80)) { await s.put("owner", await sha(m.proprio)); await s.delete("closed"); await this.vivant(); info.proprio = info.admin = true; }
      else if (d.owner && chaine(m.proprio, 80) && await sha(m.proprio) === d.owner) info.proprio = info.admin = true;
      else if (!d.owner || d.closed) return this.envoyer(ws, { t: "absent" });
      if (!info.admin && chaine(m.adm, 60) && d.admtok && m.adm === d.admtok) info.admin = true;
      ws.serializeAttachment(info);
      const etat = await this.lire();
      return this.envoyer(ws, { t: "etat", proprio: info.proprio, admin: info.admin, admRefuse: !!(m.adm && !info.admin), maintenant, carte: etat.carte, carteT: etat.carteT, chat: etat.chat, pos: etat.pos });
    }
    if (!moi.uid) return;
    if (m.t === "carte" && moi.admin && chaine(m.d, MAX_CARTE)) { await s.put({ carte: m.d, carteT: maintenant }); await this.vivant(); return this.diffuser({ t: "carte", d: m.d, at: maintenant }, ws); }
    if (m.t === "pos" && chaine(m.d, 4000)) { d.pos[moi.uid] = { d: m.d, at: maintenant }; await s.put("pos", d.pos); return this.diffuser({ t: "pos", u: moi.uid, d: m.d, at: maintenant }); }
    if (m.t === "sanspos") { delete d.pos[moi.uid]; await s.put("pos", d.pos); return this.diffuser({ t: "sanspos", u: moi.uid }); }
    if (m.t === "msg" && chaine(m.d, 4000)) { const k = maintenant.toString(36) + Math.random().toString(36).slice(2, 6); d.chat.push({ k, d: m.d, at: maintenant }); await s.put("chat", d.chat.slice(-MAX_CHAT)); await this.vivant(); return this.diffuser({ t: "msg", k, d: m.d, at: maintenant }); }
    if (m.t === "admtok" && moi.proprio && chaine(m.tk, 60) && m.tk.length >= 12) { await s.put("admtok", m.tk); return this.envoyer(ws, { t: "ok", r: "admtok" }); }
    if (m.t === "revoquer" && moi.proprio) {
      await s.delete("admtok");
      for (const w of this.state.getWebSockets()) { const i = w.deserializeAttachment() || {}; if (i.admin && !i.proprio) { i.admin = false; w.serializeAttachment(i); this.envoyer(w, { t: "revoque" }); } }
      return this.envoyer(ws, { t: "ok", r: "revoquer" });
    }
    if (m.t === "fin" && moi.proprio) { this.diffuser({ t: "fin" }, ws); await s.deleteAll(); await s.put("closed", true); await s.setAlarm(Date.now() + 86400000); return this.envoyer(ws, { t: "ok", r: "fin" }); }
  }
  async webSocketClose(ws) { try { ws.close(); } catch { /* déjà fermé */ } }
}
async function direct(req, env, url) {
  const id = url.pathname.slice(8);
  if (!/^[a-z0-9]{12,32}$/.test(id)) return new Response("Partage inconnu.", { status: 404 });
  const ok = String(env.ORIGINES || "").split(",").map(s => s.trim()).concat(["http://localhost", "http://127.0.0.1"]), o = req.headers.get("Origin") || "";
  if (!ok.some(x => o === x || o.startsWith(x + ":"))) return new Response("Origine refusée.", { status: 403 });
  return env.PARTAGE.get(env.PARTAGE.idFromName(id)).fetch(req);
}

export default {
  async fetch(req, env, ctx) {
    const origine = req.headers.get("Origin") || "", entetes = cors(env, origine), url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: entetes });
    if (req.method === "GET" && url.pathname.startsWith("/direct/")) return direct(req, env, url);
    if (req.method === "GET" && (url.pathname.startsWith("/ign/") || url.pathname.startsWith("/scan25/"))) return tuileIgn(req, env, ctx, url);
    const json = (status, o) => new Response(JSON.stringify(o), { status, headers: { ...entetes, "content-type": "application/json", "cache-control": "no-store" } });
    const erreur = (status, message) => json(status, { type: "error", error: { message } });
    if (req.method !== "POST") return erreur(405, "Méthode refusée.");
    if (!String(env.ORIGINES || "").split(",").map(s => s.trim()).includes(origine)) return erreur(403, "Origine refusée.");
    const qui = await verifierJeton(req.headers.get("x-scouthub-jeton"), env.RELAIS_SECRET);
    if (!qui) return erreur(401, "Session ScoutHub invalide ou expirée : rechargez la page.");
    const admin = qui.r === "admin";

    if (url.pathname === "/credits") return json(200, { ok: true, ...(await etatCredits(env, qui)) });

    if (url.pathname === "/chat" || url.pathname === "/") {
      if (!admin) {
        const etat = await etatCredits(env, qui);
        if (etat.fenetre.reste <= 0) return erreur(429, "Limite de crédits des " + (env.FENETRE_HEURES || 5) + " dernières heures atteinte : réessayez plus tard.");
        if (etat.semaine.reste <= 0) return erreur(429, "Limite de crédits de la semaine atteinte.");
      }
      let corps; try { corps = await req.json(); } catch { return erreur(400, "Requête invalide."); }
      if (!MODELES[corps.model]) return erreur(400, "Modèle non autorisé.");
      corps.max_tokens = Math.min(+corps.max_tokens || 2000, MAX_JETONS);
      corps.stream = true;
      corps.metadata = { user_id: hex(await crypto.subtle.digest("SHA-256", enc.encode(String(qui.e)))).slice(0, 32) };   // identifiant opaque
      // La clé vient du Secrets Store du compte (liaison avec .get()) ou d'un secret propre au Worker (texte)
      const cleClaude = env.ANTHROPIC_KEY && typeof env.ANTHROPIC_KEY.get === "function" ? await env.ANTHROPIC_KEY.get() : env.ANTHROPIC_KEY;
      if (!cleClaude) return erreur(503, "Clé Claude absente du serveur Cloudflare.");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": cleClaude, "anthropic-version": "2023-06-01", ...(env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": String(env.ANTHROPIC_WORKSPACE_ID).trim() } : {}) },
        body: JSON.stringify(corps)
      });
      if (!res.ok || !res.body) return new Response(res.body, { status: res.status, headers: { ...entetes, "content-type": res.headers.get("content-type") || "application/json" } });
      const [pourNavigateur, pourCompte] = res.body.tee();
      ctx.waitUntil(enregistrer(env, qui.e, corps.model, pourCompte).catch(() => {}));
      return new Response(pourNavigateur, { status: 200, headers: { ...entetes, "content-type": "text/event-stream", "cache-control": "no-store" } });
    }
    return erreur(404, "Adresse inconnue.");
  }
};
