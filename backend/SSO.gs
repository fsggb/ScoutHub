/**
 * Connexion unifiée FSGGB : à copier dans chaque application Apps Script qui veut reconnaître la personne déjà
 * connectée à l'intranet (voir docs/connexion-unifiee.md). Aucun secret : le code reçu ne sert qu'une fois, 60 secondes.
 *
 * 1. Dans l'application, choisir un identifiant court (ex. 'agenda'), le même que dans APPS_AUTORISEES
 *    (cloudflare/auth/wrangler.jsonc) et dans la propriété « sso » de l'application (config.js).
 * 2. Dans doGet(e) : var u = ssoUtilisateur_(e, 'agenda'); si u est non nul, la personne est connue
 *    (u.email, u.role, u.name, u.fsggb) ; sinon renvoyer vers l'intranet : https://intranet.fsggb.workers.dev/sortie/agenda
 * 3. Ne faire confiance qu'à cette réponse : un compte avec fsggb === false n'est PAS un membre de la fédération.
 */
var SSO_API = 'https://auth.fsggb.workers.dev/auth/echange/valider';

function ssoUtilisateur_(e, aud) {
  var code = e && e.parameter && e.parameter.code;
  if (!code) return null;
  try {
    var r = UrlFetchApp.fetch(SSO_API, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ code: String(code), aud: aud })
    });
    var o = JSON.parse(r.getContentText());
    return o && o.ok ? o.user : null;   // { email, role, name, google, picture, fsggb, groupe_id, unite_id }
  } catch (err) { return null; }
}
