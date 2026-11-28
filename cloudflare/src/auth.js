// ===== Identité et sessions : remplace les actions google / codeDemander / codeVerifier / session / me / logout /
//       adminList / adminSetRole / adminDelete de l'ancien backend/Code.gs (Apps Script + PropertiesService).
// Toutes les routes sont sous /auth/* et NE PASSENT PAS par le jeton signé par Apps Script (verifierJeton) : elles
// délivrent et vérifient leur propre jeton de session (D1, table « sessions »), indépendant d'Apps Script.
// Secrets attendus : GMAIL_SA_KEY (clé JSON du compte de service Google, délégation à l'échelle du domaine, droit
// gmail.send) ; vars attendues : GOOGLE_CLIENT_ID, GOOGLE_DOMAINE (fsggb.fr), GMAIL_SENDER (boîte d'expédition,
// ex. no-reply@fsggb.fr), ADMIN_EMAIL, ADMIN_GOOGLE (liste séparée par des virgules), SESSION_JOURS (défaut 14).

const ROLES = ["adherent", "parent", "chef_unite", "chef_groupe", "equipe_nationale", "admin"];
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
async function sha256(s) { return hex(await crypto.subtle.digest("SHA-256", enc.encode(s))); }
function egal(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
function normRole(r) { return !r || r === "user" || r === "membre" ? "adherent" : (ROLES.includes(r) ? r : "adherent"); }
function slug(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }
function cleanEmail(v) {
  const e = String(v || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || e.length > 120) throw new Erreur("Adresse e-mail invalide.");
  return e;
}
function estFsggb(env, email) { return new RegExp("^[^@\\s+]+@" + (env.GOOGLE_DOMAINE || "fsggb.fr").replace(/\./g, "\\.") + "$").test(String(email || "")); }
function adminProtege(env, email) { return email === env.ADMIN_EMAIL || String(env.ADMIN_GOOGLE || "").split(",").map(s => s.trim()).includes(email); }
class Erreur extends Error { constructor(msg, code = 400) { super(msg); this.code = code; } }

// ---------- utilisateurs (D1 remplace PropertiesService « u: ») ----------
async function getUser(env, email) {
  const u = await env.DB.prepare("SELECT * FROM users WHERE email = ?1").bind(email).first();
  if (u) { const p = await portee(env, email); return { ...u, groupe_id: p.groupe_id, unite_id: p.unite_id }; }
  if (email === env.ADMIN_EMAIL) {
    await env.DB.prepare("INSERT OR IGNORE INTO users (email, role, name, google, fsggb, created) VALUES (?1, 'admin', '', 0, 1, ?2)").bind(email, Date.now()).run();
    return { email, role: "admin", name: "", google: 0, fsggb: 1, created: Date.now(), groupe_id: null, unite_id: null };
  }
  return null;
}
async function saveUser(env, email, base) {
  const role = adminProtege(env, email) ? "admin" : normRole(base.role);
  await env.DB.prepare(
    "INSERT INTO users (email, role, name, google, picture, fsggb, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) " +
    "ON CONFLICT(email) DO UPDATE SET role = excluded.role, name = excluded.name, google = excluded.google, picture = excluded.picture, fsggb = excluded.fsggb"
  ).bind(email, role, base.name || "", base.google ? 1 : 0, base.picture || "", base.fsggb ? 1 : 0, base.created || Date.now()).run();
}
// Accès chef fondé sur l'adresse de connexion : la table « habilitations » (remplie à chaque synchronisation de la feuille
// « Groupes et unités » par le Worker donnees) donne le rôle et la portée d'une adresse. Valeur CALCULÉE à la volée, jamais
// recopiée dans « users » : retirer l'adresse de la feuille retire l'accès. Ne diminue jamais un rôle plus élevé.
async function effectif(env, email) {
  const u = await getUser(env, email);
  if (!u || adminProtege(env, email) || !estFsggb(env, email)) return u;
  const h = await env.DB.prepare("SELECT role, groupe_id, unite_id FROM habilitations WHERE email = ?1").bind(email).first();
  if (!h || ROLES.indexOf(h.role) <= ROLES.indexOf(normRole(u.role))) return u;
  return { ...u, role: h.role, groupe_id: u.groupe_id || h.groupe_id, unite_id: u.unite_id || h.unite_id };
}
// fsggb : compte @fsggb.fr (Google Workspace de la fédération, ou code e-mail) ; false pour un compte Google
// personnel externe (ACCÈS MEMBRE ouvert à tous, voir /auth/google) — réserve les applications « protege » aux
// membres réels de la fédération, pas à quiconque possède un compte Google.
function publicUser(u) { return { email: u.email, role: normRole(u.role), name: u.name || "", google: !!u.google, picture: u.picture || "", fsggb: u.fsggb === undefined ? true : !!u.fsggb, groupe_id: u.groupe_id || null, unite_id: u.unite_id || null }; }
async function portee(env, email) { return (await env.DB.prepare("SELECT groupe_id, unite_id FROM portees WHERE email = ?1").bind(email).first()) || { groupe_id: null, unite_id: null }; }

// ---------- portée d'un compte : quel groupe/quelle unité voit-il (préparation des futures données sensibles) ----------
// équipe nationale et admin voient tout ; chef_groupe voit tout son groupe (toutes ses unités) ; chef_unite ne voit
// que la sienne ; adhérent/parent ne voient que leur propre groupe/unité (jamais ceux des autres).
const VOIT_TOUT = new Set(["equipe_nationale", "admin"]);
// « Voir le groupe » = voir l'ensemble du groupe (toutes ses unités) : seuls le chef de groupe (sur le sien) et
// l'équipe nationale/admin (sur tous) ont cette vue d'ensemble. Un chef d'unité, un parent ou un adhérent ne
// voient JAMAIS le groupe en général, seulement leur propre unité (peutVoirUnite ci-dessous).
function peutVoirGroupe(user, groupeId) {
  if (!groupeId) return false;
  const r = normRole(user.role);
  if (VOIT_TOUT.has(r)) return true;
  return r === "chef_groupe" && user.groupe_id === groupeId;
}
function peutVoirUnite(user, groupeId, uniteId) {
  if (!groupeId || !uniteId) return false;
  const r = normRole(user.role);
  if (VOIT_TOUT.has(r)) return true;
  if (r === "chef_groupe") return user.groupe_id === groupeId;   // voit toutes les unités de son groupe
  if (r === "chef_unite" || r === "parent" || r === "adherent") return user.groupe_id === groupeId && user.unite_id === uniteId;
  return false;
}
async function adminGoogleSeul(env, email) { const u = await getUser(env, email); return adminProtege(env, email) || (!!u && u.role === "admin"); }

// ---------- sessions (D1 remplace PropertiesService « s: » + CacheService) ----------
async function nouvelleSession(env, email) {
  const token = (await sha256(crypto.randomUUID() + crypto.randomUUID() + Date.now())) + (await sha256(crypto.randomUUID()));
  const h = await sha256(token), u = await getUser(env, email);
  // Un administrateur reste connecté 12 h seulement : un jeton volé ne sert pas longtemps (les autres : SESSION_JOURS, 14 par défaut).
  const duree = (u && normRole(u.role) === "admin") || adminProtege(env, email) ? 12 * 36e5 : (+env.SESSION_JOURS || 14) * 864e5;
  await env.DB.prepare("INSERT INTO sessions (hash, email, exp, created) VALUES (?1, ?2, ?3, ?4)").bind(h, email, Date.now() + duree, Date.now()).run();
  return token;
}
async function sessionEmail(env, token) {
  if (!token) throw new Erreur("Session expirée : reconnectez-vous.", 401);
  const h = await sha256(String(token));
  const s = await env.DB.prepare("SELECT * FROM sessions WHERE hash = ?1").bind(h).first();
  if (!s || s.exp < Date.now()) { if (s) await env.DB.prepare("DELETE FROM sessions WHERE hash = ?1").bind(h).run(); throw new Erreur("Session expirée : reconnectez-vous.", 401); }
  // Compte existant = session valide, qu'il soit @fsggb.fr ou un compte Google externe (ACCÈS MEMBRE) : le
  // domaine ne conditionne plus la validité de la session, seulement l'accès aux applications « protege »
  // (filtré côté client avec Hub.estFederation, à partir de user.fsggb renvoyé par publicUser).
  if (!(await getUser(env, s.email))) throw new Erreur("Session expirée : reconnectez-vous.", 401);
  return s.email;
}
// Adresses autorisées à ouvrir les données sensibles (var DONNEES_ADMINS, séparées par des virgules ; par défaut ADMIN_EMAIL seul).
const adminDonnees = (env, email) => String(env.DONNEES_ADMINS || env.ADMIN_EMAIL || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean).includes(String(email || "").toLowerCase());
// Applications autorisées à recevoir un code d'échange (var APPS_AUTORISEES, identifiants séparés par des virgules).
const appAutorisee = (env, aud) => !!aud && String(env.APPS_AUTORISEES || "").split(",").map(s => s.trim()).filter(Boolean).includes(aud);
// Portée de lecture des données : { acces: "tout" | "groupe" | "unite" | "aucun", email, role, gk, uk, groupe, unite }.
// gk / uk = identifiants (slug) du groupe et de l'unité, comparés aux colonnes gk / uk du miroir (jamais aux noms bruts).
async function porteeDonnees(env, email) {
  const base = { email, acces: "aucun", role: "adherent", gk: null, uk: null, groupe: "", unite: "" };
  if (adminDonnees(env, email)) return { ...base, acces: "tout", role: "admin" };
  if (!estFsggb(env, email)) return base;   // un compte externe n'a jamais accès aux données de la fédération
  let u = await effectif(env, email);
  if (!u) {   // adresse jamais connectée (simulation) : l'habilitation seule définit la portée
    const h = await env.DB.prepare("SELECT role, groupe_id, unite_id FROM habilitations WHERE email = ?1").bind(email).first();
    if (!h) return base;
    u = { email, role: h.role, groupe_id: h.groupe_id, unite_id: h.unite_id };
  }
  const role = normRole(u.role);
  const g = u.groupe_id ? await env.DB.prepare("SELECT nom FROM groupes WHERE id = ?1").bind(u.groupe_id).first() : null;
  const un = u.unite_id ? await env.DB.prepare("SELECT nom FROM unites WHERE id = ?1").bind(u.unite_id).first() : null;
  const r = { ...base, role, gk: u.groupe_id || null, uk: u.unite_id && u.groupe_id ? u.unite_id.slice(u.groupe_id.length + 1) : null, groupe: g ? g.nom : "", unite: un ? un.nom : "" };
  if (role === "chef_groupe" && r.gk) return { ...r, acces: "groupe" };
  if (role === "chef_unite" && r.gk && r.uk) return { ...r, acces: "unite" };
  return r;   // adhérent, parent, équipe nationale… : aucune donnée de personnes
}
const SECTIONS = ["outils", "documentation"];
// Profil d'une adresse pour décider de ce qu'elle voit (administrateur qui simule : adresse jamais connectée acceptée si habilitée).
async function profilVue(env, email) {
  let u = await effectif(env, email);
  if (!u) { const h = await env.DB.prepare("SELECT role, groupe_id, unite_id FROM habilitations WHERE email = ?1").bind(email).first(); u = h ? { email, role: h.role, groupe_id: h.groupe_id, unite_id: h.unite_id, fsggb: 1 } : { email, role: "adherent", fsggb: estFsggb(env, email) ? 1 : 0 }; }
  return { role: normRole(u.role), membre: u.fsggb === undefined ? true : !!u.fsggb, groupe_id: u.groupe_id || null, unite_id: u.unite_id || null };
}
// Public d'une entrée : liste de jetons « all », « chef_unite » (ce rôle ET au-dessus), « chef_groupe », « equipe_nationale »,
// « admin », « g:<groupe> », « u:<unité> ». Toujours réservé aux membres de la fédération (@fsggb.fr).
function audienceVisible(p, audience) {
  if (!p.membre) return false;
  const rang = ROLES.indexOf(p.role), national = rang >= ROLES.indexOf("equipe_nationale");
  return String(audience || "").split(",").some(a => {
    if (a === "all") return true;
    if (a === "admin") return p.role === "admin";
    if (ROLES.includes(a)) return rang >= ROLES.indexOf(a);
    if (a.startsWith("g:")) return national || p.groupe_id === a.slice(2);
    if (a.startsWith("u:")) return national || p.unite_id === a.slice(2) || (p.role === "chef_groupe" && !!p.groupe_id && a.slice(2).startsWith(p.groupe_id + "-"));
    return false;
  });
}
// Rubriques de Documentation lues dans le classeur (feuille, colonnes, qui peut les lire). Le filtrage se fait ICI, côté serveur.
//  min : rôle minimum (tout membre @fsggb.fr au-dessus de cette marche) ; portee : lignes limitées au groupe / à l'unité de la personne ;
//  filtre : règle par ligne (colonne « Accès » : TOUS = chefs d'unité et plus, LIMITE = chefs de groupe et plus).
const RUBRIQUES = {
  "Bibliographie": { feuille: "Bibliographie", plage: "A2:E500", min: "chef_unite", cols: ["branches", "categorie", "titre", "auteur", "remarques"] },
  "Administratif": { feuille: "Documentation", plage: "A2:H500", min: "chef_unite", cols: ["menu", "categorie", "titre", "lien", "etat", "camp", "acces", "remarques"],
    filtre: (l, rang) => !!l[2] && (String(l[6] || "").toUpperCase() !== "LIMITE" || rang >= ROLES.indexOf("chef_groupe")), sortie: ["menu", "categorie", "titre", "lien", "remarques"] },
  "Revues": { feuille: "Revues", plage: "A2:C1000", min: "chef_unite", cols: ["nom", "numero", "fichier"] },
  "Tutos": { feuille: "Tutos", plage: "A2:F300", min: "chef_unite", cols: ["nom", "type", "lien", "video", "miniature", "description"] },
  "Agenda Fédé": { feuille: "Agenda Fédé", plage: "A2:F500", min: "equipe_nationale", cols: ["tache", "mois", "type", "description", "personne", "faite"] },
  "Lieux de camp": { feuille: "Lieux de camp", plage: "A2:L3000", min: "chef_unite", portee: true, cols: ["groupe", "unite", "annee", "region", "departement", "superficie", "feu", "bois", "eau", "frigos", "abris", "commentaire"] }
};
// Miniature d'un document : jeton signé (HMAC) délivré SEULEMENT avec les lignes que la personne a le droit de voir ; l'intranet ne
// sert la miniature que si la signature est valide : aucun identifiant de fichier Drive n'est accepté sans cela.
const b64u = u8 => btoa(String.fromCharCode(...new Uint8Array(u8))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function signerMini(env, payload) {
  if (!env.MINIATURE_CLE) return "";
  const k = await crypto.subtle.importKey("raw", enc.encode(env.MINIATURE_CLE), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(enc.encode(payload)) + "." + b64u(await crypto.subtle.sign("HMAC", k, enc.encode(payload))).slice(0, 27);
}
const idDrive = u => { const m = String(u || "").match(/^https:\/\/(?:drive|docs)\.google\.com\/(?:file|document|presentation|spreadsheets)\/d\/([\w-]{20,60})/); return m ? m[1] : ""; };
const lienHttps = v => /^https:\/\/[^\s"'<>\\]{4,1500}$/.test(String(v || "").trim()) ? String(v).trim() : "";
async function requireAdmin(env, token) {
  const email = await sessionEmail(env, token);
  const u = await getUser(env, email);
  if (!u || u.role !== "admin") throw new Erreur("Réservé à l'administrateur.", 403);
  return email;
}
// Ouvre le compte au premier passage (adresse déjà prouvée par Google ou par le code) puis ouvre une session.
async function provisionner(env, email, nom, google, photo, fsggb) {
  const u = await getUser(env, email);
  if (!u) await saveUser(env, email, { role: "adherent", created: Date.now(), name: nom || "", google: !!google, picture: photo || "", fsggb: fsggb !== false });
  else if ((google && !u.google) || (!u.name && nom) || (photo && photo !== u.picture))
    await saveUser(env, email, { role: u.role, created: u.created, name: u.name || nom || "", google: !!u.google || !!google, picture: photo || u.picture || "", fsggb: u.fsggb === undefined ? fsggb !== false : !!u.fsggb });
  return nouvelleSession(env, email);
}

// ---------- jeton Google (Google Identity Services) ----------
async function verifyGoogle(env, credential) {
  if (typeof credential !== "string" || credential.length < 100 || credential.length > 4000) throw new Erreur("Jeton Google invalide.");
  const res = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential));
  if (res.status !== 200) throw new Erreur("Jeton Google refusé.");
  const info = await res.json();
  if (info.aud !== env.GOOGLE_CLIENT_ID) throw new Erreur("Jeton Google destiné à une autre application.");
  if (info.iss !== "accounts.google.com" && info.iss !== "https://accounts.google.com") throw new Erreur("Jeton Google invalide.");
  if (String(info.email_verified) !== "true" || !info.email) throw new Erreur("Adresse Google non vérifiée.");
  if (Number(info.exp) * 1000 < Date.now()) throw new Erreur("Jeton Google expiré.");
  return info;
}

// ---------- envoi du code par Gmail (compte de service, délégation à l'échelle du domaine) ----------
// GMAIL_SA_KEY (secret) : la clé JSON créée dans la console Google Cloud (voir cloudflare/MIGRATION.md).
function pem2binaire(pem) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, "");
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// Jeton générique (compte de service, délégation à l'échelle du domaine) : un memo par couple (scope, compte
// usurpé) — Gmail (gmail.send, GMAIL_SENDER) et lecture Sheets/Drive (spreadsheets.readonly ou drive.readonly,
// n'importe quel compte @fsggb.fr qui a accès au fichier visé) partagent la même clé GMAIL_SA_KEY.
const memosJetonGoogle = new Map();
export async function jetonGoogle(env, scope, sub) {
  const cleMemo = scope + "|" + (sub || "");
  const m = memosJetonGoogle.get(cleMemo);
  if (m && Date.now() < m.t) return m.v;
  const cle = env.GMAIL_SA_KEY && typeof env.GMAIL_SA_KEY.get === "function" ? await env.GMAIL_SA_KEY.get() : env.GMAIL_SA_KEY;
  if (!cle) throw new Erreur("Compte de service indisponible : secret GMAIL_SA_KEY absent du serveur.", 503);
  const sa = JSON.parse(cle);
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = { alg: "RS256", typ: "JWT" };
  const charge = { iss: sa.client_email, sub: sub || sa.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: maintenant, exp: maintenant + 3600 };
  const base = b64url(enc.encode(JSON.stringify(entete))) + "." + b64url(enc.encode(JSON.stringify(charge)));
  const clePrivee = await crypto.subtle.importKey("pkcs8", pem2binaire(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", clePrivee, enc.encode(base));
  const jwt = base + "." + b64url(signature);
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + jwt });
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Erreur("Compte de service Google refusé (" + scope + ") : " + (j.error_description || j.error || res.status), 502);
  memosJetonGoogle.set(cleMemo, { t: Date.now() + (j.expires_in - 120) * 1000, v: j.access_token });
  return j.access_token;
}
const jetonGmail = env => jetonGoogle(env, "https://www.googleapis.com/auth/gmail.send", env.GMAIL_SENDER);

// ---------- lecture de la feuille « base de données » (Outils, etc.) : compte de service, pas le compte
// personnel de l'administrateur — la délégation à l'échelle du domaine doit inclure le droit
// spreadsheets.readonly (en plus de gmail.send et drive déjà en place) dans la console d'administration Google
// Workspace (Sécurité > Contrôles des API > Délégation à l'échelle du domaine), pour le client du compte de
// service. SHEET_ID : identifiant de la feuille (dans son URL, après /d/) ; SHEET_SUB : compte @fsggb.fr usurpé
// pour la lecture (doit avoir accès à la feuille).
const CLASSEUR_PAR_DEFAUT = "1a5kRDIxKSzTQe41KtVgSlgzVB6oj9aPEYYxvy7Z7Qxs";   // classeur « intranet » (var CLASSEUR_ID)
const memoFeuilles = new Map();
async function lireFeuille(env, sub, plage) {
  // Cache court : mémoire de l'isolat 60 s, puis cache Cloudflare 3 min (données de configuration, pas de données de personnes).
  const m = memoFeuilles.get(plage); if (m && m.exp > Date.now()) return m.v;
  const cle = new Request("https://feuille.interne/" + encodeURIComponent((env.CLASSEUR_ID || CLASSEUR_PAR_DEFAUT) + "|" + plage));
  try { const c = await caches.default.match(cle); if (c) { const v = await c.json(); memoFeuilles.set(plage, { v, exp: Date.now() + 60000 }); return v; } } catch {}
  const v = await lireFeuilleBrut(env, sub, plage);
  memoFeuilles.set(plage, { v, exp: Date.now() + 60000 });
  try { await caches.default.put(cle, new Response(JSON.stringify(v), { headers: { "cache-control": "public, max-age=180" } })); } catch {}
  return v;
}
async function lireFeuilleBrut(env, sub, plage) {
  const jeton = await jetonGoogle(env, "https://www.googleapis.com/auth/spreadsheets.readonly", sub);
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + (env.CLASSEUR_ID || CLASSEUR_PAR_DEFAUT) + "/values/" + encodeURIComponent(plage), { headers: { authorization: "Bearer " + jeton } });
  const j = await res.json();
  if (!res.ok) throw new Erreur("Lecture de la feuille refusée : " + (j.error?.message || res.status), 502);
  return j.values || [];
}
async function envoyerMail(env, destinataire, sujet, corps) {
  const message = ["From: ScoutHub FSGGB <" + env.GMAIL_SENDER + ">", "To: " + destinataire, "Subject: =?utf-8?B?" + btoa(unescape(encodeURIComponent(sujet))) + "?=", "Content-Type: text/plain; charset=utf-8", "", corps].join("\r\n");
  const jeton = await jetonGmail(env);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/" + encodeURIComponent(env.GMAIL_SENDER) + "/messages/send", {
    method: "POST", headers: { authorization: "Bearer " + jeton, "content-type": "application/json" }, body: JSON.stringify({ raw: b64url(enc.encode(message)) })
  });
  if (!res.ok) throw new Erreur("L'envoi a échoué (" + res.status + ").", 502);
}
async function envoyerCode(env, email, code) {
  await envoyerMail(env, email, "Votre code de connexion ScoutHub : " + code,
    "Votre code de connexion ScoutHub : " + code + "\n\nIl est valable 10 minutes et ne sert qu'une fois.\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.");
}
async function envoyerLienMagique(env, email, token) {
  const lien = (env.SITE_RETOUR || "https://fsggb.github.io/ScoutHub/") + "?lien=" + encodeURIComponent(token);
  await envoyerMail(env, email, "Votre lien de connexion ScoutHub",
    "Cliquez sur ce lien pour vous connecter à ScoutHub (valable 15 minutes, usage unique) :\n" + lien + "\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.");
}

// ---------- quota et anti-abus (D1 remplace CacheService + PropertiesService du compteur journalier) ----------
async function purgerCodesExpires(env) { await env.DB.prepare("DELETE FROM login_codes WHERE exp < ?1").bind(Date.now()).run(); }
async function quotaJour(env) {
  const jour = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }); // AAAA-MM-JJ
  const q = await env.DB.prepare("SELECT n FROM login_codes_quota WHERE jour = ?1").bind(jour).first();
  return { jour, n: q ? q.n : 0 };
}
async function quotaIncrementer(env, jour) {
  await env.DB.prepare("INSERT INTO login_codes_quota (jour, n) VALUES (?1, 1) ON CONFLICT(jour) DO UPDATE SET n = n + 1").bind(jour).run();
}

// ---------- routes ----------
export async function authRoute(req, env, url, json, erreur) {
  try {
    if (url.pathname === "/auth/google") {
      const r = await req.json().catch(() => ({}));
      if (!env.GOOGLE_CLIENT_ID) throw new Erreur("La connexion Google n'est pas encore activée.", 503);
      const info = await verifyGoogle(env, r.credential);
      const email = cleanEmail(info.email);
      // Accès ouvert (26/11) à tout compte Google vérifié par Google (« ACCÈS MEMBRE ») : seul un compte @fsggb.fr
      // réellement Google Workspace de la fédération (hd confirmé, pas seulement l'allure de l'adresse) devient
      // membre de la fédération (fsggb=true, donne accès aux applications « protege » : ChatGDB, bibliothèque…).
      // Le code par e-mail (/auth/code/*) reste lui réservé aux adresses @fsggb.fr, inchangé.
      const estMembreFede = estFsggb(env, email) && String(info.hd || "").toLowerCase() === (env.GOOGLE_DOMAINE || "fsggb.fr");
      const photo = /^https:\/\/[^\s"<>]{1,500}$/.test(String(info.picture || "")) ? info.picture : "";
      const token = await provisionner(env, email, info.name, true, photo, estMembreFede);
      return json(200, { ok: true, token, user: publicUser(await effectif(env, email)) });
    }
    if (url.pathname === "/auth/code/demander") {
      const r = await req.json().catch(() => ({}));
      const email = cleanEmail(r.email);
      if (!estFsggb(env, email)) throw new Erreur("La connexion est réservée aux adresses @" + (env.GOOGLE_DOMAINE || "fsggb.fr") + ".");
      if (await adminGoogleSeul(env, email)) throw new Erreur("Les comptes administrateur se connectent uniquement avec Google.");
      await purgerCodesExpires(env);
      const existant = await env.DB.prepare("SELECT * FROM login_codes WHERE email = ?1").bind(email).first();
      const maintenant = Date.now();
      if (existant && maintenant - existant.envoye < 45000) throw new Erreur("Un code vient d'être envoyé : patientez un instant avant d'en demander un autre.");
      let demandes = 1, demandesDepuis = maintenant;
      if (existant && maintenant - existant.demandes_depuis < 3600000) { demandes = existant.demandes + 1; demandesDepuis = existant.demandes_depuis; if (demandes > 5) throw new Erreur("Trop de demandes pour cette adresse. Réessayez dans une heure."); }
      const { jour, n } = await quotaJour(env);
      if (n >= (+env.CODE_QUOTA_JOUR || 90)) throw new Erreur("Envoi de codes momentanément indisponible : réessayez un peu plus tard ou utilisez Google.");
      const code = ("000000" + (parseInt((await sha256(crypto.randomUUID() + crypto.randomUUID())).slice(0, 8), 16) % 1000000)).slice(-6);
      const sel = (await sha256(crypto.randomUUID())).slice(0, 16);
      await env.DB.prepare(
        "INSERT INTO login_codes (email, hash, sel, essais, envoye, demandes, demandes_depuis, exp) VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6, ?7) " +
        "ON CONFLICT(email) DO UPDATE SET hash = excluded.hash, sel = excluded.sel, essais = 0, envoye = excluded.envoye, demandes = excluded.demandes, demandes_depuis = excluded.demandes_depuis, exp = excluded.exp"
      ).bind(email, await sha256(sel + ":" + email + ":" + code), sel, maintenant, demandes, demandesDepuis, maintenant + 600000).run();
      await quotaIncrementer(env, jour);
      await envoyerCode(env, email, code);
      return json(200, { ok: true });
    }
    if (url.pathname === "/auth/code/verifier") {
      const r = await req.json().catch(() => ({}));
      const email = cleanEmail(r.email);
      if (!estFsggb(env, email) || await adminGoogleSeul(env, email)) throw new Erreur("La connexion est réservée aux adresses @" + (env.GOOGLE_DOMAINE || "fsggb.fr") + ".");
      const c = await env.DB.prepare("SELECT * FROM login_codes WHERE email = ?1 AND exp > ?2").bind(email, Date.now()).first();
      if (!c) throw new Erreur("Code expiré ou inconnu : demandez-en un nouveau.");
      const code = String(r.code || "").replace(/\D/g, "");
      if (code.length !== 6) throw new Erreur("Le code comporte 6 chiffres.");
      if (c.essais >= 5) { await env.DB.prepare("DELETE FROM login_codes WHERE email = ?1").bind(email).run(); throw new Erreur("Trop d'essais : demandez un nouveau code."); }
      if (!egal(await sha256(c.sel + ":" + email + ":" + code), c.hash)) { await env.DB.prepare("UPDATE login_codes SET essais = essais + 1 WHERE email = ?1").bind(email).run(); throw new Erreur("Code incorrect."); }
      await env.DB.prepare("DELETE FROM login_codes WHERE email = ?1").bind(email).run();
      const token = await provisionner(env, email, "", false);
      return json(200, { ok: true, token, user: publicUser(await effectif(env, email)) });
    }
    if (url.pathname === "/auth/magic/demander") {
      const r = await req.json().catch(() => ({}));
      const email = cleanEmail(r.email);
      if (!estFsggb(env, email)) throw new Erreur("La connexion est réservée aux adresses @" + (env.GOOGLE_DOMAINE || "fsggb.fr") + ".");
      if (await adminGoogleSeul(env, email)) throw new Erreur("Les comptes administrateur se connectent uniquement avec Google.");
      await env.DB.prepare("DELETE FROM magic_links WHERE exp < ?1").bind(Date.now()).run();
      const existant = await env.DB.prepare("SELECT * FROM magic_links WHERE email = ?1 ORDER BY envoye DESC LIMIT 1").bind(email).first();
      const maintenant = Date.now();
      if (existant && maintenant - existant.envoye < 45000) throw new Erreur("Un lien vient d'être envoyé : patientez un instant avant d'en demander un autre.");
      let demandes = 1, demandesDepuis = maintenant;
      if (existant && maintenant - existant.demandes_depuis < 3600000) { demandes = existant.demandes + 1; demandesDepuis = existant.demandes_depuis; if (demandes > 5) throw new Erreur("Trop de demandes pour cette adresse. Réessayez dans une heure."); }
      const { jour, n } = await quotaJour(env);
      if (n >= (+env.CODE_QUOTA_JOUR || 90)) throw new Erreur("Envoi momentanément indisponible : réessayez un peu plus tard ou utilisez Google.");
      const token = (await sha256(crypto.randomUUID() + crypto.randomUUID() + Date.now())) + (await sha256(crypto.randomUUID()));
      await env.DB.prepare("DELETE FROM magic_links WHERE email = ?1").bind(email).run();
      await env.DB.prepare("INSERT INTO magic_links (hash, email, envoye, demandes, demandes_depuis, exp) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
        .bind(await sha256(token), email, maintenant, demandes, demandesDepuis, maintenant + 900000).run();
      await quotaIncrementer(env, jour);
      await envoyerLienMagique(env, email, token);
      return json(200, { ok: true });
    }
    if (url.pathname === "/auth/magic/verifier") {
      const r = await req.json().catch(() => ({}));
      const token = String(r.token || "");
      if (!token) throw new Erreur("Lien invalide.");
      const h = await sha256(token);
      const l = await env.DB.prepare("SELECT * FROM magic_links WHERE hash = ?1 AND exp > ?2").bind(h, Date.now()).first();
      if (!l) throw new Erreur("Ce lien a expiré ou a déjà servi : redemandez-en un.");
      await env.DB.prepare("DELETE FROM magic_links WHERE hash = ?1").bind(h).run();
      const token2 = await provisionner(env, l.email, "", false);
      return json(200, { ok: true, token: token2, user: publicUser(await effectif(env, l.email)) });
    }
    if (url.pathname === "/auth/me") {
      const r = await req.json().catch(() => ({}));
      const email = await sessionEmail(env, r.token);
      return json(200, { ok: true, user: publicUser(await effectif(env, email)) });
    }
    // ---- Échange de code à usage unique (SSO vers les applications hors domaine, dont Apps Script) ----
    // 1) Le portail, session ouverte, demande un code pour une application précise (« aud », à lister dans
    //    APPS_AUTORISEES : jamais une valeur libre, pour qu'un site tiers ne puisse pas s'en faire délivrer).
    // 2) Il envoie la personne vers l'application avec ?code=… ; 3) l'application (navigateur ou serveur, ex. Apps
    //    Script) appelle /auth/echange/valider avec ce code et le même aud : le code ne sert qu'une fois, 60 secondes.
    if (url.pathname === "/auth/echange/emettre") {
      const r = await req.json().catch(() => ({}));
      const email = await sessionEmail(env, r.token);
      const aud = String(r.aud || "");
      if (!appAutorisee(env, aud)) throw new Erreur("Application non autorisée.", 403);
      const code = (await sha256(crypto.randomUUID() + crypto.randomUUID())) + (await sha256(crypto.randomUUID()));
      await env.DB.prepare("DELETE FROM echanges WHERE exp < ?1").bind(Date.now()).run();
      await env.DB.prepare("INSERT INTO echanges (hash, email, aud, exp) VALUES (?1, ?2, ?3, ?4)").bind(await sha256(code), email, aud, Date.now() + 60000).run();
      return json(200, { ok: true, code, expire_dans: 60 });
    }
    if (url.pathname === "/auth/echange/valider") {
      const r = await req.json().catch(() => ({}));
      const code = String(r.code || ""), aud = String(r.aud || "");
      if (!code || !appAutorisee(env, aud)) throw new Erreur("Code ou application invalide.", 403);
      // Suppression et lecture en une seule instruction : deux appels simultanés ne peuvent pas le consommer deux fois.
      const e = await env.DB.prepare("DELETE FROM echanges WHERE hash = ?1 RETURNING email, aud, exp").bind(await sha256(code)).first();
      if (!e || e.exp < Date.now() || e.aud !== aud) throw new Erreur("Ce code a expiré ou a déjà servi.", 403);
      const u = await getUser(env, e.email);
      if (!u) throw new Erreur("Compte introuvable.", 403);
      const rep = { ok: true, user: publicUser(await effectif(env, e.email)) };
      if (r.session) rep.token = await nouvelleSession(env, e.email);   // applications web hors domaine : leur propre session
      return json(200, rep);
    }
    // Serveur à serveur (Apps Script, ancienne version du portail) : « ce jeton de session est-il valide, et pour qui ? ».
    // Ne renvoie que l'identité et le rôle effectif, jamais de données de la feuille.
    if (url.pathname === "/auth/session/valider") {
      const r = await req.json().catch(() => ({}));
      const email = await sessionEmail(env, r.token);
      const u = await effectif(env, email);
      if (!u) throw new Erreur("Compte introuvable.", 403);
      return json(200, { ok: true, user: publicUser(u) });
    }
    if (url.pathname === "/auth/logout") {
      const r = await req.json().catch(() => ({}));
      if (r.token) await env.DB.prepare("DELETE FROM sessions WHERE hash = ?1").bind(await sha256(String(r.token))).run();
      return json(200, { ok: true });
    }
    // Métadonnées des outils (nom/description/image/lien/visibilité) lues dans la feuille « base de données »
    // fournie par l'administrateur, via le compte de service (pas le compte personnel d'un administrateur) : lecture
    // publique, les données elles-mêmes (liste des outils) ne sont pas sensibles. SHEET_SUB est provisoire : à
    // ajuster si le compte usurpé n'a pas accès à la feuille (voir le commentaire au-dessus de lireFeuille).
    if (url.pathname === "/auth/outils") {
      // Outils de la fédération : feuille « Outils » du classeur, lue par le compte de service. Visibilité par outil :
      // « All » = tout membre de la fédération connecté (@fsggb.fr) ; « Equipe nationale » = ce rôle et au-dessus ;
      // autre valeur (une ou plusieurs, séparées par des virgules) = nom d'un groupe ou d'une unité (le chef ou le membre de cette portée).
      const r = await req.json().catch(() => ({}));
      const reel = await sessionEmail(env, r.token);
      if (r.comme && !adminDonnees(env, reel)) throw new Erreur("Simulation réservée à l'administrateur.", 403);
      const email = r.comme ? cleanEmail(r.comme) : reel;
      let u = await effectif(env, email);
      if (!u && r.comme) { const h = await env.DB.prepare("SELECT role, groupe_id, unite_id FROM habilitations WHERE email = ?1").bind(email).first(); if (h) u = { email, role: h.role, groupe_id: h.groupe_id, unite_id: h.unite_id, fsggb: 1 }; }
      if (!u) throw new Erreur("Adresse inconnue.", 404);
      const role = normRole(u.role), membre = u.fsggb === undefined ? true : !!u.fsggb, admin = role === "admin";
      const g = u.groupe_id ? await env.DB.prepare("SELECT nom FROM groupes WHERE id = ?1").bind(u.groupe_id).first() : null;
      const un = u.unite_id ? await env.DB.prepare("SELECT nom FROM unites WHERE id = ?1").bind(u.unite_id).first() : null;
      const miens = new Set([g && slug(g.nom), un && slug(un.nom)].filter(Boolean));
      const visible = v => {
        if (admin) return true;
        const vals = String(v || "").split(/[,;]/).map(x => x.trim()).filter(Boolean);
        if (!vals.length) return false;   // visibilité vide : jamais montré par défaut
        return vals.some(x => { const k = slug(x); return k === "all" ? membre : k === "equipe-nationale" ? ROLES.indexOf(role) >= ROLES.indexOf("equipe_nationale") && membre : miens.has(k); });
      };
      const lignes = await lireFeuille(env, "", "Outils!A2:E100");
      const lien = l => /^https?:\/\//i.test(l) ? l : (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(l) ? "https://" + l : "");
      const dispo = new Map((await env.DB.prepare("SELECT cle, nom, description, section, ordre FROM disposition").all()).results.map(d => [d.cle, d]));
      const outils = lignes.filter(l => l[0] && lien(String(l[3] || "").trim()) && visible(l[4]))
        .map(l => { const cle = "o:" + slug(l[0]), d = dispo.get(cle); return { cle, nom: (d && d.nom) || String(l[0]).trim(), desc: (d && d.description) || l[1] || "", lien: lien(String(l[3]).trim()), image: String(l[2] || "").trim().slice(0, 200), section: d ? d.section : "", ordre: d ? d.ordre : null }; });
      const layout = { sections: [], apps: [] };
      for (const [cle, d] of dispo) { if (cle.startsWith("s:")) layout.sections.push({ id: cle.slice(2), titre: d.nom, ligne: d.section, ordre: d.ordre }); else if (cle.startsWith("a:")) layout.apps.push({ id: cle.slice(2), nom: d.nom, desc: d.description, section: d.section, ordre: d.ordre }); }
      return json(200, { ok: true, outils, layout });
    }
    // ---- Portée de lecture des données du registre (appelé par le Worker « donnees ») ----
    // Renvoie ce que la personne a le droit de voir : administrateur des données (DONNEES_ADMINS) = tout ; chef de groupe =
    // son groupe ; chef d'unité = son unité ; tout autre profil = rien. Seul un administrateur peut demander « comme »
    // (voir ce que verrait une autre adresse) : la portée simulée est calculée exactement comme pour la vraie personne.
    if (url.pathname === "/auth/portee") {
      const r = await req.json().catch(() => ({}));
      const reel = await sessionEmail(env, r.token);
      if (r.comme && !adminDonnees(env, reel)) throw new Erreur("Simulation réservée à l'administrateur.", 403);
      return json(200, { ok: true, reel, admin_reel: adminDonnees(env, reel), ...(await porteeDonnees(env, r.comme ? cleanEmail(r.comme) : reel)), simule: !!r.comme });
    }
    // Profil d'une adresse, pour qu'un administrateur voie TOUT le site comme cette personne (lecture seule : le serveur
    // n'accepte « comme » que sur des lectures, jamais sur une écriture). Réservé à DONNEES_ADMINS.
    if (url.pathname === "/auth/profil") {
      const r = await req.json().catch(() => ({}));
      const reel = await sessionEmail(env, r.token);
      if (!adminDonnees(env, reel)) throw new Erreur("Simulation réservée à l'administrateur.", 403);
      const email = cleanEmail(r.comme);
      let u = await effectif(env, email);
      if (!u) {
        const h = await env.DB.prepare("SELECT role, groupe_id, unite_id FROM habilitations WHERE email = ?1").bind(email).first();
        u = { email, role: h ? h.role : "adherent", name: "", google: 0, picture: "", fsggb: estFsggb(env, email) ? 1 : 0, groupe_id: h ? h.groupe_id : null, unite_id: h ? h.unite_id : null };
      }
      const g = u.groupe_id ? await env.DB.prepare("SELECT nom FROM groupes WHERE id = ?1").bind(u.groupe_id).first() : null;
      const un = u.unite_id ? await env.DB.prepare("SELECT nom FROM unites WHERE id = ?1").bind(u.unite_id).first() : null;
      const h = await env.DB.prepare("SELECT 1 AS x FROM habilitations WHERE email = ?1").bind(email).first();
      return json(200, { ok: true, user: { ...publicUser(u), simule: true }, groupe_nom: g ? g.nom.trim() : "", unite_nom: un ? un.nom.trim() : "", connu: !!(await env.DB.prepare("SELECT 1 AS x FROM users WHERE email = ?1").bind(email).first()), chef: !!h });
    }
    // Adresses qu'un administrateur peut simuler : les accès chef déduits de la feuille « Groupes et unités ».
    if (url.pathname === "/auth/habilites") {
      const r = await req.json().catch(() => ({}));
      if (!adminDonnees(env, await sessionEmail(env, r.token))) throw new Erreur("Réservé à l'administrateur.", 403);
      const { results } = await env.DB.prepare("SELECT h.email, h.role, g.nom AS groupe, u.nom AS unite FROM habilitations h LEFT JOIN groupes g ON g.id = h.groupe_id LEFT JOIN unites u ON u.id = h.unite_id ORDER BY g.nom, u.nom, h.email").all();
      return json(200, { ok: true, habilites: results });
    }
    // ---- Entrées ajoutées par l'administrateur (applications, documentation), chacune avec SON public ----
    // Le filtrage se fait ICI, côté serveur : une entrée qui ne concerne pas la personne ne lui est jamais envoyée (ni son
    // nom, ni son adresse, ni la liste de ceux qui la voient). Seul l'administrateur reçoit aussi le public de chaque entrée.
    if (url.pathname === "/auth/entrees") {
      const r = await req.json().catch(() => ({}));
      const reel = await sessionEmail(env, r.token);
      if (r.comme && !adminDonnees(env, reel)) throw new Erreur("Simulation réservée à l'administrateur.", 403);
      const section = SECTIONS.includes(r.section) ? r.section : ""; if (!section) throw new Erreur("Section inconnue.");
      const p = await profilVue(env, r.comme ? cleanEmail(r.comme) : reel);
      const admin = !r.comme && p.role === "admin";
      const { results } = await env.DB.prepare("SELECT id, nom, description, url, audience FROM entrees WHERE section = ?1 ORDER BY nom").bind(section).all();
      const vues = results.filter(e => admin || audienceVisible(p, e.audience));
      const dispo = new Map((await env.DB.prepare("SELECT cle, section, ordre FROM disposition").all()).results.map(d => [d.cle, d]));
      const pos = e => { const d = dispo.get("e:" + e.id); return { cle: "e:" + e.id, section: d ? d.section : "", ordre: d ? d.ordre : null }; };
      return json(200, { ok: true, admin, entrees: vues.map(e => admin ? { ...e, audience: e.audience.split(","), ...pos(e) } : { id: e.id, nom: e.nom, description: e.description, url: e.url, ...pos(e) }) });
    }
    if (url.pathname === "/auth/entree/ecrire") {
      const r = await req.json().catch(() => ({}));
      await requireAdmin(env, r.token);
      const section = SECTIONS.includes(r.section) ? r.section : ""; if (!section) throw new Erreur("Section inconnue.");
      const nom = String(r.nom || "").trim().slice(0, 60); if (!nom) throw new Erreur("Donnez un nom.");
      const desc = String(r.description || "").trim().slice(0, 200);
      const lien = String(r.url || "").trim(); if (!/^https:\/\/[^\s"'<>\\]{3,1500}$/.test(lien)) throw new Erreur("L'adresse doit commencer par https://.");
      const aud = [...new Set((Array.isArray(r.audience) ? r.audience : []).map(String))].slice(0, 12);
      if (!aud.length) throw new Erreur("Choisissez qui est concerné.");
      for (const a of aud) {
        if (/^(all|chef_unite|chef_groupe|equipe_nationale|admin)$/.test(a)) continue;
        if (a.startsWith("g:") && await env.DB.prepare("SELECT 1 FROM groupes WHERE id = ?1").bind(a.slice(2)).first()) continue;
        if (a.startsWith("u:") && await env.DB.prepare("SELECT 1 FROM unites WHERE id = ?1").bind(a.slice(2)).first()) continue;
        throw new Erreur("Public inconnu : " + a.slice(0, 40));
      }
      const id = /^[a-z0-9-]{3,80}$/.test(String(r.id || "")) && await env.DB.prepare("SELECT 1 FROM entrees WHERE id = ?1").bind(r.id).first() ? r.id : (slug(nom) || "entree") + "-" + (await sha256(crypto.randomUUID())).slice(0, 6);
      await env.DB.prepare("INSERT INTO entrees (id, section, nom, description, url, audience, maj) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(id) DO UPDATE SET section = excluded.section, nom = excluded.nom, description = excluded.description, url = excluded.url, audience = excluded.audience, maj = excluded.maj")
        .bind(id, section, nom, desc, lien, aud.join(","), Date.now()).run();
      return json(200, { ok: true, id });
    }
    // Disposition (section, ordre, nom/description affichés) des outils dynamiques : stockée À PART de la mise en page partagée,
    // et renvoyée seulement avec les outils que la personne peut voir (aucune fuite d'un outil restreint).
    if (url.pathname === "/auth/outils/disposer") {
      const r = await req.json().catch(() => ({}));
      await requireAdmin(env, r.token);
      const items = Array.isArray(r.items) ? r.items.slice(0, 300) : [];
      const lot = [];
      for (const it of items) {
        const cle = String(it.cle || ""); if (!/^[oeas]:[a-z0-9-]{1,100}$/.test(cle)) throw new Erreur("Outil inconnu : " + cle.slice(0, 40));
        const sec = String(it.section || "").slice(0, 60); if (sec && !/^[a-z0-9-]{1,60}$/.test(sec)) throw new Erreur("Section invalide.");
        const nomLibre = cle.startsWith("o:") || cle.startsWith("a:") || cle.startsWith("s:");
        lot.push(env.DB.prepare("INSERT INTO disposition (cle, nom, description, section, ordre) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(cle) DO UPDATE SET nom = excluded.nom, description = excluded.description, section = excluded.section, ordre = excluded.ordre")
          .bind(cle, nomLibre ? String(it.nom || "").trim().slice(0, 60) : "", (cle.startsWith("o:") || cle.startsWith("a:")) ? String(it.description || "").trim().slice(0, 200) : "", sec, Math.max(0, Math.min(999, parseInt(it.ordre, 10) || 0))));
      }
      for (const c of (Array.isArray(r.supprimer) ? r.supprimer.slice(0, 50) : [])) if (/^s:[a-z0-9-]{1,60}$/.test(String(c))) lot.push(env.DB.prepare("DELETE FROM disposition WHERE cle = ?1").bind(String(c)));
      if (lot.length) await env.DB.batch(lot);
      return json(200, { ok: true, n: lot.length });
    }
    // Contenu d'une rubrique de Documentation, DÉJÀ FILTRÉ selon la personne (rôle, groupe, unité). Simulation : admin seulement.
    if (url.pathname === "/auth/rubrique") {
      const r = await req.json().catch(() => ({}));
      const reel = await sessionEmail(env, r.token);
      if (r.comme && !adminDonnees(env, reel)) throw new Erreur("Simulation réservée à l'administrateur.", 403);
      const email = r.comme ? cleanEmail(r.comme) : reel, def = RUBRIQUES[String(r.rubrique || "")];
      if (!def) throw new Erreur("Rubrique inconnue.", 404);
      const p = await profilVue(env, email), rang = ROLES.indexOf(p.role);
      if (!p.membre || rang < ROLES.indexOf(def.min)) throw new Erreur("Cette rubrique ne vous est pas destinée.", 403);
      const brut = await lireFeuille(env, "", "'" + def.feuille + "'!" + def.plage);
      let portee = null; if (def.portee && p.role !== "admin" && rang < ROLES.indexOf("equipe_nationale")) { portee = await porteeDonnees(env, email); if (portee.acces === "aucun") throw new Erreur("Cette rubrique ne vous est pas destinée.", 403); }
      const sortie = def.sortie || def.cols;
      const lignes = brut.filter(l => l.some(c => String(c || "").trim())).filter(l => !def.filtre || def.filtre(l, rang)).filter(l => {
        if (!portee || portee.acces === "tout") return true;
        const g = slug(l[0]), u = slug(l[1]);   // « Lieux de camp » : Groupe, Unité en colonnes A et B
        return g === portee.gk && (portee.acces === "groupe" || u === portee.uk);
      }).map(l => { const o = {}; def.cols.forEach((c, i) => { if (sortie.includes(c)) o[c] = String(l[i] === undefined ? "" : l[i]).trim().slice(0, 4000); }); if (o.lien !== undefined) o.lien = lienHttps(o.lien); if (o.video !== undefined) o.video = lienHttps(o.video); return o; });
      for (const o of lignes) {   // jetons de miniature (1re page) pour les revues et les documents du Drive
        if (r.rubrique === "Revues" && /^Revues_Files_\/[^/]+$/i.test(o.fichier || "")) o.mini = await signerMini(env, "p:" + o.fichier);
        else if (r.rubrique === "Administratif" && idDrive(o.lien)) o.mini = await signerMini(env, "i:" + idDrive(o.lien));
      }
      return json(200, { ok: true, rubrique: r.rubrique, colonnes: sortie, lignes, portee: portee ? portee.acces : "tout" });
    }
    // Textes de l'interface modifiables par l'administrateur (double-clic) : « texte d'origine » → « texte affiché ».
    // Lecture ouverte (ce sont des libellés, rien de sensible) ; écriture réservée à l'administrateur.
    if (url.pathname === "/auth/textes") {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS textes (orig TEXT PRIMARY KEY, valeur TEXT NOT NULL, maj INTEGER NOT NULL)").run();
      const { results } = await env.DB.prepare("SELECT orig, valeur FROM textes LIMIT 3000").all();
      return json(200, { ok: true, textes: results });
    }
    if (url.pathname === "/auth/textes/ecrire") {
      const r = await req.json().catch(() => ({}));
      await requireAdmin(env, r.token);
      const orig = String(r.orig || "").trim().slice(0, 400), valeur = String(r.valeur || "").trim().slice(0, 800);
      if (!orig) throw new Erreur("Texte d'origine manquant.");
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS textes (orig TEXT PRIMARY KEY, valeur TEXT NOT NULL, maj INTEGER NOT NULL)").run();
      if (!valeur || valeur === orig) await env.DB.prepare("DELETE FROM textes WHERE orig = ?1").bind(orig).run();
      else await env.DB.prepare("INSERT INTO textes (orig, valeur, maj) VALUES (?1, ?2, ?3) ON CONFLICT(orig) DO UPDATE SET valeur = excluded.valeur, maj = excluded.maj").bind(orig, valeur, Date.now()).run();
      return json(200, { ok: true });
    }
    if (url.pathname === "/auth/entree/supprimer") {
      const r = await req.json().catch(() => ({}));
      await requireAdmin(env, r.token);
      await env.DB.prepare("DELETE FROM entrees WHERE id = ?1").bind(String(r.id || "")).run();
      return json(200, { ok: true });
    }
    // Rubriques d'un menu de l'ancien intranet (feuille « Menu », colonne Visible), déjà filtrées selon la personne.
    if (url.pathname === "/auth/menu") {
      const r = await req.json().catch(() => ({}));
      const reel = await sessionEmail(env, r.token);
      if (r.comme && !adminDonnees(env, reel)) throw new Erreur("Simulation réservée à l'administrateur.", 403);
      if (r.menu === "Accueil") {   // images des boutons de la page d'accueil (feuille « Accueil » : nom, lien, image)
        const pa = await profilVue(env, r.comme ? cleanEmail(r.comme) : reel);
        if (!pa.membre) return json(200, { ok: true, rubriques: [] });
        return json(200, { ok: true, rubriques: (await lireFeuille(env, "", "Accueil!A2:C20")).filter(l => l[0]).map(l => ({ nom: String(l[0]).trim(), image: String(l[2] || "").trim().slice(0, 200) })) });
      }
      const rubrique = ["Documentation", "Inscriptions"].includes(r.menu) ? r.menu : ""; if (!rubrique) throw new Erreur("Menu inconnu.");
      const p = await profilVue(env, r.comme ? cleanEmail(r.comme) : reel);
      const lignes = await lireFeuille(env, "", "Menu!A2:E100");
      const vis = v => { if (p.role === "admin") return true; const k = slug(v || "all") || "all"; return k === "all" ? p.membre : k === "equipe-nationale" ? p.membre && ROLES.indexOf(p.role) >= ROLES.indexOf("equipe_nationale") : false; };
      const lisible = nom => { const d = RUBRIQUES[nom]; return !d || p.role === "admin" || (p.membre && ROLES.indexOf(p.role) >= ROLES.indexOf(d.min)); };
      return json(200, { ok: true, rubriques: lignes.filter(l => l[0] === rubrique && l[1] && vis(l[4]) && lisible(String(l[1]).trim())).map(l => ({ nom: String(l[1]).trim(), image: String(l[3] || "").trim().slice(0, 200) })) });
    }
    if (url.pathname === "/auth/admin/list") {
      await requireAdmin(env, (await req.json().catch(() => ({}))).token);
      const { results } = await env.DB.prepare("SELECT u.email, u.role, u.created, u.google, p.groupe_id, p.unite_id FROM users u LEFT JOIN portees p ON p.email = u.email ORDER BY u.email").all();
      return json(200, { ok: true, users: results.map(u => ({ email: u.email, role: normRole(u.role), created: u.created, google: !!u.google, groupe_id: u.groupe_id || null, unite_id: u.unite_id || null })) });
    }
    if (url.pathname === "/auth/admin/groupes") {
      await requireAdmin(env, (await req.json().catch(() => ({}))).token);
      const g = (await env.DB.prepare("SELECT id, nom FROM groupes ORDER BY nom").all()).results;
      const u = (await env.DB.prepare("SELECT id, groupe_id, nom FROM unites ORDER BY nom").all()).results;
      return json(200, { ok: true, groupes: g, unites: u });
    }
    if (url.pathname === "/auth/admin/groupe/creer") {
      const r = await req.json().catch(() => ({}));
      await requireAdmin(env, r.token);
      const id = slug(r.nom); if (!id) throw new Erreur("Nom de groupe invalide.");
      const nom = String(r.nom).slice(0, 100);
      // Deux noms proches (« A B » et « a-b ») donnent le même identifiant : sans ce contrôle, créer le second
      // renommerait silencieusement le premier groupe (ON CONFLICT ci-dessous), en perdant son vrai nom.
      const existant = await env.DB.prepare("SELECT nom FROM groupes WHERE id = ?1").bind(id).first();
      if (existant && existant.nom !== nom) throw new Erreur("Un autre groupe (« " + existant.nom + " ») correspond déjà à cet identifiant : choisissez un nom moins proche.");
      await env.DB.prepare("INSERT INTO groupes (id, nom) VALUES (?1, ?2) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom").bind(id, nom).run();
      return json(200, { ok: true, id });
    }
    if (url.pathname === "/auth/admin/unite/creer") {
      const r = await req.json().catch(() => ({}));
      await requireAdmin(env, r.token);
      const groupeId = String(r.groupe_id || ""); if (!(await env.DB.prepare("SELECT 1 FROM groupes WHERE id = ?1").bind(groupeId).first())) throw new Erreur("Groupe inconnu.");
      if (!slug(r.nom)) throw new Erreur("Nom d'unité invalide.");
      const id = groupeId + "-" + slug(r.nom), nom = String(r.nom).slice(0, 100);
      const existante = await env.DB.prepare("SELECT nom FROM unites WHERE id = ?1").bind(id).first();
      if (existante && existante.nom !== nom) throw new Erreur("Une autre unité (« " + existante.nom + " ») correspond déjà à cet identifiant : choisissez un nom moins proche.");
      await env.DB.prepare("INSERT INTO unites (id, groupe_id, nom) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom").bind(id, groupeId, nom).run();
      return json(200, { ok: true, id });
    }
    if (url.pathname === "/auth/admin/scope") {
      const r = await req.json().catch(() => ({}));
      await requireAdmin(env, r.token);
      const email = cleanEmail(r.email), u = await getUser(env, email);
      if (!u) throw new Erreur("Compte introuvable.");
      const groupeId = r.groupe_id ? String(r.groupe_id) : null, uniteId = r.unite_id ? String(r.unite_id) : null;
      if (groupeId && !(await env.DB.prepare("SELECT 1 FROM groupes WHERE id = ?1").bind(groupeId).first())) throw new Erreur("Groupe inconnu.");
      if (uniteId) {
        const un = await env.DB.prepare("SELECT groupe_id FROM unites WHERE id = ?1").bind(uniteId).first();
        if (!un) throw new Erreur("Unité inconnue.");
        if (!groupeId || un.groupe_id !== groupeId) throw new Erreur("Cette unité n'appartient pas au groupe indiqué.");
      }
      if (normRole(u.role) === "chef_unite" && (!groupeId || !uniteId)) throw new Erreur("Un chef d'unité doit avoir un groupe ET une unité.");
      if (normRole(u.role) === "chef_groupe" && !groupeId) throw new Erreur("Un chef de groupe doit avoir un groupe.");
      await env.DB.prepare("INSERT INTO portees (email, groupe_id, unite_id) VALUES (?1, ?2, ?3) ON CONFLICT(email) DO UPDATE SET groupe_id = excluded.groupe_id, unite_id = excluded.unite_id")
        .bind(email, groupeId, uniteId).run();
      return json(200, { ok: true });
    }
    if (url.pathname === "/auth/admin/role") {
      const r = await req.json().catch(() => ({}));
      await requireAdmin(env, r.token);
      const email = cleanEmail(r.email), u = await getUser(env, email);
      if (!u) throw new Erreur("Compte introuvable.");
      if (!ROLES.includes(r.role)) throw new Erreur("Rôle inconnu.");
      if (adminProtege(env, email) && r.role !== "admin") throw new Erreur("Ce compte administrateur garde son rôle.");
      // Un compte Google externe (fsggb=false, ACCÈS MEMBRE ouvert à tous) ne peut pas devenir chef/équipe
      // nationale/admin : ces rôles supposent un vrai compte @fsggb.fr de la fédération.
      if (!u.fsggb && r.role !== "adherent" && r.role !== "parent") throw new Erreur("Ce compte n'est pas un compte @fsggb.fr : il ne peut pas recevoir ce rôle.");
      await saveUser(env, email, { role: r.role, created: u.created, name: u.name, google: u.google, picture: u.picture, fsggb: u.fsggb });
      return json(200, { ok: true });
    }
    if (url.pathname === "/auth/admin/delete") {
      const r = await req.json().catch(() => ({}));
      await requireAdmin(env, r.token);
      const email = cleanEmail(r.email);
      if (adminProtege(env, email)) throw new Erreur("Un compte administrateur ne peut pas être supprimé.");
      await env.DB.prepare("DELETE FROM portees WHERE email = ?1").bind(email).run();
      await env.DB.prepare("DELETE FROM users WHERE email = ?1").bind(email).run();
      return json(200, { ok: true });
    }
  } catch (e) { return erreur(e instanceof Erreur ? e.code : 500, e && e.message ? e.message : "Erreur du serveur."); }
  return erreur(404, "Adresse inconnue.");
}

// Pour les autres routes du Worker, une fois la bascule faite : vérifie un jeton de session /auth/* (remplace verifierJeton).
export async function quiEstCe(env, token) {
  const email = await sessionEmail(env, token);
  const u = await effectif(env, email);
  return { e: email, r: normRole(u.role), n: u.name || "", groupe_id: u.groupe_id, unite_id: u.unite_id };
}
// Pour les futures routes de données sensibles (fiches sanitaires, listes d'adhérents…) : filtrer AVANT d'envoyer,
// jamais seulement côté affichage. `qui` est l'objet renvoyé par quiEstCe (ou getUser/publicUser).
export { peutVoirGroupe, peutVoirUnite };
