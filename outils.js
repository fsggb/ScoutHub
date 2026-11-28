// Grille des applications (ancien contenu de l'accueil, déplacé ici : voir index.html/app.js pour la structure
// à 4 onglets, reprise de l'ancien intranet). Accessible sans compte : seules les applications publiques s'affichent.
(() => {
  "use strict";
  const { $, store, masquePerso, toggleMasquePerso: toggleMasqueBase } = Hub;
  const toggleMasquePerso = id => { toggleMasqueBase(id); renderApps(); };

  const ICONE_OEIL = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const ICONE_OEIL_BARRE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5.5 19 2 12 2 12a19 19 0 0 1 4.1-5.1M9.9 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-2.2 3.2M1 1l22 22"/></svg>';
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
      const perso = masquePerso(a.id), hide = document.createElement("button");
      hide.type = "button"; hide.className = "app-hide" + (perso ? " ferme" : "");
      hide.title = perso ? "Afficher de nouveau cet outil" : "Masquer cet outil pour moi";
      hide.setAttribute("aria-label", (perso ? "Afficher « " : "Masquer « ") + a.nom + " » pour moi");
      hide.innerHTML = perso ? ICONE_OEIL_BARRE : ICONE_OEIL;
      hide.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); toggleMasquePerso(a.id); };
      link.append(hide);
    }
    // Administrateur : clic droit = menu d'actions (modifier, masquer pour tous, supprimer).
    if (adminReel()) link.addEventListener("contextmenu", ev => { ev.preventDefault(); menuOutil(ev, a); });
    return link;
  }


  // ---- menu contextuel (clic droit) de l'administrateur ----
  function menuOutil(ev, a) {
    document.querySelectorAll(".ctx-menu").forEach(n => n.remove());
    const m = document.createElement("div"); m.className = "ctx-menu"; m.setAttribute("role", "menu");
    const action = (txt, fn, danger) => { const b = Object.assign(document.createElement("button"), { type: "button", textContent: txt, className: danger ? "danger" : "" }); b.setAttribute("role", "menuitem"); b.onclick = () => { m.remove(); fn(); }; m.append(b); };
    action("Renommer", () => { const n = document.querySelector('[data-app="' + CSS.escape(a.id) + '"] strong'); if (n) OutilsEdition.renommerApp(a, n, renderApps); });
    action("Modifier (nom, description, adresse, public)…", () => OutilsEdition.modifier(a, renderApps));
    if (a.entree && a.entree.id) {
      action("Qui le voit ?…", () => Entrees.dialogue("outils", a.entree, () => Portail.refresh(renderApps)));
      const cache = (a.entree.audience || []).length === 1 && a.entree.audience[0] === "admin";
      action(cache ? "Rendre visible pour tous" : "Masquer pour tous", async () => { try { await Hub.call("entreeEcrire", { section: "outils", id: a.entree.id, nom: a.nom, description: a.desc, url: a.url, audience: cache ? ["all"] : ["admin"] }); Portail.refresh(renderApps); } catch (e) { alert(e.message); } });
      action("Supprimer…", async () => { if (!confirm("Supprimer « " + a.nom + " » pour tout le monde ?")) return; try { await Hub.call("entreeSupprimer", { id: a.entree.id }); Portail.refresh(renderApps); } catch (e) { alert(e.message); } }, true);
    }
    document.body.append(m);
    m.style.left = Math.min(ev.clientX, innerWidth - m.offsetWidth - 8) + "px"; m.style.top = Math.min(ev.clientY, innerHeight - m.offsetHeight - 8) + "px";
    const fermer = e => { if (!m.contains(e.target) || e.type === "keydown") { m.remove(); removeEventListener("click", fermer, true); removeEventListener("keydown", fermer, true); } };
    setTimeout(() => { addEventListener("click", fermer, true); addEventListener("keydown", fermer, true); }, 0);
  }


  function menuSection(ev, s) {
    document.querySelectorAll(".ctx-menu").forEach(n => n.remove());
    const m = document.createElement("div"); m.className = "ctx-menu"; m.setAttribute("role", "menu");
    const action = (txt, fn, danger) => { const b = Object.assign(document.createElement("button"), { type: "button", textContent: txt, className: danger ? "danger" : "" }); b.setAttribute("role", "menuitem"); b.onclick = () => { m.remove(); fn(); }; m.append(b); };
    action("Renommer la section", () => { const h = document.querySelector('[data-titre="' + CSS.escape(s.id) + '"]'); if (h) OutilsEdition.renommer(s, h, renderApps); });
    action("Ajouter une application ici…", () => OutilsEdition.ajouter(s.id, renderApps));
    action("Supprimer la section", () => OutilsEdition.supprimerSection(s, renderApps), true);
    document.body.append(m);
    m.style.left = Math.min(ev.clientX, innerWidth - m.offsetWidth - 8) + "px"; m.style.top = Math.min(ev.clientY, innerHeight - m.offsetHeight - 8) + "px";
    const fermer = e => { if (!m.contains(e.target) || e.type === "keydown") { m.remove(); removeEventListener("click", fermer, true); removeEventListener("keydown", fermer, true); } };
    setTimeout(() => { addEventListener("click", fermer, true); addEventListener("keydown", fermer, true); }, 0);
  }

  // ---- barre d'ajout (administrateur) : un bouton pour une section, un pour une application ----
  function barreAdmin() {
    let b = $("apps-barre");
    if (!adminReel()) { if (b) b.remove(); return; }
    if (b) return;
    b = document.createElement("div"); b.id = "apps-barre"; b.className = "apps-barre";
    const plus = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    const bouton = (txt, fn) => { const x = document.createElement("button"); x.type = "button"; x.className = "barre-btn"; x.innerHTML = plus + "<span></span>"; x.lastChild.textContent = txt; x.onclick = fn; return x; };
    const aide = Object.assign(document.createElement("span"), { className: "barre-aide", textContent: "Glissez pour réorganiser · double-clic sur un titre pour le renommer · clic droit pour les autres actions" });
    b.append(bouton("Section", () => OutilsEdition.nouvelleSection(renderApps)), bouton("Application", () => OutilsEdition.ajouter((Portail.current().sections[0] || {}).id, renderApps)), aide);
    $("apps").before(b);
  }

  let recherche = "", voirMasquees = false;
  function renderApps() {
    const plat = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();      // « creation » trouve « Création »
    const q = plat(recherche.trim()), box = $("apps"); box.textContent = "";
    const m = Portail.current(), shown = [], editable = adminReel(), rangees = [];
    m.sections.forEach(s => {
      const items = m.apps.filter(a => a.section === s.id && !(a.nom === "ChatGDB" && Hub.user && Hub.normRole(Hub.user.role) === "admin" && !Hub.simule()) && (!a.admin || Portail.isAdmin) && (!a.masque || Portail.isAdmin) && (!a.protege || Portail.isAdmin || Hub.estFederation(Hub.user)) && (!a.role || Portail.isAdmin || Hub.can(Hub.user, a.role)) && (!masquePerso(a.id) || Portail.isAdmin || voirMasquees) && (!q || plat(a.nom + " " + a.desc + " " + s.titre).includes(q)));
      if (!items.length) return;   // une section vide disparaît (l'administrateur la recrée avec « + Section »)
      shown.push(...items);
      const section = document.createElement("section"); section.className = "app-group"; section.dataset.sec = s.id;
      const titre = Object.assign(document.createElement("h2"), { textContent: s.titre });
      if (editable) { titre.dataset.titre = s.id; titre.draggable = true; titre.title = "Glisser pour déplacer la section · double-clic pour renommer"; titre.classList.add("sec-poignee"); titre.oncontextmenu = ev => { ev.preventDefault(); menuSection(ev, s); }; titre.ondblclick = () => OutilsEdition.renommer(s, titre, renderApps); }
      const grid = document.createElement("div"); grid.className = "grid-apps"; grid.dataset.grille = s.id;
      items.forEach(a => grid.append(tile(a)));
      section.append(titre, grid);
      const derniere = rangees[rangees.length - 1];   // sections de même « ligne » consécutives = côte à côte sur la même rangée
      if (derniere && derniere.id === s.ligne && derniere.blocs.length < 3) derniere.blocs.push(section); else rangees.push({ id: s.ligne, blocs: [section] });   // 3 sections côte à côte au plus : jamais de colonnes écrasées
    });
    rangees.forEach(r => {
      if (r.blocs.length === 1) { box.append(r.blocs[0]); return; }
      const ligne = document.createElement("div"); ligne.className = "group-row cote"; ligne.style.setProperty("--n", r.blocs.length); ligne.append(...r.blocs); box.append(ligne);
    });
    barreAdmin();
    $("none").hidden = shown.length > 0;
    // Option pour revoir temporairement les applications masquées pour soi (sans les « remettre » une à une) :
    // seulement utile si on en a masqué, et sans objet pour l'administrateur qui les voit déjà toutes.
    const bouton = $("voir-masquees"), n = Hub.mesMasquees().length;
    bouton.hidden = Portail.isAdmin || !n;
    if (!bouton.hidden) bouton.textContent = voirMasquees ? "Cacher de nouveau mes outils masqués" : "Voir mes " + n + " application" + (n > 1 ? "s" : "") + " masquée" + (n > 1 ? "s" : "");
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
    // Un seul affichage, stable : on attend la vraie disposition (au plus 1,5 s) avant de montrer la grille, puis elle apparaît d'un coup.
    const box = $("apps"); box.classList.add("en-attente");
    const reveler = () => { renderApps(); box.classList.remove("en-attente"); };
    const delai = new Promise(r => setTimeout(r, 1500));
    await Promise.race([Portail.refresh(() => {}), delai]); reveler();
    Portail.refresh(renderApps);
  }

  if (store.get() && window.SCOUTHUB_API) {
    Hub.user = Hub.cachedUser();
    montrer();
    Hub.call("me").then(o => { Hub.user = o.user; Hub.cacheUser(o.user); montrer(); })
      .catch(() => { store.set(null); Hub.user = null; montrer(); });
  } else montrer();
})();
