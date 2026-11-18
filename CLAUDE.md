# ScoutHub : notes pour Claude

Portail des applications de la FSGGB (fsggb.github.io/ScoutHub). Réponds à l'utilisateur en français.

## Outils à (ré)installer dans une nouvelle session, quand on en a besoin
Les sessions cloud repartent d'un conteneur neuf : ces outils disparaissent et sont à réinstaller.

1. **Cloudflare** (skills officielles + serveur MCP, pour Workers, D1, Durable Objects, Wrangler) :
   ```
   claude plugin marketplace add cloudflare/skills
   claude plugin install cloudflare@cloudflare
   ```
   Puis `/reload-plugins` (ou redémarrer Claude Code). La première action Cloudflare demande d'autoriser le compte
   (OAuth dans le navigateur). `/reload-plugins` n'est pas disponible en connexion distante : il faut alors une nouvelle session.
   Source : https://developers.cloudflare.com/agent-setup/prompt.md
2. **Graphify** (carte de connaissances du projet : code, docs, PDF ; ensuite `/graphify`) :
   ```
   pip install graphifyy      # deux « y »
   graphify install
   ```
3. **Skills de design et d'animation web** (dépôts de particuliers : lire leur contenu avant d'installer) :
   ```
   npx skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max -g -a claude-code -y
   npx skills add patricio0312rev/skills --skill framer-motion-animator -g -a claude-code -y
   npx skills add vercel-labs/skills --skill find-skills -g -a claude-code -y
   npx skills find "three.js 3d"
   ```
   Sur le PC de l'utilisateur, ces commandes se lancent dans PowerShell, puis on redémarre Claude Code.

## Repères
- Serveur : `backend/` (Apps Script : `Code.gs` cœur, `CathIA.gs`, `Bibliotheque.gs` modules) ; le code à coller est aussi
  publié dans un artefact « Serveur unique ScoutHub ».
- **ScoutHub est une plateforme de routage** : le portail (pages d'accueil, connexion, administration) et l'assemblage des applications
  (`apps.txt`, `.github/workflows/pages.yml`). Rien d'autre ne doit y vivre : chaque application garde son contenu dans son dépôt.
- Base de connaissances de ChatGDB : dans le dépôt **ChatGDB** (`connaissances/src/**.md`, format `connaissances/FORMAT.md`, liste des
  fiches par dépôt `connaissances/depots.txt`, générateur `scripts/connaissances.mjs`). Le déploiement de ScoutHub la construit sous
  `/ChatGDB/connaissances/` (générateur lancé sous le mode « permission » de Node) ; ChatGDB la publie aussi seul.
- Relais Cloudflare du mode rapide de ChatGDB : `cloudflare/` (Worker + D1, `wrangler.jsonc`) (propriétés RELAIS_URL, RELAIS_SECRET).
- Projet en cours : migrer le serveur vers Cloudflare (Workers + D1 + Durable Objects), Apps Script ne gardant que
  le Drive (bibliothèque, CathIA) et la boutique.
