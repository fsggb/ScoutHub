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
  window.ScoutHub = {
    app: APP, hubUrl: BASE, ready: Promise.resolve(),
    loggedIn: () => !!lsGet("scouthub.token"),
    // Utilisateur mémorisé par le portail (affichage rapide) ; la vérification reste faite par le serveur.
    user: async () => (lsGet("scouthub.token") ? cachedUser() : null)
  };
})();
