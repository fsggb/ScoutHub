(async () => {
  "use strict";
  const { $, say } = Hub;
  { const connu = Hub.cachedUser(); if (connu) Hub.renderBar(connu); }      // barre affichée tout de suite, sans attendre le serveur
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
      td(u.email, "mail" + (u.google ? " google" : ""));
      const roleCell = td(null);
      if (u.role === "admin" && (u.email === user.email || u.email === "jb.combet@fsggb.fr" || u.email === "service-informatique@fsggb.fr")) roleCell.textContent = Hub.ROLE_LABELS.admin;
      else {
        const sel = document.createElement("select"); sel.className = "role-select"; sel.setAttribute("aria-label", "Rôle de " + u.email);
        Hub.ROLE_ORDER.forEach(r => sel.append(Object.assign(document.createElement("option"), { value: r, textContent: Hub.ROLE_LABELS[r], selected: r === u.role })));
        sel.onchange = async () => {
          try { await Hub.call("adminSetRole", { email: u.email, role: sel.value }); u.role = sel.value; say($("ad-status"), "Rôle de " + u.email + " : " + Hub.ROLE_LABELS[u.role] + "."); }
          catch (e) { sel.value = u.role; say($("ad-status"), e.message, true); }
        };
        roleCell.append(sel);
      }
      td(date(u.created));
      const acts = td(null, "right");
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
  load();
})();
