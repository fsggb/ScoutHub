// Onglet « Données » de l'administration : lecture des données sensibles (miroir chiffré, Worker donnees).
// Accès : administrateurs listés (DONNEES_ADMINS) seulement, sur la base de leur session ; le jeton de 15 minutes, renouvelé
// en silence tant que l'onglet est ouvert, vit uniquement en mémoire
// (jamais dans localStorage ni dans l'adresse) et tout ce qui est affiché disparaît au verrouillage, à l'expiration
// ou quand la page est quittée. Tout est écrit avec textContent (aucun HTML venant des données).
(() => {
  "use strict";
  if (!window.Hub || !document.getElementById("tab-donnees")) return;
  const { $, say } = Hub, API = window.SCOUTHUB_DONNEES_API, PAGE = 100;
  let paires = [], jeton = null, expire = 0, minuteur = null, feuille = "", debut = 0, total = 0, charge = false;

  function onglet(actif) {
    for (const [id, p] of [["tb-comptes", "tab-comptes"], ["tb-portail", "tab-portail"], ["tb-donnees", "tab-donnees"]]) {
      const sel = id === "tb-" + actif; $(id).setAttribute("aria-selected", String(sel)); $(p).hidden = !sel;
    }
    if (actif === "donnees") preparer(); else vider();
  }
  $("tb-donnees").onclick = () => onglet("donnees");
  $("tb-comptes").addEventListener("click", () => onglet("comptes"));
  $("tb-portail").addEventListener("click", () => onglet("portail"));

  async function appel(chemin, corps) {
    if (jeton && expire - Date.now() < 300000) { try { await ouvrirAcces(); } catch { /* la requête dira si l'accès est fermé */ } }   // renouvellement silencieux
    let r; try { r = await fetch(API + chemin, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jeton, ...corps }), cache: "no-store" }); } catch { throw new Error("Serveur injoignable."); }
    let o; try { o = await r.json(); } catch { throw new Error("Réponse invalide."); }
    if (!o.ok) { const m = o.error && o.error.message || "Erreur."; if (r.status === 403) verrouiller(m); throw new Error(m); }
    return o;
  }

  // ---------- ouverture : par la session administrateur (vérifiée côté serveur), sans reconnexion ----------
  async function ouvrirAcces() {
    const o = await Hub.call("donneesOuvrir"); jeton = o.jeton; expire = Date.now() + o.expire_dans * 1000;
  }
  async function preparer() {
    if (jeton) return;
    $("dn-verrou").hidden = false; $("dn-ouvert").hidden = true; say($("dn-msg"), "Ouverture des données…");
    try { await ouvrirAcces(); ouvrir(); } catch (e) { say($("dn-msg"), e.message, true); }
  }

  // ---------- ouverture / verrouillage ----------
  async function ouvrir() {
    $("dn-verrou").hidden = true; $("dn-ouvert").hidden = false;
    clearInterval(minuteur); minuteur = setInterval(() => { if (Date.now() >= expire) verrouiller("Accès fermé : rouvrez l'onglet."); else say($("dn-etat"), charge ? $("dn-etat").dataset.n : ""); }, 15000);
    try {
      const o = await appel("/donnees/etat", {});
      const sel = $("dn-feuille"); sel.textContent = "";
      o.configurees.forEach(n => sel.append(Object.assign(document.createElement("option"), { value: n, textContent: n })));
      feuille = o.configurees[0]; await choisirFeuille();
    } catch (e) { say($("dn-etat"), e.message, true); }
  }
  function vider() { for (const id of ["dn-table"]) { $(id).tHead.textContent = ""; $(id).tBodies[0].textContent = ""; } $("dn-q").value = ""; }
  function verrouiller(msg) {
    if (jeton) { const j = jeton; jeton = null; Hub.call("donneesFermer", { jeton: j }).catch(() => {}); }
    clearInterval(minuteur); vider(); expire = 0; charge = false;
    $("dn-ouvert").hidden = true; $("dn-verrou").hidden = false; say($("dn-msg"), msg || "Données verrouillées.", !!msg && /fermé|réservé/i.test(msg));
    if (!msg) { const b = $("dn-rouvrir"); b.hidden = false; }
  }
  $("dn-verrouiller").onclick = () => verrouiller();
  $("dn-rouvrir").onclick = () => { $("dn-rouvrir").hidden = true; preparer(); };
  addEventListener("pagehide", () => { if (jeton) { const j = jeton; jeton = null; Hub.call("donneesFermer", { jeton: j }).catch(() => {}); } vider(); });

  // ---------- liste ----------
  async function choisirFeuille() {
    feuille = $("dn-feuille").value || feuille; debut = 0;
    const f = await appel("/donnees/filtres", { feuille });
    const gs = [...new Set(f.paires.map(p => p.g).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
    const sg = $("dn-groupe"); sg.textContent = ""; sg.append(Object.assign(document.createElement("option"), { value: "", textContent: "Tous les groupes" }));
    gs.forEach(g => sg.append(Object.assign(document.createElement("option"), { value: g, textContent: g })));
    paires = f.paires; majUnites(); await charger();
  }
  function majUnites() {
    const g = $("dn-groupe").value, su = $("dn-unite"); su.textContent = ""; su.append(Object.assign(document.createElement("option"), { value: "", textContent: "Toutes les unités" }));
    [...new Set((paires || []).filter(p => !g || p.g === g).map(p => p.u).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")).forEach(u => su.append(Object.assign(document.createElement("option"), { value: u, textContent: u })));
  }
  async function charger() {
    say($("dn-etat"), "Chargement…");
    try {
      const o = await appel("/donnees/lire", { feuille, debut, limite: PAGE, groupe: $("dn-groupe").value || undefined, unite: $("dn-unite").value || undefined });
      total = o.total; expire = Math.min(expire, o.expire || expire); charge = true;
      const cols = o.entetes.length ? o.entetes.filter(c => o.lignes.some(l => l[c] !== undefined)) : [...new Set(o.lignes.flatMap(l => Object.keys(l)))].filter(k => k !== "rang");
      const t = $("dn-table"), th = document.createElement("tr"); t.tHead.textContent = ""; t.tBodies[0].textContent = "";
      ["N°", ...cols].forEach(c => th.append(Object.assign(document.createElement("th"), { textContent: c }))); t.tHead.append(th);
      for (const l of o.lignes) { const tr = document.createElement("tr"); tr.append(Object.assign(document.createElement("td"), { textContent: l.rang })); cols.forEach(c => tr.append(Object.assign(document.createElement("td"), { textContent: l[c] === undefined ? "" : String(l[c]) }))); t.tBodies[0].append(tr); }
      $("dn-page").textContent = (total ? debut + 1 : 0) + "–" + Math.min(debut + PAGE, total) + " sur " + total;
      $("dn-prec").disabled = debut <= 0; $("dn-suiv").disabled = debut + PAGE >= total;
      $("dn-etat").dataset.n = total + " ligne" + (total > 1 ? "s" : ""); say($("dn-etat"), $("dn-etat").dataset.n); filtrer();
    } catch (e) { say($("dn-etat"), e.message, true); }
  }
  function filtrer() { const q = $("dn-q").value.trim().toLowerCase(); for (const tr of $("dn-table").tBodies[0].rows) tr.hidden = !!q && !tr.textContent.toLowerCase().includes(q); }
  $("dn-feuille").onchange = () => choisirFeuille().catch(e => say($("dn-etat"), e.message, true));
  $("dn-groupe").onchange = () => { majUnites(); debut = 0; charger(); };
  $("dn-unite").onchange = () => { debut = 0; charger(); };
  $("dn-q").oninput = filtrer;
  $("dn-prec").onclick = () => { debut = Math.max(0, debut - PAGE); charger(); };
  $("dn-suiv").onclick = () => { debut += PAGE; charger(); };
  $("dn-sync").onclick = async () => {
    say($("dn-etat"), "Synchronisation de la feuille…");
    try { const o = await appel("/donnees/sync", { feuille }); const r = o.resultat[feuille]; say($("dn-etat"), r.statut === "erreur" ? "Échec : " + r.erreur : "Synchronisée (" + r.lignes + " lignes, " + (r.statut === "inchangee" ? "inchangée" : "mise à jour") + ")."); if (r.statut !== "erreur") await charger(); }
    catch (e) { say($("dn-etat"), e.message, true); }
  };
})();
