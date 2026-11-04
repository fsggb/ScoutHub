/**
 * ScoutHub : serveur de comptes et de fichiers (Google Apps Script, web app).
 *
 * Propriétés du script (Paramètres du projet > Propriétés du script) :
 *   GITHUB_TOKEN : jeton GitHub (fine-grained) avec « Contents : lecture/écriture »
 *                  sur le dépôt de données UNIQUEMENT.
 *   DATA_REPO    : dépôt PRIVÉ des fichiers, au format « organisation/depot ».
 *
 * Déploiement : Déployer > Nouveau déploiement > Application Web,
 *   exécuter en tant que « Moi », accès « Tout le monde ».
 *
 * Les mots de passe ne sont jamais stockés en clair : sel aléatoire + SHA-256 itéré.
 * Les requêtes sont des POST JSON envoyés en text/plain (pas de pré-vol CORS).
 */
var ADMIN_EMAIL = 'jb.combet@fsggb.fr';
// Empreinte du mot de passe initial de l'administrateur (changez-le après la première connexion).
var ADMIN_SALT = 'bbbe881e3ba73791ec4b1440211c592c';
var ADMIN_HASH = 'd8620ec1d5b9b29559f1829b9cd29a705533090d784f01b303453054cb8a7bfe';
// Change à chaque réinitialisation du mot de passe administrateur initial.
var ADMIN_RESET_ID = '2026-11-03';
var ROUNDS = 5000;
var SESSION_DAYS = 30;
var MAX_FILE_BYTES = 10 * 1024 * 1024;
var MAX_FAILS = 5;
var LOCK_SECONDS = 600;
var LIST_CACHE_SECONDS = 300;
var SESSION_CACHE_SECONDS = 600;

function doGet() {
  return json_({ ok: true, service: 'ScoutHub' });
}

// Actions qui modifient des données : seules elles prennent le verrou. Les lectures (list, get, me, login...)
// ne sont plus mises en file derrière un enregistrement de fichier, ce qui accélère nettement ScoutCloud.
var WRITES = { register: 1, changePassword: 1, adminReset: 1, adminDelete: 1, put: 1, remove: 1 };

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
    saveUser_(email, newCredential_(r.password), { role: 'user', created: Date.now() });
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
  },
  list: function (r) {
    var path = userPath_(session_(r.token), r.path);
    var cache = CacheService.getScriptCache(), key = 'l:' + sha_(path).slice(0, 40);
    var hit = cache.get(key);
    if (hit) return { ok: true, entries: JSON.parse(hit) };
    var res = gh_('GET', path, null, 'application/vnd.github+json');
    if (res.code === 404) return { ok: true, entries: [] };
    if (res.code !== 200) fail_('GitHub a refusé la lecture (' + res.code + ').');
    var data = JSON.parse(res.text);
    if (!Array.isArray(data)) fail_('Ce chemin est un fichier.');
    var entries = data.map(function (x) { return { name: x.name, type: x.type, size: x.size }; });
    var txt = JSON.stringify(entries);
    if (txt.length < 90000) cache.put(key, txt, LIST_CACHE_SECONDS);
    return { ok: true, entries: entries };
  },
  get: function (r) {
    var res = gh_('GET', userPath_(session_(r.token), r.path), null, 'application/vnd.github.raw');
    if (res.code !== 200) fail_('Fichier introuvable.');
    return { ok: true, base64: Utilities.base64Encode(res.bytes) };
  },
  put: function (r) {
    var email = session_(r.token);
    if (!r.base64 || r.base64.length > MAX_FILE_BYTES * 1.4) fail_('Fichier vide ou trop volumineux (10 Mo maximum).');
    var path = userPath_(email, r.path);
    var cur = gh_('GET', path, null, 'application/vnd.github+json');
    var body = { message: 'ScoutHub : enregistrement', content: r.base64 };
    if (cur.code === 200) { var meta = JSON.parse(cur.text); if (meta.sha) body.sha = meta.sha; }
    var res = gh_('PUT', path, body, 'application/vnd.github+json');
    if (res.code !== 200 && res.code !== 201) fail_('GitHub a refusé l\'écriture (' + res.code + ').');
    dropListCache_(path);
    return { ok: true };
  },
  remove: function (r) {
    var path = userPath_(session_(r.token), r.path);
    var cur = gh_('GET', path, null, 'application/vnd.github+json');
    if (cur.code !== 200) fail_('Fichier introuvable.');
    var res = gh_('DELETE', path, { message: 'ScoutHub : suppression', sha: JSON.parse(cur.text).sha }, 'application/vnd.github+json');
    if (res.code !== 200) fail_('Suppression refusée (' + res.code + ').');
    dropListCache_(path);
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
    salt: cred.salt, hash: cred.hash, role: email === ADMIN_EMAIL ? 'admin' : (base.role || 'user'), created: base.created || Date.now(), rid: ADMIN_RESET_ID
  }));
}
function publicUser_(email) {
  var u = getUser_(email);
  return { email: email, role: u.role };
}
function allUsers_() {
  var all = props_().getProperties(), out = [];
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('u:') === 0) { var u = JSON.parse(all[k]); out.push({ email: k.slice(2), role: u.role, created: u.created }); }
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

// ---------- GitHub (dépôt de données privé) ----------
function userPath_(email, sub) {
  var parts = String(sub || '').split('/').filter(function (p) { return p; });
  parts.forEach(function (p) {
    if (p === '.' || p === '..' || /[\\\u0000-\u001f]/.test(p) || p.length > 120) fail_('Chemin invalide.');
  });
  var p = props_();
  var repo = p.getProperty('DATA_REPO');
  if (!repo || !p.getProperty('GITHUB_TOKEN')) fail_('Stockage GitHub non configuré.');
  var base = 'repos/' + repo + '/contents/users/' + sha_(email).slice(0, 24);
  return base + (parts.length ? '/' + parts.map(encodeURIComponent).join('/') : '');
}
// Les listes de dossiers sont gardées quelques minutes ; toute écriture invalide le dossier et ses parents.
function dropListCache_(path) {
  var parts = path.split('/'), keys = [];
  for (var n = parts.length - 1; n >= 6; n--) keys.push('l:' + sha_(parts.slice(0, n).join('/')).slice(0, 40));
  if (keys.length) CacheService.getScriptCache().removeAll(keys);
}
function gh_(method, path, body, accept) {
  var opt = {
    method: method.toLowerCase(), muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + props_().getProperty('GITHUB_TOKEN'), Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' }
  };
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  var res = UrlFetchApp.fetch('https://api.github.com/' + path, opt);
  return { code: res.getResponseCode(), text: res.getContentText(), bytes: res.getContent() };
}
