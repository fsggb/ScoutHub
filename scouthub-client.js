/*
 * Client ScoutHub, chargé dans chaque application FSGGB (même origine : fsggb.github.io).
 *
 * Le stockage de fichiers sur GitHub (ScoutCloud, boîtes « Enregistrer sous » / « Ouvrir ») a été supprimé :
 * les applications retrouvent leur comportement d'origine (enregistrement sur l'ordinateur, sélecteurs natifs).
 * Ce script ne garde que l'identité, pour préparer l'assistant ChatGDB dans tous les outils :
 *   // Crédits ChatGDB : 1 crédit bonus par tranche de 5 minutes d'activité réelle (page visible, gestes récents).
  // Le serveur applique la règle et le plafond ; ce script ne fait que signaler le temps actif, sans rien lire de la page.
  (function activite() {
    let apiUrl = window.SCOUTHUB_API || "", last = Date.now(), actif = 0;
    const touch = () => { last = Date.now(); };
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach(e => addEventListener(e, touch, { passive: true, capture: true }));
    const ping = async () => {
      try {
        if (!apiUrl) { await new Promise(r => { const s = document.createElement("script"); s.src = BASE + "config.js"; s.onload = r; s.onerror = r; document.head.append(s); }); apiUrl = window.SCOUTHUB_API || ""; }
        if (apiUrl) await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "ping", token: lsGet("scouthub.token"), app: APP }) });
      } catch {}
    };
    setInterval(() => {
      if (APP === "ChatGDB" || document.visibilityState !== "visible" || !lsGet("scouthub.token") || Date.now() - last > 120000) return;
      actif += 30;
      if (actif >= 300) { actif = 0; ping(); }
    }, 30000);
  })();
  window.ScoutHub = { ready, loggedIn(), user(), hubUrl, app }
 * Il n'intercepte plus rien et n'affiche rien.
 *
 * Utilisation : <script src="/ScoutHub/scouthub-client.js" data-app="Nom"></script>
 */
(() => {
  "use strict";
  if (window.ScoutHub) return;
  const script = document.currentScript;
  const APP = (script && script.dataset.app) || document.title || "Application";
  const BASE = script && script.src ? new URL(".", script.src).href : location.origin + "/ScoutHub/";
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const cachedUser = () => { try { return JSON.parse(lsGet("scouthub.user") || "null"); } catch { return null; } };
  // Crédits ChatGDB : 1 crédit bonus par tranche de 5 minutes d'activité réelle (page visible, gestes récents).
  // Le serveur applique la règle et le plafond ; ce script ne fait que signaler le temps actif, sans rien lire de la page.
  (function activite() {
    let apiUrl = window.SCOUTHUB_API || "", last = Date.now(), actif = 0;
    const touch = () => { last = Date.now(); };
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach(e => addEventListener(e, touch, { passive: true, capture: true }));
    const ping = async () => {
      try {
        if (!apiUrl) { await new Promise(r => { const s = document.createElement("script"); s.src = BASE + "config.js"; s.onload = r; s.onerror = r; document.head.append(s); }); apiUrl = window.SCOUTHUB_API || ""; }
        if (apiUrl) await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "ping", token: lsGet("scouthub.token"), app: APP }) });
      } catch {}
    };
    setInterval(() => {
      if (APP === "ChatGDB" || document.visibilityState !== "visible" || !lsGet("scouthub.token") || Date.now() - last > 120000) return;
      actif += 30;
      if (actif >= 300) { actif = 0; ping(); }
    }, 30000);
  })();
  /* ===== API commune à toutes les applications FSGGB (connexion unique, serveur unique) =====
     Intégration : <script src="/ScoutHub/scouthub-client.js" data-app="MonAppli"></script>, puis :
       ScoutHub.connecte()                    → vrai si la personne est connectée (une seule connexion pour tout le site)
       await ScoutHub.utilisateur()           → { email, role, name } ou null
       ScoutHub.seConnecter()                 → page de connexion ScoutHub, puis retour automatique ici
       ScoutHub.seDeconnecter()               → déconnecte partout
       ScoutHub.surChangement(fn)             → fn(utilisateur) quand on se connecte / déconnecte (même dans un autre onglet)
       await ScoutHub.api("monappli", "action", { … })   → le module « monappli » du serveur ScoutHub, avec la session
       await ScoutHub.donnees.lire("cle") / .ecrire("cle", valeur) / .effacer("cle") / .liste()
                                              → données de CETTE application pour CETTE personne, gardées sur le serveur
     La session est rangée par ScoutHub dans le stockage du site (fsggb.github.io), commun à toutes les applications du site :
     se connecter une fois suffit, jusqu'à la déconnexion (ou l'expiration de la session). */
  const TOKEN = "scouthub.token";
  const loadConfig = () => window.SCOUTHUB_API ? Promise.resolve() : new Promise(r => { const s = document.createElement("script"); s.src = BASE + "config.js"; s.onload = r; s.onerror = r; document.head.append(s); });
  const ready = loadConfig();
  async function appel(action, donnees = {}) {
    await ready;
    if (!window.SCOUTHUB_API) throw new Error("Serveur ScoutHub non configuré.");
    let res;
    try { res = await fetch(window.SCOUTHUB_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...donnees, action, token: lsGet(TOKEN) }) }); }
    catch { throw new Error("Serveur ScoutHub injoignable (connexion internet ?)."); }
    let out; try { out = await res.json(); } catch { throw new Error("Réponse invalide du serveur."); }
    if (!out.ok) {
      if (/Session expirée/.test(out.error || "")) { try { localStorage.removeItem(TOKEN); localStorage.removeItem("scouthub.user"); } catch {} }
      const e = new Error(out.error || "Erreur."); e.reponse = out; throw e;
    }
    return out;
  }
  const slugApp = String(APP).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_-]+/g, "").slice(0, 40) || "application";
  window.ScoutHub = {
    app: APP, hubUrl: BASE, ready,
    connecte: () => !!lsGet(TOKEN),
    jeton: () => lsGet(TOKEN),
    utilisateur: async () => (lsGet(TOKEN) ? cachedUser() : null),
    async verifier() { if (!lsGet(TOKEN)) return null; const o = await appel("me"); try { localStorage.setItem("scouthub.user", JSON.stringify(o.user)); } catch {} return o.user; },
    seConnecter(retour) {
      const root = new URL(BASE).pathname, ici = (retour || location.pathname + location.search).replace(root, "");
      location.href = BASE + "index.html?connexion=1&next=" + encodeURIComponent(ici.replace(/^\//, ""));
    },
    async seDeconnecter() { try { await appel("logout"); } catch {} try { localStorage.removeItem(TOKEN); localStorage.removeItem("scouthub.user"); } catch {} },
    surChangement(fn) { addEventListener("storage", e => { if (e.key === TOKEN || e.key === "scouthub.user") fn(lsGet(TOKEN) ? cachedUser() : null); }); },
    appel,
    api: (app, fn, donnees = {}) => appel("app", { ...donnees, app, fn }),
    donnees: {
      lire: (cle, app = slugApp) => appel("donnees", { app, fn: "lire", cle }).then(o => o.valeur),
      ecrire: (cle, valeur, app = slugApp) => appel("donnees", { app, fn: "ecrire", cle, valeur }),
      effacer: (cle, app = slugApp) => appel("donnees", { app, fn: "effacer", cle }),
      liste: (app = slugApp) => appel("donnees", { app, fn: "liste" }).then(o => o.cles)
    },
    // anciens noms (gardés pour les applications déjà branchées)
    loggedIn: () => !!lsGet(TOKEN),
    user: async () => (lsGet(TOKEN) ? cachedUser() : null)
  };
})();
