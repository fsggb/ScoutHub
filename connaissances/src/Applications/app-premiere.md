---
id: app-premiere
titre: FilmCraft, montage vidéo (tuile Premiere Pro)
theme: Applications
type: application
sources:
  - titre: FilmCraft - README.md
    url: https://github.com/storytold/filmcraft
  - titre: ScoutHub - fiche CHATGDB.md et config.js
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
mots_cles: FilmCraft, Premiere, montage vidéo, film de camp, timeline, découpe, transitions, titres, sous-titres, étalonnage, son, MP4, H.264, export
liens: app-aftereffects, app-protools, app-lightroom, app-powerpoint, applications-panorama
resume: FilmCraft est le logiciel libre de montage vidéo présenté dans ScoutHub sous la tuile Premiere Pro. La fiche explique comment monter le film du camp (importer, couper, assembler, titres, sous-titres, musique, étalonnage), exporter en MP4, les formats acceptés, les raccourcis de montage et les limites.
---

## À quoi sert FilmCraft
Logiciel libre de montage non linéaire (MIT/Apache, équipe ArtCraft / storytold), avec les panneaux, espaces de travail, outils et raccourcis habituels de Premiere Pro. Codecs écrits en Rust, sans FFmpeg. Usages scouts : film souvenir du camp, vidéo de présentation du groupe, reportage d'une sortie, sous-titrage d'une vidéo.

## Ouvrir FilmCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/Premiere/ (tuile « Premiere Pro », rubrique Création). Ce n'est pas Adobe Premiere Pro.
- Sans compte ; médias ouverts depuis l'ordinateur, export téléchargé. Le même moteur tourne dans le navigateur (WebAssembly) ; préférer de courts projets dans le navigateur.

## Interface
Moniteurs Source et Programme, chutiers avec vignettes, timeline multipiste ; espaces de travail Montage, Assemblage, Couleur, Effets, Audio ; panneaux ancrables ; historique illimité.

## Fonctions principales
- **Montage** : montage trois points (entrée/sortie dans la source, insertion ou recouvrement), outils de raccord (ripple, roll, slip, slide, étirement, rasoir), moniteur de raccord, marqueurs, imbrication, suppression avec décalage, magnétisme.
- **Couleur** : correction de base (température, exposition, contraste…), huit looks créatifs, courbes, roues chromatiques, correction secondaire TSL, vignettage.
- **Effets** : plus de 90 effets vidéo et environ 30 transitions (fondu enchaîné, fondu au noir…), position/échelle/rotation/opacité par clip, images clés.
- **Audio** : vumètres de loudness (EBU R128), égaliseur, débruitage, limiteur, réverbération ; mixeurs de pistes et de clips, automation.
- **Titres et sous-titres** : outils Texte, Forme, Plume sur le moniteur ; pistes de sous-titres, import/export SRT, WebVTT, SCC, incrustation à l'export.
- **Sécurité** : enregistrements atomiques, sauvegarde automatique, journal de récupération après plantage.

## Pas à pas : le film du camp
1. Importer les vidéos et photos du camp (et une musique libre de droits) dans un chutier.
2. Ouvrir un clip dans le moniteur Source, marquer l'entrée et la sortie, insérer (`,`) ou recouvrir (`.`) dans la timeline.
3. Raccourcir ou ajuster avec les outils de raccord ; couper au rasoir.
4. Ajouter des fondus enchaînés entre les plans, un titre au début, des sous-titres si besoin.
5. Poser la musique sur une piste audio, régler les niveaux (vumètres).
6. Exporter en MP4 H.264 + AAC ; le rendu se fait en tâche de fond.

## Formats
- Décodage : H.264, HEVC, ProRes, VP8, VP9, AV1, DNxHD/DNxHR, MJPEG ; audio AAC, Opus, MP3, FLAC, ALAC, Vorbis, PCM ; conteneurs MP4/MOV, Matroska/WebM, AVI, MXF, MPEG-TS ; images PNG, JPEG, GIF, WebP, TIFF, BMP.
- Export : **MP4 H.264 + AAC**, ProRes 422 HQ, Motion JPEG, MXF, séquences PNG, GIF animé, WAV.
- Échange de timelines : FCP 7 XML, FCPXML, OpenTimelineIO, EDL CMX 3600, AAF, OMF ; marqueurs en CSV.

## Raccourcis
`,` insérer, `.` recouvrir, `;` extraire sans décalage (lift), `'` extraire ; `J`/`K`/`L` en raccord dynamique (arrière, arrêt et validation, avant) ; `Q`/`W` raccord jusqu'à la tête de lecture ; `E` étendre le raccord ; Alt+←/→ décaler d'une image ; Ctrl/⌘+K ajouter un point de montage ; Ctrl/⌘+Alt+K éditeur de raccourcis.

## Limites
- Alpha (environ 56 % prêt pour la production réelle) ; lent sur de grosses séquences (étalonnage et export sur processeur).
- Pas d'import de projets .prproj ; pas de plugins ; pas d'export AV1.
- Les fichiers de téléphones et caméras sont moins testés.

## Questions auxquelles la fiche répond
- Comment monter le film du camp et l'exporter en MP4 ?
- Comment ajouter des sous-titres ou un titre ?
- Est-ce le vrai Premiere Pro ? Puis-je ouvrir un projet .prproj ?
- Quels formats vidéo sont acceptés ?
