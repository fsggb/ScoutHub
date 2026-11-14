(async () => {
  "use strict";
  const { $, say } = Hub;
  { const connu = Hub.cachedUser(); if (connu) Hub.renderBar(connu); }      // barre affichée tout de suite, sans attendre le serveur
  const user = await Hub.requireUser(); if (!user) return;
  Hub.renderBar(user);
  $("c-email").textContent = user.email;
  $("c-role").textContent = Hub.ROLE_LABELS[user.role] || "Membre";
  $("logout").onclick = () => Hub.logout();
})();
