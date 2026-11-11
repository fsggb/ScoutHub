# ScoutHub

Portail FSGGB : toutes les applications sont accessibles sans compte et gardent leur nom et leur comportement d'origine. Un compte (Google ou e-mail) sert à l'assistant ChatGDB, à la bibliothèque, à Mon compte et à l'administration. Il n'y a plus de stockage de fichiers dans ScoutHub : les applications enregistrent sur l'ordinateur de l'utilisateur.

Projet en cours (ChatGDB, rôles, crédits, connexion Google) : `docs/projet-chatgdb.md`.

## Architecture
- `index.html`, `app.js`, `portail.js`, `styles.css`, `hub.css`, `config.js` : portail statique (GitHub Pages). `config.js` donne la mise en page d'origine ; l'administrateur la modifie dans **Administration, Affichage du portail** (glisser-déposer, masquer, renommer, logos) et le résultat est enregistré par le serveur dans `portail.json` du dépôt de données privé.
- `apps.txt` : **liste des applications assemblées sur le domaine de ScoutHub**. Chaque application reste dans son dépôt, sans modification (ni nom, ni icône, ni script ajouté) ; `.github/workflows/pages.yml` va chercher la dernière version (dernière version publiée, ou compilation Rust/WebAssembly du dernier commit, mise en cache par commit) et la sert sous `https://fsggb.github.io/ScoutHub/<dossier>/`. `.github/workflows/sync.yml` compare toutes les 15 minutes les versions (`scripts/versions.sh`) au site publié (`mirrors.json`) et redéploie s'il y a du nouveau ; un déploiement complet a aussi lieu chaque nuit.
- `sw.js` : met en cache les gros fichiers compilés (WebAssembly) des applications, dont le nom change à chaque version : première ouverture normale, suivantes instantanées.
- `ChatGDB/` (dépôt `fsggb/ChatGDB`) : assistant, intégré comme les autres. `knowledge-repos.txt` : dépôts dont la fiche `CHATGDB.md` alimente l'assistant.
- `admin.html`, `admin.js`, `admin-portail.js` : console d'administration (comptes, affichage du portail).
- `backend/Code.gs` : serveur Google Apps Script (comptes, rôles, sessions, connexion Google, ChatGDB, portail).

## Ajouter une application
Une ligne dans `apps.txt` (type `release`, `trunk`, `excali` ou `static`, voir l'en-tête du fichier), une tuile dans `config.js` (ou, plus simple, « Ajouter un lien d'application » dans la console), puis `git push` : le déploiement fait le reste.

## Mise en service du serveur
1. Créer un projet Apps Script, y coller `backend/Code.gs`.
2. Renseigner `GOOGLE_CLIENT_ID` (connexion Google) et, pour ouvrir ChatGDB, `ANTHROPIC_IA` (clé Claude) puis `CHAT_PUBLIC=1` quand tout est prêt.
3. Déployer comme application Web (exécuter en tant que « Moi », accès « Tout le monde »), copier l'adresse `/exec` dans `config.js` (`SCOUTHUB_API`).
4. Se connecter avec le compte administrateur et changer immédiatement le mot de passe initial (Mon compte).

## Sécurité
Mots de passe salés et hachés (SHA-256 itéré), jamais en clair. Cinq échecs de connexion bloquent l'adresse dix minutes. Sessions de 30 jours, révoquées à la déconnexion. Jetons Google vérifiés auprès de Google (audience, émetteur, expiration).
