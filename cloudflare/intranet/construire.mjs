// Génère src/files.json : instantané des fichiers du portail (racine du dépôt + assets/) embarqué dans le Worker.
// Usage : node construire.mjs   puis   npx wrangler deploy   (depuis cloudflare/intranet/)
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
const RACINE = new URL("../../", import.meta.url).pathname;
const TEXTE = new Set([".html", ".js", ".css", ".svg", ".json", ".webmanifest"]);
const fichiers = {};
function lire(dossier, prefixe) {
  for (const nom of readdirSync(join(RACINE, dossier))) {
    const rel = prefixe + nom, chemin = join(RACINE, rel);
    if (statSync(chemin).isDirectory()) { if (rel === "assets" || rel.startsWith("assets/")) lire(rel, rel + "/"); continue; }
    const ext = extname(nom);
    if (![".html", ".js", ".css", ".svg", ".png", ".jpg", ".jpeg"].includes(ext)) continue;
    fichiers[rel] = TEXTE.has(ext) ? { type: "text", data: readFileSync(chemin, "utf8") } : { type: "b64", data: readFileSync(chemin).toString("base64") };
  }
}
lire(".", "");
writeFileSync(new URL("./src/files.json", import.meta.url), JSON.stringify(fichiers));
console.log(Object.keys(fichiers).length + " fichiers embarqués");
