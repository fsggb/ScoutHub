// Page Outils : l'administrateur organise les outils directement (glisser-déposer des outils ou des sections, noms de
// section, noms et descriptions d'outils, sections côte à côte sur la même ligne).
// Enregistrement en DEUX endroits, pour qu'un outil à public restreint ne passe JAMAIS dans la mise en page partagée :
//  - mise en page partagée (sections + outils de config.js ou ajoutés à la main) : « portailEcrire », comme la console ;
//  - outils dynamiques (feuille « Outils », outils ajoutés avec leur public) : section, ordre, nom/description, côté serveur
//    (/auth/outils/disposer), renvoyés ensuite avec les seuls outils que chaque personne a le droit de voir.
(() => {
  "use strict";
  const { $ } = Hub, P = window.Portail;
  let m = null, avant = "", drag = null, actif = false, retour = null;
  const clone = o => JSON.parse(JSON.stringify(o));
  const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
  const btn = (t, title, fn) => { const b = el("button", { type: "button", textContent: t, title, onclick: fn }); b.setAttribute("aria-label", title); return b; };
  const modifie = () => JSON.stringify(m) !== avant;
  const marquer = () => { const s = $("oe-etat"); if (s) { s.textContent = modifie() ? "Modifications non enregistrées." : ""; } const e = $("oe-enreg"); if (e) e.disabled = !modifie(); };

  function installer(entete, rerendre) {
    retour = rerendre;
    if (!Hub.user || Hub.user.role !== "admin" || Hub.simule() || $("organiser")) return;
    entete.append(el("button", { id: "organiser", type: "button", className: "ghost", textContent: "Organiser", title: "Glisser-déposer, renommer, mettre côte à côte", onclick: ouvrir }));
  }

  function ouvrir() {
    m = clone(P.current()); m.apps.forEach(a => { a._nom0 = a.nom; a._desc0 = a.desc; });
    avant = JSON.stringify(m); actif = true;
    $("apps").hidden = false; $("none").hidden = true; $("voir-masquees").hidden = true;
    for (const id of ["organiser", "ajout-app"]) { const b = $(id); if (b) b.hidden = true; }
    dessiner();
  }
  function fermer() { actif = false; m = null; drag = null; const z = $("apps"); z.textContent = ""; for (const id of ["organiser", "ajout-app"]) { const b = $(id); if (b) b.hidden = false; } if (retour) retour(); }

  // ---------- rendu ----------
  function dessiner() {
    const zone = $("apps"); zone.textContent = "";
    zone.append(el("div", { className: "oe-barre" },
      el("strong", { textContent: "Organisation des outils" }),
      el("span", { className: "muted", textContent: " Glissez les outils ou les sections ; cochez « côte à côte » pour mettre une section sur la même ligne que la suivante." }),
      el("span", { className: "oe-actions" }, el("span", { id: "oe-etat", className: "status", role: "status" }), btn("+ Section", "Ajouter une section", ajouterSection),
        Object.assign(btn("Annuler", "Abandonner les modifications", () => { if (!modifie() || confirm("Abandonner les modifications ?")) fermer(); }), { className: "ghost" }),
        Object.assign(btn("Enregistrer", "Enregistrer pour tout le monde", enregistrer), { id: "oe-enreg", className: "primary", disabled: true }))));
    const boite = el("div", { id: "oe-secs", className: "pt-secs" });
    let rangee = null;
    m.sections.forEach((s, si) => {
      const bloc = section(s, si);
      if (s.haut) { if (!rangee) { rangee = el("div", { className: "oe-rangee" }); boite.append(rangee); } rangee.append(bloc); }
      else { rangee = null; boite.append(bloc); }
    });
    zone.append(boite); marquer();
  }
  function section(s, si) {
    const sec = el("section", { className: "pt-sec" });
    const poignee = el("span", { className: "pt-handle", textContent: "⠿", title: "Glisser pour déplacer la section" });
    poignee.onmousedown = () => { sec.draggable = true; }; poignee.onmouseup = () => { sec.draggable = false; };
    const titre = el("input", { type: "text", value: s.titre, maxLength: 60 }); titre.setAttribute("aria-label", "Titre de la section"); titre.oninput = () => { s.titre = titre.value; marquer(); };
    const cote = el("input", { type: "checkbox", checked: !!s.haut }); cote.onchange = () => { s.haut = cote.checked; dessiner(); };
    const n = m.apps.filter(a => a.section === s.id).length;
    const supp = Object.assign(btn("Supprimer", "Supprimer la section vide", () => { m.sections.splice(si, 1); dessiner(); }), { className: "ghost small", disabled: n > 0 });
    sec.append(el("div", { className: "pt-head" }, poignee, titre, el("label", {}, cote, " côte à côte"), btn("↑", "Monter la section", () => deplacerSection(si, -1)), btn("↓", "Descendre la section", () => deplacerSection(si, 1)), supp));
    const grille = el("div", { className: "pt-grid" });
    m.apps.filter(a => a.section === s.id).forEach(a => grille.append(carte(a)));
    if (!n) grille.append(el("p", { className: "muted", textContent: "Section vide : déposez un outil ici." }));
    grille.ondragover = e => { if (drag && drag.type === "app" && e.target === grille) { e.preventDefault(); grille.classList.add("drop-end"); } };
    grille.ondragleave = () => grille.classList.remove("drop-end");
    grille.ondrop = e => { if (!drag || drag.type !== "app" || e.target !== grille) return; e.preventDefault(); deposerApp(drag.id, s.id, null, false); };
    sec.append(grille);
    sec.ondragstart = e => { if (e.target !== sec) return; drag = { type: "sec", id: s.id }; sec.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.id); };
    sec.ondragend = () => { sec.draggable = false; sec.classList.remove("dragging"); effacer(); drag = null; };
    sec.ondragover = e => { if (!drag || drag.type !== "sec" || drag.id === s.id) return; e.preventDefault(); const r = sec.getBoundingClientRect(), av = s.haut ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2; effacer(); sec.classList.add(av ? "drop-before" : "drop-after"); };
    sec.ondrop = e => { if (!drag || drag.type !== "sec" || drag.id === s.id) return; e.preventDefault(); const r = sec.getBoundingClientRect(); deposerSection(drag.id, s.id, s.haut ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2); };
    return sec;
  }
  function carte(a) {
    const icone = P.safeIcon(a.icone) ? a.icone : "assets/fsggb.png";
    const c = el("div", { className: "pt-app" + (a.masque ? " masque" : ""), draggable: true });
    c.append(el("img", { src: icone, alt: "" }), el("span", { className: "t" }, el("b", { textContent: a.nom }), el("small", { textContent: (a.masque ? "Masquée · " : "") + (a.dyn ? "" : "") + (a.desc || "") })),
      el("span", { className: "btns" }, ...(a.dyn ? [] : [btn(a.masque ? "👁‍🗨" : "👁", a.masque ? "Afficher pour tout le monde" : "Masquer aux autres", () => { a.masque = !a.masque; dessiner(); })]),
        btn("←", "Reculer", () => deplacerApp(a, -1)), btn("→", "Avancer", () => deplacerApp(a, 1)), btn("✎", "Renommer / décrire", () => modifier(a))));
    c.ondragstart = e => { drag = { type: "app", id: a.id }; c.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", a.id); e.stopPropagation(); };
    c.ondragend = () => { c.classList.remove("dragging"); effacer(); drag = null; };
    c.ondragover = e => { if (!drag || drag.type !== "app" || drag.id === a.id) return; e.preventDefault(); e.stopPropagation(); const r = c.getBoundingClientRect(); effacer(); c.classList.add(e.clientX < r.left + r.width / 2 ? "drop-before" : "drop-after"); };
    c.ondrop = e => { if (!drag || drag.type !== "app") return; e.preventDefault(); e.stopPropagation(); const r = c.getBoundingClientRect(); deposerApp(drag.id, a.section, a.id, e.clientX < r.left + r.width / 2); };
    return c;
  }
  const effacer = () => document.querySelectorAll(".drop-before,.drop-after,.drop-end").forEach(n => n.classList.remove("drop-before", "drop-after", "drop-end"));

  // ---------- déplacements ----------
  function deplacerSection(i, d) { const j = i + d; if (j < 0 || j >= m.sections.length) return; [m.sections[i], m.sections[j]] = [m.sections[j], m.sections[i]]; dessiner(); }
  function deposerSection(id, cibleId, avant_) {
    const de = m.sections.findIndex(s => s.id === id), [s] = m.sections.splice(de, 1);
    let vers = m.sections.findIndex(x => x.id === cibleId); if (!avant_) vers++; m.sections.splice(vers, 0, s); drag = null; dessiner();
  }
  function deplacerApp(a, d) { const memes = m.apps.filter(x => x.section === a.section), i = memes.indexOf(a), o = memes[i + d]; if (!o) return; const ia = m.apps.indexOf(a), io = m.apps.indexOf(o); m.apps[ia] = o; m.apps[io] = a; dessiner(); }
  function deposerApp(id, sectionId, cibleId, avant_) {
    const de = m.apps.findIndex(a => a.id === id); if (de < 0 || id === cibleId) return;
    const [a] = m.apps.splice(de, 1); a.section = sectionId;
    let vers;
    if (cibleId) { vers = m.apps.findIndex(x => x.id === cibleId); if (!avant_) vers++; }
    else { const dernier = m.apps.map(x => x.section).lastIndexOf(sectionId); vers = dernier < 0 ? m.apps.length : dernier + 1; }
    m.apps.splice(vers, 0, a); drag = null; dessiner();
  }
  function ajouterSection() {
    const t = prompt("Titre de la nouvelle section :"); if (!t || !t.trim()) return;
    let id = P.slug(t) || "section", n = 1; while (m.sections.some(s => s.id === id)) id = P.slug(t) + "-" + (++n);
    m.sections.push({ id, titre: t.trim().slice(0, 60), haut: false }); dessiner();
  }

  // ---------- nom et description d'un outil ----------
  function modifier(a) {
    const dlg = el("dialog", { className: "entree-dlg" }), f = el("form", { method: "dialog" });
    const nom = el("input", { id: "oe-nom", maxLength: 40, required: true, value: a.nom }), desc = el("input", { id: "oe-desc", maxLength: 140, value: a.desc || "" });
    const ok = el("button", { type: "submit", className: "primary", textContent: "Valider" }), non = el("button", { type: "button", className: "ghost", textContent: "Annuler" });
    f.append(el("h2", { textContent: "Modifier l’outil" }), el("label", { htmlFor: "oe-nom", textContent: "Nom affiché" }), nom, el("label", { htmlFor: "oe-desc", textContent: "Description" }), desc,
      a.entree ? el("p", { className: "hint", textContent: "Pour changer l’adresse ou le public de cet outil, quittez l’organisation puis utilisez ✎ sur sa tuile." }) : document.createTextNode(""),
      el("div", { className: "dlg-actions" }, non, ok));
    dlg.append(f); document.body.append(dlg); dlg.showModal();
    non.onclick = () => { dlg.close(); dlg.remove(); }; dlg.addEventListener("cancel", () => dlg.remove());
    f.onsubmit = ev => { ev.preventDefault(); a.nom = nom.value.trim() || a.nom; a.desc = desc.value.trim(); dlg.close(); dlg.remove(); dessiner(); };
  }

  // ---------- enregistrement ----------
  async function enregistrer() {
    const etat = $("oe-etat"), bt = $("oe-enreg"); bt.disabled = true; etat.textContent = "Enregistrement…"; etat.classList.remove("error");
    try {
      // 1. mise en page partagée : jamais un outil dynamique (il pourrait être réservé à certaines personnes)
      const partage = { sections: m.sections.map(s => ({ id: s.id, titre: s.titre, haut: !!s.haut })), apps: m.apps.filter(a => !a.dyn).map(({ nouveau, entree, _nom0, _desc0, ...a }) => a) };
      const o = await Hub.call("portailEcrire", { portail: partage });
      try { localStorage.setItem("scouthub.portail", JSON.stringify(o.portail)); } catch {}
      // 2. outils dynamiques : section, ordre (position dans la section), nom et description
      const items = [];
      m.sections.forEach(s => m.apps.filter(a => a.section === s.id).forEach((a, i) => { if (a.dyn) items.push({ cle: a.cle, nom: a.nom, description: a.desc, section: s.id, ordre: i }); }));
      for (const a of m.apps.filter(x => x.dyn && x.entree && (x.nom !== x._nom0 || x.desc !== x._desc0)))   // outil ajouté : son nom/sa description sont sur l'entrée
        await Hub.call("entreeEcrire", { section: "outils", id: a.entree.id, nom: a.nom, description: a.desc, url: a.url, audience: a.entree.audience });
      if (items.length) await Hub.call("outilsDisposer", { items });
      etat.textContent = "Enregistré."; avant = JSON.stringify(m);
      setTimeout(() => location.reload(), 600);
    } catch (e) { etat.textContent = e.message; etat.classList.add("error"); bt.disabled = false; }
  }
  addEventListener("beforeunload", e => { if (actif && m && modifie()) { e.preventDefault(); e.returnValue = ""; } });
  window.OutilsEdition = { installer, actif: () => actif };
})();
