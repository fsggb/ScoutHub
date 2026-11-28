// Page Inscriptions : une carte par registre qui concerne la personne (le serveur décide selon son adresse de connexion).
(async () => {
  "use strict";
  const { $ } = Hub, API = window.SCOUTHUB_DONNEES_API;
  // Ordre et libellés de l'ancien intranet (menu « Inscriptions »)
  const CARTES = [["Mineurs", "Mineurs"], ["Majeurs", "Majeurs"], ["Camps", "Camp"], ["Formulaires", "Formulaires d’inscription"], ["Cotisations", "Cotisations Mineurs"], ["Cotisations_Chefs", "Cotisations Majeurs"]];
  const zone0 = $("cartes"); if (zone0) zone0.append(Hub.chargement("Chargement de vos inscriptions…"));
  if (!API) {   // version GitHub : jamais de données de personnes ici, elles se consultent sur l'intranet
    const z = $("cartes"); if (z) z.textContent = "";
    $("ins-note").hidden = false; $("ins-note").textContent = ""; $("ins-note").append("Les inscriptions se consultent sur l’intranet de la fédération : ", Object.assign(document.createElement("a"), { href: "https://intranet.fsggb.workers.dev/inscriptions.html", textContent: "ouvrir l’intranet" }), ".");
    $("ins-portee").textContent = ""; return;
  }
  const user = await Hub.requireUser(); if (!user) return;
  const simule = () => (typeof Hub.simule === "function" ? Hub.simule() : "");
  let moi = null, images = {}, cause = "";

  if (typeof Hub.simule !== "function") cause = "Votre navigateur utilise une ancienne version de la page : rechargez avec Ctrl + F5.";
  try { const r = await fetch(API + "/donnees/moi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: Hub.token, comme: simule() || undefined }), cache: "no-store" }); moi = await r.json(); if (!moi.ok) cause = (moi.error && moi.error.message) || "Erreur " + r.status; } catch (e) { cause = cause || "Serveur injoignable : vérifiez votre connexion."; }
  try { (await Hub.call("menu", { menu: "Inscriptions" })).rubriques.forEach(r => { images[r.nom.toLowerCase()] = r.image; }); } catch {}
  const zone = $("cartes"); zone.textContent = "";
  if (!moi || !moi.ok) { $("ins-note").hidden = false; $("ins-note").textContent = "Les inscriptions ne peuvent pas s’afficher : " + (cause || "réponse inattendue du serveur") + (/Session|expir/i.test(cause) ? " Reconnectez-vous." : ""); return; }
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
    carte.append(lib); zone.append(carte); Hub.fondCarte(carte, images[titre.replace(/’/g, "'").toLowerCase()] || images[titre.toLowerCase()]);
  }
})();
