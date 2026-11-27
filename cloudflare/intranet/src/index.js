// Intranet FSGGB (intranet.fsggb.workers.dev) — version 1.0.0.
// Sert le portail ScoutHub (instantané src/files.json, voir construire.mjs) et relaie le reste vers la production,
// mais UNIQUEMENT à une personne connectée : le contrôle se fait ici, avant d'envoyer le moindre octet de page.
//
//   Public           la page de connexion du PORTAIL (index.html et ses fichiers : styles, scripts, logo, config réduite à
//                    l'identité), /_session (POST : pose le cookie après une connexion), /_etat. UNE seule page de connexion.
//   Avec session     tout le reste ; /_deconnexion (POST) ; /sortie/<application>?vers=<adresse> (connexion unifiée)
//
// Identité : le Worker « auth » (liaison de service AUTH, auth.fsggb.workers.dev), même base D1 que tout le reste.
// La session est un cookie HttpOnly/Secure/SameSite=Lax qui contient le jeton de session ; il est revérifié auprès
// d'auth (mémorisé 20 s) à chaque requête : une déconnexion ou une suppression de compte coupe l'accès aussitôt.
import FICHIERS from "./files.json";
import { jetonGoogle } from "../../src/auth.js";

const VERSION = "1.0.0", COOKIE = "sh_session", PROD = "https://fsggb.github.io/ScoutHub/";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const SECURITE = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "SAMEORIGIN", "strict-transport-security": "max-age=31536000", "content-security-policy": "object-src 'none'; base-uri 'self'; frame-ancestors 'self'" };
// Fichiers servis sans session : uniquement ce qu'il faut pour afficher la page de connexion du portail (aucune adresse d'application).
const PUBLICS = new Set(["index.html", "styles.css", "hub.css", "common.js", "app.js", "scouthub-client.js", "assets/fsggb.png"]);
const CONFIG_PUBLIQUE = /^window\.SCOUTHUB_(GOOGLE_CLIENT_ID|API|AUTH_API|INTRANET)\s*=/;
const enc = new TextEncoder();
const b64ToBytes = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const extOf = p => { const i = p.lastIndexOf("."); return i < 0 ? "" : p.slice(i); };
const lireCookie = (req, nom) => { const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + nom + "=([0-9a-f]{20,200})")); return m ? m[1] : ""; };
const cookie = (env, valeur, duree) => `${COOKIE}=${valeur}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${duree}`;
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

// ---------- images du Drive (lecture seule) ----------
// Le dossier Drive (DRIVE_IMAGES_ID) contient aussi la base de données de l'ancienne application AppSheet : on n'y touche JAMAIS.
// Portée « drive.readonly » (aucune écriture possible), uniquement le sous-dossier « Images/ », uniquement des fichiers image,
// uniquement en lecture. Résultat mémorisé 1 jour (cache Cloudflare) : le Drive n'est pas interrogé à chaque affichage.
const echap = t => String(t).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
async function driveListe(jeton, q) {
  const r = await fetch("https://www.googleapis.com/drive/v3/files?pageSize=10&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,mimeType,size,thumbnailLink)&q=" + encodeURIComponent(q), { headers: { authorization: "Bearer " + jeton } });
  if (!r.ok) throw new Error("Drive " + r.status);
  return (await r.json()).files || [];
}
async function imageDrive(env, chemin, ctx) {
  const segs = chemin.split("/").filter(Boolean);
  if (!env.DRIVE_IMAGES_ID || segs.length < 2 || segs.length > 5 || !(segs[0].toLowerCase() === "images" || (segs.length === 4 && segs.slice(0, 3).map(x => x.toLowerCase()).join("/") === "appsheet/acces_chef/tutos")) || segs.some(x => x === "." || x === ".." || !/^[^\\<>:"|?*\u0000-\u001f]{1,120}$/.test(x))) return erreur(404, "Image inconnue.");
  const cle = new Request("https://img.interne/" + encodeURIComponent(segs.join("/"))), cache = caches.default;
  const connue = await cache.match(cle); if (connue) return connue;
  try {
    const jeton = await jetonGoogle(env, "https://www.googleapis.com/auth/drive.readonly", "");
    let parent = env.DRIVE_IMAGES_ID;
    for (const seg of segs.slice(0, -1)) {
      const d = (await driveListe(jeton, `'${echap(parent)}' in parents and name = '${echap(seg)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`))[0];
      if (!d) return erreur(404, "Image inconnue.");
      parent = d.id;
    }
    const feuille = segs[segs.length - 1].replace(/\.(png|jpe?g|webp|svg|gif)$/i, "");
    const trouves = (await driveListe(jeton, `'${echap(parent)}' in parents and name contains '${echap(feuille)}' and mimeType contains 'image/' and trashed = false`)).filter(f => /^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(f.mimeType));
    const f = trouves.find(x => x.name.toLowerCase() === segs[segs.length - 1].toLowerCase()) || trouves.find(x => x.name.toLowerCase().startsWith(feuille.toLowerCase() + ".")) || trouves[0];
    if (!f || (+f.size || 0) > 4e6) return erreur(404, "Image inconnue.");
    let r = null, type = f.mimeType;
    if (f.thumbnailLink && (+f.size || 0) > 150000) { const t = await fetch(f.thumbnailLink.replace(/=s\d+$/, "=s700"), { headers: { authorization: "Bearer " + jeton } }); if (t.ok) { r = t; type = t.headers.get("content-type") || "image/jpeg"; } }
    if (!r) { r = await fetch("https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(f.id) + "?alt=media&supportsAllDrives=true", { headers: { authorization: "Bearer " + jeton } }); if (!r.ok) return erreur(404, "Image inconnue."); }
    const rep = new Response(r.body, { headers: { "content-type": type, "cache-control": "private, max-age=86400", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'", ...SECURITE } });
    ctx.waitUntil(cache.put(cle, rep.clone()));
    return rep;
  } catch { return erreur(502, "Image momentanément indisponible."); }
}

// Fichiers PDF (revues) : dossier « Revues_Files_ » uniquement, type PDF uniquement, 30 Mo au plus, lecture seule. Réservé aux chefs
// (le contrôle de rôle est fait par l'appelant) ; jamais mémorisé dans le cache partagé.
async function pdfDrive(env, chemin) {
  const segs = chemin.split("/").filter(Boolean);
  if (!env.DRIVE_IMAGES_ID || segs.length !== 2 || segs[0].toLowerCase() !== "revues_files_" || segs.some(x => x === "." || x === ".." || !/^[^\\<>:"|?*\u0000-\u001f]{1,160}$/.test(x))) return erreur(404, "Document inconnu.");
  try {
    const jeton = await jetonGoogle(env, "https://www.googleapis.com/auth/drive.readonly", "");
    const d = (await driveListe(jeton, `'${echap(env.DRIVE_IMAGES_ID)}' in parents and name = '${echap(segs[0])}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`))[0];
    if (!d) return erreur(404, "Document inconnu.");
    const f = (await driveListe(jeton, `'${echap(d.id)}' in parents and name = '${echap(segs[1])}' and mimeType = 'application/pdf' and trashed = false`))[0];
    if (!f || (+f.size || 0) > 3e7) return erreur(404, "Document inconnu.");
    const r = await fetch("https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(f.id) + "?alt=media&supportsAllDrives=true", { headers: { authorization: "Bearer " + jeton } });
    if (!r.ok) return erreur(404, "Document inconnu.");
    return new Response(r.body, { headers: { "content-type": "application/pdf", "content-disposition": "inline", "cache-control": "private, max-age=600", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; plugin-types application/pdf", ...SECURITE } });
  } catch { return erreur(502, "Document momentanément indisponible."); }
}

// Miniature de la 1re page d'un document (revue PDF, document Google) : SEULEMENT avec un jeton signé par le serveur d'identité,
// délivré avec les lignes que la personne a le droit de voir. Aucun identifiant de fichier n'est accepté sans signature valide.
const deb64u = t => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function miniature(env, jetonMini, ctx) {
  const [pl, sig] = String(jetonMini).split(".");
  if (!env.MINIATURE_CLE || !pl || !sig || sig.length < 20 || pl.length > 300) return erreur(404, "Miniature inconnue.");
  let payload; try { payload = new TextDecoder().decode(deb64u(pl)); } catch { return erreur(404, "Miniature inconnue."); }
  const k = await crypto.subtle.importKey("raw", enc.encode(env.MINIATURE_CLE), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const attendu = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(payload))))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 27);
  if (attendu.length !== sig.length || [...attendu].reduce((d, c, i) => d | (c.charCodeAt(0) ^ sig.charCodeAt(i)), 0) !== 0) return erreur(404, "Miniature inconnue.");
  const cle = new Request("https://mini.interne/" + encodeURIComponent(payload)), cache = caches.default;
  const connue = await cache.match(cle); if (connue) return connue;
  try {
    const jeton = await jetonGoogle(env, "https://www.googleapis.com/auth/drive.readonly", "");
    let f = null;
    if (payload.startsWith("i:")) { const r = await fetch("https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(payload.slice(2)) + "?supportsAllDrives=true&fields=id,thumbnailLink", { headers: { authorization: "Bearer " + jeton } }); if (r.ok) f = await r.json(); }
    else if (payload.startsWith("p:")) {
      const segs = payload.slice(2).split("/"); if (segs.length !== 2 || segs[0].toLowerCase() !== "revues_files_") return erreur(404, "Miniature inconnue.");
      const d = (await driveListe(jeton, `'${echap(env.DRIVE_IMAGES_ID)}' in parents and name = '${echap(segs[0])}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`))[0];
      if (d) f = (await driveListe(jeton, `'${echap(d.id)}' in parents and name = '${echap(segs[1])}' and mimeType = 'application/pdf' and trashed = false`))[0];
    }
    if (!f || !f.thumbnailLink) return erreur(404, "Miniature indisponible.");
    const t = await fetch(f.thumbnailLink.replace(/=s\d+$/, "=s480"), { headers: { authorization: "Bearer " + jeton } });
    if (!t.ok) return erreur(404, "Miniature indisponible.");
    const rep = new Response(t.body, { headers: { "content-type": t.headers.get("content-type") || "image/jpeg", "cache-control": "private, max-age=604800", "content-security-policy": "default-src 'none'", ...SECURITE } });
    ctx.waitUntil(cache.put(cle, rep.clone()));
    return rep;
  } catch { return erreur(502, "Miniature momentanément indisponible."); }
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    let p = decodeURIComponent(url.pathname);
    const lecture = req.method === "GET" || req.method === "HEAD";

    // ----- sans session -----
    if (p === "/_etat") return reponseJson(200, { ok: true, service: "intranet", version: VERSION });
    if (p === "/connexion" && lecture) return new Response(null, { status: 302, headers: { location: "/index.html?connexion=1", "cache-control": "no-store" } });   // ancien lien
    if (p === "/_session" && req.method === "POST") {   // le portail confie le jeton de la personne qui vient de se connecter
      if (req.headers.get("Origin") !== env.SELF_ORIGIN) return erreur(403, "Origine refusée.");
      const corps = await req.json().catch(() => ({}));
      const jeton = typeof corps.token === "string" && /^[0-9a-f]{20,200}$/.test(corps.token) ? corps.token : "";
      const { o } = jeton ? await auth(env, "/auth/me", { token: jeton }) : { o: null };
      if (!o || !o.ok) return erreur(401, "Session invalide.");
      return reponseJson(200, { ok: true }, { "set-cookie": cookie(env, jeton, (+env.SESSION_JOURS || 14) * 86400) });
    }
    const cle0 = (p === "/" ? "index.html" : p.replace(/^\//, ""));
    if (lecture && PUBLICS.has(cle0)) return fichier(cle0, false, req);
    if (lecture && cle0 === "config.js" && !(await session(req, env))) {   // sans session : seulement l'identité (pas la liste des applications)
      const reduit = String(FICHIERS["config.js"].data).split("\n").filter(l => CONFIG_PUBLIQUE.test(l)).join("\n");
      return new Response(req.method === "HEAD" ? null : reduit, { headers: { "content-type": MIME[".js"], "cache-control": "private, no-store", ...SECURITE } });
    }

    // ----- contrôle de session : rien d'autre ne part sans elle -----
    const s = await session(req, env);
    if (!s) {
      if (lecture && /text\/html|\*\/\*/.test(req.headers.get("accept") || "*/*") && !/\.(js|css|png|jpe?g|svg|json|webmanifest)$/.test(p))
        return new Response(null, { status: 302, headers: { location: "/index.html?next=" + encodeURIComponent((p + url.search).replace(/^\//, "")), "cache-control": "no-store", "set-cookie": cookie(env, "", 0) } });
      return erreur(401, "Connexion requise.");
    }

    if (p === "/_deconnexion" && req.method === "POST") {
      if (req.headers.get("Origin") !== env.SELF_ORIGIN) return erreur(403, "Origine refusée.");
      await auth(env, "/auth/logout", { token: s.jeton }); memo.delete(s.jeton);
      return new Response(null, { status: 303, headers: { location: "/index.html", "set-cookie": cookie(env, "", 0), "cache-control": "no-store" } });
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

    if (p.startsWith("/img/") && lecture) return imageDrive(env, p.slice(5), ctx);
    if (p.startsWith("/miniature/") && lecture) { if (s.user.fsggb === false) return erreur(403, "Réservé aux membres."); return miniature(env, p.slice(11), ctx); }
    if (p.startsWith("/fichier/") && lecture) {
      const ROLES = ["adherent", "parent", "chef_unite", "chef_groupe", "equipe_nationale", "admin"];
      if (s.user.fsggb === false || ROLES.indexOf(s.user.role) < ROLES.indexOf("chef_unite")) return erreur(403, "Document réservé aux chefs.");
      return pdfDrive(env, p.slice(9));
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

// Empreinte du contenu (ETag), calculée une fois par isolat : le navigateur revalide à chaque ouverture et ne retélécharge
// que si le fichier a changé (réponse 304). Plus jamais une ancienne version restée en mémoire après un déploiement.
const etags = new Map();
async function etag(cle, f) {
  if (!etags.has(cle)) etags.set(cle, '"' + [...new Uint8Array(await crypto.subtle.digest("SHA-1", enc.encode(f.data)))].slice(0, 10).map(b => b.toString(16).padStart(2, "0")).join("") + '"');
  return etags.get(cle);
}
async function fichier(cle, prive, req) {
  const f = FICHIERS[cle];
  if (!f) return erreur(404, "Introuvable.");
  const entetes = { "content-type": MIME[extOf(cle)] || "application/octet-stream", ...SECURITE };
  if (prive) entetes["cache-control"] = "private, no-store";
  else if (f.type === "b64") entetes["cache-control"] = "public, max-age=3600";   // images : changent rarement
  else if (req && new URL(req.url).searchParams.has("v")) { entetes["cache-control"] = "public, max-age=31536000, immutable"; }   // adresse versionnée : le contenu ne change jamais
  else { entetes["cache-control"] = "no-cache"; entetes["etag"] = await etag(cle, f); if (req && req.headers.get("if-none-match") === entetes["etag"]) return new Response(null, { status: 304, headers: entetes }); }
  return new Response(req && req.method === "HEAD" ? null : (f.type === "b64" ? b64ToBytes(f.data) : f.data), { headers: entetes });
}
