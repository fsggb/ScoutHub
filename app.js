(() => {
  "use strict";
  const { $, say, store } = Hub;
  let mode = "login";
  const RECENT_KEY = "scouthub.recent";

  // ---------- connexion / inscription ----------
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
      const out = await Hub.call(mode, { email, password });
      store.set(out.token); Hub.user = out.user;
      $("password").value = $("password2").value = "";
      enter();
    } catch (e) { say($("auth-status"), e.message, true); }
    finally { $("auth-submit").disabled = false; }
  });

  // Retour vers l'application ou la page qui a demandé la connexion (adresses relatives du site uniquement).
  function goNext() {
    const next = new URLSearchParams(location.search).get("next");
    if (next && /^[\w\-\/.?=&%]+$/.test(next) && !next.startsWith("//") && !/^[a-z]+:/i.test(next)) { location.replace(next); return true; }
    return false;
  }

  function showAuth() {
    Hub.renderBar(null);
    $("home").hidden = true; $("auth").hidden = false;
    if (!window.SCOUTHUB_API) say($("auth-status"), "Le serveur ScoutHub n’est pas encore configuré (config.js).", true);
  }

  // ---------- accueil ----------
  const recent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } };
  const remember = name => { try { localStorage.setItem(RECENT_KEY, JSON.stringify([name, ...recent().filter(n => n !== name)].slice(0, 5))); } catch {} };

  function appList() {
    const all = window.SCOUTHUB_APPS || [], featured = all.filter(a => a.featured), apps = all.filter(a => !a.featured);
    const mine = [{ group: "Mon espace", name: "Mon compte", desc: "Profil et mot de passe", url: "compte.html", icon: "assets/fsggb.png", local: true }];
    if (Hub.user && Hub.user.role === "admin")
      mine.push({ group: "Mon espace", name: "Administration", desc: "Comptes et utilisateurs", url: "admin.html", icon: "assets/fsggb.png", local: true });
    apps.splice(1, 0, ...mine); // juste après ScoutCloud, dans « Mon espace »
    return [...featured, ...apps];
  }

  function tile(a) {
    const link = document.createElement("a");
    link.className = "app-tile" + (a.featured ? " featured" : ""); link.href = a.url;
    if (!a.local) { link.target = "_blank"; link.rel = "noopener"; }
    link.addEventListener("click", () => remember(a.name));
    let badge;
    if (a.crop) { badge = document.createElement("span"); badge.className = "app-badge crop"; badge.style.backgroundImage = `url("${a.icon}")`; }
    else { badge = document.createElement("img"); badge.className = "app-badge"; badge.src = a.icon; badge.alt = ""; }
    const text = document.createElement("span");
    const strong = Object.assign(document.createElement("strong"), { textContent: a.name });
    const small = Object.assign(document.createElement("small"), { textContent: a.desc });
    text.append(strong, small); link.append(badge, text);
    return link;
  }

  function renderApps() {
    const q = $("search").value.trim().toLowerCase(), box = $("apps"); box.textContent = "";
    const all = appList(), shown = all.filter(a => !q || (a.name + " " + a.desc + " " + a.group).toLowerCase().includes(q));
    const groups = [];
    shown.forEach(a => { let g = groups.find(x => x.name === a.group); if (!g) groups.push(g = { name: a.group, items: [] }); g.items.push(a); });
    groups.forEach(g => {
      const section = document.createElement("section"); section.className = "app-group";
      const grid = document.createElement("div"); grid.className = "grid-apps";
      g.items.forEach(a => grid.append(tile(a)));
      section.append(Object.assign(document.createElement("h2"), { textContent: g.name }), grid); box.append(section);
    });
    $("none").hidden = shown.length > 0;
    const rec = q ? [] : recent().map(n => all.find(a => a.name === n)).filter(Boolean);
    $("recent").hidden = rec.length === 0;
    $("recent-grid").textContent = ""; rec.forEach(a => $("recent-grid").append(tile(a)));
  }
  $("search").addEventListener("input", renderApps);

  function enter() {
    if (goNext()) return;
    $("auth").hidden = true; $("home").hidden = false;
    Hub.renderBar(Hub.user);
    $("hello").textContent = "Bonjour, " + Hub.user.email.split("@")[0].replace(/[._-]+/g, " ");
    renderApps();
  }

  // ---------- démarrage ----------
  if (store.get() && window.SCOUTHUB_API) Hub.call("me").then(o => { Hub.user = o.user; enter(); }).catch(() => { store.set(null); showAuth(); });
  else showAuth();
})();
