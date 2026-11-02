(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const API = window.SCOUTHUB_API, TOKEN_KEY = "scouthub.token";
  let token = null, user = null, cwd = [], mode = "login";

  const say = (el, text, err = false) => { el.textContent = text; el.classList.toggle("error", err); };
  const store = { get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
    set: v => { try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); } catch {} } };

  async function call(action, data = {}) {
    if (!API) throw new Error("Le serveur ScoutHub n’est pas encore configuré.");
    let res;
    try {
      res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, token, ...data }) });
    } catch { throw new Error("Serveur injoignable."); }
    let out; try { out = await res.json(); } catch { throw new Error("Réponse invalide du serveur."); }
    if (!out.ok) { if (/Session expirée/.test(out.error)) logout(true); throw new Error(out.error || "Erreur."); }
    return out;
  }

  // ---------- authentification ----------
  function setMode(m) {
    mode = m;
    $("tab-login").classList.toggle("active", m === "login");
    $("tab-register").classList.toggle("active", m === "register");
    $("confirm-row").hidden = m === "login";
    $("auth-submit").textContent = m === "login" ? "Se connecter" : "Créer mon compte";
    $("password").autocomplete = m === "login" ? "current-password" : "new-password";
    say($("auth-status"), "");
  }
  $("tab-login").onclick = () => setMode("login");
  $("tab-register").onclick = () => setMode("register");

  $("auth-form").addEventListener("submit", async ev => {
    ev.preventDefault();
    const email = $("email").value.trim(), password = $("password").value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say($("auth-status"), "Saisissez une adresse e-mail valide.", true);
    if (password.length < 8) return say($("auth-status"), "Le mot de passe doit contenir au moins 8 caractères.", true);
    if (mode === "register" && password !== $("password2").value) return say($("auth-status"), "Les deux mots de passe sont différents.", true);
    $("auth-submit").disabled = true; say($("auth-status"), "Un instant…");
    try {
      const out = await call(mode, { email, password });
      token = out.token; store.set(token); user = out.user;
      $("password").value = $("password2").value = "";
      enter();
    } catch (e) { say($("auth-status"), e.message, true); }
    finally { $("auth-submit").disabled = false; }
  });

  function logout(silent) {
    if (token && !silent) call("logout").catch(() => {});
    token = null; user = null; store.set(null); cwd = [];
    $("app").hidden = true; $("topnav").hidden = true; $("auth").hidden = false;
  }
  $("btn-logout").onclick = () => logout(false);

  function enter() {
    $("auth").hidden = true; $("app").hidden = false; $("topnav").hidden = false;
    $("who").textContent = user.email; $("btn-admin").hidden = user.role !== "admin";
    renderApps(); listFiles();
  }

  function renderApps() {
    const box = $("apps"); box.textContent = "";
    const groups = [];
    (window.SCOUTHUB_APPS || []).forEach(a => {
      const name = a.group || "Applications";
      let sec = groups.find(x => x.name === name);
      if (!sec) groups.push(sec = { name, items: [] });
      sec.items.push(a);
    });
    groups.forEach(g => {
      const section = document.createElement("section"); section.className = "app-group";
      const h = document.createElement("h2"); h.textContent = g.name;
      const grid = document.createElement("div"); grid.className = "grid-apps";
      g.items.forEach(a => {
        const link = document.createElement("a");
        link.className = "app-tile"; link.href = a.url; link.target = "_blank"; link.rel = "noopener";
        const badge = document.createElement(a.icon ? "img" : "span");
        badge.className = "app-badge";
        if (a.icon) { badge.src = a.icon; badge.alt = ""; } else badge.textContent = a.name[0];
        const text = document.createElement("span");
        const strong = document.createElement("strong"); strong.textContent = a.name;
        const small = document.createElement("small"); small.textContent = a.desc;
        text.append(strong, small); link.append(badge, text); grid.append(link);
      });
      section.append(h, grid); box.append(section);
    });
  }

  // ---------- explorateur de fichiers ----------
  const path = () => cwd.join("/");
  const fmt = n => n < 1024 ? `${n} o` : n < 1048576 ? `${(n / 1024).toFixed(1)} Ko` : `${(n / 1048576).toFixed(1)} Mo`;
  const b64 = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };

  function crumbs() {
    const nav = $("crumbs"); nav.textContent = "";
    const add = (label, depth) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = label;
      b.onclick = () => { cwd = cwd.slice(0, depth); listFiles(); }; nav.append(b);
    };
    add("Mes fichiers", 0);
    cwd.forEach((p, i) => { nav.append(" / "); add(p, i + 1); });
  }

  async function listFiles() {
    crumbs(); const list = $("f-list"); list.textContent = ""; say($("f-status"), "Chargement…");
    try {
      const { entries } = await call("list", { path: path() });
      const shown = entries.filter(e => e.name !== ".gitkeep").sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, "fr") : a.type === "dir" ? -1 : 1));
      say($("f-status"), shown.length ? "" : "Ce dossier est vide. Importez un fichier ou créez-en un.");
      shown.forEach(e => {
        const li = document.createElement("li"), name = document.createElement("button");
        name.type = "button"; name.className = "file-name " + (e.type === "dir" ? "dir" : "file");
        name.textContent = (e.type === "dir" ? "📁 " : "📄 ") + e.name;
        name.onclick = () => e.type === "dir" ? (cwd.push(e.name), listFiles()) : download(e.name);
        const size = document.createElement("span"); size.className = "muted"; size.textContent = e.type === "dir" ? "" : fmt(e.size);
        li.append(name, size);
        if (e.type !== "dir") {
          const del = document.createElement("button"); del.type = "button"; del.className = "text-danger"; del.textContent = "Supprimer";
          del.onclick = async () => { if (!confirm(`Supprimer « ${e.name} » ?`)) return;
            try { await call("remove", { path: [...cwd, e.name].join("/") }); listFiles(); } catch (x) { say($("f-status"), x.message, true); } };
          li.append(del);
        }
        list.append(li);
      });
    } catch (e) { say($("f-status"), e.message, true); }
  }
  async function download(name) {
    say($("f-status"), "Téléchargement…");
    try {
      const { base64 } = await call("get", { path: [...cwd, name].join("/") });
      const bin = atob(base64), bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bytes])); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000); say($("f-status"), "");
    } catch (e) { say($("f-status"), e.message, true); }
  }
  async function put(name, base64) { await call("put", { path: [...cwd, name].join("/"), base64 }); }

  $("f-refresh").onclick = listFiles;
  $("f-up").onclick = () => $("f-input").click();
  $("f-input").onchange = async ev => {
    for (const f of ev.target.files) {
      if (f.size > 10 * 1048576) { say($("f-status"), `« ${f.name} » dépasse 10 Mo.`, true); continue; }
      say($("f-status"), `Envoi de ${f.name}…`);
      try { await put(f.name, b64(new Uint8Array(await f.arrayBuffer()))); } catch (e) { say($("f-status"), e.message, true); return; }
    }
    ev.target.value = ""; listFiles();
  };
  $("f-newfolder").onclick = async () => {
    const n = (prompt("Nom du dossier :") || "").trim(); if (!n) return;
    try { await put(`${n}/.gitkeep`, btoa("")); listFiles(); } catch (e) { say($("f-status"), e.message, true); }
  };
  $("f-newfile").onclick = async () => {
    const n = (prompt("Nom du fichier (ex. notes.txt) :") || "").trim(); if (!n) return;
    try { await put(n, btoa(" ")); listFiles(); } catch (e) { say($("f-status"), e.message, true); }
  };

  // ---------- compte et administration ----------
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => b.closest("dialog").close());
  $("btn-account").onclick = () => { say($("pw-status"), ""); $("pw-form").reset(); $("dlg-account").showModal(); };
  $("pw-form").addEventListener("submit", async ev => {
    ev.preventDefault();
    try { await call("changePassword", { oldPassword: $("pw-old").value, newPassword: $("pw-new").value });
      say($("pw-status"), "Mot de passe modifié."); $("pw-form").reset(); } catch (e) { say($("pw-status"), e.message, true); }
  });

  async function loadUsers() {
    const ul = $("ad-list"); ul.textContent = ""; say($("ad-status"), "Chargement…");
    try {
      const { users } = await call("adminList"); say($("ad-status"), `${users.length} compte(s).`);
      users.forEach(u => {
        const li = document.createElement("li"), name = document.createElement("span");
        name.textContent = u.email + (u.role === "admin" ? " (administrateur)" : "");
        const reset = document.createElement("button"); reset.type = "button"; reset.className = "ghost"; reset.textContent = "Nouveau mot de passe";
        reset.onclick = async () => { const p = prompt(`Nouveau mot de passe pour ${u.email} (8 caractères minimum) :`); if (!p) return;
          try { await call("adminReset", { email: u.email, newPassword: p }); say($("ad-status"), "Mot de passe réinitialisé."); } catch (e) { say($("ad-status"), e.message, true); } };
        li.append(name, reset);
        if (u.role !== "admin") {
          const del = document.createElement("button"); del.type = "button"; del.className = "text-danger"; del.textContent = "Supprimer";
          del.onclick = async () => { if (!confirm(`Supprimer le compte ${u.email} ?`)) return;
            try { await call("adminDelete", { email: u.email }); loadUsers(); } catch (e) { say($("ad-status"), e.message, true); } };
          li.append(del);
        }
        ul.append(li);
      });
    } catch (e) { say($("ad-status"), e.message, true); }
  }
  $("btn-admin").onclick = () => { $("dlg-admin").showModal(); loadUsers(); };

  // ---------- démarrage ----------
  if (!API) say($("auth-status"), "Le serveur ScoutHub n’est pas encore configuré (config.js).", true);
  token = store.get();
  if (token && API) call("me").then(o => { user = o.user; enter(); }).catch(() => logout(true));
})();
