// Mise en page du portail : modèle (sections + applications), valeurs d'origine (config.js), sécurité des adresses et des logos.
// Le modèle enregistré par l'administrateur vit côté serveur (portail.json dans le dépôt de données privé) ;
// ce fichier le met en cache dans le navigateur pour que l'accueil s'affiche instantanément, puis le rafraîchit.
(() => {
  "use strict";
  const KEY = "scouthub.portail";
  const TOP = ["Mon espace", "Assistant", "Boutique"];
  const slug = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "x";
  const safeUrl = u => typeof u === "string" && (/^https:\/\/[^\s"'<>\\]{3,1500}$/.test(u) || /^[A-Za-z0-9][\w.\-\/]{0,120}(\?[\w=&%.\-]{0,160})?$/.test(u));
  const safeIcon = i => typeof i === "string" && (/^assets\/icons\/[\w.\-]{1,60}$/.test(i) || /^\/img\/Images(\/[\w%.\-]{1,200}){1,4}$/.test(i) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]{20,200000}$/.test(i));
  // Rôle minimum pour voir l'application (en plus de « protege », qui ne demande qu'un compte @fsggb.fr quelconque) :
  // "" = personne de particulier exigé, sinon un rôle de Hub.ROLE_ORDER (vérifié par Hub.can).
  const safeRole = r => !r || (!!window.Hub && window.Hub.ROLE_ORDER.includes(r));

  // Valeurs d'origine : config.js
  function defaults() {
    const sections = [], apps = [];
    (window.SCOUTHUB_APPS || []).forEach(a => {
      let s = sections.find(x => x.titre === a.group);
      if (!s) sections.push(s = { id: slug(a.group), titre: a.group, haut: TOP.includes(a.group) });
      apps.push({ id: slug(a.name), section: s.id, nom: a.name, desc: a.desc || "", url: a.url, icone: a.icon, crop: !!a.crop, featured: !!a.featured, masque: false, protege: !!a.protege, role: safeRole(a.role) ? (a.role || "") : "", local: !!a.local, sso: typeof a.sso === "string" ? a.sso : "", admin: !!a.admin });
    });
    return { v: 1, sections, apps };
  }
  // Applications ajoutées à config.js après l'enregistrement de la mise en page : elles apparaissent en fin de section.
  function merge(m) {
    const d = defaults(), out = { ...m, sections: m.sections.map(s => ({ ...s })), apps: m.apps.map(a => ({ ...a, role: safeRole(a.role) ? (a.role || "") : "" })) };
    // L'adresse, l'icône, « local » et « réservée à l'administrateur » viennent toujours de config.js, même pour une
    // mise en page déjà enregistrée : sinon, une adresse qui change (ex. une application qui se publie désormais
    // seule) reste figée dans l'ancienne mise en page et casse le lien pour tout le monde, sans que personne ne le
    // remarque avant qu'un visiteur tombe sur une page 404 (incident du 26/11/2026 : AutoCAD, CathIA, Cartes IGN).
    // Le nom, la description, la section, l'ordre, le masquage et le rôle restent les choix de l'administrateur.
    const RETIREES = new Set(["cartes-ign", "excalidraw", "soleadworks", "bibliotheque"]);   // retirées du portail : une ancienne mise en page enregistrée ne les ramène pas
    out.apps = out.apps.filter(x => !RETIREES.has(x.id));
    out.apps.forEach(x => { const o = d.apps.find(y => y.id === x.id); if (o) { x.admin = o.admin; x.url = o.url; x.icone = o.icone; x.local = o.local; x.sso = o.sso; } });
    d.apps.forEach(a => {
      if (out.apps.some(x => x.id === a.id)) return;
      const ds = d.sections.find(s => s.id === a.section);
      let s = out.sections.find(x => x.titre === ds.titre);
      if (!s) { s = { id: ds.id, titre: ds.titre, haut: ds.haut }; out.sections.push(s); }
      out.apps.push({ ...a, section: s.id, nouveau: true });
    });
    return out;
  }
  function valid(m) { return m && Array.isArray(m.sections) && Array.isArray(m.apps) && m.apps.every(a => a && safeUrl(a.url) && safeIcon(a.icone) && typeof a.nom === "string" && safeRole(a.role)); }
  const cached = () => { try { const m = JSON.parse(localStorage.getItem(KEY) || "null"); return valid(m) ? m : null; } catch { return null; } };
  // Outils de la fédération : la feuille « Outils » du classeur est la référence (déjà filtrée par le serveur selon la
  // personne connectée) ; elle remplace la section « Outils fédération » de config.js, sans doublon avec une autre application.
  function appliquerOutils(m, outils, entrees, layout) {
    if (!Array.isArray(outils) && !Array.isArray(entrees)) { appliquerLayout(m, layout); return; }
    // Image Drive (servie par l'intranet seulement) : « Images/Menu_images/xxx » → /img/…, sinon le logo de la fédération.
    const icone = t => (t.image && /^images\//i.test(t.image) && window.SCOUTHUB_INTRANET && location.hostname === window.SCOUTHUB_INTRANET) ? "/img/" + t.image.split("/").map(encodeURIComponent).join("/") : "assets/fsggb.png";
    const titre = "Outils fédération", id = slug(titre), norm = u => String(u || "").replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
    let s = m.sections.find(x => x.titre === titre);
    if (!s) m.sections.push(s = { id, titre, haut: false });
    // La feuille « Outils » remplace les outils fédération de config.js (pas les liens que l'administrateur a ajoutés lui-même).
    if (Array.isArray(outils)) { const anciens = new Set(defaults().apps.filter(a => a.section === s.id).map(a => a.id)); m.apps = m.apps.filter(a => !anciens.has(a.id)); }
    const vus = new Set(m.apps.map(a => norm(a.url)));
    // Section demandée par la disposition de l'administrateur (si elle existe encore), sinon la section par défaut.
    const sect = t => (t.section && m.sections.some(x => x.id === t.section)) ? t.section : s.id;
    (outils || []).forEach(t => {
      if (!safeUrl(t.lien) || vus.has(norm(t.lien))) return;
      vus.add(norm(t.lien));
      m.apps.push({ id: slug(t.nom), section: sect(t), nom: String(t.nom).slice(0, 40), desc: String(t.desc || "").slice(0, 140), url: t.lien, icone: icone(t), crop: false, featured: false, masque: false, protege: true, role: "", local: false, admin: false, sso: "", dyn: true, cle: t.cle, ordre: t.ordre });
    });
    // Applications ajoutées par l'administrateur (déjà filtrées par le serveur selon la personne ; l'administrateur reçoit aussi leur public).
    (entrees || []).forEach(e => {
      if (!safeUrl(e.url) || vus.has(norm(e.url))) return;
      vus.add(norm(e.url));
      m.apps.push({ id: "entree-" + e.id, section: sect(e), nom: String(e.nom).slice(0, 40), desc: String(e.description || "").slice(0, 140), url: e.url, icone: "assets/fsggb.png", crop: false, featured: false, masque: false, protege: true, role: "", local: false, admin: false, sso: "", dyn: true, cle: e.cle, ordre: e.ordre, entree: e.audience ? e : undefined });
    });
    appliquerLayout(m, layout);   // rangées, ordre et noms enregistrés par l'administrateur
  }
  // Disposition enregistrée par l'administrateur (base de données, renvoyée avec les outils visibles) : sections, rangées, ordre, noms.
  function appliquerLayout(m, layout) {
    const L = layout || { sections: [], apps: [] };
    L.sections.forEach(d => {
      let sec = m.sections.find(x => x.id === d.id);
      if (!sec) { if (!d.titre || d.ligne === "supprimee") return; m.sections.push(sec = { id: d.id, titre: d.titre, haut: false }); }
      if (d.titre) sec.titre = d.titre; sec.ligne = d.ligne; sec.ordre = d.ordre;
    });
    m.sections = m.sections.filter(x => x.ligne !== "supprimee");
    m.sections = [...m.sections.filter(x => x.ordre !== undefined).sort((a, b) => a.ordre - b.ordre), ...m.sections.filter(x => x.ordre === undefined)];
    let prev = null;   // sans disposition : l'ancien réglage « ligne du haut » (sections consécutives) donne les rangées
    m.sections.forEach(x => { if (!x.ligne) x.ligne = (x.haut && prev && prev.haut) ? prev.ligne : "r-" + x.id; prev = x; });
    L.apps.forEach(d => { const a = m.apps.find(x => x.id === d.id); if (!a) return; if (d.section && m.sections.some(x => x.id === d.section)) a.section = d.section; if (d.nom) a.nom = d.nom; if (d.desc) a.desc = d.desc; a.ordre = d.ordre; });
    // Ordre dans chaque section : positions enregistrées d'abord, puis les nouveaux venus.
    const res = [];
    m.sections.forEach(sec => { const l = m.apps.filter(a => a.section === sec.id), def = l.filter(a => a.ordre !== undefined && a.ordre !== null).sort((a, b) => a.ordre - b.ordre); res.push(...def, ...l.filter(a => a.ordre === undefined || a.ordre === null)); });
    m.apps = [...res, ...m.apps.filter(a => !m.sections.some(x => x.id === a.section))];
  }
  // Dernière vue complète (outils visibles + disposition) de CETTE personne : affichage immédiat, sans attendre le serveur.
  const VUE = "scouthub.portail.vue";
  const vueCachee = () => { try { if (Hub.simule && Hub.simule()) return null; const c = JSON.parse(localStorage.getItem(VUE) || "null"); return c && c.m && c.e && c.e === (Hub.cachedUser() || {}).email && valid(c.m) ? c.m : null; } catch { return null; } };
  const P = window.Portail = {
    TOP, slug, safeUrl, safeIcon, safeRole, defaults, merge, valid, isAdmin: false, model: null,
    current() { return P.model || (P.model = vueCachee() || merge(cached() || defaults())); },
    // Connecté (compte @fsggb.fr) ? Sinon les applications protégées n'existent pas pour la personne (le serveur ne les envoie pas non plus).
    connected: () => !!(window.Hub && Hub.token && Hub.cachedUser()),
    // Interroge le serveur ; appelle onChange(modèle) si la mise en page diffère de celle affichée.
    async refresh(onChange) {
      try {
        const connecte = P.connected();
        // Les trois lectures partent EN MÊME TEMPS (la mise en page, les outils visibles, les outils ajoutés).
        const pOutils = connecte ? Hub.call("outils").catch(() => null) : null, pEntrees = connecte ? Hub.call("entrees", { section: "outils" }).catch(() => null) : null;
        const o = await Hub.call("portailLire"); P.isAdmin = !!o.admin && !Hub.simule();   // en simulation : jamais les droits de l'administrateur
        const m = valid(o.portail) ? merge(o.portail) : merge(defaults());
        if (connecte) { const ro = await pOutils, re = await pEntrees; appliquerOutils(m, ro && ro.outils, re && re.entrees, ro && ro.layout); }
        if (o.portail && valid(o.portail)) { try { localStorage.setItem(KEY, JSON.stringify(o.portail)); } catch {} }
        else { try { localStorage.removeItem(KEY); } catch {} }
        const changed = JSON.stringify(m) !== JSON.stringify(P.model);
        P.model = m; if (connecte && !Hub.simule()) { try { localStorage.setItem(VUE, JSON.stringify({ e: (Hub.cachedUser() || {}).email, m })); } catch {} }
        if (changed && onChange) onChange(m);
      } catch { /* hors ligne ou serveur à jour : on garde la mise en page connue */ }
    }
  };
})();
