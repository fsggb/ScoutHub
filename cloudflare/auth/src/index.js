// Worker d'identité de la fédération (auth.fsggb.workers.dev) : API d'authentification unique de toutes les
// applications, y compris celles qui ne partagent pas le domaine du portail (Apps Script, GitHub Pages).
// Il partage la base D1 « scouthub » avec le Worker principal (relais ChatGDB, cartes, partage…), mais ne fait QUE
// l'identité : tout le code est dans auth.js, ce fichier ne contient que le CORS et l'aiguillage.
//
// Routes (toutes en POST, JSON) : /auth/google, /auth/code/*, /auth/magic/*, /auth/me, /auth/logout, /auth/outils,
// /auth/admin*, /auth/sso/emettre (navigateur) et /auth/sso/echanger (serveur d'une application, sans origine).
import { authRoute } from "./auth.js";

function cors(env, origine) {
  const ok = String(env.ORIGINES || "").split(",").map(s => s.trim()).filter(Boolean);
  return {
    "Access-Control-Allow-Origin": ok.includes(origine) ? origine : ok[0] || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

export default {
  async fetch(req, env) {
    const origine = req.headers.get("Origin") || "", entetes = cors(env, origine), url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: entetes });
    const json = (status, o) => new Response(JSON.stringify(o), { status, headers: { ...entetes, "content-type": "application/json", "cache-control": "no-store" } });
    const erreur = (status, message) => json(status, { type: "error", error: { message } });
    if (req.method !== "POST") return erreur(405, "Méthode refusée.");
    if (!url.pathname.startsWith("/auth/")) return erreur(404, "Adresse inconnue.");
    // L'échange de code vient du serveur d'une application (pas d'en-tête Origin) : il est protégé par la clé de
    // l'application (voir auth.js) et non par l'origine. Tout le reste exige une origine autorisée.
    if (url.pathname !== "/auth/sso/echanger" && !String(env.ORIGINES || "").split(",").map(s => s.trim()).includes(origine)) return erreur(403, "Origine refusée.");
    return authRoute(req, env, url, json, erreur);
  }
};
