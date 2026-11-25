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
    await env.DB.prepare("INSERT OR IGNORE INTO users (email, role, name, google, created) VALUES (?1, 'admin', '', 0, ?2)").bind(email, Date.now()).run();
    return { email, role: "admin", name: "", google: 0, created: Date.now(), groupe_id: null, unite_id: null };
  }
  return null;
}
async function saveUser(env, email, base) {
  const role = adminProtege(env, email) ? "admin" : normRole(base.role);
  await env.DB.prepare(
    "INSERT INTO users (email, role, name, google, created) VALUES (?1, ?2, ?3, ?4, ?5) " +
    "ON CONFLICT(email) DO UPDATE SET role = excluded.role, name = excluded.name, google = excluded.google"
  ).bind(email, role, base.name || "", base.google ? 1 : 0, base.created || Date.now()).run();
}
function publicUser(u) { return { email: u.email, role: normRole(u.role), name: u.name || "", google: !!u.google, groupe_id: u.groupe_id || null, unite_id: u.unite_id || null }; }
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
  const h = await sha256(token), jours = +env.SESSION_JOURS || 14;
  await env.DB.prepare("INSERT INTO sessions (hash, email, exp, created) VALUES (?1, ?2, ?3, ?4)").bind(h, email, Date.now() + jours * 864e5, Date.now()).run();
  return token;
}
async function sessionEmail(env, token) {
  if (!token) throw new Erreur("Session expirée : reconnectez-vous.", 401);
  const h = await sha256(String(token));
  const s = await env.DB.prepare("SELECT * FROM sessions WHERE hash = ?1").bind(h).first();
  if (!s || s.exp < Date.now()) { if (s) await env.DB.prepare("DELETE FROM sessions WHERE hash = ?1").bind(h).run(); throw new Erreur("Session expirée : reconnectez-vous.", 401); }
  if (!estFsggb(env, s.email) || !(await getUser(env, s.email))) throw new Erreur("Session expirée : reconnectez-vous.", 401);
  return s.email;
}
async function requireAdmin(env, token) {
  const email = await sessionEmail(env, token);
  const u = await getUser(env, email);
  if (!u || u.role !== "admin") throw new Erreur("Réservé à l'administrateur.", 403);
  return email;
}
// Ouvre le compte au premier passage (adresse déjà prouvée par Google ou par le code) puis ouvre une session.
async function provisionner(env, email, nom, google) {
  const u = await getUser(env, email);
  if (!u) await saveUser(env, email, { role: "adherent", created: Date.now(), name: nom || "", google: !!google });
  else if ((google && !u.google) || (!u.name && nom)) await saveUser(env, email, { role: u.role, created: u.created, name: u.name || nom || "", google: !!u.google || !!google });
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
let memoJetonGmail = { t: 0, v: "" };
async function jetonGmail(env) {
  if (memoJetonGmail.v && Date.now() < memoJetonGmail.t) return memoJetonGmail.v;
  const cle = env.GMAIL_SA_KEY && typeof env.GMAIL_SA_KEY.get === "function" ? await env.GMAIL_SA_KEY.get() : env.GMAIL_SA_KEY;
  if (!cle) throw new Erreur("Envoi du code indisponible : secret GMAIL_SA_KEY absent du serveur.", 503);
  const sa = JSON.parse(cle);
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = { alg: "RS256", typ: "JWT" };
  const charge = { iss: sa.client_email, sub: env.GMAIL_SENDER, scope: "https://www.googleapis.com/auth/gmail.send", aud: "https://oauth2.googleapis.com/token", iat: maintenant, exp: maintenant + 3600 };
  const base = b64url(enc.encode(JSON.stringify(entete))) + "." + b64url(enc.encode(JSON.stringify(charge)));
  const clePrivee = await crypto.subtle.importKey("pkcs8", pem2binaire(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", clePrivee, enc.encode(base));
  const jwt = base + "." + b64url(signature);
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + jwt });
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Erreur("Compte de service Google refusé : " + (j.error_description || j.error || res.status), 502);
  memoJetonGmail = { t: Date.now() + (j.expires_in - 120) * 1000, v: j.access_token };
  return j.access_token;
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
      if (!estFsggb(env, email) || String(info.hd || "").toLowerCase() !== (env.GOOGLE_DOMAINE || "fsggb.fr")) throw new Erreur("La connexion est réservée aux adresses @" + (env.GOOGLE_DOMAINE || "fsggb.fr") + ".");
      const token = await provisionner(env, email, info.name, true);
      return json(200, { ok: true, token, user: publicUser(await getUser(env, email)) });
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
      return json(200, { ok: true, token, user: publicUser(await getUser(env, email)) });
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
      return json(200, { ok: true, token: token2, user: publicUser(await getUser(env, l.email)) });
    }
    if (url.pathname === "/auth/me") {
      const r = await req.json().catch(() => ({}));
      const email = await sessionEmail(env, r.token);
      return json(200, { ok: true, user: publicUser(await getUser(env, email)) });
    }
    if (url.pathname === "/auth/logout") {
      const r = await req.json().catch(() => ({}));
      if (r.token) await env.DB.prepare("DELETE FROM sessions WHERE hash = ?1").bind(await sha256(String(r.token))).run();
      return json(200, { ok: true });
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
      await env.DB.prepare("INSERT INTO groupes (id, nom) VALUES (?1, ?2) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom").bind(id, String(r.nom).slice(0, 100)).run();
      return json(200, { ok: true, id });
    }
    if (url.pathname === "/auth/admin/unite/creer") {
      const r = await req.json().catch(() => ({}));
      await requireAdmin(env, r.token);
      const groupeId = String(r.groupe_id || ""); if (!(await env.DB.prepare("SELECT 1 FROM groupes WHERE id = ?1").bind(groupeId).first())) throw new Erreur("Groupe inconnu.");
      const id = groupeId + "-" + slug(r.nom); if (!slug(r.nom)) throw new Erreur("Nom d'unité invalide.");
      await env.DB.prepare("INSERT INTO unites (id, groupe_id, nom) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom").bind(id, groupeId, String(r.nom).slice(0, 100)).run();
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
      await saveUser(env, email, { role: r.role, created: u.created, name: u.name, google: u.google });
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
  const u = await getUser(env, email);
  return { e: email, r: normRole(u.role), n: u.name || "", groupe_id: u.groupe_id, unite_id: u.unite_id };
}
// Pour les futures routes de données sensibles (fiches sanitaires, listes d'adhérents…) : filtrer AVANT d'envoyer,
// jamais seulement côté affichage. `qui` est l'objet renvoyé par quiEstCe (ou getUser/publicUser).
export { peutVoirGroupe, peutVoirUnite };
