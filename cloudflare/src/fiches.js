// ---------- FICHES DE CONNAISSANCES : brouillons proposés par ChatGDB, validés par l'administrateur ----------
// ChatGDB propose une fiche (/fiches/brouillon) : elle est écrite dans le dépôt ChatGDB, sur la branche « brouillons » uniquement, dans
// connaissances/brouillons/. Elle n'est publiée (branche main, connaissances/src/) que quand l'administrateur la valide (/fiches/valider).
// Garde-fous fixes, vérifiés ici et non par une IA : administrateur seul, un seul dépôt, deux dossiers, identifiant en minuscules-tirets,
// taille et nombre par jour plafonnés, jamais d'écrasement par un brouillon, journal = historique git.
import { enc, jourUtc } from "./commun.js";

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
export async function fiches(req, env, url, qui, json, erreur) {
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
