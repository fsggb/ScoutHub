---
id: app-protools
titre: SoundCraft, studio audio et mixage (tuile Pro Tools)
theme: Applications
type: application
sources:
  - titre: SoundCraft - README.md
    url: https://github.com/storytold/soundcraft
  - titre: ScoutHub - fiche CHATGDB.md et config.js
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
mots_cles: SoundCraft, Pro Tools, audio, son, enregistrement, mixage, chant, veillée, podcast, MIDI, WAV, FLAC, MP3, bounce, égaliseur
liens: app-premiere, app-aftereffects, applications-panorama
resume: SoundCraft est la station audionumérique libre présentée dans ScoutHub sous la tuile Pro Tools. La fiche explique comment enregistrer, monter et mixer du son (chants de veillée, podcast, bande son du film de camp), ses fenêtres Édition et Mixage, plugins, MIDI, les formats audio, les raccourcis et les limites.
---

## À quoi sert SoundCraft
Station audionumérique libre (MIT/Apache, équipe ArtCraft / storytold), au fonctionnement de Pro Tools : fenêtre **Édition** pour arranger et monter, fenêtre **Mixage** pour équilibrer. Usages scouts : enregistrer les chants de la veillée ou de la chorale de groupe, monter un podcast ou une émission de camp, préparer la bande son d'un film ou d'un spectacle, nettoyer un enregistrement.

## Ouvrir SoundCraft
- Dans ScoutHub : https://fsggb.github.io/ScoutHub/ProTools/ (tuile « Pro Tools », rubrique Création). Ce n'est pas Avid Pro Tools.
- Sans compte ; fichiers sur l'ordinateur. Enregistrer depuis le micro dépend de l'autorisation du navigateur.

## Fonctions principales
- **Montage** : modes Shuffle, Slip, Spot, Grid ; outils Smart, Sélecteur, Main, Trim, Crayon, Zoom, Scrub ; couper, copier, coller, dupliquer, répéter, séparer, insérer du silence, supprimer les silences ; fondus et fondus enchaînés ; playlists et comping ; gain de clip ; annuler pour tout.
- **Mixage** : volume et panoramique avec automation, envois, bus, entrées aux, VCA, solo/muet, inversion de phase, compensation de latence.
- **Automation** : Write, Touch, Latch, Trim.
- **Plugins** fournis : égaliseurs, compresseur/limiteur, gate, de-esser, réverbérations, délai, chorus, flanger, saturation, changement de hauteur, synthé, boîte à rythmes, sampler ; plugins CLAP ; traitement hors ligne (AudioSuite).
- **MIDI** : pistes instrument et MIDI, piano roll, partition, quantification, conversion audio vers MIDI d'une mélodie chantée.
- **Enregistrement** : punch-in, pré/post-roll, enregistrement en boucle (une playlist par prise), sauvegarde automatique et récupération.
- **Tempo** : carte de tempo et de mesure, Elastic Audio (étirement sans changer la hauteur).

## Pas à pas : enregistrer et mixer un chant de veillée
1. Créer des pistes (Ctrl/⌘+Maj+N) : par exemple une piste mono par micro.
2. Armer la piste, lancer l'enregistrement ; faire plusieurs prises en boucle si besoin.
3. Dans la fenêtre Édition, garder la meilleure prise, couper les débuts et fins, ajouter des fondus.
4. Ctrl/⌘+= pour passer à la fenêtre Mixage : régler les volumes, ajouter un égaliseur et une réverbération.
5. Bounce : exporter le mix en WAV, AIFF ou FLAC (normalisation, mesure du loudness en LUFS).

## Formats
- Entrée et sortie : WAV/BWF/RF64, AIFF/AIFC, FLAC.
- Entrée seulement : MP3, Ogg Vorbis, AAC, ALAC, CAF, son des vidéos MP4/MOV ; fichiers MIDI standard.
- Bounce : mix ou stems en WAV, AIFF, FLAC, 16/24/32 bits flottants.

## Raccourcis
Espace lecture/arrêt ; Ctrl/⌘+= bascule Mixage/Édition ; F1 à F4 modes d'édition ; F5 à F10 outils ; Ctrl/⌘+E séparer ; Ctrl/⌘+D dupliquer ; Entrée nouveau marqueur ; Ctrl/⌘+Maj+N nouvelles pistes. Configuration > Raccourcis clavier les liste tous.

## Limites
- Pré-alpha (environ 40 % pour un usage réel) : choix de l'interface audio et de la taille de tampon, enregistrement MIDI depuis un contrôleur et échange AAF/OMF manquent encore.
- Pas d'export MP3 direct (exporter en WAV ou FLAC).

## Questions auxquelles la fiche répond
- Comment enregistrer les chants de la veillée et en faire un fichier audio ?
- Comment monter un podcast de camp ?
- Est-ce le vrai Pro Tools ? Quels formats audio sont acceptés ?
- Comment exporter mon mixage ?
