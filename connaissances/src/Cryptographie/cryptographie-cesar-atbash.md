---
id: cryptographie-cesar-atbash
titre: Chiffre de César et Atbash (substitutions simples)
theme: Cryptographie
type: synthese
sources:
  - titre: Cryptographie.pdf
    drive: 18-MhxvfX3K97-yIshh4qkqsW1kJl6P0K
    pages: 5-6
mots_cles: chiffre de César, décalage, clé, roue, Atbash, alphabet inversé, substitution, chiffrer, déchiffrer
liens: doc-cryptographie, cryptographie-vigenere, cryptographie-casser-un-code
resume: Deux chiffres par substitution simple : César (décalage fixe de l'alphabet, clé 3 : CAMP devient FDPS, 25 décalages possibles) et Atbash (alphabet inversé, sans clé : CAMP devient XZNK).
---

## Le chiffre de César (p. 5)
- On choisit un nombre (la clé), par exemple 3 : chaque lettre est remplacée par celle trois places plus loin. A devient D, B devient E… Z devient C. Exemple : CAMP devient FDPS.
- Déchiffrer : décaler dans l'autre sens. Une roue à deux cercles concentriques permet de le faire à la main.
- Il n'y a que 25 décalages possibles : on les essaie tous pour casser le chiffre.

## Atbash, l'alphabet inversé (p. 6)
- Écrire l'alphabet dans l'ordre, puis dessous à l'envers : A↔Z, B↔Y, C↔X, … M↔N.
- Exemple : CAMP devient XZNK.
- Pas de clé : connaître la méthode suffit pour lire ; bon pour s'initier, pas pour garder un secret.

## Questions auxquelles la fiche répond
- Comment chiffrer avec le code César ?
- Comment déchiffrer un César dont on ne connaît pas la clé ?
- Qu'est-ce que l'Atbash ?
