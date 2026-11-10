# Projet ChatGDB et espace membre : préparation

État au 10 novembre 2026. Ce document fixe la direction ; seul ce qui est marqué « fait » existe dans le code.

## 1. Décisions
- **Fait** : stockage GitHub supprimé (ScoutCloud fermé, serveur sans accès GitHub, plus de boîtes « Enregistrer sous »). Les applications enregistrent sur l'ordinateur. Le dépôt privé `scouthub-data` n'est plus lu par personne : à exporter puis supprimer par vos soins.
- **Fait (inactif)** : connexion Google, rôles, interface ChatGDB, système de crédits (affichage), fiches `CHATGDB.md` dans chaque dépôt, Boutique GDB dans le portail.
- **Pas fait** : IA branchée, crédits réellement décomptés, bibliothèque de documents, stockage de remplacement.

## 2. Connexion Google (prioritaire) ou e-mail
Il faut un **identifiant client OAuth** (« ID client », forme `123…apps.googleusercontent.com`), pas une clé API. Il est public ; aucun secret n'est nécessaire pour ce flux. À ne jamais me transmettre : un « code secret client ».
1. Console Google Cloud > projet > API et services > Identifiants > Créer > ID client OAuth > Application Web.
2. Origines JavaScript autorisées : `https://fsggb.github.io`.
3. Écran de consentement : étendues `openid`, `email`, `profile` uniquement (pas de validation Google longue).
4. Coller l'ID dans `config.js` (`SCOUTHUB_GOOGLE_CLIENT_ID`) **et** dans la propriété de script `GOOGLE_CLIENT_ID` du serveur Apps Script. Le bouton « Continuer avec Google » apparaît alors tout seul.
CathIA utilise déjà un projet Google avec un ID client : on peut le réutiliser en ajoutant l'origine ci-dessus.
Le serveur vérifie le jeton auprès de Google (audience, émetteur, adresse vérifiée, expiration) puis ouvre une session de 30 jours. L'e-mail + mot de passe reste possible. « Savoir qui a fait quoi » : l'identité est maintenant fiable ; le journal d'activité sera ajouté avec les crédits (§4).

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

## 6. Ce qu'on reprend de la boutique (`boutique-appscript`)
- Moteur : API Messages d'Anthropic, Haiku 5.5 d'abord, Sonnet 5.5 en secours, jamais plus gros ; clé dans une propriété de script (`ANTHROPIC_IA`), jamais dans le navigateur ; cache du préfixe pour réduire le coût.
- Base de connaissances en feuille + outils de recherche (`BACK_Connaissances.js`), conversations partagées retrouvables d'un appareil à l'autre (`BACK_ConversationsIA.js`), suivi de consommation et plafond (`BACK_IAConsommation.js`), interface (`SCRIPT_ChatGDB.html`, `CSS_ChatGDB.html`).
- Différence : ici **conversationnel seulement** (pas d'outils d'écriture ni d'agent) ; l'agent viendra dans un second temps, avec confirmation de chaque action comme dans la boutique.

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
