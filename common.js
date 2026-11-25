// Socle commun des pages ScoutHub : session, appels au serveur, barre de navigation.
(() => {
  "use strict";
  const TOKEN_KEY = "scouthub.token";
  const store = {
    get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
    set: v => { try { v ? localStorage.setItem(TOKEN_KEY, v) : (localStorage.removeItem(TOKEN_KEY), localStorage.removeItem("scouthub.user")); } catch {} }
  };
  // Racine du portail (adresse de ce script), pour que les pages dans des sous-dossiers (ChatGDB) retrouvent index.html.
  const ROOT = new URL(".", document.currentScript.src);
  const USER_KEY = "scouthub.user";
  const cachedUser = () => { try { return store.get() ? JSON.parse(localStorage.getItem(USER_KEY) || "null") : null; } catch { return null; } };
  const cacheUser = u => { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch {} };
  // « adherent » remplace l'ancien « membre » (même rôle de base, nouveau nom) ; les comptes encore enregistrés sous
  // l'ancien nom sont traités comme « adherent » ci-dessous (normRole), indépendamment de la mise à jour du serveur.
  const ROLE_LABELS = { adherent: "Adhérent", parent: "Parent", chef_unite: "Chef d’unité", chef_groupe: "Chef de groupe", equipe_nationale: "Équipe nationale", admin: "Administrateur" };
  const ROLE_ORDER = ["adherent", "parent", "chef_unite", "chef_groupe", "equipe_nationale", "admin"];
  const normRole = r => (!r || r === "membre" || r === "user" ? "adherent" : (ROLE_ORDER.includes(r) ? r : "adherent"));
  const $ = id => document.getElementById(id);
  const say = (el, text, err = false) => { if (!el) return; el.textContent = text; el.classList.toggle("error", err); };

  const Hub = window.Hub = {
    $, say, store, user: null, root: ROOT.href, ROLE_LABELS, ROLE_ORDER,
    // Vrai si l'utilisateur a au moins le rôle demandé (« parent » n'est pas au-dessus de « membre » : voir ChatGDB/docs/projet-chatgdb.md).
    can: (user, min) => !min || min === "public" || (!!user && ROLE_ORDER.indexOf(normRole(user.role)) >= ROLE_ORDER.indexOf(normRole(min))), cachedUser, cacheUser, normRole,
    get token() { return store.get(); },
    here: () => location.pathname.split("/").pop() || "index.html",

    async call(action, data = {}) {
      const API = window.SCOUTHUB_API;
      if (!API) throw new Error("Le serveur ScoutHub n’est pas encore configuré.");
      let res;
      try {
        res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action, token: store.get(), ...data }) });
      } catch { throw new Error("Serveur injoignable."); }
      let out; try { out = await res.json(); } catch { throw new Error("Réponse invalide du serveur."); }
      if (!out.ok) {
        if (/Session expirée/.test(out.error) && Hub.here() !== "index.html") Hub.toLogin();
        throw new Error(out.error || "Erreur.");
      }
      return out;
    },

    toLogin() {
      store.set(null);
      // Hors du dossier de ScoutHub (ex. /ChatGDB/ publié ailleurs) : adresse absolue du site ; dedans : adresse relative au portail.
      const rel = location.pathname.startsWith(ROOT.pathname) ? location.pathname.slice(ROOT.pathname.length) : location.pathname;
      location.replace(ROOT.href + "index.html?next=" + encodeURIComponent(rel + location.search));
    },

    async logout() {
      try { if (store.get()) await Hub.call("logout"); } catch {}
      store.set(null); location.replace(ROOT.href + "index.html");
    },

    // Vérifie la session ; renvoie l'utilisateur ou redirige vers la connexion.
    async requireUser({ admin = false } = {}) {
      if (!store.get()) { Hub.toLogin(); return null; }
      try { Hub.user = (await Hub.call("me")).user; cacheUser(Hub.user); }
      catch { Hub.toLogin(); return null; }
      if (admin && Hub.user.role !== "admin") { location.replace(ROOT.href + "index.html"); return null; }
      return Hub.user;
    },

    // Construit la barre de navigation (page active en surbrillance).
    renderBar(user) {
      const bar = $("bar"); if (!bar) return;
      bar.textContent = "";
      const brand = Object.assign(document.createElement("a"), { className: "brand", href: "index.html" });
      brand.setAttribute("aria-label", "Accueil ScoutHub");
      brand.append(Object.assign(document.createElement("img"), { className: "brand-logo", src: "assets/fsggb.png", alt: "FSGGB", width: 40, height: 40 }),
        Object.assign(document.createElement("strong"), { textContent: "ScoutHub" }));
      bar.append(brand);
      if (!user) {
        const nav = Object.assign(document.createElement("nav"), { className: "topnav" });
        const q = new URLSearchParams(location.search);
        if (!(Hub.here() === "index.html" && (q.has("connexion") || q.has("next")))) nav.append(Object.assign(document.createElement("a"), { className: "nav-btn", href: "index.html?connexion=1", textContent: "Se connecter" }));
        bar.append(nav); return;
      }
      const nav = Object.assign(document.createElement("nav"), { className: "topnav" });
      const link = (label, href) => {
        const a = Object.assign(document.createElement("a"), { className: "nav-link", href, textContent: label });
        if (Hub.here() === href) a.setAttribute("aria-current", "page");
        nav.append(a);
      };
      link("Mon compte", "compte.html");
      if (user.role === "admin") link("Administration", "admin.html");
      const out = Object.assign(document.createElement("button"), { className: "nav-btn", type: "button", textContent: "Déconnexion" });
      out.onclick = () => Hub.logout();
      nav.append(Object.assign(document.createElement("span"), { className: "who", textContent: user.email }), out);
      bar.append(nav);
    },

    // Barre du bas à 4 onglets (reprend la structure de l'ancien intranet : Accueil, Documentation, Inscriptions, Outils).
    // « actif » est l'un de ces 4 noms, ou rien (pages hors de ces 4 sections, ex. Mon compte/Administration).
    TABS: [["accueil", "Accueil", "index.html"], ["documentation", "Documentation", "documentation.html"], ["inscriptions", "Inscriptions", "inscriptions.html"], ["outils", "Outils", "outils.html"]],
    renderTabs(actif) {
      const nav = document.createElement("nav");
      nav.className = "bottom-tabs"; nav.setAttribute("aria-label", "Sections de ScoutHub");
      Hub.TABS.forEach(([id, label, href]) => {
        const a = Object.assign(document.createElement("a"), { className: "bottom-tab" + (id === actif ? " actif" : ""), href, textContent: label });
        if (id === actif) a.setAttribute("aria-current", "page");
        nav.append(a);
      });
      document.body.append(nav);
    }
  };
})();
