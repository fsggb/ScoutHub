---
id: crypto-identifier-un-chiffrement
titre: Identifier un chiffrement inconnu (transposition, codes à symboles, ADFGVX, code du livre, stéganographie)
theme: Cryptographie
type: synthese
sources:
  - titre: guide_cryptanalyse_restructure (1).docx
    drive: 1ib_SA96XT8HRJzXGpuUxDvtc4-Q5jMEK
    pages: sections 1, 3.4, 3.5, 4
mots_cles: identifier un code, transposition, morse, pigpen, chiffre carré, sémaphore, Polybe, ADFGVX, Bacon, code du livre, stéganographie, acrostiche, grand jeu
liens: crypto-analyse-frequentielle, crypto-cesar-substitution, crypto-vigenere, crypto-morse, src-guide-cryptanalyse, doc-cryptographie
resume: Tableaux du guide pour reconnaître le type de code d'après l'aspect du message (lettres, chiffres, symboles, nombre de symboles) et méthodes pour la transposition, les codes à symboles, l'ADFGVX, le code du livre et la stéganographie.
---

## Selon l'aspect du message
| Ce qu'on voit | Chiffrement probable |
|---|---|
| Uniquement des lettres | Substitution, César, Vigenère, transposition |
| Uniquement des chiffres | Chiffrement numérique, code du livre, coordonnées |
| Lettres et chiffres mélangés | Substitution alphanumérique, ADFGVX |
| Symboles non alphanumériques | Code à symboles (morse, pigpen, sémaphore) |
| Texte d'apparence normale | Stéganographie, message caché |

## Selon les statistiques
| Caractéristique | Type probable | Approche |
|---|---|---|
| 26 symboles ou moins, distribution inégale | Substitution monoalphabétique | Analyse fréquentielle |
| Peu de symboles (5 à 8) | Polybe, ADFGVX, Bacon | Tableau de correspondance |
| Répétitions régulières | Vigenère | Longueur de clé (Kasiski) |
| « Distribution uniforme des lettres » (selon le tableau du guide ; la section 3.4 précise que les fréquences restent celles du français) | Transposition | Réarranger les lettres |
| Points et traits | Morse | Décodage standard |
| Mots normaux mais message absurde | Double sens ou grille | Extraction sélective |

## Codes à symboles
| Nombre de symboles | Code probable | Caractéristiques |
|---|---|---|
| 2 | Morse (ou binaire) | Points et traits, ou 0 et 1 |
| 4 | Chiffre carré | Symboles formés de L |
| 8 | Sémaphore | Positions de drapeaux |
| 9 | Pigpen | Carrés et points |
| 26 | Substitution de symboles | Un symbole par lettre |
Méthode : compter les symboles différents, puis les grouper selon la logique apparente. (Les grilles du pigpen, du chiffre carré et du sémaphore ne sont pas données dans les documents.)

## Transposition
Les lettres sont **mélangées, pas remplacées**.
- Indices : **fréquences identiques au français**, mais **bigrammes et trigrammes habituels absents** ; la longueur du message est souvent un produit de deux nombres (dimensions d'un rectangle).
- Approche : essayer différentes dispositions rectangulaires ; lire en colonnes, en diagonales, en spirale ; si une clé est suspectée, réordonner les colonnes selon l'**ordre alphabétique des lettres de la clé**.

## ADFGVX
Combine substitution et transposition et n'utilise que les lettres **A, D, F, G, V, X**.
1. Reconstituer une **grille 6×6** de lettres et chiffres.
2. Identifier la clé de transposition par l'analyse des fréquences relatives.
3. Réordonner les colonnes.
4. Traduire les **paires de lettres** avec la grille.

## Code du livre
- Indices : nombres souvent **groupés par 3 (page, ligne, position)**, certains nombres répétés (pages « populaires »).
- Approche : trouver le livre de référence (indices du contexte) ; sinon essayer des classiques ou des dictionnaires ; vérifier que les numéros de pages sont cohérents avec le livre supposé.

## Stéganographie (message caché dans un texte normal)
- Lire la **première lettre de chaque mot ou phrase** (acrostiche).
- Repérer des lettres qui se distinguent (taille, police, espacement).
- Extraire selon un motif régulier (une lettre sur trois…).
- Chercher des mots en diagonale ou à la verticale.

## Questions auxquelles la fiche répond
- Comment savoir quel code a été utilisé pour un message ?
- Un message avec seulement A, D, F, G, V, X, c'est quoi ?
- Comment repérer une transposition ?
- Comment fonctionne un code du livre ?
- Comment cacher ou trouver un message dans un texte normal ?
