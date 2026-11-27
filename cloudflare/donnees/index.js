// Miroir sécurisé des feuilles Google (Worker « donnees »). La feuille reste la source de vérité (les applications
// Apps Script y écrivent) : ce Worker la LIT seulement, jamais d'écriture.
//  - Base D1 « scouthub-donnees » (juridiction UE), séparée de celle des comptes.
//  - Colonnes sensibles chiffrées AES-256-GCM, clé dans un secret du Worker (jamais dans la base ni dans le dépôt).
//  - Lecture des données sensibles : l'administrateur SEUL (DONNEES_ADMINS), avec un jeton de 15 minutes obtenu par
//    ré-authentification Google récente (Worker « auth »), jamais avec la session ordinaire. 100 lignes par appel,
//    plafond horaire, chaque lecture journalisée.
import { jetonGoogle } from "../src/auth.js";
import { cors } from "../src/commun.js";
import { FEUILLES } from "./feuilles.js";

const enc = new TextEncoder(), dec = new TextDecoder();
const VERS_B64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const DE_B64 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
const PAGE = 100, PLAFOND_HEURE = 2000;

// ---------- chiffrement ----------
const clesMemo = new Map();
async function cleAes(env, kid) {
  if (clesMemo.has(kid)) return clesMemo.get(kid);
  const b64 = env["CLE_DONNEES_" + kid];
  if (!b64) throw new Error("Clé de chiffrement « " + kid + " » absente du serveur.");
  const cle = await crypto.subtle.importKey("raw", DE_B64(b64), "AES-GCM", false, ["encrypt", "decrypt"]);
  clesMemo.set(kid, cle); return cle;
}
async function chiffrer(env, texte, aad) {
  const kid = env.CLE_ACTIVE || "1", iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(aad) }, await cleAes(env, kid), enc.encode(texte)));
  const tout = new Uint8Array(12 + ct.length); tout.set(iv); tout.set(ct, 12);
  return { secret: VERS_B64(tout), kid };
}
async function dechiffrer(env, secret, kid, aad) {
  const t = DE_B64(secret);
  return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: t.subarray(0, 12), additionalData: enc.encode(aad) }, await cleAes(env, kid), t.subarray(12)));
}
async function empreinte(env, texte) {   // HMAC (clé dérivée) : ne permet pas de deviner le contenu à partir de la base
  const brut = DE_B64(env["CLE_DONNEES_" + (env.CLE_ACTIVE || "1")]);
  const k = await crypto.subtle.digest("SHA-256", new Uint8Array([...brut, ...enc.encode("empreinte")]));
  const h = await crypto.subtle.importKey("raw", k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return VERS_B64(new Uint8Array(await crypto.subtle.sign("HMAC", h, enc.encode(texte))));
}

// ---------- accès chef : feuille « Groupes et unités » → groupes, unités et habilitations de la base des comptes ----------
const slug = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
async function synchroniserHabilitations(env, entetes, lignes) {
  const col = n => entetes.indexOf(n), iG = col("Groupe"), iU = col("Unité"), iM = [col("Mail"), col("Mail perso")].filter(i => i >= 0);
  if (iG < 0 || iU < 0 || !iM.length) throw new Error("Colonnes Groupe/Unité/Mail introuvables");
  const groupes = new Map(), unites = new Map(), habs = new Map(), ordre = ["chef_unite", "chef_groupe"];
  for (const { cellules: c } of lignes) {
    const g = String(c[iG] || "").trim(), u = String(c[iU] || "").trim(); if (!g || !u) continue;
    const gid = slug(g), uid = gid + "-" + slug(u); if (!gid || !slug(u)) continue;
    groupes.set(gid, g.slice(0, 100)); unites.set(uid, { gid, nom: u.slice(0, 100) });
    const chefGroupe = /:\s*groupe$/i.test(u), role = chefGroupe ? "chef_groupe" : "chef_unite";
    for (const i of iM) for (const m of String(c[i] || "").toLowerCase().split(/[;,\s]+/)) {
      // Seules les adresses @fsggb.fr (comptes officiels) donnent un accès : une adresse personnelle de la feuille ne suffit pas.
      if (!/^[^@\s+]+@fsggb\.fr$/.test(m)) continue;
      const h = habs.get(m);
      if (!h || ordre.indexOf(role) > ordre.indexOf(h.role)) habs.set(m, { role, gid, uid: chefGroupe ? null : uid });
    }
  }
  const maintenant = Date.now(), db = env.AUTH_DB, lot = [];
  for (const [id, nom] of groupes) lot.push(db.prepare("INSERT INTO groupes (id, nom) VALUES (?1, ?2) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom").bind(id, nom));
  for (const [id, u] of unites) lot.push(db.prepare("INSERT INTO unites (id, groupe_id, nom) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET groupe_id = excluded.groupe_id, nom = excluded.nom").bind(id, u.gid, u.nom));
  lot.push(db.prepare("DELETE FROM habilitations"));
  for (const [email, h] of habs) lot.push(db.prepare("INSERT INTO habilitations (email, role, groupe_id, unite_id, maj) VALUES (?1, ?2, ?3, ?4, ?5)").bind(email, h.role, h.gid, h.uid, maintenant));
  await db.batch(lot);   // tout ou rien
  return habs.size;
}

// ---------- synchronisation d'une feuille ----------
async function lireValeurs(env, nom) {
  const jeton = await jetonGoogle(env, "https://www.googleapis.com/auth/spreadsheets.readonly", "");   // identité du compte de service lui-même
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + env.CLASSEUR_ID + "/values/" + encodeURIComponent("'" + nom + "'") + "?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE", { headers: { authorization: "Bearer " + jeton } });
  if (!res.ok) { let m = res.status; try { m = (await res.json()).error?.message || m; } catch {} throw new Error("Lecture refusée (" + m + ")"); }
  return (await res.json()).values || [];
}
async function synchroniser(env, nom) {
  const conf = FEUILLES[nom], maintenant = Date.now();
  await env.DB.prepare("INSERT INTO feuilles (nom, tentative) VALUES (?1, ?2) ON CONFLICT(nom) DO UPDATE SET tentative = ?2").bind(nom, maintenant).run();
  try {
    const v = await lireValeurs(env, nom);
    if (v.length < 1) throw new Error("Feuille vide ou introuvable");
    const entetes = v[0].map((h, i) => String(h || "").trim() || "col_" + (i + 1));
    const lignes = [];
    for (let i = 1; i < v.length; i++) if ((v[i] || []).some(c => String(c || "").trim() !== "")) lignes.push({ rang: i + 1, cellules: v[i] });
    if (nom === "Groupes et unités") await synchroniserHabilitations(env, entetes, lignes);   // toujours : retirer une adresse de la feuille retire l'accès
    const emp = await empreinte(env, JSON.stringify([entetes, lignes.map(l => l.cellules)]));
    const ancienne = await env.DB.prepare("SELECT empreinte FROM feuilles WHERE nom = ?1").bind(nom).first();
    if (ancienne && ancienne.empreinte === emp) {
      await env.DB.prepare("UPDATE feuilles SET statut = 'inchangee', erreur = '' WHERE nom = ?1").bind(nom).run();
      return { statut: "inchangee", lignes: lignes.length };
    }
    const preparees = [];
    for (const l of lignes) {
      const clair = {}, secret = {};
      entetes.forEach((h, i) => { const c = l.cellules[i]; if (c === undefined || c === "") return; (conf.clair.includes(h) ? clair : secret)[h] = c; });
      const { secret: s, kid } = await chiffrer(env, JSON.stringify(secret), nom + "|" + l.rang);
      preparees.push(env.DB.prepare("INSERT INTO lignes (feuille, rang, clair, secret, kid) VALUES (?1, ?2, ?3, ?4, ?5)").bind(nom, l.rang, JSON.stringify(clair), s, kid));
    }
    // Remplacement atomique : toutes les instructions dans un seul lot (tout ou rien).
    const lot = [env.DB.prepare("DELETE FROM lignes WHERE feuille = ?1").bind(nom), ...preparees,
      env.DB.prepare("UPDATE feuilles SET lignes = ?2, maj = ?3, statut = 'ok', erreur = '', empreinte = ?4, entetes = ?5 WHERE nom = ?1").bind(nom, lignes.length, Date.now(), emp, JSON.stringify(entetes))];
    await env.DB.batch(lot);
    return { statut: "ok", lignes: lignes.length };
  } catch (e) {
    const msg = String(e && e.message || e).slice(0, 200);   // message technique seulement, jamais de contenu de la feuille
    await env.DB.prepare("UPDATE feuilles SET statut = 'erreur', erreur = ?2 WHERE nom = ?1").bind(nom, msg).run();
    return { statut: "erreur", erreur: msg };
  }
}
async function toutSynchroniser(env) {   // une feuille qui échoue n'empêche pas les autres
  const out = {}; for (const nom of Object.keys(FEUILLES)) out[nom] = await synchroniser(env, nom); return out;
}

// ---------- accès : l'administrateur seul, avec le jeton de données (15 min, ré-authentification Google récente) ----------
async function administrateur(env, jeton) {
  if (!jeton || typeof jeton !== "string" || jeton.length > 200) return null;
  const r = await env.AUTH.fetch("https://auth.interne/auth/donnees/verifier", { method: "POST", headers: { "content-type": "application/json", Origin: env.SELF_ORIGIN }, body: JSON.stringify({ jeton }) });
  const o = await r.json().catch(() => null);
  if (!o || !o.ok || !o.email) return null;
  const permis = String(env.DONNEES_ADMINS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  return permis.includes(String(o.email).toLowerCase()) ? { email: o.email, expire: o.expire } : null;   // double contrôle, ici aussi
}
const journaliser = (env, email, action, feuille, n) => env.DB.prepare("INSERT INTO journal (ts, email, action, feuille, n) VALUES (?1, ?2, ?3, ?4, ?5)").bind(Date.now(), email, action, feuille || "", n || 0).run();

export default {
  async fetch(req, env) {
    const origine = req.headers.get("Origin") || "", entetes = cors(env, origine), url = new URL(req.url);
    const json = (status, o) => new Response(JSON.stringify(o), { status, headers: { ...entetes, "content-type": "application/json", "cache-control": "no-store" } });
    const erreur = (status, message) => json(status, { type: "error", error: { message } });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: entetes });
    if (req.method !== "POST") return erreur(405, "Méthode refusée.");
    if (!String(env.ORIGINES || "").split(",").map(s => s.trim()).includes(origine)) return erreur(403, "Origine refusée.");
    const r = await req.json().catch(() => ({}));
    const admin = await administrateur(env, r.jeton);
    if (!admin) { await journaliser(env, "inconnu", "refus", url.pathname, 0).catch(() => {}); return erreur(403, "Accès aux données fermé : confirmez votre identité."); }

    if (url.pathname === "/donnees/etat") {
      const { results } = await env.DB.prepare("SELECT nom, lignes, maj, tentative, statut, erreur FROM feuilles ORDER BY nom").all();
      return json(200, { ok: true, feuilles: results, configurees: Object.keys(FEUILLES), expire: admin.expire });
    }
    if (url.pathname === "/donnees/sync") {
      const nom = r.feuille;
      if (nom && !FEUILLES[nom]) return erreur(404, "Feuille inconnue.");
      const rep = nom ? { [nom]: await synchroniser(env, nom) } : await toutSynchroniser(env);
      await journaliser(env, admin.email, "sync", nom || "toutes", 0);
      return json(200, { ok: true, resultat: rep });
    }
    if (url.pathname === "/donnees/filtres") {   // valeurs des colonnes en clair seulement (groupes, unités) : rien à déchiffrer
      const nom = String(r.feuille || ""); if (!FEUILLES[nom]) return erreur(404, "Feuille inconnue.");
      const { results } = await env.DB.prepare("SELECT DISTINCT json_extract(clair, '$.Groupe') AS g, json_extract(clair, '$.\"Unité\"') AS u FROM lignes WHERE feuille = ?1").bind(nom).all();
      return json(200, { ok: true, paires: results.filter(x => x.g || x.u) });
    }
    if (url.pathname === "/donnees/lire") {
      const nom = String(r.feuille || ""); if (!FEUILLES[nom]) return erreur(404, "Feuille inconnue.");
      const debut = Math.max(0, parseInt(r.debut, 10) || 0), limite = Math.min(PAGE, Math.max(1, parseInt(r.limite, 10) || PAGE));
      const lu = await env.DB.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM journal WHERE email = ?1 AND action = 'lire' AND ts > ?2").bind(admin.email, Date.now() - 3600000).first();
      if (lu.n + limite > PLAFOND_HEURE) { await journaliser(env, admin.email, "refus", nom, 0); return erreur(429, "Plafond de lecture horaire atteint."); }
      const groupe = typeof r.groupe === "string" && r.groupe ? r.groupe.slice(0, 120) : null, unite = typeof r.unite === "string" && r.unite ? r.unite.slice(0, 120) : null;
      const f = await env.DB.prepare("SELECT lignes, entetes FROM feuilles WHERE nom = ?1").bind(nom).first();
      const { results } = await env.DB.prepare("SELECT rang, clair, secret, kid FROM lignes WHERE feuille = ?1 AND (?4 IS NULL OR json_extract(clair, '$.Groupe') = ?4) AND (?5 IS NULL OR json_extract(clair, '$.\"Unité\"') = ?5) ORDER BY rang LIMIT ?2 OFFSET ?3").bind(nom, limite, debut, groupe, unite).all();
      const lignes = [];
      for (const l of results) lignes.push({ rang: l.rang, ...JSON.parse(l.clair), ...JSON.parse(await dechiffrer(env, l.secret, l.kid, nom + "|" + l.rang)) });
      await journaliser(env, admin.email, "lire", nom, lignes.length);
      const total = (await env.DB.prepare("SELECT count(*) AS n FROM lignes WHERE feuille = ?1 AND (?2 IS NULL OR json_extract(clair, '$.Groupe') = ?2) AND (?3 IS NULL OR json_extract(clair, '$.\"Unité\"') = ?3)").bind(nom, groupe, unite).first()).n;
      let entetes = []; try { entetes = JSON.parse(f && f.entetes || "[]"); } catch {}
      return json(200, { ok: true, feuille: nom, debut, total, entetes, lignes, expire: admin.expire });
    }
    return erreur(404, "Adresse inconnue.");
  },
  async scheduled(_evt, env, ctx) { ctx.waitUntil(toutSynchroniser(env)); }   // chaque nuit
};
