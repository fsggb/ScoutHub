// Rubriques de Documentation (Bibliographie, Administratif, Revues, Tutos, Agenda Fédé, Lieux de camp) : le serveur n'envoie
// QUE ce qui concerne la personne (rôle, groupe, unité). Ici, mise en forme seulement ; tout est écrit avec textContent ;
// seuls les liens https:// sont ouverts, dans un nouvel onglet, sans transmettre l'origine (noopener).
(async () => {
  "use strict";
  const { $ } = Hub, nom = new URLSearchParams(location.search).get("r") || "";
  const surIntranet = !!window.SCOUTHUB_INTRANET && location.hostname === window.SCOUTHUB_INTRANET;
  const reponse = nom ? Hub.call("rubrique", { rubrique: nom }).then(o => ({ o }), e => ({ e })) : null;   // part tout de suite, pendant la vérification de session
  $("rb-contenu").append(Hub.chargement("Chargement…"));
  { const c = Hub.cachedUser(); if (c) { Hub.renderBar(c, "Documentation"); Hub.renderTabs("documentation", c); Hub.montrerMain(); } }
  const user = await Hub.requireUser(); if (!user) return;
  Hub.renderBar(user, "Documentation"); Hub.renderTabs("documentation", user);
  Hub.renderFil([{ label: "Accueil", href: "index.html" }, { label: "Documentation", href: "documentation.html" }, { label: nom || "Rubrique" }]);
  $("rb-h1").textContent = nom || "Rubrique"; document.title = (nom || "Documentation") + " · ScoutHub";
  const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...kids); return e; };
  const norm = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lien = (url, txt, cls) => /^https:\/\//.test(url || "") ? el("a", { className: "rb-btn " + (cls || ""), href: url, target: "_blank", rel: "noopener noreferrer", textContent: txt }) : el("span", { className: "rb-btn sec", textContent: txt, ariaDisabled: "true" });
  const encChemin = p => String(p).split("/").map(encodeURIComponent).join("/");
  const vignette = (r, cls) => {
    if (!surIntranet || !r.mini) return null;
    const im = el("img", { className: cls || "rb-vignette", alt: "", loading: "lazy", decoding: "async" }); im.onerror = () => im.remove(); im.src = "/miniature/" + r.mini; return im;
  };
  let lignes = [], f1 = "", f2 = "";
  const MOIS = t => { const m = String(t).match(/^\s*(\d+)/); return m ? +m[1] : 99; };
  const ORDRE_MOIS = n => (n >= 9 ? n - 9 : n + 3);   // l'année scoute commence en septembre
  const grouper = (rs, cle) => { const m = new Map(); rs.forEach(r => { const k = cle(r) || "Autres"; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }); return m; };
  const remarques = r => r.remarques ? el("details", { className: "rb-det" }, el("summary", { textContent: "Détails" }), el("p", { textContent: r.remarques })) : document.createTextNode("");

  // ---------- présentations ----------
  const RENDU = {
    "Bibliographie": { filtres: [["branches", "Toutes les branches"], ["categorie", "Toutes les catégories"]], dessiner: rs => {
      const z = el("div"); for (const [cat, items] of grouper(rs, r => r.categorie)) z.append(el("section", { className: "rb-groupe" }, el("h2", { textContent: cat }), el("div", { className: "rb-liste" }, ...items.map(r => el("div", { className: "rb-ligne" }, el("div", { className: "rb-t" }, el("b", { textContent: r.titre }), el("small", { textContent: r.auteur }), remarques(r)), el("span", { className: "rb-puce", textContent: r.branches || "" }))))));
      return z; } },
    "Administratif": { filtres: [["menu", "Tous les thèmes"], ["categorie", "Toutes les catégories"]], dessiner: rs => {
      const z = el("div"); for (const [menu, items] of grouper(rs, r => r.menu)) { const s = el("section", { className: "rb-groupe" }, el("h2", { textContent: menu }));
        for (const [cat, its] of grouper(items, r => r.categorie)) s.append(el("h3", { textContent: cat }), el("div", { className: "rb-liste" }, ...its.map(r => { const v = vignette(r); return el("div", { className: "rb-ligne" }, ...(v ? [v] : []), el("div", { className: "rb-t" }, el("b", { textContent: r.titre }), el("small", { textContent: r.remarques || "" })), r.lien ? lien(r.lien, "Ouvrir") : el("span", { className: "rb-puce", textContent: "bientôt" })); })));
        z.append(s); } return z; } },
    "Revues": { filtres: [["nom", "Toutes les revues"]], dessiner: rs => {
      const z = el("div"); for (const [revue, items] of grouper(rs, r => r.nom)) { const tri = [...items].sort((a, b) => (parseInt(b.numero, 10) || 0) - (parseInt(a.numero, 10) || 0));
        z.append(el("section", { className: "rb-groupe" }, el("h2", { textContent: revue }), el("div", { className: "rb-numeros" }, ...tri.map(r => { const v = vignette(r, "rb-couv"); return surIntranet && r.fichier ? el("a", { className: "rb-revue", href: "/fichier/" + encChemin(r.fichier), target: "_blank", rel: "noopener noreferrer", title: revue + " n° " + r.numero }, el("span", { className: "rb-couv-cadre" }, ...(v ? [v] : []), el("span", { className: "rb-couv-vide", textContent: "PDF" })), el("b", { textContent: "N° " + r.numero })) : el("span", { className: "rb-btn sec", ariaDisabled: "true", textContent: "N° " + r.numero }); })))); }
      if (!surIntranet) z.prepend(el("p", { className: "rb-refus", textContent: "Les PDF des revues s’ouvrent depuis l’intranet (intranet.fsggb.workers.dev)." })); return z; } },
    "Tutos": { filtres: [["type", "Tous les types"]], dessiner: rs => el("div", { className: "rb-cartes" }, ...rs.map(r => {
      const mini = el("div", { className: "rb-mini" }, "▶");
      if (surIntranet && /^appsheet\//i.test(r.miniature || "")) { const im = new Image(); im.alt = ""; im.onload = () => { mini.textContent = ""; mini.append(im); }; im.src = "/img/" + encChemin(r.miniature); }
      return el("div", { className: "rb-carte" }, mini, el("div", { className: "rb-corps" }, el("b", { textContent: r.nom }), el("span", {}, el("span", { className: "rb-puce", textContent: r.type || "" })), el("small", { textContent: r.description || "" }),
        el("div", { className: "rb-actions" }, ...(r.video ? [lien(r.video, "Voir la vidéo")] : []), ...(r.lien ? [lien(r.lien, "Fiche", "sec")] : []))));
    })) },
    "Agenda Fédé": { filtres: [["type", "Tous les types"], ["personne", "Toutes les personnes"]], dessiner: rs => {
      const z = el("div"); const mois = [...grouper(rs, r => r.mois).entries()].sort((a, b) => ORDRE_MOIS(MOIS(a[0])) - ORDRE_MOIS(MOIS(b[0])));
      for (const [m, items] of mois) z.append(el("section", { className: "rb-groupe" }, el("h2", { textContent: m }), el("div", { className: "rb-liste" }, ...items.map(r => el("div", { className: "rb-ligne" }, el("div", { className: "rb-t" }, el("b", { textContent: r.tache }), el("small", { textContent: r.description })), el("span", {}, el("span", { className: "rb-puce", textContent: r.type || "" }), el("span", { className: "rb-puce", textContent: r.personne || "" }), el("span", { textContent: /^(true|vrai|oui|x|1)$/i.test(r.faite) ? "✓ faite" : "○ à faire" })))))));
      return z; } },
    "Lieux de camp": { filtres: [["groupe", "Tous les groupes"], ["annee", "Toutes les années"]], dessiner: rs => {
      if (!rs.length) return el("p", { className: "rb-refus", textContent: "Aucun lieu de camp enregistré pour le moment." });
      const cols = [["groupe", "Groupe"], ["unite", "Unité"], ["annee", "Année"], ["region", "Région"], ["departement", "Département"], ["superficie", "Superficie"], ["feu", "Feu"], ["bois", "Bois"], ["eau", "Eau"], ["frigos", "Frigos"], ["abris", "Abris"], ["commentaire", "Commentaire"]];
      const t = el("table", { className: "rb-table" }, el("thead", {}, el("tr", {}, ...cols.map(c => el("th", { textContent: c[1] })))), el("tbody", {}, ...rs.map(r => el("tr", {}, ...cols.map(c => el("td", { textContent: r[c[0]] || "—" }))))));
      return el("div", { className: "rb-table-wrap" }, t); } }
  };
  const def = RENDU[nom];
  if (!def) { $("rb-outils").hidden = true; $("rb-refus").hidden = false; $("rb-refus").textContent = "Rubrique inconnue."; return; }

  // ---------- filtres et recherche ----------
  function filtres() {
    def.filtres.forEach(([cle, libelle], i) => {
      const s = $("rb-f" + (i + 1)); s.hidden = false; s.textContent = ""; s.append(el("option", { value: "", textContent: libelle }));
      [...new Set(lignes.map(r => r[cle]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")).forEach(v => s.append(el("option", { value: v, textContent: v })));
      s.onchange = () => { (i ? (f2 = s.value) : (f1 = s.value)); afficher(); };
    });
  }
  function afficher() {
    const q = norm($("rb-q").value.trim());
    const rs = lignes.filter(r => (!f1 || r[def.filtres[0][0]] === f1 || (def.filtres[0][0] === "branches" && r.branches === "Toutes")) && (!f2 || r[def.filtres[1][0]] === f2) && (!q || norm(Object.values(r).join(" ")).includes(q)));
    $("rb-compte").textContent = rs.length.toLocaleString("fr-FR") + " résultat" + (rs.length > 1 ? "s" : "");
    const z = $("rb-contenu"); z.textContent = ""; z.append(rs.length || nom === "Lieux de camp" ? def.dessiner(rs) : el("p", { className: "rb-refus", textContent: "Aucun résultat." }));
  }
  $("rb-q").oninput = afficher;
  try {
    const rep = await reponse; if (rep.e) throw rep.e; const o = rep.o;
    lignes = o.lignes; filtres(); afficher();
    if (o.portee === "groupe") $("rb-sous").textContent = "Les lieux de votre groupe."; else if (o.portee === "unite") $("rb-sous").textContent = "Les lieux de votre unité.";
  } catch (e) { $("rb-contenu").textContent = ""; $("rb-outils").hidden = true; $("rb-refus").hidden = false; $("rb-refus").textContent = /ne vous est pas destin/.test(e.message) ? "Cette rubrique ne vous est pas destinée." : "Impossible d’afficher cette rubrique : " + e.message; }
})();
