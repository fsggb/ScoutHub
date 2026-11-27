// Page Documentation : les rubriques viennent du menu de l'ancien intranet (feuille « Menu »), déjà filtrées par le serveur
// selon la personne ; chacune devient un lien dès que l'administrateur lui a donné une adresse (bouton « Ajouter »).
(async () => {
  "use strict";
  const { $ } = Hub, norm = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if ($("cartes")) $("cartes").append(Hub.chargement("Chargement…"));
  const user = await Hub.requireUser(); if (!user) return;
  const admin = user.role === "admin", zone = $("cartes"), note = $("doc-note");

  async function dessiner() {
    let rub = [], ent = [], g = null;
    try { rub = (await Hub.call("menu", { menu: "Documentation" })).rubriques; } catch { /* menu indisponible : seules les entrées ajoutées s'affichent */ }
    try { ent = (await Hub.call("entrees", { section: "documentation" })).entrees; } catch {}
    if (admin) { try { g = await Entrees.groupesUnites(); } catch {} }
    zone.textContent = "";
    const parNom = new Map(ent.map(e => [norm(e.nom), e])), vus = new Set();
    const DYNAMIQUES = new Set(["Bibliographie", "Administratif", "Revues", "Tutos", "Agenda Fédé", "Lieux de camp"]);
    const carte = (titre, e, image) => {
      if (!e && DYNAMIQUES.has(titre)) e = { url: "rubrique.html?r=" + encodeURIComponent(titre), description: "Ouvrir", dyn: true };
      const c = document.createElement(e ? "a" : "div"); c.className = "dash-card" + (e ? "" : " a-venir");
      if (e) { c.href = e.url; if (!e.dyn) { c.target = "_blank"; c.rel = "noopener noreferrer"; } }
      const lib = document.createElement("span"); lib.className = "tile-label";
      lib.append(Object.assign(document.createElement("strong"), { textContent: titre }), Object.assign(document.createElement("span"), { className: "desc", textContent: e ? (e.description || "Ouvrir") : "Bientôt disponible" }));
      if (e && admin && e.audience) lib.append(Object.assign(document.createElement("span"), { className: "desc", textContent: "Public : " + Entrees.libelle(e.audience, g) }));
      c.append(lib);
      if (e && admin) { const b = Object.assign(document.createElement("button"), { type: "button", className: "app-edit", textContent: "✎", title: "Modifier" }); b.setAttribute("aria-label", "Modifier « " + titre + " »"); b.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); Entrees.dialogue("documentation", e, dessiner); }; c.append(b); }
      zone.append(c); Hub.fondCarte(c, image);
    };
    rub.forEach(r => { const e = parNom.get(norm(r.nom)); vus.add(norm(r.nom)); carte(r.nom, e, r.image); });
    ent.filter(e => !vus.has(norm(e.nom))).forEach(e => carte(e.nom, e));
    note.hidden = !!zone.children.length; if (!zone.children.length) note.textContent = "Aucun document ne vous est destiné pour l’instant.";
  }
  if (admin && !$("ajout-doc")) {
    const b = Object.assign(document.createElement("button"), { id: "ajout-doc", type: "button", className: "ghost", textContent: "+ Ajouter un document" });
    b.onclick = () => Entrees.dialogue("documentation", null, dessiner); $("cartes").before(b);
  }
  dessiner();
})();
