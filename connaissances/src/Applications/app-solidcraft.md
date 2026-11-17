---
id: app-solidcraft
titre: SolidCraft, modélisation 3D paramétrique (tuile SolidWorks)
theme: Applications
type: application
sources:
  - titre: SolidCraft - README.md
    url: https://github.com/tangency-labs/solidcraft
  - titre: SolidCraft - docs/capabilities.md
    url: https://github.com/tangency-labs/solidcraft/blob/main/docs/capabilities.md
  - titre: SolidCraft - guide (getting-started, ui-tour, shortcuts, files, features, sketching)
    url: https://docs.solidcraft.io/
  - titre: SolidCraft - docs/browser-api.md
    url: https://github.com/tangency-labs/solidcraft/blob/main/docs/browser-api.md
mots_cles: SolidCraft, SolidWorks, ScoutCAD, CAO, 3D, paramétrique, esquisse, contrainte, cote, extrusion, révolution, congé, assemblage, STEP, STL, 3MF, impression 3D, timeline
liens: app-cadcraft, app-soleadworks, app-cathia, applications-panorama
resume: SolidCraft est un logiciel libre de CAO 3D paramétrique, présenté dans ScoutHub sous la tuile SolidWorks. La fiche explique son interface, le dessin d'une esquisse contrainte, les fonctions volumiques, les assemblages, l'enregistrement dans le navigateur, les formats STEP, STL ou 3MF, les raccourcis clavier et les paramètres d'adresse.
---

## À quoi sert SolidCraft
Application libre (MIT/Apache, Tangency Labs) de **CAO 3D paramétrique** écrite en Rust, comparable dans l'usage à SolidWorks ou Fusion : on dessine des esquisses contraintes, on les transforme en volumes, et changer une cote reconstruit le modèle. Pour des scouts : modéliser une pièce à imprimer en 3D (porte-foulard, insigne, crochet), une pièce mécanique d'un projet, un objet en vue de sa fabrication. Pour le froissartage, préférer CathIA ou SoLeadWorks.
Statut : « précoce mais utilisable pour des pièces simples ».

## Ouvrir SolidCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/SolidCraft/?lang=fr (tuile « SolidWorks », rubrique Conception et CAO). Compilé depuis le dernier commit du dépôt.
- Interface traduite en français (et 24 autres langues).

## Interface
- **Barre du haut** : menu Fichier (Nouveau, Ouvrir, Enregistrer, Enregistrer sous, Exporter…), annuler/rétablir, onglet Accueil (page de démarrage) et un onglet par design ouvert ; à droite, Signaler un bogue, Aide (?), Préférences (dont le thème).
- **Ruban** : sélecteur d'espace de travail (DESIGN) puis onglets MODEL, SURFACE, ASSEMBLE, INSERT, INSPECT, MANAGE, VIEW, SHEET METAL ; SKETCH apparaît pendant l'édition d'une esquisse. Les onglets se masquent ou se personnalisent (glisser des commandes).
- **Navigateur** (à gauche) : arbre du design (réglages et unités, vues nommées, origine, corps, esquisses, plans, articulations, composants), œil pour afficher/masquer, clic droit pour le menu.
- **Vue 3D** : clic = sélection (Maj/Ctrl ajoute), molette = zoom au curseur, bouton du milieu = déplacement, clic droit glissé = orbite (préréglages souris SolidWorks, Inventor, Blender, Tinkercad… dans Préférences). Appui long ou clic droit > « Select Other… » pour choisir un objet caché sous un autre.
- **Timeline** des fonctions : chaque fonction se modifie (double-clic), se supprime, se renomme, se réordonne.

## Fonctions principales
- **Esquisses** sur plans d'origine, plans décalés ou faces planes : lignes, rectangles, cercles, arcs, polygones, oblongs, ellipses, splines, texte ; géométrie de construction, projection, ajustement, congés.
- **Contraintes et cotes** : coïncidence, horizontal/vertical, parallèle, perpendiculaire, tangent, égal, concentrique, symétrie, fixe ; cotes linéaires, rayon, diamètre, angle pilotées par des paramètres. Une géométrie entièrement contrainte devient noire.
- **Fonctions** : extrusion, révolution, balayage, lissage, congé, chanfrein, coque, dépouille, perçages, filetages, répétitions, symétrie, découpe et combinaison de corps.
- **Paramètres et configurations** avec expressions et unités (`2 * width + 5 mm`).
- **Assemblages** : composants, articulations, études de mouvement, interférences, propriétés de masse.
- **Tôlerie** (plis, déplié) et fonctions pour boîtiers plastiques.
- **Mesure** (touche I), mesure rapide optionnelle.

## Pas à pas : une première pièce
1. Ctrl+N (nouveau design).
2. **Create Sketch** puis cliquer le plan XY (Top).
3. `R` : rectangle deux points ; cliquer deux coins.
4. `D` (cote) : cliquer un côté, taper la valeur, Entrée ; recommencer pour l'autre côté.
5. **Finish Sketch**, puis `E` (Extrude) : saisir la hauteur, valider.
6. `F` (Fillet) : cliquer des arêtes, saisir le rayon.
7. Modifier une cote plus tard : double-clic sur la fonction dans la timeline ou sur l'esquisse ; le modèle se reconstruit.
8. Enregistrer (Ctrl+S) ; exporter en STL ou 3MF pour l'impression 3D.

## Fichiers
- **Format natif** : `.sc` (les `.solidcraft` des anciennes versions s'ouvrent encore) ; JSON aussi en ouverture, Save As et export.
- **Export** : STEP (AP242, avec noms, couleurs et assemblages), IGES 5.3, 3MF, STL (binaire/ASCII), OBJ, URDF (assemblages articulés), DXF de la vue courante.
- **Import** : STEP/STP, IGES/IGS (comme corps de base), 3MF, STL, OBJ, glTF/GLB (comme maillages, qui s'affichent, se mesurent et s'exportent mais ne prennent pas de fonctions volumiques).
- **Enregistrer dans le navigateur** : dans Chrome, Edge et Opera, Enregistrer sous ouvre la boîte d'enregistrement et écrit le `.sc` dans le dossier choisi ; Enregistrer réécrit ensuite le même fichier. Dans Firefox et Safari, Enregistrer garde les designs dans le stockage privé du navigateur (effacer les données du site peut les supprimer). **Fichier > Download design** télécharge une copie dans tout navigateur ; **Fichier > Files in this browser…** liste les designs gardés. Taille maximale dans le navigateur : 512 Mo.
- Fichier > Install app… installe SolidCraft comme application (hors ligne).

## Raccourcis clavier (par défaut, modifiables dans Fichier > Keyboard Shortcuts)
| Touche | Commande | Touche | Commande |
|---|---|---|---|
| L | Ligne | E | Extrusion |
| R | Rectangle deux points | Q | Press Pull |
| C | Cercle centre-diamètre | F | Congé |
| D | Cote d'esquisse | H | Perçage |
| X | Construction | M | Déplacer/copier |
| O | Décalage | J | Articulation |
| T | Ajuster | I | Mesure |
| P | Projeter | A | Apparence |
Ctrl+Z / Ctrl+Y annuler / rétablir ; Ctrl+N nouveau ; Ctrl+O ouvrir ; Ctrl+S enregistrer ; Ctrl+Maj+S enregistrer sous ; Suppr supprimer. Vues : Ctrl+1 avant, Ctrl+2 arrière, Ctrl+3 gauche, Ctrl+4 droite, Ctrl+5 dessus, Ctrl+6 dessous, Ctrl+7 isométrique, Ctrl+8 normal à la sélection. S recherche de commande ; V afficher/masquer ; F2 renommer ; F6 ajuster la vue ; flèches = tourner la vue de 15° ; Échap annule la commande ou la sélection.

## Liens d'action (paramètres d'adresse documentés)
- `?sample` : ouvre la pièce d'exemple.
- `?webgl` : force WebGL2 si WebGPU manque ou se comporte mal (`?webgpu` pour revenir).
- `?open=<URL HTTPS encodée>` : ouvre un design `.sc` hébergé, comme copie non enregistrée (le serveur doit autoriser CORS).
- `?embed` (avec `open`) : vue intégrée sans ruban ni menus.
Exemple : `https://fsggb.github.io/ScoutHub/SolidCraft/?lang=fr&sample`.
Dans la console du navigateur, `window.solidcraft` (`execute`, `request`, `commands`, `inspect`) pilote le design ouvert.

## Limites
- Logiciel jeune : pièces simples fiables, cas complexes encore incomplets ; garder des copies.
- Les maillages importés (STL, OBJ…) ne reçoivent pas de fonctions volumiques (conversion possible pour des pièces simples).
- Navigation 3D et WebGPU selon le navigateur ; souris 3D lue par la Gamepad API (pas dans Firefox).
- Certains noms de commandes restent en anglais.

## Questions auxquelles la fiche répond
- La tuile « SolidWorks » est-elle le vrai SolidWorks ?
- Comment dessiner une pièce simple et la coter ?
- Comment exporter en STL ou 3MF pour une imprimante 3D ?
- Où est enregistré mon design dans le navigateur ? Comment en garder une copie ?
- Quels sont les raccourcis clavier ?
- Peut-on ouvrir un fichier STEP ?
