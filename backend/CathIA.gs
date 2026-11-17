/**
 * CathIA — module du serveur ScoutHub (anciennement un projet Apps Script à part).
 *
 * Appelé par l'application CathIA (fsggb.github.io/ScoutHub/CathIA/) avec { action: 'app', app: 'cathia', fn, args } ;
 * la session est celle de ScoutHub (connexion unique). Tout le code est enfermé dans une fonction : ses noms internes
 * (sha_, clean_…) ne se mélangent pas avec ceux de Code.gs.
 *
 * Propriétés du script, préfixées CATHIA_ (pour ne pas se mêler à celles de ScoutHub) :
 *   CATHIA_GOOGLE_CLIENT_ID, CATHIA_GOOGLE_CLIENT_SECRET : client OAuth « Application Web » qui donne l'accès au Drive de
 *     l'utilisateur (scope drive.file) ; adresses de retour autorisées : https://fsggb.github.io/ScoutHub/CathIA/ et …/index.html
 *   CATHIA_GITHUB_TOKEN : jeton limité au dépôt fsggb/CathIA (bibliothèque partagée)
 *   CATHIA_SALT : À RECOPIER depuis l'ancien projet CathIA (propriété SALT), sinon les modèles déjà publiés ne retrouvent pas leur auteur
 *   CATHIA_R_… : notes des modèles (recopier aussi les propriétés R_… de l'ancien projet pour les garder)
 */
var MODULES = MODULES || {};
MODULES.cathia = (function () {
  var P = PropertiesService.getScriptProperties(), PRE = 'CATHIA_';
  function props_() {
    return {
      getProperty: function (k) { return P.getProperty(PRE + k); },
      setProperty: function (k, v) { return P.setProperty(PRE + k, v); },
      deleteProperty: function (k) { return P.deleteProperty(PRE + k); },
      getProperties: function () { var all = P.getProperties(), o = {}; Object.keys(all).forEach(function (k) { if (k.indexOf(PRE) === 0) o[k.slice(PRE.length)] = all[k]; }); return o; }
    };
  }
  function appUrl_() { return props_().getProperty('APP_URL') || 'https://fsggb.github.io/ScoutHub/CathIA/'; }
  // la session est celle de ScoutHub (« sh:… » : ancien préfixe du navigateur, accepté)
  function user_(tok) { return HUB.email(String(tok || '').replace(/^sh:/, '')); }
  function authMe(tok) { try { return user_(tok); } catch (e) { return null; } }
  function authLogout() { return true; }

  /* CathIA — Apps Script
   * - sert l'application (index.html)
   * - connexion : Google (principal) ou adresse e-mail + code à 6 chiffres (publication seulement) ; seule l'adresse e-mail est conservée
   * - les projets des utilisateurs sont enregistrés dans LEUR Drive (par l'application, avec leur jeton Google) ;
   *   ce script ne stocke que les modèles publiés dans la bibliothèque communautaire
   * - bibliothèques : modèles vérifiés (dossier géré à la main) et modèles partagés (publiés depuis l'application)
   * Propriétés du script à renseigner (Paramètres du projet) : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL (adresse /exec publique)
   */
  var VERIFIED_ID = '1FRT--8pMdDFSbnKZCKeTk-FrSmkgWkS9';   // modèles vérifiés
  var COMMUNITY_ID = '1z741rZqj5pWHSftU9uxWpoQBRAY8FEaE';  // modèles partagés (communauté)
  var TAILLE_MAX = 45 * 1024 * 1024;
  var EXT_OK = /\.(html|xhtml|svg|pdf|json|jpg|png)$/i;
  var GSCOPE = 'openid email profile https://www.googleapis.com/auth/drive.file';
  /* adresses de retour acceptées en plus de celle du script (la page GitHub de CathIA) : à déclarer aussi dans le client OAuth */
  var RETOURS_OK = /^https:\/\/fsggb\.github\.io\/[\w\/.-]*$/;

  /* API JSON pour la version hébergée ailleurs (GitHub Pages) : l'application appelle ces fonctions par POST */
  function appInfo() {
    var p = props_(), ok = p.getProperty('GOOGLE_CLIENT_ID') && p.getProperty('GOOGLE_CLIENT_SECRET');
    return { url: appUrl_(), gid: ok ? p.getProperty('GOOGLE_CLIENT_ID') : '', gh: !!ghTok_(), pages: PAGES_URL };
  }
  /* source complète de l'application (pour le téléchargement hors ligne) */
  /* ------------------------------ utilitaires ------------------------------ */
  function salt_() {
    var p = props_(), s = p.getProperty('SALT');
    if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SALT', s); }
    return s;
  }
  function sha_(s) {
    var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt_() + '|' + s, Utilities.Charset.UTF_8);
    return d.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  }
  function clean_(n) {
    n = String(n || '').replace(/[\\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\.+$/, '').slice(0, 80);
    return n || 'Projet';
  }

  /* ------------------------------ sessions ------------------------------ */
  /* Connexion unique ScoutHub : un jeton « sh:… » est celui de ScoutHub (même site que CathIA) ; il est vérifié auprès du
     serveur ScoutHub (action « me »), et le résultat gardé 10 minutes. Propriété facultative SCOUTHUB_API pour changer d'adresse. */
  /* ------------------------------ connexion par e-mail (code à 6 chiffres) ------------------------------ */
  /* ------------------------------ connexion Google ------------------------------
   * Fenêtre pop-up : Google renvoie ici (?code=&state=). Le serveur échange le code, vérifie l'e-mail, ouvre une session
   * et dépose le résultat en cache 2 minutes pour que l'application le récupère. Le jeton d'accès Drive de l'utilisateur
   * (1 h, scope drive.file : seulement les fichiers créés par CathIA) n'est jamais conservé ici : il sert au navigateur de l'utilisateur. */
  function googleStart(hint, retour) {
    var p = props_(), cid = p.getProperty('GOOGLE_CLIENT_ID');
    if (!cid || !p.getProperty('GOOGLE_CLIENT_SECRET')) throw new Error('Connexion Google non configurée.');
    var state = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    // Retour sur la page de l'application (GitHub) plutôt que sur ce script : avec plusieurs comptes Google ouverts,
    // Google renvoie vers « script.google.com/macros/u/3/… », qu'Apps Script n'ouvre pas (« Impossible d'ouvrir le fichier »).
    var redir = (retour && RETOURS_OK.test(String(retour))) ? String(retour) : appUrl_();
    CacheService.getScriptCache().put('gn_' + state, redir, 600);
    var q = { client_id: cid, redirect_uri: redir, response_type: 'code', scope: GSCOPE, state: state, access_type: 'online' };
    if (!hint) q.prompt = 'select_account';
    if (hint && /^[^\s@]+@[^\s@]+$/.test(hint)) q.login_hint = hint;
    return { url: 'https://accounts.google.com/o/oauth2/v2/auth?' + Object.keys(q).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&'), state: state };
  }
  /* échange le code Google contre une session CathIA ; l'adresse de retour est celle mémorisée au départ */
  function echange_(code, state) {
    var cache = CacheService.getScriptCache(), redir = cache.get('gn_' + state);
    if (!redir) throw new Error('Demande expirée : recommencez.');
    cache.remove('gn_' + state);
    if (redir === '1') redir = appUrl_();
    var pr = props_(), cid = pr.getProperty('GOOGLE_CLIENT_ID');
    var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', muteHttpExceptions: true, payload: { code: code, client_id: cid, client_secret: pr.getProperty('GOOGLE_CLIENT_SECRET'), redirect_uri: redir, grant_type: 'authorization_code' } });
    var t = JSON.parse(r.getContentText());
    if (r.getResponseCode() !== 200 || !t.id_token || !t.access_token) throw new Error('Google a refusé la connexion (' + (t.error_description || t.error || r.getResponseCode()) + ').');
    if (String(t.scope || '').indexOf('auth/drive.file') < 0) throw new Error('Il faut autoriser l’accès aux fichiers créés par CathIA pour enregistrer dans votre Drive.');
    var seg = t.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); while (seg.length % 4) seg += '=';
    var c = JSON.parse(Utilities.newBlob(Utilities.base64Decode(seg)).getDataAsString());
    if (c.aud !== cid || (c.iss !== 'https://accounts.google.com' && c.iss !== 'accounts.google.com') || !c.email || c.email_verified !== true) throw new Error('Identité Google non vérifiée.');
    var mail = String(c.email).toLowerCase(), pic = /^https:\/\/[\w.-]+\.googleusercontent\.com\//.test(String(c.picture || '')) ? String(c.picture) : '';
    // une adresse de la fédération ouvre aussi la session ScoutHub (la même partout) ; une autre adresse n'a que l'accès à son Drive
    return { token: HUB.session(mail, String(c.name || ''), true), email: mail, picture: pic, nom: String(c.given_name || '').slice(0, 40), at: t.access_token, exp: Date.now() + (+t.expires_in || 3600) * 1000 };
  }
  /* retour de Google sur la page GitHub de l'application : elle transmet le code ici */
  function googleExchange(code, state) {
    if (!/^[\w\/.-]{10,512}$/.test(String(code || '')) || !/^[0-9a-f]{64}$/.test(String(state || ''))) throw new Error('Retour de Google invalide.');
    return echange_(String(code), String(state));
  }
  /* l'application interroge régulièrement jusqu'à ce que la connexion soit terminée */
  /* ------------------------------ bibliothèques ------------------------------ */
  function limite_(email, cle, max) {
    var c = CacheService.getScriptCache(), k = 'q_' + cle + '_' + sha_(email), n = +(c.get(k) || 0);
    if (n >= max) throw new Error('Trop d’envois récents : réessayez dans quelques heures.');
    c.put(k, String(n + 1), 21600);
  }
  function fiche_(f) {
    f = f || {};
    var u = (f.u || []).filter(function (x) { return ['louveteaux', 'louvettes', 'scouts', 'guides'].indexOf(x) >= 0; });
    var p = (f.par || []).filter(function (x) { return x === 'jeunes' || x === 'chefs'; });
    return { type: String(f.type || '').slice(0, 40), tx: String(f.tx || '').slice(0, 40), dif: Math.max(0, Math.min(5, +f.dif || 0)), u: u, par: p, h: Math.max(0, Math.min(999, +f.h || 0)), desc: String(f.desc || '').slice(0, 240) };
  }
  function meta_(folder) {
    try { var o = JSON.parse(folder.getDescription() || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
  }
  function enfantDe_(item, parentId) {
    var it = item.getParents();
    while (it.hasNext()) if (it.next().getId() === parentId) return true;
    return false;
  }
  function contenu_(dossier) {
    var it = dossier.getFiles(), best = null;
    while (it.hasNext()) {
      var f = it.next(), n = f.getName();
      if (/\.cathia\.html$/i.test(n)) return f.getBlob().getDataAsString('UTF-8');
      if (!best && /\.(html|xhtml)$/i.test(n)) best = f;
    }
    if (!best) throw new Error('Aucun modèle 3D (.html) dans ce projet.');
    return best.getBlob().getDataAsString('UTF-8');
  }
  /* écrit les fichiers publiés ; remplace les marqueurs @@CATHIA_*@@ des .html/.svg par l'identifiant du dossier, l'e-mail et l'adresse de l'application */
  function ecrire_(dossier, files, email) {
    var total = 0, app = appUrl_();
    files.forEach(function (f) {
      var n = clean_(f.n);
      if (!EXT_OK.test(n)) throw new Error('Type de fichier non accepté : ' + n);
      total += String(f.b || '').length * 0.75;
      if (total > TAILLE_MAX) throw new Error('Projet trop volumineux.');
    });
    files.forEach(function (f) {
      var n = clean_(f.n), old = dossier.getFilesByName(n), mime = f.m || 'application/octet-stream', blob;
      if (/\.(html|xhtml|svg)$/i.test(n)) {
        var txt = Utilities.newBlob(Utilities.base64Decode(f.b)).getDataAsString('UTF-8')
          .replace(/@@CATHIA_ID@@/g, dossier.getId()).replace(/@@CATHIA_EMAIL@@/g, email).replace(/@@CATHIA_APP@@/g, app);
        blob = Utilities.newBlob(txt, mime, n);
      } else blob = Utilities.newBlob(Utilities.base64Decode(f.b), mime, n);
      while (old.hasNext()) old.next().setTrashed(true);
      dossier.createFile(blob);
    });
  }
  function biblio_(which) { return DriveApp.getFolderById(which === 'verified' ? VERIFIED_ID : COMMUNITY_ID); }
  function listLibraryDrive_(which) {
    if (which !== 'verified' && which !== 'community') throw new Error('Bibliothèque inconnue.');
    var cache = CacheService.getScriptCache(), ck = 'lib2_' + which, c = cache.get(ck);
    if (c) return JSON.parse(c);
    var root = biblio_(which), out = [], it = root.getFolders();
    while (it.hasNext()) {
      var f = it.next(), n = f.getName();
      if (/\.cathia$/i.test(n)) out.push({ id: f.getId(), name: n.replace(/\.cathia$/i, ''), fiche: meta_(f).fiche || null, t: f.getLastUpdated().getTime() });
    }
    var fi = root.getFiles();
    while (fi.hasNext()) {
      var g = fi.next(), gn = g.getName();
      if (/\.(html|xhtml|htm)$/i.test(gn)) out.push({ id: g.getId(), name: gn.replace(/\.(cathia\.)?(html|xhtml|htm)$/i, ''), fiche: null, t: g.getLastUpdated().getTime() });
    }
    out.sort(function (a, b) { return a.name.localeCompare(b.name); });
    out = out.slice(0, 300);
    try { cache.put(ck, JSON.stringify(out), 60); } catch (e) {}
    return out;
  }
  function readLibraryItem(which, id) {
    if (which !== 'verified' && which !== 'community') throw new Error('Bibliothèque inconnue.');
    var rid = biblio_(which).getId(), f = null;
    try { f = DriveApp.getFolderById(id); } catch (e) {}
    if (f) { if (!enfantDe_(f, rid)) throw new Error('Modèle introuvable dans cette bibliothèque.'); return contenu_(f); }
    var g = DriveApp.getFileById(id);
    if (!enfantDe_(g, rid)) throw new Error('Modèle introuvable dans cette bibliothèque.');
    return g.getBlob().getDataAsString('UTF-8');
  }
  /* ouverture par lien (bouton « Ouvrir avec CathIA » d'un fichier .html) : les bibliothèques sont publiques ;
   * un projet privé est dans le Drive de son auteur : l'application le lit elle-même avec le jeton Google de l'utilisateur. */
  function readByLink(tok, id) {
    var f;
    try { f = DriveApp.getFolderById(id); } catch (e) { throw new Error('Ce projet est privé : connectez-vous avec Google pour l’ouvrir.'); }
    if (enfantDe_(f, VERIFIED_ID) || enfantDe_(f, COMMUNITY_ID)) return { name: f.getName().replace(/\.cathia$/i, ''), html: contenu_(f), mine: false };
    throw new Error('Ce projet est privé : connectez-vous avec Google pour l’ouvrir.');
  }
  /* vignette d'un modèle (image enregistrée dans son dossier) : chargée à la demande, jamais préchargée */
  function getThumb(which, id) {
    if (which !== 'verified' && which !== 'community') return '';
    var cache = CacheService.getScriptCache(), ck = 'th_' + id, c = cache.get(ck);
    if (c !== null) return c.trim();
    var f;
    try { f = DriveApp.getFolderById(id); } catch (e) { return ''; }
    if (!enfantDe_(f, biblio_(which).getId())) return '';
    var it = f.getFilesByName('vignette.jpg'), out = '';
    if (it.hasNext()) out = 'data:image/jpeg;base64,' + Utilities.base64Encode(it.next().getBlob().getBytes());
    if (out.length < 95000) try { cache.put(ck, out || ' ', 3600); } catch (e) {}
    return out;
  }
  function publishModelDrive_(tok, name, files, fiche) {
    var email = user_(tok), base = clean_(name), nom = base + '.cathia', root = biblio_('community'), h = sha_(email);
    limite_(email, 'pub', 10);
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var f = null, k = 1, it;
      for (;;) {
        it = root.getFoldersByName(nom);
        if (!it.hasNext()) { f = root.createFolder(nom); break; }
        var g = it.next();
        if (meta_(g).o === h) { f = g; break; }
        k++; nom = base + ' (' + k + ').cathia';
        if (k > 50) throw new Error('Trop de modèles portent ce nom : choisissez-en un autre.');
      }
      f.setDescription(JSON.stringify({ fiche: fiche_(fiche), o: h }));
      ecrire_(f, files || [], email);
      CacheService.getScriptCache().remove('lib2_community');
      return { id: f.getId(), name: nom.replace(/\.cathia$/i, '') };
    } finally { lock.releaseLock(); }
  }
  /* à lancer une fois depuis l'éditeur : déclenche la demande d'autorisation des services utilisés */
  /* ============ Modèles de la communauté : stockés dans le dépôt GitHub public (un dossier par utilisateur), notés sur 5 ============
   * Propriété du script à renseigner : GITHUB_TOKEN (jeton « fine-grained » limité au dépôt, droit Contents : lecture/écriture).
   * Sans ce jeton, la publication retombe sur l'ancien dossier Drive. */
  var GH_REPO = 'fsggb/CathIA', GH_BRANCH = 'main', PAGES_URL = 'https://fsggb.github.io/CathIA/';
  var RAW_ = 'https://raw.githubusercontent.com/' + GH_REPO + '/' + GH_BRANCH + '/';
  function ghTok_() { return props_().getProperty('GITHUB_TOKEN') || ''; }
  function gh_(method, path, body) {
    var r = UrlFetchApp.fetch('https://api.github.com/repos/' + GH_REPO + path, {
      method: method, muteHttpExceptions: true, contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ghTok_(), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'CathIA' },
      payload: body ? JSON.stringify(body) : undefined
    });
    var c = r.getResponseCode(), t = r.getContentText();
    if (c >= 300) { var e = new Error('GitHub ' + c + ' : ' + t.slice(0, 160)); e.code = c; throw e; }
    return t ? JSON.parse(t) : {};
  }
  function userKey_(email) { return 'u' + sha_('gh|' + email).slice(0, 10); }
  function slug_(n) {
    return String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'modele';
  }
  function indexGh_() {
    var cache = CacheService.getScriptCache(), c = cache.get('gh_idx');
    if (c) return JSON.parse(c);
    var r = UrlFetchApp.fetch(RAW_ + 'library/index.json?t=' + Date.now(), { muteHttpExceptions: true }), out = [];
    if (r.getResponseCode() === 200) { try { out = JSON.parse(r.getContentText()); } catch (e) {} }
    try { cache.put('gh_idx', JSON.stringify(out), 20); } catch (e) {}
    return out;
  }
  function ratings_() {
    var all = props_().getProperties(), R = {};
    Object.keys(all).forEach(function (k) { if (k.indexOf('R_') === 0) { try { var o = JSON.parse(all[k]); R[o.id] = o.v; } catch (e) {} } });
    return R;
  }
  function listLibrary(which, tok) {
    if (which !== 'community' || !ghTok_()) return listLibraryDrive_(which);
    var me = '', R = ratings_();
    try { if (tok) me = userKey_(user_(tok)); } catch (e) {}
    var out = indexGh_().map(function (m) {
      var v = R[m.id] || {}, ks = Object.keys(v), n = ks.length, sum = 0;
      ks.forEach(function (k) { sum += v[k]; });
      var avg = n ? sum / n : 0;
      return { id: m.id, name: m.name, fiche: m.fiche || null, t: m.t, u: m.u, mine: !!me && m.u === me, avg: Math.round(avg * 10) / 10, n: n, my: me && v[me] || 0,
        score: (avg * n + 3 * 2) / (n + 2), thumb: m.thumb ? RAW_ + m.thumb : '', html: RAW_ + m.html };
    });
    out.sort(function (a, b) { return b.score - a.score || b.t - a.t; });
    return out.slice(0, 400);
  }
  function rateModel(tok, id, stars) {
    var email = user_(tok), uk = userKey_(email), n = Math.round(+stars);
    if (!(n >= 1 && n <= 5)) throw new Error('Note de 1 à 5.');
    var m = indexGh_().filter(function (x) { return x.id === id; })[0];
    if (!m) throw new Error('Modèle introuvable.');
    if (m.u === uk) throw new Error('Vous ne pouvez pas noter votre propre modèle.');
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      var key = 'R_' + sha_(id).slice(0, 16), raw = props_().getProperty(key), o = raw ? JSON.parse(raw) : { id: id, v: {} };
      o.v[uk] = n; props_().setProperty(key, JSON.stringify(o));
    } finally { lock.releaseLock(); }
    var v = ratings_()[id] || {}, ks = Object.keys(v), sum = 0; ks.forEach(function (k) { sum += v[k]; });
    return { avg: Math.round(sum / ks.length * 10) / 10, n: ks.length, my: n };
  }
  /* écrit plusieurs fichiers (et l'index) en UNE validation Git */
  function ghCommit_(msg, put, del) {
    var ref = gh_('GET', '/git/ref/heads/' + GH_BRANCH), baseSha = ref.object.sha, base = gh_('GET', '/git/commits/' + baseSha), tree = [];
    Object.keys(put).forEach(function (path) {
      var b = gh_('POST', '/git/blobs', { content: put[path], encoding: 'base64' });
      tree.push({ path: path, mode: '100644', type: 'blob', sha: b.sha });
    });
    (del || []).forEach(function (path) { tree.push({ path: path, mode: '100644', type: 'blob', sha: null }); });
    var t = gh_('POST', '/git/trees', { base_tree: base.tree.sha, tree: tree }), c = gh_('POST', '/git/commits', { message: msg, tree: t.sha, parents: [baseSha] });
    gh_('PATCH', '/git/refs/heads/' + GH_BRANCH, { sha: c.sha });
    CacheService.getScriptCache().remove('gh_idx');
  }
  function indexNow_() {
    try { var f = gh_('GET', '/contents/library/index.json?ref=' + GH_BRANCH); return JSON.parse(Utilities.newBlob(Utilities.base64Decode(f.content.replace(/\n/g, ''))).getDataAsString('UTF-8')); }
    catch (e) { if (e.code === 404) return []; throw e; }
  }
  function publishModel(tok, name, files, fiche) {
    if (!ghTok_()) return publishModelDrive_(tok, name, files, fiche);
    var email = user_(tok), uk = userKey_(email), s = slug_(name), id = uk + '~' + s, dir = 'models/' + uk + '/' + s + '/', put = {}, html = '', thumb = '', total = 0;
    limite_(email, 'pub', 20);
    (files || []).forEach(function (f) {
      var n = clean_(f.n).replace(/[^\w.\- ]+/g, '_');
      if (!EXT_OK.test(n)) throw new Error('Type de fichier non accepté : ' + n);
      total += String(f.b || '').length * 0.75; if (total > 20 * 1024 * 1024) throw new Error('Projet trop volumineux pour la communauté (20 Mo maximum).');
      var b64 = f.b;
      if (/\.(html|xhtml|svg)$/i.test(n)) {
        var txt = Utilities.newBlob(Utilities.base64Decode(f.b)).getDataAsString('UTF-8').replace(/@@CATHIA_ID@@/g, id).replace(/@@CATHIA_EMAIL@@/g, uk).replace(/@@CATHIA_APP@@/g, PAGES_URL);
        b64 = Utilities.base64Encode(Utilities.newBlob(txt).getBytes());
      }
      put[dir + n] = b64;
      if (/\.cathia\.html$/i.test(n)) html = dir + n; else if (/^vignette\.jpg$/i.test(n)) thumb = dir + n;
    });
    if (!html) throw new Error('Le modèle 3D (.html) est manquant.');
    var lock = LockService.getScriptLock(); lock.waitLock(25000);
    try {
      var idx = indexNow_().filter(function (m) { return m.id !== id; });
      idx.push({ id: id, name: clean_(name), u: uk, fiche: fiche_(fiche), t: Date.now(), html: html, thumb: thumb });
      put['library/index.json'] = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(idx)).getBytes());
      ghCommit_('Publication : ' + clean_(name), put);
    } finally { lock.releaseLock(); }
    return { id: id, name: clean_(name), public: true };
  }
  function deleteModel(tok, id) {
    if (!ghTok_()) throw new Error('Suppression indisponible.');
    var uk = userKey_(user_(tok)), lock = LockService.getScriptLock(); lock.waitLock(25000);
    try {
      var idx = indexNow_(), m = idx.filter(function (x) { return x.id === id; })[0];
      if (!m) throw new Error('Modèle introuvable.');
      if (m.u !== uk) throw new Error('Ce modèle ne vous appartient pas.');
      var ref = gh_('GET', '/git/ref/heads/' + GH_BRANCH), base = gh_('GET', '/git/commits/' + ref.object.sha), all = gh_('GET', '/git/trees/' + base.tree.sha + '?recursive=1').tree, dir = 'models/' + uk + '/' + id.split('~')[1] + '/';
      var del = all.filter(function (e) { return e.type === 'blob' && e.path.indexOf(dir) === 0; }).map(function (e) { return e.path; });
      var put = {}; put['library/index.json'] = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(idx.filter(function (x) { return x.id !== id; }))).getBytes());
      ghCommit_('Retrait : ' + m.name, put, del);
      var R = props_(); R.deleteProperty('R_' + sha_(id).slice(0, 16));
    } finally { lock.releaseLock(); }
    return true;
  }


  var PUBLIQUES = { appInfo: appInfo, authMe: authMe, authLogout: authLogout, googleStart: googleStart, googleExchange: googleExchange,
    listLibrary: listLibrary, readLibraryItem: readLibraryItem, readByLink: readByLink, getThumb: getThumb,
    publishModel: publishModel, rateModel: rateModel, deleteModel: deleteModel };
  // { fn, args } → { ok, result } ; les messages d'erreur de CathIA sont écrits pour l'utilisateur
  return function (r) {
    var f = Object.prototype.hasOwnProperty.call(PUBLIQUES, String(r.fn)) ? PUBLIQUES[r.fn] : null;
    if (!f) HUB.fail('Fonction CathIA inconnue.');
    try { return { ok: true, result: f.apply(null, Array.isArray(r.args) ? r.args : []) }; }
    catch (e) { HUB.fail(e && (e.userMessage || e.message) || 'Erreur de CathIA.'); }
  };
})();
