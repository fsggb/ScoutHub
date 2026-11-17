---
id: applications-panorama
titre: Panorama des applications de ScoutHub
theme: Applications
type: application
sources:
  - titre: ScoutHub - apps.txt et config.js
    url: https://github.com/fsggb/ScoutHub/blob/main/apps.txt
  - titre: ScoutHub - fiche CHATGDB.md
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
mots_cles: applications, ScoutHub, quelle application, outil, bureautique, création, CAO, cartographie, panorama, liste, choisir
liens: app-scouthub, app-chatgdb, app-scoutbibliotheque, app-scoutmap, app-cathia, app-soleadworks, app-solidcraft, app-cadcraft, app-word, app-excel, app-powerpoint, app-pdf, app-photoshop, app-illustrator, app-indesign, app-lightroom, app-figma, app-draw, app-premiere, app-aftereffects, app-protools, app-substancepainter
resume: Liste de toutes les applications de ScoutHub avec une ligne par application, leur adresse et le tableau des tâches scoutes courantes indiquant quelle application utiliser. Point d'entrée pour choisir le bon outil avant de lire la fiche détaillée.
---

## Principes communs
- Toutes les applications s'ouvrent depuis https://fsggb.github.io/ScoutHub/ , **sans compte** (sauf ChatGDB, Bibliothèque et Aide, qui demandent la connexion ScoutHub).
- Les tuiles portent le nom des logiciels connus (Word, Photoshop…), mais ce sont des **équivalents libres et gratuits** qui gardent leur propre nom (WordCraft, PhotoCraft…). Les « Craft » viennent de l'équipe ArtCraft (github.com/storytold), sont écrits en Rust et tournent dans le navigateur (WebAssembly) ; ils sont en version alpha : utiles, mais garder des copies des fichiers importants.
- Les fichiers s'enregistrent sur l'ordinateur (ou dans le navigateur) : ScoutHub n'en garde aucune copie.
- Première ouverture plus longue (chargement), puis rapide.

## Les applications, une ligne chacune
| Tuile (rubrique) | Application | Adresse | En une ligne | Fiche |
|---|---|---|---|---|
| ChatGDB (Assistant) | ChatGDB | /ScoutHub/ChatGDB/ | assistant IA de la fédération, avec compte et crédits | app-chatgdb |
| Bibliothèque (Ressources) | ScoutBibliotheque | /ScoutHub/ScoutBibliotheque/ | documents de la fédération, recherche dans les PDF, accès par rôle | app-scoutbibliotheque |
| Aide (Ressources) | page du portail | /ScoutHub/aide.html | écrire au service informatique avec ChatGDB | app-scouthub |
| Word (Bureautique) | WordCraft | /ScoutHub/Word/ | traitement de texte, .docx, export PDF, publipostage | app-word |
| Excel (Bureautique) | GridCraft | /ScoutHub/Excel/ | tableur, .xlsx et .csv, formules, graphiques | app-excel |
| PowerPoint (Bureautique) | DeckCraft | /ScoutHub/PowerPoint/ | présentations .pptx, diaporama plein écran, export PDF/GIF | app-powerpoint |
| Acrobat (Bureautique) | PDFCraft | /ScoutHub/PDF/ | lire, organiser, combiner, scinder des PDF, formulaires, OCR | app-pdf |
| Photoshop (Création) | PhotoCraft | /ScoutHub/Photoshop/ | retouche d'images, calques, détourage, PSD | app-photoshop |
| Illustrator (Création) | VectorCraft | /ScoutHub/Illustrator/ | dessin vectoriel, logos et écussons, SVG/PDF | app-illustrator |
| InDesign (Création) | DesignCraft | /ScoutHub/InDesign/ | mise en page de gazettes, livrets, flyers, PDF | app-indesign |
| Lightroom (Création) | LightCraft | /ScoutHub/Lightroom/ | tri et développement des photos, RAW | app-lightroom |
| Figma (Création) | FigCraft | /ScoutHub/Figma/ | maquettes d'interfaces et prototypes | app-figma |
| Excalidraw (Création) | Excalidraw | /ScoutHub/Draw/ | tableau blanc et schémas à main levée | app-draw |
| Premiere Pro (Création) | FilmCraft | /ScoutHub/Premiere/ | montage vidéo, film de camp, sous-titres, MP4 | app-premiere |
| After Effects (Création) | EffectCraft | /ScoutHub/AfterEffects/ | titres animés, motion design, Lottie | app-aftereffects |
| Pro Tools (Création) | SoundCraft | /ScoutHub/ProTools/ | enregistrement et mixage audio | app-protools |
| Substance Painter (Création) | TextureCraft | /ScoutHub/SubstancePainter/ | peinture de textures sur modèles 3D | app-substancepainter |
| CathIA (Conception et CAO) | CathIA | /ScoutHub/CathIA/ | froissartage en 3D, stabilité, plans et liste de matériel | app-cathia |
| SoLeadWorks (Conception et CAO) | SoLeadWorks | /ScoutHub/SoLeadWorks/?lang=fr | meubles et coins de patrouille, un plan par meuble | app-soleadworks |
| AutoCAD (Conception et CAO) | CADCraft | /ScoutHub/CADCraft/?lang=fr | dessin technique 2D, ligne de commande, DXF/DWG | app-cadcraft |
| SolidWorks (Conception et CAO) | SolidCraft | /ScoutHub/SolidCraft/?lang=fr | CAO 3D paramétrique, STEP/STL/3MF | app-solidcraft |
| Cartes IGN (Cartographie) | ScoutMap | /ScoutHub/ScoutMap/ | cartes IGN, itinéraires, azimuts, GPX, impression | app-scoutmap |
| Boutique GDB | boutique en ligne | https://boutique.fsggb.fr/ | uniformes, insignes, accessoires | (hors ScoutHub) |
L'administrateur peut renommer, réordonner ou masquer des tuiles : l'accueil peut différer légèrement.

## Quelle application pour quelle tâche scoute ?
| Tâche | Application conseillée |
|---|---|
| Préparer un raid, une sortie, une randonnée (itinéraire, durée, dénivelé, feuille de route) | ScoutMap |
| Course d'orientation, azimuts | ScoutMap (type Azimuts) |
| Carte de grand jeu sur fond IGN | ScoutMap (type Grand jeu) ; schéma simple : Excalidraw |
| Concevoir une table, un banc, une construction de froissartage et vérifier qu'elle tient | CathIA |
| Plans d'un ensemble de meubles pour le coin de patrouille | SoLeadWorks (ou CathIA, plus complet aujourd'hui) |
| Plan coté du terrain de camp ou d'un local | CADCraft |
| Pièce à imprimer en 3D (insigne, crochet, porte-foulard) | SolidCraft (export STL/3MF) |
| Lettre aux parents, programme, dossier de camp | WordCraft |
| Fiches individuelles par publipostage | GridCraft (liste en CSV) + WordCraft |
| Budget de camp, intendance, liste des inscrits, inventaire | GridCraft |
| Réunion de parents, présentation du camp | DeckCraft |
| Réunir des autorisations scannées, extraire des pages, remplir un formulaire PDF | PDFCraft |
| Trier et corriger les photos du camp | LightCraft |
| Retoucher ou détourer une photo, affiche avec photo | PhotoCraft |
| Logo, écusson de patrouille, foulard, fichier pour découpe ou broderie | VectorCraft |
| Gazette de camp, livret de veillée, flyer | DesignCraft |
| Film souvenir du camp | FilmCraft (+ EffectCraft pour un générique animé, SoundCraft pour le son) |
| Enregistrer les chants de veillée, podcast de camp | SoundCraft |
| Maquette du site ou de l'application du groupe | FigCraft |
| Schéma rapide, carte mentale, organigramme de la maîtrise | Excalidraw |
| Trouver un document officiel de la fédération | Bibliothèque |
| Poser une question, se faire expliquer une application ou un document | ChatGDB |
| Signaler un problème avec une application | Aide (avec ChatGDB) |

## Questions auxquelles la fiche répond
- Quelles applications propose ScoutHub ?
- Quelle application utiliser pour préparer un raid, un budget, un film de camp, un meuble de froissartage… ?
- Les applications sont-elles les vrais logiciels Microsoft, Adobe ou Autodesk ?
- Quelles applications demandent un compte ?
