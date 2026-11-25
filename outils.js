// Grille des applications (ancien contenu de l'accueil, déplacé ici : voir index.html/app.js pour la structure
// à 4 onglets, reprise de l'ancien intranet). Accessible sans compte : seules les applications publiques s'affichent.
(() => {
  "use strict";
  const { $, store } = Hub;

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
    const plat = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();      // « creation » trouve « Création »
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

  async function montrer() {
    Hub.renderBar(Hub.user); Hub.renderTabs("outils");
    const prenom = Hub.user ? Hub.user.email.split("@")[0].split(/[._-]+/)[0] : "";
    $("hello").textContent = Hub.user ? "Bonjour, " + prenom.charAt(0).toUpperCase() + prenom.slice(1) : "Vos applications";
    $("guest-note").hidden = !!Hub.user;
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
