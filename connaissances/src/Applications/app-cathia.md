---
id: app-cathia
titre: CathIA, conception 3D pour le froissartage
theme: Applications
type: application
sources:
  - titre: CathIA - fiche CHATGDB.md et README.md
    url: https://github.com/fsggb/CathIA
  - titre: CathIA - src/app.js (ruban, aide intégrée)
    url: https://github.com/fsggb/CathIA/blob/main/src/app.js
  - titre: CathIA - tuto-video-stabilite.md
    url: https://github.com/fsggb/CathIA/blob/main/tuto-video-stabilite.md
mots_cles: CathIA, froissartage, 3D, perche, traverse, tenon, mortaise, mi-bois, queue d'aronde, cheville, brêlage, claies, filet, plateau, stabilité, mise en plan, nomenclature, liste de matériel, meuble de camp, établi, table
liens: app-soleadworks, app-scouthub, applications-panorama, app-solidcraft
resume: CathIA est l'application web de conception 3D de la FSGGB pour le froissartage, les constructions de camp en bois rond. La fiche explique son ruban, comment créer des traverses, les façonner, les assembler (tenon, mi-bois, queue d'aronde, chevilles, brêlage), vérifier la stabilité, partir d'un modèle, faire la mise en plan cotée et la liste de matériel, et où sont enregistrés les projets.
---

## À quoi sert CathIA
CathIA (rubrique « Conception et CAO » de ScoutHub, tuile mise en avant) sert à concevoir en 3D les **constructions de froissartage** : tables, bancs, établis, fauteuils, étagères, vaisseliers, tables à feu… en bois rond (perches). Pour une patrouille : dessiner le meuble avant le camp, vérifier qu'il tient, sortir le plan coté et la **liste de matériel** (perches, longueurs, diamètres), puis suivre le montage pas à pas.

## Ouvrir CathIA
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/CathIA/ (version GitHub Pages, recommandée ; aussi https://fsggb.github.io/CathIA/). Une version Google Apps Script existe en parallèle.
- Utilisable sans compte ; l'enregistrement dans Google Drive demande la connexion Google.

## Interface
- **Onglets du ruban** : Fichier, Créer, Façonner et assembler (Opérations), Mise en plan, Nomenclature ; en **mode expert** s'ajoutent Édition, Formes et Esquisse (bouton « Passer en mode expert / simple » en haut à droite).
- À droite des onglets : Annuler, Rétablir, Paramètres (roue), mode expert, Assistant IA, Historique (revenir à une étape), Aide.
- **Panneau latéral** à gauche (liste des pièces, groupes, réglages de la pièce sélectionnée) et **vue 3D** ; les dimensions se règlent à gauche ou en cliquant sur les cotes orange.
- Un bouton indisponible explique pourquoi (par exemple « Sélectionnez d'abord une seule pièce de bois »).
- Unités : **centimètres** (millimètres au choix dans Paramètres).

Contenu des onglets :
- **Fichier** : Accueil, Nouveau, Ouvrir, Enregistrer, Fichier .json ; Exporter : PDF du plan, PDF vue 3D, PNG vue 3D, PNG du plan, SVG du plan, Matériel CSV, Imprimer le plan ; Paramètres, mode expert, Aide.
- **Créer** : Traverse, Modèles de référence, Modèles partagés ; Équerre (renfort) ; Plateau, claies, filet ; PH (cordes, décoratif).
- **Façonner et assembler** : Façonner (Fendre en planches, Quart de bois, Couper, Pointe) ; Assemblages (Tenon, Mi-bois, Queue d'aronde, Chevilles, Brêlage « dernier recours ») ; Contrôle (Stabilité) ; Booléens en mode expert (Union, A − B, Intersection).
- **Mise en plan** : Nouvelle page, Supprimer la page, Imprimer ; Ajouter une projection…, Disposition auto, Feuille Installation + détails, Vue de détail, Capture 3D, Image, Nomenclature, Texte ; Cotation (horizontale, verticale, alignée, angle, diamètre) ; Paramètres de feuille, Traits cachés, Axes.
- **Expert** : Formes (bloc, cylindre, tube rond, tube carré, cornière, sphère, cône…), Esquisse (polyligne, rectangle, cercle, contraintes, extrusion, révolution, congé, chanfrein).

## Pas à pas
### Construire un assemblage simple
1. Créer > **Traverse** (bois rond, à l'aplomb au départ) ; régler diamètre et longueur à gauche ou sur les cotes orange.
2. Déplacer avec les flèches droites, tourner avec les petites flèches courbes ; CathIA affiche l'inclinaison par rapport à la verticale et au sol.
3. Ajouter une seconde traverse, sélectionner les deux pièces, Façonner et assembler > **Mi-bois** (ou Tenon, Queue d'aronde…). Une fenêtre s'ouvre avec un aperçu 3D en direct et un schéma ; le texte en bas rappelle ce que bloque l'assemblage. Valider avec **Créer**.
4. Une pièce peut cumuler plusieurs assemblages ; chaque opération se modifie (✎) ou se supprime sans toucher aux autres. Les pièces assemblées se déplacent ensemble (Édition > Désolidariser pour les séparer).
5. Allonger une pièce après coup : les assemblages qui la touchent sont recalculés.

### Vérifier la stabilité
Façonner et assembler > Contrôle > **Stabilité** : CathIA calcule les degrés de liberté de toute la structure (« 1 mobilité restante », la pièce mobile est sélectionnée, ou « rigide »). Ce que bloque chaque assemblage :
| Assemblage | Degrés bloqués | Reste libre |
|---|---|---|
| Tenon rond | 4 | rotation autour du tenon, retrait |
| Tenon plat | 5 | retrait du tenon |
| Queue d'aronde | 5 | glissement dans l'entaille |
| Mi-bois | 5 | décollement des pièces (choisir « chevillé ») |
| Mi-bois chevillé | 6 | rien |
| Cheville | 5 | rotation autour de la cheville |
| Brêlage | 5 | rotation d'une perche sur l'autre (d'où le triangle) |
Ajouter une cheville bloque la rotation d'un tenon rond.

### Partir d'un modèle
Créer > **Modèles de référence** (bibliothèque : établi, banc, fauteuil, table… avec dimensions réglables) ou **Modèles partagés**.

### Plateau, claies, filet
Sélectionner deux supports parallèles (deux traverses), puis Créer > Plateau, claies, filet. Fendre / Quart de bois permettent de poser un plateau ; Répétition (linéaire ou circulaire), Clayonnage automatique et contrôle des Collisions existent aussi.

### Plan et liste de matériel
Onglet **Mise en plan** : pages multiples, projections, disposition automatique, feuille d'installation avec détails, cotes, nomenclature déplaçable, cartouche modifiable en cliquant le texte, impression. Onglet **Nomenclature** : liste des pièces et des opérations, export CSV.

## Assistant (ChatGDB)
- Bouton **Assistant** en haut à droite. Pour une personne **connectée à ScoutHub**, l'assistant est **ChatGDB**, sans clé à fournir, dans la limite de ses crédits ChatGDB ; la réponse s'affiche au fil de l'eau.
- Il connaît la base de connaissances de la fédération (froissartage, nœuds, outils…) et agit sur le projet ouvert : lister les pièces, ajouter une traverse, une courbe, une série, clayonner, assembler, modifier ou supprimer une pièce.
- **IA et clé** : on peut aussi choisir sa propre IA (Gemini, Claude, ChatGPT, Grok, Mistral) avec sa clé personnelle, gardée dans le navigateur. Elle sert de **secours** quand ChatGDB n'est pas disponible (crédits épuisés, réseau) ; sans connexion à ScoutHub, c'est elle qui répond.

## Fichiers et enregistrement
- **Enregistrer** : projet dans le Google Drive de l'utilisateur (dossier CathIA, fichier `nom.cathia` : modèle 3D en .html lisible dans tout navigateur, plan en .svg et vignette), privé, accès limité aux fichiers créés par CathIA.
- **Fichier .json** : sauvegarde du projet sur l'ordinateur ; Ouvrir pour le recharger.
- Exports : PDF (plan, vue 3D), PNG, SVG du plan, CSV du matériel, impression.

## Raccourcis
`Ctrl+Z` annuler, `Ctrl+Y` rétablir, `Ctrl+D` dupliquer, `Suppr` supprimer, `Ctrl+S` enregistrer, `F2` renommer, `Échap` annuler l'action ; `Ctrl+G` grouper, `Ctrl+Maj+G` dégrouper. Double-clic dans la liste : renommer ; dans la 3D : ouvrir l'assemblage.

## Règles de froissartage rappelées par CathIA
Règle du tiers : une mortaise ne dépasse pas le tiers du diamètre de la pièce. Le brêlage est un dernier recours (seul, il laisse tourner ; en triangle, il tient). Paramètres règle l'aimant, le jeu des mortaises, les liaisons.

## Limites
- Les modèles de référence couvrent les meubles courants ; le reste se construit pièce par pièce.
- L'enregistrement Drive demande un compte Google et un consentement d'accès.

## Questions auxquelles la fiche répond
- Comment dessiner une table de camp en froissartage ?
- Comment faire un tenon, un mi-bois ou un brêlage entre deux perches ?
- Comment savoir si mon meuble tient (stabilité) ?
- Comment obtenir le plan coté et la liste des perches à couper ?
- Où sont enregistrés mes projets CathIA ?
- Quelle différence entre CathIA et SoLeadWorks ?
