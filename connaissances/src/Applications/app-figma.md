---
id: app-figma
titre: FigCraft, maquettes d'interfaces et prototypes (tuile Figma)
theme: Applications
type: application
sources:
  - titre: FigCraft - README.md
    url: https://github.com/storytold/figcraft
  - titre: ScoutHub - fiche CHATGDB.md et config.js
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
mots_cles: FigCraft, Figma, maquette, interface, prototype, frame, auto layout, composant, variables, design, site web, application, collaboration, partage
liens: app-illustrator, app-indesign, app-draw, applications-panorama
resume: FigCraft est l'outil libre de design d'interfaces et de prototypage présenté dans ScoutHub sous la tuile Figma. La fiche décrit ses fonctions (frames, auto layout, composants, variables, réseaux vectoriels, prototypes), les formats .figcraft, SVG, PNG et PDF, le partage en direct et ses précautions.
---

## À quoi sert FigCraft
Logiciel libre (MIT/Apache, équipe ArtCraft / storytold) de conception d'interfaces au fonctionnement familier de Figma : barre d'outils, panneau Calques, panneau Design, menus et raccourcis habituels. Usages scouts : maquette du site du groupe ou d'une application, visuels pour réseaux sociaux en série (composants), carte d'invitation, prototype cliquable d'un jeu.

## Ouvrir FigCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/Figma/ (tuile « Figma », rubrique Création). Ce n'est pas Figma.
- Hors ligne, sans compte ; fichiers `.figcraft` sur l'ordinateur. Interface traduite (brouillon français) via Préférences.

## Fonctions principales
- **Auto layout** horizontal/vertical, retour à la ligne et grille, marges, espacements, dimensionnement Hug / Fill / Fixed ; contraintes et grilles de mise en page.
- **Composants** et instances avec remplacements, ensembles de variantes, propriétés ; panneau Ressources.
- **Styles et variables** (couleur, nombre, texte, booléen) avec modes.
- **Réseaux vectoriels** : plume, crayon, mode d'édition vectorielle, Concepteur de formes, opérations booléennes.
- Remplissages : couleurs, dégradés, images ; ombres, flous, bruit, texture, verre ; masques.
- **Texte** modifiable sur le canevas, styles de texte, OpenType, texte de droite à gauche.
- **Prototypes** : connexions, déclencheurs, actions, transitions animées, variables et conditions, mode présentation avec cadres d'appareils ; mesure (Alt), mode Inspect, annotations.
- Plugins WebAssembly en bac à sable.

## Pas à pas : maquette de la page d'accueil du site du groupe
1. Créer une frame au format ordinateur ou téléphone.
2. Construire l'en-tête en auto layout (logo, menu) ; en faire un composant.
3. Ajouter les blocs (photo, texte, bouton) ; définir des styles de couleur aux couleurs du groupe.
4. Relier le bouton à une autre frame (prototype) et lancer la présentation.
5. Enregistrer en `.figcraft` ; exporter les visuels en PNG, SVG ou PDF.

## Formats
`.figcraft` (archive sur le disque) ; SVG, PNG, JPG, WebP et PDF en import et export ; fichiers `.fig` ouverts au mieux ; JSON de l'API REST de Figma (avec prototypes et variables).

## Partage en direct (aperçu)
Partager > En ligne envoie le fichier à un serveur (par défaut le serveur public collab.craftapps.dev) ; on donne un code ou un lien : toute personne qui l'a peut ouvrir (ou modifier) le fichier. **Pas de chiffrement de bout en bout**, fichier gardé sur le serveur jusqu'à suppression ou 30 jours sans ouverture. Ne pas y mettre de données personnelles de jeunes. Partager > Réseau local fonctionne sans serveur, sur un réseau de confiance.

## Limites
- Jeune projet ; les fichiers .fig s'ouvrent « au mieux ».
- Le partage en ligne est un aperçu sans garantie ; garder sa propre copie.

## Questions auxquelles la fiche répond
- Avec quoi faire la maquette du site du groupe ?
- Est-ce le vrai Figma ? Puis-je ouvrir un fichier .fig ?
- Comment travailler à plusieurs sur le même fichier, et est-ce sûr ?
- Comment exporter mes visuels en PNG ou SVG ?
