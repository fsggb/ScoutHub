---
id: cryptographie-polybe
titre: Le carré de Polybe (lettres en nombres)
theme: Cryptographie
type: synthese
sources:
  - titre: Cryptographie.pdf
    drive: 18-MhxvfX3K97-yIshh4qkqsW1kJl6P0K
    pages: 6-7
mots_cles: carré de Polybe, grille 5 x 5, coordonnées, ligne, colonne, coups, mur, lampe, I J
liens: doc-cryptographie, cryptographie-casser-un-code, cryptographie-morse
resume: Le carré de Polybe transforme chaque lettre en deux chiffres (ligne puis colonne d'une grille 5 × 5, I et J dans la même case) : CAMP = 13 11 32 35 ; transmissible par coups à travers un mur ou à la lampe.
---

## Le carré (p. 6, lu sur la figure)
|   | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| 1 | A | B | C | D | E |
| 2 | F | G | H | I/J | K |
| 3 | L | M | N | O | P |
| 4 | Q | R | S | T | U |
| 5 | V | W | X | Y | Z |

## Utilisation (p. 7)
- Chaque lettre est notée par le numéro de sa ligne puis celui de sa colonne ; I et J partagent la même case.
- Exemple : C = 13, A = 11, M = 32, P = 35 : CAMP = 13 11 32 35.
- Transmission par coups : un nombre de coups pour la ligne, une pause, un nombre de coups pour la colonne. Utile pour parler à travers un mur, ou à la lampe.

## Questions auxquelles la fiche répond
- Comment fonctionne le carré de Polybe ?
- Comment coder CAMP en Polybe ?
- Comment transmettre un message en tapant sur un mur ?
