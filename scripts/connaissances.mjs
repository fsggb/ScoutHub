// Construit la mémoire de ChatGDB à partir des fiches Markdown de connaissances/src/**.md
//   connaissances/index.json   : la carte (nœuds = fiches, thèmes, sources ; arêtes = liens)
//   connaissances/fiches/<id>.json : chaque fiche complète
// Usage : node scripts/connaissances.mjs   (ajoute --verifier pour échouer sur une erreur)
import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'connaissances');
const SRC = path.join(RACINE, 'src'), SORTIE = path.join(RACINE, 'fiches');
const erreurs = [];

function fichiers(d) {
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? fichiers(path.join(d, e.name)) : e.name.endsWith('.md') ? [path.join(d, e.name)] : []);
}
const liste = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const enleveGuillemets = s => s.replace(/^(['"])(.*)\1$/, '$2');

function lire(f) {
  const txt = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const m = txt.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) { erreurs.push(`${f} : en-tête --- manquant`); return null; }
  const meta = { sources: [] }; let src = null;
  for (const ligne of m[1].split('\n')) {
    const l = ligne.replace(/\s+#.*$/, '');
    if (!l.trim()) continue;
    let k;
    if ((k = l.match(/^\s+-\s+(\w+):\s*(.*)$/))) { src = { [k[1]]: enleveGuillemets(k[2].trim()) }; meta.sources.push(src); }
    else if ((k = l.match(/^\s+(\w+):\s*(.*)$/)) && src) src[k[1]] = enleveGuillemets(k[2].trim());
    else if ((k = l.match(/^(\w+):\s*(.*)$/))) { src = null; if (k[1] !== 'sources') meta[k[1]] = enleveGuillemets(k[2].trim()); }
  }
  const corps = m[2].trim();
  const id = meta.id || path.basename(f, '.md');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) erreurs.push(`${f} : identifiant invalide « ${id} »`);
  if (!meta.titre) erreurs.push(`${f} : titre manquant`);
  const sections = [...corps.matchAll(/^#{2,3}\s+(.+)$/gm)].map(x => x[1].trim());
  return {
    id, titre: meta.titre || id, theme: meta.theme || path.basename(path.dirname(f)), type: meta.type || 'synthese',
    resume: meta.resume || '', mots_cles: liste(meta.mots_cles), liens: liste(meta.liens), sources: meta.sources,
    sections, contenu: corps, fichier: path.relative(RACINE, f)
  };
}

const fiches = fichiers(SRC).map(lire).filter(Boolean);
const parId = new Map();
for (const f of fiches) { if (parId.has(f.id)) erreurs.push(`identifiant en double : ${f.id} (${f.fichier}, ${parId.get(f.id).fichier})`); parId.set(f.id, f); }

const aretes = [], vu = new Set();
const ajoute = (a, b, type) => { const k = [a, b].sort().join('|') + '|' + type; if (a !== b && !vu.has(k)) { vu.add(k); aretes.push({ de: a, vers: b, type }); } };
for (const f of fiches) for (const l of f.liens) parId.has(l) ? ajoute(f.id, l, 'lien') : erreurs.push(`${f.id} : lien vers une fiche inconnue « ${l} »`);
// Fiches tirées d'un même document source
const parSource = new Map();
for (const f of fiches) for (const s of f.sources) { const k = s.drive || s.url || s.titre; if (!k) continue; (parSource.get(k) || parSource.set(k, []).get(k)).push(f.id); }
for (const ids of parSource.values()) if (ids.length <= 12) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) ajoute(ids[i], ids[j], 'meme_source');

const themes = {};
for (const f of fiches) (themes[f.theme] ||= []).push(f.id);
const index = {
  version: 1, genere: new Date().toISOString(), nb_fiches: fiches.length,
  themes: Object.fromEntries(Object.entries(themes).sort().map(([t, ids]) => [t, ids.sort()])),
  fiches: fiches.sort((a, b) => a.theme.localeCompare(b.theme) || a.titre.localeCompare(b.titre)).map(f => ({
    id: f.id, titre: f.titre, theme: f.theme, type: f.type, resume: f.resume, mots_cles: f.mots_cles,
    sections: f.sections, sources: f.sources.map(s => s.titre).filter(Boolean), taille: f.contenu.length
  })),
  liens: aretes
};

fs.rmSync(SORTIE, { recursive: true, force: true });
fs.mkdirSync(SORTIE, { recursive: true });
for (const f of fiches) fs.writeFileSync(path.join(SORTIE, f.id + '.json'), JSON.stringify(f));
fs.writeFileSync(path.join(RACINE, 'index.json'), JSON.stringify(index));
console.log(`${fiches.length} fiches, ${Object.keys(themes).length} thèmes, ${aretes.length} liens.`);
if (erreurs.length) { console.error(erreurs.join('\n')); if (process.argv.includes('--verifier')) process.exit(1); }
