// Onglet « Données » de l'administration : état de la synchronisation du miroir (aucune donnée de personne ici).
// La consultation des inscriptions se fait dans l'onglet Inscriptions (registre.html), avec les droits de chacun.
(() => {
  "use strict";
  if (!window.Hub || !document.getElementById("tab-donnees")) return;
  const { $, say } = Hub, API = window.SCOUTHUB_DONNEES_API;
  const date = t => t ? new Date(t).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "jamais";
  async function api(chemin, corps) {
    let r; try { r = await fetch(API + chemin, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: Hub.token, ...corps }), cache: "no-store" }); } catch { throw new Error("Serveur injoignable."); }
    const o = await r.json().catch(() => ({})); if (!o.ok) throw new Error(o.error && o.error.message || "Erreur."); return o;
  }
  function onglet(actif) {
    for (const n of ["comptes", "portail", "donnees", "simulation"]) { const sel = n === actif; $("tb-" + n).setAttribute("aria-selected", String(sel)); $("tab-" + n).hidden = !sel; }
    if (actif === "donnees") etat();
    if (actif === "simulation") adressesSimulables();
  }
  $("tb-donnees").onclick = () => onglet("donnees");
  $("tb-simulation").onclick = () => onglet("simulation");
  $("tb-comptes").addEventListener("click", () => onglet("comptes"));
  $("tb-portail").addEventListener("click", () => onglet("portail"));
  async function etat() {
    say($("dn-etat"), "Chargement…");
    try {
      const o = await api("/donnees/etat"), corps = $("dn-corps"); corps.textContent = "";
      for (const f of o.feuilles) {
        const tr = document.createElement("tr"), td = (t, c) => { const x = document.createElement("td"); if (c) x.className = c; x.textContent = t; tr.append(x); return x; };
        td(f.nom); td(f.lignes.toLocaleString("fr-FR")); td(date(f.maj));
        td(f.statut === "erreur" ? "Erreur : " + f.erreur : f.statut === "jamais" ? "Jamais synchronisée" : "À jour");
        td(f.orphelines === undefined ? "—" : f.orphelines ? f.orphelines + " (" + f.groupes_inconnus.join(", ") + ")" : "0");
        const a = td("", "right"), b = Object.assign(document.createElement("button"), { type: "button", className: "ghost", textContent: "Synchroniser" });
        b.onclick = () => synchroniser(f.nom); a.append(b); corps.append(tr);
      }
      say($("dn-etat"), o.feuilles.some(f => f.orphelines) ? "Des lignes portent un groupe absent de la feuille « Groupes et unités » : aucun chef ne les voit. À corriger dans la feuille." : "");
    } catch (e) { say($("dn-etat"), e.message, true); }
  }
  async function synchroniser(nom) {
    say($("dn-etat"), "Synchronisation…");
    try { const o = await api("/donnees/sync", nom ? { feuille: nom } : {}); const err = Object.entries(o.resultat).filter(([, r]) => r.statut === "erreur"); await etat(); if (err.length) say($("dn-etat"), "Échec : " + err.map(([n, r]) => n + " (" + r.erreur + ")").join(" ; "), true); else say($("dn-etat"), "Synchronisation terminée."); }
    catch (e) { say($("dn-etat"), e.message, true); }
  }
  $("dn-tout").onclick = () => synchroniser();

  // ---------- simulation : voir TOUT le site comme une adresse (saisie libre, reconnaissance automatique) ----------
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
  let minuteur = null, verif = 0, pret = false;
  const carte = (classe, ...kids) => { const c = $("sim-resultat"); c.hidden = false; c.className = "sim-carte " + classe; c.textContent = ""; c.append(...kids); };
  async function reconnaitre() {
    const adresse = $("sim-adresse").value.trim().toLowerCase(), mon = ++verif; pret = false; $("sim-go").disabled = true; say($("sim-etat"), "");
    if (!adresse) { $("sim-resultat").hidden = true; return; }
    if (!EMAIL.test(adresse)) { carte("neutre", "Saisissez une adresse e-mail complète."); return; }
    carte("neutre", Object.assign(document.createElement("span"), { className: "chargement" }), " Recherche…");
    try {
      const o = await Hub.call("profil", { comme: adresse }); if (mon !== verif) return;
      const role = Hub.ROLE_LABELS[Hub.normRole(o.user.role)] || o.user.role;
      const gras = t => Object.assign(document.createElement("b"), { textContent: t });
      if (!o.user.fsggb) carte("alerte", gras("Adresse hors fédération"), " : elle ne verrait que l’accès membre, sans les outils réservés.");
      else if (o.chef) carte("ok", gras(role), o.groupe_nom ? " · " + o.groupe_nom : "", o.unite_nom && o.user.role === "chef_unite" ? " · " + o.unite_nom : "", Object.assign(document.createElement("small"), { textContent: "Accès déduit de la feuille « Groupes et unités »." }));
      else carte("ok", gras(role), o.connu ? " : compte existant, sans rôle particulier." : " : adresse jamais connectée, vue comme simple membre.");
      pret = true; $("sim-go").disabled = false;
    } catch (e) { if (mon === verif) carte("alerte", e.message === "Simulation réservée à l'administrateur." ? "Seuls les administrateurs désignés peuvent simuler une adresse." : e.message); }
  }
  function adressesSimulables() { $("sim-adresse").focus(); }
  $("sim-adresse").oninput = () => { clearTimeout(minuteur); minuteur = setTimeout(reconnaitre, 450); };
  $("sim-adresse").onkeydown = e => { if (e.key === "Enter" && pret) $("sim-go").click(); };
  $("sim-go").onclick = async () => {
    say($("sim-etat"), "Ouverture de la simulation…");
    try { await Hub.simulerComme($("sim-adresse").value); location.href = "index.html"; }
    catch (e) { say($("sim-etat"), e.message, true); }
  };
})();
