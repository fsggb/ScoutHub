// Registre des inscriptions (Mineurs, Majeurs, Camp, Cotisations) : liste lisible, panneau latéral de filtres réglable
// (par année puis groupe puis unité, ou par groupe puis unité), fil d'Ariane façon explorateur, fiche détaillée.
// Chaque personne ne reçoit du serveur QUE les lignes de sa portée (administrateur : tout ; chef de groupe : son groupe ;
// chef d'unité : son unité). Pendant une simulation (administrateur), le serveur applique la portée de l'adresse simulée.
// Rien n'est conservé sur l'appareil, sauf la largeur du panneau. Tout est écrit avec textContent.
(async () => {
  "use strict";
  const { $ } = Hub, API = window.SCOUTHUB_DONNEES_API, PAGE = 100, LARGEUR = "scouthub.registre.largeur";
  const feuille = new URLSearchParams(location.search).get("f") || "";
  if (!API) { const u = await Hub.requireUser(); if (!u) return; Hub.renderBar(u, "Inscriptions"); Hub.renderTabs("inscriptions", u); $("rg-refus").hidden = false; $("rg-refus").textContent = "Les inscriptions se consultent sur l’intranet de la fédération (intranet.fsggb.workers.dev)."; return; }
  // Les trois appels de données partent TOUT DE SUITE, pendant que la session est vérifiée (gain d'un aller-retour complet).
  let prechargement = Hub.token ? Promise.all([api("/donnees/moi"), api("/donnees/arbre").catch(e => ({ erreur: e })), api("/donnees/lire", { debut: 0, limite: PAGE }).catch(e => ({ erreur: e }))]) : null;
  if (prechargement) prechargement.catch(() => {});
  { const c = Hub.cachedUser(); if (c) { Hub.renderBar(c, "Inscriptions"); Hub.renderTabs("inscriptions", c); Hub.montrerMain(); } }
  const user = await Hub.requireUser(); if (!user) return;
  Hub.renderBar(user, "Inscriptions"); Hub.renderTabs("inscriptions", user);

  let moi = null, meta = null, arbre = [], sel = { an: "", gk: "", uk: "" }, titre = "Inscriptions";
  let premier = null, courantes = [], idx = -1, recherches = {}, q = "", debut = 0, total = 0, minuteur = null, sequence = 0, restaure = false;
  const el = (tag, props, ...enfants) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...enfants); return e; };
  const norm = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  async function api(chemin, corps) {
    let r; try { r = await fetch(API + chemin, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: Hub.token, comme: (typeof Hub.simule === "function" ? Hub.simule() : "") || undefined, feuille, ...corps }), cache: "no-store" }); } catch { throw new Error("Serveur injoignable."); }
    let o; try { o = await r.json(); } catch { throw new Error("Réponse invalide du serveur."); }
    if (!o.ok) { if (r.status === 401) Hub.toLogin(); throw new Error(o.error && o.error.message || "Erreur."); }
    return o;
  }
  const refus = t => { $("rg-corps").hidden = true; $("rg-refus").hidden = false; $("rg-refus").textContent = t; };

  // ---------- noms (pour le fil d'Ariane) ----------
  const nomGroupe = gk => { const r = arbre.find(x => x.gk === gk); return r ? (r.g || "(sans groupe)") : gk; };
  const nomUnite = (gk, uk) => { const r = arbre.find(x => (!gk || x.gk === gk) && x.uk === uk); return r ? (r.u || "(sans unité)") : uk; };

  // ---------- fil d'Ariane + historique (précédent / suivant / monter / actualiser) ----------
  function fil() {
    const items = [{ label: "Accueil", href: "index.html" }, { label: "Inscriptions", href: "inscriptions.html" }];
    const tous = { an: "", gk: "", uk: "" }, vide = !sel.an && !sel.gk && !sel.uk;
    const ajouter = (label, s) => items.push({ label, onClick: () => choisir(s) });
    ajouter(titre, tous);
    if (sel.an) ajouter(sel.an, { an: sel.an, gk: "", uk: "" });
    if (sel.gk) ajouter(nomGroupe(sel.gk), { an: sel.an, gk: sel.gk, uk: "" });
    if (sel.uk) ajouter(nomUnite(sel.gk, sel.uk), { an: sel.an, gk: sel.gk, uk: sel.uk });
    const dernier = items[items.length - 1]; delete dernier.onClick; delete dernier.href;
    Hub.renderFil(items, { rafraichir: () => recharger(), haut: vide ? { href: "inscriptions.html" } : undefined });
  }
  const etat = () => ({ rg: 1, sel: { ...sel } });
  function pousser() { try { history.pushState(etat(), ""); } catch {} }
  addEventListener("popstate", e => {
    const st = e.state && e.state.rg ? e.state : { sel: { an: "", gk: "", uk: "" } };
    restaure = true; sel = { ...st.sel }; debut = 0; dessiner(); lister(); fil(); restaure = false;
  });

  // ---------- démarrage : « moi », l'arbre et la première page de la liste partent EN MÊME TEMPS ----------
  async function demarrer() {
    $("rg-refus").hidden = true; chargementListe(true);
    let m, a, l;
    try { [m, a, l] = await (prechargement || Promise.all([api("/donnees/moi"), api("/donnees/arbre").catch(e => ({ erreur: e })), api("/donnees/lire", { debut: 0, limite: PAGE }).catch(e => ({ erreur: e }))])); prechargement = null; }
    catch (e) { chargementListe(false); return refus(e.message); }
    moi = m; const f = moi.feuilles.find(x => x.nom === feuille);
    titre = f ? f.titre : "Inscriptions"; $("rg-h1").textContent = titre; document.title = titre + " · ScoutHub";
    $("rg-portee").textContent = moi.acces === "tout" ? "Tous les groupes" : moi.acces === "groupe" ? "Votre groupe : " + moi.groupe : moi.acces === "unite" ? "Votre unité : " + moi.unite : "";
    if (!f) { chargementListe(false); fil(); return refus(moi.acces === "aucun" ? "Aucune donnée d’inscription ne vous concerne." : "Ces données ne vous concernent pas."); }
    if (a.erreur || l.erreur) { chargementListe(false); return refus((a.erreur || l.erreur).message); }
    meta = a; arbre = a.arbre; premier = l;
    $("rg-corps").hidden = false;
    sel = { an: "", gk: "", uk: "" }; q = ""; $("rg-q").value = ""; debut = 0;
    adapter(); dessiner(); lister(); fil();
    try { history.replaceState(etat(), ""); } catch {}
  }
  async function recharger() {   // ⟳ : on garde la sélection
    chargementListe(true);
    try { [moi, meta] = await Promise.all([api("/donnees/moi"), api("/donnees/arbre")]); arbre = meta.arbre; } catch (e) { chargementListe(false); return refus(e.message); }
    adapter(); dessiner(); lister(); fil();
  }

  // ---------- filtres à plat : Année, Groupe, Unité (tous visibles, un clic pour choisir, un clic pour retirer) ----------
  const annees = () => [...new Set(arbre.map(r => r.an).filter(Boolean))].sort().reverse();   // la plus récente en haut
  const somme = rs => rs.reduce((t, r) => t + r.n, 0);
  const tri = (a, b) => a.localeCompare(b, "fr");
  const nbAn = () => new Set(arbre.map(r => r.an).filter(Boolean)).size, nbGr = () => new Set(arbre.map(r => r.gk)).size, nbUn = () => new Set(arbre.map(r => r.gk + "|" + r.uk)).size;
  const avec = (niv, v) => { const o = { ...sel, [niv]: v }; if (niv === "gk") o.uk = ""; return o; };
  const choisir = s => { sel = s; debut = 0; dessiner(); lister(); fil(); if (!restaure) pousser(); };
  // Panneau inutile (donc caché) quand il n'y a rien à choisir : une seule année, un seul groupe, une seule unité.
  function adapter() { const utile = nbAn() > 1 || nbGr() > 1 || nbUn() > 1; $("rg-lateral").hidden = !utile; $("rg-poignee").hidden = !utile; $("rg-corps").classList.toggle("sans-panneau", !utile); }
  // Lignes compatibles avec les AUTRES filtres : les effectifs de chaque liste restent exacts quand on filtre.
  const compat = ignorer => arbre.filter(r => (ignorer === "an" || !sel.an || r.an === sel.an) && (ignorer === "gk" || !sel.gk || r.gk === sel.gk) && (ignorer === "uk" || !sel.uk || r.uk === sel.uk));
  const valeurs = (niv, libelle) => { const m = new Map(); compat(niv).forEach(r => { const v = r[niv]; if (!v && niv !== "gk" && niv !== "uk") return; if (!m.has(v)) m.set(v, { v, lib: libelle(r), n: 0 }); m.get(v).n += r.n; }); return [...m.values()]; };
  function bloc(niv, titreBloc, items, toutes, extra) {
    const sec = el("section", { className: "rg-fx" });
    const tete = el("div", { className: "rg-fx-tete" }, el("h3", { textContent: titreBloc })); sec.append(tete);
    if (items.length > 9) {   // longue liste (groupes, unités) : champ de recherche
      const champ = el("input", { type: "search", className: "rg-fx-rech", placeholder: "Chercher…", autocomplete: "off", value: recherches[niv] || "" }); champ.setAttribute("aria-label", "Chercher dans " + titreBloc.toLowerCase());
      champ.oninput = () => { recherches[niv] = champ.value; remplir(); }; sec.append(champ);
    }
    const boite = el("div", { className: "rg-fx-liste", role: "listbox" }); sec.append(boite);
    const ligne = (v, lib, n, tag) => { const choisi = (sel[niv] || "") === v;
      const b = el("button", { type: "button", className: "rg-fx-ligne" + (choisi ? " choisi" : ""), onclick: () => choisir(avec(niv, choisi ? "" : v)) });
      b.setAttribute("role", "option"); b.setAttribute("aria-selected", String(choisi));
      b.append(el("span", { className: "rg-fx-coche", textContent: choisi ? "✓" : "" }), el("span", { className: "rg-fx-lib", textContent: lib }), ...(tag ? [el("span", { className: "rg-tag", textContent: tag })] : []), el("span", { className: "rg-fx-n", textContent: n.toLocaleString("fr-FR") })); return b; };
    function remplir() {
      boite.textContent = ""; const f = norm(recherches[niv] || "");
      boite.append(ligne("", toutes, items.reduce((t, i) => t + i.n, 0)));
      items.filter(i => !f || norm(i.lib).includes(f)).forEach(i => boite.append(ligne(i.v, i.lib, i.n, extra && extra(i))));
      if (f && boite.children.length === 1) boite.append(el("p", { className: "rg-vide", textContent: "Aucun résultat." }));
    }
    remplir(); return sec;
  }
  function dessiner() {
    const z = $("rg-facettes"); z.textContent = "";
    if (nbAn() > 1) { const l = annees(); z.append(bloc("an", "Année", valeurs("an", r => r.an).sort((a, b) => (a.v < b.v ? 1 : -1)), "Toutes les années", i => (i.v === l[0] ? "en cours" : ""))); }
    if (nbGr() > 1) z.append(bloc("gk", "Groupe", valeurs("gk", r => r.g || "(sans groupe)").sort((a, b) => tri(a.lib, b.lib)), "Tous les groupes"));
    // Les unités s'affichent dès qu'on connaît le groupe (ou s'il n'y en a qu'un) : sinon la liste serait interminable.
    if (nbUn() > 1 && (sel.gk || nbGr() === 1)) z.append(bloc("uk", "Unité", valeurs("uk", r => r.u || "(sans unité)").sort((a, b) => tri(a.lib, b.lib)), "Toutes les unités"));
    else if (nbUn() > 1) z.append(el("p", { className: "rg-fx-aide", textContent: "Choisissez un groupe pour filtrer par unité." }));
    const actifs = [["an", "Année", sel.an], ["gk", "Groupe", sel.gk && nomGroupe(sel.gk)], ["uk", "Unité", sel.uk && nomUnite(sel.gk, sel.uk)]].filter(x => x[2]);
    $("rg-fx-reset").hidden = !actifs.length; $("rg-fx-reset").onclick = () => choisir({ an: "", gk: "", uk: "" });
    const c = $("rg-actifs"); c.hidden = !actifs.length; c.textContent = "";
    actifs.forEach(([niv, nom, val]) => c.append(el("button", { type: "button", className: "rg-chip", title: "Retirer ce filtre", onclick: () => choisir(avec(niv, "")) }, el("span", { textContent: nom + " : " + val }), el("span", { className: "rg-chip-x", textContent: "✕", ariaHidden: "true" }))));
    if (actifs.length > 1) c.append(el("button", { type: "button", className: "rg-chip tout", textContent: "Tout effacer", onclick: () => choisir({ an: "", gk: "", uk: "" }) }));
  }

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
  function chargementListe(on) { const w = document.querySelector(".rg-table-wrap"), z = w.querySelector(".zone-chargement"); if (on && !z) w.prepend(Hub.chargement("Chargement des inscriptions…")); if (!on && z) z.remove(); }
  async function lister() {
    const mon = ++sequence; $("rg-compte").textContent = ""; chargementListe(true);
    try {
      const o = premier ? (p => (premier = null, p))(premier) : await api("/donnees/lire", { an: sel.an, gk: sel.gk, uk: sel.uk, q, debut, limite: PAGE });
      if (mon !== sequence) return;   // une requête plus récente a pris le relais
      chargementListe(false);
      total = o.total; const cols = colonnes(), t = $("rg-table"), tr = el("tr");
      t.tHead.textContent = ""; t.tBodies[0].textContent = "";
      const tout = el("input", { type: "checkbox", title: "Tout sélectionner", ariaLabel: "Tout sélectionner" }); tout.onchange = () => { choisies = new Set(tout.checked ? o.lignes.map((_, i) => i) : []); t.tBodies[0].querySelectorAll("input.rg-cb").forEach((c, i) => { c.checked = tout.checked; }); majLot(); };
      tr.append(el("th", { className: "rg-col-cb" }, tout));
      cols.forEach(c => tr.append(el("th", { textContent: c }))); t.tHead.append(tr);
      courantes = o.lignes; choisies = new Set(); fermerFiche(); barreLot();
      o.lignes.forEach((l, i) => {
        const r = el("tr"); r.tabIndex = 0;
        const cb = el("input", { type: "checkbox", className: "rg-cb", ariaLabel: "Sélectionner cette fiche" }); cb.onclick = ev => ev.stopPropagation(); cb.onchange = () => { cb.checked ? choisies.add(i) : choisies.delete(i); majLot(); };
        r.append(el("td", { className: "rg-col-cb" }, cb));
        cols.forEach((c, k) => { const v = l[c]; r.append(v === undefined || v === "" ? el("td", { className: "rg-vide", textContent: "—" }) : el("td", { className: k === 0 ? "rg-nom" : "", textContent: String(v) })); });
        r.onclick = () => ouvrirFiche(i); r.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrirFiche(i); } };
        t.tBodies[0].append(r);
      });
      $("rg-compte").textContent = total.toLocaleString("fr-FR") + (q ? " résultat" : " inscription") + (total > 1 ? "s" : "");
      $("rg-page").textContent = total ? (debut + 1) + "–" + Math.min(debut + PAGE, total) + " sur " + total.toLocaleString("fr-FR") : "Aucun résultat";
      $("rg-prec").disabled = debut <= 0; $("rg-suiv").disabled = debut + PAGE >= total;
      $("rg-note").hidden = !o.tronque; $("rg-note").textContent = o.tronque ? "La recherche porte sur les 1 500 premières lignes de la sélection : choisissez un groupe ou une unité pour la préciser." : "";
    } catch (e) { if (mon === sequence) { chargementListe(false); $("rg-compte").textContent = ""; refus(e.message); } }
  }
  $("rg-q").oninput = () => { clearTimeout(minuteur); minuteur = setTimeout(() => { q = $("rg-q").value.trim(); debut = 0; lister(); }, 350); };
  $("rg-prec").onclick = () => { debut = Math.max(0, debut - PAGE); lister(); };
  $("rg-suiv").onclick = () => { debut += PAGE; lister(); };


  // ---------- impression de plusieurs fiches : sélection, page entière ou toute la sélection ----------
  let choisies = new Set();
  function majLot() { const b = $("rg-imp-sel"); if (b) { b.disabled = !choisies.size; b.textContent = "Imprimer la sélection" + (choisies.size ? " (" + choisies.size + ")" : ""); } }
  function barreLot() {
    if ($("rg-lot")) { majLot(); return; }
    const bar = el("div", { id: "rg-lot", className: "rg-lot" });
    bar.append(
      el("button", { type: "button", id: "rg-imp-sel", className: "ghost", textContent: "Imprimer la sélection", disabled: true, onclick: () => imprimerLot([...choisies].sort((a, b) => a - b).map(i => courantes[i])) }),
      el("button", { type: "button", id: "rg-imp-page", className: "ghost", textContent: "Imprimer cette page", onclick: () => imprimerLot(courantes) }),
      el("button", { type: "button", id: "rg-imp-tout", className: "ghost", textContent: "Tout imprimer", onclick: imprimerTout }),
      el("span", { className: "rg-lot-aide muted", textContent: "Cochez des lignes pour n’imprimer que celles-là." }));
    document.querySelector(".rg-table-wrap").before(bar);
  }
  async function imprimerTout() {
    if (!total) return;
    if (total > 40 && !confirm("Imprimer les " + total + " fiches de cette sélection ? Cela peut faire beaucoup de pages.")) return;
    const b = $("rg-imp-tout"); b.disabled = true; b.textContent = "Préparation…";
    try {
      const toutes = [];
      for (let d = 0; d < total && d < 600; d += PAGE) { const o = await api("/donnees/lire", { an: sel.an, gk: sel.gk, uk: sel.uk, q, debut: d, limite: PAGE }); toutes.push(...o.lignes); }
      imprimerLot(toutes);
    } catch (e) { alert(e.message); } finally { b.disabled = false; b.textContent = "Tout imprimer"; }
  }
  function imprimerLot(lignes) {
    if (!lignes || !lignes.length) return;
    document.getElementById("rg-impression")?.remove();
    const z = el("div", { id: "rg-impression" }); lignes.forEach(l => z.append(construireCarte(l)));
    document.body.append(z); document.body.classList.add("impr-lot");
    const fin = () => { document.body.classList.remove("impr-lot"); z.remove(); removeEventListener("afterprint", fin); };
    addEventListener("afterprint", fin); setTimeout(() => window.print(), 50);
  }

  // ---------- fiche : élégante, imprimable ; elle remplace la liste (bouton « Liste » pour revenir) ----------
  const SVG = d => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const ICONES = { fichier: SVG('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/>'), sante: SVG('<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/><path d="M3.2 12H8l2-3 3 6 2-3h4.8"/>'), photo: SVG('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>'), volets: SVG('<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>'), lien: SVG('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'), badge: SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2"/><path d="M15 12h2"/><path d="M7 16h10"/>'), imprimer: SVG('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>') };
  const iconeDoc = c => /sanitaire/i.test(c) ? ICONES.sante : /photo/i.test(c) ? ICONES.photo : /volet/i.test(c) ? ICONES.volets : /encadrement/i.test(c) ? ICONES.badge : /inscription|url/i.test(c) ? ICONES.lien : ICONES.fichier;
  const estLien = v => /^https:\/\/[^\s"'<>]{4,600}$/.test(String(v));
  const GROUPES = [["Identité", /^(nom|pr[ée]nom|prenom|date de naissance|lieu de naissance|commune de naissance|sexe|nom enfant|prénom enfant|nom du responsable|nom responsable|prénom de l'enfant)/i], ["Contact", /(adresse|mail|t[ée]l[ée]?phone|^tel)/i], ["Inscription", /(groupe|unit[ée]|ann?[ée]e?|^date|paiement|assurance|routier|chef|renouvellement|montant|camp|type|moyen|transport|r[ôo]le|doublon)/i]];
  const BADGES = /^(paiement|assurance)$/i;
  function fermerFiche() { idx = -1; $("rg-detail").hidden = true; $("rg-corps").classList.remove("avec-detail"); $("rg-table").querySelectorAll("tbody tr.sel").forEach(t => t.classList.remove("sel")); $("rg-detail").textContent = ""; }
  // La fiche d'une personne (même présentation à l'écran et à l'impression) : utilisée seule ou en lot.
  function construireCarte(l) {
    const ordre = (meta.colonnes && meta.colonnes.length) ? meta.colonnes : [...colonnes(), ...Object.keys(l).filter(k => k !== "rang" && !colonnes().includes(k))];
    const champs = ordre.filter(c => l[c] !== undefined && l[c] !== "");
    const vue = colonnes(), nomComplet = vue.slice(0, 2).map(c => l[c]).filter(Boolean).join(" ") || "Fiche";
    const sous = [l["Unité"], l["Annee"] || l["Année"] || l["Année d'adhésion"]].filter(Boolean).join(" · ");
    const ini = nomComplet.split(/\s+/).slice(0, 2).map(m => m.charAt(0)).join("").toUpperCase();
    const carte = el("div", { className: "rg-carte" });
    carte.append(el("div", { className: "rg-id" }, el("span", { className: "rg-rond", textContent: ini || "?" }), el("div", {}, el("h2", { textContent: nomComplet }), el("p", { textContent: sous }))));
    const badges = champs.filter(c => BADGES.test(c)); if (badges.length) carte.append(el("div", { className: "rg-badges" }, ...badges.map(c => el("span", { className: "rg-badge" + (/^(oui|ok|pay|reçu|recu|valid)/i.test(String(l[c])) ? " ok" : ""), textContent: c + " : " + l[c] }))));
    const docs = champs.filter(c => estLien(l[c]));
    if (docs.length) carte.append(el("div", { className: "rg-docs" }, ...docs.map(c => { const a = el("a", { className: "rg-doc", href: String(l[c]), target: "_blank", rel: "noopener noreferrer", title: String(c) }); a.innerHTML = '<span class="rg-doc-rond">' + iconeDoc(c) + '</span>'; a.append(el("span", { textContent: c.replace(/^url\s+/i, "") })); return a; })));
    const restants = champs.filter(c => !estLien(l[c]) && !BADGES.test(c)), vus = new Set();
    for (const [nom, re] of [...GROUPES, ["Autres informations", /./]]) {
      const cs = restants.filter(c => !vus.has(c) && re.test(c)); if (!cs.length) continue; cs.forEach(c => vus.add(c));
      const dl = el("dl", { className: "rg-champs" }); cs.forEach(c => dl.append(el("dt", { textContent: c }), el("dd", { textContent: String(l[c]) })));
      carte.append(el("section", { className: "rg-bloc" }, el("h3", { textContent: nom }), dl));
    }
    carte.append(el("p", { className: "rg-pied-impr", textContent: "FSGGB · fiche éditée le " + new Date().toLocaleDateString("fr-FR") + " — document confidentiel" }));
    return carte;
  }
  function ouvrirFiche(i) {
    const l = courantes[i]; if (!l) return; idx = i;
    const d = $("rg-detail"); d.textContent = "";
    const vue = colonnes(), nomComplet = vue.slice(0, 2).map(c => l[c]).filter(Boolean).join(" ") || "Fiche";
    const sous = [l["Unité"], l["Annee"] || l["Année"] || l["Année d'adhésion"]].filter(Boolean).join(" · ");
    const btn = (contenu, titre, fn, off, cls) => { const b = el("button", { type: "button", className: "rg-d-btn " + (cls || ""), title: titre, disabled: !!off, onclick: fn }); b.setAttribute("aria-label", titre); typeof contenu === "string" ? (b.innerHTML = contenu) : b.append(contenu); return b; };
    const ini = nomComplet.split(/\s+/).slice(0, 2).map(m => m.charAt(0)).join("").toUpperCase();
    d.append(el("div", { className: "rg-detail-tete" },
      btn("← Liste", "Retour à la liste", fermerFiche, false, "texte"),
      el("span", { className: "rg-d-espace" }),
      btn("‹", "Fiche précédente", () => ouvrirFiche(i - 1), i <= 0), btn("›", "Fiche suivante", () => ouvrirFiche(i + 1), i >= courantes.length - 1),
      btn(ICONES.imprimer, "Imprimer la fiche", () => window.print()), btn("✕", "Fermer la fiche", fermerFiche)));
    const carte = construireCarte(l);
    d.append(carte); d.hidden = false; $("rg-corps").classList.add("avec-detail");
    $("rg-table").querySelectorAll("tbody tr").forEach((t, k) => t.classList.toggle("sel", k === i));
    d.scrollTop = 0;
  }
  addEventListener("keydown", e => { if (idx < 0 || e.target.closest("input,select,textarea")) return; if (e.key === "Escape") fermerFiche(); else if (e.key === "ArrowLeft") ouvrirFiche(idx - 1); else if (e.key === "ArrowRight") ouvrirFiche(idx + 1); });
  addEventListener("pagehide", () => { try { $("rg-table").tBodies[0].textContent = ""; $("rg-detail").textContent = ""; } catch {} });

  await demarrer();
})();
