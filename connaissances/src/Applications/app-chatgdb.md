---
id: app-chatgdb
titre: ChatGDB, l'assistant IA de la fédération
theme: Applications
type: application
sources:
  - titre: ChatGDB - fiche CHATGDB.md
    url: https://github.com/fsggb/ChatGDB/blob/main/CHATGDB.md
  - titre: ChatGDB - README.md
    url: https://github.com/fsggb/ChatGDB/blob/main/README.md
  - titre: ScoutHub - docs/projet-chatgdb.md (sections 6 à 10)
    url: https://github.com/fsggb/ScoutHub/blob/main/docs/projet-chatgdb.md
  - titre: ChatGDB - chatgdb.js (paramètres d'adresse)
    url: https://github.com/fsggb/ChatGDB/blob/main/chatgdb.js
mots_cles: ChatGDB, assistant, IA, intelligence artificielle, Claude, conversation, crédits, recherche web, artefact, pièce jointe, dictée, bibliothèque, mémoire, Haiku, Sonnet, aide
liens: app-scouthub, app-scoutbibliotheque, applications-panorama, app-scoutmap
resume: ChatGDB est l'assistant conversationnel de la FSGGB, réservé aux comptes connectés de ScoutHub. La fiche explique comment poser une question, joindre des fichiers, utiliser la recherche web, les artefacts, la dictée et les préférences, comment fonctionnent les crédits, et comment ChatGDB peut ouvrir et piloter une application de ScoutHub.
---

## À quoi sert ChatGDB
ChatGDB est l'assistant IA de la fédération (modèles Claude d'Anthropic, Haiku ou Sonnet). On lui pose des questions en français : pédagogie scoute, technique (froissartage, matelotage, cuisine, topographie…), aide sur les applications de ScoutHub, recherche dans les documents de la Bibliothèque, rédaction d'un message au service informatique. Il connaît les applications de la fédération (fiches de connaissances), la bibliothèque de documents et, pour l'administrateur, une mémoire de notes.

ChatGDB peut se tromper : pour la sécurité des jeunes, la santé ou le droit, il renvoie vers le responsable de groupe ou les documents officiels.

## Ouvrir ChatGDB
- Adresse : https://fsggb.github.io/ScoutHub/ChatGDB/ (tuile « ChatGDB », rubrique Assistant de l'accueil ScoutHub). Il est aussi publié seul depuis son dépôt, à https://fsggb.github.io/ChatGDB/ (même connexion).
- ChatGDB est aussi l'assistant de **CathIA** (bouton « Assistant ») pour les personnes connectées à ScoutHub.
- **Compte ScoutHub obligatoire** (Google ou e-mail). Ouvert à tout compte connecté ; si ChatGDB est fermé, l'interface affiche la raison (clé absente, compte non autorisé, serveur pas à jour).

## Interface
Calquée sur Claude, avec une conversation façon messagerie : **vos messages à droite**, ceux de ChatGDB **à gauche**, chacun dans sa bulle, avec l'heure et, sous chaque réponse, sa **durée** (« Réponse en 6,4 s »). Les réponses s'affichent **au fil de l'eau**, mot à mot, avec un compteur de secondes pendant que ChatGDB travaille.
- **Barre latérale** : Nouvelle conversation, Rechercher, Artefacts, Toutes les conversations, conversations récentes (épinglage, export). Les conversations sont gardées sur l'appareil.
- **Zone de saisie** : texte, bouton trombone (pièces jointes), micro (dictée), bouton « Recherche web », choix du modèle, du niveau de réflexion et de la recherche.
- **Volet d'artefact** à droite : documents, pages web interactives, schémas SVG, tableaux, code, avec versions, copie, téléchargement, plein écran, et un onglet **Modifier** (voir plus bas).
- **Paramètres** par onglets (préférences, utilisation et crédits).
- Pendant l'usage d'outils, les étapes de raisonnement sont visibles.

## Pas à pas
### Poser une question
1. Ouvrir ChatGDB, cliquer « Nouvelle conversation ».
2. Taper la question (ou dicter avec le micro : on parle, on reclique, le texte arrive dans la zone de saisie).
3. Envoyer. Les sources web éventuelles sont citées [1], [2]…

### Joindre un document ou une photo
Images collées, déposées ou jointes (réduites à 1568 px dans le navigateur), PDF (jusqu'à environ 9 Mo), fichiers texte. ChatGDB les lit et en tient compte.

### Interroger un document de la Bibliothèque
Dans la Bibliothèque, ouvrir le document puis « Poser une question » : ChatGDB s'ouvre avec la question préremplie « Dans le document « … » de la bibliothèque, ». ChatGDB peut aussi chercher lui-même dans la bibliothèque et cite le titre du document.

### Écrire au service informatique
Page Aide de ScoutHub > « Demander de l'aide à ChatGDB » (ou ChatGDB avec `?aide=1`). ChatGDB pose quelques questions, demande éventuellement une capture, rédige le message et affiche une carte de validation : rien n'est envoyé sans clic de l'utilisateur.

### Modifier un artefact
1. Ouvrir l'artefact (document, page, tableau, image vectorielle, script) dans le volet de droite.
2. Onglet **Modifier** : le contenu en haut (à gauche en plein écran), l'aperçu en dessous, mis à jour pendant la frappe.
3. Pour une page web, **Modifier dans l'aperçu** permet de cliquer dans la page et d'en changer les textes directement ; le code suit.
4. **Enregistrer** (ou Ctrl+S) crée une nouvelle version, marquée « modifiée » dans la liste des versions. ChatGDB la voit à la question suivante et repart d'elle.

### Autonomie, initiative et priorité de l'administrateur
- Quand on lui confie une tâche dans une application, ChatGDB la mène **jusqu'au bout seul**, en enchaînant plusieurs actions dans la même réponse : il prend les décisions, invente le contenu manquant quand on lui laisse la liberté, corrige ses erreurs et ne pose une question que si une information indispensable manque. S'il conclut quand même par une question ou une promesse (« veux-tu que je continue ? », « je vais… ») alors qu'il travaille dans une application, il est **relancé automatiquement** (au plus deux relances sans effet).
- **Priorité de l'administrateur :** pour un compte administrateur, ses demandes l'emportent sur les consignes générales (style, prudence, longueur, nombre d'étapes, autonomie). Seules limites : ce qui serait illégal ou dangereux pour des personnes, et les restrictions techniques des outils. Dans les applications, l'administrateur peut aussi lui faire supprimer ou effacer des éléments ; le paiement, la commande et la déconnexion restent refusés à tout le monde.
- **Mémoire de ses gestes :** à la fin de chacun de ses messages, le système lui renvoie un journal des actions réellement exécutées, pour qu'il sache où il en est d'une réponse à l'autre.
- Il peut agrandir l'application en plein écran (action « agrandir ») quand la fenêtre est étroite.

### Sélectionner, placer le curseur, valider (toutes les applications)
- **Règle essentielle :** pour appliquer un style, une police, une taille, une couleur, du gras ou un alignement à un texte ou à des cellules, ChatGDB les **sélectionne d'abord**, vérifie sur la capture que la zone surlignée est la bonne, puis applique.
- **Sélectionner :** double-clic sur un mot, triple-clic sur une ligne ou un paragraphe, clic puis clic avec Maj pour une plage, glisser, ou au clavier (Maj+flèches, Ctrl+Maj+flèche pour un mot, Maj+Début / Maj+Fin, Ctrl+A).
- **Placer le curseur précisément :** clic à l'endroit voulu, ou Ctrl+Début, Ctrl+Fin, Début, Fin, flèches (répétables). Pour viser un caractère, ChatGDB prend une **capture agrandie** de la zone, avec des repères tous les 10 à 20 px, puis contrôle où est le curseur.
- **Entrée :** la touche Entrée crée un nouveau paragraphe (Word, PowerPoint) ou valide la cellule (Excel) ; Tab passe à la cellule suivante ; Retour arrière et Suppr effacent ; Ctrl+Z annule. Essais réussis : Word (lignes, sélection, gras, italique, souligné), PowerPoint (titre, sous-titre sur trois lignes, tout sélectionner puis gras), Excel (tableau, sélection de cellules, gras, couleur de fond).

### Faire ouvrir et préparer une application
ChatGDB peut proposer des **liens d'action** (boutons) qui ouvrent une application déjà préparée, par exemple une carte ScoutMap avec un itinéraire. Il peut aussi ouvrir une application de ScoutHub dans le volet d'artefact et l'utiliser comme une personne, avec une **souris visible** à l'écran : ouvrir avec des paramètres d'adresse, **chercher** un élément d'interface par son texte (« onglet Insertion », « bouton Enregistrer ») pour obtenir sa position, cliquer (clic droit, double-clic), glisser, taper au clavier lettre par lettre, envoyer des raccourcis (Échap, Entrée, Ctrl+Z…), lire l'écran en texte et prendre des captures avec des repères tous les 100 px. Les applications dessinées dans un canvas (Excel/GridCraft, CAO, 3D) sont vues réellement : ChatGDB y clique par coordonnées et y tape du texte (essai : cellules d'Excel remplies, onglet Insertion ouvert). En secours, le bouton « Laisser ChatGDB voir l'application » partage l'onglet. À la fin, un artefact de type « application » permet de reprendre la main (il rouvre l'application avec ses paramètres ; l'état saisi à la main n'est pas conservé).
Garde-fous : applications du même site seulement (pas ScoutCloud ni la boutique), jamais de suppression, d'envoi, de paiement, de déconnexion ni de mot de passe, liens externes non suivis. Il n'y a ni nombre maximal d'étapes ni longueur maximale de réponse : ChatGDB continue jusqu'à avoir fini (ou jusqu'à ce que vous l'arrêtiez), et la seule limite est celle de vos crédits.

## Préférences
- **Modèle** : Haiku (rapide, économe) ou Sonnet (plus fin, environ 10 à 20 fois plus de crédits). Aucun modèle plus gros n'est autorisé.
- **Niveau de réflexion** : faible, moyenne, élevée.
- **Recherche web** : standard (quelques recherches, pages lues) ou approfondie (nombreuses recherches, pages lues en entier, recoupement des sources ; coûte beaucoup plus).
- Style des réponses, instructions personnalisées, thème clair ou sombre.

## Crédits
- 1 crédit = 0,001 $ de coût réel : modèle, réflexion et recherches web sont décomptés. Une question courte coûte environ 1 crédit avec Haiku, environ 11 avec Sonnet, chaque recherche web environ 10.
- Limites : une par session de 5 heures (fenêtre ouverte à la première question) et une par semaine. Valeurs de novembre 2026 : 30 crédits par session de 5 h, 60 par semaine, plus jusqu'à 40 crédits gagnés en utilisant les autres applications de ScoutHub (1 crédit par 5 minutes d'activité réelle).
- Les crédits sont comptés par le serveur Cloudflare de ScoutHub, qui transmet les questions à Claude sans jamais montrer sa clé au navigateur ; quand la limite est atteinte, la question est refusée avec le délai avant renouvellement.
- L'administrateur n'a pas de limite, mais sa consommation est suivie (Paramètres, Utilisation et crédits).

## Mémoire (administrateur)
L'administrateur peut apprendre des choses à ChatGDB (« retiens que… ») : l'IA prépare une note, enregistrée seulement après son clic sur « Enregistrer ». Les notes ne sont pas envoyées à chaque question : ChatGDB lit les notes utiles quand il en a besoin.

## Liens d'action
- `https://fsggb.github.io/ScoutHub/ChatGDB/?q=<texte encodé>` : ouvre ChatGDB avec la question préremplie.
- `https://fsggb.github.io/ScoutHub/ChatGDB/?aide=1` : parcours guidé de demande d'aide au service informatique.

## Limites
- Les applications d'un autre site (boutique, ScoutCloud) ne peuvent pas être pilotées.
- ChatGDB ne génère pas d'images ; les images affichées viennent de la recherche web.
- La dictée intégrée des navigateurs ne fonctionne pas partout (pas dans Brave) ; ChatGDB enregistre et fait transcrire côté serveur.
- L'IA ne modifie jamais rien sans carte de confirmation.

## Questions auxquelles la fiche répond
- Comment accéder à ChatGDB ? Faut-il un compte ?
- Comment joindre une photo ou un PDF à ma question ?
- Pourquoi ma question est-elle refusée ? Combien me reste-t-il de crédits et comment en gagner ?
- Quelle différence entre Haiku et Sonnet, recherche standard et approfondie ?
- Comment ChatGDB peut-il ouvrir une application pour moi ?
- Comment écrire au service informatique avec ChatGDB ?
- Qu'est-ce qu'un artefact ?
