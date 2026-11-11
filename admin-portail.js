// Console d'administration : éditeur de la mise en page du portail (glisser-déposer, masquage, textes, logos).
// Le résultat est enregistré par le serveur dans portail.json (dépôt de données privé) ; l'accueil le relit au chargement.
(() => {
  "use strict";
  if (!window.Hub || !document.getElementById("tab-portail")) return;
  const { $, say } = Hub, P = window.Portail;
  let m = null, saved = "", drag = null, editing = null;
  const clone = o => JSON.parse(JSON.stringify(o));
  const dirty = () => JSON.stringify(m) !== saved;
  const mark = () => { say($("pt-status"), dirty() ? "Modifications non enregistrées." : ""); $("pt-save").disabled = !dirty(); $("pt-undo").disabled = !dirty(); };
  const strip = model => ({ sections: model.sections.map(s => ({ id: s.id, titre: s.titre, haut: !!s.haut })), apps: model.apps.map(({ nouveau, ...a }) => a) });

  // ---------- onglets ----------
  function tab(name) {
    const p = name === "portail";
    $("tab-comptes").hidden = p; $("tab-portail").hidden = !p;
    $("tb-comptes").setAttribute("aria-selected", String(!p)); $("tb-portail").setAttribute("aria-selected", String(p));
    try { history.replaceState(null, "", p ? "#portail" : location.pathname); } catch {}
    if (p && !m) load();
  }
  $("tb-comptes").onclick = () => tab("comptes"); $("tb-portail").onclick = () => tab("portail");
  addEventListener("beforeunload", e => { if (m && dirty()) { e.preventDefault(); e.returnValue = ""; } });

  async function load() {
    say($("pt-status"), "Chargement…");
    try {
      const o = await Hub.call("portailLire");
      m = P.valid(o.portail) ? P.merge(o.portail) : P.merge(P.defaults());
      saved = JSON.stringify(m); render(); mark();
      if (!o.portail) say($("pt-status"), "Aucune mise en page enregistrée : voici les valeurs d’origine. Modifiez puis enregistrez.");
    } catch (e) { say($("pt-status"), e.message, true); }
  }

  // ---------- rendu ----------
  const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
  const btn = (t, title, fn) => el("button", { type: "button", textContent: t, title, ariaLabel: title, onclick: fn });
  function moveSec(i, d) { const j = i + d; if (j < 0 || j >= m.sections.length) return; [m.sections[i], m.sections[j]] = [m.sections[j], m.sections[i]]; render(); mark(); }
  function moveApp(a, d) {
    const same = m.apps.filter(x => x.section === a.section), i = same.indexOf(a), o = same[i + d]; if (!o) return;
    const ia = m.apps.indexOf(a), io = m.apps.indexOf(o); m.apps[ia] = o; m.apps[io] = a; render(); mark();
  }
  function render() {
    const box = $("pt-secs"); box.textContent = "";
    m.sections.forEach((s, si) => {
      const sec = el("section", { className: "pt-sec" });
      const handle = el("span", { className: "pt-handle", textContent: "⠿", title: "Glisser pour déplacer la section" });
      handle.onmousedown = () => { sec.draggable = true; }; handle.onmouseup = () => { sec.draggable = false; };
      const title = el("input", { type: "text", value: s.titre, maxLength: 60, ariaLabel: "Titre de la section" }); title.oninput = () => { s.titre = title.value; mark(); };
      const top = el("input", { type: "checkbox", checked: !!s.haut }); top.onchange = () => { s.haut = top.checked; mark(); };
      const count = m.apps.filter(a => a.section === s.id).length;
      const del = btn("Supprimer", "Supprimer la section vide", () => { m.sections.splice(si, 1); render(); mark(); }); del.disabled = count > 0; del.className = "ghost small";
      sec.append(el("div", { className: "pt-head" }, handle, title, el("label", {}, top, "Sur la ligne du haut"), btn("↑", "Monter la section", () => moveSec(si, -1)), btn("↓", "Descendre la section", () => moveSec(si, 1)), del));
      const grid = el("div", { className: "pt-grid" });
      m.apps.filter(a => a.section === s.id).forEach(a => grid.append(appCard(a)));
      if (!count) grid.append(el("p", { className: "muted", textContent: "Section vide : déposez une application ici." }));
      grid.ondragover = e => { if (drag && drag.type === "app" && e.target === grid) { e.preventDefault(); grid.classList.add("drop-end"); } };
      grid.ondragleave = () => grid.classList.remove("drop-end");
      grid.ondrop = e => { if (!drag || drag.type !== "app" || e.target !== grid) return; e.preventDefault(); grid.classList.remove("drop-end"); dropApp(drag.id, s.id, null, false); };
      sec.append(grid);
      // déplacement de section
      sec.ondragstart = e => { if (e.target !== sec) return; drag = { type: "sec", id: s.id }; sec.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.id); };
      sec.ondragend = () => { sec.draggable = false; sec.classList.remove("dragging"); clearMarks(); drag = null; };
      sec.ondragover = e => { if (!drag || drag.type !== "sec" || drag.id === s.id) return; e.preventDefault(); const r = sec.getBoundingClientRect(), before = e.clientY < r.top + r.height / 2; clearMarks(); sec.classList.add(before ? "drop-before" : "drop-after"); };
      sec.ondrop = e => { if (!drag || drag.type !== "sec" || drag.id === s.id) return; e.preventDefault(); const r = sec.getBoundingClientRect(), before = e.clientY < r.top + r.height / 2; dropSec(drag.id, s.id, before); };
      box.append(sec);
    });
  }
  function clearMarks() { document.querySelectorAll(".drop-before,.drop-after,.drop-end").forEach(n => n.classList.remove("drop-before", "drop-after", "drop-end")); }
  function dropSec(id, targetId, before) {
    const from = m.sections.findIndex(s => s.id === id), [s] = m.sections.splice(from, 1);
    let to = m.sections.findIndex(x => x.id === targetId); if (!before) to++; m.sections.splice(to, 0, s); drag = null; render(); mark();
  }
  function dropApp(id, sectionId, targetId, before) {
    const from = m.apps.findIndex(a => a.id === id); if (from < 0 || id === targetId) return;
    const [a] = m.apps.splice(from, 1); a.section = sectionId;
    let to;
    if (targetId) { to = m.apps.findIndex(x => x.id === targetId); if (!before) to++; }
    else { const last = m.apps.map(x => x.section).lastIndexOf(sectionId); to = last < 0 ? m.apps.length : last + 1; }
    m.apps.splice(to, 0, a); drag = null; render(); mark();
  }
  function appCard(a) {
    const icon = P.safeIcon(a.icone) ? a.icone : "assets/fsggb.png";
    const card = el("div", { className: "pt-app" + (a.masque ? " masque" : ""), draggable: true });
    card.append(el("img", { src: icon, alt: "" }), el("span", { className: "t" }, el("b", { textContent: a.nom }), el("small", { textContent: (a.masque ? "Masquée · " : "") + (a.protege ? "Protégée · " : "") + (a.featured ? "En avant · " : "") + a.url.replace(/^https:\/\//, "") })),
      el("span", { className: "btns" },
        btn(a.masque ? "👁‍🗨" : "👁", a.masque ? "Afficher pour tout le monde" : "Masquer aux autres", () => { a.masque = !a.masque; render(); mark(); }),
        btn("←", "Reculer", () => moveApp(a, -1)), btn("→", "Avancer", () => moveApp(a, 1)),
        btn("✎", "Modifier", () => edit(a))));
    card.ondragstart = e => { drag = { type: "app", id: a.id }; card.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", a.id); e.stopPropagation(); };
    card.ondragend = () => { card.classList.remove("dragging"); clearMarks(); drag = null; };
    card.ondragover = e => { if (!drag || drag.type !== "app" || drag.id === a.id) return; e.preventDefault(); e.stopPropagation(); const r = card.getBoundingClientRect(); clearMarks(); card.classList.add(e.clientX < r.left + r.width / 2 ? "drop-before" : "drop-after"); };
    card.ondrop = e => { if (!drag || drag.type !== "app") return; e.preventDefault(); e.stopPropagation(); const r = card.getBoundingClientRect(); dropApp(drag.id, a.section, a.id, e.clientX < r.left + r.width / 2); };
    return card;
  }

  // ---------- modification d'une application ----------
  let logo = "";
  const origIcon = a => { const d = P.defaults().apps.find(x => x.id === a.id); return d ? d.icone : "assets/fsggb.png"; };
  function edit(a) {
    editing = a || { id: "perso-" + Date.now().toString(36), section: m.sections[0].id, nom: "", desc: "", url: "", icone: "assets/fsggb.png", crop: false, featured: false, masque: false, local: false, protege: false, _new: true };
    $("app-dlg-title").textContent = editing._new ? "Nouveau lien d’application" : editing.nom;
    $("ap-nom").value = editing.nom; $("ap-desc").value = editing.desc; $("ap-url").value = editing.url;
    const sel = $("ap-sec"); sel.textContent = ""; m.sections.forEach(s => sel.append(el("option", { value: s.id, textContent: s.titre, selected: s.id === editing.section })));
    logo = editing.icone; $("ap-img").src = P.safeIcon(logo) ? logo : "assets/fsggb.png"; $("ap-file").value = "";
    $("ap-crop").checked = !!editing.crop; $("ap-feat").checked = !!editing.featured; $("ap-new").checked = !editing.local; $("ap-mask").checked = !!editing.masque; $("ap-prot").checked = !!editing.protege;
    $("ap-del").hidden = !String(editing.id).startsWith("perso-") || !!editing._new; $("ap-orig").hidden = !!editing._new || !P.defaults().apps.some(x => x.id === editing.id);
    say($("ap-status"), ""); $("dlg-app").showModal();
  }
  $("pt-add-app").onclick = () => edit(null);
  $("ap-orig").onclick = () => { logo = origIcon(editing); $("ap-img").src = logo; };
  $("ap-file").onchange = async () => {
    const f = $("ap-file").files[0]; if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 4e6) return say($("ap-status"), "Image PNG, JPEG ou WebP de 4 Mo au plus.", true);
    try {
      const bmp = await createImageBitmap(f), c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
      const k = $("ap-crop").checked ? Math.max(128 / bmp.width, 128 / bmp.height) : Math.min(128 / bmp.width, 128 / bmp.height);
      x.drawImage(bmp, (128 - bmp.width * k) / 2, (128 - bmp.height * k) / 2, bmp.width * k, bmp.height * k);
      logo = c.toDataURL("image/png"); $("ap-img").src = logo; say($("ap-status"), "");
    } catch { say($("ap-status"), "Image illisible.", true); }
  };
  $("app-form").addEventListener("submit", ev => {
    ev.preventDefault();
    const url = $("ap-url").value.trim();
    if (!P.safeUrl(url)) return say($("ap-status"), "Adresse invalide : https://… ou un dossier du portail (ex. Word/).", true);
    if (!P.safeIcon(logo)) return say($("ap-status"), "Logo invalide.", true);
    Object.assign(editing, { nom: $("ap-nom").value.trim(), desc: $("ap-desc").value.trim(), url, section: $("ap-sec").value, icone: logo, crop: $("ap-crop").checked, featured: $("ap-feat").checked, local: !$("ap-new").checked, masque: $("ap-mask").checked, protege: $("ap-prot").checked });
    if (!editing.nom) return say($("ap-status"), "Le nom est obligatoire.", true);
    if (editing._new) { delete editing._new; m.apps.push(editing); } else { const i = m.apps.findIndex(x => x.id === editing.id); if (i >= 0) m.apps[i] = editing; }
    delete editing.nouveau; $("dlg-app").close(); render(); mark();
  });
  $("ap-del").onclick = () => { if (!confirm("Supprimer ce lien ?")) return; m.apps = m.apps.filter(x => x.id !== editing.id); $("dlg-app").close(); render(); mark(); };
  document.querySelectorAll("#dlg-app [data-close]").forEach(b => b.onclick = () => $("dlg-app").close());

  // ---------- sections, annulation, enregistrement ----------
  $("pt-add-sec").onclick = () => { const t = prompt("Titre de la nouvelle section :"); if (!t || !t.trim()) return; let id = P.slug(t), n = 1; while (m.sections.some(s => s.id === id)) id = P.slug(t) + "-" + (++n); m.sections.push({ id, titre: t.trim().slice(0, 60), haut: false }); render(); mark(); };
  $("pt-undo").onclick = () => { m = JSON.parse(saved); render(); mark(); };
  $("pt-reset").onclick = () => { if (!confirm("Revenir à la mise en page d’origine (config.js) ? Vos liens personnalisés seront retirés (rien n’est enregistré tant que vous ne cliquez pas sur Enregistrer).")) return; m = P.merge(P.defaults()); render(); mark(); };
  $("pt-save").onclick = async () => {
    say($("pt-status"), "Enregistrement dans GitHub…"); $("pt-save").disabled = true;
    try {
      const o = await Hub.call("portailEcrire", { portail: strip(m) });
      try { localStorage.setItem("scouthub.portail", JSON.stringify(o.portail)); } catch {}
      m = P.merge(o.portail); saved = JSON.stringify(m); render(); mark(); say($("pt-status"), "Enregistré. L’accueil est à jour pour tout le monde (au plus quelques minutes).");
    } catch (e) { say($("pt-status"), e.message, true); $("pt-save").disabled = false; }
  };
  if (location.hash === "#portail") tab("portail");
})();
