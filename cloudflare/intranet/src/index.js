// Intranet FSGGB (intranet.fsggb.workers.dev) — version 1.0.0.
// Sert le portail ScoutHub (instantané src/files.json, voir construire.mjs) et relaie le reste vers la production,
// mais UNIQUEMENT à une personne connectée : le contrôle se fait ici, avant d'envoyer le moindre octet de page.
//
//   Public           /connexion (page de connexion), /_connexion/* (Google, code e-mail), /_etat, /assets/fsggb.png
//   Avec session     tout le reste ; /_deconnexion (POST) ; /sortie/<application>?vers=<adresse> (connexion unifiée)
//
// Identité : le Worker « auth » (liaison de service AUTH, auth.fsggb.workers.dev), même base D1 que tout le reste.
// La session est un cookie HttpOnly/Secure/SameSite=Lax qui contient le jeton de session ; il est revérifié auprès
// d'auth (mémorisé 20 s) à chaque requête : une déconnexion ou une suppression de compte coupe l'accès aussitôt.
import FICHIERS from "./files.json";
import { pageConnexion } from "./connexion.js";

const VERSION = "1.0.0", COOKIE = "sh_session", PROD = "https://fsggb.github.io/ScoutHub/";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const SECURITE = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "SAMEORIGIN", "strict-transport-security": "max-age=31536000", "content-security-policy": "object-src 'none'; base-uri 'self'; frame-ancestors 'self'" };
const CSP_CONNEXION = "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; frame-src https://accounts.google.com/gsi/; connect-src 'self' https://accounts.google.com/gsi/; img-src 'self' data: https:";
const b64ToBytes = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const extOf = p => { const i = p.lastIndexOf("."); return i < 0 ? "" : p.slice(i); };
const lireCookie = (req, nom) => { const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + nom + "=([0-9a-f]{20,200})")); return m ? m[1] : ""; };
const cookie = (env, valeur, duree) => `${COOKIE}=${valeur}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${duree}`;
const retourSur = r => (typeof r === "string" && /^\/(?![\/\\])[^\s\\]*$/.test(r) && !r.startsWith("/connexion") && !r.startsWith("/_")) ? r : "/";
const reponseJson = (status, o, extra = {}) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...SECURITE, ...extra } });
const erreur = (status, message) => reponseJson(status, { type: "error", error: { message } });

// Appel au Worker d'identité. L'en-tête Origin est celui de l'intranet, déjà autorisé côté auth.
async function auth(env, chemin, corps) {
  const r = await env.AUTH.fetch("https://auth.interne" + chemin, { method: "POST", headers: { "content-type": "application/json", Origin: env.SELF_ORIGIN }, body: JSON.stringify(corps) });
  let o; try { o = await r.json(); } catch { o = { type: "error", error: { message: "Réponse invalide du serveur d'identité." } }; }
  return { status: r.status, o };
}

// Session : jeton du cookie → utilisateur, mémorisé 20 s dans l'isolat pour ne pas interroger la base à chaque fichier.
const memo = new Map();
async function session(req, env) {
  const jeton = lireCookie(req, COOKIE);
  if (!jeton) return null;
  const m = memo.get(jeton);
  if (m && m.exp > Date.now()) return m.s;
  const { o } = await auth(env, "/auth/me", { token: jeton });
  const s = o && o.ok ? { jeton, user: o.user } : null;
  if (memo.size > 500) memo.clear();
  memo.set(jeton, { s, exp: Date.now() + 20000 });
  return s;
}

async function connexion(req, env, chemin) {
  if (req.headers.get("Origin") !== env.SELF_ORIGIN) return erreur(403, "Origine refusée.");   // anti-CSRF
  const corps = await req.json().catch(() => ({}));
  const routes = { google: "/auth/google", "code/demander": "/auth/code/demander", "code/verifier": "/auth/code/verifier" };
  const cible = routes[chemin];
  if (!cible) return erreur(404, "Adresse inconnue.");
  const { status, o } = await auth(env, cible, corps);
  if (!(o && o.ok && o.token)) return reponseJson(status, o);
  const duree = (+env.SESSION_JOURS || 14) * 86400;
  return reponseJson(200, o, { "set-cookie": cookie(env, o.token, duree) });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    let p = decodeURIComponent(url.pathname);
    const lecture = req.method === "GET" || req.method === "HEAD";

    // ----- sans session -----
    if (p === "/_etat") return reponseJson(200, { ok: true, service: "intranet", version: VERSION });
    if (p === "/connexion" && lecture) {
      const html = pageConnexion(env.GOOGLE_CLIENT_ID || "", retourSur(url.searchParams.get("retour")));
      return new Response(req.method === "HEAD" ? null : html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...SECURITE, "content-security-policy": CSP_CONNEXION } });
    }
    if (p === "/assets/fsggb.png" && lecture) return fichier("assets/fsggb.png", false);
    if (p.startsWith("/_connexion/") && req.method === "POST") return connexion(req, env, p.slice("/_connexion/".length));

    // ----- contrôle de session : rien d'autre ne part sans elle -----
    const s = await session(req, env);
    if (!s) {
      if (lecture && /text\/html|\*\/\*/.test(req.headers.get("accept") || "*/*") && !/\.(js|css|png|jpe?g|svg|json|webmanifest)$/.test(p))
        return new Response(null, { status: 302, headers: { location: "/connexion?retour=" + encodeURIComponent(p + url.search), "cache-control": "no-store", "set-cookie": cookie(env, "", 0) } });
      return erreur(401, "Connexion requise.");
    }

    if (p === "/_deconnexion" && req.method === "POST") {
      if (req.headers.get("Origin") !== env.SELF_ORIGIN) return erreur(403, "Origine refusée.");
      await auth(env, "/auth/logout", { token: s.jeton }); memo.delete(s.jeton);
      return new Response(null, { status: 303, headers: { location: "/connexion", "set-cookie": cookie(env, "", 0), "cache-control": "no-store" } });
    }

    // Connexion unifiée : /sortie/<application>?vers=<adresse> → code à usage unique, puis redirection vers l'application.
    if (p.startsWith("/sortie/") && lecture) {
      let apps = {}; try { apps = JSON.parse(env.APPS_EXTERNES || "{}"); } catch {}
      const aud = p.slice("/sortie/".length), base = apps[aud], vers = url.searchParams.get("vers") || base;
      if (!base || !vers || !vers.startsWith(base)) return erreur(404, "Application inconnue.");
      const { o } = await auth(env, "/auth/echange/emettre", { token: s.jeton, aud });
      if (!o || !o.ok) return erreur(502, "Connexion à l'application impossible pour le moment.");
      const cible = new URL(vers); cible.searchParams.set("code", o.code); cible.searchParams.set("aud", aud);
      return new Response(null, { status: 302, headers: { location: cible.href, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
    }

    // ----- pages et fichiers -----
    if (!lecture) return erreur(405, "Méthode refusée.");
    if (p === "/" || p.endsWith("/")) p += "index.html";
    const cle = p.replace(/^\//, "");
    if (FICHIERS[cle]) return fichier(cle, true, req);
    // Pas une page de ScoutHub (Word/, Excel/, …) : relayé depuis la production, SANS le cookie ni aucun en-tête de session.
    const propre = new Headers(); for (const h of ["accept", "accept-language", "user-agent", "range"]) { const v = req.headers.get(h); if (v) propre.set(h, v); }
    const r = await fetch(PROD + cle + url.search, { method: req.method, headers: propre, redirect: "follow" });
    const h = new Headers(r.headers); h.delete("set-cookie"); h.set("cache-control", "private, no-store"); for (const [k, v] of Object.entries(SECURITE)) h.set(k, v);
    return new Response(r.body, { status: r.status, headers: h });
  }
};

function fichier(cle, prive, req) {
  const f = FICHIERS[cle];
  if (!f) return erreur(404, "Introuvable.");
  const entetes = { "content-type": MIME[extOf(cle)] || "application/octet-stream", "cache-control": prive ? "private, no-store" : "public, max-age=3600", ...SECURITE };
  return new Response(req && req.method === "HEAD" ? null : (f.type === "b64" ? b64ToBytes(f.data) : f.data), { headers: entetes });
}
