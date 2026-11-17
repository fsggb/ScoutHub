---
id: app-draw
titre: Excalidraw, dessin libre et tableau blanc
theme: Applications
type: application
sources:
  - titre: Excalidraw - README.md
    url: https://github.com/excalidraw/excalidraw
  - titre: Excalidraw - packages/excalidraw/components/HelpDialog.tsx (raccourcis)
    url: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/HelpDialog.tsx
  - titre: ScoutHub - apps.txt et config.js
    url: https://github.com/fsggb/ScoutHub/blob/main/apps.txt
mots_cles: Excalidraw, Draw, dessin, tableau blanc, schéma, croquis, main levée, plan de jeu, organigramme, flèche, PNG, SVG, .excalidraw
liens: app-illustrator, app-figma, app-cadcraft, app-scoutmap, applications-panorama
resume: Excalidraw est un tableau blanc virtuel au style dessiné à la main, servi dans ScoutHub dans le dossier Draw. La fiche explique comment l'ouvrir, dessiner formes, flèches et textes, exporter en PNG, SVG ou fichier .excalidraw, les raccourcis clavier et les limites.
---

## À quoi sert Excalidraw
Tableau blanc libre et open source au rendu « dessiné à la main », sur un canevas infini. Usages scouts : schéma rapide d'un grand jeu ou d'un terrain, organigramme de la maîtrise, plan d'une veillée, explication d'un nœud ou d'une construction en croquis, carte mentale de réunion de patrouille.

## Ouvrir Excalidraw
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/Draw/ (tuile « Excalidraw », rubrique Création, « Dessin libre et tableaux blancs »). Compilé depuis le dernier commit d'Excalidraw.
- Sans compte ; le dessin est sauvegardé automatiquement dans le navigateur ; fonctionne hors ligne une fois chargé.

## Interface
Barre d'outils en haut (main, sélection, rectangle, losange, ellipse, flèche, ligne, dessin libre, texte, image, gomme…), propriétés de l'élément sélectionné à gauche (trait, fond, épaisseur, style, opacité), menu principal (ouvrir, enregistrer, exporter, thème sombre, langue), zoom et annuler en bas.

## Pas à pas : schéma d'un grand jeu
1. Ouvrir la tuile Excalidraw.
2. Dessiner les zones avec le rectangle (R) ou l'ellipse (O), donner une couleur de fond.
3. Ajouter les camps et repères avec du texte (T) ; relier par des flèches (A), qui restent attachées aux formes.
4. Grouper (Ctrl+G), aligner, dupliquer (Ctrl+D) au besoin.
5. Menu > Enregistrer sous fichier `.excalidraw` pour le reprendre ; Exporter l'image en PNG ou SVG pour l'imprimer ou l'envoyer.

## Formats
- `.excalidraw` (JSON ouvert) pour enregistrer et rouvrir.
- Export PNG, SVG, presse-papiers ; images insérables.
- Bibliothèques de formes.

## Raccourcis
Outils : H main, V ou 1 sélection, R ou 2 rectangle, D ou 3 losange, O ou 4 ellipse, A ou 5 flèche, L ou 6 ligne, P ou 7 dessin libre, T ou 8 texte, 9 image, E ou 0 gomme, F cadre, K pointeur laser, Q verrouiller l'outil.
Affichage : Ctrl++ / Ctrl+- zoom, Ctrl+0 zoom 100 %, Maj+1 tout afficher, Maj+2 zoom sur la sélection, Alt+Z mode zen, Ctrl+' grille, Alt+R mode lecture, Alt+Maj+D thème sombre.
Édition : Ctrl+Z / Ctrl+Y annuler / rétablir, Ctrl+D dupliquer, Ctrl+G grouper, Ctrl+C / Ctrl+V copier / coller, Maj+Alt+C copier en PNG, Suppr supprimer, Ctrl+Maj+L verrouiller l'élément, Ctrl+K lien, Entrée modifier le texte, Échap terminer.

## Limites
- Les fonctions du site excalidraw.com (collaboration en direct chiffrée, liens de partage en lecture) dépendent des serveurs d'Excalidraw : à considérer comme non garanties dans la version servie par ScoutHub.
- Le dessin gardé dans le navigateur peut être perdu si l'on efface les données du site : enregistrer un fichier `.excalidraw`.

## Questions auxquelles la fiche répond
- Avec quoi faire un schéma rapide de grand jeu ?
- Comment enregistrer mon dessin et le retrouver plus tard ?
- Comment exporter en image PNG ou SVG ?
- Quels sont les raccourcis clavier d'Excalidraw ?
