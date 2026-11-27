// ---------- Relais ChatGDB : vérifie le jeton signé par Apps Script (backend/Code.gs), applique les limites de
// crédits, transmet la requête à Claude et renvoie la réponse au fil de l'eau ; la consommation est enregistrée
// dans D1 (table usage) une fois la réponse terminée. Aussi : dictée vocale (Whisper) pour tous les comptes.
// Secret : ANTHROPIC_KEY (clé Claude, jamais visible du navigateur).
import { enc, hex, b64url, neuronsJour, neuronsAjouter, jourUtc, NEURONS_PAR_MINUTE } from "./commun.js";
import { paroleWav, HALLUCINATION } from "./voix.js";

// Prix connus ($ par million de jetons : entrée, sortie), par version ; une version inconnue (plus récente) prend le prix de sa famille.
export const MODELES = { "claude-haiku-5-5": [0.10, 0.50], "claude-sonnet-5-5": [2, 10], "claude-opus-5-5": [4, 20] };
export const PRIX_FAMILLE = { haiku: [0.10, 0.50], sonnet: [2, 10], opus: [4, 20] };
export const ADMIN_SEUL = new Set(["opus"]);   // familles réservées à l'administrateur
export const famille = id => { const m = /^claude-(haiku|sonnet|opus)-/.exec(String(id || "")); return m ? m[1] : ""; };
const prixDe = id => MODELES[id] || PRIX_FAMILLE[famille(id)] || PRIX_FAMILLE.haiku;   // $ par million de jetons (entrée, sortie)
export const MAX_JETONS = 128000, CREDIT_DOLLARS = 0.001;       // plafond de sécurité très large : la vraie limite est celle du modèle (Claude la signale)

// Jeton = charge (JSON en base64url : e = adresse, r = rôle, x = expiration) + "." + HMAC-SHA256 hexadécimal
export async function verifierJeton(jeton, secret) {
  const [charge, signature] = String(jeton || "").split(".");
  if (!charge || !signature || !secret) return null;
  const cle = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const attendu = hex(await crypto.subtle.sign("HMAC", cle, enc.encode(charge)));
  if (attendu.length !== signature.length) return null;
  let diff = 0; for (let i = 0; i < attendu.length; i++) diff |= attendu.charCodeAt(i) ^ signature.charCodeAt(i);
  if (diff) return null;
  let p; try { p = JSON.parse(new TextDecoder().decode(b64url(charge))); } catch { return null; }
  return p && p.e && p.x > Date.now() ? p : null;
}
function cout(modele, u, recherches) {
  const p = prixDe(modele);
  const entree = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) * 1.25 + (u.cache_read_input_tokens || 0) * 0.1;
  const dollars = (entree * p[0] + (u.output_tokens || 0) * p[1]) / 1e6 + recherches * 0.01;
  return { dollars, credits: Math.max(1, Math.ceil(dollars / CREDIT_DOLLARS - 1e-9)) };
}
export async function etatCredits(env, qui) {
  const email = qui.e, maintenant = Date.now(), h = (+env.FENETRE_HEURES || 5) * 3600000, sem = 7 * 86400000;
  const r = await env.DB.prepare(
    "SELECT COALESCE(SUM(CASE WHEN ts > ?2 THEN credits END), 0) AS fenetre, MIN(CASE WHEN ts > ?2 THEN ts END) AS premierF, " +
    "COALESCE(SUM(credits), 0) AS semaine, MIN(ts) AS premierS, COUNT(*) AS appels, COALESCE(SUM(entree), 0) AS entree, " +
    "COALESCE(SUM(sortie), 0) AS sortie, COALESCE(SUM(recherches), 0) AS recherches, COALESCE(SUM(dollars), 0) AS dollars FROM usage WHERE email = ?1 AND ts > ?3"
  ).bind(email, maintenant - h, maintenant - sem).first();
  const t = await env.DB.prepare("SELECT COUNT(*) AS appels, COALESCE(SUM(entree), 0) AS entree, COALESCE(SUM(sortie), 0) AS sortie, COALESCE(SUM(recherches), 0) AS recherches, COALESCE(SUM(dollars), 0) AS dollars FROM usage WHERE email = ?1").bind(email).first();
  const dans = ms => { const hh = Math.max(1, Math.round(ms / 3600000)); return hh >= 48 ? "dans " + Math.round(hh / 24) + " j" : "dans " + hh + " h"; };
  const bonus = Math.max(0, Math.min(+qui.b || 0, +env.BONUS_MAX || 40)), maxF = +env.CREDITS_FENETRE || 30, maxS = (+env.CREDITS_SEMAINE || 60) + bonus;
  const rond = x => Math.round(x * 10000) / 10000;
  return {
    illimite: qui.r === "admin",
    fenetre: { max: maxF, utilise: r.fenetre, reste: Math.max(0, maxF - r.fenetre), renouvellement: r.premierF ? dans(r.premierF + h - maintenant) : "à votre première question" },
    semaine: { max: maxS, utilise: r.semaine, reste: Math.max(0, maxS - r.semaine), bonus, renouvellement: r.premierS ? dans(r.premierS + sem - maintenant) : "à votre première question" },
    usage: { semaine: { appels: r.appels, entree: r.entree, sortie: r.sortie, recherches: r.recherches, dollars: rond(r.dollars) }, total: { appels: t.appels, entree: t.entree, sortie: t.sortie, recherches: t.recherches, dollars: rond(t.dollars) } },
    plafondDollars: rond(((+env.CREDITS_SEMAINE || 60) + (+env.BONUS_MAX || 40)) * CREDIT_DOLLARS)
  };
}
// Lit une copie du flux SSE pour en tirer la consommation, puis l'enregistre
export async function enregistrer(env, email, modele, flux) {
  const rd = flux.getReader(), dec = new TextDecoder(); let buf = "", recherches = 0; const u = {};
  for (;;) {
    const { value, done } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const ligne = buf.slice(0, i).split("\n").find(l => l.startsWith("data:")); buf = buf.slice(i + 2);
      if (!ligne) continue; let d; try { d = JSON.parse(ligne.slice(5)); } catch { continue; }
      if (d.type === "message_start" && d.message && d.message.usage) Object.assign(u, d.message.usage);
      else if (d.type === "message_delta" && d.usage) Object.assign(u, d.usage);
      else if (d.type === "content_block_start" && d.content_block && d.content_block.type === "server_tool_use" && d.content_block.name === "web_search") recherches++;
    }
  }
  const c = cout(modele, u, recherches);
  await env.DB.prepare("INSERT INTO usage (email, ts, modele, entree, sortie, recherches, dollars, credits) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
    .bind(email, Date.now(), modele, (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0), u.output_tokens || 0, recherches, c.dollars, c.credits).run();
}

// ---------- Dernières versions de Claude ----------
// Le relais demande à l'API la liste des modèles (gardée 6 heures) et envoie chaque requête à la DERNIÈRE version de la famille demandée
// (Haiku, Sonnet, Opus) : une nouvelle version de Claude n'impose aucune mise à jour du site. Si la liste est indisponible, ou si la
// dernière version refuse la requête, la version demandée est utilisée telle quelle.
let memoModeles = { t: 0, v: null };
export async function cleClaude(env) { return env.ANTHROPIC_KEY && typeof env.ANTHROPIC_KEY.get === "function" ? await env.ANTHROPIC_KEY.get() : env.ANTHROPIC_KEY; }
export function entetesClaude(env, cle) { return { "content-type": "application/json", "x-api-key": cle, "anthropic-version": "2023-06-01", ...(env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": String(env.ANTHROPIC_WORKSPACE_ID).trim() } : {}) }; }
export async function dernieresVersions(env) {
  if (memoModeles.v && Date.now() - memoModeles.t < 6 * 3600e3) return memoModeles.v;
  try {
    const cle = await cleClaude(env); if (!cle) return memoModeles.v;
    const res = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: entetesClaude(env, cle) });
    if (!res.ok) return memoModeles.v;
    const liste = (await res.json()).data || [], v = {};
    for (const m of liste) {
      const f = famille(m.id); if (!f || /-\d{8}$/.test(m.id)) continue;         // les versions datées sont d'anciens instantanés
      if (!v[f] || String(m.created_at) > String(v[f].created_at)) v[f] = { id: m.id, nom: m.display_name || m.id, created_at: m.created_at };
    }
    if (Object.keys(v).length) memoModeles = { t: Date.now(), v };
  } catch { /* garde la dernière liste connue */ }
  return memoModeles.v;
}

// ---------- DICTÉE VOCALE POUR TOUS (ChatGDB) : Whisper (Workers AI), segments de parole de 50 s au plus ----------
// Claude, via son API, ne transcrit pas la parole (il lit du texte, des images et des PDF) : la dictée passe par Whisper.
// Garde-fous : jeton valide, budget gratuit du jour (coupure à 80 %), plafond par personne et par jour (DICTEE_MIN_JOUR minutes, 20 par défaut).
let dicteesPret = false;
export async function dicteeServeur(req, env, qui, admin, json, erreur) {
  let c; try { c = await req.json(); } catch { return erreur(400, "Requête invalide."); }
  const audio = String(c.audio || ""); if (!audio) return erreur(400, "Audio absent.");
  if (audio.length > 1.8e6) return erreur(413, "Segment trop long (50 secondes au plus).");
  const apercu = !!c.apercu;                                          // texte provisoire d'une phrase en cours : ne compte pas dans le plafond de la personne
  const plafond = (+env.DICTEE_MIN_JOUR || 20) * 60 * (admin ? 3 : 1), t0 = Date.now();
  const voix = paroleWav(audio);
  if (voix !== null && voix < 0.2) return json(200, { ok: true, texte: "", silence: true, duree: 0, restant: plafond });      // pas de parole : rien n'est envoyé à Whisper
  // Vérifications du budget et du plafond lancées en même temps que la transcription : on gagne leur délai (aller-retours D1) sur chaque phrase
  const verif = (async () => {
    const etat = await neuronsJour(env);
    if (etat.utilises >= etat.budget * etat.coupure) return { refus: erreur(429, "La dictée vocale est suspendue pour aujourd'hui (budget gratuit atteint) : utilisez la dictée de votre clavier ou réessayez demain.") };
    if (!dicteesPret) { await env.DB.prepare("CREATE TABLE IF NOT EXISTS dictees (jour TEXT NOT NULL, qui TEXT NOT NULL, s REAL NOT NULL DEFAULT 0, PRIMARY KEY (jour, qui))").run(); dicteesPret = true; }
    const ligne = await env.DB.prepare("SELECT s FROM dictees WHERE jour = ? AND qui = ?").bind(jourUtc(), qui.e).first(), deja = ligne ? ligne.s : 0;
    if (!apercu && deja >= plafond) return { refus: erreur(429, "Limite de dictée du jour atteinte (" + Math.round(plafond / 60) + " minutes) : reprenez demain, ou dictez avec le clavier de votre appareil.") };
    return { deja };
  })();
  const transcription = env.AI.run("@cf/openai/whisper-large-v3-turbo", { audio, language: /^[a-z]{2}$/.test(c.langue) ? c.langue : "fr" }).then(r => ({ r }), e => ({ e }));
  const [v, t] = await Promise.all([verif.catch(e => ({ erreurVerif: e })), transcription]);
  if (v.refus) return v.refus;
  if (t.e) return erreur(502, "Transcription impossible : " + String(t.e && t.e.message || t.e).slice(0, 200));
  const r = t.r, info = r && r.transcription_info || {}, duree = +info.duration || +c.duree || 0, utile = info.duration_after_vad != null ? +info.duration_after_vad : duree, deja = v.deja || 0;
  if (!apercu) await env.DB.prepare("INSERT INTO dictees (jour, qui, s) VALUES (?, ?, ?) ON CONFLICT(jour, qui) DO UPDATE SET s = s + excluded.s").bind(jourUtc(), qui.e, duree).run().catch(() => {});
  await neuronsAjouter(env, duree / 60 * NEURONS_PAR_MINUTE.dictee).catch(() => {});
  let texte = utile < 0.25 ? "" : String(r && r.text || "").trim();
  if (HALLUCINATION.test(texte) && (voix === null || voix < 1.2)) texte = "";        // formule inventée sur un bruit : jamais affichée
  return json(200, { ok: true, texte, duree, neurons: Math.round(duree / 60 * NEURONS_PAR_MINUTE.dictee * 100) / 100, ms: Date.now() - t0, restant: Math.max(0, Math.round(plafond - deja - (apercu ? 0 : duree))) });
}
