---
id: crypto-hachage-signature-certificats
titre: Hachage, signature électronique, horodatage, certificats et PKI
theme: Cryptographie
type: synthese
sources:
  - titre: Cryptographie-36.pdf
    drive: 1LuZbZ8xKcla6VIv3-r4owqhKl6Wn9WB7
    pages: 21-35, 46-70
mots_cles: hachage, empreinte, MD5, SHA, intégrité, signature électronique, horodatage, non-répudiation, certificat, autorité de certification, X.509, révocation, PKI, SSL, TLS, HTTPS
liens: crypto-moderne-symetrique-asymetrique, crypto-diffie-hellman-ecc, src-cryptographie-ansi, doc-cryptographie
resume: Comment l'informatique garantit l'intégrité (fonctions de hachage MD5, SHA), l'authenticité (signature = empreinte chiffrée avec la clé privée), la non-répudiation (horodatage) et l'authenticité des clés publiques (certificats X.509 émis par une autorité, PKI, SSL/HTTPS).
---

## Hachage (intégrité)
- Une **fonction de hachage** (à sens unique) transforme un message de taille quelconque en une **empreinte de taille fixe**.
- Facile à calculer, **difficile à inverser**, et il doit être impossible de trouver deux messages de même empreinte.
- Contrôle d'intégrité : on recalcule l'empreinte du message reçu ; **si elle est identique**, le message est intègre ; la modification d'un seul bit change l'empreinte.
- **MD5** (Rivest, 1991, RFC 1321) : blocs de 512 bits, empreinte de **128 bits**. **SHA** (NSA et NIST) : blocs de 512 bits, empreinte de **160 bits**, réputé plus sûr que MD5.

## Signature électronique (authenticité)
Elle authentifie l'auteur et garantit que le document n'a pas été modifié (norme ISO 7498-2).
**Génération**
1. Hacher le texte pour obtenir l'empreinte.
2. **Chiffrer l'empreinte avec la clé privée** de l'émetteur : c'est la signature.
**Vérification**
1. Déchiffrer la signature avec la **clé publique** de l'émetteur → empreinte 1.
2. Hacher le texte reçu avec la même fonction → empreinte 2.
3. **Si égales** : message authentifié et intègre ; sinon il y a une incohérence.

## Horodatage (non-répudiation)
- Signature électronique **datée** (« contremarque de temps »), souvent apposée par un **tiers de confiance**.
- Évite qu'un signataire renie sa signature (« j'avais perdu ma clé privée ») ; utile à l'archivage. La preuve doit durer plus longtemps que le certificat (conserver les listes de révocation).

## Certificats
- Problème : qui prouve qu'une clé publique appartient bien à la personne ? Un intrus pourrait publier une fausse clé et lire vos messages ou signer en votre nom.
- Solution : un **certificat** lie une clé publique à une personne (nom, dates de validité, usage autorisé…) par la **signature d'une autorité de certification (CA)**, vérifiable avec la clé publique de la CA. Les **listes de révocation (CRL)** annulent un certificat si la clé privée est compromise.
- Certificat **client** (identifie un utilisateur, carte à puce…) et certificat **serveur** (garantit qu'un site appartient bien à son propriétaire, sécurise via SSL).
- **X.509** : version, numéro de série, algorithme de signature, émetteur, période de validité, sujet, clé publique, extensions, signature de la CA.

## SSL / TLS
Utilisé pour sécuriser les échanges sur Internet : **HTTPS** sur le port **443** au lieu de 80 ; authentifie le serveur (et éventuellement le client) et chiffre les échanges.

## PKI (infrastructure à clés publiques)
Gère à grande échelle l'enregistrement, l'émission, le stockage, la distribution, la révocation et la vérification des clés publiques. Composants : autorité d'enregistrement (RA), autorité de certification (CA), émetteurs de certificats et de listes de révocation, annuaire (LDAP), validation en ligne. Points critiques : distribuer et **stocker très sûrement les clés privées**.

## Questions auxquelles la fiche répond
- À quoi sert une fonction de hachage ?
- Comment fonctionne une signature électronique ?
- Qu'est-ce qu'un certificat et une autorité de certification ?
- Que garantit le cadenas HTTPS ?
