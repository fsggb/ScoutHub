// Registre des inscriptions (Mineurs, Majeurs, Camp, Cotisations) : liste lisible, panneau latéral de filtres réglable
// (par année puis groupe puis unité, ou par groupe puis unité), fiche détaillée. Chaque personne ne reçoit du serveur
// QUE les lignes de sa portée (administrateur : tout ; chef de groupe : son groupe ; chef d'unité : son unité).
// Rien n'est conservé sur l'appareil, sauf la largeur du panneau. Tout est écrit avec textContent.
(async () => {
  "use strict";
  const { $ } = Hub, API = window.SCOUTHUB_DONNEES_API, PAGE = 100, LARGEUR = "scouthub.registre.largeur";
  const feuille = new URLSearchParams(location.search).get("f") || "";
  { const c = Hub.cachedUser(); if (c) { Hub.renderBar(c, "Inscriptions"); Hub.renderTabs("inscriptions", c); Hub.montrerMain(); } }
  const user = await Hub.requireUser(); if (!user) return;
  Hub.renderBar(user, "Inscriptions"); Hub.renderTabs("inscriptions", user);

  let comme = "", moi = null, meta = null, arbre = [], mode = "annee", sel = { an: "", gk: "", uk: "" }, anFiltre = "";
  let ouverts = new Set(), q = "", debut = 0, total = 0, minuteur = null, sequence = 0;
  const el = (tag, props, ...enfants) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...enfants); return e; };

  async function api(chemin, corps) {
    let r; try { r = await fetch(API + chemin, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: Hub.token, comme: comme || undefined, feuille, ...corps }), cache: "no-store" }); } catch { throw new Error("Serveur injoignable."); }
    let o; try { o = await r.json(); } catch { throw new Error("Réponse invalide du serveur."); }
    if (!o.ok) { if (r.status === 401) Hub.toLogin(); throw new Error(o.error && o.error.message || "Erreur."); }
    return o;
  }
  const refus = t => { $("rg-corps").hidden = true; $("rg-refus").hidden = false; $("rg-refus").textContent = t; };

  // ---------- qui je suis, ce que je vois ----------
  async function demarrer() {
    $("rg-refus").hidden = true;
    try { moi = await api("/donnees/moi"); } catch (e) { return refus(e.message); }
    $("rg-admin").hidden = !moi.admin;
    $("rg-simule").hidden = !moi.simule;
    if (moi.simule) { $("rg-sim-email").textContent = moi.email; $("rg-sim-role").textContent = (Hub.ROLE_LABELS[moi.role] || moi.role) + (moi.groupe ? " · " + moi.groupe : "") + (moi.unite && moi.acces === "unite" ? " · " + moi.unite : ""); outilsSimules(); }
    const f = moi.feuilles.find(x => x.nom === feuille);
    $("rg-h1").textContent = f ? f.titre : "Inscriptions"; document.title = (f ? f.titre : "Inscriptions") + " · ScoutHub";
    $("rg-portee").textContent = moi.acces === "tout" ? "Vous voyez tous les groupes." : moi.acces === "groupe" ? "Vous voyez uniquement votre groupe : " + moi.groupe + "." : moi.acces === "unite" ? "Vous voyez uniquement votre unité : " + moi.unite + "." : "";
    if (!f) return refus(moi.acces === "aucun" ? "Aucune donnée d’inscription ne vous concerne." : "Ces données ne vous concernent pas.");
    try {
      const a = await api("/donnees/arbre"); meta = a; arbre = a.arbre;
    } catch (e) { return refus(e.message); }
    $("rg-corps").hidden = false;
    const avecAnnee = meta.annee && arbre.some(r => r.an);
    $("m-annee").hidden = !avecAnnee; if (!avecAnnee) mode = "groupe";
    sel = { an: "", gk: "", uk: "" }; anFiltre = ""; q = ""; $("rg-q").value = ""; debut = 0; ouverts = new Set();
    const ans = annees(); if (ans.length && mode === "annee") ouverts.add("a:" + ans[0]);
    reglerMode(mode); lister();
  }
  async function outilsSimules() {
    $("rg-sim-outils").textContent = "";
    try { const o = await Hub.call("outils", { comme }); $("rg-sim-outils").textContent = "Outils qu’elle voit : " + (o.outils.map(x => x.nom).join(", ") || "aucun") + "."; } catch { /* facultatif */ }
  }

  // ---------- panneau latéral ----------
  const annees = () => [...new Set(arbre.map(r => r.an).filter(Boolean))].sort().reverse();   // la plus récente en haut
  const somme = rs => rs.reduce((t, r) => t + r.n, 0);
  const grouper = (rs, cle) => { const m = new Map(); rs.forEach(r => { const k = cle(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }); return m; };
  const nomG = rs => rs[0].g || "(sans groupe)", nomU = rs => rs[0].u || "(sans unité)";
  const tri = (a, b) => a.localeCompare(b, "fr");

  function noeud({ cle, niveau, libelle, n, choisi, actuelle, aEnfants, onChoisir }) {
    const ouvert = ouverts.has(cle);
    const chev = el("button", { type: "button", className: "rg-chev" + (aEnfants ? "" : " vide"), textContent: ouvert ? "▼" : "▶" });
    chev.setAttribute("aria-label", (ouvert ? "Replier " : "Déplier ") + libelle); chev.tabIndex = aEnfants ? 0 : -1;
    chev.onclick = () => { ouvert ? ouverts.delete(cle) : ouverts.add(cle); dessiner(); };
    const lib = el("button", { type: "button", className: "rg-lib", textContent: libelle }); lib.onclick = () => { if (aEnfants && !ouvert) ouverts.add(cle); onChoisir(); };
    const ligne = el("div", { className: "rg-n" + (choisi ? " sel" : "") + (actuelle ? " actuelle" : "") }, chev, lib);
    if (actuelle) ligne.insertBefore(el("span", { className: "rg-tag", textContent: "en cours" }), ligne.lastChild.nextSibling);
    ligne.append(el("span", { className: "rg-cnt", textContent: n.toLocaleString("fr-FR") }));
    ligne.dataset.niv = niveau; ligne.setAttribute("role", "treeitem"); if (aEnfants) ligne.setAttribute("aria-expanded", String(ouvert)); if (choisi) ligne.setAttribute("aria-selected", "true");
    return ligne;
  }
  function dessiner() {
    const racine = $("rg-arbre"); racine.textContent = "";
    const rs = mode === "groupe" && anFiltre ? arbre.filter(r => r.an === anFiltre) : arbre;
    const aucun = !sel.an && !sel.gk && !sel.uk;
    racine.append(noeud({ cle: "tous", niveau: 0, libelle: "Tous", n: somme(rs), choisi: aucun, aEnfants: false, onChoisir: () => choisir({ an: "", gk: "", uk: "" }) }));
    const unites = (liste, base, gk) => [...grouper(liste, r => r.uk).values()].sort((a, b) => tri(nomU(a), nomU(b))).forEach(us => {
      racine.append(noeud({ cle: base + "|u:" + us[0].uk, niveau: 2, libelle: nomU(us), n: somme(us), choisi: sel.uk === us[0].uk && sel.gk === gk && (mode === "groupe" || sel.an === base.slice(2, base.indexOf("|"))), aEnfants: false, onChoisir: () => choisir({ an: mode === "annee" ? base.slice(2, base.indexOf("|")) : "", gk, uk: us[0].uk }) }));
    });
    if (mode === "annee") {
      const ans = annees(), courante = ans[0];
      for (const an of ans) {
        const ra = rs.filter(r => r.an === an), ka = "a:" + an + "|";
        racine.append(noeud({ cle: "a:" + an, niveau: 0, libelle: an, n: somme(ra), choisi: sel.an === an && !sel.gk, actuelle: an === courante, aEnfants: true, onChoisir: () => choisir({ an, gk: "", uk: "" }) }));
        if (!ouverts.has("a:" + an)) continue;
        [...grouper(ra, r => r.gk).values()].sort((a, b) => tri(nomG(a), nomG(b))).forEach(gs => {
          const kg = "a:" + an + "|g:" + gs[0].gk;
          racine.append(noeud({ cle: kg, niveau: 1, libelle: nomG(gs), n: somme(gs), choisi: sel.an === an && sel.gk === gs[0].gk && !sel.uk, aEnfants: true, onChoisir: () => choisir({ an, gk: gs[0].gk, uk: "" }) }));
          if (ouverts.has(kg)) unites(gs, "a:" + an + "|g:" + gs[0].gk, gs[0].gk);
        });
      }
    } else {
      [...grouper(rs, r => r.gk).values()].sort((a, b) => tri(nomG(a), nomG(b))).forEach(gs => {
        const kg = "g:" + gs[0].gk;
        racine.append(noeud({ cle: kg, niveau: 1, libelle: nomG(gs), n: somme(gs), choisi: sel.gk === gs[0].gk && !sel.uk, aEnfants: true, onChoisir: () => choisir({ an: "", gk: gs[0].gk, uk: "" }) }));
        if (ouverts.has(kg)) unites(gs, kg, gs[0].gk);
      });
    }
  }
  function choisir(s) { sel = s; debut = 0; dessiner(); lister(); }
  function reglerMode(m) {
    mode = m; for (const [id, v] of [["m-annee", "annee"], ["m-groupe", "groupe"]]) $(id).setAttribute("aria-selected", String(v === m));
    const ans = annees(); const f = $("rg-an-filtre"); f.hidden = !(m === "groupe" && ans.length);
    const s = $("rg-an"); s.textContent = ""; s.append(el("option", { value: "", textContent: "Toutes les années" })); ans.forEach(a => s.append(el("option", { value: a, textContent: a + (a === ans[0] ? " (en cours)" : "") }))); s.value = anFiltre;
    dessiner();
  }
  $("m-annee").onclick = () => { sel = { an: "", gk: "", uk: "" }; anFiltre = ""; debut = 0; reglerMode("annee"); lister(); };
  $("m-groupe").onclick = () => { sel = { an: "", gk: "", uk: "" }; debut = 0; reglerMode("groupe"); lister(); };
  $("rg-an").onchange = () => { anFiltre = $("rg-an").value; debut = 0; dessiner(); lister(); };

  // ---------- poignée : largeur du panneau réglable (souris, doigt, clavier) ----------
  const corps = $("rg-corps"), poignee = $("rg-poignee");
  const largeur = px => { const max = Math.max(260, corps.clientWidth * 0.6), v = Math.min(max, Math.max(200, px)); corps.style.setProperty("--lateral", v + "px"); try { localStorage.setItem(LARGEUR, String(Math.round(v))); } catch {} };
  try { const v = +localStorage.getItem(LARGEUR); if (v >= 200 && v <= 1200) corps.style.setProperty("--lateral", v + "px"); } catch {}
  poignee.onpointerdown = e => { poignee.setPointerCapture(e.pointerId); poignee.classList.add("actif"); };
  poignee.onpointermove = e => { if (poignee.classList.contains("actif")) largeur(e.clientX - corps.getBoundingClientRect().left); };
  poignee.onpointerup = poignee.onpointercancel = () => poignee.classList.remove("actif");
  poignee.onkeydown = e => { const l = $("rg-lateral").getBoundingClientRect().width; if (e.key === "ArrowLeft") { largeur(l - 24); e.preventDefault(); } if (e.key === "ArrowRight") { largeur(l + 24); e.preventDefault(); } };

  // ---------- liste ----------
  // Colonnes de la liste : celles de la « vue » de la feuille (même si l'ordre complet n'est pas encore connu du serveur).
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
    const v = colonnes().slice(0, 2).map(c => l[c]).filter(Boolean).join(" ");
    $("rg-fiche-titre").textContent = v || "Fiche";
    const dl = $("rg-fiche-champs"); dl.textContent = "";
    cols.forEach(c => { const val = String(l[c]); dl.append(el("dt", { textContent: c }), el("dd", {}, /^https:\/\/[^\s"'<>]{4,500}$/.test(val) ? el("a", { href: val, target: "_blank", rel: "noopener noreferrer", textContent: "Ouvrir le lien" }) : document.createTextNode(val))); });
    $("rg-fiche").showModal();
  }
  $("rg-fiche-fermer").onclick = () => $("rg-fiche").close();
  $("rg-fiche").addEventListener("click", e => { if (e.target === $("rg-fiche")) $("rg-fiche").close(); });
  addEventListener("pagehide", () => { try { $("rg-table").tBodies[0].textContent = ""; $("rg-fiche-champs").textContent = ""; } catch {} });

  // ---------- administrateur : voir comme une adresse ----------
  async function preparerAdmin() {
    try {
      const o = await api("/donnees/habilites"); const s = $("rg-comme");
      o.habilites.forEach(h => s.append(el("option", { value: h.email, textContent: h.email + " — " + (h.role === "chef_groupe" ? "chef de groupe" : "chef d’unité") + " · " + (h.groupe || "?") + (h.unite && h.role === "chef_unite" ? " · " + h.unite : "") })));
    } catch { /* pas administrateur */ }
  }
  $("rg-comme").onchange = () => { comme = $("rg-comme").value; demarrer(); };
  $("rg-sim-quitter").onclick = () => { comme = ""; $("rg-comme").value = ""; demarrer(); };

  await demarrer();
  if (moi && moi.admin) preparerAdmin();
})();
