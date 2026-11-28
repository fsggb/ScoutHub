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

## Cloudflare : déploiement automatique et un Worker par outil
- Fusionner sur `main` déclenche `.github/workflows/cloudflare.yml` : bases (schémas), Workers `auth`, `donnees`, `scouthub`, puis `intranet`
  (portail = exactement le code du dépôt). Secrets GitHub requis : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Un Worker par outil : l'intranet sert `/ChatGDB/*` via la liaison de service `CHATGDB` (Worker `chatgdb`, déployé par le workflow
  `cloudflare.yml` du dépôt ChatGDB). Ajouter un outil = table `OUTILS` dans `cloudflare/intranet/src/index.js` + liaison dans
  `cloudflare/intranet/wrangler.jsonc` (le Worker de l'outil doit exister avant le déploiement de l'intranet).
- Accès chef : se règle dans la feuille Google « Groupes et unités » (synchronisation à 03:15 UTC ou Administration > Données > Tout
  synchroniser), sans toucher à Cloudflare.
- fsggb.github.io/ScoutHub reste utilisable seul (`config.js` : `SCOUTHUB_LEGACY` selon l'adresse) : identité Apps Script, aucune donnée sensible.
  Apps Script accepte aussi les sessions de l'intranet (`sessionCloudflare_` dans `backend/Code.gs` → `/auth/session/valider`).
