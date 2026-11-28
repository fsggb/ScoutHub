// Grille des applications (ancien contenu de l'accueil, déplacé ici : voir index.html/app.js pour la structure
// à 4 onglets, reprise de l'ancien intranet). Accessible sans compte : seules les applications publiques s'affichent.
(() => {
  "use strict";
  const { $, store, masquePerso, toggleMasquePerso: toggleMasqueBase } = Hub;
  const toggleMasquePerso = id => { toggleMasqueBase(id); renderApps(); };

  const adminReel = () => !!Hub.user && Hub.user.role === "admin" && !Hub.simule() && !!window.SCOUTHUB_AUTH_API;   // l'organisation directe des outils n'existe que sur l'intranet
  function tile(a) {
    const link = document.createElement("a"); link.dataset.app = a.id;
    if (adminReel()) { link.draggable = true; link.setAttribute("aria-roledescription", "outil déplaçable"); }
    link.className = "app-tile" + (a.featured ? " featured" : "") + (a.masque ? " is-hidden" : "") + (a.admin && Portail.isAdmin ? " is-admin" : ""); link.href = Portail.safeUrl(a.url) ? a.url : "#";
    if (!a.local) { link.target = "_blank"; link.rel = "noopener"; }
    // La boutique : la personne connectée à ScoutHub y arrive connectée (code à usage unique, jamais la session).
    let hote = ""; try { hote = new URL(a.url, location.href).host; } catch {}
    // Application extérieure branchée sur la connexion unifiée (propriété « sso » de config.js = identifiant dans
    // APPS_AUTORISEES) : code à usage unique (60 s) ajouté à l'adresse, que l'application échange auprès de auth.fsggb.workers.dev.
    if (a.sso) link.addEventListener("click", ev => {
      if (!store.get()) return;
      ev.preventDefault();
      const w = a.local ? null : window.open("about:blank", "_blank");
      const aller = u => { if (w) w.location.href = u; else location.href = u; };
      Hub.call("echange", { aud: a.sso }).then(o => { const u = new URL(a.url); u.searchParams.set("code", o.code); u.searchParams.set("aud", a.sso); aller(u.href); }).catch(() => aller(a.url));
    });
    else if (hote === "boutique.fsggb.fr") link.addEventListener("click", ev => {
      if (!store.get() || !window.SCOUTHUB_API) return;
      ev.preventDefault();
      const w = window.open("about:blank", "_blank");
      const aller = u => { if (w) w.location.href = u; else location.href = u; };
      Hub.call("passe").then(o => { const u = new URL(a.url); u.searchParams.set("sh", o.code); aller(u.href); }).catch(() => aller(a.url));
    });
    // Administrateur : ✎ renommer / décrire (et, pour un outil ajouté, changer son public).
    if (adminReel()) {
      const b = Object.assign(document.createElement("button"), { type: "button", className: "app-edit", textContent: "✎", title: "Modifier cet outil" }); b.setAttribute("aria-label", "Modifier « " + a.nom + " »");
      b.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); OutilsEdition.modifier(a, renderApps); };
      link.append(b);
    }
    // Outil avec une image du Drive : tuile en GRAND, comme les boutons de Documentation et d'Inscriptions.
    const grand = typeof a.icone === "string" && a.icone.startsWith("/img/");
    if (grand) {
      link.classList.add("grand");
      const im = new Image(); im.onload = () => { link.style.backgroundImage = "linear-gradient(180deg, rgba(0,7,97,.04) 35%, rgba(0,7,97,.78)), url(\"" + a.icone + "\")"; link.classList.add("avec-image"); }; im.src = a.icone;
      const lib = document.createElement("span"); lib.className = "tile-label";
      lib.append(Object.assign(document.createElement("strong"), { textContent: a.nom }), Object.assign(document.createElement("small"), { textContent: a.desc }));
      link.append(lib);
    }
    let badge; const icon = Portail.safeIcon(a.icone) && !grand ? a.icone : "assets/fsggb.png";
    if (!grand) {
      if (a.crop) { badge = document.createElement("span"); badge.className = "app-badge crop"; badge.style.backgroundImage = `url("${icon}")`; }
      else { badge = document.createElement("img"); badge.className = "app-badge"; badge.alt = ""; badge.decoding = "async"; badge.loading = "eager"; badge.src = icon; badge.onerror = () => { if (icon !== "assets/fsggb.png") badge.src = "assets/fsggb.png"; }; }
    }
    const text = document.createElement("span");
    const strong = Object.assign(document.createElement("strong"), { textContent: a.nom });
    const small = Object.assign(document.createElement("small"), { textContent: a.desc });
    text.append(strong, small); if (!grand) link.append(badge, text);
    if (Portail.isAdmin && (a.admin || a.masque || a.protege || a.role)) link.append(Object.assign(document.createElement("em"), { className: "hidden-flag", textContent: a.admin ? "Administrateur" : a.masque ? "Masquée pour les autres" : a.role ? "Réservée : " + (Hub.ROLE_LABELS[a.role] || a.role) + " et plus" : "Réservée aux @fsggb.fr" }));
    if (Hub.user) {
      const hide = document.createElement("button");
      hide.type = "button"; hide.className = "app-hide"; hide.title = "Masquer pour moi (dans « Mon compte » pour la retrouver)";
      hide.textContent = "✕"; hide.setAttribute("aria-label", "Masquer « " + a.nom + " » pour moi");
      hide.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); toggleMasquePerso(a.id); };
      link.append(hide);
    }
    return link;
  }

  let recherche = "", voirMasquees = false;
  function renderApps() {
    const plat = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();      // « creation » trouve « Création »
    const q = plat(recherche.trim()), box = $("apps"); box.textContent = "";
    const m = Portail.current(), shown = [], editable = adminReel(), rangees = [];
    m.sections.forEach(s => {
      const items = m.apps.filter(a => a.section === s.id && (!a.admin || Portail.isAdmin) && (!a.masque || Portail.isAdmin) && (!a.protege || Portail.isAdmin || Hub.estFederation(Hub.user)) && (!a.role || Portail.isAdmin || Hub.can(Hub.user, a.role)) && (!masquePerso(a.id) || Portail.isAdmin || voirMasquees) && (!q || plat(a.nom + " " + a.desc + " " + s.titre).includes(q)));
      if (!items.length && !editable) return;   // une section vide n'est montrée qu'à l'administrateur (pour y déposer des outils)
      shown.push(...items);
      const section = document.createElement("section"); section.className = "app-group"; section.dataset.sec = s.id;
      const titre = Object.assign(document.createElement("h2"), { textContent: s.titre });
      if (editable) { titre.dataset.titre = s.id; titre.draggable = true; titre.title = "Glisser pour déplacer la section · double-clic pour renommer"; titre.classList.add("sec-poignee"); titre.ondblclick = () => OutilsEdition.renommer(s, titre, renderApps); }
      const grid = document.createElement("div"); grid.className = "grid-apps"; grid.dataset.grille = s.id;
      items.forEach(a => grid.append(tile(a)));
      // Administrateur : une tuile « + » comme un outil normal ; un clic ouvre la fenêtre de création.
      if (editable) {
        const plus = document.createElement("button"); plus.type = "button"; plus.className = "app-tile ajout"; plus.dataset.ajout = s.id;
        plus.append(Object.assign(document.createElement("span"), { className: "app-badge plus", textContent: "+" }), (() => { const t = document.createElement("span"); t.append(Object.assign(document.createElement("strong"), { textContent: "Ajouter un outil" }), Object.assign(document.createElement("small"), { textContent: "Nouvel outil, avec son public" })); return t; })());
        plus.onclick = () => OutilsEdition.ajouter(s.id, renderApps); grid.append(plus);
      }
      section.append(titre, grid);
      const derniere = rangees[rangees.length - 1];   // sections de même « ligne » consécutives = côte à côte sur la même rangée
      if (derniere && derniere.id === s.ligne) derniere.blocs.push(section); else rangees.push({ id: s.ligne, blocs: [section] });
    });
    rangees.forEach(r => {
      if (r.blocs.length === 1) { box.append(r.blocs[0]); return; }
      const ligne = document.createElement("div"); ligne.className = "group-row cote"; ligne.style.setProperty("--n", r.blocs.length); ligne.append(...r.blocs); box.append(ligne);
    });
    if (editable) { const bs = document.createElement("p"); bs.className = "ajout-section"; bs.append(Object.assign(document.createElement("button"), { type: "button", className: "ghost", textContent: "+ Nouvelle section", onclick: () => OutilsEdition.nouvelleSection(renderApps) })); box.append(bs); }
    $("none").hidden = shown.length > 0 || editable;
    // Option pour revoir temporairement les applications masquées pour soi (sans les « remettre » une à une) :
    // seulement utile si on en a masqué, et sans objet pour l'administrateur qui les voit déjà toutes.
    const bouton = $("voir-masquees"), n = Hub.mesMasquees().length;
    bouton.hidden = Portail.isAdmin || !n;
    if (!bouton.hidden) bouton.textContent = voirMasquees ? "Ne plus afficher les applications masquées" : "Afficher les " + n + " application" + (n > 1 ? "s" : "") + " masquée" + (n > 1 ? "s" : "");
  }
  $("voir-masquees").onclick = () => { voirMasquees = !voirMasquees; renderApps(); };
  // Recherche : champ de l'en-tête (toujours visible, Hub.renderBar), pas un champ propre à cette page.
  Hub.onSearch = v => { recherche = v; renderApps(); };
  // Recherche lancée depuis l'en-tête d'une autre page (?q=... pré-remplit la recherche, et le champ de l'en-tête
  // reprend la valeur après son premier rendu, une fois Hub.renderBar appelé dans montrer() ci-dessous).
  { const q = new URLSearchParams(location.search).get("q"); if (q) recherche = q; }

  async function montrer() {
    Hub.renderBar(Hub.user, "Outils"); Hub.renderTabs("outils", Hub.user);
    if (recherche) Hub.setSearchValue(recherche);
    $("guest-note").hidden = !!Hub.user;
    if (adminReel() && window.OutilsEdition) OutilsEdition.installer($("apps"), renderApps);   // glisser-déposer direct, sans bouton « Organiser »
    // Première visite (pas encore de mise en page en cache) : on attend la vraie mise en page du serveur avant de peindre,
    // pour éviter que les icônes ou l'organisation des sections changent juste après l'affichage (sinon il faut recharger pour que ça se stabilise).
    if (!Portail.model && !localStorage.getItem('scouthub.portail')) { await Portail.refresh(() => {}); renderApps(); Portail.refresh(renderApps); }
    else { renderApps(); Portail.refresh(renderApps); }
  }

  if (store.get() && window.SCOUTHUB_API) {
    Hub.user = Hub.cachedUser();
    montrer();
    Hub.call("me").then(o => { Hub.user = o.user; Hub.cacheUser(o.user); montrer(); })
      .catch(() => { store.set(null); Hub.user = null; montrer(); });
  } else montrer();
})();
