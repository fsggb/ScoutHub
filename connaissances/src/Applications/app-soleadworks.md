---
id: app-soleadworks
titre: SoLeadWorks, meubles et coins de patrouille en 3D
theme: Applications
type: application
sources:
  - titre: SoLeadWorks - README.md et CHATGDB.md
    url: https://github.com/fsggb/SoLeadWorks
  - titre: SoLeadWorks - docs/SOLEADWORKS.md
    url: https://github.com/fsggb/SoLeadWorks/blob/main/docs/SOLEADWORKS.md
  - titre: SoLeadWorks - crates/engine/src/scout/models.rs et cmd/scout.rs
    url: https://github.com/fsggb/SoLeadWorks/tree/main/crates/engine/src
mots_cles: SoLeadWorks, ScoutCraft, froissartage, meuble, coin de patrouille, plan, liste de débit, nomenclature, tenon, mi-bois, brêlage, claies, CAO, SolidCraft, 3D
liens: app-cathia, app-solidcraft, app-scouthub, applications-panorama
resume: SoLeadWorks est une application de conception 3D pour le camp scout, construite sur le noyau SolidCraft allégé, qui produit un plan par meuble et une vue d'ensemble par coin de patrouille. La fiche décrit le ruban, les 11 modèles de meubles, les assemblages, les plans et la nomenclature, et ce qui manque encore par rapport à CathIA.
---

## À quoi sert SoLeadWorks
Alternative « de fond » à CathIA, avec le même objectif (froissartage : bois rond, tenons, mi-bois, claies, brêlages), mais bâtie sur le noyau complet de SolidCraft (esquisses contraintes, noyau B-rep, historique paramétrique, assemblages, nomenclature) allégé à l'extrême : tôlerie, plastique, surfaces, maillages, animation mécanique, rendu et usinage ont été retirés.
- **Un meuble** donne **un plan** : vues cotées, liste de débit, assemblages, ordre de montage.
- **Un coin de patrouille** range plusieurs meubles au sol, avec **une vue d'ensemble** et un plan pour chaque meuble.
Ancien nom du dépôt : ScoutCraft.

## Ouvrir SoLeadWorks
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/SoLeadWorks/?lang=fr (rubrique « Conception et CAO », tuile mise en avant). Interface en français par défaut.
- Application compilée en WebAssembly : la première ouverture est plus longue, les suivantes rapides.

## Interface
Le ruban s'ouvre sur l'onglet **Scout** et reprend les ateliers de CathIA, avec une icône par fonction :
| Onglet | Contenu |
|---|---|
| Édition | annuler / rétablir, points de retour (historique), déplacer-copier, répétitions, symétrie, supprimer, grouper, collisions, mesure, coupe |
| Créer | **Nouveau meuble** (les 11 modèles de CathIA, réglables) et **coin de patrouille** ; traverse, équerre, plateau de claies, filet |
| Opérations | Façonner : fendre, quart de bois, couper, pointe. Assemblages : tenon et mortaise (hachette, scié, plat, plat scié), mi-bois, queue d'aronde (3 types), chevilles, brêlage. Booléens |
| Formes | bloc, cylindre, tube rond, sphère, cône ; tube carré, cornière, U, poutre en I |
| Esquisse | esquisse contrainte et cotée, extrusion, révolution, trou, congés et chanfreins |
| Plans | Dessin technique (feuille A3/A4, vues, échelle, cotes, cartouche, export SVG), export HTML, vue éclatée du montage |
| Nomenclature | pièces, assemblages et liste de matériel, export CSV |
L'historique de SolidCraft (frise, marqueur, points de retour) est conservé. Toutes les fonctions sont aussi des commandes (palette de commandes, scripts).

## Modèles de meubles
Établi de camp, Banc court, Fauteuil carré, Banc à dossier, Banc à dossier (diagonales), Table à pieds en X, Table de prépa, Table de prépa avec étagère, Étagère, Vaisselier, Table à feu.

## Pas à pas
### Créer un meuble et son plan
1. Créer > **Nouveau meuble**, choisir le modèle : il est créé avec ses dimensions par défaut ; chaque perche est une pièce numérotée (par exemple `TABLE-PIED-80x720`).
2. Plans > **Dessin technique** : feuille A3/A4 avec vues cotées, cartouche ; exporter en SVG ou en HTML.
3. Nomenclature : liste des pièces et du matériel, export CSV pour la commande de perches.

### Préparer un coin de patrouille
1. Créer > **Coin de patrouille**, y ranger les meubles.
2. Le coin a sa vue d'ensemble ; chaque meuble garde son propre plan. Un plan par meuble, une vue d'ensemble par coin : les deux ne se fondent pas.

### Assembler des perches à la main
Créer > Traverse, puis Opérations > Assemblages : la boîte Assembler liste les types par groupe comme CathIA, explique ce que chaque assemblage bloque, propose d'inverser les pièces et d'ajouter une cheville au mi-bois.

## Fichiers
Projet au format de conception SolidCraft (`.sc`) ; exports SVG (plan), HTML, CSV (nomenclature). Un fichier rouvert plus tard se planifie de la même façon (tout est relu depuis les propriétés `scout_*` du design).

## Limites connues (feuille de route)
1. Pas encore de boîte « Nouveau meuble » pour saisir dimensions et diamètres : le ruban crée le meuble avec ses dimensions par défaut.
2. Tenons, mortaises, mi-bois et chevilles ne sont pas encore taillés dans la géométrie : les perches se touchent, et les assemblages sont décrits dans le plan et la liste de débit (tenon = un tiers du diamètre).
3. Pas encore de redimensionnement d'un meuble existant ni de plan PDF.
4. Pas encore d'import des projets CathIA. Pour un usage courant au camp, CathIA reste l'outil le plus complet.

## Questions auxquelles la fiche répond
- Quelle différence entre SoLeadWorks et CathIA ?
- Quels meubles de camp peut-on créer d'un clic ?
- Comment obtenir le plan et la liste de débit d'un meuble ?
- Comment organiser un coin de patrouille avec plusieurs meubles ?
- Peut-on changer les dimensions d'un meuble ?
