(async () => {
  "use strict";
  const { $, say } = Hub;
  const user = await Hub.requireUser(); if (!user) return;
  Hub.renderBar(user);
  $("c-email").textContent = user.email;
  $("c-role").textContent = Hub.ROLE_LABELS[user.role] || "Membre";
  $("logout").onclick = () => Hub.logout();
  $("pw-form").addEventListener("submit", async ev => {
    ev.preventDefault();
    if ($("pw-new").value !== $("pw-new2").value) return say($("pw-status"), "Les deux nouveaux mots de passe sont différents.", true);
    if ($("pw-new").value.length < 8) return say($("pw-status"), "Le mot de passe doit contenir au moins 8 caractères.", true);
    try {
      await Hub.call("changePassword", { oldPassword: $("pw-old").value, newPassword: $("pw-new").value });
      say($("pw-status"), "Mot de passe modifié."); $("pw-form").reset();
    } catch (e) { say($("pw-status"), e.message, true); }
  });
})();
