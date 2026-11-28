# Architecture cible de la fédération (sans Apps Script)

Principe : **GitHub = le code, Cloudflare = l'hébergement et les services, Google Sheets = la vérité des données.**

## Couches
1. **Sites statiques** (un dépôt = un site) : ScoutHub (portail/intranet), ChatGDB, ScoutMap, CathIA, etc. Chaque dépôt peut être **privé** :
   Cloudflare lit le dépôt (intégration GitHub « Workers Builds ») et déploie à chaque fusion sur `main`, exactement le site du dépôt.
2. **Services Cloudflare partagés** (aucun site n'a de serveur propre) :
   - `auth` : connexion unique (Google, code e-mail), sessions, échange de code pour les applications hors domaine, validation serveur à serveur ;
   - `donnees` : copie chiffrée (D1 UE) de la feuille « Groupes et unités », registre, simulation ;
   - `scouthub` : API du portail (outils, documentation, entrées, miniatures).
3. **Google Sheets / Drive** par les API Google (compte de service) : la feuille est la source ; D1 en est le cache rapide.

## Données : feuille → D1
- Synchronisation complète chaque soir à **23 h (heure de Paris)**, juste avant le renouvellement du quota d'écriture de D1.
- À l'arrivée d'une personne : vérification légère de la date de modification du classeur (Drive `modifiedTime`) ; inchangé = rien ; changé = seules les lignes modifiées sont réécrites (synchro différentielle par empreinte de ligne).
- Export de la base D1 vers le Drive de l'administrateur : bouton dans l'administration.
- Compatibilité avec la vraie feuille AppSheet : les colonnes sont lues **par leur nom d'en-tête**, les colonnes inconnues sont ignorées.

## Applications
- Tout est répertorié dans la feuille « Outils » (nom, description, image, lien, visibilité) : pas d'outil codé en dur dans le portail.
- Applications tierces (Apps Script autonomes, sites externes) : ajoutées par l'administrateur (menu clic droit / « + Application »), ouvertes via la connexion unique si elles l'acceptent.
- Suite *craft (Word, Excel…) : un Worker dédié lira directement la dernière version publiée dans le dépôt officiel `storytold/*`.
- Retirées (code conservé sur GitHub, plus servies) : Excalidraw, ScoutCraft/SoLeadWorks, Bibliothèque (remplacée par Documentation).

## Déploiement : étapes dans l'ordre
1. Secrets GitHub `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` (déploiement par workflow, en attendant l'étape 2).
2. Dans le tableau de bord Cloudflare : Workers & Pages → Create → connecter GitHub → choisir le dépôt ; répéter par dépôt (autorisation GitHub à donner une seule fois par le propriétaire). Les workflows `cloudflare.yml` deviennent alors inutiles.
3. Passer les dépôts en privé **après** l'étape 2 (sinon GitHub Pages cesse de publier).
4. Rediriger les liens de la feuille « Outils » vers les nouvelles adresses.

## Réglages Cloudflare (Workers & Pages > le Worker > Settings > Builds > Connect), un par Worker existant
Dépôt fsggb/ScoutHub, branche `main`, commande de déploiement `npx wrangler deploy` :
| Worker | Dossier racine | Commande de build |
|---|---|---|
| auth | `cloudflare/auth` | (aucune) |
| donnees | `cloudflare/donnees` | (aucune) |
| scouthub | `cloudflare` | (aucune) |
| intranet | `cloudflare/intranet` | `node construire.mjs` |
Dépôt fsggb/ChatGDB : Worker `chatgdb`, dossier racine `/`, commande de build `sh scripts/construire-worker.sh`.
Les schémas SQL (bases D1) ne changent que rarement : les appliquer à la main (`wrangler d1 execute … --file`) ou via le workflow manuel.

## Domaine personnalisé (étape suivante)
Domaine géré par Cloudflare (DNS) → Worker intranet : Settings > Domains & Routes > Add > Custom domain (ex. intranet.fsggb.fr). Puis mettre à jour
`SELF_ORIGIN` et `ORIGINES` (wrangler.jsonc de auth, donnees, scouthub, intranet) et `config.js` (adresses des Workers), et déclarer l'origine dans la console Google (client OAuth).
