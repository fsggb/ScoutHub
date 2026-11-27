# Audit de sécurité : données sensibles de la fédération (27 novembre 2026)

Périmètre : Workers `auth`, `donnees`, `intranet`, base D1 `scouthub-donnees` (UE), accès chef, outils dynamiques.
Objectif : **seul l'administrateur désigné (`DONNEES_ADMINS`) peut lire les données sensibles.**

## Modèle de protection (de l'extérieur vers les données)

1. **Intranet** : aucune page n'est envoyée sans session valide (contrôle dans le Worker).
2. **Session ordinaire** : jeton aléatoire de 128 caractères, seule son empreinte est en base ; **12 h pour un administrateur** (14 jours pour les autres).
3. **Ouverture des données** : une session ordinaire, même administrateur, ne donne **aucun** accès. Il faut une **ré-authentification Google de moins de 5 minutes** (`/auth/donnees/ouvrir`) qui délivre un **jeton de données de 15 minutes**, en mémoire du navigateur uniquement, révocable (verrouillage, fermeture de la page).
4. **Liste blanche** : l'adresse doit figurer dans `DONNEES_ADMINS` (contrôlée dans `auth` **et** dans `donnees`). Donner le rôle « admin » à un autre compte ne lui ouvre pas les données.
5. **Lecture** : 100 lignes par appel, 2 000 par heure, journal de chaque lecture (qui, quoi, combien, jamais le contenu), refus journalisés.
6. **Base** : séparée de celle des comptes, juridiction UE, colonnes personnelles **chiffrées AES-256-GCM** (liste blanche des colonnes en clair ; toute colonne nouvelle est chiffrée par défaut), clé dans un secret du Worker, jamais dans la base ni le dépôt. Les lignes sont liées à leur emplacement (AAD) : une ligne déplacée ne se déchiffre pas.

## Constats et corrections

| # | Constat | Gravité | État |
|---|---|---|---|
| 1 | La lecture des données ne demandait qu'une session administrateur : un jeton de session volé (stockage du navigateur) aurait suffi | Haute | **Corrigé** : jeton de données séparé, Google récent, 15 min |
| 2 | Tout compte au rôle « admin » aurait pu lire les données | Haute | **Corrigé** : liste blanche `DONNEES_ADMINS` (une adresse) |
| 3 | `/auth/outils` était public et lisait la feuille en usurpant le compte d'une personne | Moyenne | **Corrigé** : session requise, filtrage par visibilité, lecture par l'identité du compte de service |
| 4 | Session administrateur de 14 jours | Moyenne | **Corrigé** : 12 h |
| 5 | Le code lisait un autre classeur que celui de la fédération | Moyenne | **Corrigé** (`CLASSEUR_ID`) |
| 6 | Pages de l'intranet sans en-têtes de base (cadre, base, objets) | Basse | **Corrigé** (CSP de base) |
| 7 | Lien « Procuration » rejeté par le validateur (adresse trop longue) | Basse | **Corrigé** |
| 8 | Accès chef : une adresse personnelle de la feuille ne doit pas donner d'accès | Moyenne | **Conçu ainsi** : seules les adresses `@fsggb.fr` comptent |

## Tests de refus réalisés sur le déploiement réel (tous refusés)

Sans jeton ; session administrateur ordinaire utilisée comme jeton de données ; ancien champ `token` ; jeton aléatoire ; origine étrangère ; méthode GET ; ouverture sans confirmation Google ; jeton de données d'une adresse non listée ; jeton de données expiré. Contrôle de la base : aucune adresse e-mail lisible dans les colonnes en clair ni dans les colonnes chiffrées.

## Risques restants (décisions et actions à votre charge)

| # | Risque | Action |
|---|---|---|
| R1 | **Le jeton Cloudflare** (`scouthub-wrangler-cli`) donne accès à la base, aux Workers et peut redéployer un Worker lisant la clé : il contourne toutes les protections ci-dessus. | Le garder le moins longtemps possible : **expiration courte, révocation à la fin du chantier**, double authentification sur le compte, **second administrateur**. |
| R2 | La clé de chiffrement n'existe qu'à un endroit. Perdue, les données du miroir sont illisibles (la feuille reste la source). | **Copie hors ligne** dans un gestionnaire de mots de passe. |
| R3 | Le compte de service a une délégation à l'échelle du domaine (Gmail, Drive) : s'il fuit, il agit pour n'importe quel compte. | Réduire dans la console Admin Google aux seules portées utiles (retirer Drive complet s'il ne sert pas). Non vérifiable depuis ici. |
| R4 | Le portail (GitHub Pages) garde la session dans le navigateur et contient des scripts en ligne : une faille XSS pourrait la voler. L'impact sur les données est borné par le jeton de données séparé, mais pas nul pendant les 15 minutes d'ouverture. | Terme : retirer les scripts en ligne puis ajouter une CSP stricte ; servir le portail depuis l'intranet (Cloudflare) plutôt que GitHub Pages. |
| R5 | Les anciennes versions de la base (Time Travel D1, 30 jours) conservent des copies **chiffrées** de personnes supprimées de la feuille. | À mentionner dans le registre RGPD ; la clé reste le seul moyen de les lire. |
| R6 | Qui est « l'administrateur des données » ? Le classeur indique « Président : president@fsggb.fr » ; la configuration actuelle : `jb.combet@fsggb.fr`. | **À confirmer.** |
| R7 | Le chemin positif de la ré-authentification Google (bouton → jeton de données → lecture) n'a pas pu être testé automatiquement (il demande une vraie connexion). | À valider une fois par l'administrateur. |
| R8 | Sauvegarde quotidienne vers le Drive non encore faite. | Prévue. |
