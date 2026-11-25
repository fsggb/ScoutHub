# Rupture avec Apps Script : migration de ScoutHub vers Cloudflare

Décidé le 25 novembre 2026 (suite à la réunion du 24 novembre « Audit sécurité, double authentification et
avenir des outils ») : **ScoutHub n'aura plus aucune dépendance à Google Apps Script**. AppSheet n'est pas
concerné par ce chantier (sujet séparé). Les dépôts GitHub passeront en privé, déployés par Cloudflare sur un
domaine propre (nom à venir) — ce second point n'est pas encore commencé.

## Principe

- **Toute la logique et l'état** (comptes, sessions, crédits, mémoire ChatGDB, portail…) passent sur des
  Workers Cloudflare + D1 (SQL), comme le fait déjà le Worker `scouthub` pour le relais ChatGDB et le
  partage en direct de ScoutMap.
- **Google Drive reste Google Drive** (bibliothèque, cahier de soins…) : ce qui change, c'est que les Workers
  y accèdent par **l'API Drive directement** (compte de service), plus par Apps Script. Rien ne change pour
  les personnes qui utilisent déjà Drive aujourd'hui.
- **Migration route par route** : chaque action du serveur actuel (`backend/Code.gs`) est portée une à une
  dans le Worker, testée, puis seulement ensuite le client (`common.js`) est basculé dessus. Apps Script
  continue de fonctionner tant qu'une route n'est pas basculée : le site ne casse jamais pendant la migration.

## Inventaire des 26 actions de `backend/Code.gs` (ACTIONS)

| Action | Statut | Où ça va |
|---|---|---|
| `google`, `codeDemander`, `codeVerifier`, `session`, `me`, `logout` | ✅ **Porté** (`cloudflare/src/auth.js`, routes `/auth/*`) | D1 (`users`, `sessions`, `login_codes`) ; envoi du code par l'API Gmail (compte de service) |
| `adminSetRole`, `adminList`, `adminDelete` | ✅ **Porté** (`/auth/admin/*`) | D1 `users` |
| `portailLire`, `portailEcrire`, `config` | ⬜ à faire | D1 (un blob JSON, ou deux colonnes) |
| `chat`, `rapide`, `outil`, `progression`, `memoire`, `consommation` | ⬜ à faire | déjà en partie sur le Worker (`/chat`, `/credits`) ; à compléter |
| `transcrire` | ⬜ à faire | appel HTTP à Gemini, quasi copier-coller (voir `dicteeServeur` du Worker, qui fait déjà la même chose avec Whisper pour le Laboratoire) |
| `app`, `donnees` | ⬜ à faire | D1 (clé : appli + utilisateur) ou KV |
| `passe`, `passeLire`, `boutique` | ⬜ à faire | KV, jetons courts à usage unique |
| `ping`, `aide_envoyer` | ⬜ à faire | Worker direct |

**Fait le 25 novembre** : les 9 actions de connexion et d'administration des comptes (le socle), testées de
bout en bout en local (`wrangler dev` + D1 local) : code à 6 chiffres bout en bout (avec une vraie clé de
test envoyée à l'API Google, qui a bien répondu — seule une vraie clé de service la ferait aboutir), session,
`/auth/me`, refus pour un non-admin, déconnexion, liste des comptes, changement de rôle, suppression protégée
de l'administrateur.

**Pas encore fait** : brancher le client (`common.js`) sur `/auth/*` à la place d'Apps Script — à faire une
fois le compte de service Google créé (étape suivante) et le reste des actions porté, pour basculer une
bonne fois plutôt que de faire cohabiter deux systèmes de session côté client.

## À faire : le compte de service Google (remplace « Exécuter en tant que : moi »)

Un compte de service avec **délégation à l'échelle du domaine** peut envoyer des e-mails (Gmail) et lire/écrire
sur Drive **comme n'importe quel compte du domaine fsggb.fr**, sans mot de passe ni jeton personnel. Toutes ces
étapes se font dans la console Google (besoin des droits d'administrateur Google Cloud **et** Workspace) :

1. **Créer un projet Google Cloud** (ou réutiliser un projet existant de la fédération) sur
   [console.cloud.google.com](https://console.cloud.google.com).
2. **Activer les API** : Gmail API et Google Drive API (menu « API et services » → « Bibliothèque »).
3. **Créer le compte de service** (« IAM et administration » → « Comptes de service » → « Créer ») ; noter son
   adresse (`…@<projet>.iam.gserviceaccount.com`).
4. **Créer une clé JSON** pour ce compte de service (onglet « Clés » → « Ajouter une clé » → JSON) : téléchargée
   une seule fois, à garder précieusement (jamais dans le dépôt).
5. **Activer la délégation à l'échelle du domaine** sur ce compte de service (case à cocher dans ses
   paramètres), puis noter son **ID client numérique**.
6. **Autoriser cette délégation côté Workspace** : [admin.google.com](https://admin.google.com) → Sécurité →
   Contrôle des API → Délégation au niveau du domaine → Ajouter : coller l'ID client, et ces deux portées
   (séparées par une virgule) :
   `https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/drive`
7. **Poser la clé dans Cloudflare**, sans jamais la mettre dans un fichier du dépôt :
   ```
   npx wrangler secrets-store secret create 0d38faa59339406ca83b45947aab0995 \
     --name GMAIL_SA_KEY --scopes workers --remote
   ```
   (colle le contenu entier du fichier JSON téléchargé à l'étape 4 quand la commande le demande)
8. Vérifier/ajuster dans `wrangler.jsonc` : `GOOGLE_CLIENT_ID` (celui de la connexion Google actuelle, dans les
   propriétés du script Apps Script) et `GMAIL_SENDER` (l'adresse qui enverra les codes, par exemple
   `no-reply@fsggb.fr` — doit exister comme utilisateur ou alias du domaine).

Une fois ces 8 étapes faites, `/auth/code/demander` enverra vraiment les codes (aujourd'hui il échoue
poliment, faute de clé).

## Pour la suite (une fois le compte de service créé)

1. Porter `transcrire`, `app`/`donnees`, `portailLire`/`Ecrire`, `passe`/`passeLire`/`boutique`, `memoire`,
   `consommation`, `ping`, `aide_envoyer` (dans cet ordre, du plus simple au plus couplé à ChatGDB).
2. Ajouter l'accès Drive direct (API REST, même compte de service) pour la bibliothèque et le cahier de soins.
3. Basculer `common.js`/`config.js` (`window.SCOUTHUB_API`) sur le Worker ; retirer `backend/Code.gs`
   seulement quand plus aucune route n'y renvoie.
4. Dépôts privés + déploiement Cloudflare sur domaine propre : chantier séparé, pas commencé.
