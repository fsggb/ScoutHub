/**
 * ScoutHub : serveur d'identification (Google Apps Script, web app).
 *
 * Propriétés du script (Paramètres du projet > Propriétés du script) :
 *   GOOGLE_CLIENT_ID : (facultatif, à renseigner plus tard) identifiant client OAuth « Application Web »
 *                      du projet Google Cloud. C'est un identifiant PUBLIC, pas une clé secrète.
 *                      Tant qu'il est vide, la connexion Google est désactivée.
 *
 * Déploiement : Déployer > Nouveau déploiement > Application Web,
 *   exécuter en tant que « Moi », accès « Tout le monde ».
 *
 * Le stockage de fichiers sur GitHub a été supprimé : ce serveur ne gère plus que les comptes, les rôles
 * et les sessions. Les mots de passe ne sont jamais stockés en clair : sel aléatoire + SHA-256 itéré.
 * Les requêtes sont des POST JSON envoyés en text/plain (pas de pré-vol CORS).
 */
var ADMIN_EMAIL = 'jb.combet@fsggb.fr';
// Empreinte du mot de passe initial de l'administrateur (changez-le après la première connexion).
var ADMIN_SALT = 'bbbe881e3ba73791ec4b1440211c592c';
var ADMIN_HASH = 'd8620ec1d5b9b29559f1829b9cd29a705533090d784f01b303453054cb8a7bfe';
// Change à chaque réinitialisation du mot de passe administrateur initial.
var ADMIN_RESET_ID = '2026-11-03';
// Rôles, du moins au plus privilégié. « user » (ancien nom) vaut « membre ».
var ROLES = ['membre', 'parent', 'chef_unite', 'chef_groupe', 'admin'];
var ROUNDS = 5000;
var SESSION_DAYS = 30;
var MAX_FAILS = 5;
var LOCK_SECONDS = 600;
var SESSION_CACHE_SECONDS = 600;

function doGet() {
  return json_({ ok: true, service: 'ScoutHub' });
}

// Actions qui modifient des données : seules elles prennent le verrou. Les lectures (list, get, me, login...)
// ne sont plus mises en file derrière un enregistrement de fichier, ce qui accélère nettement ScoutCloud.
var WRITES = { register: 1, google: 1, changePassword: 1, adminReset: 1, adminDelete: 1, adminSetRole: 1 };

function doPost(e) {
  var lock = null;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var handler = ACTIONS[req.action];
    if (!handler) return json_({ ok: false, error: 'Action inconnue.' });
    if (WRITES[req.action]) { lock = LockService.getScriptLock(); lock.waitLock(20000); }
    return json_(handler(req));
  } catch (err) {
    return json_({ ok: false, error: err && err.userMessage ? err.userMessage : 'Erreur du serveur.' });
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (x) { /* ignore */ } }
  }
}

var ACTIONS = {
  register: function (r) {
    var email = cleanEmail_(r.email);
    checkPassword_(r.password);
    if (getUser_(email)) fail_('Un compte existe déjà pour cette adresse.');
    saveUser_(email, newCredential_(r.password), { role: 'membre', created: Date.now() });
    return { ok: true, token: newSession_(email), user: publicUser_(email) };
  },
  login: function (r) {
    var email = cleanEmail_(r.email);
    throttle_(email);
    var u = getUser_(email);
    if (!u || !verify_(u, r.password)) { recordFail_(email); fail_('Adresse ou mot de passe incorrect.'); }
    clearFails_(email);
    return { ok: true, token: newSession_(email), user: publicUser_(email) };
  },
  // Connexion Google (Google Identity Services) : le navigateur envoie le jeton d'identité (« credential »),
  // vérifié ici auprès de Google ; le compte est créé au premier passage. Inactive sans GOOGLE_CLIENT_ID.
  google: function (r) {
    var clientId = props_().getProperty('GOOGLE_CLIENT_ID');
    if (!clientId) fail_('La connexion Google n\'est pas encore activée.');
    var info = verifyGoogle_(r.credential, clientId);
    var email = cleanEmail_(info.email), u = getUser_(email);
    if (!u) {
      // Pas de mot de passe : un sel aléatoire sans mot de passe connu rend la connexion par mot de passe impossible.
      var cred = newCredential_(Utilities.getUuid() + Utilities.getUuid());
      saveUser_(email, cred, { role: 'membre', created: Date.now(), name: info.name || '', google: true });
    } else if (!u.google || (!u.name && info.name)) {
      saveUser_(email, { salt: u.salt, hash: u.hash }, { role: u.role, created: u.created, name: u.name || info.name || '', google: true });
    }
    return { ok: true, token: newSession_(email), user: publicUser_(email) };
  },
  // Configuration publique pour le navigateur (la connexion Google est-elle prête ?).
  config: function () {
    return { ok: true, google: !!props_().getProperty('GOOGLE_CLIENT_ID') };
  },
  adminSetRole: function (r) {
    requireAdmin_(r.token);
    var email = cleanEmail_(r.email), u = getUser_(email);
    if (!u) fail_('Compte introuvable.');
    if (ROLES.indexOf(r.role) < 0) fail_('Rôle inconnu.');
    if (email === ADMIN_EMAIL && r.role !== 'admin') fail_('Le compte administrateur garde son rôle.');
    saveUser_(email, { salt: u.salt, hash: u.hash }, { role: r.role, created: u.created, name: u.name, google: u.google });
    return { ok: true };
  },
  logout: function (r) {
    var sid = sha_(String(r.token || ''));
    CacheService.getScriptCache().remove('sc:' + sid);
    PropertiesService.getScriptProperties().deleteProperty('s:' + sid);
    return { ok: true };
  },
  me: function (r) {
    return { ok: true, user: publicUser_(session_(r.token)) };
  },
  changePassword: function (r) {
    var email = session_(r.token);
    var u = getUser_(email);
    if (!verify_(u, r.oldPassword)) fail_('Mot de passe actuel incorrect.');
    checkPassword_(r.newPassword);
    saveUser_(email, newCredential_(r.newPassword), u);
    return { ok: true };
  },
  adminList: function (r) {
    requireAdmin_(r.token);
    return { ok: true, users: allUsers_() };
  },
  adminReset: function (r) {
    requireAdmin_(r.token);
    var email = cleanEmail_(r.email);
    var u = getUser_(email);
    if (!u) fail_('Compte introuvable.');
    checkPassword_(r.newPassword);
    saveUser_(email, newCredential_(r.newPassword), u);
    return { ok: true };
  },
  adminDelete: function (r) {
    requireAdmin_(r.token);
    var email = cleanEmail_(r.email);
    if (email === ADMIN_EMAIL) fail_('Le compte administrateur ne peut pas être supprimé.');
    PropertiesService.getScriptProperties().deleteProperty('u:' + email);
    return { ok: true };
  }
};

// ---------- utilitaires ----------
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function fail_(msg) { var e = new Error(msg); e.userMessage = msg; throw e; }
function props_() { return PropertiesService.getScriptProperties(); }
function sha_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function hashPassword_(salt, pw) {
  var st = salt + ':' + pw;
  for (var i = 0; i < ROUNDS; i++) st = sha_(st + salt + pw);
  return st;
}
function newCredential_(pw) {
  var salt = sha_(Utilities.getUuid() + Utilities.getUuid() + Date.now()).slice(0, 32);
  return { salt: salt, hash: hashPassword_(salt, pw) };
}
function verify_(u, pw) {
  return !!u && typeof pw === 'string' && hashPassword_(u.salt, pw) === u.hash;
}
function cleanEmail_(v) {
  var e = String(v || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || e.length > 120) fail_('Adresse e-mail invalide.');
  return e;
}
function checkPassword_(pw) {
  if (typeof pw !== 'string' || pw.length < 8 || pw.length > 200) fail_('Le mot de passe doit contenir au moins 8 caractères.');
}
function getUser_(email) {
  var raw = props_().getProperty('u:' + email), found = raw ? JSON.parse(raw) : null;
  if (found && (email !== ADMIN_EMAIL || found.rid === ADMIN_RESET_ID)) return found;
  if (email === ADMIN_EMAIL) {
    var admin = { salt: ADMIN_SALT, hash: ADMIN_HASH, role: 'admin', created: Date.now(), rid: ADMIN_RESET_ID };
    props_().setProperty('u:' + email, JSON.stringify(admin));
    return admin;
  }
  return null;
}
function saveUser_(email, cred, base) {
  props_().setProperty('u:' + email, JSON.stringify({
    salt: cred.salt, hash: cred.hash, role: email === ADMIN_EMAIL ? 'admin' : normRole_(base.role), created: base.created || Date.now(), rid: ADMIN_RESET_ID,
    name: base.name || '', google: !!base.google
  }));
}
function normRole_(r) { return r === 'user' || !r ? 'membre' : (ROLES.indexOf(r) >= 0 ? r : 'membre'); }
function publicUser_(email) {
  var u = getUser_(email);
  return { email: email, role: normRole_(u.role), name: u.name || '', google: !!u.google };
}
function allUsers_() {
  var all = props_().getProperties(), out = [];
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('u:') === 0) { var u = JSON.parse(all[k]); out.push({ email: k.slice(2), role: normRole_(u.role), created: u.created, google: !!u.google }); }
  });
  getUser_(ADMIN_EMAIL);
  return out.sort(function (a, b) { return a.email < b.email ? -1 : 1; });
}
function newSession_(email) {
  var token = sha_(Utilities.getUuid() + Utilities.getUuid() + Date.now()) + sha_(Utilities.getUuid());
  props_().setProperty('s:' + sha_(token), JSON.stringify({ email: email, exp: Date.now() + SESSION_DAYS * 864e5 }));
  return token;
}
function session_(token) {
  var id = sha_(String(token || '')), cache = CacheService.getScriptCache();
  var hit = cache.get('sc:' + id);
  if (hit) return hit;
  var email = sessionUncached_(token);
  cache.put('sc:' + id, email, SESSION_CACHE_SECONDS);
  return email;
}
function sessionUncached_(token) {
  var raw = props_().getProperty('s:' + sha_(String(token || '')));
  if (!raw) fail_('Session expirée : reconnectez-vous.');
  var s = JSON.parse(raw);
  if (s.exp < Date.now() || !getUser_(s.email)) { props_().deleteProperty('s:' + sha_(String(token))); fail_('Session expirée : reconnectez-vous.'); }
  return s.email;
}
function verifyGoogle_(credential, clientId) {
  if (typeof credential !== 'string' || credential.length < 100 || credential.length > 4000) fail_('Jeton Google invalide.');
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) fail_('Jeton Google refusé.');
  var info = JSON.parse(res.getContentText());
  if (info.aud !== clientId) fail_('Jeton Google destiné à une autre application.');
  if (info.iss !== 'accounts.google.com' && info.iss !== 'https://accounts.google.com') fail_('Jeton Google invalide.');
  if (String(info.email_verified) !== 'true' || !info.email) fail_('Adresse Google non vérifiée.');
  if (Number(info.exp) * 1000 < Date.now()) fail_('Jeton Google expiré.');
  return info;
}
function requireAdmin_(token) {
  var email = session_(token);
  if (getUser_(email).role !== 'admin') fail_('Réservé à l\'administrateur.');
  return email;
}
function throttle_(email) {
  var n = Number(CacheService.getScriptCache().get('f:' + email) || 0);
  if (n >= MAX_FAILS) fail_('Trop de tentatives. Réessayez dans quelques minutes.');
}
function recordFail_(email) {
  var c = CacheService.getScriptCache(), n = Number(c.get('f:' + email) || 0) + 1;
  c.put('f:' + email, String(n), LOCK_SECONDS);
}
function clearFails_(email) { CacheService.getScriptCache().remove('f:' + email); }
