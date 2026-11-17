---
id: app-aftereffects
titre: EffectCraft, animation et effets visuels (tuile After Effects)
theme: Applications
type: application
sources:
  - titre: EffectCraft - README.md
    url: https://github.com/storytold/effectcraft
  - titre: ScoutHub - fiche CHATGDB.md et config.js
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
mots_cles: EffectCraft, After Effects, animation, motion design, compositing, titre animé, générique, images clés, effets, Lottie, expressions, rendu
liens: app-premiere, app-illustrator, applications-panorama
resume: EffectCraft est le compositeur et outil d'animation libre présenté dans ScoutHub sous la tuile After Effects. La fiche explique son usage pour les titres animés et génériques, ses panneaux, calques, images clés, effets, la 3D, la file d'attente de rendu, les formats dont le Lottie et le projet .ecproj, et ses limites.
---

## À quoi sert EffectCraft
Compositeur libre (MIT/Apache, équipe ArtCraft / storytold) pour titres animés, motion design et compositing, avec les panneaux et raccourcis habituels d'After Effects. Usages scouts : générique animé du film de camp, logo du groupe qui s'anime, transition originale, animation légère pour un site (Lottie).

## Ouvrir EffectCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/AfterEffects/ (tuile « After Effects », rubrique Création). Ce n'est pas Adobe After Effects.
- Sans compte ; projets et rendus enregistrés sur l'ordinateur.

## Interface
Panneaux Projet, Composition, Timeline (montage), Calque, Métrage, Options d'effet, Outils, Aperçu, Effets et paramètres prédéfinis, Audio, Info, Paragraphe, Caractère, Aligner, File d'attente de rendu.

## Fonctions principales
- **Calques** : solides, formes, texte, métrage, compositions imbriquées, objets nuls, calques de réglage, caméras, lumières ; parentage, caches, 38 modes de fusion, flou de mouvement.
- **Images clés** : linéaires, Bézier, maintien, lissage de vitesse (F9), éditeur de graphiques.
- **Temps** : remappage, étirement, inversion, image figée, marqueurs.
- **Formes et masques** (réduire le tracé, répéteur…), **texte** avec animateurs, **expressions** JavaScript (`wiggle`, `loopOut`…), outils marionnette.
- **308 effets** (flou, correction colorimétrique, distorsion, génération, incrustation, simulation de particules, pluie, lueur…), styles de calque.
- **3D** : calques 3D, caméras à profondeur de champ, lumières avec ombres.

## Pas à pas : titre animé pour le film du camp
1. Nouvelle composition (1920 × 1080, durée 5 s).
2. Calque de texte : « Camp d'été 2026 ».
3. Appuyer sur P (position) et S (échelle), poser des images clés au début et à 1 s ; F9 pour adoucir.
4. Ajouter un effet (lueur, par exemple) depuis Effets et paramètres prédéfinis.
5. Ajouter à la file d'attente de rendu, sortie H.264 MP4 (ou ProRes avec alpha pour incruster dans FilmCraft).

## Formats
- Projet : `.ecproj` (JSON versionné lisible).
- Rendu : H.264 MP4, ProRes MOV (avec alpha), HEVC, AV1, WebM (VP9/AV1), séquences PNG, JPEG, TIFF, Targa, EXR, GIF animé, WAV/AIFF.
- **Lottie** : export (Fichier > Exporter > Lottie JSON…, `.json` ou `.lottie`) et import (Fichier > Importer > Lottie…).

## Raccourcis
Propriétés de calque : A (point d'ancrage), P (position), S (échelle), R (rotation), T (opacité), M (masques), F (contour progressif), E (effets), L, U ; double frappe (AA, PP…) ; Maj pour ajouter une propriété ; Alt+Maj+A/P/S/R/T pour poser une image clé ; F9 lissage de vitesse ; Ctrl+` déplier les calques.

## Limites
- Très jeune (premier commit le 1er octobre 2026), alpha : pas recommandé pour un travail de production ; pas de projets .aep ni de plugins After Effects.
- Roto Brush et suivi de visage demandent des modèles optionnels.

## Questions auxquelles la fiche répond
- Comment faire un titre animé pour le film du camp ?
- Est-ce le vrai After Effects ? Puis-je ouvrir un .aep ?
- Comment exporter une animation pour un site web (Lottie) ?
- Quels raccourcis pour afficher les propriétés d'un calque ?
