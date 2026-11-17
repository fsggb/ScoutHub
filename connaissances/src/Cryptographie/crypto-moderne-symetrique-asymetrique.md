---
id: crypto-moderne-symetrique-asymetrique
titre: Cryptographie moderne - chiffrement symétrique, asymétrique et hybride
theme: Cryptographie
type: synthese
sources:
  - titre: Cryptographie-36.pdf
    drive: 1LuZbZ8xKcla6VIv3-r4owqhKl6Wn9WB7
    pages: 4-20
  - titre: Cryptographie ECC.docx
    drive: 1oTrNjSeSL4sZIbcU-cfK01UQuGySFCwz
    pages: I.B, III
mots_cles: chiffrement symétrique, clé secrète, chiffrement asymétrique, clé publique, clé privée, RSA, AES, DES, 3DES, RC4, clé de session, chiffrement hybride, taille de clé, confidentialité
liens: crypto-hachage-signature-certificats, crypto-diffie-hellman-ecc, src-cryptographie-ansi, src-cryptographie-ecc, doc-cryptographie
resume: Les services de sécurité (confidentialité, intégrité, authentification, non-répudiation) et le chiffrement - symétrique (une clé secrète, rapide, AES, 3DES, RC4), asymétrique (clé publique pour chiffrer, clé privée pour déchiffrer, RSA, lent), hybride avec clé de session, et taille des clés.
---

## Vocabulaire
- **Chiffrement** : transformer avec une clé un message clair en message incompréhensible ; **déchiffrement** : l'inverse avec la clé.
- **Chiffre** : l'algorithme ; **cryptogramme** : le message chiffré.
- **Décrypter** : retrouver le clair (ou la clé) **sans** posséder la clé.
- **L'algorithme est public** ; seules les **clés** restent secrètes. Éviter les algorithmes non publiés (donc non testés).

## Services de sécurité et mécanismes
| Service | Mécanisme |
|---|---|
| Confidentialité | Chiffrement |
| Intégrité | Hachage |
| Authenticité | Signature électronique |
| Non-répudiation | Notarisation / horodatage |

## Chiffrement symétrique (une clé secrète)
- **Une seule clé** pour chiffrer et déchiffrer ; elle doit rester secrète.
- **En continu** (stream, bit par bit) : RC4 (clé souvent 128 bits). **Par blocs** : 3DES (168 ou 112 bits), AES/Rijndael (128, 192, 256 bits), IDEA (128), CAST-128, Blowfish (jusqu'à 448 bits).
- **Avantage** : rapide (environ 1000 fois plus que l'asymétrique), adapté aux gros volumes.
- **Inconvénient** : une clé par paire d'interlocuteurs et **transmission dangereuse des clés**.

## Chiffrement asymétrique (clé publique)
- Deux clés liées : **clé publique** (chiffrement, diffusable sans risque) et **clé privée** (déchiffrement, confidentielle). Connaître la clé publique ne permet pas de retrouver la clé privée.
- Analogie (document ECC) : tout le monde peut déposer une lettre dans la boîte aux lettres (clé publique), seul le propriétaire a la clé pour l'ouvrir (clé privée).
- **Avantages** : gestion sûre des clés, adapté aux environnements anonymes.
- **Inconvénients** : **très lent** ; il faut **authentifier la clé publique** (d'où les certificats).
- **RSA** (Rivest, Shamir, Adleman, MIT, 1977) : fondé sur la difficulté de **factoriser de grands nombres** ; clés de 1024, 2048 bits…
- **ECC** : même principe avec des clés beaucoup plus petites (voir `crypto-diffie-hellman-ecc`).

## Chiffrement hybride et clé de session
1. Générer **aléatoirement** une clé de session (symétrique).
2. La chiffrer avec la **clé publique du destinataire**.
3. Le destinataire la déchiffre avec sa **clé privée**.
4. Les deux utilisent ensuite cette clé commune pour chiffrer rapidement les données.

## Sécurité et taille des clés
- La sécurité repose sur la **qualité de conception** (on ne prouve la solidité que face aux attaques connues) et sur la **puissance de calcul** nécessaire pour casser.
- Clé secrète de n bits : **2^n combinaisons** à essayer (recherche exhaustive). Ordres de grandeur du cours : 40 bits (export), DES 56 bits, IDEA/CAST 128 bits, Skipjack 160 bits, AES 256 bits ; 3DES = 3 × 56 = 168 bits (ou 112).
- Clé RSA : la difficulté est la factorisation.
- Qualité de l'implémentation : générateur de nombres vraiment aléatoires, gestion et distribution des clés, mode de chiffrement (ECB, CBC, CFB, OFB).
- Limite citée par le document ECC : les **ordinateurs quantiques** (algorithme de Shor) menacent ECC, d'où des alternatives post-quantiques comme Kyber.

## Questions auxquelles la fiche répond
- Quelle différence entre chiffrement symétrique et asymétrique ?
- À quoi servent la clé publique et la clé privée ?
- Pourquoi combine-t-on les deux (chiffrement hybride) ?
- Qu'est-ce que RSA et AES ?
- Pourquoi une clé longue est-elle plus sûre ?
