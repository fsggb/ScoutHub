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
            // Photo de compte Google (out.user.picture) : vérifiée et renvoyée par le serveur (auth.js), qui l'a
            // lue dans le jeton Google et conservée en base — pas besoin de la relire côté client.
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
    if (new URLSearchParams(location.search).has("diag")) {   // ?diag=1 : montre ce que la page envoie à Google
      const id = window.SCOUTHUB_GOOGLE_CLIENT_ID || "(aucun)";
      $("g-diag").hidden = false; $("g-diag").textContent = "Diagnostic Google — identifiant : " + id + " · origine du site : " + location.origin + " (à déclarer dans « Origines JavaScript autorisées »)";
    }
    Hub.renderBar(null, "Connexion");
    $("home").hidden = true; $("auth").hidden = false;
    if (!window.SCOUTHUB_API) say($("auth-status"), "Le serveur ScoutHub n’est pas encore configuré (config.js).", true);
    setTimeout(() => $("email").focus(), 0);
  }

  // ---------- accueil : tableau de bord léger (raccourcis). La grille d'applications vit désormais sur outils.html,
  // la structure (Accueil/Documentation/Inscriptions/Outils) reprend l'ancien intranet (Hub.renderTabs, common.js). ----------
  function showHome() {
    $("auth").hidden = true; $("home").hidden = false;
    Hub.renderBar(Hub.user, "Accueil"); Hub.renderTabs("accueil", Hub.user);
    // showHome() n'est appelée qu'une fois connecté (showAuth() sinon) : Hub.user existe toujours ici.
    $("hello").textContent = "Bonjour, " + Hub.prenom(Hub.user);
    // Images des boutons (feuille « Accueil » du classeur ; Outils n'y figure pas : image du menu des outils).
    const IMG = { "outils.html": "Images/Menu_images/Gestion_unite" };
    Hub.call("menu", { menu: "Accueil" }).then(o => { o.rubriques.forEach(r => { const n = r.nom.toLowerCase(); if (n === "documentation") IMG["documentation.html"] = r.image; if (n === "inscriptions") IMG["inscriptions.html"] = r.image; }); }).catch(() => {}).finally(() => document.querySelectorAll("#home a.dash-card").forEach(c => Hub.fondCarte(c, IMG[c.getAttribute("href")])));
  }
  async function enter() { await Hub.sessionIntranet(); if (!goNext()) showHome(); }

  // ---------- démarrage ----------
  // « Avec mon compte Boutique GDB » retiré (26/11) : ne fonctionnait pas, seule la connexion Google ou par
  // e-mail @fsggb.fr reste proposée.
  // Seul l'onglet Outils reste accessible sans compte (outils.html/outils.js, inchangé) : l'accueil (tableau de
  // bord) demande désormais une connexion, comme Documentation et Inscriptions (onglet.js).
  if (store.get() && window.SCOUTHUB_API) {
    // Affichage immédiat avec l'utilisateur mémorisé, vérification de la session en arrière-plan.
    Hub.user = Hub.cachedUser();
    if (Hub.user) showHome(); // sinon : on attend la vérification de la session (showAuth déjà affiché ci-dessous)
    else showAuth();
    Hub.call("me").then(o => { Hub.user = o.user; Hub.cacheUser(o.user); enter(); })
      .catch(() => { store.set(null); Hub.user = null; showAuth(); });
  } else showAuth();
})();
