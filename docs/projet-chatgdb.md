# Projet ChatGDB et espace membre : préparation

État au 10 novembre 2026. Ce document fixe la direction ; seul ce qui est marqué « fait » existe dans le code.

## 1. Décisions
- **Fait** : stockage GitHub supprimé (serveur sans accès GitHub, plus de boîtes « Enregistrer sous »). Les applications enregistrent sur l'ordinateur. **ScoutCloud est conservé** : ses fichiers iront dans le Google Drive de chaque utilisateur (compte Google requis) ; la page n'affiche pour l'instant que l'aperçu, sans connexion. Le dépôt privé `scouthub-data` n'est plus lu par personne : à exporter puis supprimer par vos soins.
- **Fait (inactif)** : connexion Google, rôles, interface ChatGDB, système de crédits (affichage), fiches `CHATGDB.md` dans chaque dépôt, Boutique GDB dans le portail.
- **Pas fait** : IA branchée, crédits réellement décomptés, bibliothèque de documents, ScoutCloud sur Google Drive (étendue `drive.file`, comme CathIA : accès limité aux fichiers créés par l'application ; demande un second consentement Google, distinct de la simple connexion).

## 2. Connexion Google (prioritaire) ou e-mail
Identifiant client utilisé : celui du projet **backend** de la fédération (Drive du service informatique, dossier « backend »), `599247454430-5q2iim2k…apps.googleusercontent.com` (nouvel identifiant, projet Google Cloud 599247454430). C'est un identifiant public, pas un secret.
À faire une fois dans la console Google Cloud > Identifiants > cet ID client : ajouter `https://fsggb.github.io` aux **origines JavaScript autorisées** (le bouton Google du portail en a besoin ; les redirections déjà déclarées pour les scripts Apps Script ne changent pas). Puis coller le même identifiant dans la propriété de script `GOOGLE_CLIENT_ID` du serveur ScoutHub.
Erreur « 401 invalid_client — no registered origin » : l'origine `https://fsggb.github.io` n'est pas encore déclarée sur cet ID client (rien à corriger dans le code) ; la prise en compte par Google peut demander quelques minutes. Erreur « org_internal » : l'écran de consentement est réservé au domaine de la fédération ; le passer en « Externe » pour que les comptes personnels (gmail) puissent se connecter.
Administrateurs : `jb.combet@fsggb.fr` (mot de passe initial) et `service-informatique@fsggb.fr`, ce dernier **uniquement par Google** et seulement pour un compte du domaine `fsggb.fr` (le mot de passe n'ouvre jamais cette adresse, pour que personne ne puisse la créer à sa place).
Le serveur vérifie le jeton auprès de Google (audience, émetteur, adresse vérifiée, expiration) puis ouvre une session de 30 jours. L'e-mail + mot de passe reste possible.

## 3. Rôles (serveur : `ROLES` dans `backend/Code.gs`)
`membre` < `parent` < `chef_unite` < `chef_groupe` < `admin`. Attribués dans Administration. Côté portail, `Hub.can(user, rôle)` et la clé `minRole` d'une application (non utilisée aujourd'hui : toutes sont publiques) permettront de filtrer les tuiles. L'accès parent (données saisies, confidentialité) est développé par quelqu'un d'autre : ScoutHub ne fait qu'exposer le rôle. Point à trancher : « parent » et « membre » sont-ils comparables ? L'ordre ci-dessus suit votre description (parents > membres) ; si ce sont deux familles distinctes, il faudra des permissions par service plutôt qu'un ordre.

## 4. Crédits
Limites façon Claude : une **par session de 5 heures** (fenêtre qui démarre à la première question) et une **par semaine**. Unité : 1 crédit ≈ une question courte (~3 000 jetons en entrée, ~500 en sortie).
Coût (tarifs Haiku 5.5 relevés dans la boutique : 0,10 $ / 0,50 $ par million de jetons) : ≈ 0,0006 $ par crédit. Valeurs de départ dans `config.js` : 30 crédits / 5 h (≈ 0,02 $), 150 / semaine (≈ 0,08 $ par personne et par semaine ; 500 membres actifs au maximum ≈ 40 $/semaine, en pratique très en dessous).
Gain : 1 crédit par tranche de 5 minutes d'activité réelle dans un outil (page visible, saisie récente), plafonné à 50 crédits par semaine, pour inciter à varier les outils. Mesure faite par `scouthub-client.js` (déjà chargé dans toutes les applications), comptée côté serveur.
Quand c'est vide : message clair, durée avant renouvellement, et (plus tard) possibilité d'augmenter le quota (bouton déjà présent, désactivé). Un plafond global mensuel côté serveur protège le budget (comme dans la boutique).
À prévoir côté serveur : table d'usage par adresse (feuille Google Sheets plutôt que les propriétés du script, trop limitées), action `chat` qui vérifie session, rôle et crédits avant d'appeler le modèle.

## 5. Fiches de connaissances par dépôt
Chaque dépôt contient `CHATGDB.md` : en-tête YAML (`depot`, `maj`), puis une section `# ` par application (rôle, adresse, utilité, fonctions, pas à pas, limites, questions fréquentes). ChatGDB ne les recopie pas dans chaque question : comme dans la boutique, il garde un **index** (titre + résumé) et va chercher la fiche utile (`chercher_connaissances`, `lire_connaissance`). Les fiches sont lues depuis GitHub Pages (`/CHATGDB.md` publié) ou copiées dans une feuille « BaseConnaissances ». Règle : quand une application change, on met sa fiche à jour dans le même commit. Les fiches actuelles sont des squelettes factuels, à enrichir.

## 6. ChatGDB : fonctionnement (réalisé, fermé tant que la clé n'est pas posée)
- **Où est la clé Claude ?** Uniquement dans les propriétés du script Apps Script de ScoutHub, sous le nom `ANTHROPIC_IA` (le même que dans la boutique : copier la valeur une fois, depuis Paramètres du projet > Propriétés du script de la boutique). Pas dans GitHub Pages (tout y est public), pas dans un secret de dépôt (inaccessible à un site statique), pas dans le Drive. Le navigateur envoie la question au serveur ScoutHub, qui appelle Claude.
- **Latence :** Apps Script ajoute environ 1 à 3 s par message, et ne sait pas diffuser la réponse mot à mot ; c'est acceptable devant le temps du modèle. Si on veut du streaming plus tard : un relais gratuit type Cloudflare Worker, avec la même clé, sans toucher à l'interface.
- **Modèle :** `claude-haiku-5-5` (propriété `CHAT_MODELE` pour en changer), effort bas ou moyen selon « réponse courte / détaillée ». **Recherche web** native d'Anthropic (`web_search_20250305`, 4 recherches par réponse au plus, localisée en France), avec sources citées [1], [2]… ; elle doit être activée dans la console Anthropic (Privacy) sinon le serveur répond sans recherche.
- **Images et documents :** les images jointes sont réduites dans le navigateur (1568 px) et lues par le modèle ; les PDF (9 Mo) aussi ; les fichiers texte sont insérés dans la question. Les images affichées dans les réponses sont des liens `https` issus de la recherche ; ChatGDB ne génère pas d'images pour l'instant.
- **Clé rattachée à un workspace :** si la propriété `ANTHROPIC_WORKSPACE_ID` existe, elle est envoyée en en-tête `anthropic-workspace-id` (comme dans la boutique).
- **Administrateur :** aucune limite de crédits, mais sa consommation est comptée comme celle des autres ; menu du compte > « Consommation » (questions, recherches web, jetons, coût estimé du mois, coût par jour, classement des comptes).
- **Mémoire (apprendre des choses à l'IA) :** notes Markdown dans le dossier `memoire/` du dépôt GitHub privé (`DATA_REPO` avec `GITHUB_TOKEN`, fichier `index.json` pour le sommaire). **Elles ne sont pas envoyées avec chaque question** : le modèle ne reçoit que le sommaire (identifiant — titre, 80 notes au plus) et lit les notes utiles avec les outils `chercher_memoire` et `lire_memoire`. L'administrateur les gère dans menu du compte > « Mémoire de ChatGDB », ou dit simplement « retiens que… » dans la conversation : l'IA prépare alors une note, **enregistrée seulement après son clic sur « Enregistrer »** (protection contre une consigne cachée dans une page web ou un document joint).
- **Ouverture :** réservé aux administrateurs tant que `CHAT_PUBLIC` n'est pas à `1` (phase de test, coût maîtrisé). `CHAT_TESTEURS` (adresses séparées par des virgules) ouvre ChatGDB à des comptes précis sans les rendre administrateurs. Si ChatGDB reste fermé, l'interface affiche la raison (clé absente, compte non autorisé, serveur pas à jour).
- **Crédits réels :** par compte, fenêtre de 5 h et semaine glissantes, 1 crédit ≈ une question courte, recherche web = 2 crédits ; bonus d'activité (`ping` de `scouthub-client.js`) plafonné à 50 par semaine. Stockés dans les propriétés du script (à migrer vers une feuille si le nombre de comptes dépasse quelques milliers).
- **Connaissances :** le serveur lit `https://fsggb.github.io/ScoutHub/knowledge/all.md` (fiches `CHATGDB.md` de chaque dépôt, réunies chaque lundi) et les place dans le message système.
- **Reprise de la boutique :** même moteur (API Messages, Haiku 5.5), même nom de propriété de clé, même idée de base de connaissances. Pas d'outils d'écriture ni d'agent ici.

## 6 bis. Une application = un dépôt ; ScoutHub les réunit
Chaque application vit dans son propre dépôt (développement indépendant) : `ChatGDB`, `ScoutBibliotheque`, `ScoutRendezVous`, `CathIA`, `ScoutMap`, `ScoutCloud`. `mirrors.txt` les liste ; le déploiement de ScoutHub clone chacun dans un dossier du site (`/ScoutHub/ChatGDB/`, etc.) et note la version clonée dans `mirrors.json`. Le workflow **« Synchroniser les miroirs »** vérifie toutes les 15 minutes si l'un des dépôts a changé et ne redéploie que dans ce cas ; le déploiement a aussi lieu à chaque envoi sur ScoutHub, à la demande, et chaque lundi. Les applications compilées (Rust) ne s'y prêtent pas : leur dépôt ne contient pas le site.
Les applications de ces dépôts chargent `config.js`, `common.js` et `scouthub-client.js` de ScoutHub par adresse absolue (`/ScoutHub/...`) : même origine, donc même session, sans reconnexion, et une seule copie du code d'identité. CathIA garde pour l'instant sa propre connexion pour ses bibliothèques.

## 6 ter. Bibliothèque et rendez-vous (nouvelles applications)
- **ScoutBibliotheque** : un dossier Google Drive devient des rubriques (recherche dans les titres et le texte des PDF, aperçu, téléchargement). Serveur Apps Script séparé (`backend/Code.gs` du dépôt), accès par rôle via la description des dossiers Drive. ChatGDB lit ces documents avec les outils `chercher_bibliotheque` et `lire_document` (propriétés `BIBLIO_API` et `BIBLIO_CLE` côté ScoutHub, `CLE_PARTAGEE` côté bibliothèque ; le rôle de l'utilisateur est transmis pour que les rubriques réservées restent réservées).
- **ScoutRendezVous** : demande de rendez-vous avec le service informatique ; créneaux calculés à partir des disponibilités de la personne, des horaires du service et de l'agenda Google réel ; confirmation en un clic, invitation, e-mails et rappel. Serveur Apps Script séparé.
- Les serveurs de ces applications vérifient la session auprès de ScoutHub (action `me`) : pas de second système de comptes.

## 6 quater. Réglages de ChatGDB
Modèles autorisés : Haiku 5.5 et Sonnet 5.5 seulement (jamais plus gros, même si le navigateur le demande). Niveau de réflexion faible, moyenne ou élevée. Recherche web standard (5 recherches, 2 pages lues) ou approfondie (12 recherches, 6 pages lues en entier, recoupement des sources ; jusqu'à 12 000 jetons de réponse). Les crédits décomptés sont le coût réel (1 crédit = 0,001 $) : une question courte coûte environ 1 crédit avec Haiku, environ 11 avec Sonnet, et chaque recherche web 10. Limites de départ : 60 crédits par session de 5 h et 400 par semaine (constantes `CHAT_*` de `backend/Code.gs`). Dictée vocale : le navigateur enregistre et convertit en WAV, le serveur transcrit avec Gemini (propriété `GEMINI_IA`) ; la dictée intégrée aux navigateurs ne fonctionne pas partout (pas dans Brave).

## 7. Bibliothèque de documents scouts
PDF déposés dans un dossier Google Drive partagé en lecture au compte du serveur. Indexation : extraction du texte par morceaux avec titre et page, puis recherche (mots-clés, puis vecteurs si besoin). Les réponses citent le document et la page. Aucun document n'est envoyé au modèle en entier.

## 8. Relier les outils Apps Script
Ordre proposé : (1) un jeton de session ScoutHub vérifiable par un autre script Apps Script (appel `me` avec le jeton) ; (2) chaque outil lit rôle et adresse via cet appel ; (3) ChatGDB reçoit pour chaque outil une fiche de connaissances ; (4) plus tard, des outils d'agent par application. La boutique garde pour l'instant sa propre connexion ; la fédérer est une étape séparée.

## 9. Étapes
1. (maintenant) Redéployer `Code.gs`, créer l'ID client Google et le renseigner.
2. Journal d'activité + crédits sur feuille ; action `chat` derrière `live: false`.
3. Ouverture de ChatGDB à un petit groupe (Haiku, lecture seule).
4. Bibliothèque de documents.
5. Rôles appliqués aux tuiles ; fédération des outils Apps Script.
6. Agent.
