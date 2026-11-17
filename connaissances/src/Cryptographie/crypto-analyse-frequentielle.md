---
id: crypto-analyse-frequentielle
titre: Analyse fréquentielle du français pour déchiffrer un message
theme: Cryptographie
type: synthese
sources:
  - titre: guide_cryptanalyse_restructure (1).docx
    drive: 1ib_SA96XT8HRJzXGpuUxDvtc4-Q5jMEK
    pages: sections 1.2, 2, 5
mots_cles: analyse fréquentielle, fréquence des lettres, E 14,7 %, bigrammes, trigrammes, mots courts, cryptanalyse, déchiffrer
liens: crypto-cesar-substitution, crypto-vigenere, crypto-identifier-un-chiffrement, src-guide-cryptanalyse, doc-cryptographie
resume: Fréquences des lettres en français (E 14,7 %, S 7,9 %, A 7,6 %...), bigrammes (ES, DE, LE...), trigrammes (ENT, LES, QUE...) et mots courts, avec la méthode pas à pas pour casser une substitution, le matériel utile et les conseils du guide.
---

## Fréquence des lettres en français
- **Très fréquentes** : E 14,7 % - S 7,9 % - A 7,6 % - I 7,5 % - N 7,1 % - T 7,0 % - R 6,6 %.
- **Fréquentes** : (une lettre non nommée dans le document) 6,0 % - L 5,5 % - O 5,4 % - D 3,7 % - C 3,3 % - P 3,0 % - M 2,6 %.
- **Moyennement fréquentes** : (une lettre non nommée) 1,6 % - H 1,1 % - G 1,0 % - F 1,0 % - B 0,9 %.
- **Rares** : J 0,7 % - Q 0,7 % - X 0,4 % - Z 0,3 % - Y 0,3 % - K 0,1 % - W 0,1 %.

## Bigrammes et trigrammes
- **Bigrammes** : ES 3,0 % - DE 2,7 % - LE 2,4 % - EN 2,2 % - NT 2,0 % - RE 1,9 % - ON 1,9 % - ER 1,8 % - AN 1,7 % - OU 1,5 % - QU 1,5 % - IT 1,3 %.
- **Trigrammes** : ENT 1,0 % - LES 0,8 % - QUE 0,7 % - ANT 0,5 % - ION 0,5 %.
- **Mots courts** : LE, LA, LES, DE, DES, UN, UNE, ET, EST, EN, À, AU, AUX, CE, CES, IL, ELLE.

## Analyse préliminaire
Avant tout essai : compter le nombre total de caractères, le nombre de symboles différents, la fréquence de chacun, et repérer les motifs qui se répètent.

## Méthode pas à pas
1. Compter les occurrences de chaque symbole du message.
2. Les classer par fréquence décroissante.
3. Comparer avec la distribution du français.
4. Identifier d'abord les plus fréquents (E, S, A).
5. Chercher les bigrammes et trigrammes caractéristiques.
6. Tester les hypothèses : les mots formés ont-ils un sens ?

## Matériel
Papier et crayon, tableau de fréquences, grilles vierges, dictionnaire, calculatrice (PGCD, indice de coïncidence), patience et méthode.

## Conseils
- Observer et analyser avant d'agir.
- Tester sur une petite portion du texte d'abord.
- Noter toutes les tentatives.
- E, S, A, I sont les meilleures alliées ; les mots courts (LE, LA, DE) confirment les hypothèses.
- Changer d'approche si rien ne marche après plusieurs essais.

## Questions auxquelles la fiche répond
- Quelle est la lettre la plus fréquente en français ?
- Comment faire une analyse fréquentielle ?
- Quels bigrammes chercher dans un message codé ?
- De quoi a-t-on besoin pour déchiffrer à la main ?
