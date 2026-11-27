(() => {
  "use strict";
  const { $, say, store } = Hub;
  // ---------- connexion : Google ou code à 6 chiffres reçu par e-mail (aucune inscription, aucun mot de passe) ----------
  let sentTo = "", resendTimer = 0;
  const DOMAINE = /^[^@\s]+@fsggb\.fr$/i;
  function step(n) {
    $("step-mail").hidden = n !== 1; $("step-code").hidden = n !== 2; say($("auth-status"), "");
    document.querySelector(".auth-main").classList.toggle("etape-code", n === 2);
    setTimeout(() => $(n === 1 ? "email" : "code").focus(), 0);
  }
  function cooldown(sec) {
    clearInterval(resendTimer); const b = $("code-resend"); b.disabled = true;
    let left = sec; const tick = () => { b.textContent = left > 0 ? "Renvoyer un code (" + left + " s)" : "Renvoyer un code"; if (left-- <= 0) { clearInterval(resendTimer); b.disabled = false; } };
    tick(); resendTimer = setInterval(tick, 1000);
  }
  async function askCode() {
    const email = $("email").value.trim().toLowerCase();
    if (!DOMAINE.test(email)) return say($("auth-status"), "Saisissez votre adresse @fsggb.fr. Sans adresse de la fédération, pas besoin de compte : les applications publiques sont déjà accessibles.", true);
    $("auth-submit").disabled = true; say($("auth-status"), "Envoi du code…");
    try { await Hub.call("codeDemander", { email }); sentTo = email; $("sent-to").textContent = email; $("code").value = ""; step(2); cooldown(45); }
    catch (e) { say($("auth-status"), e.message, true); }
    finally { $("auth-submit").disabled = false; }
  }
  async function sendCode() {
    const code = $("code").value.replace(/\D/g, "");
    if (code.length !== 6) return say($("auth-status"), "Le code comporte 6 chiffres.", true);
    $("code-submit").disabled = true; say($("auth-status"), "Vérification…");
    try {
      const out = await Hub.call("codeVerifier", { email: sentTo, code });
      store.set(out.token); Hub.user = out.user; Hub.cacheUser(out.user); $("code").value = ""; enter();
    } catch (e) { say($("auth-status"), e.message, true); $("code").select(); }
    finally { $("code-submit").disabled = false; }
  }
  $("auth-form").addEventListener("submit", ev => { ev.preventDefault(); $("step-code").hidden ? askCode() : sendCode(); });
  $("code").addEventListener("input", () => { const d = $("code").value.replace(/\D/g, "").slice(0, 6); $("code").value = d; if (d.length === 6) sendCode(); });
  $("code-resend").onclick = () => askCode();
  $("code-back").onclick = () => { clearInterval(resendTimer); step(1); };

  // Retour vers l'application ou la page qui a demandé la connexion (adresses relatives du site uniquement).
  function goNext() {
    let next = new URLSearchParams(location.search).get("next");
    if (next && /^[\w\-\/.?=&%]+$/.test(next) && !next.startsWith("//") && !/^[a-z]+:/i.test(next)) {
      // Sans « / » de tête : relatif au portail (ex. « compte.html », envoyé par Hub.toLogin() pour une page de
      // ScoutHub lui-même). Avec un « / » de tête : adresse absolue réelle d'une autre application de la fédération
      // (ex. « /ScoutMap/index.html », « /ChatGDB/ ») — CathIA, ScoutMap, ChatGDB, ScoutCraft/ScoutCAD/ScoutDraft se
      // publient chacune seules sur leur propre adresse de haut niveau depuis la migration (apps.txt) : ne plus la
      // réécrire comme un sous-dossier du portail, ça n'existe plus (corrige un retour cassé vers ces applications).
      location.replace(next); return true;
    }
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
      $("g-block").hidden = false;      // affiché d'abord : la largeur disponible devient mesurable (téléphone)
      google.accounts.id.renderButton($("g-btn"), { theme: "outline", size: "large", shape: "pill", text: "continue_with", locale: "fr", width: Math.max(200, Math.min(340, $("auth-form").clientWidth || 340)) });
    };
    document.head.append(s);
  }

  function showAuth() {
    setupGoogle();
    // « Avec mon compte Boutique GDB » : la boutique renverra ici (même page, même « next »), connecté
    const bq = $("bq-login"); if (bq) bq.href = "https://boutique.fsggb.fr/?sso=scouthub&retour=" + encodeURIComponent(location.origin + location.pathname + location.search);
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
    link.className = "app-tile" + (a.featured ? " featured" : "") + (a.masque ? " is-hidden" : "") + (a.admin && Portail.isAdmin ? " is-admin" : ""); link.href = Portail.safeUrl(a.url) ? a.url : "#";
    if (!a.local) { link.target = "_blank"; link.rel = "noopener"; }
    // La boutique : la personne connectée à ScoutHub y arrive connectée (code à usage unique, jamais la session).
    let hote = ""; try { hote = new URL(a.url, location.href).host; } catch {}
    if (hote === "boutique.fsggb.fr") link.addEventListener("click", ev => {
      if (!store.get() || !window.SCOUTHUB_API) return;
      ev.preventDefault();
      const w = window.open("about:blank", "_blank");
      const aller = u => { if (w) w.location.href = u; else location.href = u; };
      Hub.call("passe").then(o => { const u = new URL(a.url); u.searchParams.set("sh", o.code); aller(u.href); }).catch(() => aller(a.url));
    });
    let badge; const icon = Portail.safeIcon(a.icone) ? a.icone : "assets/fsggb.png";
    if (a.crop) { badge = document.createElement("span"); badge.className = "app-badge crop"; badge.style.backgroundImage = `url("${icon}")`; }
    else { badge = document.createElement("img"); badge.className = "app-badge"; badge.alt = ""; badge.decoding = "async"; badge.loading = "eager"; badge.src = icon; badge.onerror = () => { if (icon !== "assets/fsggb.png") badge.src = "assets/fsggb.png"; }; }
    const text = document.createElement("span");
    const strong = Object.assign(document.createElement("strong"), { textContent: a.nom });
    const small = Object.assign(document.createElement("small"), { textContent: a.desc });
    text.append(strong, small); link.append(badge, text);
    if (Portail.isAdmin && (a.admin || a.masque || a.protege)) link.append(Object.assign(document.createElement("em"), { className: "hidden-flag", textContent: a.admin ? "Administrateur" : a.masque ? "Masquée pour les autres" : "Réservée aux @fsggb.fr" }));
    return link;
  }

  function renderApps() {
    const plat = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();      // « creation » trouve « Création »
    const q = plat($("search").value.trim()), box = $("apps"); box.textContent = "";
    const m = Portail.current(), shown = [];
    let row = null, prevTop = false;
    m.sections.forEach(s => {
      const items = m.apps.filter(a => a.section === s.id && (!a.admin || Portail.isAdmin) && (!a.masque || Portail.isAdmin) && (!a.protege || Portail.isAdmin || Portail.connected()) && (!q || plat(a.nom + " " + a.desc + " " + s.titre).includes(q)));
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
  async function showHome() {
    $("auth").hidden = true; $("home").hidden = false;
    Hub.renderBar(Hub.user);
    const prenom = Hub.user ? Hub.user.email.split("@")[0].split(/[._-]+/)[0] : "";
    $("hello").textContent = Hub.user ? "Bonjour, " + prenom.charAt(0).toUpperCase() + prenom.slice(1) : "Vos applications";
    $("guest-note").hidden = !!Hub.user;
    // Première visite (pas encore de mise en page en cache) : on attend la vraie mise en page du serveur avant de peindre,
    // pour éviter que les icônes ou l'organisation des sections changent juste après l'affichage (sinon il faut recharger pour que ça se stabilise).
    if (!Portail.model && !localStorage.getItem('scouthub.portail')) { await Portail.refresh(() => {}); renderApps(); Portail.refresh(renderApps); }
    else { renderApps(); Portail.refresh(renderApps); }
  }
  function enter() { if (!goNext()) showHome(); }

  // ---------- démarrage ----------
  // Retour de la boutique (« Avec mon compte Boutique ») : un code à usage unique ouvre la session ScoutHub.
  const retourBoutique = new URLSearchParams(location.search).get("boutique");
  if (retourBoutique && /^[0-9a-f]{48}$/.test(retourBoutique) && window.SCOUTHUB_API) {
    const q = new URLSearchParams(location.search); q.delete("boutique");
    history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
    Hub.call("boutique", { code: retourBoutique })
      .then(out => { store.set(out.token); Hub.user = out.user; Hub.cacheUser(out.user); enter(); })
      .catch(e => { showAuth(); say($("auth-status"), e.message, true); });
    return;
  }
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
