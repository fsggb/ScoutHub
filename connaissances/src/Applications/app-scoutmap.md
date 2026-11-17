---
id: app-scoutmap
titre: ScoutMap, cartes IGN pour l'orientation et les raids
theme: Applications
type: application
sources:
  - titre: ScoutMap - fiche CHATGDB.md
    url: https://github.com/fsggb/ScoutMap/blob/main/CHATGDB.md
  - titre: ScoutMap - README.md
    url: https://github.com/fsggb/ScoutMap/blob/main/README.md
mots_cles: ScoutMap, carte, IGN, Géoplateforme, itinéraire, raid, randonnée, azimut, course d'orientation, GPX, feuille de route, profil d'altitude, dénivelé, grand jeu, impression, Lambert-93, UTM, déclinaison
liens: app-scouthub, app-chatgdb, applications-panorama
resume: ScoutMap affiche les cartes IGN sans compte ni clé pour préparer sorties, raids, courses d'orientation et grands jeux. La fiche décrit l'interface, la création d'un itinéraire à pied, les azimuts, les mesures, le grand jeu, l'impression de feuilles de route et de cartes à l'échelle sur plusieurs feuilles, l'import et l'export GPX, les raccourcis et les liens d'action utilisables par ChatGDB.
---

## À quoi sert ScoutMap
Application web de cartes IGN (Géoplateforme) pour les scouts, listée « Cartes IGN » dans ScoutHub (rubrique Cartographie). Usages scouts typiques :
- préparer une **sortie ou un raid** : itinéraire à pied, distance, durée, dénivelé, feuille de route imprimée pour chaque patrouille ;
- préparer une **course d'orientation** : azimuts successifs, contre-azimuts, distances ;
- dessiner une **carte de grand jeu** : zones, flèches, croix, textes, imprimée à l'échelle ;
- mesurer une distance ou une surface (terrain de camp), regarder le relief, le cadastre, les sentiers balisés.

## Ouvrir ScoutMap
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/ScoutMap/ (aussi publié seul sur https://fsggb.github.io/ScoutMap/).
- Aucun compte ni clé. Le travail est mémorisé dans le navigateur. Fonctionne sur téléphone (mode tactile).

## Interface
- **Écran d'accueil** (bouton Accueil, touche `H`, ou clic sur le logo) : quatre types de travail, **Itinéraire à pied**, **Azimuts**, **Mesures**, **Grand jeu**. Chaque type a ses outils et ses calques ; le travail de chaque type est conservé.
- **Barre de menus** : Fichier (nouveau, import/export GPX, export PDF, impression multi-feuilles, vidéo), Édition (annuler, inverser, effacer), Créer (itinéraire, boucle, azimuts, mesures, simulation du parcours), Affichage (panneau, profil, calques, échelle), Aide (raccourcis).
- **Rail d'outils + panneau latéral** repliable : Explorer, Itinéraire, Azimuts, Mesure, Calques.
- **Recherche** de lieux, adresses, sommets ou coordonnées (« 48.40, 2.70 »).
- Bouton **Fonds et informations** (en bas à gauche) à onglets : *Fond de carte* (Plan IGN, Photographies aériennes, État-major 1820-1866, OpenTopoMap, OpenStreetMap, OSM France, CyclOSM), *Informations* combinables (courbes de niveau, ombrage, relief LiDAR HD, pentes, cadastre, sentiers balisés GR), *Netteté* (Auto, Standard, Détaillée, Très détaillée). Il indique aussi la date de mise à jour des données IGN (en rouge au-delà de 13 mois).
- **Calques** : chaque itinéraire, tracé d'azimuts, mesure ou trace GPX est un calque (afficher/masquer, renommer par double-clic, inverser, centrer, modifier, supprimer).
- **Échelle** affichée en permanence, échelles prédéfinies 1 : 25 000 et 1 : 50 000 ; coordonnées au curseur en WGS 84, Lambert-93, UTM.
- **Profil d'altitude** repliable avec pente au survol. Menus contextuels (clic droit) sur points, tracé, carte, profil et calques.

## Pas à pas
### Préparer un itinéraire à pied (aller simple ou boucle)
1. Accueil > **Itinéraire à pied** (par défaut, une boucle à pied « le plus rapide »).
2. Cliquer sur la carte pour poser le départ, puis les étapes ; cliquer sur le point de départ A ferme la boucle. Pas de limite d'étapes ; une étape posée près du tracé s'insère au bon endroit.
3. Glisser un point pour le déplacer, clic sur le tracé pour ajouter une étape, `Suppr` pour retirer le point sélectionné. Les étapes prennent le nom du village voisin (modifiable).
4. Régler dans le panneau : plus rapide / plus court, allure de marche (5 km/h par défaut), distance maximale facultative (tout passe en rouge si elle est dépassée, sans bloquer), éviter les autoroutes, « Ordre de passage libre » (réordonne pour la boucle la plus courte), « Éviter de repasser par le même chemin ».
5. Lire distance, durée IGN, estimation de marche et dénivelé ; regarder le profil d'altitude.
6. Fichier > Exporter en PDF (`Ctrl+P`) pour la feuille de route, ou `Ctrl+S` pour le GPX.

### Imprimer une feuille de route
Fichier > Exporter en PDF : aperçu dont **tous les textes sont modifiables**. Choix : feuille de route simplifiée (distance, dénivelé positif, étapes) ou détaillée (durées, dénivelés, altitudes, consignes, avertissements), colonne vide « Date et heure d'arrivée », calques à imprimer, carte à l'échelle (imprimer à 100 %), vue d'ensemble, profil, tableau d'azimuts, cadre de notes, A4/A3, portrait/paysage. Pour un fichier PDF, choisir « Enregistrer au format PDF » comme imprimante.

### Imprimer la carte du parcours sur plusieurs feuilles
Fichier > Imprimer la carte du parcours… : le tracé est découpé en feuilles A4 ou A3, avec le moins de feuilles possible (seules celles traversées par le tracé), échelle 1 : 10 000, 1 : 25 000 ou 1 : 50 000, chevauchement réglable (10 mm par défaut), feuilles numérotées F1, F2… dans l'ordre du parcours avec renvois vers les voisines, planche d'assemblage en première page. Le nombre de feuilles est annoncé en direct. Option « Mélanger » portrait/paysage (Chrome/Edge). Toujours sur fond Plan IGN.

### Préparer une course d'orientation (azimuts)
Accueil > **Azimuts** : poser les points ; pour chaque segment s'affichent azimut, contre-azimut, distance et cumul, en degrés, grades ou millièmes, nord géographique ou magnétique (déclinaison à saisir à la main, lue dans la marge de la carte IGN). Clic sur le point 1 pour fermer le circuit ; on peut placer une étape par azimut et distance.

### Mesurer
Accueil > **Mesures** : distance ou surface.

### Carte de grand jeu
Accueil > **Grand jeu** : zone (polygone), rectangle, cercle, ligne, flèche, croix, zone de texte ; couleur, transparence 0 à 100 %, contour, pointillés ; poignées pour éditer, duplication, premier plan / arrière-plan, plusieurs calques ; impression à l'échelle (PDF).

### Simulation et vidéo
Créer > Simulation du parcours… : un curseur parcourt le tracé en suivant le relief (durée 3 à 10 s), avec altitude, pente et temps de marche en direct. *Exporter en vidéo…* enregistre la simulation (WebM ou MP4 selon le navigateur), sans envoi.

## Fichiers
- **GPX** : import (bouton, `Ctrl+O` ou glisser-déposer sur la carte) et export (`Ctrl+S`) des itinéraires, azimuts, mesures et traces. Le nom du projet sert de nom de fichier.
- **PDF** par l'impression du navigateur ; **vidéo** WebM/MP4.

## Raccourcis
`H` accueil ; `Ctrl+Z` / `Ctrl+Y` annuler / rétablir ; `Ctrl+O` importer GPX ; `Ctrl+S` exporter GPX ; `Ctrl+P` export PDF ; `Suppr` ou `⌫` retirer le point ou l'élément sélectionné ; `Échap` revenir au déplacement de la carte. Sur téléphone : appui long = menu contextuel, bouton « Terminer » pour finir une zone, bouton « Ma position ».

## Liens d'action (ChatGDB peut préparer la carte)
Base : `https://fsggb.github.io/ScoutHub/ScoutMap/` (ou `https://fsggb.github.io/ScoutMap/`) suivi de paramètres, tous optionnels, encodés pour une URL (espace = %20) :
- `lieu=Lyon` : cherche le lieu et centre la carte ; `zoom=14` (2 à 19).
- `centre=45.76,4.83` : centre sur des coordonnées (latitude,longitude).
- `fond=plan|ortho|otm|osm|osmfr|cyclosm|etat`.
- `couches=contour,shade,slope,cadastre,hiking,lidar` (courbes, ombrage, pentes, cadastre, sentiers, relief LiDAR).
- `itineraire=Lyon|Villeurbanne|45.7,4.9` : itinéraire de 2 à 12 étapes séparées par `|` ; `boucle=1` revient au départ ; `titre=Sortie%20du%20samedi` nomme le projet.
Exemple : `https://fsggb.github.io/ScoutMap/?itineraire=Annecy|Talloires|Menthon-Saint-Bernard&boucle=1&titre=Sortie%20du%20lac&fond=plan`. Expérimental : si un lieu est introuvable, la carte l'indique et l'utilisateur corrige à la main.

## Limites connues
- Pas de **SCAN 25** (carte IGN papier au 1 : 25 000, licence ou clé requise) : le Plan IGN le remplace, net à l'impression.
- Itinéraires à pied (ou voiture) seulement, pas de vélo/VTT ; les routes nationales sont seulement signalées, pas exclues.
- Déclinaison magnétique à saisir à la main ; convergence des méridiens ignorée.
- Dénivelé estimé (échantillons d'environ 40 m, lissés).
- Fonds OpenStreetMap : consultation interactive seulement (pas de hors-ligne).
- Échelle à l'écran calibrée pour 96 ppp ; seule l'impression à 100 % est exacte.

## Questions auxquelles la fiche répond
- Comment préparer et imprimer un itinéraire de raid avec feuille de route ?
- Comment calculer des azimuts pour une course d'orientation, en degrés ou en millièmes ?
- Comment imprimer une carte à l'échelle 1 : 25 000 sur plusieurs feuilles A4 ?
- Comment importer ou exporter un fichier GPX ?
- Pourquoi n'y a-t-il pas la carte SCAN 25 ?
- Comment dessiner une carte de grand jeu ?
- Quels paramètres d'adresse permettent d'ouvrir une carte déjà préparée ?
