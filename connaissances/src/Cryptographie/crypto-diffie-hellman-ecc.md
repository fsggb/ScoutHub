---
id: crypto-diffie-hellman-ecc
titre: Échange de clés Diffie-Hellman et cryptographie à courbes elliptiques (ECC)
theme: Cryptographie
type: synthese
sources:
  - titre: Cryptographie-36.pdf
    drive: 1LuZbZ8xKcla6VIv3-r4owqhKl6Wn9WB7
    pages: 36-41
  - titre: Cryptographie ECC.docx
    drive: 1oTrNjSeSL4sZIbcU-cfK01UQuGySFCwz
    pages: document entier
mots_cles: Diffie-Hellman, échange de clés, secret partagé, logarithme discret, homme du milieu, ECC, courbe elliptique, ECDH, ECDSA, secp256k1, double-and-add, Bitcoin, Signal, SSH
liens: crypto-moderne-symetrique-asymetrique, crypto-hachage-signature-certificats, src-cryptographie-ansi, src-cryptographie-ecc, doc-cryptographie
resume: Comment deux personnes fabriquent un secret commun sans se l'envoyer (Diffie-Hellman, 1976, avec un petit exemple chiffré), sa faille de l'homme du milieu, puis le principe de la cryptographie à courbes elliptiques (clé privée = entier, clé publique = point), ECDH, ECDSA, usages et limites.
---

## Diffie-Hellman (1976)
Permet à deux parties de **générer un secret partagé** sans information préalable l'une sur l'autre ; la sécurité repose sur la difficulté du **logarithme discret**.

**Déroulement (cours ANSI)**
1. Accord public sur un grand entier **n** (tel que (n-1)/2 soit premier) et un entier **g** primitif par rapport à n.
2. Selima choisit un grand nombre secret **a** et calcule **A = g^a mod n** ; Mongi choisit **b** et calcule **B = g^b mod n**.
3. Ils échangent A et B (valeurs publiques).
4. Selima calcule **B^a mod n**, Mongi calcule **A^b mod n** : les deux valent **g^(ab) mod n**, le secret partagé.
Un espion connaît g, n, A et B, mais pour trouver le secret il lui faudrait retrouver a ou b (logarithme discret).

**Petit exemple d'illustration** (nombres minuscules, calculés pour la fiche, à ne jamais utiliser en vrai) : n = 23, g = 5 ; a = 6 donne A = 5^6 mod 23 = 8 ; b = 15 donne B = 5^15 mod 23 = 19 ; Selima calcule 19^6 mod 23 = 2, Mongi calcule 8^15 mod 23 = 2 : **secret commun = 2**.

**Faille : l'homme du milieu** - un attaquant envoie sa propre valeur publique à chacun et partage un secret avec chacun. Parade : **authentifier les valeurs publiques** (Diffie-Hellman authentifié).

## Cryptographie à courbes elliptiques (ECC)
- Inventée dans les années 1980 ; sécurité équivalente à RSA avec des **clés beaucoup plus petites** et des calculs plus rapides.
- Problème difficile : il est facile de calculer un point de la courbe à partir d'un entier et d'un point de départ, extrêmement difficile de faire l'inverse (**logarithme discret sur courbe elliptique**).
- **Clé privée = un entier** aléatoire ; **clé publique = un point** de la courbe, obtenu en « multipliant » le point générateur par la clé privée. Courbe exemple : **secp256k1**.
- **Addition de deux points** : tracer la droite passant par les deux points ; elle recoupe la courbe en un troisième point ; son **symétrique par rapport à l'axe horizontal** est la somme. Pour doubler un point, on prend la **tangente**.
- **Multiplication scalaire** : additions répétées, calculées vite par l'algorithme **double-and-add**.
- **ECDH** : Diffie-Hellman sur courbe ; chacun envoie sa clé publique et calcule le même point commun, car la multiplication scalaire est commutative.
- **ECDSA** : signature à partir d'un entier aléatoire et de la clé privée ; vérification avec la clé publique.
(Les équations du document ECC ne sont pas lisibles dans l'extraction.)

**Usages** : HTTPS (TLS), Bitcoin, Ethereum, Signal, SSH, cartes à puce.
**Limites** : tout repose sur le secret de la clé privée ; vulnérable aux **ordinateurs quantiques** (algorithme de Shor) ; implémentations sensibles aux attaques par canaux auxiliaires. Alternative post-quantique citée : **Kyber**.

## Questions auxquelles la fiche répond
- Comment deux personnes peuvent-elles se mettre d'accord sur une clé secrète en public ?
- Qu'est-ce que l'attaque de l'homme du milieu ?
- Qu'est-ce que la cryptographie à courbes elliptiques et où est-elle utilisée ?
- Pourquoi les ordinateurs quantiques menacent-ils ECC ?
