// ChatGDB : interface de l'assistant IA de la fédération. L'IA n'est pas encore branchée (SCOUTHUB_CHATGDB.live = false) :
// tout le reste (conversations, crédits, choix de l'application, envoi) est prêt pour la mise en route.
(async () => {
  "use strict";
  const { $, say } = Hub;
  const CFG = Object.assign({ live: false, windowHours: 5, windowCredits: 30, weekCredits: 150, earn: { minutes: 5, credits: 1, weekCap: 50 } }, window.SCOUTHUB_CHATGDB || {});
  const CONVS_KEY = "scouthub.chatgdb.convs";

  const user = Hub.cachedUser() || (Hub.token ? await Hub.requireUser() : null);
  Hub.renderBar(user);
  if (!user) { $("gdb-guest").hidden = false; return; }
  Hub.call("me").then(o => { Hub.user = o.user; Hub.cacheUser(o.user); }).catch(() => { Hub.toLogin(); });
  $("gdb-app").hidden = false; $("gdb-soon").hidden = CFG.live;

  // ---------- crédits (valeurs d'usage : branchées sur le serveur à la mise en route) ----------
  function renderCredits(used = { window: 0, week: 0, resetWindow: "", resetWeek: "" }) {
    const bar = (id, txtId, u, max) => {
      const left = Math.max(0, max - u), pct = max ? Math.round(left / max * 100) : 0;
      $(id).style.width = pct + "%"; $(id).classList.toggle("low", pct <= 15);
      $(txtId).textContent = left + " / " + max;
    };
    $("cr-hours").textContent = CFG.windowHours;
    bar("cr-win", "cr-win-txt", used.window, CFG.windowCredits);
    bar("cr-week", "cr-week-txt", used.week, CFG.weekCredits);
    $("cr-win-reset").textContent = used.resetWindow ? "Se renouvelle " + used.resetWindow : "Se renouvelle 5 h après votre première question";
    $("cr-week-reset").textContent = used.resetWeek ? "Se renouvelle " + used.resetWeek : "Se renouvelle chaque semaine";
    $("cr-earn").textContent = `Utiliser les applications rapporte des crédits : ${CFG.earn.credits} crédit toutes les ${CFG.earn.minutes} minutes d’activité (jusqu’à ${CFG.earn.weekCap} par semaine).`;
  }
  renderCredits();

  // ---------- applications concernées ----------
  const ctx = $("gdb-ctx");
  ctx.append(Object.assign(document.createElement("option"), { value: "", textContent: "Toutes les applications" }));
  const names = [...new Set((window.SCOUTHUB_APPS || []).filter(a => !a.local).map(a => a.name))].sort((a, b) => a.localeCompare(b, "fr"));
  names.forEach(n => ctx.append(Object.assign(document.createElement("option"), { value: n, textContent: n })));

  // ---------- conversations (copie locale ; synchronisation serveur à la mise en route) ----------
  const load = () => { try { return JSON.parse(localStorage.getItem(CONVS_KEY + ":" + user.email) || "[]"); } catch { return []; } };
  const save = () => { try { localStorage.setItem(CONVS_KEY + ":" + user.email, JSON.stringify(convs.slice(0, 50))); } catch {} };
  let convs = load(), current = null;

  function drawList() {
    const ul = $("gdb-convs"); ul.textContent = "";
    if (!convs.length) return ul.append(Object.assign(document.createElement("li"), { className: "empty", textContent: "Aucune conversation pour l’instant." }));
    convs.forEach(c => {
      const li = Object.assign(document.createElement("li"), { textContent: c.title, title: c.title, className: c === current ? "on" : "" });
      li.onclick = () => { current = c; drawList(); drawLog(); };
      ul.append(li);
    });
  }
  function drawLog() {
    const log = $("gdb-log"); log.textContent = "";
    if (!current || !current.messages.length) {
      const hello = document.createElement("div"); hello.className = "gdb-hello";
      hello.innerHTML = '<img src="assets/icons/ChatGDB.svg" alt=""><h2>Bonjour, comment puis-je vous aider ?</h2><p>Je connais les applications de la fédération et ses documents : posez-moi une question ou choisissez une suggestion.</p>';
      const sugg = document.createElement("div"); sugg.className = "gdb-sugg";
      ["Comment mettre en page un document dans InDesign ?", "Où trouver les documents sur la sécurité en camp ?", "Comment calculer un azimut sur Cartes IGN ?", "À quoi sert la boutique GDB ?"].forEach(t => {
        const b = Object.assign(document.createElement("button"), { type: "button", textContent: t, disabled: !CFG.live });
        b.onclick = () => { $("gdb-input").value = t; $("gdb-form").requestSubmit(); }; sugg.append(b);
      });
      hello.append(sugg); log.append(hello); return;
    }
    current.messages.forEach(m => log.append(Object.assign(document.createElement("div"), { className: "msg " + (m.role === "user" ? "user" : "bot"), textContent: m.text })));
    log.scrollTop = log.scrollHeight;
  }
  $("gdb-new").onclick = () => { current = null; drawList(); drawLog(); $("gdb-input").focus(); };

  // ---------- envoi ----------
  const input = $("gdb-input"), send = $("gdb-send");
  const lock = !CFG.live;
  input.disabled = ctx.disabled = send.disabled = lock;
  if (lock) say($("gdb-status"), "ChatGDB sera ouvert prochainement : l’interface est prête, l’assistant n’est pas encore activé.");
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 140) + "px"; });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("gdb-form").requestSubmit(); } });

  $("gdb-form").addEventListener("submit", async ev => {
    ev.preventDefault();
    const text = input.value.trim(); if (!text || !CFG.live) return;
    if (!current) { current = { id: String(Date.now()), title: text.slice(0, 60), messages: [] }; convs.unshift(current); }
    current.messages.push({ role: "user", text }); input.value = ""; input.style.height = "auto";
    drawList(); drawLog(); send.disabled = true; say($("gdb-status"), "ChatGDB réfléchit…");
    try {
      // Action serveur « chat » : à créer à la mise en route (vérifie la session, les crédits, appelle le modèle).
      const out = await Hub.call("chat", { app: ctx.value, messages: current.messages.slice(-20) });
      current.messages.push({ role: "assistant", text: out.text || "" });
      if (out.credits) renderCredits(out.credits);
      say($("gdb-status"), "");
    } catch (e) { say($("gdb-status"), e.message, true); }
    finally { send.disabled = false; save(); drawLog(); }
  });

  drawList(); drawLog();
})();
