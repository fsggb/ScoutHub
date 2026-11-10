// ChatGDB : assistant IA de la fédération, en pleine page.
// Le serveur (backend/Code.gs, action « chat ») appelle Claude avec la recherche web native ; la clé reste côté serveur.
// Tant que le serveur ne l'ouvre pas pour ce compte, l'interface reste complète mais l'envoi est refusé poliment.
(async () => {
  "use strict";
  const { $ } = Hub;
  const CFG = Object.assign({ live: false, windowHours: 5, windowCredits: 30, weekCredits: 150, earn: { minutes: 5, credits: 1, weekCap: 50 } }, window.SCOUTHUB_CHATGDB || {});
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  // ---------- utilisateur ----------
  const user = Hub.cachedUser() || (Hub.token ? await Hub.requireUser() : null);
  if (!user) { $("guest").hidden = false; return; }
  Hub.call("me").then(o => { Hub.user = o.user; Hub.cacheUser(o.user); }).catch(() => Hub.toLogin());
  const app = $("app"); app.hidden = false;
  const first = (user.name || user.email.split("@")[0]).split(/[ ._-]+/)[0];
  const pretty = s => s.charAt(0).toUpperCase() + s.slice(1);
  $("me-name").textContent = user.name || pretty(user.email.split("@")[0].replace(/[._-]+/g, " "));
  $("me-role").textContent = Hub.ROLE_LABELS[user.role] || "Membre";
  $("me-avatar").textContent = first.charAt(0).toUpperCase();

  // ---------- utilitaires ----------
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ic = (n, cls = "") => `<svg class="ic ${cls}"><use href="#i-${n}"/></svg>`;
  const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  let toastTimer = 0;
  const toast = t => { const n = $("toast"); n.textContent = t; n.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => n.hidden = true, 2600); };
  const copy = async t => { try { await navigator.clipboard.writeText(t); } catch { const a = el("textarea", { value: t }); document.body.append(a); a.select(); try { document.execCommand("copy"); } catch {} a.remove(); } toast("Copié dans le presse-papiers."); };
  const download = (name, text, mime) => { const a = el("a", { href: URL.createObjectURL(new Blob([text], { type: mime + ";charset=utf-8" })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000); };
  const safeName = s => (String(s).replace(/[^\wÀ-ſ .-]+/g, "").trim() || "fichier").slice(0, 60);

  // ---------- logo (celui de la boutique, récupéré une fois depuis le Drive puis mémorisé) ----------
  const LOGO_KEY = "scouthub.chatgdb.logo";
  function applyLogo(uri) { document.querySelectorAll("img.logo, .who img").forEach(i => { i.src = uri; }); LOGO.uri = uri; }
  const LOGO = { uri: "../assets/icons/ChatGDB.svg" };
  const cachedLogo = store.get(LOGO_KEY, "");
  if (/^data:image\/(png|jpeg|webp);base64,/.test(cachedLogo)) applyLogo(cachedLogo);
  else Hub.call("logo").then(o => { if (/^data:image\/(png|jpeg|webp);base64,/.test(o.data || "")) { store.set(LOGO_KEY, o.data); applyLogo(o.data); } }).catch(() => {});

  // ---------- Markdown sûr : tout est échappé d'abord, seuls quelques motifs sont rendus ----------
  let curSources = [];
  const inline = t => {
    let h = esc(t);
    h = h.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>").replace(/~~([^~]+)~~/g, "<del>$1</del>");
    h = h.replace(/!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)/g, '<img class="mdimg" src="$2" alt="$1" loading="lazy" referrerpolicy="no-referrer">');
    h = h.replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    if (curSources.length) h = h.replace(/\[(\d{1,2})\](?!\()/g, (m, n) => +n >= 1 && +n <= curSources.length ? `<a class="cite" data-n="${n}" href="#" title="${esc(curSources[n - 1].title)}">${n}</a>` : m);
    return h;
  };
  function md(src) {
    const lines = String(src || "").replace(/\r/g, "").split("\n"); let out = "", i = 0;
    const cells = l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
    while (i < lines.length) {
      const l = lines[i]; let m;
      if ((m = /^```\s*([\w+-]*)/.exec(l))) { const code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]); i++; out += `<div class="pre"><div class="pre-h"><span>${esc(m[1] || "code")}</span><button type="button" data-copy>${ic("copy", "sm")} Copier</button></div><pre><code>${esc(code.join("\n"))}</code></pre></div>`; continue; }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        const head = cells(l); i += 2; const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
        out += "<table><thead><tr>" + head.map(h => `<th>${inline(h)}</th>`).join("") + "</tr></thead><tbody>" + rows.map(r => "<tr>" + r.map(c => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table>"; continue;
      }
      if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { const n = Math.min(5, Math.max(3, m[1].length + 2)); out += `<h${n}>${inline(m[2])}</h${n}>`; i++; continue; }
      if (/^\s*(---+|\*\*\*+)\s*$/.test(l)) { out += "<hr>"; i++; continue; }
      if (/^>\s?/.test(l)) { const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, "")); out += `<blockquote>${md(q.join("\n"))}</blockquote>`; continue; }
      if (/^\s*([-*]|\d+[.)])\s+/.test(l)) {
        const ordered = /^\s*\d+[.)]/.test(l), items = [];
        while (i < lines.length && /^\s*([-*]|\d+[.)])\s+/.test(lines[i])) {
          const t = lines[i++].replace(/^\s*([-*]|\d+[.)])\s+/, ""), task = /^\[( |x|X)\]\s+(.*)$/.exec(t);
          items.push(task ? `<li style="list-style:none;margin-left:-1.2em">${task[1] === " " ? "☐" : "☑"} ${inline(task[2])}</li>` : `<li>${inline(t)}</li>`);
        }
        out += `<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`; continue;
      }
      if (!l.trim()) { i++; continue; }
      const p = []; while (i < lines.length && lines[i].trim() && !/^(```|#{1,6}\s|>\s?|\s*([-*]|\d+[.)])\s+|\s*\|)/.test(lines[i])) p.push(lines[i++]);
      out += `<p>${inline(p.join("\n")).replace(/\n/g, "<br>")}</p>`;
    }
    return out;
  }

  // ---------- artefacts : <artifact id="" type="" title="">…</artifact> ----------
  const KINDS = {
    markdown: { ico: "file", label: "Document", ext: "md", mime: "text/markdown" },
    html: { ico: "globe", label: "Page web interactive", ext: "html", mime: "text/html" },
    svg: { ico: "image", label: "Image vectorielle", ext: "svg", mime: "image/svg+xml" },
    csv: { ico: "table", label: "Tableau", ext: "csv", mime: "text/csv" },
    code: { ico: "code", label: "Code", ext: "txt", mime: "text/plain" }
  };
  function parse(text) {
    const segs = []; let last = 0, n = 0; const re = /<artifact\b([^>]*)>([\s\S]*?)(?:<\/artifact>|$)/g; let m;
    while ((m = re.exec(text || ""))) {
      if (m.index > last) segs.push({ t: "text", v: text.slice(last, m.index) });
      const at = {}; m[1].replace(/(\w+)="([^"]*)"/g, (_, k, v) => at[k] = v);
      const type = KINDS[at.type] ? at.type : "code";
      segs.push({ t: "art", id: at.id || "a" + (++n), type, title: at.title || KINDS[type].label, lang: at.lang || "", content: m[2].replace(/^\n/, "").replace(/\n$/, "") });
      last = re.lastIndex; if (m[0].length === 0) break;
    }
    if (last < (text || "").length) segs.push({ t: "text", v: text.slice(last) });
    return segs;
  }
  const versionsOf = (conv, id) => { const v = []; conv.messages.forEach(m => { if (m.role !== "user") parse(m.text).forEach(s => { if (s.t === "art" && s.id === id) { s.msg = m; v.push(s); } }); }); return v; };

  // ---------- conversation d'exemple (non stockée, lecture seule) ----------
  const EXAMPLE = { id: "exemple", title: "Exemple : préparer un week-end de troupe", example: true, updated: Infinity, messages: [
    { role: "user", text: "Prépare-moi une check-list de matériel pour un week-end de troupe, et un petit planning que je puisse cocher." },
    { role: "assistant", text: `Voici deux documents prêts à adapter. La check-list est organisée par thème ; le planning est interactif : vous pouvez cocher les créneaux réalisés.

<artifact id="checklist" type="markdown" title="Check-list de matériel : week-end de troupe">
# Check-list de matériel : week-end de troupe

## Couchage
- [ ] Sac de couchage adapté à la saison
- [ ] Tapis de sol
- [ ] Oreiller ou vêtement roulé

## Cuisine d'équipe
- [ ] Marmites et réchauds
- [ ] Bidons d'eau et pastilles de purification
- [ ] Produits de vaisselle et éponges

## Sécurité
- [ ] Trousse de premiers secours complète
- [ ] Fiches sanitaires de chaque jeune
- [ ] Téléphone chargé et numéros d'urgence

> Pensez à vérifier la météo la veille du départ.
</artifact>

<artifact id="planning" type="html" title="Planning du week-end">
<!doctype html><html lang="fr"><meta charset="utf-8"><style>
body{font-family:Georgia,serif;margin:0;padding:24px;color:#0a0c25;background:#fff}h1{font-size:22px;color:#000761;margin:0 0 4px}p{color:#6a6c79;margin:0 0 16px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #e7e4dc;padding:9px 12px;text-align:left}th{background:#faf6ea;color:#ab8b4e;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
tr.done td{color:#9a9ca8;text-decoration:line-through}input{width:18px;height:18px;accent-color:#000761}#n{margin-top:14px;font-weight:600;color:#000761}</style>
<h1>Planning du week-end</h1><p>Cochez les créneaux réalisés.</p>
<table><thead><tr><th></th><th>Horaire</th><th>Activité</th></tr></thead><tbody>
<tr><td><input type="checkbox"></td><td>Samedi 9 h</td><td>Montage du camp</td></tr>
<tr><td><input type="checkbox"></td><td>Samedi 14 h</td><td>Grand jeu en forêt</td></tr>
<tr><td><input type="checkbox"></td><td>Samedi 20 h</td><td>Veillée</td></tr>
<tr><td><input type="checkbox"></td><td>Dimanche 10 h</td><td>Messe ou temps spirituel</td></tr>
<tr><td><input type="checkbox"></td><td>Dimanche 15 h</td><td>Rangement et départ</td></tr></tbody></table>
<div id="n">0 / 5 créneaux réalisés</div>
<script>var c=document.querySelectorAll("input");c.forEach(function(i){i.onchange=function(){i.closest("tr").className=i.checked?"done":"";document.getElementById("n").textContent=document.querySelectorAll("input:checked").length+" / 5 créneaux réalisés"}})</script></html>
</artifact>

Dites-moi si vous voulez ajouter une colonne ou changer les horaires.` },
    { role: "user", text: "Ajoute une colonne « Responsable » au planning." },
    { role: "assistant", text: `C'est fait : j'ai ajouté la colonne. Elle est modifiable directement dans la page, et la version précédente reste consultable dans l'artefact.

<artifact id="planning" type="html" title="Planning du week-end (avec responsables)">
<!doctype html><html lang="fr"><meta charset="utf-8"><style>
body{font-family:Georgia,serif;margin:0;padding:24px;color:#0a0c25;background:#fff}h1{font-size:22px;color:#000761;margin:0 0 4px}p{color:#6a6c79;margin:0 0 16px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #e7e4dc;padding:9px 12px;text-align:left}th{background:#faf6ea;color:#ab8b4e;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
td[contenteditable]{background:#fffdf4}input{width:18px;height:18px;accent-color:#000761}</style>
<h1>Planning du week-end</h1><p>Cliquez dans la colonne « Responsable » pour la remplir.</p>
<table><thead><tr><th></th><th>Horaire</th><th>Activité</th><th>Responsable</th></tr></thead><tbody>
<tr><td><input type="checkbox"></td><td>Samedi 9 h</td><td>Montage du camp</td><td contenteditable></td></tr>
<tr><td><input type="checkbox"></td><td>Samedi 14 h</td><td>Grand jeu en forêt</td><td contenteditable></td></tr>
<tr><td><input type="checkbox"></td><td>Samedi 20 h</td><td>Veillée</td><td contenteditable></td></tr>
<tr><td><input type="checkbox"></td><td>Dimanche 10 h</td><td>Messe ou temps spirituel</td><td contenteditable></td></tr>
<tr><td><input type="checkbox"></td><td>Dimanche 15 h</td><td>Rangement et départ</td><td contenteditable></td></tr></tbody></table></html>
</artifact>` }
  ] };

  // ---------- état, préférences, conversations ----------
  const PREFS_KEY = "scouthub.chatgdb.prefs";
  const prefs = Object.assign({ custom: "", web: true, style: "concise" }, store.get(PREFS_KEY, {}));
  const KEY = "scouthub.chatgdb.v3:" + user.email;
  let convs = store.get(KEY, []).filter(c => c && Array.isArray(c.messages));
  let isAdmin = false, current = null, openArtId = null, openArtVer = 0, tab = "prev", busy = false, live = !!CFG.live, abort = null, pending = [], webOn = prefs.web;
  const persist = () => store.set(KEY, convs.slice(0, 100));

  // ---------- thème, panneau ----------
  const setTheme = t => { app.dataset.theme = t; store.set("scouthub.chatgdb.theme", t); $("theme").innerHTML = ic(t === "dark" ? "sun" : "moon"); };
  setTheme(store.get("scouthub.chatgdb.theme", "light"));
  $("theme").onclick = () => setTheme(app.dataset.theme === "dark" ? "light" : "dark");
  const mobile = () => matchMedia("(max-width:900px)").matches;
  app.dataset.side = mobile() ? "closed" : "open";
  const setSide = o => { app.dataset.side = o ? "open" : "closed"; $("scrim").hidden = !(o && mobile()); };
  matchMedia("(max-width:900px)").addEventListener("change", e => setSide(!e.matches));
  $("side-toggle").onclick = () => setSide(app.dataset.side !== "open"); $("scrim").onclick = () => setSide(false);

  // ---------- crédits (format serveur : { fenetre:{max,utilise,reste,renouvellement}, semaine:{…} }) ----------
  function credits(c) {
    const w = c ? c.fenetre : { max: CFG.windowCredits, utilise: 0, reste: CFG.windowCredits, renouvellement: "" };
    const k = c ? c.semaine : { max: CFG.weekCredits, utilise: 0, reste: CFG.weekCredits, renouvellement: "", bonus: 0 };
    const inf = !!(c && c.illimite);
    const fill = (bar, txt, o) => { const pct = inf ? 100 : (o.max ? Math.round(o.reste / o.max * 100) : 0); $(bar).style.width = pct + "%"; $(bar).classList.toggle("low", !inf && pct <= 15); $(txt).textContent = inf ? "Illimité" : o.reste + " / " + o.max; };
    fill("cm-bar", "cm-txt", w); fill("d-win", "d-win-txt", w); fill("d-week", "d-week-txt", k);
    $("d-hours").textContent = $("d-hours2").textContent = CFG.windowHours;
    $("d-win-reset").textContent = inf ? "Compte administrateur : aucune limite, consommation suivie dans « Consommation »." : "Se renouvelle " + (w.renouvellement || `${CFG.windowHours} h après votre première question`);
    $("d-week-reset").textContent = inf ? "" : "Se renouvelle " + (k.renouvellement || "chaque semaine") + (k.bonus ? " · dont " + k.bonus + " crédit(s) gagnés" : "");
    $("d-earn").textContent = `Utiliser les applications de ScoutHub rapporte des crédits : ${CFG.earn.credits} crédit toutes les ${CFG.earn.minutes} minutes d’activité, jusqu’à ${CFG.earn.weekCap} par semaine.`;
  }
  credits();
  const openCredits = () => $("dlg-credits").showModal();
  $("credits-open").onclick = openCredits; $("m-credits").onclick = () => { closeMenu(); openCredits(); };
  document.querySelectorAll("dialog [data-close]").forEach(b => b.onclick = () => b.closest("dialog").close());
  // Le serveur dit si ChatGDB est ouvert pour ce compte.
  Hub.call("credits").then(o => { if (o.chat) live = true; if (o.credits) credits(o.credits); if (o.admin) { isAdmin = true; $("m-memory").hidden = $("m-conso").hidden = false; } }).catch(() => {}).finally(() => { $("soon").hidden = live; if (!live && !current?.example) notice("ChatGDB n’est pas encore activé : l’interface est prête, l’envoi sera ouvert prochainement."); updateSend(); });

  // ---------- menu et préférences ----------
  const menu = $("menu"), closeMenu = () => menu.hidden = true;
  $("menu-open").onclick = ev => { ev.stopPropagation(); menu.hidden = !menu.hidden; };
  document.addEventListener("click", e => { if (!menu.contains(e.target)) closeMenu(); });
  $("m-out").onclick = () => Hub.logout();
  $("m-settings").onclick = () => { closeMenu(); $("set-custom").value = prefs.custom; $("set-web").checked = prefs.web; $("set-style").value = prefs.style; $("dlg-settings").showModal(); };
  $("set-save").onclick = () => { prefs.custom = $("set-custom").value.trim().slice(0, 600); prefs.web = $("set-web").checked; prefs.style = $("set-style").value; store.set(PREFS_KEY, prefs); webOn = prefs.web; $("mode").value = prefs.style; syncWeb(); $("dlg-settings").close(); toast("Préférences enregistrées."); };
  const clearAll = () => { if (confirm("Supprimer toutes vos conversations ChatGDB sur cet appareil ?")) { convs = []; persist(); show(null); $("dlg-settings").close(); } };
  $("set-clear").onclick = clearAll;

  // ---------- administrateur : mémoire de ChatGDB et consommation ----------
  let memSel = "";
  const memStatus = (t, err) => { $("mem-status").textContent = t || ""; $("mem-status").classList.toggle("error", !!err); };
  function memForm(n) { memSel = n ? n.id : ""; $("mem-titre").value = n ? n.titre : ""; $("mem-mots").value = n ? n.mots : ""; $("mem-contenu").value = n ? n.contenu : ""; $("mem-del").hidden = !n; document.querySelectorAll("#mem-items li").forEach(li => li.classList.toggle("on", li.dataset.id === memSel)); }
  async function memLoad() {
    memStatus("Chargement…"); const ul = $("mem-items"); ul.textContent = "";
    try {
      const { notes } = await Hub.call("memoire", { op: "liste" }); memStatus(notes.length ? "" : "Aucune note pour l’instant : créez la première.");
      notes.forEach(n => { const li = el("li", { innerHTML: esc(n.titre) + "<small>" + esc(n.resume || "") + "</small>" }); li.dataset.id = n.id; li.onclick = async () => { try { memStatus("Chargement…"); const { note } = await Hub.call("memoire", { op: "lire", id: n.id }); memForm(note); memStatus(""); } catch (e) { memStatus(e.message, true); } }; ul.append(li); });
    } catch (e) { memStatus(e.message, true); }
  }
  $("m-memory").onclick = () => { closeMenu(); memForm(null); $("dlg-memory").showModal(); memLoad(); };
  $("mem-new").onclick = () => memForm(null);
  $("mem-form").addEventListener("submit", async ev => { ev.preventDefault(); try { memStatus("Enregistrement…"); const { note } = await Hub.call("memoire", { op: "ecrire", id: memSel, titre: $("mem-titre").value, mots: $("mem-mots").value, contenu: $("mem-contenu").value }); memStatus("Note enregistrée."); await memLoad(); memSel = note.id; document.querySelectorAll("#mem-items li").forEach(li => li.classList.toggle("on", li.dataset.id === memSel)); $("mem-del").hidden = false; } catch (e) { memStatus(e.message, true); } });
  $("mem-del").onclick = async () => { if (!memSel || !confirm("Supprimer cette note de la mémoire ?")) return; try { await Hub.call("memoire", { op: "supprimer", id: memSel }); memForm(null); memLoad(); } catch (e) { memStatus(e.message, true); } };
  const eur = n => (n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " $";
  $("m-conso").onclick = async () => {
    closeMenu(); $("dlg-conso").showModal(); const st = $("conso-status"); st.textContent = "Chargement…"; st.classList.remove("error");
    try {
      const { stats: s } = await Hub.call("consommation"); st.textContent = "Mois en cours : " + s.mois + (s.memoire.configuree ? " · " + s.memoire.notes + " note(s) en mémoire" : " · mémoire non configurée");
      const box = $("conso-stats"); box.textContent = "";
      [["Questions", s.appels], ["Recherches web", s.recherches], ["Jetons lus", s.entree.toLocaleString("fr-FR")], ["Jetons écrits", s.sortie.toLocaleString("fr-FR")], ["Coût estimé", eur(s.cout)]].forEach(([k, v]) => box.append(el("div", { className: "stat", innerHTML: "<b>" + esc(v) + "</b><span>" + esc(k) + "</span>" })));
      const days = $("conso-days"); days.textContent = ""; const mx = Math.max(0.0001, ...s.jours.map(d => d.cout));
      s.jours.forEach(d => days.append(el("i", { title: d.jour + " : " + d.appels + " question(s), " + eur(d.cout), style: "height:" + Math.max(4, Math.round(d.cout / mx * 100)) + "%" })));
      const tb = $("conso-users"); tb.textContent = "";
      s.utilisateurs.forEach(u => tb.append(el("tr", { innerHTML: "<td>" + esc(u.email) + "</td><td>" + u.appels + "</td><td>" + u.recherches + "</td><td>" + u.entree.toLocaleString("fr-FR") + " / " + u.sortie.toLocaleString("fr-FR") + "</td><td>" + eur(u.cout) + "</td>" })));
    } catch (e) { st.textContent = e.message; st.classList.add("error"); }
  };

  // ---------- liste des conversations ----------
  const when = ts => { const now = new Date(), day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); return ts >= day ? "Aujourd’hui" : ts >= day - 864e5 ? "Hier" : ts >= day - 6 * 864e5 ? "7 derniers jours" : "Plus ancien"; };
  function drawList() {
    const box = $("convs"); box.textContent = ""; const q = $("q").value.trim().toLowerCase();
    const mine = convs.filter(c => !q || (c.title + " " + c.messages.map(m => m.text).join(" ")).toLowerCase().includes(q)).sort((a, b) => b.updated - a.updated);
    const add = (label, items) => { if (!items.length) return; box.append(el("div", { className: "grp", textContent: label })); items.forEach(c => {
      const row = el("div", { className: "conv" + (current && current.id === c.id ? " on" : ""), role: "button", tabIndex: 0 }, el("span", { textContent: c.title, title: c.title }));
      if (!c.example) { const x = el("button", { className: "x", type: "button", ariaLabel: "Supprimer la conversation", title: "Supprimer", innerHTML: ic("trash", "sm") }); x.onclick = ev => { ev.stopPropagation(); if (confirm("Supprimer cette conversation ?")) { convs = convs.filter(k => k !== c); persist(); if (current === c) show(null); else drawList(); } }; row.append(x); }
      row.onclick = () => { show(c); if (mobile()) setSide(false); }; row.onkeydown = e => { if (e.key === "Enter") row.click(); }; box.append(row); }); };
    add("Épinglées", mine.filter(c => c.pinned));
    if (!q || EXAMPLE.title.toLowerCase().includes(q)) add("Exemple", [EXAMPLE]);
    ["Aujourd’hui", "Hier", "7 derniers jours", "Plus ancien"].forEach(g => add(g, mine.filter(c => !c.pinned && when(c.updated) === g)));
    if (!mine.length && !q) box.append(el("p", { className: "empty", textContent: "Vos conversations apparaîtront ici." }));
    else if (!mine.length && !box.querySelector(".conv")) box.append(el("p", { className: "empty", textContent: "Aucun résultat." }));
  }
  $("q").addEventListener("input", drawList);

  // ---------- fil de discussion ----------
  const SUGG = [
    ["pencil", "Rédiger", "Rédige une lettre aux parents pour annoncer le camp d’été."],
    ["compass", "Orientation", "Comment préparer un itinéraire et des azimuts pour un raid sur Cartes IGN ?"],
    ["tree", "Froissartage", "Comment concevoir un banc dans CathIA et sortir le plan coté ?"],
    ["chart", "Budget", "Aide-moi à construire un tableau de budget de camp dans Excel."],
    ["shop", "Boutique", "Quels articles trouver pour l’uniforme d’un louveteau ?"],
    ["book", "Documents scouts", "Que dit la réglementation sur les effectifs d’encadrement en camp ?"]
  ];
  function welcome() {
    const box = el("div", { className: "welcome" });
    box.append(el("img", { className: "logo", src: LOGO.uri, alt: "" }), el("h2", { textContent: "Bonjour " + first + ", comment puis-je vous aider ?" }), el("p", { textContent: "Je connais les applications de la fédération et ses documents." }));
    const cards = el("div", { className: "cards" });
    SUGG.forEach(([i, h, t]) => { const c = el("button", { className: "card", type: "button" }, el("span", { className: "ci", innerHTML: ic(i) }), el("b", { textContent: h }), el("small", { textContent: t })); c.onclick = () => { $("input").value = t; autosize(); $("input").focus(); }; cards.append(c); });
    const caps = el("div", { className: "caps" });
    [["globe", "Recherche sur le web"], ["image", "Lit vos images"], ["file", "Lit vos PDF"], ["code", "Crée documents, pages et tableaux"], ["book", "Connaît les outils de la fédération"]].forEach(([i, t]) => caps.append(el("span", { className: "cap", innerHTML: ic(i) + esc(t) })));
    box.append(cards, caps); return box;
  }
  function attsOf(m) {
    if (!m.atts || !m.atts.length) return null;
    const box = el("div", { className: "thumbs" });
    m.atts.forEach(a => box.append(a.t ? el("img", { className: "thumb", src: a.t, alt: a.n }) : el("span", { className: "filechip", innerHTML: ic("file") + esc(a.n) })));
    return box;
  }
  function botBody(m, conv) {
    const body = el("div", { className: "body" });
    if (m.searches && m.searches.length) body.append(el("div", { className: "search-note", innerHTML: ic("globe") + "Recherche sur le web : " + esc(m.searches.join(" · ")) }));
    curSources = m.sources || [];
    const wrap = el("div", { className: "md" });
    parse(m.text).forEach(s => {
      if (s.t === "text") { if (s.v.trim()) wrap.insertAdjacentHTML("beforeend", md(s.v)); return; }
      const k = KINDS[s.type], vers = versionsOf(conv, s.id), idx = Math.max(0, vers.findIndex(x => x.msg === m));
      const card = el("button", { className: "afc" + (openArtId === s.id ? " on" : ""), type: "button" },
        el("span", { className: "ico", innerHTML: ic(k.ico) }), el("span", {}, el("b", { textContent: s.title }), el("small", { textContent: k.label + (vers.length > 1 ? " · version " + (idx + 1) + " sur " + vers.length : "") })), el("span", { className: "go", innerHTML: "Ouvrir" + ic("chev") }));
      card.onclick = () => openArt(conv, s.id, idx); wrap.append(card);
    });
    body.append(wrap);
    if (m.sources && m.sources.length) { const src = el("div", { className: "sources" }); m.sources.forEach((s, i) => src.append(el("a", { className: "src", id: "src-" + i, href: s.url, target: "_blank", rel: "noopener noreferrer", innerHTML: `<i>${i + 1}</i><span><b>${esc(s.title)}</b><small>${esc(host(s.url))}</small></span>` }))); body.append(src); }
    curSources = [];
    (m.proposals || []).forEach(p => body.append(proposalCard(p)));
    return body;
  }
  function proposalCard(p) {
    const box = el("div", { className: "proposal" }, el("b", { innerHTML: ic("book") + "Retenir dans la mémoire : " + esc(p.titre) }), el("p", { textContent: p.contenu }));
    if (p.state === "ok") box.append(el("div", { className: "row" }, el("span", { className: "muted", textContent: "Enregistré dans la mémoire." })));
    else if (p.state === "no") box.append(el("div", { className: "row" }, el("span", { className: "muted", textContent: "Ignoré." })));
    else {
      const ok = el("button", { className: "btn primary small", type: "button", textContent: "Enregistrer" }), no = el("button", { className: "btn small", type: "button", textContent: "Ignorer" });
      ok.onclick = async () => { ok.disabled = true; try { await Hub.call("memoire", { op: "ecrire", titre: p.titre, mots: p.mots, contenu: p.contenu }); p.state = "ok"; persist(); drawThread(false); toast("Note enregistrée dans la mémoire."); } catch (e) { ok.disabled = false; toast(e.message); } };
      no.onclick = () => { p.state = "no"; persist(); drawThread(false); };
      box.append(el("div", { className: "row" }, no, ok));
    }
    return box;
  }
  function drawThread(scroll = true) {
    const th = $("thread"); th.textContent = "";
    if (!current || !current.messages.length) { th.append(welcome()); return; }
    if (current.example) th.append(el("div", { className: "example-note", textContent: "Exemple de conversation : elle montre ce que ChatGDB saura produire (documents, pages interactives, tableaux, images). Les réponses de cet exemple ne viennent pas de l’IA." }));
    current.messages.forEach((m, i) => {
      const msg = el("div", { className: "msg " + (m.role === "user" ? "user" : "bot") });
      msg.append(m.role === "user" ? el("span", { className: "who", textContent: first.charAt(0).toUpperCase() }) : el("span", { className: "who" }, el("img", { src: LOGO.uri, alt: "" })));
      const last = i === current.messages.length - 1, acts = el("div", { className: "actions" });
      const btn = (i2, label, title, fn) => { const b = el("button", { type: "button", title, ariaLabel: title, innerHTML: ic(i2) + (label ? esc(label) : "") }); b.onclick = fn; acts.append(b); return b; };
      if (m.role === "user") {
        const body = el("div", { className: "body" }), a = attsOf(m); if (a) body.append(a);
        body.append(el("div", { className: "bubble", textContent: m.text }));
        if (!current.example && live && !busy) { btn("pencil", "", "Modifier le message", () => editMsg(i, body)); }
        body.append(acts); msg.append(body);
      } else {
        const body = botBody(m, current);
        btn("copy", "Copier", "Copier la réponse", () => copy(m.text.replace(/<\/?artifact[^>]*>/g, "")));
        const up = btn("up", "", "Bonne réponse", () => { m.fb = m.fb === "up" ? "" : "up"; persist(); up.classList.toggle("on", m.fb === "up"); dn.classList.remove("on"); toast("Merci pour votre retour."); });
        const dn = btn("down", "", "Réponse insuffisante", () => { m.fb = m.fb === "down" ? "" : "down"; persist(); dn.classList.toggle("on", m.fb === "down"); up.classList.remove("on"); toast("Merci, nous en tenons compte."); });
        up.classList.toggle("on", m.fb === "up"); dn.classList.toggle("on", m.fb === "down");
        if (!current.example && last && live && !busy) btn("refresh", "Régénérer", "Régénérer la réponse", () => regenerate());
        body.append(acts); msg.append(body);
      }
      th.append(msg);
    });
    if (busy) th.append(el("div", { className: "msg bot" }, el("span", { className: "who" }, el("img", { src: LOGO.uri, alt: "" })), el("div", { className: "body" }, el("span", { className: "typing" }, el("i"), el("i"), el("i"), document.createTextNode(webOn ? "ChatGDB réfléchit ou cherche sur le web…" : "ChatGDB réfléchit…")))));
    if (scroll) th.scrollTop = th.scrollHeight;
  }
  // clics dans le fil : copie de code, citations, images
  $("thread").addEventListener("click", e => {
    const t = e.target;
    const cp = t.closest("[data-copy]"); if (cp) { copy(cp.closest(".pre").querySelector("code").textContent); return; }
    const ci = t.closest(".cite"); if (ci) { e.preventDefault(); const s = ci.closest(".body").querySelector("#src-" + (+ci.dataset.n - 1)); if (s) { s.scrollIntoView({ block: "center", behavior: "smooth" }); s.classList.add("flash"); setTimeout(() => s.classList.remove("flash"), 1400); } return; }
    if (t.matches("img.mdimg, img.thumb")) { $("lb-img").src = t.src; $("dlg-image").showModal(); }
  });
  $("thread").addEventListener("error", e => { if (e.target.matches && e.target.matches("img.mdimg")) e.target.remove(); }, true);
  $("dlg-image").addEventListener("click", e => { if (e.target.id === "dlg-image") e.target.close(); });

  function show(c) {
    current = c; $("title").textContent = c ? c.title : "Nouvelle conversation"; $("badge").hidden = !(c && c.example);
    $("pin").hidden = !c || c.example; $("pin").classList.toggle("on", !!(c && c.pinned)); $("export").hidden = !c;
    closeArt(); drawList(); drawThread(false); $("thread").scrollTop = 0; notice(); updateSend();
  }
  $("new").onclick = () => { show(null); $("input").focus(); if (mobile()) setSide(false); };
  $("title").onclick = () => { if (!current || current.example) return; const t = (prompt("Nom de la conversation :", current.title) || "").trim(); if (t) { current.title = t.slice(0, 80); persist(); $("title").textContent = current.title; drawList(); } };
  $("pin").onclick = () => { if (!current) return; current.pinned = !current.pinned; persist(); $("pin").classList.toggle("on", current.pinned); drawList(); };
  $("export").onclick = () => {
    if (!current) return;
    const txt = "# " + current.title + "\n\n" + current.messages.map(m => (m.role === "user" ? "**Vous**\n\n" : "**ChatGDB**\n\n") + m.text.replace(/<artifact[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/artifact>/g, (_, t, c) => `\n\n### ${t}\n\n${c}\n`) + (m.sources && m.sources.length ? "\n\nSources :\n" + m.sources.map((s, i) => `${i + 1}. ${s.title} — ${s.url}`).join("\n") : "")).join("\n\n---\n\n");
    download(safeName(current.title) + ".md", txt, "text/markdown");
  };

  // ---------- volet des artefacts ----------
  function openArt(conv, id, ver) {
    const vers = versionsOf(conv, id); if (!vers.length) return;
    openArtId = id; openArtVer = Math.max(0, Math.min(ver, vers.length - 1)); tab = "prev";
    app.dataset.art = "open"; $("art").hidden = false; renderArt(conv); drawThread(false);
  }
  function closeArt() { openArtId = null; app.dataset.art = "closed"; $("art").hidden = true; $("art").classList.remove("full"); }
  function renderArt(conv = current) {
    const vers = versionsOf(conv, openArtId), a = vers[openArtVer]; if (!a) return closeArt();
    const k = KINDS[a.type];
    $("art-ico").innerHTML = `<use href="#i-${k.ico}"/>`; $("art-name").textContent = a.title; $("art-kind").textContent = k.label;
    const sel = $("art-ver"); sel.hidden = vers.length < 2; sel.textContent = "";
    vers.forEach((_, i) => sel.append(el("option", { value: i, textContent: "Version " + (i + 1), selected: i === openArtVer })));
    $("tab-prev").setAttribute("aria-selected", String(tab === "prev")); $("tab-code").setAttribute("aria-selected", String(tab === "code"));
    const body = $("art-body"); body.textContent = "";
    if (tab === "code") { body.append(el("pre", { className: "raw", textContent: a.content })); return; }
    if (a.type === "markdown") { curSources = []; body.append(el("div", { className: "md", innerHTML: md(a.content) })); }
    else if (a.type === "html") {
      const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob: https:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; font-src data:">';
      body.append(el("iframe", { title: a.title, sandbox: "allow-scripts", srcdoc: csp + a.content, referrerPolicy: "no-referrer" }));
    } else if (a.type === "svg") body.append(el("div", { className: "svgwrap" }, el("img", { alt: a.title, src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(a.content) })));
    else if (a.type === "csv") {
      const rows = a.content.split(/\r?\n/).filter(Boolean).map(line => { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === "," || ch === ";") { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; });
      body.append(el("div", { className: "md", innerHTML: "<table><thead><tr>" + (rows[0] || []).map(c => `<th>${esc(c)}</th>`).join("") + "</tr></thead><tbody>" + rows.slice(1).map(r => "<tr>" + r.map(c => `<td>${esc(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table>" }));
    } else body.append(el("pre", { className: "raw", textContent: a.content }));
  }
  $("tab-prev").onclick = () => { tab = "prev"; renderArt(); }; $("tab-code").onclick = () => { tab = "code"; renderArt(); };
  $("art-ver").onchange = e => { openArtVer = +e.target.value; renderArt(); };
  $("art-close").onclick = () => { closeArt(); drawThread(false); };
  $("art-full").onclick = () => $("art").classList.toggle("full");
  $("art-copy").onclick = () => { const a = versionsOf(current, openArtId)[openArtVer]; if (a) copy(a.content); };
  $("art-dl").onclick = () => { const a = versionsOf(current, openArtId)[openArtVer]; if (!a) return; const k = KINDS[a.type]; download(safeName(a.title) + "." + (a.type === "code" && /^[\w+-]{1,6}$/.test(a.lang) ? a.lang : k.ext), a.content, k.mime); };

  // ---------- pièces jointes : images (réduites), PDF, fichiers texte ----------
  const MAX_ATT = 6, MAX_PDF = 9 * 1048576, MAX_TXT = 200000;
  const readAs = (f, how) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ko(r.error); r[how](f); });
  async function shrink(file, max, q) {
    const url = await readAs(file, "readAsDataURL"), img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", q);
  }
  async function addFiles(files) {
    for (const f of [...files]) {
      if (pending.length >= MAX_ATT) { toast("Six pièces jointes au maximum."); break; }
      try {
        if (/^image\//.test(f.type) && f.type !== "image/svg+xml") {
          const big = await shrink(f, 1568, .85), thumb = await shrink(f, 160, .7);
          pending.push({ k: "image", n: f.name || "image", m: "image/jpeg", d: big.split(",")[1], t: thumb });
        } else if (f.type === "application/pdf") {
          if (f.size > MAX_PDF) { toast("« " + f.name + " » dépasse 9 Mo."); continue; }
          pending.push({ k: "pdf", n: f.name, m: "application/pdf", d: (await readAs(f, "readAsDataURL")).split(",")[1] });
        } else if (/^text\/|json|xml|svg|csv/.test(f.type) || /\.(txt|md|csv|json|html|xml|svg)$/i.test(f.name)) {
          if (f.size > MAX_TXT) { toast("« " + f.name + " » est trop volumineux (200 Ko)."); continue; }
          pending.push({ k: "text", n: f.name, text: await readAs(f, "readAsText") });
        } else toast("Type de fichier non pris en charge : " + f.name);
      } catch { toast("Impossible de lire « " + (f.name || "fichier") + " »."); }
    }
    drawAtts(); updateSend();
  }
  function drawAtts() {
    const box = $("atts"); box.hidden = !pending.length; box.textContent = "";
    pending.forEach((a, i) => {
      const chip = el("div", { className: "att" }, a.t ? el("img", { src: a.t, alt: "" }) : el("span", { className: "fi", innerHTML: ic("file") }), el("span", { textContent: a.n, title: a.n }));
      const x = el("button", { type: "button", ariaLabel: "Retirer", innerHTML: ic("close") }); x.onclick = () => { pending.splice(i, 1); drawAtts(); updateSend(); }; chip.append(x); box.append(chip);
    });
  }
  $("attach").onclick = () => $("file").click();
  $("file").onchange = e => { addFiles(e.target.files); e.target.value = ""; };
  document.addEventListener("paste", e => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); addFiles(fs); } });
  let dragDepth = 0;
  document.addEventListener("dragenter", e => { if ([...(e.dataTransfer?.types || [])].includes("Files")) { dragDepth++; $("drop-hint").hidden = false; } });
  document.addEventListener("dragleave", () => { if (--dragDepth <= 0) { dragDepth = 0; $("drop-hint").hidden = true; } });
  document.addEventListener("dragover", e => { if ([...(e.dataTransfer?.types || [])].includes("Files")) e.preventDefault(); });
  document.addEventListener("drop", e => { e.preventDefault(); dragDepth = 0; $("drop-hint").hidden = true; if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });

  // ---------- composeur ----------
  const input = $("input"), send = $("send"), ctx = $("ctx");
  ctx.append(el("option", { value: "", textContent: "Toutes les applications" }));
  [...new Set((window.SCOUTHUB_APPS || []).filter(a => !a.local).map(a => a.name))].sort((a, b) => a.localeCompare(b, "fr")).forEach(n => ctx.append(el("option", { value: n, textContent: n })));
  $("mode").value = prefs.style;
  const syncWeb = () => { $("web").setAttribute("aria-pressed", String(webOn)); };
  $("web").onclick = () => { webOn = !webOn; syncWeb(); };
  syncWeb();
  function notice(text, err) { const n = $("notice"); n.hidden = !text; n.textContent = text || ""; n.classList.toggle("err", !!err); }
  function updateSend() {
    send.classList.toggle("stop", busy); send.innerHTML = ic(busy ? "stop" : "send"); send.setAttribute("aria-label", busy ? "Arrêter" : "Envoyer");
    send.disabled = !busy && (!(input.value.trim() || pending.length) || (current && current.example));
  }
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 200) + "px"; $("count").textContent = input.value.length > 6000 ? input.value.length + " / 8000" : ""; updateSend(); }
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!busy) $("form").requestSubmit(); } });

  // dictée vocale (si le navigateur la propose)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; let rec = null;
  if (SR) {
    $("mic").hidden = false;
    $("mic").onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = "fr-FR"; rec.interimResults = false; rec.continuous = true; const base = input.value ? input.value + " " : "";
      rec.onresult = e => { input.value = base + [...e.results].map(r => r[0].transcript).join(" "); autosize(); };
      rec.onend = () => { rec = null; $("mic").classList.remove("rec"); }; rec.onerror = () => { rec = null; $("mic").classList.remove("rec"); };
      $("mic").classList.add("rec"); try { rec.start(); } catch { rec = null; $("mic").classList.remove("rec"); }
    };
  }

  // ---------- appel au serveur ----------
  async function chatCall(payload, signal) {
    const API = window.SCOUTHUB_API; if (!API) throw new Error("Le serveur ScoutHub n’est pas configuré.");
    let res; try { res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "chat", token: Hub.token, ...payload }), signal }); }
    catch (e) { if (e.name === "AbortError") throw e; throw new Error("Serveur injoignable."); }
    let out; try { out = await res.json(); } catch { throw new Error("Réponse invalide du serveur."); }
    if (!out.ok) { if (/Session expirée/.test(out.error)) Hub.toLogin(); throw new Error(out.error || "Erreur."); }
    return out;
  }
  // Historique envoyé : les pièces jointes complètes ne partent qu'avec le dernier message ; avant, seule leur mention.
  function history(fullAtts) {
    const list = current.messages.slice(-24), lastUser = list.map(m => m.role).lastIndexOf("user");
    return list.map((m, i) => {
      if (m.role !== "user") return { role: "assistant", text: m.text };
      let text = m.text; const o = { role: "user" };
      if (i === lastUser && fullAtts) {
        o.images = fullAtts.filter(a => a.k === "image").map(a => ({ m: a.m, d: a.d })); o.docs = fullAtts.filter(a => a.k === "pdf").map(a => ({ n: a.n, m: a.m, d: a.d }));
        fullAtts.filter(a => a.k === "text").forEach(a => { text += `\n\n[Fichier joint : ${a.n}]\n${a.text}`; });
      } else if (m.atts && m.atts.length) text += "\n\n[Pièces jointes précédentes : " + m.atts.map(a => a.n).join(", ") + "]";
      o.text = text; return o;
    });
  }
  async function ask(fullAtts) {
    busy = true; abort = new AbortController(); updateSend(); drawThread(); notice();
    try {
      const out = await chatCall({ app: ctx.value, style: $("mode").value, custom: prefs.custom, web: webOn, messages: history(fullAtts) }, abort.signal);
      current.messages.push({ role: "assistant", text: String(out.text || ""), sources: out.sources || [], searches: out.searches || [], proposals: (out.proposals || []).map(p => ({ ...p, state: "" })), time: Date.now() });
      if (out.credits) credits(out.credits);
      current.updated = Date.now();
    } catch (e) { if (e.name !== "AbortError") notice(e.message, true); }
    finally {
      busy = false; abort = null; persist(); drawList(); drawThread(); updateSend();
      const last = current.messages[current.messages.length - 1];
      if (last && last.role !== "user") { const a = parse(last.text).filter(s => s.t === "art").pop(); if (a) openArt(current, a.id, versionsOf(current, a.id).length - 1); }
    }
  }
  function regenerate() { if (busy || !live) return; if (current.messages.at(-1).role !== "user") current.messages.pop(); ask(null); }
  function editMsg(i, body) {
    const m = current.messages[i], bub = body.querySelector(".bubble"), acts = body.querySelector(".actions"); if (acts) acts.hidden = true;
    const box = el("div", { className: "edit-box" }), ta = el("textarea", { value: m.text }), ok = el("button", { className: "btn primary", type: "button", textContent: "Envoyer" }), no = el("button", { className: "btn", type: "button", textContent: "Annuler" });
    no.onclick = () => drawThread(false);
    ok.onclick = () => { const t = ta.value.trim(); if (!t) return; current.messages.length = i; current.messages.push({ role: "user", text: t, atts: m.atts, time: Date.now() }); ask(null); };
    box.append(ta, el("div", {}, no, ok)); bub.replaceWith(box); ta.focus();
  }
  $("form").addEventListener("submit", ev => {
    ev.preventDefault();
    if (busy) { if (abort) abort.abort(); return; }
    const text = input.value.trim(); if (!text && !pending.length) return;
    if (!live) return notice("ChatGDB n’est pas encore activé : votre message n’a pas été envoyé. L’ouverture est prévue prochainement.");
    if (!current || current.example) { current = { id: String(Date.now()), title: (text || pending[0].n).slice(0, 60), updated: Date.now(), messages: [] }; convs.unshift(current); $("title").textContent = current.title; $("badge").hidden = true; $("pin").hidden = false; $("export").hidden = false; }
    const sent = pending; pending = []; drawAtts();
    current.messages.push({ role: "user", text: text || "Voici une pièce jointe.", atts: sent.map(a => ({ n: a.n, k: a.k, t: a.t || "" })), time: Date.now() });
    current.updated = Date.now(); input.value = ""; autosize(); ask(sent);
  });
  // clic sur « arrêter »
  send.addEventListener("click", e => { if (busy) { e.preventDefault(); if (abort) abort.abort(); } });

  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("new").click(); }
    else if (e.key === "Escape") { if ($("art").classList.contains("full")) $("art").classList.remove("full"); else if (!$("art").hidden) $("art-close").click(); else closeMenu(); }
  });

  show(null); autosize(); input.focus();
})();
