---
id: app-scoutbibliotheque
titre: Bibliothèque, les documents de la fédération
theme: Applications
type: application
sources:
  - titre: ScoutBibliotheque - fiche CHATGDB.md
    url: https://github.com/fsggb/ScoutBibliotheque/blob/main/CHATGDB.md
  - titre: ScoutBibliotheque - README.md
    url: https://github.com/fsggb/ScoutBibliotheque/blob/main/README.md
  - titre: ScoutHub - docs/projet-chatgdb.md (sections 6 ter et 10)
    url: https://github.com/fsggb/ScoutHub/blob/main/docs/projet-chatgdb.md
mots_cles: bibliothèque, documents, PDF, rubriques, recherche, télécharger, Google Drive, rôle, chef d'unité, ressources, ScoutBibliotheque
liens: app-chatgdb, app-scouthub, applications-panorama
resume: La Bibliothèque présente les documents de la FSGGB (PDF, textes, procédures, ressources scoutes) rangés en rubriques, avec recherche dans les titres et le contenu. La fiche explique comment y accéder, chercher, lire, télécharger un document, le faire analyser par ChatGDB, et pourquoi certaines rubriques sont réservées.
---

## À quoi sert la Bibliothèque
Application de ScoutHub (rubrique « Ressources et aide ») qui présente les documents d'un dossier Google Drive de la fédération : PDF, textes, procédures, ressources scoutes. Les dossiers Drive deviennent des **rubriques**. Pour un chef : retrouver une fiche technique, un document de formation, une procédure administrative ; la lire dans la page, la télécharger, ou demander à ChatGDB de l'expliquer.

## Ouvrir la Bibliothèque
- Adresse : https://fsggb.github.io/ScoutHub/ScoutBibliotheque/
- **Compte ScoutHub obligatoire** (la connexion est la même que pour tout ScoutHub).

## Interface et fonctions
- Parcours des rubriques ; bascule entre **vignettes** et **liste**.
- **Recherche** par titre ou par contenu : le texte des PDF est indexé (les très gros PDF sont lus par OCR).
- Un clic **ouvre le document dans la page** (PDF, images, texte).
- **Télécharger** : enregistre le document sur l'ordinateur.
- **Poser une question** : ouvre ChatGDB avec une question préremplie sur ce document.

## Pas à pas
### Trouver et lire un document
1. Se connecter à ScoutHub, ouvrir la tuile Bibliothèque.
2. Taper un mot dans la recherche (titre ou mot du contenu), ou ouvrir une rubrique.
3. Cliquer sur le document pour l'afficher ; « Télécharger » pour le garder.

### Faire expliquer un document par ChatGDB
1. Ouvrir le document.
2. Cliquer « Poser une question » : ChatGDB s'ouvre avec « Dans le document « titre » de la bibliothèque, » ; compléter la question et envoyer.
ChatGDB peut aussi chercher et lire les documents tout seul pour répondre à une question générale ; il cite alors le titre.

## Accès par rôle
Certaines rubriques sont réservées à un rôle et aux rôles supérieurs (membre < parent < chef d'unité < chef de groupe < administrateur), par exemple aux chefs d'unité : un membre ne les voit pas, et ChatGDB respecte la même règle (le rôle de l'utilisateur est transmis). Techniquement, une ligne `acces: chef_unite` dans la description du dossier Drive réserve ce dossier ; un dossier dont le nom commence par `_` est ignoré. L'index est rafraîchi toutes les 10 minutes.

## Ajouter un document (administrateur)
Déposer le fichier dans le dossier Drive de la bibliothèque, dans la bonne rubrique ; il apparaît au plus tard 10 minutes après. L'administrateur peut aussi demander à ChatGDB de déposer un document : carte de confirmation, copie dans Drive et dans le dépôt de données privé, fiche de mémoire créée en même temps.

## Formats
PDF, images et textes s'affichent dans la page ; tout document peut être téléchargé.

## Limites
- Pas d'accès sans compte.
- Un document n'apparaît qu'après la mise à jour de l'index (10 minutes au plus).

## Questions auxquelles la fiche répond
- Où trouver les documents officiels de la fédération ?
- Pourquoi je ne vois pas une rubrique que voit mon chef ?
- Comment chercher un mot à l'intérieur des PDF ?
- Comment télécharger un document ou le faire résumer par ChatGDB ?
- Comment ajouter un document à la bibliothèque ?
