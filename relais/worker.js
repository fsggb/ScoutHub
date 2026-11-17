// Relais ChatGDB (Cloudflare Workers, plan gratuit) : garde la clé Claude secrète et renvoie la réponse au fil de l'eau.
// Secrets du Worker (Settings › Variables and Secrets, type « Secret ») :
//   ANTHROPIC_KEY  : la clé Claude (jamais visible du navigateur)
//   RELAIS_SECRET  : un long mot de passe aléatoire, le MÊME que la propriété RELAIS_SECRET du serveur ScoutHub
// Le navigateur envoie un jeton signé par le serveur ScoutHub (valable 15 minutes) ; le relais le vérifie lui-même,
// sans appeler Google, puis transmet la requête à Claude.
const ORIGINES = ["https://fsggb.github.io"];
const MODELES = ["claude-haiku-5-5", "claude-sonnet-5-5"];
const MAX_JETONS = 16000;

function entetesCors(origine) {
  return {
    "Access-Control-Allow-Origin": ORIGINES.includes(origine) ? origine : ORIGINES[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-scouthub-jeton",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
const b64url = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

async function verifierJeton(jeton, secret) {
  const [charge, signature] = String(jeton || "").split(".");
  if (!charge || !signature || !secret) return null;
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const attendu = hex(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(charge)));
  if (attendu.length !== signature.length) return null;
  let diff = 0; for (let i = 0; i < attendu.length; i++) diff |= attendu.charCodeAt(i) ^ signature.charCodeAt(i);
  if (diff) return null;
  let p; try { p = JSON.parse(new TextDecoder().decode(b64url(charge))); } catch { return null; }
  return p && p.e && p.x > Date.now() ? p : null;
}

export default {
  async fetch(req, env) {
    const origine = req.headers.get("Origin") || "", cors = entetesCors(origine);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const erreur = (status, message) => new Response(JSON.stringify({ type: "error", error: { message } }), { status, headers: { ...cors, "content-type": "application/json" } });
    if (req.method !== "POST") return erreur(405, "Méthode refusée.");
    if (!ORIGINES.includes(origine)) return erreur(403, "Origine refusée.");
    const qui = await verifierJeton(req.headers.get("x-scouthub-jeton"), env.RELAIS_SECRET);
    if (!qui) return erreur(401, "Session ScoutHub invalide ou expirée : rechargez la page.");
    let corps; try { corps = await req.json(); } catch { return erreur(400, "Requête invalide."); }
    if (!MODELES.includes(corps.model)) return erreur(400, "Modèle non autorisé.");
    corps.max_tokens = Math.min(+corps.max_tokens || 2000, MAX_JETONS);
    // identifiant opaque (empreinte de l'adresse), jamais l'adresse elle-même
    corps.metadata = { user_id: hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(qui.e)))).slice(0, 32) };
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(corps)
    });
    // La réponse (flux SSE) est transmise telle quelle, morceau par morceau
    return new Response(res.body, { status: res.status, headers: { ...cors, "content-type": res.headers.get("content-type") || "text/event-stream", "cache-control": "no-store" } });
  }
};
