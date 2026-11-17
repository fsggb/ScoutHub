---
id: app-scouthub
titre: ScoutHub, le portail des applications FSGGB
theme: Applications
type: application
sources:
  - titre: ScoutHub - fiche CHATGDB.md
    url: https://github.com/fsggb/ScoutHub/blob/main/CHATGDB.md
  - titre: ScoutHub - README.md
    url: https://github.com/fsggb/ScoutHub/blob/main/README.md
  - titre: ScoutHub - scouthub-client.js
    url: https://github.com/fsggb/ScoutHub/blob/main/scouthub-client.js
  - titre: ScoutHub - apps.txt et config.js
    url: https://github.com/fsggb/ScoutHub/blob/main/apps.txt
  - titre: ScoutHub - docs/projet-chatgdb.md
    url: https://github.com/fsggb/ScoutHub/blob/main/docs/projet-chatgdb.md
  - titre: ScoutHub - aide.html, compte.html, backend/Code.gs
    url: https://github.com/fsggb/ScoutHub
mots_cles: ScoutHub, portail, accueil, connexion, compte, Google, mot de passe, rôles, session, applications, tuiles, administration, ScoutHub.connecte, scouthub-client.js, apps.txt, crédits, aide
liens: applications-panorama, app-chatgdb, app-scoutbibliotheque, app-scoutmap, app-cathia, app-soleadworks
resume: ScoutHub est la page d'accueil unique des outils numériques de la FSGGB, qui réunit toutes les applications sur un même site. La fiche explique comment s'y connecter une seule fois pour toutes les applications, les rôles, la page d'aide, l'API JavaScript ScoutHub offerte aux applications et la façon d'ajouter une nouvelle application au portail.
---

## À quoi sert ScoutHub
ScoutHub (https://fsggb.github.io/ScoutHub/) est le portail de la Fédération des Scouts et Guides Godefroy de Bouillon (FSGGB). Il rassemble sur une seule page, rangées par rubriques, toutes les applications utiles aux chefs, aux scouts et aux familles : assistant ChatGDB, bibliothèque de documents, bureautique, création graphique, vidéo et son, conception 3D et cartographie. La boutique de la fédération (https://boutique.fsggb.fr/) y a aussi sa tuile.

- **Toutes les applications sont accessibles sans compte.** On clique sur une tuile et l'application s'ouvre.
- Un **compte** (Google, ou adresse e-mail + mot de passe) sert seulement à ChatGDB, à la Bibliothèque, à l'Aide, à « Mon compte » et à l'administration (tuiles marquées comme protégées).
- **ScoutHub ne garde aucun fichier** : chaque application enregistre sur l'ordinateur (ou dans le navigateur) de l'utilisateur. Mon compte le rappelle : « Vos fichiers restent sur votre appareil : ScoutHub n'en conserve aucune copie. »

## Rubriques de l'accueil (disposition d'origine)
- **Assistant** : ChatGDB (/ChatGDB/).
- **Boutique** : Boutique GDB (uniformes, insignes, accessoires).
- **Ressources et aide** : Bibliothèque (/ScoutBibliotheque/), Aide (/aide.html).
- **Bureautique** : Word = WordCraft (/Word/), Excel = GridCraft (/Excel/), PowerPoint = DeckCraft (/PowerPoint/), Acrobat = PDFCraft (/PDF/).
- **Création** : Photoshop = PhotoCraft (/Photoshop/), Illustrator = VectorCraft (/Illustrator/), InDesign = DesignCraft (/InDesign/), Lightroom = LightCraft (/Lightroom/), Figma = FigCraft (/Figma/), Excalidraw (/Draw/), Premiere Pro = FilmCraft (/Premiere/), After Effects = EffectCraft (/AfterEffects/), Pro Tools = SoundCraft (/ProTools/), Substance Painter = TextureCraft (/SubstancePainter/).
- **Conception et CAO** : CathIA (/CathIA/), SoLeadWorks (/SoLeadWorks/?lang=fr), AutoCAD = CADCraft (/CADCraft/?lang=fr), SolidWorks = SolidCraft (/SolidCraft/?lang=fr).
- **Cartographie** : Cartes IGN = ScoutMap (/ScoutMap/).

Les noms affichés sur les tuiles sont ceux des logiciels connus (Word, Photoshop…) pour qu'on s'y retrouve ; l'application elle-même garde son nom d'origine (WordCraft, PhotoCraft…). Ce ne sont **pas** les logiciels de Microsoft, Adobe ou Autodesk, mais des équivalents libres et gratuits. L'administrateur peut réordonner, masquer ou renommer les tuiles (Administration, onglet « Affichage du portail ») : l'accueil vu par chacun peut donc différer de cette liste.

## Se connecter une fois pour toutes les applications
1. Sur l'accueil, cliquer sur « Se connecter » (ou ouvrir une application protégée : on est renvoyé à la connexion).
2. Choisir **Continuer avec Google**, ou saisir adresse e-mail et mot de passe.
3. Après la connexion, on revient automatiquement à la page demandée (paramètre `next`).
4. La session est rangée dans le stockage du site fsggb.github.io, commun à toutes les applications du site : **une seule connexion suffit** pour ChatGDB, la Bibliothèque, l'Aide, etc., jusqu'à la déconnexion ou l'expiration (14 jours sur cet appareil d'après la page Mon compte et le serveur).
5. Se déconnecter (Mon compte > Se déconnecter) déconnecte partout et révoque la session côté serveur.

Sécurité : mots de passe salés et hachés (jamais en clair), cinq échecs de connexion bloquent l'adresse dix minutes, jetons Google vérifiés auprès de Google (audience, émetteur, expiration). Un compte Google n'a pas de mot de passe ScoutHub.

## Rôles
Du plus au moins privilégié : administrateur, chef de groupe, chef d'unité, parent, membre. Seul l'administrateur change les rôles (page Administration). Le rôle sert par exemple à réserver certaines rubriques de la Bibliothèque aux chefs.

## Mon compte et Aide
- **Mon compte** (compte.html) : adresse e-mail, profil, changement du mot de passe (sauf compte Google), session et déconnexion.
- **Aide** (aide.html) : « Écrire au service informatique avec ChatGDB ». ChatGDB pose quelques questions (quelle application, que s'est-il passé, depuis quand), peut demander une capture d'écran, puis rédige le message ; l'utilisateur le relit et le valide avant l'envoi (rien ne part sans son accord, 5 envois par jour au plus). Conseils pour être aidé vite : indiquer l'application, ce qu'on essayait de faire, le message d'erreur, joindre une capture, préciser appareil et navigateur. Autre moyen : fsggb@fsggb.fr.

## Crédits ChatGDB gagnés en utilisant les applications
ChatGDB fonctionne avec des crédits (limite par session de 5 heures et par semaine). Utiliser les outils rapporte 1 crédit par tranche de 5 minutes d'activité réelle (page visible, geste récent), avec un plafond hebdomadaire. Le script commun ne lit rien de la page : il signale seulement le temps actif au serveur, qui applique la règle. Ce gain ne vaut que dans les applications qui chargent le client ScoutHub (connecté).

## Comment les applications arrivent sur ScoutHub
Chaque application reste dans son propre dépôt, **sans modification** (ni nom, ni icône, ni script ajouté). Le fichier `apps.txt` les liste, une ligne par application : `<type> <dossier> <dépôt> [paramètre]`. Types :
- `release` : dernière version publiée du dépôt (archive web), rapide, sans compilation (WordCraft, GridCraft, DeckCraft, PDFCraft, PhotoCraft, FilmCraft, VectorCraft, DesignCraft, LightCraft, FigCraft, TextureCraft, EffectCraft, SoundCraft) ;
- `trunk` : compilation Rust vers WebAssembly depuis le dernier commit (SolidCraft, CADCraft, SoLeadWorks) ;
- `excali` : compilation d'Excalidraw (Node) depuis le dernier commit (Draw) ;
- `static` : site statique cloné tel quel (CathIA, ScoutMap, ChatGDB, ScoutBibliotheque).
Le déploiement va chercher la dernière version chaque nuit et dès qu'une version change (vérification toutes les 15 minutes, workflow « Synchroniser »), puis la sert sous `https://fsggb.github.io/ScoutHub/<dossier>/`. Un service worker (`sw.js`) garde en cache les gros fichiers WebAssembly : la première ouverture d'une application est normale, les suivantes sont quasi instantanées.

## Brancher une nouvelle application
1. Ajouter une ligne dans `apps.txt` (type `release`, `trunk`, `excali` ou `static`).
2. Ajouter une tuile dans `config.js` (`SCOUTHUB_APPS` : rubrique `group`, `name`, `desc`, `url`, `icon`, éventuellement `featured`, `protege`), ou plus simplement « Ajouter un lien d'application » dans la console d'administration.
3. `git push` : le déploiement fait le reste.
4. Pour que ChatGDB connaisse l'application, placer une fiche `CHATGDB.md` dans son dépôt et ajouter le dépôt à `knowledge-repos.txt`.

## API JavaScript ScoutHub (pour les développeurs d'applications)
Une application du même site charge `<script src="/ScoutHub/scouthub-client.js" data-app="MonAppli"></script>` puis utilise l'objet `window.ScoutHub` :
- `ScoutHub.connecte()` : vrai si la personne est connectée (une seule connexion pour tout le site).
- `await ScoutHub.utilisateur()` : `{ email, role, name }` ou `null` ; `await ScoutHub.verifier()` revalide la session auprès du serveur (action `me`).
- `ScoutHub.seConnecter(retour?)` : ouvre la page de connexion ScoutHub puis revient à la page.
- `await ScoutHub.seDeconnecter()` : déconnecte partout.
- `ScoutHub.surChangement(fn)` : appelle `fn(utilisateur)` à la connexion ou à la déconnexion, même depuis un autre onglet.
- `await ScoutHub.api("monappli", "action", {…})` : appelle le module « monappli » du serveur ScoutHub avec la session.
- `ScoutHub.donnees.lire("cle")`, `.ecrire("cle", valeur)`, `.effacer("cle")`, `.liste()` : données de **cette** application pour **cette** personne, gardées sur le serveur.
- Autres : `ScoutHub.jeton()`, `ScoutHub.appel(action, données)`, `ScoutHub.ready`, `ScoutHub.app`, `ScoutHub.hubUrl` ; anciens noms gardés : `loggedIn()`, `user()`.
Les erreurs sont des exceptions en français (« Serveur ScoutHub injoignable (connexion internet ?) », « Session expirée »…). Une session expirée est effacée automatiquement.

## Liens d'action
- `https://fsggb.github.io/ScoutHub/index.html?connexion=1&next=<page>` : ouvre la connexion puis renvoie vers `<page>` (chemin relatif au portail, par exemple `ChatGDB/`).
- `?boutique=…` : retour vers la boutique après connexion (utilisé par la boutique elle-même).

## Limites
- ScoutHub ne stocke pas de fichiers ; l'ancien stockage GitHub (ScoutCloud) a été supprimé ; ScoutCloud sur Google Drive n'est pas encore ouvert.
- Les applications « Craft » sont en version alpha : utiles mais incomplètes ; garder des copies de ses fichiers.

## Questions auxquelles la fiche répond
- Qu'est-ce que ScoutHub et quelles applications y trouve-t-on ?
- Faut-il un compte pour utiliser les applications ?
- Comment se connecter une seule fois pour toutes les applications ? Combien de temps dure la session ?
- Où sont enregistrés mes fichiers ?
- Pourquoi la tuile s'appelle « Word » alors que l'application s'appelle WordCraft ?
- Comment demander de l'aide au service informatique ?
- Comment gagner des crédits ChatGDB ?
- Comment ajouter une nouvelle application au portail ? Comment utiliser l'API `ScoutHub.*` ?
