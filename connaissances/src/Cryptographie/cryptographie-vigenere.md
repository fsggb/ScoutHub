---
id: cryptographie-vigenere
titre: Le chiffre de Vigenère et comment le casser (Kasiski)
theme: Cryptographie
type: synthese
sources:
  - titre: Cryptographie.pdf
    drive: 18-MhxvfX3K97-yIshh4qkqsW1kJl6P0K
    pages: 6, 8
mots_cles: Vigenère, mot-clé, grille de Vigenère, décalage, substitution polyalphabétique, Kasiski, longueur de clé, PGCD, analyse des fréquences, LOUP
liens: doc-cryptographie, cryptographie-cesar-atbash, cryptographie-casser-un-code
resume: Chiffrer avec un mot-clé (Vigenère) grâce à la grille : exemple RENDEZVOUSALAUBE avec la clé LOUP qui donne CSHSPNPDFGUALIVT ; et le casser sans la clé par la méthode de Kasiski et l'analyse des fréquences colonne par colonne.
---

## Chiffrer (p. 6)
- Choisir un mot-clé (ex. LOUP) et le répéter sous le message. Chaque lettre est décalée du rang de la lettre du mot-clé : A = 0, B = 1, C = 2…
- Dans la grille (26 × 26 lettres), chercher la lettre du message en haut, la lettre du mot-clé à gauche : au croisement, la lettre chiffrée.
- Exemple : RENDEZVOUSALAUBE avec la clé LOUP donne CSHSPNPDFGUALIVT. Déchiffrer : l'inverse avec le même mot-clé.
- Bien plus solide que César.

## Casser un Vigenère : la longueur de la clé (p. 8)
1. Chercher des séquences de lettres qui se répètent dans le message ; noter la distance entre les répétitions. Le plus grand diviseur commun de ces distances donne la longueur probable de la clé (méthode de Kasiski).
2. Découper le message en colonnes de cette longueur : chaque colonne est un César, à casser par l'analyse des fréquences.
- Plus le message est long, plus c'est facile : au moins quelques dizaines de lettres.

## Questions auxquelles la fiche répond
- Comment chiffrer un message avec Vigenère ?
- Comment lire la grille de Vigenère ?
- Comment casser un Vigenère sans connaître la clé ?
