---
id: app-cadcraft
titre: CADCraft, dessin technique 2D (tuile AutoCAD)
theme: Applications
type: application
sources:
  - titre: CADCraft - README.md
    url: https://github.com/storytold/cadcraft
  - titre: CADCraft - docs/localization.md
    url: https://github.com/storytold/cadcraft/blob/main/docs/localization.md
  - titre: ScoutDraft - fiche CHATGDB.md
    url: https://github.com/fsggb/ScoutDraft/blob/main/CHATGDB.md
mots_cles: CADCraft, AutoCAD, ScoutDraft, DAO, dessin technique, plan, ligne de commande, calques, cotation, hachures, blocs, DXF, DWG, PDF, accrochage, plan de camp
liens: app-solidcraft, app-draw, app-scoutmap, applications-panorama
resume: CADCraft est un logiciel libre de dessin assisté par ordinateur 2D, présenté dans ScoutHub sous la tuile AutoCAD. La fiche décrit la ligne de commande, les commandes de dessin et de modification, les accrochages, les calques, la cotation, les hachures et blocs, les présentations et l'impression PDF, les formats DXF et DWG, et ses limites.
---

## À quoi sert CADCraft
Application libre (MIT/Apache, équipe ArtCraft / storytold) de **dessin technique 2D** écrite en Rust, qui suit le fonctionnement d'AutoCAD : ligne de commande, accrochages aux objets, calques, cotes, hachures, blocs, fichiers DXF. Pour des scouts : plan coté d'un terrain de camp ou d'un local, plan d'implantation des coins de patrouille, plan d'une construction avec cotes précises, schéma à l'échelle à imprimer.
Statut : développement précoce (alpha), rapide.

## Ouvrir CADCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/CADCraft/?lang=fr (tuile « AutoCAD », rubrique Conception et CAO). Compilé depuis le dernier commit.
- Langue : Édition > Interface Language (Auto, Français…) ; le choix est gardé dans le navigateur.

## Interface
- **Zone de dessin** (espace objet) : grille adaptative, axes, curseur en croix avec carré de sélection, icône SCU, ViewCube ; zoom molette, déplacement bouton du milieu, pincement.
- **Ligne de commande** en bas : invites avec `[mots-clés]` cliquables, historique, saisie semi-automatique, alias.
- **Tool Sets** à gauche ; palettes **Calques** et **Propriétés** à droite ; barre d'état (accrochages, polaire, ortho, onglets Objet / présentations).

## Utiliser la ligne de commande
- Taper une commande (ou son alias, par exemple `L` pour LINE) puis Entrée ; répondre aux invites.
- Coordonnées : `x,y` absolues, `@dx,dy` relatives, `@d<a` polaires (distance et angle), `#x,y` ; saisie directe de distance (montrer la direction et taper la longueur).
- Entrée, Espace ou clic droit répète la dernière commande. Commandes transparentes, scripts de type `.scr`.
Exemple : `line 0,0 @10,0 @0,5 c` (triangle fermé), `circle 5,2 1`, `offset 0.25` puis choisir l'objet et le côté, `zoom e` (zoom étendu).

## Commandes disponibles
- **Dessin** : LINE, PLINE (arcs, épaisseurs), CIRCLE (centre/rayon/diamètre, 2P, 3P), ARC, RECTANG (congé/chanfrein), POLYGON, ELLIPSE, SPLINE, POINT, XLINE, RAY, DONUT, TEXT, MTEXT.
- **Modification** : ERASE, MOVE, COPY, ROTATE, SCALE, MIRROR, STRETCH, OFFSET, TRIM, EXTEND, FILLET, CHAMFER, BREAK, JOIN, EXPLODE, ARRAY rectangulaire/polaire, ordre d'affichage, OVERKILL.
- **Précision** : accrochages (extrémité, milieu, centre, nœud, quadrant, intersection, insertion, perpendiculaire, tangente, proche), repérage polaire, ortho, grille.
- **Calques et propriétés** : gestionnaire des calques (activé/désactivé, gelé, verrouillé, tracé, couleur, type de ligne), outils d'isolement ; palette Propriétés par objet ; types et épaisseurs de ligne, couleurs.
- **Annotation** : toutes les commandes DIM* avec styles de cotes, cotes associatives, MLEADER, TABLE, polices TrueType, police filaire propre.
- **Hachures et blocs** : hachures par point intérieur avec îlots, motifs, aplats et dégradés ; BLOCK/INSERT, attributs, blocs imbriqués.
- **Présentations et impression** : espace papier, fenêtres à l'échelle, mises en page, PLOT et EXPORTPDF.
- **Paramétrique** : contraintes géométriques et dimensionnelles, AUTOCONSTRAIN, PARAMETERS avec expressions.
- **Poignées** : poignée chaude puis Espace pour passer entre étirer, déplacer, rotation, échelle, miroir.

## Pas à pas : plan coté d'un terrain de camp
1. Créer un calque par type d'élément (limites, tentes, feux, cotes) dans la palette Calques.
2. Dessiner le contour : `PLINE`, puis points en `@dx,dy` (une unité = 1 m par exemple), `c` pour fermer.
3. Placer les tentes avec `RECTANG` et `COPY` ou `ARRAY`.
4. Coter avec les commandes DIM (cote linéaire, alignée…), ajouter des textes (`TEXT`/`MTEXT`) et hachurer les zones (`HATCH`).
5. Créer une présentation (espace papier) avec une fenêtre à l'échelle, puis `PLOT` / `EXPORTPDF` pour obtenir un PDF.
6. Enregistrer en DXF.

## Fichiers
- **DXF** : lecture R12 à 2018 (ASCII et binaire), écriture R2000, avec styles de cotes, tableaux, contraintes.
- **DWG** : lecture R13 à 2018 et écriture R2000 (bibliothèque libre acadrust).
- **Export** : PDF (tracé), SVG, PNG.
- Les entités que CADCraft ne modélise pas encore ne sont pas conservées à l'enregistrement.

## Raccourcis
Les alias de commandes classiques (`L` ligne, etc.) se tapent dans la ligne de commande ; Entrée, Espace ou clic droit répète la commande ; Espace sur une poignée chaude change de mode.

## Limites
- Alpha : parité partielle avec AutoCAD ; vérifier les fichiers importants.
- Polices SHX non lues (remplacées par la police filaire de CADCraft) ; dans le navigateur, pas de polices système.
- Pas encore de 3D complète : pour la 3D, utiliser SolidCraft.

## Questions auxquelles la fiche répond
- La tuile « AutoCAD » est-elle le vrai AutoCAD ?
- Comment dessiner une ligne d'une longueur précise ? Que veut dire `@10<45` ?
- Comment faire un plan coté du terrain de camp et l'imprimer en PDF ?
- Peut-on ouvrir un fichier DWG ou DXF ?
- Comment mettre l'interface en français ?
