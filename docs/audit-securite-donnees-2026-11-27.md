# Audit de sécurité : données sensibles de la fédération (27 novembre 2026)

Périmètre : Workers `auth`, `donnees`, `intranet`, base D1 `scouthub-donnees` (UE), accès chef, outils dynamiques.
Objectif : **seul l'administrateur désigné (`DONNEES_ADMINS`) peut lire les données sensibles.**

## Modèle de protection (de l'extérieur vers les données)

1. **Intranet** : aucune page n'est envoyée sans session valide (contrôle dans le Worker).
2. **Session ordinaire** : jeton aléatoire de 128 caractères, seule son empreinte est en base ; **12 h pour un administrateur** (14 jours pour les autres).
3. **Ouverture des données** : l'accès passe par un **jeton de données de 15 minutes** (`/auth/donnees/ouvrir`), en mémoire du navigateur uniquement, renouvelé en silence tant que l'onglet est ouvert, révocable (verrouillage, fermeture de la page). Décision du 27/11 : la session administrateur (Google uniquement, 12 h) suffit à l'obtenir, sans reconnexion ; la ré-authentification Google récente reste disponible (`DONNEES_REAUTH=1`).
4. **Liste blanche** : l'adresse doit figurer dans `DONNEES_ADMINS` (jb.combet, president et service-informatique @fsggb.fr ; contrôlée dans `auth` **et** dans `donnees`). Donner le rôle « admin » à un autre compte ne lui ouvre pas les données.
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
| R6 | Trois adresses ouvrent les données (liste blanche `DONNEES_ADMINS`). Sans ré-authentification, un jeton de session administrateur volé suffit à les lire pendant 12 h. | Risque accepté par l'administrateur ; limité par le plafond de lecture et le journal. `DONNEES_REAUTH=1` le referme. |
| R7 | Le chemin positif de la ré-authentification Google (bouton → jeton de données → lecture) n'a pas pu être testé automatiquement (il demande une vraie connexion). | À valider une fois par l'administrateur. |
| R8 | Sauvegarde quotidienne vers le Drive non encore faite. | Prévue. |

## Mise à jour : registre des inscriptions et droits par adresse (27/11, soir)

**Modèle d'accès** (remplace « administrateur seul ») : chaque personne ne reçoit que les lignes de sa **portée**, calculée par le serveur d'après son adresse de connexion (`/auth/portee`) :

| Profil | Voit |
|---|---|
| Administrateur des données (`DONNEES_ADMINS`) | tout, y compris Compta et Groupes et unités |
| Chef de groupe (ligne « Ville : Groupe » de la feuille « Groupes et unités », adresse @fsggb.fr) | les 4 registres, pour son groupe |
| Chef d'unité (autres lignes) | les 4 registres, pour son unité |
| Adhérent, parent, équipe nationale, compte externe | rien |

Le filtre est dans la **requête SQL, avant tout déchiffrement** (colonnes `gk`/`uk`, jamais les noms bruts). Aucun paramètre envoyé par le navigateur ne peut élargir la portée.

**Vérifié sur le déploiement réel** (comptes de test) : chef d'unité 104 lignes Mineurs / chef de groupe 383, comptage identique à la base, **0 ligne hors périmètre** sur la liste et sur la recherche ; un chef qui force un autre groupe par le filtre reçoit 0 ligne ; Compta et Groupes et unités refusés aux chefs ; refus de `comme`, `sync`, `etat`, `habilites` aux chefs ; adhérent, compte externe, jeton forgé, absence de jeton : refusés.

**Entrées ajoutées par l'administrateur** (applications, documentation) : filtrées côté serveur ; une entrée non destinée à la personne ne lui est **pas envoyée** (ni nom, ni adresse, ni public). Seul l'administrateur voit le public de chaque entrée. Adresses `https://` uniquement, public validé contre les groupes/unités existants. Vérifié : admin seul / chefs / groupe / unité / tous / équipe nationale → chaque profil ne voit que les siennes ; écriture refusée aux non-administrateurs.

**Simulation d'une adresse** : réservée à `DONNEES_ADMINS` ; la portée simulée est calculée comme pour la vraie personne ; chaque lecture simulée est journalisée (`simule`). Elle ne donne aucune écriture.

**Limites connues** : (1) une adresse n'a qu'**une** portée : si une même boîte figure pour deux unités de groupes différents, seule la première (ou la plus haute) compte ; (2) les lignes dont le groupe ou l'unité ne correspond à aucune ligne de « Groupes et unités » sont **invisibles des chefs** (l'onglet Administration → Données les compte) ; (3) la recherche porte sur 1 500 lignes de la sélection au plus ; (4) le service worker du portail ne met en cache que des fichiers statiques du même site, jamais les données.

**Faute corrigée pendant le chantier** : un import supprimé par erreur avait fait planter le Worker `donnees` (erreur 1101) ; détecté par les tests de bout en bout, corrigé et re-testé avant toute mise en service.

## Mise à jour : simulation sur tout le site, images du Drive (27/11, nuit)

**Simulation (« voir le site comme »)** : réservée aux adresses de `DONNEES_ADMINS`, lancée depuis Administration → Simulation. L'état vit dans `sessionStorage` (cet onglet seulement, jamais sur disque) ; le profil réel n'est jamais écrasé dans le stockage permanent. Le serveur n'accepte `comme` que sur des **lectures** (`/auth/profil`, `/auth/outils`, `/auth/entrees`, `/auth/menu`, `/auth/portee`, `/donnees/*`) et seulement d'un administrateur désigné ; il ne l'accepte sur aucune écriture. Pendant la simulation l'interface retire les droits d'administrateur (menus, boutons d'ajout, onglet Administration). Un non-administrateur qui forcerait la valeur dans son navigateur reçoit un refus du serveur. Chaque lecture de données simulée est journalisée (`simule`). *Limite* : le chemin complet avec un vrai administrateur n'a pas été testé de bout en bout ; la logique du navigateur l'a été avec des réponses de serveur simulées.

**Images du Drive** : route `/img/…` de l'intranet, **lecture seule** (portée `drive.readonly`), session requise, limitée au sous-dossier `Images/`, aux types image et à 4 Mo, sans remontée de dossier ; la base de l'ancienne application AppSheet n'est ni lue ni servie. Résultat mémorisé 1 jour. Tant que le dossier n'est pas partagé avec le compte de service, la route répond « image inconnue » et le site garde ses logos par défaut. Un diagnostic temporaire (noms de dossiers seulement) a servi à constater ce défaut de partage et a été retiré.
