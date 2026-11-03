/*
 * Client ScoutHub : enregistrer et rouvrir des fichiers de l'espace personnel depuis n'importe quelle
 * application FSGGB hébergée sur la même origine (fsggb.github.io). La session est celle du portail
 * (localStorage « scouthub.token ») : aucune saisie de jeton ni de mot de passe dans les applications.
 *
 * Utilisation dans une application :
 *   <script src="/ScoutHub/scouthub-client.js" data-app="ScoutDraft"></script>
 * Événements reconnus (compatibles ScoutDraft / ScoutCAD) :
 *   window.dispatchEvent(new CustomEvent("scout-github-save", { detail: { name, bytes } }))  -> dernier export proposé à l'enregistrement
 *   window.addEventListener("scout-github-open", e => e.detail.{name, bytes})                -> fichier choisi dans l'espace personnel
 * Sans événement, les téléchargements de l'application (lien <a download>) sont interceptés et proposés
 * à l'enregistrement dans ScoutHub (le téléchargement local continue normalement).
 * API : window.ScoutHub = { ready, user, list, get, put, offer, open }.
 */
(() => {
  "use strict";
  if (window.ScoutHub) return;
  const script = document.currentScript;
  const APP = (script && script.dataset.app) || document.title || "Application";
  const BASE = (script && script.src ? new URL(".", script.src).href : location.origin + "/ScoutHub/");
  const HUB = BASE;
  const TOKEN_KEY = "scouthub.token";
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };

  let apiUrl = window.SCOUTHUB_API || "";
  const ready = apiUrl ? Promise.resolve() : new Promise(res => {
    const s = document.createElement("script"); s.src = BASE + "config.js";
    s.onload = () => { apiUrl = window.SCOUTHUB_API || ""; res(); }; s.onerror = () => res();
    document.head.append(s);
  });

  async function call(action, data = {}) {
    await ready;
    const token = getToken();
    if (!apiUrl) throw new Error("Serveur ScoutHub non configuré.");
    if (!token) throw new Error("Connectez-vous d’abord sur ScoutHub.");
    let res;
    try { res = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, token, ...data }) }); }
    catch { throw new Error("Serveur injoignable."); }
    let out; try { out = await res.json(); } catch { throw new Error("Réponse invalide du serveur."); }
    if (!out.ok) throw new Error(out.error || "Erreur.");
    return out;
  }
  const toB64 = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
  const fromB64 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
  const asBytes = v => typeof v === "string" ? new TextEncoder().encode(v) : v instanceof Uint8Array ? v : new Uint8Array(v);
  const folder = APP.replace(/[^\p{L}\p{N}._ -]/gu, "").trim() || "Applications";

  const api = {
    ready,
    loggedIn: () => !!getToken(),
    user: async () => (await call("me")).user,
    list: async (path = "") => (await call("list", { path })).entries.filter(e => e.name !== ".gitkeep"),
    get: async path => fromB64((await call("get", { path })).base64),
    put: async (path, data) => { const b = asBytes(data); if (b.length > 10 * 1048576) throw new Error("Fichier de plus de 10 Mo."); await call("put", { path, base64: toB64(b) }); },
    hubUrl: HUB, folder
  };

  // ---------- interface (Shadow DOM : aucun conflit de style avec l'application) ----------
  const host = document.createElement("div");
  host.style.cssText = "all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483000";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host{font-family:"Source Serif 4","Source Serif Pro",Georgia,serif}
    *{box-sizing:border-box;font-family:inherit}
    .fab{display:flex;align-items:center;gap:8px;padding:9px 15px;border:1px solid #c6a24e;border-radius:999px;background:#000761;color:#fff;font-size:13px;cursor:pointer;box-shadow:0 4px 16px rgba(0,7,97,.35)}
    .fab:hover{background:#1e2472}.dot{width:8px;height:8px;border-radius:50%;background:#c6a24e}.dot.on{background:#4ade80}
    .panel{position:absolute;right:0;bottom:46px;width:min(340px,calc(100vw - 32px));max-height:min(70vh,520px);overflow:auto;padding:16px;border-radius:12px;background:#fff;color:#0a0c25;border:1px solid #e7e4dc;border-top:4px solid #c6a24e;box-shadow:0 12px 40px rgba(0,7,97,.35);font-size:14px}
    .panel[hidden],.toast[hidden]{display:none}
    h2{margin:0 0 4px;color:#000761;font-size:17px;font-weight:600}.sub{margin:0 0 10px;color:#6a6c79;font-size:12px}
    button.b{padding:7px 12px;border:1px solid #cfcabd;border-radius:8px;background:#fff;color:#000761;font-size:13px;cursor:pointer}
    button.b:hover{border-color:#ab8b4e}button.p{background:#000761;color:#fff;border-color:#000761}button.p:hover{background:#1e2472}
    input{width:100%;padding:8px 10px;margin:4px 0 8px;border:1px solid #cfcabd;border-radius:8px;font-size:13px}
    ul{list-style:none;margin:8px 0 0;padding:0}li{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid #efece4}
    li span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mut{color:#6a6c79;font-size:12px}
    .st{min-height:18px;margin-top:8px;font-size:12px;color:#4e505d}.st.err{color:#b42318}
    a{color:#000761}.row{display:flex;gap:8px;flex-wrap:wrap}
    .toast{position:absolute;right:0;bottom:46px;width:min(300px,calc(100vw - 32px));padding:12px 14px;border-radius:10px;background:#000761;color:#fff;border-left:4px solid #c6a24e;box-shadow:0 8px 28px rgba(0,7,97,.4);font-size:13px}
    .toast .row{margin-top:8px}
  </style>
  <div class="toast" id="toast" hidden></div>
  <div class="panel" id="panel" hidden></div>
  <button class="fab" id="fab" type="button" title="Espace personnel ScoutCloud"><span class="dot" id="dot"></span>ScoutCloud</button>`;
  const $ = id => root.getElementById(id);
  const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
  const say = (msg, err) => { const s = $("panel").querySelector(".st"); if (s) { s.textContent = msg; s.classList.toggle("err", !!err); } };

  let last = null, dir = folder;
  async function renderPanel() {
    const p = $("panel"); p.textContent = "";
    p.append(el("h2", { textContent: "Mon espace ScoutCloud" }));
    if (!getToken()) {
      p.append(el("p", { className: "sub", textContent: "Vous n’êtes pas connecté." }),
        el("p", {}, "Ouvrez ", el("a", { href: HUB + "?next=" + encodeURIComponent(location.pathname + location.search), textContent: "ScoutHub" }), " pour vous connecter : vous reviendrez ici ensuite."));
      return;
    }
    let who = ""; try { who = (await api.user()).email; } catch (e) { p.append(el("p", { className: "st err", textContent: e.message })); return; }
    p.append(el("p", { className: "sub", textContent: `${who} · dossier « ${dir} »` }));
    if (last) {
      const name = el("input", { value: last.name, "aria-label": "Nom du fichier" });
      const save = el("button", { className: "b p", type: "button", textContent: "Enregistrer le dernier export" });
      save.onclick = async () => { try { say("Envoi…"); await api.put(`${dir}/${name.value.trim() || last.name}`, last.bytes); say("Enregistré dans ScoutCloud."); fill(); } catch (e) { say(e.message, true); } };
      p.append(el("label", { className: "mut", textContent: "Dernier export" }), name, save);
    } else p.append(el("p", { className: "mut", textContent: "Faites un export ou un téléchargement dans l’application : il sera proposé ici." }));
    p.append(el("div", { className: "st", role: "status" }), el("ul", { id: "files" }),
      el("p", { className: "mut" }, el("a", { href: new URL("../ScoutCloud/?dossier=" + encodeURIComponent(dir), BASE).href, target: "_blank", rel: "noopener", textContent: "Ouvrir ScoutCloud ↗" })));
    const fill = async () => {
      const ul = p.querySelector("#files"); ul.textContent = "";
      try {
        const rows = await api.list(dir).catch(() => []);
        if (!rows.length) ul.append(el("li", {}, el("span", { className: "mut", textContent: "Aucun fichier dans ce dossier." })));
        rows.filter(r => r.type === "file").forEach(r => {
          const open = el("button", { className: "b", type: "button", textContent: "Ouvrir" });
          open.onclick = async () => { try { say("Téléchargement…"); const bytes = await api.get(`${dir}/${r.name}`);
            const ev = new CustomEvent("scout-github-open", { detail: { name: r.name, bytes }, cancelable: true });
            window.dispatchEvent(ev); say("Fichier transmis à l’application."); saveLocal(r.name, bytes); } catch (e) { say(e.message, true); } };
          ul.append(el("li", {}, el("span", { textContent: r.name, title: r.name }), open));
        });
      } catch (e) { say(e.message, true); }
    };
    fill();
  }
  function saveLocal(name, bytes) { /* repli : si l'application n'écoute pas l'ouverture, le fichier est téléchargé */
    if (window.__scouthubOpenHandled) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bytes])); a.download = name; a.__scouthubSkip = true; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  if (script && script.dataset.open === "event") window.__scouthubOpenHandled = true;
  const origAdd = window.addEventListener.bind(window);
  window.addEventListener = function (type, fn, ...rest) {
    if (type === "scout-github-open") window.__scouthubOpenHandled = true;
    return origAdd(type, fn, ...rest);
  };

  let toastTimer;
  function offer(name, bytes) {
    last = { name, bytes: asBytes(bytes) };
    const t = $("toast"); t.textContent = ""; t.hidden = false;
    t.append(el("div", { textContent: `« ${name} » prêt.` }));
    const row = el("div", { className: "row" });
    const yes = el("button", { className: "b p", type: "button", textContent: "Enregistrer dans ScoutCloud" });
    yes.style.background = "#c6a24e"; yes.style.borderColor = "#c6a24e"; yes.style.color = "#000761";
    yes.onclick = async () => {
      t.hidden = true;
      if (!getToken()) { togglePanel(true); return; }
      try { await api.put(`${dir}/${name}`, last.bytes); t.textContent = "Enregistré dans ScoutCloud."; t.hidden = false; setTimeout(() => t.hidden = true, 2500); }
      catch (e) { t.textContent = e.message; t.hidden = false; setTimeout(() => t.hidden = true, 4000); }
    };
    const no = el("button", { className: "b", type: "button", textContent: "Non merci" }); no.onclick = () => t.hidden = true;
    row.append(yes, no); t.append(row);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 12000);
  }
  api.offer = offer;
  api.open = () => togglePanel(true);

  function togglePanel(show) {
    const p = $("panel"); p.hidden = show === undefined ? !p.hidden : !show;
    if (!p.hidden) { $("toast").hidden = true; renderPanel(); }
  }
  $("fab").onclick = () => togglePanel();
  const refreshDot = () => $("dot").classList.toggle("on", !!getToken());
  refreshDot(); window.addEventListener("storage", e => { if (e.key === TOKEN_KEY) refreshDot(); });

  window.addEventListener("scout-github-save", e => { if (e.detail && e.detail.bytes) offer(e.detail.name || "fichier", e.detail.bytes); });

  // Interception générique des téléchargements (applications sans événement dédié).
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    try {
      if (this.download && this.href.startsWith("blob:") && !this.__scouthubSkip) {
        const name = this.download;
        fetch(this.href).then(r => r.arrayBuffer()).then(buf => offer(name, new Uint8Array(buf))).catch(() => {});
      }
    } catch { /* ignore */ }
    return origClick.apply(this, arguments);
  };

  const mount = () => document.body.append(host);
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
  window.ScoutHub = api;
})();
