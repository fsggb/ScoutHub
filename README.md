# ScoutHub

Portail FSGGB : inscription libre, connexion par mot de passe, applications ; les fichiers personnels sont gérés par **ScoutCloud** (https://github.com/fsggb/ScoutCloud), stockés dans un dépôt GitHub **privé**.

## Architecture
- `index.html`, `app.js`, `styles.css`, `config.js` : portail statique (GitHub Pages).
- `backend/Code.gs` : serveur Google Apps Script (comptes, sessions, accès GitHub). Le jeton GitHub reste dans les propriétés du script, jamais dans le navigateur.

## Mise en service
1. Créer un dépôt GitHub **privé** pour les données (ex. `fsggb/scouthub-data`).
2. Créer un jeton GitHub fine-grained limité à ce seul dépôt, permission « Contents : Read and write ».
3. Créer un projet Apps Script, y coller `backend/Code.gs`, puis renseigner les propriétés `GITHUB_TOKEN` et `DATA_REPO` (`organisation/depot`).
4. Déployer comme application Web (exécuter en tant que « Moi », accès « Tout le monde »), copier l'adresse `/exec` dans `config.js` (`SCOUTHUB_API`).
5. Se connecter avec le compte administrateur `jb.combet@fsggb.fr` et changer immédiatement le mot de passe initial (Mon compte).

## Sécurité
Mots de passe stockés salés et hachés (SHA-256 itéré), jamais en clair. Cinq échecs de connexion bloquent l'adresse dix minutes. Sessions de 30 jours, révoquées à la déconnexion.
