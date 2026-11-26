// Pages statiques à un seul onglet (Documentation, Inscriptions) : barre du haut + barre du bas, rien d'autre.
// L'onglet actif vient de data-onglet sur <body>. Seul l'onglet Outils reste accessible sans compte (outils.html) :
// ces pages demandent une connexion, comme l'accueil (index.html/app.js).
(async () => {
  "use strict";
  const titre = document.querySelector("h1").textContent;
  { const connu = Hub.cachedUser(); if (connu) Hub.renderBar(connu, titre); }      // barre affichée tout de suite, sans attendre le serveur
  Hub.renderTabs(document.body.dataset.onglet || "");
  const user = await Hub.requireUser(); if (!user) return;
  Hub.renderBar(user, titre);
})();
