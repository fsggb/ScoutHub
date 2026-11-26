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

  // Applications masquées par la personne elle-même (icône ✕ sur l'accueil) : choix propre à cet appareil,
  // indépendant de la mise en page que l'administrateur enregistre pour tout le monde (portail.js/admin-portail.js).
  const PERSO_KEY = "scouthub.masquees.perso";
  const mesMasquees = () => { try { const l = JSON.parse(localStorage.getItem(PERSO_KEY) || "[]"); return Array.isArray(l) ? l : []; } catch { return []; } };
  const masquePerso = id => mesMasquees().includes(id);
  const toggleMasquePerso = id => { const l = mesMasquees(), i = l.indexOf(id); if (i >= 0) l.splice(i, 1); else l.push(id); try { localStorage.setItem(PERSO_KEY, JSON.stringify(l)); } catch {} };

  const Hub = window.Hub = {
    $, say, store, user: null, root: ROOT.href, ROLE_LABELS, ROLE_ORDER,
    // Vrai si l'utilisateur a au moins le rôle demandé (« parent » n'est pas au-dessus de « membre » : voir ChatGDB/docs/projet-chatgdb.md).
    can: (user, min) => !min || min === "public" || (!!user && ROLE_ORDER.indexOf(normRole(user.role)) >= ROLE_ORDER.indexOf(normRole(min))), cachedUser, cacheUser, normRole,
    mesMasquees, masquePerso, toggleMasquePerso,
    get token() { return store.get(); },
    here: () => location.pathname.split("/").pop() || "index.html",

    // Identité (Google, code, « moi », déconnexion, gestion des comptes) : bascule vers le nouveau serveur Cloudflare
    // (cloudflare/src/auth.js), qui remplace ces actions de l'ancien backend Apps Script (voir MIGRATION.md). Tout le
    // reste (portail, ChatGDB, boutique…) continue d'appeler Apps Script via SCOUTHUB_API, inchangé ci-dessous.
    IDENTITE: { google: "/auth/google", codeDemander: "/auth/code/demander", codeVerifier: "/auth/code/verifier",
      me: "/auth/me", logout: "/auth/logout", adminList: "/auth/admin/list", adminSetRole: "/auth/admin/role", adminDelete: "/auth/admin/delete" },

    async call(action, data = {}) {
      const chemin = Hub.IDENTITE[action];
      const API = chemin ? window.SCOUTHUB_AUTH_API : window.SCOUTHUB_API;
      if (!API) throw new Error(chemin ? "La nouvelle connexion n’est pas encore configurée." : "Le serveur ScoutHub n’est pas encore configuré.");
      let res;
      try {
        res = await fetch(API + (chemin || ""), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action, token: store.get(), ...data }) });
      } catch { throw new Error("Serveur injoignable."); }
      let out; try { out = await res.json(); } catch { throw new Error("Réponse invalide du serveur."); }
      if (!out.ok) {
        const message = out.error && out.error.message ? out.error.message : out.error;
        if (/Session expirée/.test(message || "") && Hub.here() !== "index.html") Hub.toLogin();
        throw new Error(message || "Erreur.");
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

    // Icônes (traits simples, génériques, dessinées pour ScoutHub — pas copiées d'une bibliothèque tierce).
    ICONS: {
      burger: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
      recherche: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
      actualiser: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/></svg>',
      accueil: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/></svg>',
      documentation: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 7c-1.8-1.3-4.2-2-7-2v13c2.8 0 5.2.7 7 2m0-13c1.8-1.3 4.2-2 7-2v13c-2.8 0-5.2.7-7 2m0-13v13"/></svg>',
      inscriptions: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.6 1.8-2.4 3-2.4s2.4.8 3 2.4M15 10h4M15 14h4"/></svg>',
      outils: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m14.7 6.3 3 3-7.4 7.4a2.1 2.1 0 0 1-3-3z"/><path d="M14.7 6.3 17 4l3 3-2.3 2.3M4 20l2.6-.8.8-2.6"/></svg>'
    },

    // En-tête façon ancien intranet : menu ☰ (tiroir), logo, titre de page, recherche, actualiser.
    renderBar(user, titre) {
      const bar = $("bar"); if (!bar) return;
      bar.textContent = "";
      if (!user) {
        bar.append(Object.assign(document.createElement("img"), { className: "tb-logo", src: "assets/fsggb.png", alt: "FSGGB" }),
          Object.assign(document.createElement("h1"), { className: "tb-titre", textContent: titre || "ScoutHub" }));
        const q = new URLSearchParams(location.search);
        if (!(Hub.here() === "index.html" && (q.has("connexion") || q.has("next")))) {
          const sp = document.createElement("span"); sp.className = "tb-spacer"; bar.append(sp);
          bar.append(Object.assign(document.createElement("a"), { className: "nav-btn", href: "index.html?connexion=1", textContent: "Se connecter" }));
        }
        return;
      }
      const burger = Object.assign(document.createElement("button"), { type: "button", className: "tb-icon", innerHTML: Hub.ICONS.burger, ariaLabel: "Menu" });
      burger.onclick = () => Hub.ouvrirTiroir(user);
      const refresh = Object.assign(document.createElement("button"), { type: "button", className: "tb-icon", innerHTML: Hub.ICONS.actualiser, ariaLabel: "Actualiser" });
      refresh.onclick = () => location.reload();
      const sp = document.createElement("span"); sp.className = "tb-spacer";
      bar.append(burger,
        Object.assign(document.createElement("img"), { className: "tb-logo", src: "assets/fsggb.png", alt: "FSGGB" }),
        Object.assign(document.createElement("h1"), { className: "tb-titre", textContent: titre || "ScoutHub" }),
        sp, refresh);
    },

    // Tiroir (menu ☰) : compte, administration, déconnexion — reprend la structure « ACCES CHEFS » de l'ancien intranet.
    ouvrirTiroir(user) {
      document.querySelectorAll(".tiroir,.tiroir-fond").forEach(n => n.remove());
      const fond = Object.assign(document.createElement("div"), { className: "tiroir-fond" });
      const tiroir = document.createElement("nav"); tiroir.className = "tiroir"; tiroir.setAttribute("aria-label", "Menu");
      const fermer = () => { fond.remove(); tiroir.remove(); };
      fond.onclick = fermer;
      const entete = document.createElement("div"); entete.className = "tiroir-entete";
      entete.append(Object.assign(document.createElement("img"), { src: "assets/fsggb.png", alt: "" }), Object.assign(document.createElement("strong"), { textContent: "ScoutHub" }));
      const lien = (label, href) => Object.assign(document.createElement("a"), { className: "tiroir-lien", href, textContent: label });
      const items = [lien("Mon compte", "compte.html")];
      if (user.role === "admin") items.push(lien("Administration", "admin.html"));
      const deco = Object.assign(document.createElement("button"), { type: "button", className: "tiroir-lien", textContent: "Se déconnecter" });
      deco.onclick = () => Hub.logout();
      items.push(deco);
      const pied = document.createElement("div"); pied.className = "tiroir-pied";
      const lettre = (user.name || user.email).charAt(0).toUpperCase();
      pied.append(Object.assign(document.createElement("span"), { className: "avatar", textContent: lettre }), Object.assign(document.createElement("span"), { textContent: user.email }));
      tiroir.append(entete, ...items, pied);
      document.body.append(fond, tiroir);
    },

    // Barre du bas à 4 onglets (reprend la structure de l'ancien intranet : Accueil, Documentation, Inscriptions, Outils).
    // « actif » est l'un de ces 4 noms, ou rien (pages hors de ces 4 sections, ex. Mon compte/Administration).
    TABS: [["accueil", "Accueil", "index.html"], ["documentation", "Documentation", "documentation.html"], ["inscriptions", "Inscriptions", "inscriptions.html"], ["outils", "Outils", "outils.html"]],
    renderTabs(actif) {
      const nav = document.createElement("nav");
      nav.className = "bottom-tabs"; nav.setAttribute("aria-label", "Sections de ScoutHub");
      Hub.TABS.forEach(([id, label, href]) => {
        const a = document.createElement("a"); a.className = "bottom-tab" + (id === actif ? " actif" : ""); a.href = href;
        a.innerHTML = Hub.ICONS[id] + "<span>" + label + "</span>";
        if (id === actif) a.setAttribute("aria-current", "page");
        nav.append(a);
      });
      document.body.append(nav);
    }
  };
})();
