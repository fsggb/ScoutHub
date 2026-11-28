// Génère src/files.json : instantané des fichiers du portail (racine du dépôt + assets/) embarqué dans le Worker.
// Usage : node construire.mjs   puis   npx wrangler deploy   (depuis cloudflare/intranet/)
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
const RACINE = new URL("../../", import.meta.url).pathname;
const TEXTE = new Set([".html", ".js", ".css", ".svg", ".json", ".webmanifest"]);
const fichiers = {};
function lire(dossier, prefixe) {
  for (const nom of readdirSync(join(RACINE, dossier))) {
    const rel = prefixe + nom, chemin = join(RACINE, rel);
    if (statSync(chemin).isDirectory()) { if (rel === "assets" || rel.startsWith("assets/")) lire(rel, rel + "/"); continue; }
    const ext = extname(nom);
    if (![".html", ".js", ".css", ".svg", ".png", ".jpg", ".jpeg"].includes(ext)) continue;
    if (ext === ".js") { try { new vm.Script(readFileSync(chemin, "utf8"), { filename: rel }); } catch (e) { console.error("ERREUR DE SYNTAXE dans " + rel + " : " + e.message); process.exit(1); } }   // jamais de déploiement d'une page cassée
    fichiers[rel] = TEXTE.has(ext) ? { type: "text", data: readFileSync(chemin, "utf8") } : { type: "b64", data: readFileSync(chemin).toString("base64") };
  }
}
lire(".", "");
// Versionnage : chaque page référence ses scripts et styles avec une empreinte (« common.js?v=ab12… ») : une nouvelle version
// est toujours rechargée, jamais une ancienne copie restée en mémoire dans le navigateur.
const empreinte = rel => fichiers[rel] && fichiers[rel].type === "text" ? createHash("sha1").update(fichiers[rel].data).digest("hex").slice(0, 8) : "";
for (const [rel, f] of Object.entries(fichiers)) {
  if (!rel.endsWith(".html") || f.type !== "text") continue;
  f.data = f.data.replace(/\b(src|href)="([\w.\-\/]+\.(?:js|css))"/g, (m, attr, chemin) => { const e = empreinte(chemin); return e ? attr + '="' + chemin + "?v=" + e + '"' : m; });
}
writeFileSync(new URL("./src/files.json", import.meta.url), JSON.stringify(fichiers));
console.log(Object.keys(fichiers).length + " fichiers embarqués");
