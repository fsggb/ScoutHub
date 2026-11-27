// Applications et documentation ajoutées par l'administrateur, chacune avec SON public (filtré côté serveur : une entrée qui
// ne concerne pas la personne ne lui est jamais envoyée). Ce fichier ne fournit que la boîte « Ajouter / modifier ».
(() => {
  "use strict";
  const PUBLICS = [["all", "Tous les membres de la fédération"], ["chef_unite", "Chefs d’unité et au-dessus"], ["chef_groupe", "Chefs de groupe et au-dessus"], ["equipe_nationale", "Équipe nationale et administrateur"], ["admin", "Administrateur seulement"], ["g", "Un groupe précis"], ["u", "Une unité précise"]];
  const el = (tag, props, ...enfants) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...enfants); return e; };
  let gu = null;
  const groupesUnites = async () => gu || (gu = await Hub.call("groupes"));
  const libelle = (audience, g) => (audience || []).map(a => { const p = PUBLICS.find(x => x[0] === a); if (p) return p[1]; if (g) { if (a.startsWith("g:")) { const x = g.groupes.find(y => y.id === a.slice(2)); return x ? "Groupe : " + x.nom : a; } if (a.startsWith("u:")) { const x = g.unites.find(y => y.id === a.slice(2)); return x ? "Unité : " + x.nom : a; } } return a; }).join(" · ");

  // section : « outils » | « documentation » ; entree : null (ajout) ou { id, nom, description, url, audience: [...] } ; apres : rappelé après enregistrement.
  async function dialogue(section, entree, apres) {
    let g; try { g = await groupesUnites(); } catch { g = { groupes: [], unites: [] }; }
    const dlg = el("dialog", { className: "entree-dlg" }), f = el("form", { method: "dialog" });
    const champ = (id, lib, props) => [el("label", { htmlFor: id, textContent: lib }), Object.assign(el("input", { id }), props)];
    const nom = champ("en-nom", "Nom affiché", { maxLength: 60, required: true, value: entree ? entree.nom : "" });
    const desc = champ("en-desc", "Description (facultative)", { maxLength: 200, value: entree ? entree.description : "" });
    const adr = champ("en-url", "Adresse (https://…)", { type: "url", maxLength: 1500, required: true, placeholder: "https://", value: entree ? entree.url : "" });
    const premier = entree && entree.audience && entree.audience[0] ? entree.audience[0] : "all";
    const type = el("select", { id: "en-public" }); PUBLICS.forEach(([v, t]) => type.append(el("option", { value: v, textContent: t })));
    type.value = /^g:/.test(premier) ? "g" : /^u:/.test(premier) ? "u" : premier;
    const selG = el("select", { id: "en-g" }), selU = el("select", { id: "en-u" });
    g.groupes.forEach(x => selG.append(el("option", { value: "g:" + x.id, textContent: x.nom })));
    g.unites.forEach(x => selU.append(el("option", { value: "u:" + x.id, textContent: x.nom })));
    if (/^g:/.test(premier)) selG.value = premier; if (/^u:/.test(premier)) selU.value = premier;
    const maj = () => { selG.hidden = type.value !== "g"; selU.hidden = type.value !== "u"; }; type.onchange = maj; maj();
    const etat = el("p", { className: "status", role: "status" });
    const note = entree && entree.audience && entree.audience.length > 1 ? el("p", { className: "hint", textContent: "Public actuel : " + libelle(entree.audience, g) + ". Le changer le remplace par votre choix." }) : null;
    const enreg = el("button", { type: "submit", className: "primary", textContent: "Enregistrer" }), annul = el("button", { type: "button", className: "ghost", textContent: "Annuler" });
    const supp = entree ? el("button", { type: "button", className: "text-danger", textContent: "Supprimer" }) : null;
    f.append(el("h2", { textContent: (entree ? "Modifier" : "Ajouter") + (section === "outils" ? " une application" : " un document") }), ...nom, ...desc, ...adr,
      el("label", { htmlFor: "en-public", textContent: "Qui est concerné ?" }), type, selG, selU, ...(note ? [note] : []),
      el("p", { className: "hint", textContent: "Seules les personnes concernées voient cette entrée : les autres ne reçoivent rien, pas même son nom." }), etat,
      el("div", { className: "dlg-actions" }, ...(supp ? [supp] : []), annul, enreg));
    dlg.append(f); document.body.append(dlg); dlg.showModal();
    const fermer = () => { dlg.close(); dlg.remove(); };
    annul.onclick = fermer; dlg.addEventListener("cancel", () => dlg.remove());
    f.onsubmit = async ev => {
      ev.preventDefault(); enreg.disabled = true; etat.textContent = "Enregistrement…"; etat.classList.remove("error");
      const choix = type.value === "g" ? selG.value : type.value === "u" ? selU.value : type.value;
      const inchange = entree && note && choix === (entree.audience[0] || "") && type.value === (/^g:/.test(premier) ? "g" : /^u:/.test(premier) ? "u" : premier);
      try { await Hub.call("entreeEcrire", { section, id: entree ? entree.id : undefined, nom: nom[1].value, description: desc[1].value, url: adr[1].value, audience: inchange ? entree.audience : [choix] }); fermer(); if (apres) apres(); }
      catch (e) { etat.textContent = e.message; etat.classList.add("error"); enreg.disabled = false; }
    };
    if (supp) supp.onclick = async () => { if (!confirm("Supprimer « " + entree.nom + " » ?")) return; try { await Hub.call("entreeSupprimer", { id: entree.id }); fermer(); if (apres) apres(); } catch (e) { etat.textContent = e.message; etat.classList.add("error"); } };
  }
  window.Entrees = { dialogue, libelle, groupesUnites };
})();
