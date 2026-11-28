// Page Outils, pour l'administrateur : tout se déplace DIRECTEMENT, sans bouton « Organiser ».
//  - un outil se glisse avant/après un autre, ou dans une autre section ;
//  - une section se glisse par son titre : sur le CÔTÉ d'une autre elle se place à côté (même rangée), sur le haut/bas elle prend sa propre rangée ;
//  - double-clic sur un titre : renommer ; ✎ sur un outil : nom et description ; tuile « + » : nouvel outil.
// Chaque changement est enregistré tout seul, en base (section, rangée, ordre, noms) : rapide, et la mise en page partagée de
// l'ancien serveur n'est pas touchée, donc aucun outil restreint n'y passe jamais.
(() => {
  "use strict";
  const P = window.Portail, el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
  let drag = null, rendre = null, minuteur = null, supprimees = new Set();
  const m = () => P.current();

  // ---------- enregistrement automatique ----------
  function etat(txt, erreur) {
    let t = document.getElementById("oe-toast"); if (!t) { t = el("div", { id: "oe-toast", role: "status" }); document.body.append(t); }
    t.textContent = txt; t.className = erreur ? "erreur" : ""; t.hidden = !txt; clearTimeout(t._h); if (txt && !erreur) t._h = setTimeout(() => { t.hidden = true; }, 2200);
  }
  const planifier = () => { clearTimeout(minuteur); etat("Enregistrement…"); minuteur = setTimeout(enregistrer, 700); };
  async function enregistrer() {
    const mm = m(), items = [], rangs = new Map();
    mm.sections.forEach((s, i) => { if (!rangs.has(s.ligne)) rangs.set(s.ligne, "r" + (rangs.size + 1)); items.push({ cle: "s:" + s.id, nom: s.titre, section: rangs.get(s.ligne), ordre: i }); });
    supprimees.forEach(id => items.push({ cle: "s:" + id, nom: "", section: "supprimee", ordre: 999 }));
    mm.sections.forEach(s => mm.apps.filter(a => a.section === s.id).forEach((a, i) => items.push({ cle: a.cle || "a:" + String(a.id).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 100), nom: a.nom, description: a.desc, section: s.id, ordre: i })));
    try { const rep = await Hub.call("outilsDisposer", { items }); if (rep.avertissement) etat(rep.avertissement, true); else etat("Enregistré ✓"); try { localStorage.removeItem("scouthub.portail.vue"); } catch {} }
    catch (e) { etat("Non enregistré : " + e.message, true); }
  }

  // ---------- déplacements ----------
  function deposerApp(id, sectionId, cibleId, avant) {
    const mm = m(), de = mm.apps.findIndex(a => a.id === id); if (de < 0 || id === cibleId) return;
    const [a] = mm.apps.splice(de, 1); a.section = sectionId; a.ordre = undefined;
    let vers;
    if (cibleId) { vers = mm.apps.findIndex(x => x.id === cibleId); if (!avant) vers++; }
    else { const dernier = mm.apps.map(x => x.section).lastIndexOf(sectionId); vers = dernier < 0 ? mm.apps.length : dernier + 1; }
    mm.apps.splice(vers, 0, a); rendre(); planifier();
  }
  function deposerSection(id, cibleId, zone) {
    const mm = m(), de = mm.sections.findIndex(s => s.id === id); if (de < 0 || id === cibleId) return;
    const [S] = mm.sections.splice(de, 1), T = mm.sections.find(s => s.id === cibleId), iT = mm.sections.indexOf(T);
    if (zone === "gauche" || zone === "droite") { S.ligne = T.ligne; mm.sections.splice(zone === "gauche" ? iT : iT + 1, 0, S); }   // à côté : même rangée
    else {
      S.ligne = "n" + Date.now().toString(36);   // sa propre rangée, au-dessus ou au-dessous de celle de la cible
      const idx = mm.sections.map((s, i) => [s, i]).filter(([s]) => s.ligne === T.ligne).map(([, i]) => i);
      mm.sections.splice(zone === "haut" ? Math.min(...idx) : Math.max(...idx) + 1, 0, S);
    }
    rendre(); planifier();
  }
  const effacer = () => document.querySelectorAll(".drop-av,.drop-ap,.drop-fin,.drop-gauche,.drop-droite,.drop-haut,.drop-bas").forEach(n => n.classList.remove("drop-av", "drop-ap", "drop-fin", "drop-gauche", "drop-droite", "drop-haut", "drop-bas"));
  const zoneSection = (e, sec) => { const r = sec.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; return x < 0.25 ? "gauche" : x > 0.75 ? "droite" : y < 0.5 ? "haut" : "bas"; };

  function installer(zone, rerendre) {
    rendre = rerendre; if (zone._ok) return; zone._ok = true;
    zone.addEventListener("dragstart", e => {
      const t = e.target.closest && e.target.closest("[data-app]"), h = e.target.closest && e.target.closest("[data-titre]");
      if (t) drag = { type: "app", id: t.dataset.app }; else if (h) drag = { type: "sec", id: h.dataset.titre }; else return;
      e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", drag.id); (t || h).classList.add("dragging");
    });
    zone.addEventListener("dragend", () => { document.querySelectorAll(".dragging").forEach(n => n.classList.remove("dragging")); effacer(); drag = null; });
    zone.addEventListener("dragover", e => {
      if (!drag) return; effacer();
      if (drag.type === "app") {
        const t = e.target.closest("[data-app]"), g = e.target.closest("[data-grille]");
        if (t && t.dataset.app !== drag.id) { const r = t.getBoundingClientRect(); t.classList.add(e.clientX < r.left + r.width / 2 ? "drop-av" : "drop-ap"); e.preventDefault(); }
        else if (g && !t) { g.classList.add("drop-fin"); e.preventDefault(); }
      } else {
        const sec = e.target.closest("[data-sec]"); if (sec && sec.dataset.sec !== drag.id) { sec.classList.add("drop-" + zoneSection(e, sec)); e.preventDefault(); }
      }
    });
    zone.addEventListener("drop", e => {
      if (!drag) return; e.preventDefault(); const d = drag; drag = null; effacer();
      if (d.type === "app") {
        const t = e.target.closest("[data-app]"), g = e.target.closest("[data-grille]");
        if (t) { const r = t.getBoundingClientRect(); const sec = m().apps.find(a => a.id === t.dataset.app); if (sec) deposerApp(d.id, sec.section, t.dataset.app, e.clientX < r.left + r.width / 2); }
        else if (g) deposerApp(d.id, g.dataset.grille, null, false);
      } else { const sec = e.target.closest("[data-sec]"); if (sec) deposerSection(d.id, sec.dataset.sec, zoneSection(e, sec)); }
    });
  }

  // ---------- titres, nouvelle section ----------
  function renommer(s, h2, rerendre) {
    const champ = el("input", { type: "text", value: s.titre, maxLength: 60, className: "oe-titre-champ" }); champ.setAttribute("aria-label", "Titre de la section");
    h2.replaceWith(champ); champ.focus(); champ.select(); let fini = false;
    const valider = ok => { if (fini) return; fini = true; if (ok && champ.value.trim() && champ.value.trim() !== s.titre) { s.titre = champ.value.trim().slice(0, 60); planifier(); } rerendre(); };
    champ.onblur = () => valider(true); champ.onkeydown = e => { if (e.key === "Enter") valider(true); else if (e.key === "Escape") valider(false); };
  }
  function nouvelleSection(rerendre) {
    const t = prompt("Titre de la nouvelle section :"); if (!t || !t.trim()) return;
    const mm = m(); let id = P.slug(t) || "section", n = 1; while (mm.sections.some(s => s.id === id) || supprimees.has(id)) id = P.slug(t).slice(0, 50) + "-" + (++n);
    mm.sections.push({ id: id.slice(0, 60), titre: t.trim().slice(0, 60), haut: false, ligne: "n" + Date.now().toString(36) }); rerendre(); planifier();
  }

  // ---------- nom et description d'un outil ; nouvel outil ----------
  function modifierSimple(a, rerendre) {
    const dlg = el("dialog", { className: "entree-dlg" }), f = el("form", { method: "dialog" });
    const nom = el("input", { id: "oe-nom", maxLength: 40, required: true, value: a.nom }), desc = el("input", { id: "oe-desc", maxLength: 140, value: a.desc || "" });
    const ok = el("button", { type: "submit", className: "primary", textContent: "Valider" }), non = el("button", { type: "button", className: "ghost", textContent: "Annuler" });
    const plus = a.entree ? el("button", { type: "button", className: "ghost", textContent: "Adresse et public…", onclick: () => { dlg.close(); dlg.remove(); Entrees.dialogue("outils", a.entree, () => Portail.refresh(rerendre)); } }) : null;
    f.append(el("h2", { textContent: "Modifier l’outil" }), el("label", { htmlFor: "oe-nom", textContent: "Nom affiché" }), nom, el("label", { htmlFor: "oe-desc", textContent: "Description" }), desc,
      el("div", { className: "dlg-actions" }, ...(plus ? [plus] : []), non, ok));
    dlg.append(f); document.body.append(dlg); dlg.showModal();
    non.onclick = () => { dlg.close(); dlg.remove(); }; dlg.addEventListener("cancel", () => dlg.remove());
    f.onsubmit = async ev => {
      ev.preventDefault(); a.nom = nom.value.trim() || a.nom; a.desc = desc.value.trim(); dlg.close(); dlg.remove(); rerendre();
      if (a.entree && a.entree.id) { try { await Hub.call("entreeEcrire", { section: "outils", id: a.entree.id, nom: a.nom, description: a.desc, url: a.url, audience: a.entree.audience }); } catch (e) { etat("Non enregistré : " + e.message, true); return; } }
      planifier();
    };
  }
  // Fenêtre complète : nom, description, adresse, image, public, masquage. Pour tout outil de la feuille « Outils » ou ajouté à la main.
  function modifier(a, rerendre) {
    const cle = a.cle && /^o:/.test(a.cle) ? a.cle : (a.entree && a.entree.id ? "e:" + a.entree.id : "");
    if (!cle) return modifierSimple(a, rerendre);
    const imageBrute = /^\/img\//.test(a.icone || "") ? decodeURIComponent(String(a.icone).slice(5)) : /^https:\/\//.test(a.icone || "") ? a.icone : "";
    const dlg = el("dialog", { className: "entree-dlg" }), f = el("form", { method: "dialog" });
    const champ = (id, lib, props) => { const i = Object.assign(el("input", { id }), props); return [el("label", { htmlFor: id, textContent: lib }), i]; };
    const nom = champ("oe-nom", "Nom affiché", { maxLength: 60, required: true, value: a.nom }), desc = champ("oe-desc", "Description", { maxLength: 200, value: a.desc || "" });
    const adr = champ("oe-url", "Adresse de l’application (https://…)", { type: "url", maxLength: 1500, required: true, value: a.url || "", placeholder: "https://" });
    const img = champ("oe-img", "Image (chemin du Drive « Images/… » ou adresse https://…)", { maxLength: 300, value: imageBrute, placeholder: "Images/Menu_images/…" });
    const apercu = el("img", { alt: "", className: "oe-apercu" }); const maj = () => { const v = img[1].value.trim(); apercu.src = /^images\//i.test(v) ? "/img/" + v.split("/").map(encodeURIComponent).join("/") : /^https:\/\//i.test(v) ? v : "assets/fsggb.png"; apercu.hidden = false; }; img[1].oninput = maj; maj();
    const pub = el("select", { id: "oe-pub" }); [["", "Ne pas changer"], ["all", "Tous les membres de la fédération"], ["chefs", "Chefs d’unité et au-dessus"], ["chefs-de-groupe", "Chefs de groupe et au-dessus"], ["equipe-nationale", "Équipe nationale et au-dessus"], ["admin", "Administrateur seulement"]].forEach(([v, t]) => pub.append(el("option", { value: v, textContent: t })));
    const masque = el("input", { type: "checkbox", id: "oe-masque", checked: !!a.masque });
    const statut = el("p", { className: "status", role: "status" });
    const ok = el("button", { type: "submit", className: "primary", textContent: "Enregistrer" }), non = el("button", { type: "button", className: "ghost", textContent: "Annuler" });
    f.append(el("h2", { textContent: "Modifier l’outil" }), ...nom, ...desc, ...adr, ...img, apercu,
      el("label", { htmlFor: "oe-pub", textContent: "Qui le voit ?" }), pub,
      el("label", { className: "oe-case" }, masque, " Masqué pour tout le monde (sauf l’administrateur)"), statut,
      el("div", { className: "dlg-actions" }, non, ok));
    dlg.append(f); document.body.append(dlg); dlg.showModal();
    const fermer = () => { dlg.close(); dlg.remove(); }; non.onclick = fermer; dlg.addEventListener("cancel", () => dlg.remove());
    f.onsubmit = async ev => {
      ev.preventDefault(); ok.disabled = true; statut.textContent = "Enregistrement…";
      try { const rep = await Hub.call("outilModifier", { cle, nom: nom[1].value, description: desc[1].value, url: adr[1].value, image: img[1].value, publique: pub.value, masque: masque.checked }); fermer(); await Portail.refresh(rerendre); rerendre(); if (rep.avertissement) alert(rep.avertissement); else etat("Enregistré ✓"); }
      catch (e) { statut.textContent = e.message; statut.classList.add("error"); ok.disabled = false; }
    };
  }
  function ajouter(sectionId, rerendre) { Entrees.dialogue("outils", null, () => Portail.refresh(rerendre), sectionId); }


  // ---------- renommer un outil sur place (même geste que pour un titre de section) ----------
  function renommerApp(a, strong, rerendre) {
    const champ = el("input", { type: "text", value: a.nom, maxLength: 40, className: "oe-titre-champ" }); champ.setAttribute("aria-label", "Nom de l’outil");
    strong.replaceWith(champ); champ.focus(); champ.select(); let fini = false;
    const valider = async ok => {
      if (fini) return; fini = true; const v = champ.value.trim().slice(0, 40);
      if (ok && v && v !== a.nom) {
        a.nom = v;
        if (a.entree && a.entree.id) { try { await Hub.call("entreeEcrire", { section: "outils", id: a.entree.id, nom: a.nom, description: a.desc, url: a.url, audience: a.entree.audience }); } catch (e) { etat("Non enregistré : " + e.message, true); } }
        planifier();
      }
      rerendre();
    };
    champ.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); }; champ.onmousedown = ev => ev.stopPropagation();
    champ.onblur = () => valider(true); champ.onkeydown = e => { e.stopPropagation(); if (e.key === "Enter") valider(true); else if (e.key === "Escape") valider(false); };
  }
  // supprimer une section : seulement si elle est vide (sinon on déplace d'abord ses outils)
  function supprimerSection(s, rerendre) {
    const mm = m(); if (mm.apps.some(a => a.section === s.id)) { etat("Déplacez d’abord les outils de cette section.", true); return; }
    if (!confirm("Supprimer la section « " + s.titre + " » ?")) return;
    mm.sections = mm.sections.filter(x => x.id !== s.id); supprimees.add(s.id); rerendre(); planifier();
  }

  window.OutilsEdition = { renommerApp, supprimerSection, installer, modifier, ajouter, renommer, nouvelleSection, actif: () => false };
})();
