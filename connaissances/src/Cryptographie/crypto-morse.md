---
id: crypto-morse
titre: Le code morse - table complète et mots pour le retenir
theme: Cryptographie
type: synthese
sources:
  - titre: Grille de Vingère.pdf
    drive: 18WMYD8hsvKbXYE8ZIKLTKatwqZmKhUhA
    pages: 1
  - titre: morse & alphabet international.png
    drive: 1GOmc-opJuO0roWO8UVwJ4tkVLUEogRTy
    pages: 1
  - titre: guide_cryptanalyse_restructure (1).docx
    drive: 1ib_SA96XT8HRJzXGpuUxDvtc4-Q5jMEK
    pages: section 3.5
mots_cles: morse, point, trait, code morse, SOS, mnémotechnique, Allo, Bonaparte, Coca-cola, signaux, transmission
liens: crypto-alphabet-phonetique-otan, crypto-braille, crypto-identifier-un-chiffrement, src-grille-de-vigenere, src-morse-alphabet-international-png, doc-cryptographie
resume: La table morse A à Z (points et traits) avec, pour chaque lettre, le mot mnémotechnique français du tableau de la fédération (Allo, Bonaparte, Coca-cola, Do-ré-mi...), comment coder et décoder, un exemple, et comment reconnaître du morse dans un message.
---

## Table morse et mots mnémotechniques
Codes tirés de la grille de Vigenère ; mots tirés du tableau « morse & alphabet international ».

| Lettre | Morse | Mot pour retenir |
|---|---|---|
| A | •- | Allo |
| B | -••• | Bonaparte |
| C | -•-• | Coca-cola |
| D | -•• | Do-ré-mi |
| E | • | Eau |
| F | ••-• | Farandole |
| G | --• | Gondole |
| H | •••• | Hilarité |
| I | •• | Ici |
| J | •--- | J'ai gros bobo |
| K | -•- | Kimono |
| L | •-•• | Limonade |
| M | -- | Moto |
| N | -• | Noël |
| O | --- | Oporto |
| P | •--• | Philosophie |
| Q | --•- | Quocorico |
| R | •-• | Restaurant |
| S | ••• | Salade |
| T | - | Thon |
| U | ••- | Union |
| V | •••- | Valentino |
| W | •-- | Wagoneau |
| X | -••- | Xolyphéno |
| Y | -•-- | Yomamoto |
| Z | --•• | Zoro est là |

**Lire les mots** : chaque syllabe donne un signe ; dans presque tous les mots, une syllabe contenant un **O** correspond à un **trait** et les autres à un **point** (Bo-na-par-te = - • • • ; Co-ca-co-la = - • - •). Deux mots du tableau ne suivent pas ce schéma : « Eau » (E = •) et « Kimono » (K = -•-).

Les chiffres ne sont pas donnés en morse dans les documents (le tableau ne donne que leur nom en téléphonie).

## Coder un message
1. Écrire le message en majuscules, sans accents.
2. Remplacer chaque lettre par son code.
3. Séparer nettement les lettres (une barre « / » ou un espace) et les mots (double barre ou grand espace).

**Exemple** : SOS → ••• / --- / ••• ; SCOUT → ••• / -•-• / --- / ••- / -.

## Décoder
Découper le message aux séparations, puis chercher chaque groupe dans la table (ou retrouver le mot mnémotechnique : « trait-point-trait-point » = Co-ca-co-la = C).

## Reconnaître du morse
D'après le guide de cryptanalyse, un message fait de **deux symboles seulement** (points et traits, ou 0 et 1) est probablement du morse (ou du binaire) : « décodage standard » avec la table.

## Questions auxquelles la fiche répond
- Quel est le code morse de chaque lettre ?
- Comment retenir l'alphabet morse facilement ?
- Comment écrire SOS en morse ?
- Comment reconnaître un message en morse dans un jeu ?
