---
id: cryptographie-casser-un-code
titre: Casser un code : reconnaître la méthode, analyse des fréquences, outils du déchiffreur
theme: Cryptographie
type: synthese
sources:
  - titre: Cryptographie.pdf
    drive: 18-MhxvfX3K97-yIshh4qkqsW1kJl6P0K
    pages: 8-9
mots_cles: casser un code, cryptanalyse, décrypter, reconnaître un code, substitution, transposition, analyse des fréquences, fréquence des lettres en français, bigrammes, mots courts, message caché, jeu de piste, animation
liens: doc-cryptographie, cryptographie-vigenere, cryptographie-scytale, cryptographie-cesar-atbash, cryptographie-morse, cryptographie-pigpen, cryptographie-polybe
resume: Méthode de la troupe pour retrouver un message codé sans la clé : reconnaître le type de code d'après ses signes, analyse des fréquences du français (E, S, A, I, N, T, R ; paires et mots courts), outils du déchiffreur et conseils d'animation pour un jeu de piste.
---

## Reconnaître le type de code (p. 8)
- Seulement des lettres : substitution (César, Vigenère) ou transposition.
- Seulement des chiffres : Polybe, coordonnées, code d'un livre.
- Lettres et chiffres mélangés : chiffre alphanumérique.
- Des signes : 2 signes différents = probablement Morse ; 8 positions = sémaphore ; 9 formes de carrés et de points = Pigpen ; un signe différent par lettre = substitution.
- Texte normal mais absurde : message caché dans le texte (premières lettres de chaque mot, une lettre sur trois…).

## Compter les lettres : l'analyse des fréquences (p. 8)
- Compter chaque lettre du message et les classer. En français, les plus fréquentes : E, puis S, A, I, N, T, R. La plus fréquente du message chiffré est probablement E.
- Repérer les paires fréquentes (ES, DE, LE, EN, ON, RE, ER) et les mots courts (LE, LA, LES, DE, DES, UN, UNE, ET, EST).
- Tester l'hypothèse sur un petit bout : si les mots prennent du sens, continuer ; sinon changer. Noter chaque essai.

## Casser un Vigenère et une transposition (p. 8)
Voir cryptographie-vigenere (Kasiski) et cryptographie-scytale.

## Les outils du déchiffreur (p. 9)
- Papier et crayon, tableau de fréquences, grilles vierges, dictionnaire, calculatrice (diviseurs).
- Observer d'abord, tester sur de petits morceaux, changer de méthode si une piste ne mène nulle part.
- Conseil d'animation : toujours donner un indice sur la méthode (une phrase, une grille) et prévoir un message court pour que la patrouille réussisse.

## Questions auxquelles la fiche répond
- Comment savoir quel code a été utilisé ?
- Quelles sont les lettres les plus fréquentes en français ?
- Comment casser un chiffre par substitution ?
- Que prévoir pour un défi de cryptographie en patrouille ?
