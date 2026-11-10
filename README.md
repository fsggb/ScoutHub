# ScoutHub

Portail FSGGB : toutes les applications sont accessibles sans compte. Un compte (Google ou e-mail) sert à l'assistant ChatGDB, à Mon compte et, plus tard, aux espaces réservés. Le stockage de fichiers dans GitHub est supprimé ; ScoutCloud stockera les fichiers dans le Google Drive de l'utilisateur (pas encore ouvert). En attendant, les applications enregistrent sur l'ordinateur.

Projet en cours (ChatGDB, rôles, crédits, connexion Google) : `docs/projet-chatgdb.md`.

## Architecture
- `index.html`, `app.js`, `styles.css`, `hub.css`, `config.js` : portail statique (GitHub Pages).
- `chatgdb.html`, `chatgdb.js`, `chatgdb.css` : interface de l'assistant (IA pas encore branchée).
- `scouthub-client.js` : injecté dans chaque application ; n'expose que l'identité.
- `CHATGDB.md` : fiche de connaissances du portail ; chaque dépôt d'application a la sienne.
- `backend/Code.gs` : serveur Google Apps Script (comptes, rôles, sessions, connexion Google).

## Mise en service du serveur
1. Créer un projet Apps Script, y coller `backend/Code.gs`.
2. (Plus tard) renseigner la propriété `GOOGLE_CLIENT_ID`.
3. Déployer comme application Web (exécuter en tant que « Moi », accès « Tout le monde »), copier l'adresse `/exec` dans `config.js` (`SCOUTHUB_API`).
4. Se connecter avec le compte administrateur et changer immédiatement le mot de passe initial (Mon compte).

## Sécurité
Mots de passe salés et hachés (SHA-256 itéré), jamais en clair. Cinq échecs de connexion bloquent l'adresse dix minutes. Sessions de 30 jours, révoquées à la déconnexion. Jetons Google vérifiés auprès de Google (audience, émetteur, expiration).
