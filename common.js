// Socle commun des pages ScoutHub : session, appels au serveur, barre de navigation.
(() => {
  "use strict";
  const TOKEN_KEY = "scouthub.token";
  const store = {
    get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
    set: v => { try { v ? localStorage.setItem(TOKEN_KEY, v) : (localStorage.removeItem(TOKEN_KEY), localStorage.removeItem("scouthub.user")); } catch {} }
  };
  const USER_KEY = "scouthub.user";
  const cachedUser = () => { try { return store.get() ? JSON.parse(localStorage.getItem(USER_KEY) || "null") : null; } catch { return null; } };
  const cacheUser = u => { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch {} };
  const ROLE_LABELS = { membre: "Membre", parent: "Parent", chef_unite: "Chef d’unité", chef_groupe: "Chef de groupe", admin: "Administrateur" };
  const ROLE_ORDER = ["membre", "parent", "chef_unite", "chef_groupe", "admin"];
  const $ = id => document.getElementById(id);
  const say = (el, text, err = false) => { if (!el) return; el.textContent = text; el.classList.toggle("error", err); };

  const Hub = window.Hub = {
    $, say, store, user: null, ROLE_LABELS, ROLE_ORDER,
    // Vrai si l'utilisateur a au moins le rôle demandé (« parent » n'est pas au-dessus de « membre » : voir docs/projet-chatgdb.md).
    can: (user, min) => !min || min === "public" || (!!user && ROLE_ORDER.indexOf(user.role) >= ROLE_ORDER.indexOf(min)), cachedUser, cacheUser,
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
      location.replace("index.html?next=" + encodeURIComponent(Hub.here() + location.search));
    },

    async logout() {
      try { if (store.get()) await Hub.call("logout"); } catch {}
      store.set(null); location.replace("index.html");
    },

    // Vérifie la session ; renvoie l'utilisateur ou redirige vers la connexion.
    async requireUser({ admin = false } = {}) {
      if (!store.get()) { Hub.toLogin(); return null; }
      try { Hub.user = (await Hub.call("me")).user; cacheUser(Hub.user); }
      catch { Hub.toLogin(); return null; }
      if (admin && Hub.user.role !== "admin") { location.replace("index.html"); return null; }
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
        nav.append(Object.assign(document.createElement("a"), { className: "nav-btn", href: "index.html?connexion=1", textContent: "Se connecter" }));
        bar.append(nav); return;
      }
      const nav = Object.assign(document.createElement("nav"), { className: "topnav" });
      const link = (label, href) => {
        const a = Object.assign(document.createElement("a"), { className: "nav-link", href, textContent: label });
        if (Hub.here() === href) a.setAttribute("aria-current", "page");
        nav.append(a);
      };
      link("Applications", "index.html");
      link("ChatGDB", "chatgdb.html");
      link("Mon compte", "compte.html");
      if (user.role === "admin") link("Administration", "admin.html");
      const out = Object.assign(document.createElement("button"), { className: "nav-btn", type: "button", textContent: "Déconnexion" });
      out.onclick = () => Hub.logout();
      nav.append(Object.assign(document.createElement("span"), { className: "who", textContent: user.email }), out);
      bar.append(nav);
    }
  };
})();
