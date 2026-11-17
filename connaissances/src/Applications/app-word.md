---
id: app-word
titre: WordCraft, traitement de texte (tuile Word)
theme: Applications
type: application
sources:
  - titre: WordCraft - README.md
    url: https://github.com/storytold/wordcraft
  - titre: ScoutHub - fiche CHATGDB.md et apps.txt
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
mots_cles: WordCraft, Word, traitement de texte, docx, odt, lettre, compte rendu, styles, tableau, table des matières, publipostage, PDF, correction orthographique, suivi des modifications
liens: app-excel, app-powerpoint, app-pdf, app-indesign, applications-panorama
resume: WordCraft est le traitement de texte libre présenté dans ScoutHub sous la tuile Word. La fiche explique à quoi il sert pour un chef scout, comment l'ouvrir, ses fonctions (styles, tableaux, références, révision, publipostage), les formats qu'il lit et écrit dont .docx et PDF, quelques raccourcis et ses limites.
---

## À quoi sert WordCraft
Traitement de texte libre et gratuit (MIT/Apache, équipe ArtCraft / storytold), au fonctionnement familier pour qui connaît Word : ruban, styles, tableaux, suivi des modifications, références, publipostage. Il lit et écrit le **.docx**. Usages scouts : lettre aux parents, programme de camp, compte rendu de réunion, fiche d'inscription, carnet de chants (titres et premiers vers), dossier de camp, étiquettes et enveloppes par publipostage.

## Ouvrir WordCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/Word/ (tuile « Word », rubrique Bureautique). C'est WordCraft, pas Microsoft Word.
- Sans compte. ScoutHub sert la dernière version publiée, mise à jour automatiquement ; la première ouverture charge l'application (WebAssembly), les suivantes sont rapides.
- Les fichiers s'enregistrent sur l'ordinateur (ouvrir = choisir un fichier de l'ordinateur ; enregistrer = télécharger).
- Interface disponible en français (suit la langue du système par défaut).

## Interface
Ruban à onglets et groupes, règle (retraits déplaçables), volet Navigation, volet Styles, recherche de commande. Modes d'affichage : page, web, brouillon, lecture, concentration ; zoom, une ou plusieurs pages, mode sombre.

## Fonctions principales
- **Écriture** : correction automatique, guillemets typographiques, listes automatiques (`* `, `1. `), rechercher/remplacer (expressions régulières), annuler/rétablir.
- **Mise en forme** : polices, tailles, gras/italique/souligné, couleurs, surlignage, reproduire la mise en forme, changer la casse, effacer la mise en forme.
- **Paragraphes** : alignement, retraits, espacements, interligne, tabulations avec points de suite, bordures, trame, lignes solidaires.
- **Styles** : galerie avec aperçu en direct, volet Styles, créer/modifier des styles, jeux de styles, thèmes.
- **Listes** : puces, numérotation, multiniveau.
- **Tableaux** : insertion par grille, fusion/scission, styles, en-têtes répétés, tri, formules, conversion texte ↔ tableau.
- **Pages** : marges, orientation, format, colonnes, sauts, en-têtes et pieds de page, numéros de page, filigrane, bordures, lettrines, césure.
- **Objets** : images (rognage, luminosité, suppression d'arrière-plan…), formes, zones de texte, habillage.
- **Références** : table des matières, notes de bas de page, citations et bibliographie, légendes, renvois, index.
- **Révision** : orthographe et grammaire (anglais et polonais), synonymes, statistiques, commentaires, suivi des modifications (accepter/refuser), comparer, vérificateur d'accessibilité.
- **Publipostage** : depuis un fichier CSV, champs de fusion, bloc d'adresse, aperçu, enveloppes et étiquettes.

## Pas à pas
### Écrire une lettre aux parents et la sortir en PDF
1. Ouvrir la tuile Word, créer un document.
2. Appliquer un style Titre au titre (galerie des styles), écrire le texte.
3. Ajouter un en-tête (logo de l'unité) et un numéro de page si besoin.
4. Enregistrer en .docx (fichier téléchargé), puis exporter en PDF pour l'envoi.
### Publipostage pour les fiches d'autorisation
1. Préparer la liste des jeunes dans Excel (GridCraft) et l'enregistrer en CSV.
2. Dans WordCraft, Publipostage : choisir le CSV, insérer les champs (nom, prénom…), prévisualiser.
3. Terminer vers un document : une fiche par jeune.

## Formats
- Lit et écrit : **.docx**, .odt, .rtf, .html, .md, .tex (LaTeX), .txt.
- Ouvre les anciens **.doc** (97-2003).
- Exporte en **PDF** (texte sélectionnable, liens, signets) et en images de pages.

## Raccourcis
Ctrl/⌘+B gras (sur le mot sous le curseur), Entrée continue une liste, Tab descend d'un niveau, F4 répète la dernière action, F7 vérifie l'orthographe, F8 étend la sélection ; Ctrl+Z / Ctrl+Y annuler / rétablir.

## Limites
- Version alpha : environ 60 % prêt pour un usage réel ; graphiques et SmartArt mal conservés à l'aller-retour, pagination parfois différente de Word, pas d'impression native.
- Correcteur orthographique : anglais et polonais seulement (pas de français pour l'instant).
- Garder une copie des documents importants.

## Questions auxquelles la fiche répond
- Est-ce le vrai Microsoft Word ? Est-ce gratuit ?
- Puis-je ouvrir un .docx reçu par e-mail ? Un vieux .doc ?
- Comment enregistrer mon document et le convertir en PDF ?
- Comment faire un publipostage depuis une liste de jeunes ?
- Le correcteur fonctionne-t-il en français ?
