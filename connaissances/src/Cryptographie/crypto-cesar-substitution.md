---
id: crypto-cesar-substitution
titre: Chiffre de César et substitution simple
theme: Cryptographie
type: synthese
sources:
  - titre: guide_cryptanalyse_restructure (1).docx
    drive: 1ib_SA96XT8HRJzXGpuUxDvtc4-Q5jMEK
    pages: sections 1.1, 1.3, 3.1
  - titre: Grille de Vingère.pdf
    drive: 18WMYD8hsvKbXYE8ZIKLTKatwqZmKhUhA
    pages: 1
mots_cles: César, décalage, substitution monoalphabétique, alphabet décalé, 25 décalages, chiffrer, déchiffrer
liens: crypto-vigenere, crypto-analyse-frequentielle, crypto-identifier-un-chiffrement, src-guide-cryptanalyse, doc-cryptographie
resume: Le chiffre de César décale l'alphabet d'un nombre fixe de rangs (avec un décalage de 3, SCOUT devient VFRXW) ; on le casse en essayant les 25 décalages ou par analyse fréquentielle. La substitution simple remplace chaque lettre par un symbole fixe et se casse par fréquences.
---

## Chiffre de César
Le guide le définit comme un **décalage fixe de l'alphabet**. Une ligne de la grille de Vigenère donne directement l'alphabet décalé (ligne D = décalage de 3 : A→D, B→E…).

**Chiffrer** : remplacer chaque lettre par celle située n rangs plus loin (après Z on revient à A).
**Déchiffrer** : reculer de n rangs.

**Exemple** (décalage 3) : SCOUT → **VFRXW** ; VFRXW reculé de 3 → SCOUT.

**Casser** (selon le guide) :
- **tester les 25 décalages possibles** ; un seul donne du français ;
- ou faire une **analyse fréquentielle** : la lettre la plus fréquente du message correspond probablement à E ; l'écart donne le décalage.

## Substitution monoalphabétique
Chaque lettre est toujours remplacée par **la même lettre ou le même symbole**.
- Indices : uniquement des lettres, ou **26 symboles ou moins** avec une distribution inégale ; « un symbole par lettre » pour les codes à 26 symboles.
- Méthode : **analyse fréquentielle** (voir `crypto-analyse-frequentielle`) en commençant par E, S, A, puis les mots courts LE, LA, DE.

## Questions auxquelles la fiche répond
- Comment fonctionne le code César ?
- Comment déchiffrer un message César sans connaître le décalage ?
- Qu'est-ce qu'une substitution simple et comment la casser ?
