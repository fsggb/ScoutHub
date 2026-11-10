/*
 * Client ScoutHub, chargé dans chaque application FSGGB (même origine : fsggb.github.io).
 *
 * Le stockage de fichiers sur GitHub (ScoutCloud, boîtes « Enregistrer sous » / « Ouvrir ») a été supprimé :
 * les applications retrouvent leur comportement d'origine (enregistrement sur l'ordinateur, sélecteurs natifs).
 * Ce script ne garde que l'identité, pour préparer l'assistant ChatGDB dans tous les outils :
 *   window.ScoutHub = { ready, loggedIn(), user(), hubUrl, app }
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
  window.ScoutHub = {
    app: APP, hubUrl: BASE, ready: Promise.resolve(),
    loggedIn: () => !!lsGet("scouthub.token"),
    // Utilisateur mémorisé par le portail (affichage rapide) ; la vérification reste faite par le serveur.
    user: async () => (lsGet("scouthub.token") ? cachedUser() : null)
  };
})();
