---
id: app-pdf
titre: PDFCraft, lire et organiser des PDF (tuile Acrobat)
theme: Applications
type: application
sources:
  - titre: PdfCraft - README.md
    url: https://github.com/storytold/pdfcraft
  - titre: ScoutHub - fiche CHATGDB.md et config.js
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
mots_cles: PDFCraft, PdfCraft, Acrobat, PDF, fusionner, combiner, scinder, extraire des pages, pivoter, formulaire, signature, mot de passe, OCR, commentaires, caviardage
liens: app-word, app-scoutbibliotheque, applications-panorama
resume: PDFCraft est l'application libre de lecture et d'édition de PDF présentée dans ScoutHub sous la tuile Acrobat. La fiche explique comment lire et chercher dans un PDF, organiser les pages, combiner plusieurs PDF, scinder ou extraire des pages, remplir un formulaire, ouvrir un document protégé, reconnaître le texte d'un scan, et ses limites.
---

## À quoi sert PDFCraft
Lecteur et atelier PDF libre et gratuit (MIT/Apache, équipe ArtCraft / storytold), sans compte, sans télémétrie, les documents ne quittent pas l'appareil. Usages scouts : réunir les autorisations parentales scannées en un seul PDF, extraire quelques pages d'un document de la fédération, remplir un formulaire PDF (inscription, déclaration de camp), faire pivoter un scan, rendre un scan cherchable.

## Ouvrir PDFCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/PDF/ (tuile « Acrobat », rubrique Bureautique ; « Lecture et édition de PDF »). Ce n'est pas Adobe Acrobat.
- Sans compte ; les fichiers s'ouvrent depuis l'ordinateur et s'enregistrent sur l'ordinateur.

## Interface
Onglets de documents (un point signale un document modifié), panneau Outils, panneau latéral (signets, vignettes de pages), Inspecteur > Pages (taille des vignettes 50 à 150 %), catalogue **Tous les outils** et palette de commandes. Dispositions : continue, page unique, deux pages, rotation de la vue, plein écran, mode Lecture ; thèmes clair et sombre.

## Fonctions et pas à pas
### Lire et chercher
Recherche dans tout le document pendant la frappe, passage de résultat en résultat ; sélection et copie du texte dans le bon ordre de lecture. Signets (recherche dans les titres), vignettes, numérotation propre du document.
### Organiser les pages
1. Ouvrir **Organiser les pages** : toutes les pages s'affichent.
2. Sélectionner (clic, Ctrl/⌘-clic, Maj-clic) ; pivoter, supprimer, insérer des pages blanches ou des pages d'un autre fichier, déplacer.
3. Annuler si besoin (Ctrl/⌘+Z), puis enregistrer.
### Réunir plusieurs PDF (autorisations parentales)
**Combiner des fichiers** : choisir les PDF ; chacun devient un signet du document final ; liens, champs de formulaire, calques et pièces jointes sont conservés.
### Scinder ou extraire
**Extraire** copie les pages choisies dans un nouveau document ; **Scinder** coupe tous les *n* pages ou avant les pages choisies.
### Formulaires, commentaires, calques, pièces jointes
Champs avec leur valeur, surlignage des champs, cases, boutons radio, listes, signatures ; création de formulaires ; commentaires en fils de discussion ; calques activables ; pièces jointes à ouvrir ou enregistrer.
### Documents protégés
Ouverture avec mot de passe utilisateur ou propriétaire (RC4 40 bits à AES-256) ; les restrictions de l'auteur sont respectées ; les modifications restent chiffrées. Propriétés du document : titre, auteur, mots-clés (modifiables), polices, version, sécurité.
### Rendre un scan cherchable (OCR)
**Numériser et OCR > Reconnaître le texte** : page courante, plage ou dossier ; nettoyage optionnel (redressement, débruitage) ; écran de vérification où chaque mot montre la confiance du moteur.
### Autres
Caviardage et nettoyage, signatures numériques de base, impression (bureau), vérificateur d'accessibilité.

## Fichiers et enregistrement
PDF en lecture et écriture. Les enregistrements ordinaires ajoutent les modifications sans toucher aux octets d'origine ; écriture atomique, sauvegarde automatique chaque minute et récupération après fermeture inattendue (version de bureau).

## Raccourcis
Ctrl/⌘+K : rechercher tout outil ou commande ; Ctrl/⌘+G : résultat suivant ; Ctrl/⌘+Z : annuler ; Ctrl/⌘+virgule : préférences (langue de l'interface, Auto suit le système).

## Limites
- Alpha (environ 55 % prêt pour l'usage courant).
- Pas de conversion d'un document Office en PDF ; export .docx qui perd la mise en page ; modification fiable du texte existant pas encore au point ; OCR limité à l'alphabet latin.
- Dans la version web : pas d'impression, pas de « Rouvrir » ni « Afficher dans le dossier ».
- Pour produire un PDF depuis un texte, utiliser WordCraft (export PDF).

## Questions auxquelles la fiche répond
- Comment fusionner plusieurs PDF en un seul ?
- Comment extraire ou supprimer des pages, faire pivoter un scan ?
- Comment remplir un formulaire PDF ?
- Comment ouvrir un PDF protégé par mot de passe ?
- Comment rendre un PDF scanné cherchable ?
- Peut-on convertir un Word en PDF avec PDFCraft ?
