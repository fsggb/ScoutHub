(async () => {
  "use strict";
  const { $, say } = Hub;
  const user = await Hub.requireUser(); if (!user) return;
  Hub.renderBar(user);
  $("c-email").textContent = user.email;
  $("c-role").textContent = Hub.ROLE_LABELS[user.role] || "Membre";
  $("logout").onclick = () => Hub.logout();
})();
