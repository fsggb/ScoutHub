/**
 * ScoutHub : serveur d'identification (Google Apps Script, web app).
 *
 * Propriétés du script (Paramètres du projet > Propriétés du script) :
 *   ANTHROPIC_IA     : clé API Anthropic (la même propriété que la boutique). Jamais dans le navigateur ni dans GitHub :
 *                      c'est ce serveur qui appelle Claude. Sans elle, ChatGDB reste fermé.
 *   CHAT_PUBLIC      : « 1 » pour ouvrir ChatGDB à tous les comptes ; sinon réservé aux administrateurs (phase de test).
 *   CHAT_MODELE      : (facultatif) identifiant du modèle ; par défaut claude-haiku-5-5.
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
// ---- ChatGDB ----
var CHAT_MODELE = 'claude-haiku-5-5';
var CHAT_MAX_JETONS = 4096;
var CHAT_WEB_MAX = 4;                       // recherches web par réponse
var CHAT_FENETRE_H = 5, CHAT_CREDITS_FENETRE = 30, CHAT_CREDITS_SEMAINE = 150, CHAT_BONUS_MAX = 50;
var CHAT_LOGO_FICHIER = '1wpajNET6wtqmA0u-3Ew2ioocY0LDcGc4';   // logo ChatGDB (Drive de la boutique)
var CHAT_CONNAISSANCES_URL = 'https://fsggb.github.io/ScoutHub/knowledge/all.md';
var MAX_FAILS = 5;
var LOCK_SECONDS = 600;
var SESSION_CACHE_SECONDS = 600;

function doGet() {
  return json_({ ok: true, service: 'ScoutHub' });
}

// Actions qui modifient des données : seules elles prennent le verrou. Les lectures (list, get, me, login...)
// ne sont plus mises en file derrière un enregistrement de fichier, ce qui accélère nettement ScoutCloud.
var WRITES = { ping: 1, register: 1, google: 1, changePassword: 1, adminReset: 1, adminDelete: 1, adminSetRole: 1 };

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
  // Logo ChatGDB : lu dans le Drive (public, petit), mis en cache par le navigateur.
  logo: function () {
    var cache = CacheService.getScriptCache(), hit = cache.get('logo');
    if (hit) return { ok: true, data: hit };
    var b = DriveApp.getFileById(CHAT_LOGO_FICHIER).getBlob();
    var uri = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    if (uri.length < 95000) cache.put('logo', uri, 21600);
    return { ok: true, data: uri };
  },
  // ChatGDB ouvert pour ce compte ? + crédits restants.
  credits: function (r) {
    var email = session_(r.token), role = normRole_(getUser_(email).role);
    return { ok: true, chat: chatOuvert_(role), credits: creditsEtat_(email) };
  },
  // Activité réelle dans un outil : 1 crédit bonus par tranche de 5 minutes (plafonné par semaine).
  ping: function (r) {
    var email = session_(r.token), c = creditsLire_(email), now = Date.now();
    if (now - (c.lastPing || 0) < 270000) return { ok: true, gained: 0 };
    c.lastPing = now;
    var gained = 0;
    if ((c.bonus || 0) < CHAT_BONUS_MAX) { c.bonus = (c.bonus || 0) + 1; gained = 1; }
    creditsEcrire_(email, c);
    return { ok: true, gained: gained };
  },
  chat: function (r) {
    var email = session_(r.token), role = normRole_(getUser_(email).role);
    if (!chatOuvert_(role)) fail_(props_().getProperty('ANTHROPIC_IA') ? 'ChatGDB n\'est pas encore ouvert à votre compte.' : 'ChatGDB n\'est pas encore configuré.');
    var etat = creditsEtat_(email);
    if (etat.fenetre.reste <= 0) fail_('Limite de la session de ' + CHAT_FENETRE_H + ' h atteinte. Elle se renouvelle ' + etat.fenetre.renouvellement + '.');
    if (etat.semaine.reste <= 0) fail_('Limite de la semaine atteinte. Elle se renouvelle ' + etat.semaine.renouvellement + '.');
    var rep = chatAppeler_(r);
    var cout = chatCout_(rep.usage, rep.recherches.length);
    creditsDebiter_(email, cout);
    return { ok: true, text: rep.texte, sources: rep.sources, searches: rep.recherches, credits: creditsEtat_(email), cost: cout };
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

// ---------- ChatGDB : accès, crédits, appel à Claude ----------
function chatOuvert_(role) {
  var p = props_();
  return !!p.getProperty('ANTHROPIC_IA') && (p.getProperty('CHAT_PUBLIC') === '1' || role === 'admin');
}
function creditsCle_(email) { return 'cr:' + sha_('credits|' + email).slice(0, 20); }
function creditsLire_(email) {
  var raw = props_().getProperty(creditsCle_(email)), c = raw ? JSON.parse(raw) : {}, now = Date.now();
  if (!c.ws || now - c.ws >= CHAT_FENETRE_H * 3600000) { c.ws = 0; c.wu = 0; }
  if (!c.ks || now - c.ks >= 7 * 86400000) { c.ks = 0; c.ku = 0; c.bonus = 0; }
  return c;
}
function creditsEcrire_(email, c) { props_().setProperty(creditsCle_(email), JSON.stringify(c)); }
function creditsDebiter_(email, n) {
  var lock = LockService.getScriptLock();      // verrou bref : seulement le temps d'écrire le décompte
  lock.waitLock(10000);
  try {
    var c = creditsLire_(email), now = Date.now();
    if (!c.ws) c.ws = now;
    if (!c.ks) c.ks = now;
    c.wu = (c.wu || 0) + n; c.ku = (c.ku || 0) + n;
    creditsEcrire_(email, c);
  } finally { try { lock.releaseLock(); } catch (x) { /* ignore */ } }
}
function creditsEtat_(email) {
  var c = creditsLire_(email), now = Date.now();
  function dans(ms) { var h = Math.max(1, Math.round(ms / 3600000)); return h >= 48 ? 'dans ' + Math.round(h / 24) + ' j' : 'dans ' + h + ' h'; }
  var maxSemaine = CHAT_CREDITS_SEMAINE + (c.bonus || 0);
  return {
    fenetre: { max: CHAT_CREDITS_FENETRE, utilise: c.wu || 0, reste: Math.max(0, CHAT_CREDITS_FENETRE - (c.wu || 0)), renouvellement: c.ws ? dans(c.ws + CHAT_FENETRE_H * 3600000 - now) : 'à votre première question' },
    semaine: { max: maxSemaine, utilise: c.ku || 0, reste: Math.max(0, maxSemaine - (c.ku || 0)), bonus: c.bonus || 0, renouvellement: c.ks ? dans(c.ks + 7 * 86400000 - now) : 'à votre première question' }
  };
}
// 1 crédit ≈ une question courte (~3 000 jetons en entrée, ~500 en sortie) ; une recherche web compte double.
function chatCout_(usage, nbRecherches) {
  var u = usage || {};
  var jetons = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) * 1.25 + (u.cache_read_input_tokens || 0) * 0.1 + (u.output_tokens || 0) * 5;
  return Math.max(1, Math.round(jetons / 5500 + 2 * nbRecherches));
}
function chatConnaissances_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('kb');
  if (hit !== null) return hit;
  var txt = '';
  try {
    var res = UrlFetchApp.fetch(CHAT_CONNAISSANCES_URL, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) txt = res.getContentText().slice(0, 60000);
  } catch (e) { txt = ''; }
  try { cache.put('kb', txt.slice(0, 90000), 21600); } catch (e) { /* trop gros : tant pis */ }
  return txt;
}
function chatSysteme_(r) {
  var l = [
    "Tu es ChatGDB, l'assistant IA de la Fédération des Scouts et Guides Godefroy de Bouillon (FSGGB). Tu aides les membres (chefs, parents, jeunes, bénévoles) sur tous les sujets, et tu connais les outils numériques de la fédération (ScoutHub). Si on te demande ton nom, tu réponds « ChatGDB ».",
    "Réponds en français, avec un ton chaleureux et clair. Va droit au but ; développe seulement si on te le demande ou si le sujet l'exige. Markdown simple (titres courts, listes, tableaux, blocs de code).",
    "Tu disposes d'une recherche web : utilise-la pour tout ce qui est récent, chiffré, réglementaire ou que tu ne connais pas avec certitude, et cite tes sources. N'invente jamais d'adresse web ni d'image : n'affiche une image (![légende](https://…)) que si son adresse directe provient des résultats de recherche.",
    "Quand la réponse est un document, une page, un tableau, un schéma ou du code à garder, produis un ARTEFACT : <artifact id=\"identifiant-court\" type=\"markdown|html|svg|csv|code\" title=\"Titre\">contenu</artifact>. Les pages html sont autonomes (CSS et JS en ligne, aucune ressource externe). Pour modifier un artefact, renvoie-le en entier avec le même id. Ne mets rien d'autre que le contenu dans la balise, et reste bref dans le texte autour.",
    "Tu ne remplaces pas un responsable : pour la sécurité des jeunes, la santé, le droit ou toute décision engageante, indique les limites de ta réponse et renvoie vers le responsable de groupe ou les documents officiels.",
    "Tu peux lire les images et les PDF joints."
  ];
  if (r.app) l.push("L'utilisateur est actuellement dans l'application : " + String(r.app).slice(0, 60) + ".");
  if (r.custom) l.push("Préférences de l'utilisateur (à respecter sauf si elles contredisent ce qui précède) : " + String(r.custom).slice(0, 600));
  l.push(r.style === 'detail' ? "Style demandé : réponses détaillées et structurées." : "Style demandé : réponses courtes.");
  var kb = chatConnaissances_();
  if (kb) l.push("FICHES SUR LES APPLICATIONS (source : dépôts de la fédération ; fais-en ta référence pour les questions sur les outils) :\n" + kb);
  return l.join('\n\n');
}
function chatMessages_(brut) {
  var out = [], total = 0;
  (Array.isArray(brut) ? brut : []).slice(-24).forEach(function (m) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return;
    var texte = String(m.text || '').slice(0, 12000), blocs = [];
    if (m.role === 'user') {
      (Array.isArray(m.images) ? m.images : []).slice(0, 6).forEach(function (im) {
        if (!im || !/^image\/(jpeg|png|gif|webp)$/.test(im.m) || typeof im.d !== 'string' || im.d.length > 6500000) return;
        total += im.d.length; blocs.push({ type: 'image', source: { type: 'base64', media_type: im.m, data: im.d } });
      });
      (Array.isArray(m.docs) ? m.docs : []).slice(0, 3).forEach(function (d) {
        if (!d || d.m !== 'application/pdf' || typeof d.d !== 'string' || d.d.length > 14000000) return;
        total += d.d.length; blocs.push({ type: 'document', title: String(d.n || 'document').slice(0, 80), source: { type: 'base64', media_type: 'application/pdf', data: d.d } });
      });
    }
    if (!texte && !blocs.length) return;
    blocs.push({ type: 'text', text: texte || '(pièce jointe)' });
    var dernier = out[out.length - 1];
    if (dernier && dernier.role === m.role) dernier.content = dernier.content.concat(blocs); else out.push({ role: m.role, content: blocs });
  });
  if (total > 30000000) fail_('Pièces jointes trop volumineuses.');
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') fail_('Message vide.');
  return out;
}
function chatAppeler_(r) {
  var p = props_(), cle = p.getProperty('ANTHROPIC_IA');
  var messages = chatMessages_(r.messages), systeme = chatSysteme_(r);
  var web = r.web !== false;
  var corps = {
    model: p.getProperty('CHAT_MODELE') || CHAT_MODELE, max_tokens: CHAT_MAX_JETONS,
    system: [{ type: 'text', text: systeme, cache_control: { type: 'ephemeral' } }],
    messages: messages, output_config: { effort: r.style === 'detail' ? 'medium' : 'low' }
  };
  if (web) corps.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: CHAT_WEB_MAX, user_location: { type: 'approximate', country: 'FR', timezone: 'Europe/Paris' } }];
  var usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  var texte = '', sources = [], recherches = [], index = {};
  for (var tour = 0; tour < 4; tour++) {
    var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify(corps),
      headers: { 'x-api-key': cle, 'anthropic-version': '2023-06-01' }
    });
    var code = res.getResponseCode(), j;
    try { j = JSON.parse(res.getContentText()); } catch (e) { fail_('Réponse illisible du service IA.'); }
    if (code !== 200) {
      var msg = (j && j.error && j.error.message) || '';
      if (corps.tools && /web.?search/i.test(msg)) { delete corps.tools; web = false; continue; }   // recherche web non activée sur le compte
      if (code === 429 || code === 529) fail_('Le service IA est très sollicité : réessayez dans un instant.');
      fail_('Le service IA a refusé la demande (' + code + ').');
    }
    ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'].forEach(function (k) { usage[k] += (j.usage && j.usage[k]) || 0; });
    (j.content || []).forEach(function (b) {
      if (b.type === 'server_tool_use' && b.name === 'web_search' && b.input && b.input.query) recherches.push(String(b.input.query).slice(0, 120));
      else if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) b.content.forEach(function (x) { if (x.url && !(x.url in index)) { index[x.url] = sources.length; sources.push({ url: x.url, title: String(x.title || x.url).slice(0, 140) }); } });
      else if (b.type === 'text') {
        var marques = '';
        (b.citations || []).forEach(function (c) { if (c.url && c.url in index) { var n = index[c.url] + 1; if (marques.indexOf('[' + n + ']') < 0) marques += ' [' + n + ']'; } });
        texte += b.text + marques;
      }
    });
    if (j.stop_reason === 'pause_turn') { messages.push({ role: 'assistant', content: j.content }); corps.messages = messages; continue; }
    if (j.stop_reason === 'refusal') fail_('ChatGDB ne peut pas répondre à cette demande.');
    break;
  }
  if (!texte.trim()) fail_('Réponse vide : reformulez votre question.');
  return { texte: texte.trim(), sources: sources.slice(0, 12), recherches: recherches, usage: usage };
}
