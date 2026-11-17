---
id: doc-cryptographie
titre: Cryptographie – fiches techniques (document de la troupe)
theme: Cryptographie
type: document
sources:
  - titre: Cryptographie.pdf
    drive: 18-MhxvfX3K97-yIshh4qkqsW1kJl6P0K
    pages: 1-10
mots_cles: cryptographie, coder, chiffrer, déchiffrer, décrypter, cryptanalyse, Morse, sémaphore, alphabet phonétique, OTAN, César, Atbash, Vigenère, Polybe, francs-maçons, Pigpen, scytale, transposition, substitution, analyse des fréquences, Kasiski, clé publique, courbes elliptiques
liens: cryptographie-morse, cryptographie-semaphore, cryptographie-alphabet-phonetique, cryptographie-cesar-atbash, cryptographie-vigenere, cryptographie-polybe, cryptographie-pigpen, cryptographie-scytale, cryptographie-casser-un-code, cryptographie-moderne
resume: Résumé complet du document « Cryptographie – fiches techniques » de la troupe Saint-Elme : vocabulaire (coder, chiffrer, déchiffrer, décrypter), Morse avec mots mnémotechniques, sémaphore, alphabet OTAN, chiffres de César, Atbash, Vigenère, Polybe, Pigpen et scytale avec exemples, méthodes pour casser un code et notions de cryptographie moderne.
---

## Présentation du document
- « Cryptographie – fiches techniques. Coder, chiffrer, déchiffrer : Morse, sémaphore, alphabets, grilles et analyse de messages. »
- FSGGB, Troupe Saint-Elme, Documentation. Usage interne. 10 pages numérotées plus la couverture ; pages citées = numéros imprimés.
- Figures (table Morse, positions du sémaphore, roue de César, grille de Vigenère, carré de Polybe, Pigpen) dessinées pour le document, alphabets de domaine commun. La table Morse et le carré de Polybe ont été lus sur l'image et sont transcrits dans les fiches correspondantes ; les 26 positions du sémaphore sont des dessins de bonhommes non transcrits lettre par lettre.

## Sommaire
1. Coder avec des signes (p. 2-5) : 1.1 coder ou chiffrer, 1.2 Morse, 1.3 retenir le Morse, 1.4 sémaphore, 1.5 apprendre le sémaphore par cercles, 1.6 alphabet phonétique.
2. Chiffrer avec une clé (p. 5-7) : César, Atbash, Vigenère, Polybe, francs-maçons (Pigpen), scytale.
3. Casser un code (p. 8-9) : reconnaître le type, compter les lettres, casser un Vigenère, casser une transposition, outils du déchiffreur.
4. Pour aller plus loin (p. 9) : cryptographie d'aujourd'hui.
5. Sources et crédits (p. 10).

## 1.1 Coder ou chiffrer ? Le vocabulaire (p. 2)
- Coder : transformer un message en signes selon une table connue de tous (Morse, sémaphore) ; but : transmettre.
- Chiffrer : transformer un message pour que seul celui qui connaît la méthode ou la clé puisse le lire (César, Vigenère) ; but : cacher.
- Déchiffrer : lire un message dont on connaît la clé. Décrypter : le lire sans la connaître. L'étude de ces techniques : la cryptanalyse.
- Chapitre 2 : on remplace les lettres (substitution) ou on les déplace (transposition).

## Exemples du document (avec le mot CAMP)
| Méthode | Résultat |
|---|---|
| César, clé 3 | FDPS |
| Atbash | XZNK |
| Polybe | 13 11 32 35 |
| Alphabet OTAN | Charlie, Alfa, Mike, Papa |
| Vigenère (RENDEZVOUSALAUBE, clé LOUP) | CSHSPNPDFGUALIVT |
| Scytale 4 colonnes (RENDEZVOUSDEMAIN) | REUMEZSANVDIDOEN |

## Résumé des chapitres
- Morse, sémaphore, alphabet phonétique : voir cryptographie-morse, cryptographie-semaphore, cryptographie-alphabet-phonetique.
- Chiffres à clé : cryptographie-cesar-atbash, cryptographie-vigenere, cryptographie-polybe, cryptographie-pigpen, cryptographie-scytale.
- Cryptanalyse : cryptographie-casser-un-code (et Kasiski dans cryptographie-vigenere, transposition dans cryptographie-scytale).
- Cryptographie moderne : cryptographie-moderne.

## Sources et crédits (p. 10)
- Figures dessinées pour ce document (alphabets de domaine commun), aucune image tierce.
- Dossier « Cryptographie » du drive de la troupe : guide de cryptanalyse (texte français), table Morse et alphabet international, grille de Vigenère, « Cryptographie ECC » : reconnaissance des codes, fréquences du français, Kasiski, mnémotechniques du Morse, alphabet OTAN, ECC ; textes réécrits.
- Cours « Cryptographie », ANSI (Agence nationale de la sécurité informatique, Tunisie), 2006, 74 p. : notions générales ; reproduction non commerciale autorisée.
- Sémaphore : tableau des positions recoupé (scouting resources, ANBG, Wikipedia…).
- Pigpen : dCode, documentation de la police LaTeX pigpen.
- Logo FSGGB.
- À valider par un chef : les positions du sémaphore (vues de face) et les exemples chiffrés avant une activité ; les mots mnémotechniques du Morse pour K sont à inventer.

## Questions auxquelles la fiche répond
- Quelle différence entre coder, chiffrer, déchiffrer et décrypter ?
- Quels codes et chiffres utiliser pour un jeu de piste ?
- Comment coder « CAMP » avec chaque méthode ?
- Comment casser un message codé ?
