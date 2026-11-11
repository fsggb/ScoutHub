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

  // Connexion Google (prioritaire) : active seulement quand config.js contient l'identifiant client.
  let googleReady = false;
  function setupGoogle() {
    const id = window.SCOUTHUB_GOOGLE_CLIENT_ID;
    if (!id || !window.SCOUTHUB_API || googleReady) return;
    googleReady = true;
    const s = Object.assign(document.createElement("script"), { src: "https://accounts.google.com/gsi/client", async: true });
    s.onload = () => {
      if (!window.google || !google.accounts) return;
      google.accounts.id.initialize({
        client_id: id, ux_mode: "popup", auto_select: false,
        callback: async resp => {
          say($("auth-status"), "Un instant…");
          try {
            const out = await Hub.call("google", { credential: resp.credential });
            store.set(out.token); Hub.user = out.user; Hub.cacheUser(out.user); enter();
          } catch (e) { say($("auth-status"), e.message, true); }
        }
      });
      google.accounts.id.renderButton($("g-btn"), { theme: "outline", size: "large", shape: "pill", text: "continue_with", locale: "fr", width: 340 });
      $("g-block").hidden = false;
    };
    document.head.append(s);
  }

  function showAuth() {
    setupGoogle();
    if (new URLSearchParams(location.search).has("diag")) {   // ?diag=1 : montre ce que la page envoie à Google
      const id = window.SCOUTHUB_GOOGLE_CLIENT_ID || "(aucun)";
      $("g-diag").hidden = false; $("g-diag").textContent = "Diagnostic Google — identifiant : " + id + " · origine du site : " + location.origin + " (à déclarer dans « Origines JavaScript autorisées »)";
    }
    Hub.renderBar(null);
    $("home").hidden = true; $("auth").hidden = false;
    if (!window.SCOUTHUB_API) say($("auth-status"), "Le serveur ScoutHub n’est pas encore configuré (config.js).", true);
    setTimeout(() => $("email").focus(), 0);
  }

  // ---------- accueil ----------
  // « Mon compte » et « Administration » sont déjà dans la barre du haut : pas de tuile en plus (une seule ligne en tête).
  function tile(a) {
    const link = document.createElement("a");
    link.className = "app-tile" + (a.featured ? " featured" : "") + (a.masque ? " is-hidden" : ""); link.href = Portail.safeUrl(a.url) ? a.url : "#";
    if (!a.local) { link.target = "_blank"; link.rel = "noopener"; }
    let badge; const icon = Portail.safeIcon(a.icone) ? a.icone : "assets/fsggb.png";
    if (a.crop) { badge = document.createElement("span"); badge.className = "app-badge crop"; badge.style.backgroundImage = `url("${icon}")`; }
    else { badge = document.createElement("img"); badge.className = "app-badge"; badge.src = icon; badge.alt = ""; badge.loading = "lazy"; }
    const text = document.createElement("span");
    const strong = Object.assign(document.createElement("strong"), { textContent: a.nom });
    const small = Object.assign(document.createElement("small"), { textContent: a.desc });
    text.append(strong, small); link.append(badge, text);
    if (a.masque) link.append(Object.assign(document.createElement("em"), { className: "hidden-flag", textContent: "Masquée pour les autres" }));
    return link;
  }

  function renderApps() {
    const q = $("search").value.trim().toLowerCase(), box = $("apps"); box.textContent = "";
    const m = Portail.current(), shown = [];
    let row = null, prevTop = false;
    m.sections.forEach(s => {
      const items = m.apps.filter(a => a.section === s.id && (!a.masque || Portail.isAdmin) && (!q || (a.nom + " " + a.desc + " " + s.titre).toLowerCase().includes(q)));
      if (!items.length) return;
      shown.push(...items);
      const section = document.createElement("section"); section.className = "app-group";
      if (s.haut && items.length > 1) section.classList.add("wide");
      const grid = document.createElement("div"); grid.className = "grid-apps";
      items.forEach(a => grid.append(tile(a)));
      section.append(Object.assign(document.createElement("h2"), { textContent: s.titre }), grid);
      // Sections « ligne du haut » consécutives : une seule ligne, pour gagner de la place en hauteur.
      if (s.haut) { if (!prevTop || !row) { row = document.createElement("div"); row.className = "group-row"; box.append(row); } row.append(section); prevTop = true; }
      else { box.append(section); prevTop = false; }
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
    renderApps(); Portail.refresh(renderApps);
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
