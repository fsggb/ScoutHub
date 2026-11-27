// Site de test : le vrai ScoutHub (branche claude/nav-4-onglets), servi depuis un Worker plutôt que Cloudflare Pages
// (l'envoi direct de fichiers vers Pages n'est pas disponible depuis cette session, voir l'explication donnée à l'écrit).
// Fichiers embarqués tels quels (fichiers.json, générés depuis le dépôt réel) ; pas de build, pas de copie manuelle.
// Tout ce qui n'est pas une page de ScoutHub lui-même (Word, Excel, Photoshop, SolidCraft…) est relayé tel quel
// depuis la vraie production (fsggb.github.io/ScoutHub/...), pour que les applications restent utilisables depuis ce lien de test.
import FICHIERS from "./files.json";

const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const b64ToBytes = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const extOf = p => { const i = p.lastIndexOf("."); return i < 0 ? "" : p.slice(i); };
const PROD = "https://fsggb.github.io/ScoutHub/";

export default {
  async fetch(req) {
    const url = new URL(req.url);
    let p = decodeURIComponent(url.pathname.replace(/^\//, ""));
    if (p === "" || p.endsWith("/")) p += "index.html";
    const f = FICHIERS[p];
    if (f) {
      const headers = { "content-type": MIME[extOf(p)] || "application/octet-stream", "cache-control": "no-store" };
      return new Response(f.type === "b64" ? b64ToBytes(f.data) : f.data, { headers });
    }
    // Pas une page de ScoutHub (ex. Word/, Excel/, SolidCraft/…) : relais vers la vraie production, inchangé.
    return fetch(PROD + p, { headers: req.headers, redirect: "follow" });
  }
};
