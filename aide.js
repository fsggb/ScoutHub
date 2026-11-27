(async () => {
  "use strict";
  { const connu = Hub.cachedUser(); if (connu) { Hub.renderBar(connu, "Aide"); Hub.renderTabs("", connu); Hub.montrerMain(); } }      // affichage tout de suite, sans attendre le serveur
  const user = await Hub.requireUser(); if (!user) return;
  Hub.renderBar(user, "Aide"); Hub.renderTabs("", user);
})();
