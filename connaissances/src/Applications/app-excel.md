---
id: app-excel
titre: GridCraft, tableur (tuile Excel)
theme: Applications
type: application
sources:
  - titre: GridCraft - README.md
    url: https://github.com/storytold/gridcraft
  - titre: ScoutHub - fiche CHATGDB.md et apps.txt
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
mots_cles: GridCraft, Excel, tableur, xlsx, csv, formules, budget de camp, liste, inscriptions, graphique, tableau croisé dynamique, tri, filtre
liens: app-word, app-powerpoint, applications-panorama
resume: GridCraft est le tableur libre présenté dans ScoutHub sous la tuile Excel. La fiche explique comment l'ouvrir, ouvrir et enregistrer un classeur .xlsx ou .csv, ses fonctions (formules, tableaux, graphiques, filtres, mise en forme conditionnelle), les touches d'accès du ruban et ses limites, avec l'exemple d'un budget de camp.
---

## À quoi sert GridCraft
Tableur libre et gratuit (MIT/Apache, équipe ArtCraft / storytold), au fonctionnement familier d'Excel : ruban, barre de formule, zone Nom, onglets de feuilles, poignée de recopie. Format natif **XLSX**. Usages scouts : budget de camp, intendance (menus, quantités, courses), liste des inscrits et cotisations, planning des services, inventaire du matériel de troupe.

## Ouvrir GridCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/Excel/ (tuile « Excel », rubrique Bureautique). Ce n'est pas Microsoft Excel.
- Sans compte. **Ouvrir** utilise le sélecteur de fichiers du navigateur (on peut aussi déposer un fichier sur la page) ; **Enregistrer** télécharge le classeur.

## Fonctions principales
- Saisie de formules en mode pointage avec références colorées ; plus de 500 fonctions, plus LET, LAMBDA, MAP, REDUCE…, tableaux dynamiques et débordement.
- Format de cellule (langage de formats numériques complet), collage spécial, mise en forme conditionnelle, validation des données, commentaires, liens.
- Tableaux structurés, tri et filtre automatique, remplissage instantané (Flash Fill), plan et sous-totaux.
- Graphiques, images (y compris dans les cellules), graphiques sparkline, tableaux croisés dynamiques, réglages d'impression.

## Pas à pas : un budget de camp
1. Ouvrir la tuile Excel, nouveau classeur.
2. Colonnes : Poste, Quantité, Prix unitaire, Total ; dans Total taper `=` puis cliquer Quantité, `*`, cliquer Prix unitaire, Entrée ; tirer la poignée de recopie vers le bas.
3. En bas, `=SOMME(...)` (ou `SUM` selon la langue de l'interface) pour le total.
4. Mettre en forme les montants (Format de cellule, monétaire), ajouter un graphique si besoin.
5. Enregistrer : le fichier .xlsx est téléchargé. Pour un publipostage dans WordCraft, enregistrer aussi en CSV.

## Formats
- **XLSX** natif (styles, thèmes, formules, tableaux, mises en forme conditionnelles, validation, commentaires, graphiques, images, sparklines, tableaux croisés, impression).
- **CSV** et **TSV**.
- **.xls** (97-2003) : ouvert avec valeurs, formules et formats de nombres (pas encore la mise en forme ni les objets).
- **XLSB** et **ODS** : import des données (valeurs enregistrées au lieu des formules).

## Raccourcis : touches d'accès du ruban
Appuyer et relâcher Alt gauche (Windows/Linux) ou F10, puis taper la séquence :
- `H A L` / `H A C` / `H A R` : aligner à gauche / centrer / à droite ;
- `H V S` (ou `E S`) : collage spécial ; dans cette boîte, T/V/F/C = formats/valeurs/formules/commentaires, E = transposer, Entrée applique, Échap annule ;
- `H O I` (ou `O C A`) : ajuster la largeur des colonnes.
Le navigateur peut réserver Alt/F10 pour ses propres menus.

## Limites
- Alpha : environ 50 % prêt pour un usage réel ; fidélité XLSX sur des fichiers réels, très gros classeurs et graphiques encore perfectibles.
- Les touches d'accès ne couvrent que quelques commandes de l'onglet Accueil.

## Ce que ChatGDB fait dans Excel
- ChatGDB ouvre Excel dans son volet et y travaille réellement, avec une souris visible : il voit l'écran (captures avec repères), clique sur les onglets, menus et cellules, tape au clavier (Tab passe à la cellule de droite, Entrée à la ligne suivante).
- Pour les données, il crée directement le **classeur** (feuilles, lignes, formules comme =SUM(B2:B9), largeurs de colonnes) : Excel l'ouvre et calcule les formules. Il peut ensuite **relire le contenu exact** de toutes les cellules.
- Il passe ensuite par l'interface pour les graphiques, le tableau croisé dynamique (onglet Insert, PivotTable) et la mise en forme, en vérifiant chaque étape par une capture.
- Quand ChatGDB a ouvert Excel, « Enregistrer » télécharge toujours le fichier .xlsx comme d'habitude.

## Questions auxquelles la fiche répond
- ChatGDB peut-il remplir un tableur Excel et faire un tableau croisé ?
- Est-ce le vrai Excel ? Puis-je ouvrir un .xlsx ou un .csv ?
- Comment enregistrer mon classeur ?
- Comment faire un budget de camp avec des totaux automatiques ?
- Peut-on faire des graphiques et des tableaux croisés dynamiques ?
- Comment ouvrir un ancien fichier .xls ou un .ods ?
