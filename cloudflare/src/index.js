// Serveur Cloudflare de ScoutHub (Workers + D1, plan gratuit).
//  POST /chat     : relais ChatGDB. Vérifie le jeton signé par le serveur ScoutHub (Apps Script), applique les limites
//                   de crédits, transmet la requête à Claude et renvoie la réponse au fil de l'eau ; la consommation
//                   est enregistrée dans D1 une fois la réponse terminée.
//  POST /credits  : crédits restants de la personne.
//  POST /ia/*     : laboratoire de l'administrateur (Workers AI : modèles, dictée, voix, vecteurs ; budget de Neurons tenu dans D1).
//  POST /fiches/* : brouillons de fiches proposés par ChatGDB (branche « brouillons » du dépôt ChatGDB), validation par l'administrateur.
//  GET  /direct/{id} (WebSocket) : partage en direct de ScoutMap (+ appels vocaux : relais des messages WebRTC et identifiants TURN) (itinéraire, azimuts, grand jeu) : positions, discussion,
//                   carte ; tout arrive déjà chiffré par le navigateur (la clé n'est que dans le lien), le serveur ne lit rien.
//  GET  /ign/{z}/{x}/{y}.jpg (ou /scan25/…, adresse attendue par ScoutMap) : tuile des cartes IGN (SCAN 25) ; la clé IGN est ajoutée ici et n'est jamais visible.
// Secrets : ANTHROPIC_KEY (clé Claude, jamais visible du navigateur), RELAIS_SECRET (partagé avec le serveur ScoutHub).
// Prix connus ($ par million de jetons : entrée, sortie), par version ; une version inconnue (plus récente) prend le prix de sa famille.
const MODELES = { "claude-haiku-5-5": [0.10, 0.50], "claude-sonnet-5-5": [2, 10], "claude-opus-5-5": [4, 20] };
const PRIX_FAMILLE = { haiku: [0.10, 0.50], sonnet: [2, 10], opus: [4, 20] };
const ADMIN_SEUL = new Set(["opus"]);   // familles réservées à l'administrateur
const famille = id => { const m = /^claude-(haiku|sonnet|opus)-/.exec(String(id || "")); return m ? m[1] : ""; };
const prixDe = id => MODELES[id] || PRIX_FAMILLE[famille(id)] || PRIX_FAMILLE.haiku;   // $ par million de jetons (entrée, sortie)
const MAX_JETONS = 128000, CREDIT_DOLLARS = 0.001;       // plafond de sécurité très large : la vraie limite est celle du modèle (Claude la signale)

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
  const p = prixDe(modele);
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

// ---------- Dernières versions de Claude ----------
// Le relais demande à l'API la liste des modèles (gardée 6 heures) et envoie chaque requête à la DERNIÈRE version de la famille demandée
// (Haiku, Sonnet, Opus) : une nouvelle version de Claude n'impose aucune mise à jour du site. Si la liste est indisponible, ou si la
// dernière version refuse la requête, la version demandée est utilisée telle quelle.
let memoModeles = { t: 0, v: null };
async function cleClaude(env) { return env.ANTHROPIC_KEY && typeof env.ANTHROPIC_KEY.get === "function" ? await env.ANTHROPIC_KEY.get() : env.ANTHROPIC_KEY; }
function entetesClaude(env, cle) { return { "content-type": "application/json", "x-api-key": cle, "anthropic-version": "2023-06-01", ...(env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": String(env.ANTHROPIC_WORKSPACE_ID).trim() } : {}) }; }
async function dernieresVersions(env) {
  if (memoModeles.v && Date.now() - memoModeles.t < 6 * 3600e3) return memoModeles.v;
  try {
    const cle = await cleClaude(env); if (!cle) return memoModeles.v;
    const res = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: entetesClaude(env, cle) });
    if (!res.ok) return memoModeles.v;
    const liste = (await res.json()).data || [], v = {};
    for (const m of liste) {
      const f = famille(m.id); if (!f || /-\d{8}$/.test(m.id)) continue;         // les versions datées sont d'anciens instantanés
      if (!v[f] || String(m.created_at) > String(v[f].created_at)) v[f] = { id: m.id, nom: m.display_name || m.id, created_at: m.created_at };
    }
    if (Object.keys(v).length) memoModeles = { t: Date.now(), v };
  } catch { /* garde la dernière liste connue */ }
  return memoModeles.v;
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
const MAX_CHAT = 250, MAX_CARTE = 1500000, DUREE_VIE = 3 * 86400000;
// Fichiers de la discussion (photos, messages vocaux, documents) : déjà chiffrés par le navigateur, gardés dans le stockage du partage
// (supprimés avec lui) ; un message WebSocket fait au plus 1 Mo, d'où cette limite ; les plus anciens sont effacés au-delà de MAX_MEDIAS.
const MAX_MEDIA = 950000, MAX_MEDIAS = 60;
export class Partage {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("WebSocket attendu.", { status: 426 });
    const paire = new WebSocketPair(); this.state.acceptWebSocket(paire[1]);
    return new Response(null, { status: 101, webSocket: paire[0] });
  }
  async lire() {
    try {
      const s = this.state.storage, v = await s.get(["owner", "admtok", "carte", "carteT", "chat", "closed"]);
      return { owner: v.get("owner") || null, admtok: v.get("admtok") || null, carte: v.get("carte") || null, carteT: v.get("carteT") || 0, chat: v.get("chat") || [], closed: !!v.get("closed") };
    } catch (e) { return { owner: null, admtok: null, carte: null, carteT: 0, chat: [], closed: false, ko: true }; }
  }
  // Écriture qui ne bloque jamais la diffusion : si le stockage refuse (quota du jour, erreur), les messages passent quand même en direct
  async ecrire(cle, valeur) { try { await this.state.storage.put(cle, valeur); return true; } catch (e) { return false; } }
  // Positions et signes de vie : gardés dans les connexions elles-mêmes (aucune écriture de stockage, donc pas de quota consommé)
  positions() { const o = {}; for (const w of this.state.getWebSockets()) { const i = w.deserializeAttachment() || {}; if (i.uid && i.pos) o[i.uid] = i.pos; } return o; }
  envoyer(ws, o) { try { ws.send(JSON.stringify(o)); } catch { /* fermé */ } }
  diffuser(o, sauf) { const t = JSON.stringify(o); for (const ws of this.state.getWebSockets()) if (ws !== sauf) { try { ws.send(t); } catch { /* fermé */ } } }
  // Serveurs STUN/TURN pour les appels : identifiants valables 24 h, gardés 6 h en mémoire ; à défaut, STUN seul (appel direct quand le réseau le permet)
  async serveursIce() {
    if (this.ice && Date.now() - this.ice.t < 6 * 3600e3) return this.ice.v;
    const stun = [{ urls: ["stun:stun.cloudflare.com:3478"] }], e = this.env;
    try {
      const jeton = e.TURN_KEY_TOKEN && typeof e.TURN_KEY_TOKEN.get === "function" ? await e.TURN_KEY_TOKEN.get() : e.TURN_KEY_TOKEN;
      if (!e.TURN_KEY_ID || !jeton) return stun;
      const r = await fetch("https://rtc.live.cloudflare.com/v1/turn/keys/" + encodeURIComponent(e.TURN_KEY_ID) + "/credentials/generate-ice-servers", { method: "POST", headers: { authorization: "Bearer " + jeton, "content-type": "application/json" }, body: JSON.stringify({ ttl: 86400 }) });
      if (!r.ok) return stun;
      const o = await r.json(); if (!Array.isArray(o.iceServers) || !o.iceServers.length) return stun;
      this.ice = { t: Date.now(), v: o.iceServers }; return o.iceServers;
    } catch { return stun; }
  }
  async vivant() { await this.state.storage.setAlarm(Date.now() + DUREE_VIE); }       // effacé 3 jours après la dernière activité
  async alarm() { await this.state.storage.deleteAll(); }
  async webSocketMessage(ws, brut) {
    try { await this.traiter(ws, brut); }
    catch (e) { this.envoyer(ws, { t: "erreur", m: "Erreur du serveur : " + String((e && e.message) || e).slice(0, 120) }); }
  }
  async traiter(ws, brut) {
    let m; try { m = JSON.parse(typeof brut === "string" ? brut : new TextDecoder().decode(brut)); } catch { return; }
    if (!m || typeof m.t !== "string" || String(brut).length > MAX_CARTE + 4000) return;
    if (m.t === "ping") return this.envoyer(ws, { t: "pong", c: m.c, maintenant: Date.now() });   // le navigateur mesure le délai et détecte une connexion morte
    const s = this.state.storage, moi = ws.deserializeAttachment() || {}, maintenant = Date.now();
    // Fichiers : dépôt (« media », avec accusé « ok ») et lecture à la demande (« getm » → « media »), réservés aux personnes connectées au partage
    if (moi.uid && m.t === "media") {
      if (!/^[a-z0-9]{8,24}$/.test(String(m.id || "")) || typeof m.d !== "string" || m.d.length > MAX_MEDIA) return this.envoyer(ws, { t: "erreur", r: "media", id: m.id, m: "Fichier refusé (trop lourd : 650 Ko au plus)." });
      try {
        await s.put("m:" + m.id, m.d);
        const idx = (await s.get("mi")) || []; if (idx.indexOf(m.id) < 0) idx.push(m.id);
        while (idx.length > MAX_MEDIAS) await s.delete("m:" + idx.shift());
        await s.put("mi", idx); await this.vivant().catch(() => {});
        return this.envoyer(ws, { t: "ok", r: "media", id: m.id });
      } catch (e) { return this.envoyer(ws, { t: "erreur", r: "media", id: m.id, m: "Fichier non enregistré (stockage du serveur indisponible ou plein)." }); }
    }
    if (moi.uid && m.t === "getm") {
      if (!/^[a-z0-9]{8,24}$/.test(String(m.id || ""))) return;
      let v = null; try { v = await s.get("m:" + m.id); } catch (e) { v = null; }
      return this.envoyer(ws, v ? { t: "media", id: m.id, d: v } : { t: "media", id: m.id, absent: true });
    }
    // Appels vocaux : messages de mise en relation (offres, réponses, candidats WebRTC) déjà chiffrés par le navigateur, simplement relayés ;
    // et identifiants TURN (Cloudflare Realtime) remis aux seules personnes connectées au partage.
    if (moi.uid && m.t === "sig" && typeof m.d === "string" && m.d.length <= 6000) return this.diffuser({ t: "sig", u: moi.uid, d: m.d }, ws);
    if (moi.uid && m.t === "turn") {
      if (maintenant - (moi.turnT || 0) < 15000) return this.envoyer(ws, { t: "turn", ice: [{ urls: ["stun:stun.cloudflare.com:3478"] }], limite: true });
      moi.turnT = maintenant; ws.serializeAttachment(moi);
      return this.envoyer(ws, { t: "turn", ice: await this.serveursIce() });
    }
    const chaine = (x, n) => typeof x === "string" && x.length <= n;
    if (m.t === "pos" && moi.uid && chaine(m.d, 1000)) { moi.pos = { d: m.d, at: maintenant }; ws.serializeAttachment(moi); return this.diffuser({ t: "pos", u: moi.uid, d: m.d, at: maintenant }); }
    if (m.t === "sanspos" && moi.uid) { delete moi.pos; ws.serializeAttachment(moi); return this.diffuser({ t: "sanspos", u: moi.uid }); }
    const d = await this.lire();
    if (m.t === "bonjour") {
      // uid : identifiant aléatoire de l'appareil ; proprio : secret du créateur ; adm : lien administrateur
      if (!chaine(m.uid, 40) || !m.uid) return this.envoyer(ws, { t: "erreur", m: "Identifiant manquant." });
      const info = { uid: m.uid, proprio: false, admin: false };
      if (d.ko && !m.creer) return this.envoyer(ws, { t: "erreur", m: "Stockage du serveur momentanément indisponible : réessayez dans un instant." });
      if (m.creer && !d.owner && chaine(m.proprio, 80)) { await s.put("owner", await sha(m.proprio)); await s.delete("closed"); await this.vivant(); info.proprio = info.admin = true; }
      else if (d.owner && chaine(m.proprio, 80) && await sha(m.proprio) === d.owner) info.proprio = info.admin = true;
      else if (!d.owner || d.closed) return this.envoyer(ws, { t: "absent" });
      if (!info.admin && chaine(m.adm, 60) && d.admtok && m.adm === d.admtok) info.admin = true;
      ws.serializeAttachment(info);
      const etat = await this.lire();
      return this.envoyer(ws, { t: "etat", proprio: info.proprio, admin: info.admin, admRefuse: !!(m.adm && !info.admin), maintenant, carte: etat.carte, carteT: etat.carteT, chat: etat.chat, pos: this.positions() });
    }
    if (!moi.uid) return;
    if (m.t === "carte" && moi.admin && chaine(m.d, MAX_CARTE)) { const ok = await this.ecrire({ carte: m.d, carteT: maintenant }); if (ok) await this.vivant().catch(() => {}); else this.envoyer(ws, { t: "erreur", m: "La carte n'a pas pu être enregistrée (trop grande ou stockage plein) : elle est envoyée en direct, mais une personne qui arrive plus tard ne la verra pas." }); return this.diffuser({ t: "carte", d: m.d, at: maintenant }, ws); }
    if (m.t === "msg" && chaine(m.d, 6000)) { const k = maintenant.toString(36) + Math.random().toString(36).slice(2, 6); d.chat.push({ k, d: m.d, at: maintenant }); d.chat = d.chat.slice(-MAX_CHAT); while (d.chat.length > 20 && JSON.stringify(d.chat).length > 120000) d.chat.shift(); if (await this.ecrire("chat", d.chat)) await this.vivant().catch(() => {}); return this.diffuser({ t: "msg", k, d: m.d, at: maintenant }); }
    if (m.t === "admtok" && moi.proprio && chaine(m.tk, 60) && m.tk.length >= 12) { await s.put("admtok", m.tk); return this.envoyer(ws, { t: "ok", r: "admtok" }); }
    if (m.t === "revoquer" && moi.proprio) {
      await s.delete("admtok");
      for (const w of this.state.getWebSockets()) { const i = w.deserializeAttachment() || {}; if (i.admin && !i.proprio) { i.admin = false; w.serializeAttachment(i); this.envoyer(w, { t: "revoque" }); } }
      return this.envoyer(ws, { t: "ok", r: "revoquer" });
    }
    if (m.t === "fin" && moi.proprio) { this.diffuser({ t: "fin" }, ws); await s.deleteAll(); await s.put("closed", true); await s.setAlarm(Date.now() + 86400000); return this.envoyer(ws, { t: "ok", r: "fin" }); }
  }
  async webSocketClose(ws) { this.depart(ws); try { ws.close(); } catch { /* déjà fermé */ } }
  async webSocketError(ws) { this.depart(ws); }
  depart(ws) {
    const i = ws.deserializeAttachment() || {};
    if (i.uid && !this.state.getWebSockets().some(w => w !== ws && (w.deserializeAttachment() || {}).uid === i.uid)) this.diffuser({ t: "sanspos", u: i.uid }, ws);
  }
}
async function direct(req, env, url) {
  const id = url.pathname.slice(8);
  if (!/^[a-z0-9]{12,32}$/.test(id)) return new Response("Partage inconnu.", { status: 404 });
  const ok = String(env.ORIGINES || "").split(",").map(s => s.trim()).concat(["http://localhost", "http://127.0.0.1"]), o = req.headers.get("Origin") || "";
  if (!ok.some(x => o === x || o.startsWith(x + ":"))) return new Response("Origine refusée.", { status: 403 });
  return env.PARTAGE.get(env.PARTAGE.idFromName(id)).fetch(req);
}

// ---------- LABORATOIRE (administrateur) : modèles Workers AI gratuits, dictée, voix, recherche par le sens ----------
// /ia/modeles  catalogue (prix en Neurons par million de jetons) et compteur du jour
// /ia/chat     un modèle de texte (messages, outils, température) : réponse complète + durée + Neurons
// /ia/dictee   audio (base64) -> texte (Whisper)      /ia/voix  texte -> audio (MeloTTS)      /ia/vecteurs  textes -> vecteurs (bge-m3)
// Le budget gratuit est de 10 000 Neurons par jour pour tout le compte (remise à zéro à 00 h UTC) : au-delà de 80 %, les essais sont
// refusés sauf demande explicite (force) de l'administrateur ; le décompte est tenu dans D1 (table neurons).
const TEXTE_IA = {
  "@cf/meta/llama-3.1-8b-instruct-fp8-fast": ["Llama 3.1 8B (rapide)", 4119, 34868],
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": ["Llama 3.3 70B (rapide)", 26668, 204805],
  "@cf/meta/llama-4-scout-17b-16e-instruct": ["Llama 4 Scout 17B", 24545, 77273],
  "@cf/qwen/qwen3-30b-a3b-fp8": ["Qwen3 30B-A3B", 4625, 30475],
  "@cf/openai/gpt-oss-120b": ["GPT-OSS 120B", 31818, 68182],
  "@cf/openai/gpt-oss-20b": ["GPT-OSS 20B", 18182, 27273],
  "@cf/mistralai/mistral-small-3.1-24b-instruct": ["Mistral Small 3.1 24B", 31876, 50488],
  "@cf/google/gemma-4-26b-a4b-it": ["Gemma 4 26B-A4B", 9091, 27273],
  "@cf/zai-org/glm-4.7-flash": ["GLM-4.7-Flash", 5500, 36400],
  "@cf/nvidia/nemotron-3-120b-a12b": ["Nemotron 3 120B", 45455, 136364],
  "@cf/qwen/qwen3.8-27b": ["Qwen3.8 27B", 40909, 290909],
  "@cf/ibm-granite/granite-4.0-h-micro": ["Granite 4.0 micro", 1542, 10158]
};
const NEURONS_PAR_MINUTE = { dictee: 46.6, voix: 18.6 }, NEURONS_VECTEUR_PAR_JETON = 0.001075;
const MAX_AUDIO = 6e6, MAX_TEXTE_IA = 60000;
const jourUtc = () => new Date().toISOString().slice(0, 10);
async function neuronsJour(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS neurons (jour TEXT PRIMARY KEY, n REAL NOT NULL DEFAULT 0, appels INTEGER NOT NULL DEFAULT 0)").run();
  const r = await env.DB.prepare("SELECT n, appels FROM neurons WHERE jour = ?").bind(jourUtc()).first();
  return { jour: jourUtc(), utilises: Math.round((r && r.n || 0) * 10) / 10, appels: r ? r.appels : 0, budget: +env.NEURONS_JOUR || 10000, coupure: 0.8 };
}
async function neuronsAjouter(env, n) {
  await env.DB.prepare("INSERT INTO neurons (jour, n, appels) VALUES (?, ?, 1) ON CONFLICT(jour) DO UPDATE SET n = n + excluded.n, appels = appels + 1").bind(jourUtc(), n).run();
}
async function laboratoire(req, env, url, json, erreur) {
  const etat = await neuronsJour(env);
  const chemin = url.pathname.slice(3);
  if (chemin === "/modeles") return json(200, { ok: true, etat, modeles: Object.entries(TEXTE_IA).map(([id, [nom, e, so]]) => ({ id, nom, entree: e, sortie: so })), dictee: "@cf/openai/whisper-large-v3-turbo", voix: "@cf/myshell-ai/melotts", vecteurs: "@cf/baai/bge-m3" });
  let c; try { c = await req.json(); } catch { return erreur(400, "Requête invalide."); }
  if (!c.force && etat.utilises >= etat.budget * etat.coupure) return erreur(429, "Budget gratuit du jour entamé à plus de 80 % (" + etat.utilises + " / " + etat.budget + " Neurons) : réessayez demain (00 h UTC) ou forcez l'essai.");
  const t0 = Date.now();
  try {
    if (chemin === "/chat") {
      const m = TEXTE_IA[c.model]; if (!m) return erreur(400, "Modèle non autorisé.");
      if (!Array.isArray(c.messages) || !c.messages.length || JSON.stringify(c.messages).length > MAX_TEXTE_IA) return erreur(400, "Messages invalides ou trop longs.");
      const corps = { messages: c.messages, max_tokens: Math.min(Math.max(+c.max_tokens || 800, 16), 8000), temperature: Math.min(Math.max(+c.temperature || 0, 0), 2) };
      if (Array.isArray(c.tools) && c.tools.length) corps.tools = c.tools.slice(0, 20);
      const r = await env.AI.run(c.model, corps);
      const ch = r && r.choices && r.choices[0] && r.choices[0].message || {}, u = r && r.usage || {};
      const entree = u.prompt_tokens || 0, sortie = u.completion_tokens || 0, neurons = (entree * m[1] + sortie * m[2]) / 1e6;
      await neuronsAjouter(env, neurons);
      return json(200, { ok: true, modele: c.model, nom: m[0], texte: (ch.content != null ? ch.content : r && r.response) || "", raisonnement: ch.reasoning || ch.reasoning_content || "", outils: ch.tool_calls || [], entree, sortie, neurons: Math.round(neurons * 100) / 100, ms: Date.now() - t0, restant: Math.round((etat.budget - etat.utilises - neurons) * 10) / 10 });
    }
    if (chemin === "/dictee") {
      const audio = String(c.audio || ""); if (!audio || audio.length > MAX_AUDIO) return erreur(400, "Audio absent ou trop long (6 Mo au plus).");
      const r = await env.AI.run("@cf/openai/whisper-large-v3-turbo", { audio, language: /^[a-z]{2}$/.test(c.langue) ? c.langue : "fr" });
      const duree = +(r && r.transcription_info && r.transcription_info.duration) || +c.duree || 0, neurons = duree / 60 * NEURONS_PAR_MINUTE.dictee;
      await neuronsAjouter(env, neurons);
      return json(200, { ok: true, texte: String(r && r.text || "").trim(), mots: r && r.words ? r.words.length : 0, duree, neurons: Math.round(neurons * 100) / 100, ms: Date.now() - t0 });
    }
    if (chemin === "/voix") {
      const texte = String(c.texte || "").slice(0, 2000); if (!texte) return erreur(400, "Texte absent.");
      const r = await env.AI.run("@cf/myshell-ai/melotts", { prompt: texte, lang: /^[a-z]{2}$/.test(c.langue) ? c.langue : "fr" });
      const neurons = texte.length / 14 / 60 * NEURONS_PAR_MINUTE.voix;
      await neuronsAjouter(env, neurons);
      return json(200, { ok: true, audio: r && r.audio || "", neurons: Math.round(neurons * 100) / 100, ms: Date.now() - t0 });
    }
    if (chemin === "/vecteurs") {
      const textes = Array.isArray(c.textes) ? c.textes.map(t => String(t).slice(0, 4000)).slice(0, 100) : [];
      if (!textes.length) return erreur(400, "Textes absents.");
      const r = await env.AI.run("@cf/baai/bge-m3", { text: textes });
      const neurons = textes.reduce((n, t) => n + t.length / 3, 0) * NEURONS_VECTEUR_PAR_JETON;
      await neuronsAjouter(env, neurons);
      return json(200, { ok: true, vecteurs: r && r.data || [], neurons: Math.round(neurons * 100) / 100, ms: Date.now() - t0 });
    }
  } catch (e) {
    return erreur(502, "Workers AI : " + String(e && e.message || e).slice(0, 300));
  }
  return erreur(404, "Adresse inconnue.");
}

// ---------- FICHES DE CONNAISSANCES : brouillons proposés par ChatGDB, validés par l'administrateur ----------
// ChatGDB propose une fiche (/fiches/brouillon) : elle est écrite dans le dépôt ChatGDB, sur la branche « brouillons » uniquement, dans
// connaissances/brouillons/. Elle n'est publiée (branche main, connaissances/src/) que quand l'administrateur la valide (/fiches/valider).
// Garde-fous fixes, vérifiés ici et non par une IA : administrateur seul, un seul dépôt, deux dossiers, identifiant en minuscules-tirets,
// taille et nombre par jour plafonnés, jamais d'écrasement par un brouillon, journal = historique git.
const FICHES = { branche: "brouillons", dossierBrouillons: "connaissances/brouillons/", dossierFiches: "connaissances/src/", maxCar: 6000, maxLignes: 120, parJour: 20 };
const idFiche = v => /^[a-z0-9][a-z0-9-]{2,63}$/.test(v) ? v : "";
const uneLigne = (v, max) => String(v == null ? "" : v).replace(/[\r\n\t#]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const b64texte = t => { const o = enc.encode(t); let b = ""; for (const x of o) b += String.fromCharCode(x); return btoa(b); };
const texteB64 = c => new TextDecoder().decode(Uint8Array.from(atob(String(c).replace(/\s/g, "")), ch => ch.charCodeAt(0)));
async function gh(env, chemin, init = {}) {
  const cle = env.GITHUB_KEY && typeof env.GITHUB_KEY.get === "function" ? await env.GITHUB_KEY.get() : env.GITHUB_KEY;
  if (!cle) throw new Error("Clé GitHub absente du serveur Cloudflare.");
  return fetch("https://api.github.com/repos/" + (env.FICHES_DEPOT || "fsggb/ChatGDB") + chemin, { ...init, headers: { authorization: "Bearer " + cle, accept: "application/vnd.github+json", "user-agent": "scouthub-fiches", "x-github-api-version": "2022-11-28", "content-type": "application/json" } });
}
async function ghJson(env, chemin, init) { const r = await gh(env, chemin, init); const t = await r.text(); let o = null; try { o = JSON.parse(t); } catch { /* ignoré */ } if (!r.ok && r.status !== 404) throw new Error("GitHub " + r.status + " : " + String(o && o.message || t).slice(0, 160)); return { ok: r.ok, status: r.status, o }; }
async function brancheBrouillons(env) {
  const ref = await ghJson(env, "/git/ref/heads/" + FICHES.branche); if (ref.ok) return;
  const main = await ghJson(env, "/git/ref/heads/main"); if (!main.ok) throw new Error("Branche main introuvable.");
  const c = await ghJson(env, "/git/refs", { method: "POST", body: JSON.stringify({ ref: "refs/heads/" + FICHES.branche, sha: main.o.object.sha }) }); if (!c.ok) throw new Error("Création de la branche impossible.");
}
async function lireFichier(env, chemin, branche) { const r = await ghJson(env, "/contents/" + chemin.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(branche)); return r.ok && r.o && r.o.content != null ? { texte: texteB64(r.o.content), sha: r.o.sha } : null; }
async function ecrireFichier(env, chemin, branche, texte, message, sha) { const r = await ghJson(env, "/contents/" + chemin.split("/").map(encodeURIComponent).join("/"), { method: "PUT", body: JSON.stringify({ message, content: b64texte(texte), branch: branche, ...(sha ? { sha } : {}) }) }); if (!r.ok) throw new Error("Écriture refusée par GitHub (" + r.status + ")."); }
async function supprimerFichier(env, chemin, branche, sha, message) { const r = await ghJson(env, "/contents/" + chemin.split("/").map(encodeURIComponent).join("/"), { method: "DELETE", body: JSON.stringify({ message, sha, branch: branche }) }); if (!r.ok) throw new Error("Suppression refusée par GitHub (" + r.status + ")."); }
const invalide = m => Object.assign(new Error(m), { valide: true });
function construireFiche(c) {
  const id = idFiche(String(c.id || "")); if (!id) throw invalide("Identifiant invalide (minuscules, chiffres et tirets, 3 à 64 caractères).");
  const titre = uneLigne(c.titre, 140), resume = uneLigne(c.resume, 400), theme = uneLigne(c.theme, 40).replace(/[^\p{L}\p{N} _-]/gu, "") || "Divers";
  const mots = (Array.isArray(c.mots_cles) ? c.mots_cles : []).map(m => uneLigne(m, 40).replace(/,/g, " ")).filter(Boolean).slice(0, 14);
  const contenu = String(c.contenu || "").replace(/\r\n/g, "\n").trim();
  if (!titre || !resume || !mots.length) throw invalide("Titre, résumé et mots-clés sont obligatoires.");
  if (!contenu || contenu.length > FICHES.maxCar || contenu.split("\n").length > FICHES.maxLignes) throw invalide("Contenu vide ou trop long (" + FICHES.maxCar + " caractères et " + FICHES.maxLignes + " lignes au plus).");
  if (/^---\s*$/m.test(contenu)) throw invalide("Le contenu ne peut pas contenir de ligne « --- ».");
  const j = new Date().toISOString().slice(0, 10);
  return { id, theme, texte: "---\nid: " + id + "\ntitre: " + titre + "\ntheme: " + theme + "\ntype: synthese\nbrouillon: oui\nsources:\n  - titre: Proposée par ChatGDB le " + j + " (à relire avant publication)\nmots_cles: " + mots.join(", ") + "\nresume: " + resume + "\n---\n\n" + contenu + "\n" };
}
async function fiches(req, env, url, qui, json, erreur) {
  const chemin = url.pathname.slice(7);
  let c = {}; try { c = await req.json(); } catch { /* corps vide accepté pour la liste */ }
  try {
    if (chemin === "/liste") {
      const r = await ghJson(env, "/contents/" + FICHES.dossierBrouillons.replace(/\/$/, "") + "?ref=" + FICHES.branche);
      const noms = r.ok && Array.isArray(r.o) ? r.o.filter(f => /\.md$/.test(f.name)).map(f => f.name.slice(0, -3)) : [];
      const sortie = []; for (const id of noms.slice(0, 40)) { const f = await lireFichier(env, FICHES.dossierBrouillons + id + ".md", FICHES.branche); if (f) { const t = (/^titre: (.*)$/m.exec(f.texte) || [])[1] || id; sortie.push({ id, titre: t, resume: (/^resume: (.*)$/m.exec(f.texte) || [])[1] || "", theme: (/^theme: (.*)$/m.exec(f.texte) || [])[1] || "" }); } }
      return json(200, { ok: true, brouillons: sortie });
    }
    if (chemin === "/lire") { const id = idFiche(String(c.id || "")); if (!id) return erreur(400, "Identifiant invalide."); const f = await lireFichier(env, FICHES.dossierBrouillons + id + ".md", FICHES.branche); return f ? json(200, { ok: true, id, texte: f.texte }) : erreur(404, "Brouillon introuvable."); }
    if (chemin === "/brouillon") {
      const f = construireFiche(c);
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS fiches_jour (jour TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)").run();
      const j = jourUtc(), deja = (await env.DB.prepare("SELECT n FROM fiches_jour WHERE jour = ?").bind(j).first() || {}).n || 0;
      if (deja >= FICHES.parJour) return erreur(429, "Limite de " + FICHES.parJour + " brouillons par jour atteinte.");
      await brancheBrouillons(env);
      const existant = await lireFichier(env, FICHES.dossierBrouillons + f.id + ".md", FICHES.branche);
      await ecrireFichier(env, FICHES.dossierBrouillons + f.id + ".md", FICHES.branche, f.texte, "Brouillon de fiche : " + f.id + (existant ? " (mise à jour)" : ""), existant && existant.sha);
      await env.DB.prepare("INSERT INTO fiches_jour (jour, n) VALUES (?, 1) ON CONFLICT(jour) DO UPDATE SET n = n + 1").bind(j).run();
      return json(200, { ok: true, id: f.id, message: "Brouillon enregistré sur la branche « " + FICHES.branche + " » : l'administrateur doit le valider (Laboratoire, onglet Fiches)." });
    }
    if (chemin === "/refuser") {
      const id = idFiche(String(c.id || "")); if (!id) return erreur(400, "Identifiant invalide.");
      const f = await lireFichier(env, FICHES.dossierBrouillons + id + ".md", FICHES.branche); if (!f) return erreur(404, "Brouillon introuvable.");
      await supprimerFichier(env, FICHES.dossierBrouillons + id + ".md", FICHES.branche, f.sha, "Brouillon refusé : " + id);
      return json(200, { ok: true, id });
    }
    if (chemin === "/valider") {
      const id = idFiche(String(c.id || "")); if (!id) return erreur(400, "Identifiant invalide.");
      const f = await lireFichier(env, FICHES.dossierBrouillons + id + ".md", FICHES.branche); if (!f) return erreur(404, "Brouillon introuvable.");
      const texte = f.texte.replace(/^brouillon: oui\n/m, "").replace(/^  - titre: Proposée par ChatGDB le ([\d-]+) \(à relire avant publication\)$/m, "  - titre: Proposée par ChatGDB le $1, validée par l'administrateur");
      if (!/^---\nid: /.test(texte)) return erreur(422, "Format de fiche invalide.");
      // fiche déjà publiée sous cet identifiant : on la met à jour à sa place, sinon dossier du thème
      const arbre = await ghJson(env, "/git/trees/main?recursive=1");
      const trouve = arbre.ok && arbre.o && Array.isArray(arbre.o.tree) ? arbre.o.tree.find(t => t.path.startsWith(FICHES.dossierFiches) && t.path.endsWith("/" + id + ".md")) : null;
      const theme = (/^theme: (.*)$/m.exec(texte) || [])[1] || "Divers";
      const dest = trouve ? trouve.path : FICHES.dossierFiches + theme.replace(/[^\p{L}\p{N}_-]/gu, "-") + "/" + id + ".md";
      const actuel = trouve ? await lireFichier(env, dest, "main") : null;
      await ecrireFichier(env, dest, "main", texte, "Fiche validée : " + id + (trouve ? " (mise à jour)" : ""), actuel && actuel.sha);
      await supprimerFichier(env, FICHES.dossierBrouillons + id + ".md", FICHES.branche, f.sha, "Brouillon publié : " + id);
      return json(200, { ok: true, id, chemin: dest, message: "Fiche publiée dans " + dest + " ; le site se met à jour dans quelques minutes." });
    }
  } catch (e) { return erreur(e && e.valide ? 400 : 502, String(e && e.message || e).slice(0, 300)); }
  return erreur(404, "Adresse inconnue.");
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

    if (url.pathname.startsWith("/ia/")) return admin ? laboratoire(req, env, url, json, erreur) : erreur(403, "Réservé à l'administrateur.");
    if (url.pathname.startsWith("/fiches/")) return admin ? fiches(req, env, url, qui, json, erreur) : erreur(403, "Réservé à l'administrateur.");
    if (url.pathname === "/claude/modeles") { const d = await dernieresVersions(env) || {}; return json(200, { ok: true, modeles: Object.entries(d).filter(([f]) => admin || !ADMIN_SEUL.has(f)).map(([f, m]) => ({ famille: f, id: m.id, nom: m.nom, prix: PRIX_FAMILLE[f] })) }); }
    if (url.pathname === "/credits") return json(200, { ok: true, ...(await etatCredits(env, qui)) });

    if (url.pathname === "/chat" || url.pathname === "/") {
      if (!admin) {
        const etat = await etatCredits(env, qui);
        if (etat.fenetre.reste <= 0) return erreur(429, "Limite de crédits des " + (env.FENETRE_HEURES || 5) + " dernières heures atteinte : réessayez plus tard.");
        if (etat.semaine.reste <= 0) return erreur(429, "Limite de crédits de la semaine atteinte.");
      }
      let corps; try { corps = await req.json(); } catch { return erreur(400, "Requête invalide."); }
      const fam = famille(corps.model);
      if (!fam || !/^claude-[a-z]+-[0-9][0-9a-z.\-]*$/.test(corps.model)) return erreur(400, "Modèle non autorisé.");
      if (ADMIN_SEUL.has(fam) && !admin) return erreur(403, "Ce modèle est réservé à l'administrateur.");
      const demande = corps.model, derniere = await dernieresVersions(env);
      if (derniere && derniere[fam]) corps.model = derniere[fam].id;
      corps.max_tokens = Math.min(+corps.max_tokens || 2000, MAX_JETONS);
      corps.stream = true;
      corps.metadata = { user_id: hex(await crypto.subtle.digest("SHA-256", enc.encode(String(qui.e)))).slice(0, 32) };   // identifiant opaque
      // La clé vient du Secrets Store du compte (liaison avec .get()) ou d'un secret propre au Worker (texte)
      const cle = await cleClaude(env);
      if (!cle) return erreur(503, "Clé Claude absente du serveur Cloudflare.");
      const appelerClaude = () => fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: entetesClaude(env, cle), body: JSON.stringify(corps) });
      let res = await appelerClaude();
      if ((res.status === 400 || res.status === 404) && corps.model !== demande) { corps.model = demande; res = await appelerClaude(); }   // la dernière version refuse : version demandée
      if (!res.ok || !res.body) return new Response(res.body, { status: res.status, headers: { ...entetes, "content-type": res.headers.get("content-type") || "application/json" } });
      const [pourNavigateur, pourCompte] = res.body.tee();
      ctx.waitUntil(enregistrer(env, qui.e, corps.model, pourCompte).catch(() => {}));
      return new Response(pourNavigateur, { status: 200, headers: { ...entetes, "content-type": "text/event-stream", "cache-control": "no-store", "x-modele": corps.model, "Access-Control-Expose-Headers": "x-modele" } });
    }
    return erreur(404, "Adresse inconnue.");
  }
};
