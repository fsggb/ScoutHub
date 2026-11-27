// Miroir sécurisé des feuilles Google (Worker « donnees »). La feuille reste la source de vérité (les applications
// Apps Script y écrivent) : ce Worker la LIT seulement, jamais d'écriture.
//  - Base D1 « scouthub-donnees » (juridiction UE), séparée de celle des comptes.
//  - Colonnes sensibles chiffrées AES-256-GCM, clé dans un secret du Worker (jamais dans la base ni dans le dépôt).
//  - Lecture : chaque personne ne reçoit QUE les lignes de sa portée (administrateur : tout ; chef de groupe : son groupe ;
//    chef d'unité : son unité ; autres : rien). La portée vient du Worker « auth » (/auth/portee, d'après l'adresse de
//    connexion) et filtre la requête SQL AVANT tout déchiffrement. Plafond horaire, journal de chaque lecture.
//  - Un administrateur peut simuler une autre adresse (« comme ») : portée calculée comme pour la vraie personne, journalisée.
import { jetonGoogle } from "../src/auth.js";
import { cors } from "../src/commun.js";
import { FEUILLES } from "./feuilles.js";

const enc = new TextEncoder(), dec = new TextDecoder();
const VERS_B64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const DE_B64 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
const PAGE = 100, PLAFOND_HEURE = 6000, SCAN_MAX = 1500;

// ---------- chiffrement ----------
const clesMemo = new Map();
async function cleAes(env, kid) {
  kid = String(kid).split(":")[0];
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
    const emp = await empreinte(env, JSON.stringify(["v3", entetes, lignes.map(l => l.cellules)]));
    const ancienne = await env.DB.prepare("SELECT empreinte FROM feuilles WHERE nom = ?1").bind(nom).first();
    if (ancienne && ancienne.empreinte === emp) {
      await env.DB.prepare("UPDATE feuilles SET statut = 'inchangee', erreur = '' WHERE nom = ?1").bind(nom).run();
      return { statut: "inchangee", lignes: lignes.length };
    }
    // Différentiel : chaque ligne porte l'empreinte de son contenu (« kid » = « 1:empreinte ») ; on n'écrit que ce qui change.
    // Économise l'écriture en base (plan gratuit : 100 000 écritures par jour, index compris) : en régime normal, quelques lignes.
    const existantes = new Map((await env.DB.prepare("SELECT rang, kid FROM lignes WHERE feuille = ?1").bind(nom).all()).results.map(r => [r.rang, r.kid]));
    const lot = [], presentes = new Set(); let ecrites = 0;
    for (const l of lignes) {
      presentes.add(l.rang);
      const h = (await empreinte(env, JSON.stringify([entetes, l.cellules]))).replace(/[^A-Za-z0-9]/g, "").slice(0, 16), ancien = existantes.get(l.rang);
      if (ancien && ancien.endsWith(":" + h)) continue;
      const clair = {}, secret = {};
      entetes.forEach((hh, i) => { const c = l.cellules[i]; if (c === undefined || c === "") return; (conf.clair.includes(hh) ? clair : secret)[hh] = c; });
      const { secret: sc, kid } = await chiffrer(env, JSON.stringify(secret), nom + "|" + l.rang);
      const cel = n => { const i = entetes.indexOf(n); return i < 0 ? "" : String(l.cellules[i] === undefined ? "" : l.cellules[i]).trim(); };
      lot.push(env.DB.prepare("INSERT INTO lignes (feuille, rang, clair, secret, kid, an, gk, uk) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) ON CONFLICT(feuille, rang) DO UPDATE SET clair = excluded.clair, secret = excluded.secret, kid = excluded.kid, an = excluded.an, gk = excluded.gk, uk = excluded.uk")
        .bind(nom, l.rang, JSON.stringify(clair), sc, kid + ":" + h, conf.annee ? cel(conf.annee).slice(0, 20) : "", slug(cel("Groupe")), slug(cel("Unité")))); ecrites++;
    }
    for (const rang of existantes.keys()) if (!presentes.has(rang)) { lot.push(env.DB.prepare("DELETE FROM lignes WHERE feuille = ?1 AND rang = ?2").bind(nom, rang)); ecrites++; }
    lot.push(env.DB.prepare("UPDATE feuilles SET lignes = ?2, maj = ?3, statut = 'ok', erreur = '', empreinte = ?4, entetes = ?5 WHERE nom = ?1").bind(nom, lignes.length, Date.now(), emp, JSON.stringify(entetes)));
    for (let i = 0; i < lot.length; i += 90) await env.DB.batch(lot.slice(i, i + 90));   // par lots (limite du nombre d'instructions)
    return { statut: "ok", lignes: lignes.length, ecrites };
  } catch (e) {
    const msg = String(e && e.message || e).slice(0, 200);   // message technique seulement, jamais de contenu de la feuille
    await env.DB.prepare("UPDATE feuilles SET statut = 'erreur', erreur = ?2 WHERE nom = ?1").bind(nom, msg).run();
    return { statut: "erreur", erreur: msg };
  }
}
async function toutSynchroniser(env) {   // une feuille qui échoue n'empêche pas les autres
  const out = {}; for (const nom of Object.keys(FEUILLES)) out[nom] = await synchroniser(env, nom); return out;
}

// ---------- portée de la personne (Worker auth) ----------
async function portee(env, token, comme) {
  const r = await env.AUTH.fetch("https://auth.interne/auth/portee", { method: "POST", headers: { "content-type": "application/json", Origin: env.SELF_ORIGIN }, body: JSON.stringify({ token, comme: comme || undefined }) });
  const o = await r.json().catch(() => null);
  return o && o.ok ? o : null;
}
const peut = (p, nom) => !!FEUILLES[nom] && (p.acces === "tout" || (FEUILLES[nom].chefs && (p.acces === "groupe" || p.acces === "unite")));
// Filtre de portée appliqué dans la requête SQL, AVANT tout déchiffrement.
function portee_sql(p) {
  if (p.acces === "groupe") return { sql: " AND gk = ?", binds: [p.gk] };
  if (p.acces === "unite") return { sql: " AND gk = ? AND uk = ?", binds: [p.gk, p.uk] };
  return { sql: "", binds: [] };
}
const cle = v => (typeof v === "string" && /^[a-z0-9-]{1,120}$/.test(v)) ? v : "";
// Journal d'accès. Si la base refuse l'écriture (quota, panne), la trace est écrite dans les journaux du Worker (observabilité) :
// la piste d'audit n'est jamais perdue, et une panne du journal n'empêche pas la lecture des personnes autorisées.
const journaliser = async (env, email, action, feuille, n, comme) => {
  try { await env.DB.prepare("INSERT INTO journal (ts, email, action, feuille, n, comme) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").bind(Date.now(), email, action, feuille || "", n || 0, comme || "").run(); }
  catch (e) { console.warn("AUDIT " + JSON.stringify({ ts: Date.now(), email, action, feuille: feuille || "", n: n || 0, comme: comme || "", base: String(e && e.message || e).slice(0, 80) })); }
};

export default {
  async fetch(req, env) {
    const origine = req.headers.get("Origin") || "", entetes = cors(env, origine), url = new URL(req.url);
    const json = (status, o) => new Response(JSON.stringify(o), { status, headers: { ...entetes, "content-type": "application/json", "cache-control": "no-store" } });
    const erreur = (status, message) => json(status, { type: "error", error: { message } });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: entetes });
    if (req.method !== "POST") return erreur(405, "Méthode refusée.");
    if (!String(env.ORIGINES || "").split(",").map(s => s.trim()).includes(origine)) return erreur(403, "Origine refusée.");
    const r = await req.json().catch(() => ({}));
    if (typeof r.token !== "string" || !r.token) return erreur(401, "Session expirée : reconnectez-vous.");
    const comme = typeof r.comme === "string" && r.comme.trim() ? r.comme.trim().toLowerCase() : "";
    const p = await portee(env, r.token, comme);
    if (!p) { await journaliser(env, "inconnu", "refus", url.pathname, 0, comme).catch(() => {}); return erreur(403, comme ? "Simulation refusée." : "Session expirée ou accès refusé."); }
    const reel = p.reel, simule = !!p.simule, admin = p.acces === "tout" && !simule && p.admin_reel;

    if (url.pathname === "/donnees/moi") {   // qui je suis pour le registre + les feuilles qui me concernent
      const feuilles = Object.entries(FEUILLES).filter(([n]) => peut(p, n)).map(([n, f]) => ({ nom: n, titre: f.titre }));
      return json(200, { ok: true, acces: p.acces, role: p.role, groupe: p.groupe, unite: p.unite, email: p.email, simule, admin: !!p.admin_reel, feuilles });
    }
    if (url.pathname === "/donnees/habilites") {   // administrateur : adresses simulables
      if (!p.admin_reel) return erreur(403, "Réservé à l'administrateur.");
      const a = await env.AUTH.fetch("https://auth.interne/auth/habilites", { method: "POST", headers: { "content-type": "application/json", Origin: env.SELF_ORIGIN }, body: JSON.stringify({ token: r.token }) });
      return json(a.status, await a.json().catch(() => ({ ok: false })));
    }
    if (url.pathname === "/donnees/etat") {
      if (!admin) return erreur(403, "Réservé à l'administrateur.");
      const { results } = await env.DB.prepare("SELECT nom, lignes, maj, tentative, statut, erreur FROM feuilles ORDER BY nom").all();
      const connus = new Set((await env.AUTH_DB.prepare("SELECT id FROM groupes").all()).results.map(x => x.id));
      for (const f of results) {   // lignes dont le groupe n'existe pas dans « Groupes et unités » : invisibles des chefs, à corriger dans la feuille
        if (!FEUILLES[f.nom] || !FEUILLES[f.nom].chefs) continue;
        const gs = (await env.DB.prepare("SELECT gk, json_extract(clair, '$.Groupe') AS g, count(*) AS n FROM lignes WHERE feuille = ?1 GROUP BY gk, g").bind(f.nom).all()).results;
        const inconnus = gs.filter(x => !connus.has(x.gk));
        f.orphelines = inconnus.reduce((t, x) => t + x.n, 0); f.groupes_inconnus = inconnus.slice(0, 10).map(x => x.g || "(vide)");
      }
      return json(200, { ok: true, feuilles: results, configurees: Object.keys(FEUILLES) });
    }
    if (url.pathname === "/donnees/sync") {
      if (!admin) return erreur(403, "Réservé à l'administrateur.");
      const nom = r.feuille;
      if (nom && !FEUILLES[nom]) return erreur(404, "Feuille inconnue.");
      const rep = nom ? { [nom]: await synchroniser(env, nom) } : await toutSynchroniser(env);
      await journaliser(env, reel, "sync", nom || "toutes", 0);
      return json(200, { ok: true, resultat: rep });
    }

    const nom = String(r.feuille || "");
    if (!peut(p, nom)) { await journaliser(env, reel, "refus", nom, 0, comme).catch(() => {}); return erreur(403, "Ces données ne vous concernent pas."); }
    const conf = FEUILLES[nom], sc = portee_sql(p);

    if (url.pathname === "/donnees/arbre") {   // effectifs par année / groupe / unité, dans la portée seulement
      const { results } = await env.DB.prepare("SELECT an, gk, uk, json_extract(clair, '$.Groupe') AS g, json_extract(clair, '$.\"Unité\"') AS u, count(*) AS n FROM lignes WHERE feuille = ?1" + sc.sql + " GROUP BY an, gk, uk, g, u").bind(nom, ...sc.binds).all();
      const f = await env.DB.prepare("SELECT entetes FROM feuilles WHERE nom = ?1").bind(nom).first();
      let colonnes = []; try { colonnes = JSON.parse(f && f.entetes || "[]"); } catch {}
      return json(200, { ok: true, feuille: nom, titre: conf.titre, annee: !!conf.annee, vue: conf.vue, colonnes, arbre: results });
    }
    if (url.pathname === "/donnees/lire") {
      const debut = Math.max(0, parseInt(r.debut, 10) || 0), limite = Math.min(PAGE, Math.max(1, parseInt(r.limite, 10) || PAGE));
      const an = typeof r.an === "string" ? r.an.slice(0, 20) : "", gk = cle(r.gk), uk = cle(r.uk), q = typeof r.q === "string" ? r.q.trim().toLowerCase().slice(0, 60) : "";
      const lu = await env.DB.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM journal WHERE email = ?1 AND action IN ('lire','simule') AND ts > ?2").bind(reel, Date.now() - 3600000).first();
      const aScanner = q ? SCAN_MAX : limite;
      if (lu.n + aScanner > PLAFOND_HEURE) { await journaliser(env, reel, "refus", nom, 0, comme); return erreur(429, "Plafond de lecture horaire atteint : réessayez plus tard."); }
      let where = " WHERE feuille = ?1" + sc.sql.replace(/gk = \?/, "gk = ?2").replace(/uk = \?/, "uk = ?3"), binds = [nom, ...sc.binds], n = binds.length;
      if (an) { binds.push(an); where += " AND an = ?" + (++n); }
      if (gk) { binds.push(gk); where += " AND gk = ?" + (++n); }
      if (uk) { binds.push(uk); where += " AND uk = ?" + (++n); }
      const total = (await env.DB.prepare("SELECT count(*) AS n FROM lignes" + where).bind(...binds).first()).n;
      const lire = async l => ({ rang: l.rang, ...JSON.parse(l.clair), ...JSON.parse(await dechiffrer(env, l.secret, l.kid, nom + "|" + l.rang)) });
      let lignes = [], nb = 0, correspondances = total, tronque = false;
      if (!q) {
        const { results } = await env.DB.prepare("SELECT rang, clair, secret, kid FROM lignes" + where + " ORDER BY rang LIMIT ?" + (n + 1) + " OFFSET ?" + (n + 2)).bind(...binds, limite, debut).all();
        for (const l of results) lignes.push(await lire(l)); nb = lignes.length;
      } else {   // recherche : on déchiffre au plus SCAN_MAX lignes DE LA PORTÉE (déjà filtrées) et on compare en mémoire
        const { results } = await env.DB.prepare("SELECT rang, clair, secret, kid FROM lignes" + where + " ORDER BY rang LIMIT ?" + (n + 1)).bind(...binds, SCAN_MAX).all();
        tronque = total > SCAN_MAX; nb = results.length; const trouvees = [];
        for (const l of results) { const x = await lire(l); if (Object.values(x).some(v => String(v).toLowerCase().includes(q))) trouvees.push(x); }
        correspondances = trouvees.length; lignes = trouvees.slice(debut, debut + limite);
      }
      await journaliser(env, reel, simule ? "simule" : "lire", nom, nb, comme);
      return json(200, { ok: true, feuille: nom, debut, total: q ? correspondances : total, tronque, lignes });
    }
    return erreur(404, "Adresse inconnue.");
  },
  async scheduled(_evt, env, ctx) { ctx.waitUntil(toutSynchroniser(env)); }   // chaque nuit
};
