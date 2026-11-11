// Mise en page du portail : modèle (sections + applications), valeurs d'origine (config.js), sécurité des adresses et des logos.
// Le modèle enregistré par l'administrateur vit côté serveur (portail.json dans le dépôt de données privé) ;
// ce fichier le met en cache dans le navigateur pour que l'accueil s'affiche instantanément, puis le rafraîchit.
(() => {
  "use strict";
  const KEY = "scouthub.portail";
  const TOP = ["Mon espace", "Assistant", "Boutique"];
  const slug = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "x";
  const safeUrl = u => typeof u === "string" && (/^https:\/\/[^\s"'<>\\]{3,300}$/.test(u) || /^[A-Za-z0-9][\w.\-\/]{0,120}(\?[\w=&%.\-]{0,160})?$/.test(u));
  const safeIcon = i => typeof i === "string" && (/^assets\/icons\/[\w.\-]{1,60}$/.test(i) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]{20,200000}$/.test(i));

  // Valeurs d'origine : config.js
  function defaults() {
    const sections = [], apps = [];
    (window.SCOUTHUB_APPS || []).forEach(a => {
      let s = sections.find(x => x.titre === a.group);
      if (!s) sections.push(s = { id: slug(a.group), titre: a.group, haut: TOP.includes(a.group) });
      apps.push({ id: slug(a.name), section: s.id, nom: a.name, desc: a.desc || "", url: a.url, icone: a.icon, crop: !!a.crop, featured: !!a.featured, masque: false, protege: !!a.protege, local: !!a.local });
    });
    return { v: 1, sections, apps };
  }
  // Applications ajoutées à config.js après l'enregistrement de la mise en page : elles apparaissent en fin de section.
  function merge(m) {
    const d = defaults(), out = { ...m, sections: m.sections.map(s => ({ ...s })), apps: m.apps.map(a => ({ ...a })) };
    d.apps.forEach(a => {
      if (out.apps.some(x => x.id === a.id)) return;
      const ds = d.sections.find(s => s.id === a.section);
      let s = out.sections.find(x => x.titre === ds.titre);
      if (!s) { s = { id: ds.id, titre: ds.titre, haut: ds.haut }; out.sections.push(s); }
      out.apps.push({ ...a, section: s.id, nouveau: true });
    });
    return out;
  }
  function valid(m) { return m && Array.isArray(m.sections) && Array.isArray(m.apps) && m.apps.every(a => a && safeUrl(a.url) && safeIcon(a.icone) && typeof a.nom === "string"); }
  const cached = () => { try { const m = JSON.parse(localStorage.getItem(KEY) || "null"); return valid(m) ? m : null; } catch { return null; } };
  const P = window.Portail = {
    TOP, slug, safeUrl, safeIcon, defaults, merge, valid, isAdmin: false, model: null,
    current() { return P.model || (P.model = merge(cached() || defaults())); },
    // Connecté (compte @fsggb.fr) ? Sinon les applications protégées n'existent pas pour la personne (le serveur ne les envoie pas non plus).
    connected: () => !!(window.Hub && Hub.token && Hub.cachedUser()),
    // Interroge le serveur ; appelle onChange(modèle) si la mise en page diffère de celle affichée.
    async refresh(onChange) {
      try {
        const o = await Hub.call("portailLire"); P.isAdmin = !!o.admin;
        const m = valid(o.portail) ? merge(o.portail) : merge(defaults());
        if (o.portail && valid(o.portail)) { try { localStorage.setItem(KEY, JSON.stringify(o.portail)); } catch {} }
        else { try { localStorage.removeItem(KEY); } catch {} }
        const changed = JSON.stringify(m) !== JSON.stringify(P.model);
        P.model = m; if (changed && onChange) onChange(m);
      } catch { /* hors ligne ou serveur à jour : on garde la mise en page connue */ }
    }
  };
})();
