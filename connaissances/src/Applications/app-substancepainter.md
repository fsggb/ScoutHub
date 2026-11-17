---
id: app-substancepainter
titre: TextureCraft, peinture de textures 3D (tuile Substance Painter)
theme: Applications
type: application
sources:
  - titre: TextureCraft - README.md
    url: https://github.com/storytold/texturecraft
  - titre: ScoutHub - fiche CHATGDB.md et config.js
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
mots_cles: TextureCraft, Substance Painter, texture, 3D, PBR, matériau, peinture 3D, modèle, glTF, OBJ, FBX, export de textures, jeu vidéo
liens: app-solidcraft, app-photoshop, applications-panorama
resume: TextureCraft est le logiciel libre de peinture de textures sur modèles 3D présenté dans ScoutHub sous la tuile Substance Painter. La fiche explique à quoi il sert, ses fonctions (calques, masques, matériaux intelligents, cuisson des cartes), les formats de modèles importés et de textures exportées, et ses limites.
---

## À quoi sert TextureCraft
Logiciel libre (MIT/Apache, équipe ArtCraft / storytold) pour **peindre des matériaux PBR directement sur des modèles 3D**, par calques avec masques, cuire les cartes du maillage et exporter les textures pour un moteur de jeu, avec la disposition et les raccourcis de Substance Painter. Usages scouts : projet de jeu vidéo ou de modèle 3D en atelier de branche rouge, habiller en bois ou en toile un modèle (exporté en OBJ ou glTF depuis SolidCraft par exemple) pour une présentation réaliste.

## Ouvrir TextureCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/SubstancePainter/ (tuile « Substance Painter », rubrique Création). Ce n'est pas Adobe Substance 3D Painter.
- Sans compte ; fichiers sur l'ordinateur. Interface disponible en français.

## Fonctions principales
- Ensembles de textures, pile de calques avec mélange par canal, masques et générateurs, **matériaux intelligents**, étagère d'outils, vues 3D et 2D.
- Peinture sur la surface 3D : les coups de pinceau traversent les coutures UV, sans peindre l'arrière du modèle.
- **Cuisson** des cartes du maillage (sur le GPU), mode de rendu par lancer de rayons, viewport PBR.
- Préréglages et modèles d'export, tuiles UDIM ; matériaux, environnements et pinceaux procéduraux.
- Projets sans perte `.tcraft`, annulation illimitée.

## Pas à pas
1. Importer un modèle (glTF/GLB, FBX, OBJ…).
2. Cuire les cartes du maillage.
3. Appliquer un matériau intelligent (il utilise les cartes cuites), puis peindre des détails sur un calque avec masque.
4. Exporter les textures (PNG, TGA, EXR… en 8, 16 ou 32 bits) avec un préréglage d'export, ou le modèle texturé en OBJ, GLB ou USD.
5. Enregistrer le projet `.tcraft`.

## Formats
- Modèles en entrée : glTF/GLB, FBX, COLLADA, USD, Alembic, OBJ, PLY, STL.
- Textures en sortie : PNG, JPEG, TGA, TIFF, BMP, WEBP, EXR, HDR ; maillages texturés OBJ, GLB, USD.
- Projet : `.tcraft` ; matériaux MaterialCraft `.mcmat`.

## Limites
- Pas d'inclinaison du stylet ni de pression dans les navigateurs de bureau ; pas de lancer de rayons matériel ; Alembic animé non pris en charge.
- Outil spécialisé : demande un modèle 3D déjà déplié (UV).

## Questions auxquelles la fiche répond
- À quoi sert la tuile Substance Painter de ScoutHub ?
- Comment peindre une texture bois sur un modèle 3D ?
- Quels formats de modèles et de textures sont acceptés ?
