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
    for (const [id, p] of [["tb-comptes", "tab-comptes"], ["tb-portail", "tab-portail"], ["tb-donnees", "tab-donnees"]]) { const sel = id === "tb-" + actif; $(id).setAttribute("aria-selected", String(sel)); $(p).hidden = !sel; }
    if (actif === "donnees") etat();
  }
  $("tb-donnees").onclick = () => onglet("donnees");
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
})();
