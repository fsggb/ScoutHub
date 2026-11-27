// Page Inscriptions : une carte par registre qui concerne la personne (le serveur décide selon son adresse de connexion).
(async () => {
  "use strict";
  const { $ } = Hub, API = window.SCOUTHUB_DONNEES_API;
  // Ordre et libellés de l'ancien intranet (menu « Inscriptions »)
  const CARTES = [["Mineurs", "Mineurs"], ["Majeurs", "Majeurs"], ["Camps", "Camp"], ["Formulaires", "Formulaires d’inscription"], ["Cotisations", "Cotisations Mineurs"], ["Cotisations_Chefs", "Cotisations Majeurs"]];
  const user = await Hub.requireUser(); if (!user) return;
  let moi = null;
  try { const r = await fetch(API + "/donnees/moi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: Hub.token }), cache: "no-store" }); moi = await r.json(); } catch {}
  const zone = $("cartes"); zone.textContent = "";
  if (!moi || !moi.ok) { $("ins-note").hidden = false; $("ins-note").textContent = "Les inscriptions sont momentanément indisponibles."; return; }
  const portee = moi.acces === "tout" ? "Tous les groupes" : moi.acces === "groupe" ? "Votre groupe" : moi.acces === "unite" ? "Votre unité" : "";
  const ok = new Set(moi.feuilles.map(f => f.nom));
  if (!ok.size) { $("ins-note").hidden = false; $("ins-note").textContent = "Aucune inscription ne vous concerne pour l’instant. Les chefs de groupe et d’unité y accèdent avec l’adresse enregistrée pour leur groupe ou leur unité."; }
  $("ins-portee").textContent = moi.acces === "tout" ? "Accès administrateur : tous les groupes et toutes les unités." : moi.acces === "groupe" ? "Chef de groupe : vous voyez les inscriptions de votre groupe (" + moi.groupe + ")." : moi.acces === "unite" ? "Chef d’unité : vous voyez les inscriptions de votre unité (" + moi.unite + ")." : $("ins-portee").textContent;
  for (const [nom, titre] of CARTES) {
    const vivante = ok.has(nom);
    if (!vivante && !(nom === "Formulaires" && ok.size)) continue;   // une carte n'existe que si elle concerne la personne
    const carte = document.createElement(vivante ? "a" : "div"); carte.className = "dash-card" + (vivante ? "" : " a-venir");
    if (vivante) carte.href = "registre.html?f=" + encodeURIComponent(nom);
    const lib = document.createElement("span"); lib.className = "tile-label";
    lib.append(Object.assign(document.createElement("strong"), { textContent: titre }), Object.assign(document.createElement("span"), { className: "desc", textContent: vivante ? portee : "Bientôt disponible" }));
    carte.append(lib); zone.append(carte);
  }
})();
