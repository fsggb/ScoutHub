// Serveur Cloudflare de ScoutHub (Workers + D1, plan gratuit) : point d'entrée, uniquement l'aiguillage des
// adresses vers le module qui s'en occupe. Chaque concern vit dans son propre fichier (voir le tableau ci-dessous) :
// ce fichier ne contient plus de logique métier, seulement le routage, le CORS et l'habillage des réponses.
//
//   Adresse                          Module              Rôle
//   /auth/*                          auth.js             Identité et sessions (Google, code e-mail, admin)
//   /chat, /credits, /claude/modeles, /dictee
//                                    chatgdb.js           Relais Claude, crédits, dictée vocale pour tous
//   /ia/*                            laboratoire.js       Modèles Workers AI gratuits (administrateur)
//   /fiches/*                        fiches.js            Brouillons de connaissances (ChatGDB → GitHub → admin)
//   /ign/*, /scan25/*                cartes.js            Relais des tuiles IGN (ScoutMap)
//   /lien                            liens.js             Liens courts Google Maps
//   /direct/*                        partage.js           Partage en direct de ScoutMap (Durable Object)
//   (cron, */15 min)                 synchro.js           Relance la synchronisation des applications (GitHub Actions)
//
// Secrets : ANTHROPIC_KEY (clé Claude), RELAIS_SECRET (jeton signé par Apps Script, voir chatgdb.js:verifierJeton).
import { authRoute } from "./auth.js";
import { cors } from "./commun.js";
import { verifierJeton, famille, ADMIN_SEUL, PRIX_FAMILLE, MAX_JETONS, dernieresVersions, etatCredits, enregistrer, cleClaude, entetesClaude, dicteeServeur } from "./chatgdb.js";
import { laboratoire } from "./laboratoire.js";
import { fiches } from "./fiches.js";
import { tuileIgn } from "./cartes.js";
import { lienCourt } from "./liens.js";
import { direct, Partage } from "./partage.js";
import { lancerSynchro } from "./synchro.js";
import { chatgdbConfig } from "./chatgdb-config.js";

export { Partage };

const enc = new TextEncoder(), hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

export default {
  async fetch(req, env, ctx) {
    const origine = req.headers.get("Origin") || "", entetes = cors(env, origine), url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: entetes });
    if (req.method === "GET" && url.pathname.startsWith("/direct/")) return direct(req, env, url);
    if (req.method === "GET" && url.pathname === "/lien") return lienCourt(req, env, url);
    if (req.method === "GET" && (url.pathname.startsWith("/ign/") || url.pathname.startsWith("/scan25/"))) return tuileIgn(req, env, ctx, url);
    const json = (status, o) => new Response(JSON.stringify(o), { status, headers: { ...entetes, "content-type": "application/json", "cache-control": "no-store" } });
    const erreur = (status, message) => json(status, { type: "error", error: { message } });
    if (req.method !== "POST") return erreur(405, "Méthode refusée.");
    if (!String(env.ORIGINES || "").split(",").map(s => s.trim()).includes(origine)) return erreur(403, "Origine refusée.");
    // Identité et sessions (rupture avec Apps Script) : jeton de session propre au Worker, pas celui signé par Code.gs.
    if (url.pathname.startsWith("/auth/")) return authRoute(req, env, url, json, erreur);
    if (url.pathname === "/chatgdb/credits" || url.pathname === "/chatgdb/rapide") return chatgdbConfig(req, env, url, json, erreur);   // identité = connexion unique (jeton de session dans le corps)
    const qui = await verifierJeton(req.headers.get("x-scouthub-jeton"), env.RELAIS_SECRET);
    if (!qui) return erreur(401, "Session ScoutHub invalide ou expirée : rechargez la page.");
    const admin = qui.r === "admin";

    if (url.pathname === "/dictee") return dicteeServeur(req, env, qui, admin, json, erreur);
    if (url.pathname.startsWith("/ia/")) return admin ? laboratoire(req, env, url, json, erreur) : erreur(403, "Réservé à l'administrateur.");
    if (url.pathname.startsWith("/fiches/")) return admin ? fiches(req, env, url, qui, json, erreur) : erreur(403, "Réservé à l'administrateur.");
    if (url.pathname === "/claude/modeles") { const d = await dernieresVersions(env) || {}; return json(200, { ok: true, modeles: Object.entries(d).filter(([f]) => admin || !ADMIN_SEUL.has(f)).map(([f, m]) => ({ famille: f, id: m.id, nom: m.nom, prix: PRIX_FAMILLE[f] })) }); }
    if (url.pathname === "/credits") return json(200, { ok: true, ...(await etatCredits(env, qui)) });

    if (url.pathname === "/chat" || url.pathname === "/") {
      if (!admin) {
        const etat = await etatCredits(env, qui);
        if (etat.fenetre.reste <= 0) return erreur(429, "Limite de crédits des " + (env.FENETRE_HEURES || 5) + " dernières heures atteinte : réessayez plus tard.");
        if (etat.semaine.reste <= 0) return erreur(429, "Limite de crédits de la semaine atteinte.");
      }
      let corps; try { corps = await req.json(); } catch { return erreur(400, "Requête invalide."); }
      const fam = famille(corps.model);
      if (!fam || !/^claude-[a-z]+-[0-9][0-9a-z.\-]*$/.test(corps.model)) return erreur(400, "Modèle non autorisé.");
      if (ADMIN_SEUL.has(fam) && !admin) return erreur(403, "Ce modèle est réservé à l'administrateur.");
      const demande = corps.model, derniere = await dernieresVersions(env);
      if (derniere && derniere[fam]) corps.model = derniere[fam].id;
      corps.max_tokens = Math.min(+corps.max_tokens || 2000, MAX_JETONS);
      corps.stream = true;
      corps.metadata = { user_id: hex(await crypto.subtle.digest("SHA-256", enc.encode(String(qui.e)))).slice(0, 32) };   // identifiant opaque
      // La clé vient du Secrets Store du compte (liaison avec .get()) ou d'un secret propre au Worker (texte)
      const cle = await cleClaude(env);
      if (!cle) return erreur(503, "Clé Claude absente du serveur Cloudflare.");
      const appelerClaude = () => fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: entetesClaude(env, cle), body: JSON.stringify(corps) });
      let res = await appelerClaude();
      if ((res.status === 400 || res.status === 404) && corps.model !== demande) { corps.model = demande; res = await appelerClaude(); }   // la dernière version refuse : version demandée
      if (!res.ok || !res.body) return new Response(res.body, { status: res.status, headers: { ...entetes, "content-type": res.headers.get("content-type") || "application/json" } });
      const [pourNavigateur, pourCompte] = res.body.tee();
      ctx.waitUntil(enregistrer(env, qui.e, corps.model, pourCompte).catch(() => {}));
      return new Response(pourNavigateur, { status: 200, headers: { ...entetes, "content-type": "text/event-stream", "cache-control": "no-store", "x-modele": corps.model, "Access-Control-Expose-Headers": "x-modele" } });
    }
    return erreur(404, "Adresse inconnue.");
  },
  // Déclencheur régulier (toutes les 15 minutes, voir wrangler.jsonc) : lance le workflow « Synchroniser les applications » de ScoutHub.
  async scheduled(event, env, ctx) { ctx.waitUntil(lancerSynchro(env)); }
};
