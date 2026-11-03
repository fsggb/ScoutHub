(async () => {
  "use strict";
  const { $, say } = Hub;
  const user = await Hub.requireUser({ admin: true }); if (!user) return;
  Hub.renderBar(user);
  let users = [], target = null;
  const date = t => t ? new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  function render() {
    const q = $("filter").value.trim().toLowerCase(), body = $("ad-body"); body.textContent = "";
    const shown = users.filter(u => !q || u.email.includes(q));
    $("stats").textContent = "";
    [["Comptes", users.length], ["Administrateurs", users.filter(u => u.role === "admin").length], ["Affichés", shown.length]].forEach(([k, v]) => {
      const d = document.createElement("div"); d.className = "stat";
      d.append(Object.assign(document.createElement("b"), { textContent: v }), Object.assign(document.createElement("span"), { textContent: k }));
      $("stats").append(d);
    });
    say($("ad-status"), shown.length ? "" : "Aucun compte ne correspond.");
    shown.forEach(u => {
      const tr = document.createElement("tr");
      const td = (t, cls) => { const c = document.createElement("td"); if (cls) c.className = cls; if (t != null) c.textContent = t; tr.append(c); return c; };
      td(u.email, "mail"); td(u.role === "admin" ? "Administrateur" : "Utilisateur"); td(date(u.created));
      const acts = td(null, "right");
      const reset = Object.assign(document.createElement("button"), { type: "button", className: "ghost small", textContent: "Nouveau mot de passe" });
      reset.onclick = () => { target = u; $("reset-who").textContent = u.email; $("reset-form").reset(); say($("reset-status"), ""); $("dlg-reset").showModal(); };
      acts.append(reset);
      if (u.role !== "admin") {
        const del = Object.assign(document.createElement("button"), { type: "button", className: "text-danger", textContent: "Supprimer" });
        del.onclick = async () => {
          if (!confirm(`Supprimer le compte ${u.email} ?`)) return;
          try { await Hub.call("adminDelete", { email: u.email }); await load(); } catch (e) { say($("ad-status"), e.message, true); }
        };
        acts.append(del);
      }
      body.append(tr);
    });
  }
  async function load() {
    say($("ad-status"), "Chargement…");
    try { users = (await Hub.call("adminList")).users; render(); } catch (e) { say($("ad-status"), e.message, true); }
  }
  $("filter").addEventListener("input", render);
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => b.closest("dialog").close());
  $("reset-form").addEventListener("submit", async ev => {
    ev.preventDefault();
    try {
      await Hub.call("adminReset", { email: target.email, newPassword: $("reset-pw").value });
      $("dlg-reset").close(); say($("ad-status"), "Mot de passe de " + target.email + " réinitialisé.");
    } catch (e) { say($("reset-status"), e.message, true); }
  });
  load();
})();
