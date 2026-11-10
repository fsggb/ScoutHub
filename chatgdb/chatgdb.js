// ChatGDB : application de l'assistant IA de la fédération.
// L'IA n'est pas encore branchée (SCOUTHUB_CHATGDB.live = false) : l'interface complète est prête (conversations, artefacts,
// crédits, thème), l'envoi est refusé poliment et une conversation d'exemple montre ce que l'assistant saura produire.
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
  const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
  let toastTimer = 0;
  const toast = t => { const n = $("toast"); n.textContent = t; n.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => n.hidden = true, 2600); };
  const copy = async t => { try { await navigator.clipboard.writeText(t); } catch { const a = el("textarea", { value: t }); document.body.append(a); a.select(); try { document.execCommand("copy"); } catch {} a.remove(); } toast("Copié dans le presse-papiers."); };
  const download = (name, text, mime) => { const a = el("a", { href: URL.createObjectURL(new Blob([text], { type: mime + ";charset=utf-8" })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000); };

  // ---------- Markdown sûr : tout est échappé d'abord, seuls quelques motifs sont rendus ----------
  const inline = t => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>").replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  function md(src) {
    const lines = String(src || "").replace(/\r/g, "").split("\n"); let out = "", i = 0;
    const cells = l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
    while (i < lines.length) {
      const l = lines[i];
      let m;
      if ((m = /^```\s*([\w+-]*)/.exec(l))) { const code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]); i++; out += `<pre><code>${esc(code.join("\n"))}</code></pre>`; continue; }
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
          const t = lines[i++].replace(/^\s*([-*]|\d+[.)])\s+/, "");
          const task = /^\[( |x|X)\]\s+(.*)$/.exec(t);
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

  // ---------- artefacts : <artifact id="" type="" title="">…</artifact> dans les réponses ----------
  const KINDS = {
    markdown: { ico: "📄", label: "Document", ext: "md", mime: "text/markdown" },
    html: { ico: "🌐", label: "Page web interactive", ext: "html", mime: "text/html" },
    svg: { ico: "🖼️", label: "Image vectorielle", ext: "svg", mime: "image/svg+xml" },
    csv: { ico: "📊", label: "Tableau", ext: "csv", mime: "text/csv" },
    code: { ico: "⌨️", label: "Code", ext: "txt", mime: "text/plain" }
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

  // ---------- état et conversations ----------
  const KEY = "scouthub.chatgdb.v2:" + user.email;
  let convs = store.get(KEY, []).filter(c => c && Array.isArray(c.messages));
  let current = null, openArtId = null, openArtVer = 0, tab = "prev", busy = false;
  const persist = () => store.set(KEY, convs.slice(0, 100));
  const find = id => id === EXAMPLE.id ? EXAMPLE : convs.find(c => c.id === id);

  // ---------- thème, panneau ----------
  const setTheme = t => { app.dataset.theme = t; store.set("scouthub.chatgdb.theme", t); };
  setTheme(store.get("scouthub.chatgdb.theme", "light"));
  $("theme").onclick = () => setTheme(app.dataset.theme === "dark" ? "light" : "dark");
  const mobile = () => matchMedia("(max-width:900px)").matches;
  app.dataset.side = mobile() ? "closed" : "open";
  const setSide = o => { app.dataset.side = o ? "open" : "closed"; $("scrim").hidden = !(o && mobile()); };
  matchMedia("(max-width:900px)").addEventListener("change", e => setSide(!e.matches));
  $("side-close").onclick = () => setSide(false); $("side-open").onclick = () => setSide(true); $("scrim").onclick = () => { setSide(false); };

  // ---------- crédits ----------
  function credits(u = { window: 0, week: 0, resetWindow: "", resetWeek: "" }) {
    const fill = (bar, txt, used, max) => { const left = Math.max(0, max - used), pct = max ? Math.round(left / max * 100) : 0; $(bar).style.width = pct + "%"; $(bar).classList.toggle("low", pct <= 15); $(txt).textContent = left + " / " + max; };
    fill("cm-bar", "cm-txt", u.week, CFG.weekCredits); $("cm-txt").textContent = Math.max(0, CFG.weekCredits - u.week) + " cette semaine";
    fill("d-win", "d-win-txt", u.window, CFG.windowCredits); fill("d-week", "d-week-txt", u.week, CFG.weekCredits);
    $("d-hours").textContent = $("d-hours2").textContent = CFG.windowHours;
    $("d-win-reset").textContent = u.resetWindow ? "Se renouvelle " + u.resetWindow : `Se renouvelle ${CFG.windowHours} h après votre première question`;
    $("d-week-reset").textContent = u.resetWeek ? "Se renouvelle " + u.resetWeek : "Se renouvelle chaque semaine";
    $("d-earn").textContent = `Utiliser les applications de ScoutHub rapporte des crédits : ${CFG.earn.credits} crédit toutes les ${CFG.earn.minutes} minutes d’activité, jusqu’à ${CFG.earn.weekCap} par semaine.`;
  }
  credits();
  const openCredits = () => $("dlg-credits").showModal();
  $("credits-open").onclick = openCredits; $("m-credits").onclick = () => { closeMenu(); openCredits(); };
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => b.closest("dialog").close());

  // ---------- menu du compte ----------
  const menu = $("menu");
  const closeMenu = () => menu.hidden = true;
  $("menu-open").onclick = ev => { ev.stopPropagation(); const r = ev.currentTarget.getBoundingClientRect(); menu.hidden = !menu.hidden; menu.style.left = Math.max(8, r.left - 150) + "px"; menu.style.bottom = (innerHeight - r.top + 8) + "px"; };
  document.addEventListener("click", closeMenu);
  $("m-out").onclick = () => Hub.logout();
  $("m-clear").onclick = () => { closeMenu(); if (confirm("Supprimer toutes vos conversations ChatGDB sur cet appareil ?")) { convs = []; persist(); show(null); } };

  // ---------- liste des conversations ----------
  function when(ts) {
    const d = new Date(ts), now = new Date(), day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(), t = d.getTime();
    if (t >= day) return "Aujourd’hui"; if (t >= day - 864e5) return "Hier"; if (t >= day - 6 * 864e5) return "7 derniers jours"; return "Plus ancien";
  }
  function drawList() {
    const box = $("convs"); box.textContent = ""; const q = $("q").value.trim().toLowerCase();
    const mine = convs.filter(c => !q || (c.title + " " + c.messages.map(m => m.text).join(" ")).toLowerCase().includes(q)).sort((a, b) => b.updated - a.updated);
    const add = (label, items) => { if (!items.length) return; box.append(el("div", { className: "grp", textContent: label })); items.forEach(c => {
      const row = el("div", { className: "conv" + (current && current.id === c.id ? " on" : ""), role: "button", tabIndex: 0 }, el("span", { textContent: c.title, title: c.title }));
      if (!c.example) { const x = el("button", { className: "x", type: "button", textContent: "✕", title: "Supprimer", ariaLabel: "Supprimer la conversation" }); x.onclick = ev => { ev.stopPropagation(); if (confirm("Supprimer cette conversation ?")) { convs = convs.filter(k => k !== c); persist(); if (current === c) show(null); else drawList(); } }; row.append(x); }
      row.onclick = () => { show(c); if (mobile()) setSide(false); }; row.onkeydown = e => { if (e.key === "Enter") row.click(); }; box.append(row); }); };
    if (!q || EXAMPLE.title.toLowerCase().includes(q)) add("Exemple", [EXAMPLE]);
    ["Aujourd’hui", "Hier", "7 derniers jours", "Plus ancien"].forEach(g => add(g, mine.filter(c => when(c.updated) === g)));
    if (!mine.length && !box.querySelector(".conv")) box.append(el("p", { className: "empty", textContent: "Aucune conversation." }));
  }
  $("q").addEventListener("input", drawList);

  // ---------- fil de discussion ----------
  const SUGG = [
    ["📝", "Rédiger", "Rédige une lettre aux parents pour annoncer le camp d’été."],
    ["🧭", "Cartes et orientation", "Comment préparer un itinéraire et des azimuts pour un raid sur Cartes IGN ?"],
    ["🪵", "Froissartage", "Comment concevoir un banc dans CathIA et sortir le plan coté ?"],
    ["📊", "Budget", "Aide-moi à construire un tableau de budget de camp dans Excel."],
    ["🛍️", "Boutique", "Quels articles trouver pour l’uniforme d’un louveteau ?"],
    ["📚", "Documents scouts", "Que dit la réglementation sur les effectifs d’encadrement en camp ?"]
  ];
  function welcome() {
    const box = el("div", { className: "welcome" });
    box.append(el("img", { src: "../assets/icons/ChatGDB.svg", alt: "" }), el("h2", { textContent: "Bonjour " + first + ", comment puis-je vous aider ?" }),
      el("p", { textContent: "Je connais les applications de la fédération et ses documents." }));
    const cards = el("div", { className: "cards" });
    SUGG.forEach(([ic, h, t]) => { const c = el("button", { className: "card", type: "button" }, el("span", { className: "ci", textContent: ic }), el("b", { textContent: h }), el("small", { textContent: t })); c.onclick = () => { $("input").value = t; autosize(); $("input").focus(); }; cards.append(c); });
    box.append(cards); return box;
  }
  function botBody(m, conv) {
    const body = el("div", { className: "body" }), wrap = el("div", { className: "md" });
    parse(m.text).forEach(s => {
      if (s.t === "text") { if (s.v.trim()) wrap.insertAdjacentHTML("beforeend", md(s.v)); return; }
      const k = KINDS[s.type], vers = versionsOf(conv, s.id), idx = Math.max(0, vers.findIndex(x => x.msg === m)), v = idx + 1;
      const card = el("button", { className: "afc" + (openArtId === s.id ? " on" : ""), type: "button" },
        el("span", { className: "ico", textContent: k.ico }), el("span", {}, el("b", { textContent: s.title }), el("small", { textContent: k.label + (vers.length > 1 ? " · version " + v + " sur " + vers.length : "") })), el("span", { className: "go", textContent: "Ouvrir ›" }));
      card.onclick = () => openArt(conv, s.id, idx); wrap.append(card);
    });
    body.append(wrap); return body;
  }
  function drawThread(scroll = true) {
    const th = $("thread"); th.textContent = "";
    if (!current || !current.messages.length) { th.append(welcome()); return; }
    if (current.example) th.append(el("div", { className: "example-note", textContent: "Exemple de conversation : elle montre ce que ChatGDB saura produire (documents, pages interactives, tableaux, images). ChatGDB n’est pas encore activé." }));
    current.messages.forEach((m, i) => {
      const msg = el("div", { className: "msg " + (m.role === "user" ? "user" : "bot") });
      msg.append(m.role === "user" ? el("span", { className: "who", textContent: first.charAt(0).toUpperCase() }) : el("span", { className: "who" }, el("img", { src: "../assets/icons/ChatGDB.svg", alt: "" })));
      if (m.role === "user") msg.append(el("div", { className: "body", textContent: m.text }));
      else {
        const body = botBody(m, current), acts = el("div", { className: "actions" });
        const btn = (t, title, fn) => { const b = el("button", { type: "button", textContent: t, title, ariaLabel: title }); b.onclick = fn; acts.append(b); return b; };
        btn("⧉ Copier", "Copier la réponse", () => copy(m.text.replace(/<\/?artifact[^>]*>/g, "")));
        const up = btn("👍", "Bonne réponse", () => { m.fb = m.fb === "up" ? "" : "up"; persist(); up.classList.toggle("on", m.fb === "up"); dn.classList.remove("on"); toast("Merci pour votre retour."); });
        const dn = btn("👎", "Réponse insuffisante", () => { m.fb = m.fb === "down" ? "" : "down"; persist(); dn.classList.toggle("on", m.fb === "down"); up.classList.remove("on"); toast("Merci, nous en tenons compte."); });
        up.classList.toggle("on", m.fb === "up"); dn.classList.toggle("on", m.fb === "down");
        if (!current.example) btn("↻ Régénérer", "Régénérer la réponse", () => { if (i === current.messages.length - 1) regenerate(); });
        body.append(acts); msg.append(body);
      }
      th.append(msg);
    });
    if (busy) th.append(el("div", { className: "msg bot" }, el("span", { className: "who" }, el("img", { src: "../assets/icons/ChatGDB.svg", alt: "" })), el("div", { className: "body" }, el("span", { className: "typing" }, el("i"), el("i"), el("i")))));
    if (scroll) th.scrollTop = th.scrollHeight;
  }
  function show(c) {
    current = c; $("title").textContent = c ? c.title : "Nouvelle conversation"; $("badge").hidden = !(c && c.example);
    closeArt(); drawList(); drawThread(false); $("thread").scrollTop = 0; notice();
  }
  $("new").onclick = () => { show(null); $("input").focus(); if (mobile()) setSide(false); };
  $("title").onclick = () => { if (!current || current.example) return; const t = (prompt("Nom de la conversation :", current.title) || "").trim(); if (t) { current.title = t.slice(0, 80); persist(); $("title").textContent = current.title; drawList(); } };
  $("export").onclick = () => {
    if (!current) return toast("Rien à exporter pour l’instant.");
    const txt = "# " + current.title + "\n\n" + current.messages.map(m => (m.role === "user" ? "**Vous**\n\n" : "**ChatGDB**\n\n") + m.text.replace(/<artifact[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/artifact>/g, (_, t, c) => `\n\n### ${t}\n\n${c}\n`)).join("\n\n---\n\n");
    download((current.title.replace(/[^\wÀ-ſ -]+/g, "").trim() || "conversation") + ".md", txt, "text/markdown");
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
    $("art-ico").textContent = k.ico; $("art-name").textContent = a.title; $("art-kind").textContent = k.label;
    const sel = $("art-ver"); sel.hidden = vers.length < 2; sel.textContent = "";
    vers.forEach((_, i) => sel.append(el("option", { value: i, textContent: "Version " + (i + 1), selected: i === openArtVer })));
    $("tab-prev").setAttribute("aria-selected", String(tab === "prev")); $("tab-code").setAttribute("aria-selected", String(tab === "code"));
    const body = $("art-body"); body.textContent = "";
    if (tab === "code") { body.append(el("pre", { className: "raw", textContent: a.content })); return; }
    if (a.type === "markdown") body.append(el("div", { className: "md", innerHTML: md(a.content) }));
    else if (a.type === "html") {
      const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob: https:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; font-src data:">';
      body.append(el("iframe", { title: a.title, sandbox: "allow-scripts", srcdoc: csp + a.content, referrerPolicy: "no-referrer" }));
    } else if (a.type === "svg") body.append(el("div", { className: "svgwrap" }, el("img", { alt: a.title, src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(a.content) })));
    else if (a.type === "csv") {
      const rows = a.content.split(/\r?\n/).filter(Boolean).map(r => (r.match(/("([^"]|"")*"|[^,;]*)([,;]|$)/g) || []).map(c => c.replace(/[,;]$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')));
      const t = "<table><thead><tr>" + (rows[0] || []).map(c => `<th>${esc(c)}</th>`).join("") + "</tr></thead><tbody>" + rows.slice(1).map(r => "<tr>" + r.map(c => `<td>${esc(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table>";
      body.append(el("div", { className: "md", innerHTML: t }));
    } else body.append(el("pre", { className: "raw", textContent: a.content }));
  }
  $("tab-prev").onclick = () => { tab = "prev"; renderArt(); }; $("tab-code").onclick = () => { tab = "code"; renderArt(); };
  $("art-ver").onchange = e => { openArtVer = +e.target.value; renderArt(); };
  $("art-close").onclick = () => { closeArt(); drawThread(false); };
  $("art-full").onclick = () => $("art").classList.toggle("full");
  $("art-copy").onclick = () => { const a = versionsOf(current, openArtId)[openArtVer]; if (a) copy(a.content); };
  $("art-dl").onclick = () => { const a = versionsOf(current, openArtId)[openArtVer]; if (!a) return; const k = KINDS[a.type]; download((a.title.replace(/[^\wÀ-ſ -]+/g, "").trim() || "artefact") + "." + (a.type === "code" && /^[\w+-]{1,6}$/.test(a.lang) ? a.lang : k.ext), a.content, k.mime); };

  // ---------- composeur ----------
  const input = $("input"), send = $("send"), ctx = $("ctx");
  ctx.append(el("option", { value: "", textContent: "Toutes les applications" }));
  [...new Set((window.SCOUTHUB_APPS || []).filter(a => !a.local).map(a => a.name))].sort((a, b) => a.localeCompare(b, "fr")).forEach(n => ctx.append(el("option", { value: n, textContent: n })));
  function notice(text, err) { const n = $("notice"); n.hidden = !text; n.textContent = text || ""; n.classList.toggle("err", !!err); }
  $("soon").hidden = CFG.live;
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 200) + "px"; $("count").textContent = input.value.length > 4500 ? input.value.length + " / 6000" : ""; send.disabled = busy || !input.value.trim() || (current && current.example); }
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("form").requestSubmit(); } });
  $("attach").onclick = () => $("file").click();
  $("file").onchange = e => { const names = [...e.target.files].map(f => f.name).join(", "); e.target.value = ""; if (names) toast(CFG.live ? "Pièces jointes : " + names : "Les pièces jointes seront prises en charge à l’ouverture de ChatGDB."); };

  async function ask() {
    busy = true; autosize(); drawThread(); notice();
    try {
      // Action serveur « chat » : à créer à la mise en route (vérifie session, rôle et crédits, appelle le modèle).
      const out = await Hub.call("chat", { app: ctx.value, style: $("mode").value, messages: current.messages.slice(-24).map(m => ({ role: m.role, text: m.text })) });
      current.messages.push({ role: "assistant", text: String(out.text || ""), time: Date.now() });
      if (out.credits) credits(out.credits);
      current.updated = Date.now();
    } catch (e) { notice(e.message, true); }
    finally { busy = false; persist(); drawList(); drawThread(); autosize(); const last = current.messages[current.messages.length - 1]; if (last && last.role !== "user") { const a = parse(last.text).filter(s => s.t === "art").pop(); if (a) openArt(current, a.id, versionsOf(current, a.id).length - 1); } }
  }
  function regenerate() { if (!CFG.live || busy) return; if (current.messages.at(-1).role !== "user") current.messages.pop(); ask(); }
  $("form").addEventListener("submit", ev => {
    ev.preventDefault(); const text = input.value.trim(); if (!text || busy) return;
    if (!CFG.live) return notice("ChatGDB n’est pas encore activé : votre message n’a pas été envoyé. L’ouverture est prévue prochainement.");
    if (!current || current.example) { current = { id: String(Date.now()), title: text.slice(0, 60), updated: Date.now(), messages: [] }; convs.unshift(current); $("title").textContent = current.title; $("badge").hidden = true; }
    current.messages.push({ role: "user", text, time: Date.now() }); current.updated = Date.now(); input.value = ""; ask();
  });

  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("new").click(); }
    else if (e.key === "Escape") { if ($("art").classList.contains("full")) $("art").classList.remove("full"); else if (!$("art").hidden) $("art-close").click(); else closeMenu(); }
  });

  show(null); autosize(); input.focus();
})();
