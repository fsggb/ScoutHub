(async () => {
  "use strict";
  const { $, say } = Hub;
  { const connu = Hub.cachedUser(); if (connu) { Hub.renderBar(connu, "Mon compte"); Hub.renderTabs("compte", connu); } }      // affichage tout de suite, sans attendre le serveur
  const user = await Hub.requireUser(); if (!user) return;
  Hub.renderBar(user, "Mon compte"); Hub.renderTabs("compte", user);
  $("c-email").textContent = user.email;
  $("c-role").textContent = Hub.ROLE_LABELS[Hub.normRole(user.role)] || "Adhérent";
  $("logout").onclick = () => Hub.logout();

  function renderMasquees() {
    const ids = Hub.mesMasquees(), box = $("c-masquees"); box.textContent = "";
    const m = Portail.current(), apps = m.apps.filter(a => ids.includes(a.id));
    $("c-aucune").hidden = apps.length > 0;
    apps.forEach(a => {
      const li = document.createElement("li");
      li.append(Object.assign(document.createElement("span"), { textContent: a.nom }));
      const btn = Object.assign(document.createElement("button"), { type: "button", className: "ghost small", textContent: "Remettre" });
      btn.onclick = () => { Hub.toggleMasquePerso(a.id); renderMasquees(); };
      li.append(btn); box.append(li);
    });
  }
  await Portail.refresh(() => {}); renderMasquees();
})();
