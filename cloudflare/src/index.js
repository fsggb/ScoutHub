// Serveur Cloudflare de ScoutHub (Workers + D1, plan gratuit).
//  POST /chat     : relais ChatGDB. Vérifie le jeton signé par le serveur ScoutHub (Apps Script), applique les limites
//                   de crédits, transmet la requête à Claude et renvoie la réponse au fil de l'eau ; la consommation
//                   est enregistrée dans D1 une fois la réponse terminée.
//  POST /credits  : crédits restants de la personne.
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
async function etatCredits(env, email) {
  const maintenant = Date.now(), h = (+env.FENETRE_HEURES || 5) * 3600000;
  const r = await env.DB.prepare(
    "SELECT COALESCE(SUM(CASE WHEN ts > ?2 THEN credits END), 0) AS fenetre, COALESCE(SUM(credits), 0) AS semaine FROM usage WHERE email = ?1 AND ts > ?3"
  ).bind(email, maintenant - h, maintenant - 7 * 86400000).first();
  const maxF = +env.CREDITS_FENETRE || 30, maxS = +env.CREDITS_SEMAINE || 60;
  return { fenetre: { max: maxF, utilise: r.fenetre, reste: Math.max(0, maxF - r.fenetre) }, semaine: { max: maxS, utilise: r.semaine, reste: Math.max(0, maxS - r.semaine) } };
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

export default {
  async fetch(req, env, ctx) {
    const origine = req.headers.get("Origin") || "", entetes = cors(env, origine), url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: entetes });
    const json = (status, o) => new Response(JSON.stringify(o), { status, headers: { ...entetes, "content-type": "application/json", "cache-control": "no-store" } });
    const erreur = (status, message) => json(status, { type: "error", error: { message } });
    if (req.method !== "POST") return erreur(405, "Méthode refusée.");
    if (!String(env.ORIGINES || "").split(",").map(s => s.trim()).includes(origine)) return erreur(403, "Origine refusée.");
    const qui = await verifierJeton(req.headers.get("x-scouthub-jeton"), env.RELAIS_SECRET);
    if (!qui) return erreur(401, "Session ScoutHub invalide ou expirée : rechargez la page.");
    const admin = qui.r === "admin";

    if (url.pathname === "/credits") return json(200, { ok: true, illimite: admin, ...(await etatCredits(env, qui.e)) });

    if (url.pathname === "/chat" || url.pathname === "/") {
      if (!admin) {
        const etat = await etatCredits(env, qui.e);
        if (etat.fenetre.reste <= 0) return erreur(429, "Limite de crédits des " + (env.FENETRE_HEURES || 5) + " dernières heures atteinte : réessayez plus tard.");
        if (etat.semaine.reste <= 0) return erreur(429, "Limite de crédits de la semaine atteinte.");
      }
      let corps; try { corps = await req.json(); } catch { return erreur(400, "Requête invalide."); }
      if (!MODELES[corps.model]) return erreur(400, "Modèle non autorisé.");
      corps.max_tokens = Math.min(+corps.max_tokens || 2000, MAX_JETONS);
      corps.stream = true;
      corps.metadata = { user_id: hex(await crypto.subtle.digest("SHA-256", enc.encode(String(qui.e)))).slice(0, 32) };   // identifiant opaque
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
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
