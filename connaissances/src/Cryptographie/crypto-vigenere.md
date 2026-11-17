---
id: crypto-vigenere
titre: Le chiffre de Vigenère - chiffrer, déchiffrer et casser
theme: Cryptographie
type: synthese
sources:
  - titre: Grille de Vingère.pdf
    drive: 18WMYD8hsvKbXYE8ZIKLTKatwqZmKhUhA
    pages: 1
  - titre: guide_cryptanalyse_restructure (1).docx
    drive: 1ib_SA96XT8HRJzXGpuUxDvtc4-Q5jMEK
    pages: sections 1.3, 3.2, 3.3
mots_cles: Vigenère, carré de Vigenère, clé, chiffrement polyalphabétique, Kasiski, indice de coïncidence, PGCD, longueur de clé
liens: crypto-cesar-substitution, crypto-analyse-frequentielle, crypto-identifier-un-chiffrement, src-grille-de-vigenere, src-guide-cryptanalyse, doc-cryptographie
resume: Comment utiliser le carré de Vigenère de la fédération pour chiffrer et déchiffrer avec un mot-clé (exemple RENDEZVOUS avec la clé FEU donne WIHIITASOX), et comment casser un Vigenère inconnu avec la méthode de Kasiski et l'indice de coïncidence (0,074 en français).
---

## Le carré (grille de la fédération)
26 lignes : la ligne d'une lettre est l'alphabet **commençant par cette lettre** (ligne A : ABC…Z ; ligne B : BCD…ZA ; ligne C : CDE…ZAB ; … ; ligne Z : ZAB…Y). Chaque ligne est donc un chiffre de César de décalage différent (A = 0, B = 1, … Z = 25).

## Chiffrer
1. Choisir un **mot-clé** (ex. FEU) et l'écrire sous le message en le **répétant** autant que nécessaire.
2. Pour chaque lettre : prendre la **ligne de la lettre de clé** et y lire la lettre située dans la **colonne de la lettre claire**.

**Exemple** (calculé avec la grille) :
```
Clair :  R E N D E Z V O U S
Clé   :  F E U F E U F E U F
Chiffré: W I H I I T A S O X
```
R sur la ligne F donne W ; E sur la ligne E donne I ; N sur la ligne U donne H, etc. → **WIHIITASOX**.

## Déchiffrer
Sur la **ligne de la lettre de clé**, chercher la **lettre chiffrée** : la lettre en tête de sa **colonne** est la lettre claire. (W sur la ligne F est dans la colonne R.)

## Casser un Vigenère (sans la clé)
Le guide de cryptanalyse décrit Vigenère comme un chiffrement à **clé répétée** ; indice : **texte avec répétitions régulières**.

**Méthode de Kasiski**
1. Repérer les **séquences de lettres qui se répètent** dans le texte chiffré.
2. Calculer les **distances** entre ces répétitions.
3. Le **PGCD** de ces distances donne la **longueur probable de la clé**.
4. Découper le texte en autant de **colonnes** que la longueur de clé (lettres 1, 1+n, 1+2n… dans la première, etc.).
5. Faire une **analyse fréquentielle** sur chaque colonne séparément : chaque colonne est un simple César (la lettre la plus fréquente correspond probablement à E).

**Indice de coïncidence**
1. Découper le texte en groupes de longueur n en essayant plusieurs valeurs.
2. Calculer l'indice de coïncidence pour chaque n.
3. La longueur qui donne un indice **proche de 0,074 (valeur typique du français)** est probablement la bonne.
4. Continuer comme avec Kasiski.

## Questions auxquelles la fiche répond
- Comment utiliser une grille de Vigenère ?
- Comment chiffrer un message avec un mot-clé ?
- Comment déchiffrer un message Vigenère quand on connaît la clé ?
- Comment trouver la longueur de la clé d'un Vigenère ?
