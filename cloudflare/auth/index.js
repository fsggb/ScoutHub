// Worker d'identité de la fédération (auth.fsggb.workers.dev) : API d'authentification unique pour toutes les
// applications, y compris celles qui ne partagent pas le domaine du portail (Apps Script…). Même code que le
// Worker « scouthub » (../src/auth.js) et même base D1 : les sessions et les comptes sont communs.
// Sont acceptées : les appels de navigateur depuis ORIGINES, et — pour /auth/echange/valider seulement — les appels
// de serveur à serveur sans en-tête Origin (UrlFetchApp d'Apps Script) : le code à usage unique sert alors de preuve.
import { authRoute } from "../src/auth.js";
import { cors } from "../src/commun.js";

export default {
  async fetch(req, env) {
    const origine = req.headers.get("Origin") || "", entetes = cors(env, origine), url = new URL(req.url);
    const json = (status, o) => new Response(JSON.stringify(o), { status, headers: { ...entetes, "content-type": "application/json", "cache-control": "no-store" } });
    const erreur = (status, message) => json(status, { type: "error", error: { message } });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: entetes });
    if (req.method === "GET" && url.pathname === "/") return json(200, { ok: true, service: "auth" });
    if (req.method !== "POST") return erreur(405, "Méthode refusée.");
    const serveurAServeur = !origine && (url.pathname === "/auth/echange/valider" || url.pathname === "/auth/session/valider");
    if (!serveurAServeur && !String(env.ORIGINES || "").split(",").map(s => s.trim()).includes(origine)) return erreur(403, "Origine refusée.");
    if (url.pathname.startsWith("/auth/")) return authRoute(req, env, url, json, erreur);
    return erreur(404, "Adresse inconnue.");
  }
};
