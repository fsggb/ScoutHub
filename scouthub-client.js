/*
 * Intégration ScoutCloud dans les applications FSGGB (même origine : fsggb.github.io).
 *
 * L'enregistrement dans ScoutCloud est branché sur les gestes de fichier des applications, sans bouton
 * supplémentaire :
 *   - « Enregistrer / Exporter / Télécharger » : l'application déclenche un téléchargement (<a download>) ;
 *     une boîte « Enregistrer sous » propose alors « Cet ordinateur » ou « ScoutCloud » (dossier, nom).
 *   - « Ouvrir / Importer » : l'application déclenche un sélecteur de fichier (<input type="file">) ;
 *     une boîte « Ouvrir » propose « Cet ordinateur » ou « ScoutCloud ».
 * La session est celle de ScoutHub (localStorage « scouthub.token »). Sans session, les applications
 * gardent leur comportement d'origine.
 *
 * Utilisation : <script src="/ScoutHub/scouthub-client.js" data-app="Nom"></script>
 * API : window.ScoutHub = { ready, loggedIn, user, list, get, put, hubUrl }.
 */
(() => {
  "use strict";
  if (window.ScoutHub) return;
  const script = document.currentScript;
  const APP = (script && script.dataset.app) || document.title || "Application";
  const BASE = script && script.src ? new URL(".", script.src).href : location.origin + "/ScoutHub/";
  const TOKEN_KEY = "scouthub.token", DEST_KEY = "scouthub.dest", DIR_KEY = "scouthub.dir";
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const getToken = () => lsGet(TOKEN_KEY);

  let apiUrl = window.SCOUTHUB_API || "";
  const ready = apiUrl ? Promise.resolve() : new Promise(res => {
    const s = document.createElement("script"); s.src = BASE + "config.js";
    s.onload = () => { apiUrl = window.SCOUTHUB_API || ""; res(); }; s.onerror = () => res();
    document.head.append(s);
  });

  async function call(action, data = {}) {
    await ready;
    if (!apiUrl) throw new Error("Serveur ScoutHub non configuré.");
    if (!getToken()) throw new Error("Connectez-vous d’abord sur ScoutHub.");
    let res;
    try { res = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, token: getToken(), ...data }) }); }
    catch { throw new Error("Serveur injoignable."); }
    let out; try { out = await res.json(); } catch { throw new Error("Réponse invalide du serveur."); }
    if (!out.ok) throw new Error(out.error || "Erreur.");
    return out;
  }
  const toB64 = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
  const fromB64 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
  const asBytes = v => typeof v === "string" ? new TextEncoder().encode(v) : v instanceof Uint8Array ? v : new Uint8Array(v);
  const fmt = n => n < 1024 ? `${n} o` : n < 1048576 ? `${(n / 1024).toFixed(1)} Ko` : `${(n / 1048576).toFixed(1)} Mo`;
  const MAX = 10 * 1048576;

  const api = window.ScoutHub = {
    ready, hubUrl: BASE, loggedIn: () => !!getToken(),
    user: async () => (await call("me")).user,
    list: async (path = "") => (await call("list", { path })).entries.filter(e => e.name !== ".gitkeep"),
    get: async path => fromB64((await call("get", { path })).base64),
    put: async (path, data) => { const b = asBytes(data); if (b.length > MAX) throw new Error("Fichier de plus de 10 Mo."); await call("put", { path, base64: toB64(b) }); }
  };

  // ---------- boîte de dialogue « Enregistrer sous » / « Ouvrir » (Shadow DOM) ----------
  const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
  const CSS = `
    :host{all:initial;font-family:"Source Serif 4","Source Serif Pro",Georgia,serif}
    *{box-sizing:border-box;font-family:inherit}
    .bk{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(0,7,97,.5);padding:16px}
    .dlg{width:min(520px,100%);max-height:min(86vh,640px);display:flex;flex-direction:column;background:#fff;color:#0a0c25;border-radius:14px;border-top:4px solid #c6a24e;box-shadow:0 20px 60px rgba(0,7,97,.45);font-size:14px}
    header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 6px}
    h2{margin:0;color:#000761;font-size:19px;font-weight:600}
    .x{border:0;background:none;font-size:22px;line-height:1;color:#6a6c79;cursor:pointer}
    .tabs{display:flex;gap:0;margin:8px 20px 0;border-bottom:1px solid #e7e4dc}
    .tab{flex:1;padding:9px;border:0;border-bottom:3px solid transparent;background:none;color:#4e505d;font-size:14px;font-weight:600;cursor:pointer}
    .tab[aria-selected=true]{color:#000761;border-bottom-color:#c6a24e}
    .pane{padding:14px 20px;overflow:auto;flex:1;min-height:120px}
    .crumbs{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:8px;font-size:13px}
    .crumbs button{border:0;background:none;color:#000761;text-decoration:underline;cursor:pointer;padding:0;font-size:13px}
    ul{list-style:none;margin:0;padding:0;border:1px solid #efece4;border-radius:10px;max-height:240px;overflow:auto}
    li{display:flex;align-items:center;gap:10px;padding:8px 12px;border-top:1px solid #efece4;cursor:pointer}
    li:first-child{border-top:0}li:hover{background:#faf6ea}li.sel{background:#f0e3c3}li.dim{color:#9a9ca8;cursor:default}li.dim:hover{background:none}
    li span.n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}li span.m{color:#6a6c79;font-size:12px}
    label{display:block;margin:12px 0 4px;font-size:13px;font-weight:600}
    input[type=text]{width:100%;padding:9px 11px;border:1px solid #cfcabd;border-radius:8px;font-size:14px}
    input[type=text]:focus{outline:2px solid #c6a24e;border-color:#ab8b4e}
    .hint{color:#6a6c79;font-size:12px;margin:8px 0 0}.err{color:#b42318}.empty{padding:14px;color:#6a6c79}
    footer{display:flex;gap:10px;justify-content:flex-end;align-items:center;padding:12px 20px 16px;border-top:1px solid #efece4}
    footer .sp{flex:1}
    button.b{padding:9px 16px;border:1px solid #cfcabd;border-radius:8px;background:#fff;color:#000761;font-size:14px;cursor:pointer}
    button.b:hover{border-color:#ab8b4e}button.p{background:#000761;border-color:#000761;color:#fff}button.p:hover{background:#1e2472}button.p:disabled{opacity:.55;cursor:wait}
    a{color:#000761}`;

  // mode : "save" | "open". Résout { where:"local", name } | { where:"cloud", path, name } | null.
  function chooser({ mode, name = "", accept = "", pre = false }) {
    return new Promise(resolve => {
      const host = el("div"); const root = host.attachShadow({ mode: "open" });
      const done = v => { document.removeEventListener("keydown", onKey, true); host.remove(); resolve(v); };
      const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); done(null); } };
      document.addEventListener("keydown", onKey, true);
      const exts = accept.split(",").map(s => s.trim().toLowerCase()).filter(s => s.startsWith("."));
      const match = n => !exts.length || exts.some(x => n.toLowerCase().endsWith(x));
      let dest = lsGet(DEST_KEY) === "local" ? "local" : "cloud", dir = (lsGet(DIR_KEY) || "").split("/").filter(Boolean), picked = null, busy = false;
      const title = mode === "save" ? "Enregistrer sous" : "Ouvrir un fichier";

      const bk = el("div", { className: "bk" }); const dlg = el("div", { className: "dlg", role: "dialog" });
      dlg.setAttribute("aria-label", title); bk.append(dlg);
      bk.addEventListener("mousedown", e => { if (e.target === bk) done(null); });
      root.append(el("style", { textContent: CSS }), bk); document.body.append(host);

      function render() {
        dlg.textContent = "";
        const x = el("button", { className: "x", type: "button", textContent: "×", title: "Annuler" }); x.onclick = () => done(null);
        dlg.append(el("header", {}, el("h2", { textContent: title }), x));
        const tabs = el("div", { className: "tabs", role: "tablist" });
        [["local", "Cet ordinateur"], ["cloud", "ScoutCloud"]].forEach(([k, label]) => {
          const t = el("button", { className: "tab", type: "button", role: "tab", textContent: label }); t.setAttribute("aria-selected", String(dest === k));
          t.onclick = () => { dest = k; picked = null; render(); }; tabs.append(t);
        });
        dlg.append(tabs);
        const pane = el("div", { className: "pane" }), foot = el("footer");
        dlg.append(pane, foot);
        const cancel = el("button", { className: "b", type: "button", textContent: "Annuler" }); cancel.onclick = () => done(null);
        const nameInput = el("input", { type: "text", value: name, id: "nm", autocomplete: "off", spellcheck: false });
        const go = el("button", { className: "b p", type: "button" });

        if (dest === "local") {
          if (mode === "save") {
            pane.append(el("label", { textContent: pre ? "Nom du fichier (vide : nom proposé par l’application)" : "Nom du fichier", htmlFor: "nm" }), nameInput,
              el("p", { className: "hint", textContent: "Le sélecteur d’emplacement de votre ordinateur s’ouvre ensuite." }));
            go.textContent = pre ? "Choisir" : "Choisir l’emplacement…";
            go.onclick = () => { lsSet(DEST_KEY, "local"); done({ where: "local", name: nameInput.value.trim() || name }); };
          } else {
            pane.append(el("p", { textContent: "Choisissez un fichier sur cet ordinateur." }));
            go.textContent = "Parcourir…";
            go.onclick = () => { lsSet(DEST_KEY, "local"); done({ where: "local" }); };
          }
          foot.append(el("span", { className: "sp" }), cancel, go);
        } else {
          const status = el("p", { className: "hint", role: "status" });
          const crumbs = el("div", { className: "crumbs" }), list = el("ul");
          const crumb = (label, depth) => { const b = el("button", { type: "button", textContent: label }); b.onclick = () => { dir = dir.slice(0, depth); picked = null; load(); }; return b; };
          const drawCrumbs = () => { crumbs.textContent = ""; crumbs.append(crumb("Mes fichiers", 0)); dir.forEach((d, i) => crumbs.append(" / ", crumb(d, i + 1))); };
          pane.append(crumbs, list);
          if (mode === "save") pane.append(el("label", { textContent: pre ? "Nom du fichier (vide : nom proposé par l’application)" : "Nom du fichier", htmlFor: "nm" }), nameInput);
          pane.append(status);
          const mkdir = el("button", { className: "b", type: "button", textContent: "Nouveau dossier" });
          mkdir.onclick = async () => {
            const n = (window.prompt("Nom du dossier :") || "").trim().replace(/[\\/]/g, ""); if (!n) return;
            try { await api.put([...dir, n, ".gitkeep"].join("/"), new Uint8Array()); dir.push(n); load(); } catch (e) { status.textContent = e.message; status.className = "hint err"; }
          };
          async function load() {
            drawCrumbs(); list.textContent = ""; status.textContent = "Chargement…"; status.className = "hint";
            try {
              const rows = (await api.list(dir.join("/"))).sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name, "fr") : a.type === "dir" ? -1 : 1);
              status.textContent = "";
              if (!rows.length) list.append(el("li", { className: "dim" }, el("span", { className: "n", textContent: "Ce dossier est vide." })));
              rows.forEach(r => {
                const isDir = r.type === "dir", ok = isDir || mode === "save" || match(r.name);
                const li = el("li", { className: ok ? "" : "dim" }, el("span", { textContent: isDir ? "📁" : "📄" }), el("span", { className: "n", textContent: r.name, title: r.name }), el("span", { className: "m", textContent: isDir ? "" : fmt(r.size) }));
                if (ok) {
                  li.onclick = () => {
                    if (isDir) { dir.push(r.name); picked = null; load(); }
                    else if (mode === "save") nameInput.value = r.name;
                    else { picked = r; list.querySelectorAll("li").forEach(x => x.classList.remove("sel")); li.classList.add("sel"); go.disabled = false; }
                  };
                  if (!isDir && mode === "open") li.ondblclick = () => go.click();
                }
                list.append(li);
              });
            } catch (e) { status.textContent = e.message; status.className = "hint err"; }
          }
          if (mode === "save") {
            go.textContent = "Enregistrer";
            go.onclick = async () => {
              const n = nameInput.value.trim() || name; if ((!n && !pre) || busy) return; busy = true; go.disabled = true; status.className = "hint"; status.textContent = "Enregistrement…";
              lsSet(DEST_KEY, "cloud"); lsSet(DIR_KEY, dir.join("/")); done({ where: "cloud", dir: dir.join("/"), name: n });
            };
            foot.append(mkdir, el("span", { className: "sp" }), cancel, go);
          } else {
            go.textContent = "Ouvrir"; go.disabled = true;
            go.onclick = () => { if (!picked) return; lsSet(DEST_KEY, "cloud"); lsSet(DIR_KEY, dir.join("/")); done({ where: "cloud", path: [...dir, picked.name].join("/"), name: picked.name }); };
            foot.append(el("span", { className: "sp" }), cancel, go);
          }
          load();
        }
        setTimeout(() => { const f = pane.querySelector("input") || go; f.focus(); if (f.select) f.select(); }, 0);
      }
      render();
    });
  }

  // Petit message d'état (succès/échec), qui disparaît seul.
  function notify(text, err) {
    const host = el("div"); const root = host.attachShadow({ mode: "open" });
    root.append(el("style", { textContent: `.t{position:fixed;right:16px;bottom:16px;z-index:2147483001;max-width:320px;padding:11px 15px;border-radius:10px;background:${err ? "#b42318" : "#000761"};color:#fff;border-left:4px solid #c6a24e;font:13px Georgia,serif;box-shadow:0 8px 28px rgba(0,7,97,.4)}` }), el("div", { className: "t", textContent: text }));
    document.body.append(host); setTimeout(() => host.remove(), err ? 6000 : 3000);
  }

  // ---------- enregistrement : interception des téléchargements ----------
  const origAnchorClick = HTMLAnchorElement.prototype.click;
  const origDispatch = EventTarget.prototype.dispatchEvent;
  const isDownload = a => a instanceof HTMLAnchorElement && a.hasAttribute("download") && !a.__scouthubSkip && /^(blob:|data:)/.test(a.href);

  const origSavePicker = typeof window.showSaveFilePicker === "function" ? window.showSaveFilePicker.bind(window) : null;

  function anchorDownload(name, blob) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.__scouthubSkip = true; a.style.display = "none";
    document.body.append(a); origAnchorClick.call(a); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  // « Cet ordinateur » : sélecteur d'emplacement natif quand le navigateur l'offre, sinon téléchargement classique.
  async function localSave(name, blob) {
    if (origSavePicker) {
      try {
        const handle = await origSavePicker({ suggestedName: name });
        const w = await handle.createWritable(); await w.write(blob); await w.close(); return;
      } catch (e) { if (e && e.name === "AbortError") return; }
    }
    anchorDownload(name, blob);
  }

  // Choix anticipé : Ctrl+S ouvre la boîte AVANT que l'application ne produise son fichier. Le téléchargement
  // qui suit est alors acheminé sans nouvelle question.
  let pre = null; // { promise, choice, done, until }
  const preUsable = () => pre && (!pre.done || Date.now() < pre.until);
  document.addEventListener("keydown", e => {
    if (!api.loggedIn() || e.altKey || !(e.ctrlKey || e.metaKey) || String(e.key).toLowerCase() !== "s" || preUsable()) return;
    const st = pre = { done: false, choice: null, until: 0 };
    st.promise = chooser({ mode: "save", name: "", pre: true }).then(c => { st.done = true; st.choice = c; st.until = Date.now() + (c ? 90000 : 4000); return c; });
  }, true);

  async function handleDownload(a) {
    const name = a.getAttribute("download") || "fichier";
    let blob;
    try { blob = await (await fetch(a.href)).blob(); } catch { a.__scouthubSkip = true; origAnchorClick.call(a); return; }
    let choice;
    if (preUsable()) {
      const st = pre; choice = await st.promise;
      if (!choice) return;            // choix anticipé annulé : on abandonne aussi l'enregistrement
      pre = null;
    } else choice = await chooser({ mode: "save", name });
    if (!choice) return;
    const finalName = choice.name || name;
    if (choice.where === "local") return localSave(finalName, blob);
    try {
      await api.put((choice.dir ? choice.dir + "/" : "") + finalName, new Uint8Array(await blob.arrayBuffer()));
      notify(`« ${finalName} » enregistré dans ScoutCloud.`);
    } catch (e) { notify(e.message, true); }
  }

  HTMLAnchorElement.prototype.click = function () {
    if (api.loggedIn() && isDownload(this)) { handleDownload(this); return; }
    return origAnchorClick.apply(this, arguments);
  };
  EventTarget.prototype.dispatchEvent = function (ev) {
    if (ev && ev.type === "click" && api.loggedIn() && isDownload(this)) { handleDownload(this); return true; }
    return origDispatch.call(this, ev);
  };

  // ---------- ouverture : interception des sélecteurs de fichier ----------
  const origInputClick = HTMLInputElement.prototype.click;
  const origShowPicker = HTMLInputElement.prototype.showPicker;
  const isPicker = i => i instanceof HTMLInputElement && i.type === "file" && !i.__scouthubSkip;

  async function handlePicker(input) {
    const choice = await chooser({ mode: "open", accept: input.accept || "" });
    if (!choice) return;
    if (choice.where === "local") { input.__scouthubSkip = true; try { origInputClick.call(input); } finally { input.__scouthubSkip = false; } return; }
    try {
      notify("Téléchargement depuis ScoutCloud…");
      const bytes = await api.get(choice.path), dt = new DataTransfer();
      dt.items.add(new File([bytes], choice.name));
      input.files = dt.files;
      input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) { notify(e.message, true); }
  }

  HTMLInputElement.prototype.click = function () {
    if (api.loggedIn() && isPicker(this)) { handlePicker(this); return; }
    return origInputClick.apply(this, arguments);
  };
  if (origShowPicker) HTMLInputElement.prototype.showPicker = function () {
    if (api.loggedIn() && isPicker(this)) { handlePicker(this); return; }
    return origShowPicker.apply(this, arguments);
  };
  // Les API « File System Access » contourneraient ces boîtes : on retombe sur <input> et <a download>.
  for (const k of ["showSaveFilePicker", "showOpenFilePicker"]) { try { Object.defineProperty(window, k, { value: undefined, configurable: true }); } catch {} }

  // ---------- ouverture d'un fichier ScoutCloud dans l'application (?scoutcloud=chemin) ----------
  (async function openRequested() {
    const q = new URLSearchParams(location.search), path = q.get("scoutcloud");
    if (!path) return;
    try { q.delete("scoutcloud"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); } catch {}
    if (!api.loggedIn()) { notify("Connectez-vous à ScoutHub pour ouvrir ce fichier.", true); return; }
    const name = path.split("/").pop(), ext = (name.split(".").pop() || "").toLowerCase();
    let file;
    try { notify("Ouverture de « " + name + " » depuis ScoutCloud…"); file = new File([await api.get(path)], name); }
    catch (e) { notify(e.message, true); return; }
    const accepts = i => { const acc = (i.accept || "").toLowerCase(); return !acc || acc.split(",").some(t => t.trim() === "." + ext || t.trim().endsWith("/*")); };
    const give = i => { const dt = new DataTransfer(); dt.items.add(file); i.files = dt.files; i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); };
    const drop = target => {
      const dt = new DataTransfer(); dt.items.add(file);
      for (const type of ["dragenter", "dragover", "drop"]) target.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }));
    };
    const started = Date.now(); let canvasSeenAt = 0;
    const timer = setInterval(() => {
      const input = [...document.querySelectorAll('input[type="file"]')].find(accepts);
      if (input) { clearInterval(timer); give(input); return; }
      const canvas = document.querySelector("canvas");
      if (canvas && !canvasSeenAt) canvasSeenAt = Date.now();
      if (canvas && Date.now() - canvasSeenAt > 3500) { clearInterval(timer); drop(canvas); return; }  // applications egui/Excalidraw : dépôt de fichier
      if (Date.now() - started > 30000) { clearInterval(timer); notify("L’application n’a pas pu ouvrir « " + name + " ». Utilisez Ouvrir > ScoutCloud.", true); }
    }, 700);
  })();
})();
