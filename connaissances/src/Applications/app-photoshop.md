---
id: app-photoshop
titre: PhotoCraft, retouche d'images (tuile Photoshop)
theme: Applications
type: application
sources:
  - titre: PhotoCraft - README.md
    url: https://github.com/storytold/photocraft
  - titre: ScoutHub - fiche CHATGDB.md et config.js
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
mots_cles: PhotoCraft, Photoshop, retouche, image, photo, calques, masques, PSD, détourage, sélection, filtres, texte, affiche, PNG, JPEG
liens: app-lightroom, app-illustrator, app-indesign, applications-panorama
resume: PhotoCraft est l'éditeur d'images libre présenté dans ScoutHub sous la tuile Photoshop. La fiche explique comment l'ouvrir, travailler avec calques, masques, calques de réglage, sélections, texte, formes, filtres et transformations, les formats ouverts et enregistrés dont le PSD, quelques raccourcis et les limites.
---

## À quoi sert PhotoCraft
Éditeur d'images libre et gratuit (MIT/Apache, équipe ArtCraft / storytold) dont les menus, raccourcis, panneaux et outils suivent Photoshop (« si vous connaissez Photoshop, vous connaissez PhotoCraft »). Hors ligne, sans compte. Usages scouts : retoucher les photos du camp, détourer une personne, monter une affiche de kermesse ou de vente de calendriers, préparer un visuel pour le site du groupe.

## Ouvrir PhotoCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/Photoshop/ (tuile « Photoshop », rubrique Création). Ce n'est pas Adobe Photoshop.
- Sans compte ; images ouvertes depuis l'ordinateur et enregistrées/exportées sur l'ordinateur.

## Fonctions principales
- **Calques** : groupes, masques d'écrêtage, masques de pixels et vectoriels, calques de remplissage, **calques de réglage** non destructifs (Niveaux, Courbes, Vibrance, Teinte/Saturation…), objets dynamiques avec filtres dynamiques, 27 modes de fusion, opacité, verrous, fusionner/aplatir.
- **Styles de calque** : ombre portée, ombre interne, lueurs, biseau et estampage, satin, contour, incrustations couleur/dégradé/motif.
- **Sélections** : rectangle, ellipse, lassos, baguette magique, sélection rapide, sélection d'objet, **Sélectionner le sujet**, Sélectionner et masquer (cheveux) ; calcul local, sans cloud.
- **Texte** : texte de point et de paragraphe modifiable sur le canevas, panneaux Caractère et Paragraphe.
- **Formes et tracés** : rectangle, ellipse, triangle, polygone, ligne, plume ; combinaisons, panneau Tracés.
- **Filtres** avec aperçu en direct : flous (gaussien, mouvement, objectif, galerie de flou), netteté, réduction du bruit, déformations, pixellisation, peinture à l'huile, nuages, éclairage…
- **Retouche** : correcteur localisé, correcteur, pièce, déplacement basé sur le contenu, yeux rouges, tampon de duplication, outil Supprimer ; pinceaux avec dynamique de forme et pression du stylet.
- **Transformation** : transformation manuelle (échelle, rotation, inclinaison, perspective), rotations et symétries exactes.
- **Historique** complet, pinceau d'historique ; actions enregistrables ; règles, repères, grille.
- **Exporter sous** (format, qualité, transparence, échelle, aperçu, estimation de taille), export rapide en PNG.
- Couleur : RVB, niveaux de gris, CMJN, Lab en 8, 16, 32 bits ; profils ICC, épreuvage.

## Pas à pas
### Détourer une photo pour une affiche
1. Ouvrir la photo (Fichier > Ouvrir, fichier de l'ordinateur).
2. Sélection > Sélectionner le sujet ; affiner avec Sélectionner et masquer si nécessaire.
3. Transformer la sélection en masque de calque.
4. Ouvrir ou créer le fond de l'affiche, glisser le calque détouré, ajouter le texte (outil Texte) et un style de calque (ombre portée).
5. Enregistrer en PSD pour garder les calques ; Exporter sous en PNG ou JPEG pour l'impression ou le web.
### Éclaircir une photo sombre sans l'abîmer
Ajouter un calque de réglage Niveaux ou Courbes ; le masquer sur une zone si besoin ; l'original n'est jamais modifié.

## Formats
- **PSD et PSB** (lecture et écriture, rendus fidèles), TIFF à calques, OpenRaster (lecture/écriture), format natif **.pcraft**.
- Lecture : Paint.NET PDN, GIMP XCF, Krita .kra, SVG (calques de formes), Affinity (lecture seule), HEIC.
- Images à plat : PNG, JPEG, TIFF, WebP, GIF, BMP, TGA, ICO, QOI, PNM, OpenEXR, HDR, FITS.
- Pas de lecture AVIF ni JPEG XL.

## Raccourcis
Raccourcis de Photoshop : Ctrl/⌘+J (calque par copie), Ctrl/⌘+Maj+D (resélectionner), Ctrl/⌘+Y (épreuvage), Ctrl/⌘+Maj+Y (alerte de gamme), Ctrl/⌘+F (palette de commandes), Ctrl/⌘+V coller.

## Limites
- Projet jeune : vérifier le rendu des PSD complexes ; garder les originaux.
- Les fonctions « IA génératives » n'existent pas ; la sélection intelligente fonctionne localement.

## Questions auxquelles la fiche répond
- Est-ce le vrai Photoshop ? Puis-je ouvrir un fichier PSD ?
- Comment détourer une personne sur une photo ?
- Comment faire une affiche avec photo et texte ?
- Comment exporter en JPEG ou PNG pour le web ?
- Comment corriger une photo sans la détruire ?
