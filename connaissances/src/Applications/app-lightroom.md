---
id: app-lightroom
titre: LightCraft, développement et tri de photos (tuile Lightroom)
theme: Applications
type: application
sources:
  - titre: LightCraft - README.md
    url: https://github.com/storytold/lightcraft
  - titre: ScoutHub - fiche CHATGDB.md et config.js
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
mots_cles: LightCraft, Lightroom, photo, développement, RAW, tri, notation, album, recadrage, exposition, noir et blanc, préréglages, masques, export JPEG, photos du camp
liens: app-photoshop, app-premiere, applications-panorama
resume: LightCraft est la photothèque et l'atelier de développement photo libre présentés dans ScoutHub sous la tuile Lightroom. La fiche explique comment trier et noter les photos du camp, les retoucher sans les abîmer (lumière, couleur, recadrage, masques, noir et blanc, préréglages), les exporter, les formats acceptés et les limites de la version web.
---

## À quoi sert LightCraft
Chambre noire numérique libre (MIT/Apache, équipe ArtCraft / storytold), au fonctionnement familier de Lightroom : bibliothèque de photos et développement **non destructif** (les originaux ne sont jamais modifiés). Usages scouts : trier des centaines de photos de camp, garder les meilleures, corriger la lumière et les couleurs, faire une série en noir et blanc, exporter pour le diaporama ou l'album souvenir.

## Ouvrir LightCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/Lightroom/ (tuile « Lightroom », rubrique Création). Ce n'est pas Adobe Lightroom.
- Sans compte, sans cloud. Dans le navigateur, la bibliothèque est gardée dans le stockage du navigateur (OPFS/IndexedDB) et les exports sont téléchargés.

## Fonctions principales
- **Bibliothèque** : Toutes les photos, Ajoutées récemment, Choix, Par date, albums dans des dossiers, albums dynamiques, piles, copies virtuelles, Supprimées récemment ; notes 0 à 5, drapeaux, libellés, barre de filtre, recherche (`rating:>3 flag:pick date:2026-04 keyword:montagne`), tri, grilles fluides même avec des milliers de photos ; vues Comparer et Ensemble ; vue Personnes.
- **Lumière** : exposition, contraste, hautes lumières, ombres, blancs, noirs.
- **Couleur** : balance des blancs (température, teinte, pipette), vibrance, saturation, mélangeur de couleurs 8 bandes, étalonnage 3 roues.
- **Effets** : texture, clarté, correction du voile, vignettage, grain ; courbe des tonalités.
- **Masques** : pinceau, dégradés linéaire et radial, plage de luminance ou de couleur, ciel, sujet, arrière-plan ; 17 réglages locaux.
- **Recadrage et redressement** (ratios 1:1, 4:5, 2:3, 16:9…), rotation, symétrie, transformations ; noir et blanc (touche V) avec mélange N&B.
- **Préréglages** : 41 fournis (Golden Hour, Faded Matte…) avec curseur d'intensité ; copier/coller/synchroniser les réglages sur une sélection.
- Retouche des taches, yeux rouges ; réduction du bruit, netteté ; fusion HDR et panorama ; impression en PDF ; diaporama.

## Pas à pas : trier et exporter les photos du camp
1. Importer le dossier des photos.
2. Les parcourir et noter (0 à 5 étoiles), marquer les choix (P) et les rejets (X).
3. Filtrer sur les choix ; corriger une photo (Lumière, Couleur), puis copier/synchroniser ses réglages sur les photos de la même série.
4. Recadrer, appliquer éventuellement un préréglage.
5. Exporter en JPEG (taille, qualité, nommage, filigrane texte possible) : les fichiers sont téléchargés.

## Formats
- Ouvre : RAW (DNG, Canon CR2/CR3, Sony ARW, Nikon NEF, Fujifilm RAF, Panasonic RW2, Pentax PEF, Olympus ORF…), JPEG, PNG, TIFF, WebP, composites PSD, JPEG XL, GIF (première image), BMP.
- Exporte : JPEG, PNG, TIFF, PSD aplati, WebP, AVIF, JPEG XL, DNG, original ; XMP en lecture/écriture.

## Raccourcis
\ avant/après ; Y côte à côte ; Maj+Y vue partagée ; V noir et blanc ; P choix, X rejet ; chiffres 0 à 5 pour la note.

## Limites
- Alpha (environ 65 % pour un usage occasionnel). Pas de vidéo, pas de module Livre ni Carte.
- Dans le navigateur : WebGPU et Safari/Firefox encore en test ; les modèles d'IA optionnels (masques Objet/Décrire, visages, débruitage IA) sont des installations de bureau.
- La bibliothèque web vit dans le navigateur : effacer les données du site la supprime ; garder les originaux ailleurs.

## Questions auxquelles la fiche répond
- Comment trier rapidement les photos du camp ?
- Comment corriger une photo trop sombre sans l'abîmer ?
- Comment appliquer les mêmes réglages à toute une série ?
- Puis-je ouvrir les fichiers RAW de mon appareil ?
- Où sont gardées mes photos dans la version web ?
