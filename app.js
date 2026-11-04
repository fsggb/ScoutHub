(() => {
  "use strict";
  const { $, say, store } = Hub;
  let mode = "login";

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
      store.set(out.token); Hub.user = out.user; Hub.cacheUser(out.user);
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
    setTimeout(() => $("email").focus(), 0);
  }

  // ---------- accueil ----------
  function appList() {
    const apps = [...(window.SCOUTHUB_APPS || [])];
    const mine = [];
    if (Hub.user) mine.push({ group: "Mon espace", name: "Mon compte", desc: "Profil et mot de passe", url: "compte.html", icon: "assets/icons/Compte.svg", local: true });
    if (Hub.user && Hub.user.role === "admin")
      mine.push({ group: "Mon espace", name: "Administration", desc: "Comptes et utilisateurs", url: "admin.html", icon: "assets/icons/Admin.svg", local: true });
    const at = apps.findIndex(a => a.group === "Mon espace") + 1; // juste après ScoutCloud, dans « Mon espace »
    apps.splice(at, 0, ...mine);
    return apps;
  }

  function tile(a) {
    const link = document.createElement("a");
    link.className = "app-tile" + (a.featured ? " featured" : ""); link.href = a.url;
    if (!a.local) { link.target = "_blank"; link.rel = "noopener"; }
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
      // Les applications mises en avant restent dans leur section, en tête.
      g.items.sort((x, y) => (y.featured ? 1 : 0) - (x.featured ? 1 : 0)).forEach(a => grid.append(tile(a)));
      section.append(Object.assign(document.createElement("h2"), { textContent: g.name }), grid); box.append(section);
    });
    $("none").hidden = shown.length > 0;
  }
  $("search").addEventListener("input", renderApps);

  // L'accueil est accessible sans compte ; la connexion n'est demandée que pour ScoutCloud et l'enregistrement cloud.
  function showHome() {
    $("auth").hidden = true; $("home").hidden = false;
    Hub.renderBar(Hub.user);
    $("hello").textContent = Hub.user ? "Bonjour, " + Hub.user.email.split("@")[0].replace(/[._-]+/g, " ") : "Vos applications";
    $("guest-note").hidden = !!Hub.user;
    renderApps();
    if (Hub.user) Hub.prefetch();
  }
  function enter() { if (!goNext()) showHome(); }

  // ---------- démarrage ----------
  const wantLogin = new URLSearchParams(location.search).has("connexion") || new URLSearchParams(location.search).has("next");
  if (store.get() && window.SCOUTHUB_API) {
    // Affichage immédiat avec l'utilisateur mémorisé, vérification de la session en arrière-plan.
    Hub.user = Hub.cachedUser();
    if (Hub.user && !wantLogin) showHome(); // sinon : on attend la vérification de la session
    Hub.call("me").then(o => { Hub.user = o.user; Hub.cacheUser(o.user); if (wantLogin) enter(); else showHome(); })
      .catch(() => { store.set(null); Hub.user = null; wantLogin ? showAuth() : showHome(); });
  } else if (wantLogin) showAuth();
  else showHome();
})();
