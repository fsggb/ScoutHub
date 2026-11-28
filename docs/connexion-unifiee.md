# Connexion unifiée de la fédération

Une personne se connecte **une fois** (Google ou code e-mail) ; l'intranet et les applications extérieures la reconnaissent.

## Les pièces

| Pièce | Rôle |
|---|---|
| `auth.fsggb.workers.dev` (`cloudflare/auth/`) | Identité unique : comptes, sessions, codes d'échange. Base D1 commune. |
| `intranet.fsggb.workers.dev` (`cloudflare/intranet/`) | Portail servi **uniquement aux personnes connectées** : le contrôle se fait dans le Worker, avant d'envoyer la page. Cookie `HttpOnly`. |
| `fsggb.github.io/ScoutHub` | Portail public de test des applications ; la connexion passe par `auth.fsggb.workers.dev` (`config.js`). Le contrôle avant envoi y est impossible (zone GitHub). |

## Brancher une application extérieure (ex. Apps Script)

1. Choisir un identifiant court, ex. `agenda`.
2. L'ajouter à `APPS_AUTORISEES` dans `cloudflare/auth/wrangler.jsonc` (déjà fait pour `boutique`, `gestion-unite`, `comptabilite`, `annuaire`, `agenda`), puis `cd cloudflare/auth && npx wrangler deploy`.
3. Dans l'application : coller `backend/SSO.gs` et appeler `ssoUtilisateur_(e, 'agenda')` au début de `doGet`.
4. Côté intranet : ajouter `"agenda": "<adresse /exec de l'application>"` dans `APPS_EXTERNES` (`cloudflare/intranet/wrangler.jsonc`), redéployer.
5. Côté portail : ajouter `sso: "agenda"` à l'entrée de l'application dans `config.js`. Au clic, le portail demande un code et ouvre `adresse?code=…&aud=agenda`.

## Sécurité

- Le code est à usage unique, valable 60 s, lié à l'application (`aud`) ; un essai avec un autre `aud` le détruit.
- Seule l'empreinte du code est stockée (table D1 `echanges`).
- Un compte Google personnel (`fsggb: false`) obtient une session « membre » mais **n'est pas** un membre de la fédération : les applications doivent tester `user.fsggb`.
- Le cookie de l'intranet n'est jamais transmis à la production ni aux applications.
- Google : l'origine `https://intranet.fsggb.workers.dev` doit figurer dans les « origines JavaScript autorisées » du client OAuth, sinon seul le code e-mail fonctionne sur l'intranet.
