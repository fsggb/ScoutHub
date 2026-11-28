// Outils de ChatGDB exécutés côté serveur, sans Apps Script : base de connaissances (fiches publiées par le dépôt ChatGDB,
// lues dans le Worker « chatgdb » par liaison de service : toujours la version déployée depuis GitHub).
import { quiEstCe } from "./auth.js";

export const OUTILS_BASE = [
  { name: "chercher_connaissances", description: "Cherche dans la base de connaissances de la fédération : fiches de synthèse détaillées tirées de la documentation (froissartage, nœuds et matelotage, cuisine de camp, feu, entretien des outils, pyrotechnie, topographie, cryptographie, documents religieux, carnet de chants) et notices complètes des applications de ScoutHub. À consulter AVANT le web pour toute question technique scoute ou sur une application. Renvoie identifiants, titres, thèmes, résumés, sections et fiches liées.", input_schema: { type: "object", properties: { requete: { type: "string", description: "Quelques mots-clés ou la question." }, theme: { type: "string", description: "Facultatif : limiter à un thème (ex. Froissartage)." } }, required: ["requete"] } },
  { name: "lire_fiche", description: "Lit une fiche de la base de connaissances en entier (identifiant donné par chercher_connaissances), ou seulement une section. Indique ses sources (documents du Drive) et ses fiches liées.", input_schema: { type: "object", properties: { id: { type: "string" }, section: { type: "string", description: "Facultatif : titre (ou début du titre) de la section voulue." } }, required: ["id"] } }
];
const norm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
let memoIndex = null, memoDate = 0;
async function lire(env, chemin) { const r = await env.CHATGDB.fetch(new Request("https://outil.interne" + chemin)); return r.ok ? r : null; }
async function index(env) {
  if (memoIndex && Date.now() - memoDate < 600000) return memoIndex;
  const r = await lire(env, "/connaissances/index.json"); if (!r) return null;
  memoIndex = await r.json(); memoDate = Date.now(); return memoIndex;
}
async function chercher(env, requete, theme) {
  const idx = await index(env); if (!idx || !idx.fiches) return null;
  const mots = norm(requete).split(" ").filter(m => m.length > 2).slice(0, 12), th = norm(theme), voisins = {};
  (idx.liens || []).forEach(l => { (voisins[l.de] = voisins[l.de] || []).push(l.vers); (voisins[l.vers] = voisins[l.vers] || []).push(l.de); });
  return idx.fiches.map(f => {
    if (th && norm(f.theme) !== th) return null;
    const titre = norm(f.titre), cles = norm((f.mots_cles || []).join(" ")), reste = norm(f.resume + " " + (f.sections || []).join(" ") + " " + f.theme);
    let score = 0;
    mots.forEach(m => { const r = m.slice(0, Math.max(4, m.length - 2)); if (titre.includes(r)) score += 5; if (cles.includes(r)) score += 3; if (reste.includes(r)) score += 1; });
    if (f.type === "document") score -= 0.5;
    return score > 0 ? { s: score, f } : null;
  }).filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 8)
    .map(({ f }) => ({ id: f.id, titre: f.titre, theme: f.theme, type: f.type, resume: f.resume, sections: (f.sections || []).slice(0, 15), sources: f.sources, liees: (voisins[f.id] || []).slice(0, 8) }));
}
async function lireFiche(env, id, section) {
  id = String(id || "").replace(/[^a-z0-9-]/g, "").slice(0, 100); if (!id) return "Identifiant manquant.";
  const r = await lire(env, "/connaissances/fiches/" + id + ".json"); if (!r) return "Fiche introuvable : " + id + ". Utilise chercher_connaissances.";
  const f = await r.json(); let corps = f.contenu || "";
  if (section) { const s = norm(section), choix = corps.split(/\n(?=#{2,3}\s)/).filter(p => norm(p.split("\n")[0]).includes(s)); if (choix.length) corps = choix.join("\n\n"); }
  const src = (f.sources || []).map(x => "- " + (x.titre || "") + (x.pages ? " (p. " + x.pages + ")" : "") + (x.drive ? " https://drive.google.com/file/d/" + x.drive + "/view" : x.url ? " " + x.url : "")).join("\n");
  return "# " + f.titre + " [" + f.theme + "]\n" + (f.resume ? f.resume + "\n\n" : "") + corps.slice(0, 40000) + (src ? "\n\nSources :\n" + src : "") + ((f.liens || []).length ? "\nFiches liées : " + f.liens.join(", ") : "");
}
export async function chatgdbOutil(req, env, json, erreur) {
  const r = await req.json().catch(() => ({}));
  try { await quiEstCe(env, r.token); } catch (e) { return erreur(e && e.code || 401, "Session expirée : reconnectez-vous."); }
  const e = r.input && typeof r.input === "object" ? r.input : {};
  let res;
  try {
    if (!env.CHATGDB) res = "Base de connaissances indisponible.";
    else if (r.nom === "chercher_connaissances") { const rc = await chercher(env, String(e.requete || "").slice(0, 300), e.theme); res = rc === null ? "Base de connaissances indisponible." : rc.length ? JSON.stringify(rc) : "Aucune fiche ne correspond."; }
    else if (r.nom === "lire_fiche") res = await lireFiche(env, e.id, e.section);
    else res = "Outil non disponible pour le moment.";
  } catch { res = "Lecture impossible pour le moment."; }
  return json(200, { ok: true, resultat: res, propositions: [], aides: [], depots: [] });
}
