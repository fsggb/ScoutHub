// Registre des inscriptions (Mineurs, Majeurs, Camp, Cotisations) : liste lisible, panneau latéral de filtres réglable
// (par année puis groupe puis unité, ou par groupe puis unité), fil d'Ariane façon explorateur, fiche détaillée.
// Chaque personne ne reçoit du serveur QUE les lignes de sa portée (administrateur : tout ; chef de groupe : son groupe ;
// chef d'unité : son unité). Pendant une simulation (administrateur), le serveur applique la portée de l'adresse simulée.
// Rien n'est conservé sur l'appareil, sauf la largeur du panneau. Tout est écrit avec textContent.
(async () => {
  "use strict";
  const { $ } = Hub, API = window.SCOUTHUB_DONNEES_API, PAGE = 100, LARGEUR = "scouthub.registre.largeur";
  const feuille = new URLSearchParams(location.search).get("f") || "";
  { const c = Hub.cachedUser(); if (c) { Hub.renderBar(c, "Inscriptions"); Hub.renderTabs("inscriptions", c); Hub.montrerMain(); } }
  const user = await Hub.requireUser(); if (!user) return;
  Hub.renderBar(user, "Inscriptions"); Hub.renderTabs("inscriptions", user);

  let moi = null, meta = null, arbre = [], mode = "annee", sel = { an: "", gk: "", uk: "" }, anFiltre = "", titre = "Inscriptions";
  let ouverts = new Set(), q = "", debut = 0, total = 0, minuteur = null, sequence = 0, restaure = false;
  const el = (tag, props, ...enfants) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...enfants); return e; };
  const norm = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  async function api(chemin, corps) {
    let r; try { r = await fetch(API + chemin, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: Hub.token, comme: Hub.simule() || undefined, feuille, ...corps }), cache: "no-store" }); } catch { throw new Error("Serveur injoignable."); }
    let o; try { o = await r.json(); } catch { throw new Error("Réponse invalide du serveur."); }
    if (!o.ok) { if (r.status === 401) Hub.toLogin(); throw new Error(o.error && o.error.message || "Erreur."); }
    return o;
  }
  const refus = t => { $("rg-corps").hidden = true; $("rg-refus").hidden = false; $("rg-refus").textContent = t; };

  // ---------- noms (pour le fil d'Ariane) ----------
  const nomGroupe = gk => { const r = arbre.find(x => x.gk === gk); return r ? (r.g || "(sans groupe)") : gk; };
  const nomUnite = (gk, uk) => { const r = arbre.find(x => x.gk === gk && x.uk === uk); return r ? (r.u || "(sans unité)") : uk; };

  // ---------- fil d'Ariane + historique (précédent / suivant / monter / actualiser) ----------
  function fil() {
    const items = [{ label: "Accueil", href: "index.html" }, { label: "Inscriptions", href: "inscriptions.html" }];
    const tous = { an: "", gk: "", uk: "" }, vide = !sel.an && !sel.gk && !sel.uk;
    const ajouter = (label, s) => items.push({ label, onClick: () => choisir(s) });
    ajouter(titre, tous);
    if (sel.an) ajouter(sel.an, { an: sel.an, gk: "", uk: "" });
    if (sel.gk) ajouter(nomGroupe(sel.gk), { an: sel.an, gk: sel.gk, uk: "" });
    if (sel.uk) ajouter(nomUnite(sel.gk, sel.uk), { an: sel.an, gk: sel.gk, uk: sel.uk });
    if (mode === "groupe" && anFiltre) items.push({ label: "année " + anFiltre, onClick: () => { $("rg-an").value = ""; anFiltre = ""; debut = 0; dessiner(); lister(); } });
    // la position courante n'est pas un lien : on ne garde le clic que sur les niveaux précédents
    const dernier = items[items.length - 1]; delete dernier.onClick; delete dernier.href;
    Hub.renderFil(items, { rafraichir: () => recharger(), haut: vide ? { href: "inscriptions.html" } : undefined });
  }
  const etat = () => ({ rg: 1, sel: { ...sel }, mode, anFiltre });
  function pousser() { try { history.pushState(etat(), ""); } catch {} }
  addEventListener("popstate", e => {
    const s = e.state && e.state.rg ? e.state : { sel: { an: "", gk: "", uk: "" }, mode: mode, anFiltre: "" };
    restaure = true; sel = { ...s.sel }; anFiltre = s.anFiltre || ""; debut = 0;
    if (s.mode !== mode) reglerMode(s.mode); else { $("rg-an").value = anFiltre; dessiner(); }
    lister(); fil(); restaure = false;
  });

  // ---------- démarrage ----------
  async function demarrer() {
    $("rg-refus").hidden = true;
    try { moi = await api("/donnees/moi"); } catch (e) { return refus(e.message); }
    const f = moi.feuilles.find(x => x.nom === feuille);
    titre = f ? f.titre : "Inscriptions"; $("rg-h1").textContent = titre; document.title = titre + " · ScoutHub";
    $("rg-portee").textContent = moi.acces === "tout" ? "Tous les groupes" : moi.acces === "groupe" ? "Votre groupe : " + moi.groupe : moi.acces === "unite" ? "Votre unité : " + moi.unite : "";
    if (!f) { fil(); return refus(moi.acces === "aucun" ? "Aucune donnée d’inscription ne vous concerne." : "Ces données ne vous concernent pas."); }
    try { meta = await api("/donnees/arbre"); arbre = meta.arbre; } catch (e) { return refus(e.message); }
    $("rg-corps").hidden = false;
    const avecAnnee = meta.annee && arbre.some(r => r.an);
    $("m-annee").hidden = !avecAnnee; if (!avecAnnee) mode = "groupe";
    sel = { an: "", gk: "", uk: "" }; anFiltre = ""; q = ""; $("rg-q").value = ""; $("rg-filtre").value = ""; debut = 0; ouverts = new Set();
    ouvrirParDefaut(); reglerMode(mode); lister(); fil();
    try { history.replaceState(etat(), ""); } catch {}
  }
  // Moins de clics : l'année en cours est dépliée, et un niveau qui n'a qu'un seul enfant l'est aussi (chef de groupe, chef d'unité).
  function ouvrirParDefaut() {
    const ans = annees();
    if (mode === "annee" && ans.length) { ouverts.add("a:" + ans[0]); const gs = [...new Set(arbre.filter(r => r.an === ans[0]).map(r => r.gk))]; if (gs.length === 1) ouverts.add("a:" + ans[0] + "|g:" + gs[0]); }
    if (mode === "groupe") { const gs = [...new Set(arbre.map(r => r.gk))]; if (gs.length === 1) ouverts.add("g:" + gs[0]); }
  }
  async function recharger() {   // ⟳ : on garde la sélection
    try { moi = await api("/donnees/moi"); meta = await api("/donnees/arbre"); arbre = meta.arbre; } catch (e) { return refus(e.message); }
    dessiner(); lister(); fil();
  }

  // ---------- panneau latéral ----------
  const annees = () => [...new Set(arbre.map(r => r.an).filter(Boolean))].sort().reverse();   // la plus récente en haut
  const somme = rs => rs.reduce((t, r) => t + r.n, 0);
  const grouper = (rs, cle) => { const m = new Map(); rs.forEach(r => { const k = cle(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }); return m; };
  const nomG = rs => rs[0].g || "(sans groupe)", nomU = rs => rs[0].u || "(sans unité)";
  const tri = (a, b) => a.localeCompare(b, "fr");

  function noeud({ cle, niveau, libelle, n, choisi, actuelle, aEnfants, onChoisir, force }) {
    const ouvert = force || ouverts.has(cle);
    const chev = el("button", { type: "button", className: "rg-chev" + (aEnfants ? "" : " vide"), textContent: ouvert ? "▼" : "▶", tabIndex: -1 });
    chev.setAttribute("aria-label", (ouvert ? "Replier " : "Déplier ") + libelle);
    chev.onclick = () => { ouvert ? ouverts.delete(cle) : ouverts.add(cle); dessiner(); };
    // Un clic sélectionne ET déplie : plus besoin de viser la petite flèche.
    const lib = el("button", { type: "button", className: "rg-lib", textContent: libelle }); lib.dataset.cle = cle;
    lib.onclick = () => { if (aEnfants) ouverts.add(cle); onChoisir(); };
    const ligne = el("div", { className: "rg-n" + (choisi ? " sel" : "") + (actuelle ? " actuelle" : "") }, chev, lib);
    if (actuelle) ligne.append(el("span", { className: "rg-tag", textContent: "en cours" }));
    ligne.append(el("span", { className: "rg-cnt", textContent: n.toLocaleString("fr-FR") }));
    ligne.dataset.niv = niveau; ligne.setAttribute("role", "treeitem"); if (aEnfants) ligne.setAttribute("aria-expanded", String(ouvert)); if (choisi) ligne.setAttribute("aria-selected", "true");
    return ligne;
  }
  function dessiner() {
    const racine = $("rg-arbre"); racine.textContent = "";
    const f = norm($("rg-filtre").value.trim()), force = !!f;   // un filtre de texte déplie tout ce qui correspond
    let rs = mode === "groupe" && anFiltre ? arbre.filter(r => r.an === anFiltre) : arbre;
    if (f) rs = rs.filter(r => norm((r.g || "") + " " + (r.u || "")).includes(f));
    const aucun = !sel.an && !sel.gk && !sel.uk;
    racine.append(noeud({ cle: "tous", niveau: 0, libelle: "Tous", n: somme(rs), choisi: aucun, aEnfants: false, onChoisir: () => choisir({ an: "", gk: "", uk: "" }) }));
    const unites = (liste, an, gk) => [...grouper(liste, r => r.uk).values()].sort((a, b) => tri(nomU(a), nomU(b))).forEach(us =>
      racine.append(noeud({ cle: "u:" + an + "|" + gk + "|" + us[0].uk, niveau: 2, libelle: nomU(us), n: somme(us), choisi: sel.uk === us[0].uk && sel.gk === gk && (mode === "groupe" || sel.an === an), aEnfants: false, onChoisir: () => choisir({ an: mode === "annee" ? an : "", gk, uk: us[0].uk }) })));
    if (mode === "annee") {
      const courante = annees()[0];
      for (const an of [...new Set(rs.map(r => r.an).filter(Boolean))].sort().reverse()) {
        const ra = rs.filter(r => r.an === an);
        racine.append(noeud({ cle: "a:" + an, niveau: 0, libelle: an, n: somme(ra), choisi: sel.an === an && !sel.gk, actuelle: an === courante, aEnfants: true, force, onChoisir: () => choisir({ an, gk: "", uk: "" }) }));
        if (!force && !ouverts.has("a:" + an)) continue;
        [...grouper(ra, r => r.gk).values()].sort((a, b) => tri(nomG(a), nomG(b))).forEach(gs => {
          const kg = "a:" + an + "|g:" + gs[0].gk;
          racine.append(noeud({ cle: kg, niveau: 1, libelle: nomG(gs), n: somme(gs), choisi: sel.an === an && sel.gk === gs[0].gk && !sel.uk, aEnfants: true, force, onChoisir: () => choisir({ an, gk: gs[0].gk, uk: "" }) }));
          if (force || ouverts.has(kg)) unites(gs, an, gs[0].gk);
        });
      }
    } else {
      [...grouper(rs, r => r.gk).values()].sort((a, b) => tri(nomG(a), nomG(b))).forEach(gs => {
        const kg = "g:" + gs[0].gk;
        racine.append(noeud({ cle: kg, niveau: 1, libelle: nomG(gs), n: somme(gs), choisi: sel.gk === gs[0].gk && !sel.uk, aEnfants: true, force, onChoisir: () => choisir({ an: "", gk: gs[0].gk, uk: "" }) }));
        if (force || ouverts.has(kg)) unites(gs, "", gs[0].gk);
      });
    }
    if (f && racine.children.length <= 1) racine.append(el("p", { className: "rg-vide", textContent: "Aucun groupe ni unité ne correspond." }));
  }
  function choisir(s) { sel = s; debut = 0; dessiner(); lister(); fil(); if (!restaure) pousser(); }
  function reglerMode(m) {
    mode = m; for (const [id, v] of [["m-annee", "annee"], ["m-groupe", "groupe"]]) $(id).setAttribute("aria-selected", String(v === m));
    const ans = annees(), f = $("rg-an-filtre"); f.hidden = !(m === "groupe" && ans.length);
    const s = $("rg-an"); s.textContent = ""; s.append(el("option", { value: "", textContent: "Toutes les années" })); ans.forEach(a => s.append(el("option", { value: a, textContent: a + (a === ans[0] ? " (en cours)" : "") }))); s.value = anFiltre;
    dessiner(); fil();
  }
  const changerMode = m => { sel = { an: "", gk: "", uk: "" }; anFiltre = ""; debut = 0; ouverts = new Set(); mode = m; ouvrirParDefaut(); reglerMode(m); lister(); if (!restaure) pousser(); };
  $("m-annee").onclick = () => changerMode("annee");
  $("m-groupe").onclick = () => changerMode("groupe");
  $("rg-an").onchange = () => { anFiltre = $("rg-an").value; debut = 0; dessiner(); lister(); fil(); pousser(); };
  $("rg-filtre").oninput = () => dessiner();
  $("rg-replier").onclick = () => { ouverts.clear(); $("rg-filtre").value = ""; dessiner(); };
  // Clavier : ↑ ↓ pour parcourir, → déplier, ← replier, Entrée pour choisir.
  $("rg-arbre").onkeydown = e => {
    const libs = [...$("rg-arbre").querySelectorAll(".rg-lib")], i = libs.indexOf(document.activeElement); if (i < 0) return;
    if (e.key === "ArrowDown") { (libs[i + 1] || libs[i]).focus(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { (libs[i - 1] || libs[i]).focus(); e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const ligne = document.activeElement.parentElement, cle = document.activeElement.dataset.cle, ouvert = ligne.getAttribute("aria-expanded");
      if (ouvert === null) return;
      if (e.key === "ArrowRight" && ouvert === "false") ouverts.add(cle); else if (e.key === "ArrowLeft" && ouvert === "true") ouverts.delete(cle); else return;
      dessiner(); const nv = [...$("rg-arbre").querySelectorAll(".rg-lib")].find(x => x.dataset.cle === cle); if (nv) nv.focus(); e.preventDefault();
    }
  };

  // ---------- poignée : largeur du panneau réglable (souris, doigt, clavier) ----------
  const corps = $("rg-corps"), poignee = $("rg-poignee");
  const largeur = px => { const max = Math.max(260, corps.clientWidth * 0.6), v = Math.min(max, Math.max(200, px)); corps.style.setProperty("--lateral", v + "px"); try { localStorage.setItem(LARGEUR, String(Math.round(v))); } catch {} };
  try { const v = +localStorage.getItem(LARGEUR); if (v >= 200 && v <= 1200) corps.style.setProperty("--lateral", v + "px"); } catch {}
  poignee.onpointerdown = e => { poignee.setPointerCapture(e.pointerId); poignee.classList.add("actif"); };
  poignee.onpointermove = e => { if (poignee.classList.contains("actif")) largeur(e.clientX - corps.getBoundingClientRect().left); };
  poignee.onpointerup = poignee.onpointercancel = () => poignee.classList.remove("actif");
  poignee.onkeydown = e => { const l = $("rg-lateral").getBoundingClientRect().width; if (e.key === "ArrowLeft") { largeur(l - 24); e.preventDefault(); } if (e.key === "ArrowRight") { largeur(l + 24); e.preventDefault(); } };

  // ---------- liste ----------
  const colonnes = () => { const c = meta.colonnes || [], v = (meta.vue || []).filter(x => !c.length || c.includes(x)); return v.length ? v : c.slice(0, 8); };
  async function lister() {
    const mon = ++sequence; $("rg-compte").textContent = "Chargement…";
    try {
      const o = await api("/donnees/lire", { an: sel.an || (mode === "groupe" ? anFiltre : ""), gk: sel.gk, uk: sel.uk, q, debut, limite: PAGE });
      if (mon !== sequence) return;   // une requête plus récente a pris le relais
      total = o.total; const cols = colonnes(), t = $("rg-table"), tr = el("tr");
      t.tHead.textContent = ""; t.tBodies[0].textContent = "";
      cols.forEach(c => tr.append(el("th", { textContent: c }))); t.tHead.append(tr);
      for (const l of o.lignes) {
        const r = el("tr"); r.tabIndex = 0;
        cols.forEach(c => { const v = l[c]; r.append(v === undefined || v === "" ? el("td", { className: "rg-vide", textContent: "—" }) : el("td", { textContent: String(v) })); });
        r.onclick = () => fiche(l); r.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fiche(l); } };
        t.tBodies[0].append(r);
      }
      $("rg-compte").textContent = total.toLocaleString("fr-FR") + (q ? " résultat" : " inscription") + (total > 1 ? "s" : "");
      $("rg-page").textContent = total ? (debut + 1) + "–" + Math.min(debut + PAGE, total) + " sur " + total.toLocaleString("fr-FR") : "Aucun résultat";
      $("rg-prec").disabled = debut <= 0; $("rg-suiv").disabled = debut + PAGE >= total;
      $("rg-note").hidden = !o.tronque; $("rg-note").textContent = o.tronque ? "La recherche porte sur les 1 500 premières lignes de la sélection : choisissez un groupe ou une unité pour la préciser." : "";
    } catch (e) { if (mon === sequence) { $("rg-compte").textContent = ""; refus(e.message); } }
  }
  $("rg-q").oninput = () => { clearTimeout(minuteur); minuteur = setTimeout(() => { q = $("rg-q").value.trim(); debut = 0; lister(); }, 350); };
  $("rg-prec").onclick = () => { debut = Math.max(0, debut - PAGE); lister(); };
  $("rg-suiv").onclick = () => { debut += PAGE; lister(); };

  // ---------- fiche complète ----------
  function fiche(l) {
    const ordre = (meta.colonnes && meta.colonnes.length) ? meta.colonnes : [...colonnes(), ...Object.keys(l).filter(k => k !== "rang" && !colonnes().includes(k))];
    const cols = ordre.filter(c => l[c] !== undefined && l[c] !== "");
    $("rg-fiche-titre").textContent = colonnes().slice(0, 2).map(c => l[c]).filter(Boolean).join(" ") || "Fiche";
    const dl = $("rg-fiche-champs"); dl.textContent = "";
    cols.forEach(c => { const val = String(l[c]); dl.append(el("dt", { textContent: c }), el("dd", {}, /^https:\/\/[^\s"'<>]{4,500}$/.test(val) ? el("a", { href: val, target: "_blank", rel: "noopener noreferrer", textContent: "Ouvrir le lien" }) : document.createTextNode(val))); });
    $("rg-fiche").showModal();
  }
  $("rg-fiche-fermer").onclick = () => $("rg-fiche").close();
  $("rg-fiche").addEventListener("click", e => { if (e.target === $("rg-fiche")) $("rg-fiche").close(); });
  addEventListener("pagehide", () => { try { $("rg-table").tBodies[0].textContent = ""; $("rg-fiche-champs").textContent = ""; } catch {} });

  await demarrer();
})();
