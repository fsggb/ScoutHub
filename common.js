// Socle commun des pages ScoutHub : session, appels au serveur, barre de navigation.
(() => {
  "use strict";
  const TOKEN_KEY = "scouthub.token";
  const store = {
    get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
    set: v => { try { v ? localStorage.setItem(TOKEN_KEY, v) : (localStorage.removeItem(TOKEN_KEY), localStorage.removeItem("scouthub.user"), localStorage.removeItem("scouthub.portail.vue")); } catch {} }
  };
  // Racine du portail (adresse de ce script), pour que les pages dans des sous-dossiers (ChatGDB) retrouvent index.html.
  const ROOT = new URL(".", document.currentScript.src);
  const USER_KEY = "scouthub.user";
  // Simulation (administrateur) : « voir le site comme » une adresse. L'état vit dans sessionStorage (cet onglet seulement, jamais
  // sur disque) ; le profil simulé est gardé à part et n'écrase JAMAIS le profil réel mis en cache.
  const SIM_KEY = "scouthub.simule", SIM_USER = "scouthub.simule.user";
  const simule = () => { try { return sessionStorage.getItem(SIM_KEY) || ""; } catch { return ""; } };
  const cachedUser = () => { try { if (simule()) return JSON.parse(sessionStorage.getItem(SIM_USER) || "null"); return store.get() ? JSON.parse(localStorage.getItem(USER_KEY) || "null") : null; } catch { return null; } };
  const cacheUser = u => { try { if (simule()) { u ? sessionStorage.setItem(SIM_USER, JSON.stringify(u)) : sessionStorage.removeItem(SIM_USER); return; } u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch {} };
  // Lectures qui acceptent « comme » (le serveur le refuse à tout autre que l'administrateur, et ne l'accepte jamais sur une écriture).
  const LEGACY_APPS_SCRIPT = new Set(["google", "codeDemander", "codeVerifier", "me", "logout", "adminList", "adminSetRole", "adminDelete"]);   // actions d'identité que l'ancien serveur sait faire
  const LECTURES_COMME = new Set(["outils", "entrees", "menu", "rubrique"]);
  // « adherent » remplace l'ancien « membre » (même rôle de base, nouveau nom) ; les comptes encore enregistrés sous
  // l'ancien nom sont traités comme « adherent » ci-dessous (normRole), indépendamment de la mise à jour du serveur.
  const ROLE_LABELS = { adherent: "Adhérent", parent: "Parent", chef_unite: "Chef d’unité", chef_groupe: "Chef de groupe", equipe_nationale: "Équipe nationale", admin: "Administrateur" };
  const ROLE_ORDER = ["adherent", "parent", "chef_unite", "chef_groupe", "equipe_nationale", "admin"];
  // Mention à côté du logo (fixe, ne change pas d'une page à l'autre — reprend « ACCES CHEFS » de l'ancien
  // intranet) : le rôle décide, pas le type de compte. « parent » = accès famille ; les rôles d'encadrement =
  // accès chefs ; le reste (compte Google ou e-mail @fsggb.fr sans rôle particulier) = accès membre.
  const ACCES_LABELS = { adherent: "ACCÈS MEMBRE", parent: "ACCÈS FAMILLE", chef_unite: "ACCÈS CHEFS", chef_groupe: "ACCÈS CHEFS", equipe_nationale: "ACCÈS CHEFS", admin: "ACCÈS ADMIN" };
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
    $, say, store, user: null, root: ROOT.href, ROLE_LABELS, ROLE_ORDER, ACCES_LABELS,
    // Vrai si l'utilisateur a au moins le rôle demandé (« parent » n'est pas au-dessus de « membre » : voir ChatGDB/docs/projet-chatgdb.md).
    can: (user, min) => !min || min === "public" || (!!user && ROLE_ORDER.indexOf(normRole(user.role)) >= ROLE_ORDER.indexOf(normRole(min))), cachedUser, cacheUser, normRole,
    // Vrai pour un compte @fsggb.fr (Google Workspace de la fédération, ou code e-mail @fsggb.fr) ; faux pour un
    // compte Google personnel externe (« ACCÈS MEMBRE » ouvert à tous : voir auth.js). Sert à réserver les
    // applications « protege » (ChatGDB, bibliothèque…) aux membres de la fédération, pas à quiconque se connecte.
    // u.fsggb absent (anciens jetons mis en cache avant ce champ) : traité comme membre, pas comme externe.
    estFederation: user => !!user && user.fsggb !== false,
    // Sur l'intranet (Cloudflare), le Worker contrôle l'accès AVANT d'envoyer les pages : il lit un cookie de session. Après
    // une connexion (ou à chaque ouverture de l'accueil avec une session valide), on lui confie le jeton pour qu'il le pose.
    async sessionIntranet() {
      if (!window.SCOUTHUB_INTRANET || location.hostname !== window.SCOUTHUB_INTRANET || !store.get()) return;
      try { await fetch("/_session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: store.get() }), credentials: "same-origin", cache: "no-store" }); } catch { /* sans réseau : sans importance */ }
    },
    simule,
    // Image de fond d'une carte (Drive, servie par l'intranet seulement ; hors intranet : le dégradé habituel). Chargée en différé.
    fondCarte(carte, image) {
      if (!image || !/^images\//i.test(image) || !window.SCOUTHUB_INTRANET || location.hostname !== window.SCOUTHUB_INTRANET) return;
      const u = "/img/" + image.split("/").map(encodeURIComponent).join("/"), im = new Image();
      im.onload = () => { carte.style.backgroundImage = "linear-gradient(180deg, rgba(0,7,97,.04) 35%, rgba(0,7,97,.75)), url(\"" + u + "\")"; carte.style.backgroundSize = "cover"; carte.style.backgroundPosition = "center"; carte.classList.add("avec-image"); };
      im.src = u;
    },
    // Petit rond qui tourne + texte, pour toute zone en cours de chargement.
    chargement(texte) { const d = document.createElement("div"); d.className = "zone-chargement"; d.setAttribute("role", "status"); d.append(Object.assign(document.createElement("span"), { className: "chargement" }), Object.assign(document.createElement("span"), { textContent: texte || "Chargement…" })); return d; },
    // Entrer dans la simulation : l'adresse est vérifiée par le serveur (administrateur seulement) avant de rien changer.
    async simulerComme(email) {
      const e = String(email || "").trim().toLowerCase(); if (!e) throw new Error("Choisissez une adresse.");
      let o; try { sessionStorage.setItem(SIM_KEY, e); sessionStorage.removeItem(SIM_USER); o = await Hub.call("profil", { comme: e }); } catch (x) { try { sessionStorage.removeItem(SIM_KEY); } catch {} throw x; }
      try { sessionStorage.setItem(SIM_USER, JSON.stringify(o.user)); } catch {}
    },
    quitterSimulation() { try { sessionStorage.removeItem(SIM_KEY); sessionStorage.removeItem(SIM_USER); } catch {} location.href = ROOT.href + "admin.html"; },
    // Rond de profil : la photo Google si elle charge, sinon les initiales sur fond doré bien lisible (jamais un rond vide).
    avatar(user, classe) {
      const a = document.createElement(classe === "tb-avatar" ? "a" : "span"); a.className = classe;
      const nom = (user.name || "").trim(), brut = nom ? nom.split(/\s+/).slice(0, 2).map(m => m.charAt(0)).join("") : (user.email || "?").split("@")[0].split(/[._-]+/).slice(0, 2).map(m => m.charAt(0)).join("");
      a.append(Object.assign(document.createElement("span"), { className: "av-ini", textContent: (brut || "?").toUpperCase() }));
      if (user.picture) { const img = Object.assign(document.createElement("img"), { src: user.picture, alt: "", referrerPolicy: "no-referrer" }); img.onerror = () => img.remove(); a.append(img); }
      return a;
    },
    mesMasquees, masquePerso, toggleMasquePerso,
    // Prénom pour l'accueil : le vrai prénom Google (user.name) si on l'a, sinon on le devine dans l'adresse.
    prenom: user => { const n = (user && user.name || "").trim().split(/\s+/)[0] || (user && user.email || "").split("@")[0].split(/[._-]+/)[0] || ""; return n.charAt(0).toUpperCase() + n.slice(1); },
    get token() { return store.get(); },
    here: () => location.pathname.split("/").pop() || "index.html",

    // Identité (Google, code, « moi », déconnexion, gestion des comptes) : bascule vers le nouveau serveur Cloudflare
    // (cloudflare/src/auth.js), qui remplace ces actions de l'ancien backend Apps Script (voir MIGRATION.md). Tout le
    // reste (portail, ChatGDB, boutique…) continue d'appeler Apps Script via SCOUTHUB_API, inchangé ci-dessous.
    IDENTITE: { google: "/auth/google", codeDemander: "/auth/code/demander", codeVerifier: "/auth/code/verifier",
      me: "/auth/me", logout: "/auth/logout", echange: "/auth/echange/emettre", profil: "/auth/profil", rubrique: "/auth/rubrique", outilsDisposer: "/auth/outils/disposer", outils: "/auth/outils", groupes: "/auth/admin/groupes", entrees: "/auth/entrees", entreeEcrire: "/auth/entree/ecrire", entreeSupprimer: "/auth/entree/supprimer", menu: "/auth/menu", adminList: "/auth/admin/list", adminSetRole: "/auth/admin/role", adminDelete: "/auth/admin/delete" },

    async call(action, data = {}) {
      if (simule()) {
        if (action === "me") return { ok: true, user: (await Hub.call("profil", { comme: simule() })).user };
        if (LECTURES_COMME.has(action) && !data.comme) data = { ...data, comme: simule() };
      }
      let chemin = Hub.IDENTITE[action];
      // Version GitHub (pas de serveur Cloudflare) : l'identité d'origine reste sur Apps Script ; les fonctions propres à
      // l'intranet (outils dynamiques, inscriptions, simulation…) n'existent pas ici et le disent clairement.
      if (chemin && !window.SCOUTHUB_AUTH_API) {
        if (!LEGACY_APPS_SCRIPT.has(action)) throw new Error("Disponible sur l’intranet seulement.");
        chemin = "";
      }
      // ChatGDB sur l'intranet : crédits et paramètres de conversation viennent de Cloudflare, plus d'Apps Script.
      if (!chemin && window.SCOUTHUB_CHAT_API && (action === "credits" || action === "rapide" || action === "outil")) {
        let rep; try { rep = await fetch(window.SCOUTHUB_CHAT_API + "/chatgdb/" + action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: store.get(), ...data }) }); } catch { throw new Error("Serveur injoignable."); }
        let o; try { o = await rep.json(); } catch { throw new Error("Réponse invalide du serveur."); }
        if (!o.ok) { const m = o.error && o.error.message ? o.error.message : o.error; if (/Session expirée/.test(m || "") && Hub.here() !== "index.html") Hub.toLogin(); throw new Error(m || "Erreur."); }
        return o;
      }
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
      if (!confirm("Se déconnecter de ScoutHub ?")) return;
      try { if (store.get()) await Hub.call("logout"); } catch {}
      store.set(null); location.replace(ROOT.href + "index.html");
    },

    // Pages réservées (documentation/inscriptions/compte/administration/aide) : <main id="main" hidden> dans le
    // HTML, affiché seulement une fois la connexion confirmée — jamais par défaut. Sans ça, taper l'adresse
    // d'une page réservée l'affiche brièvement avant la redirection (contournement repéré le 27/11) : inoffensif
    // tant que ces pages n'ont que des espaces réservés, mais plus du tout une fois de vraies données posées —
    // toute donnée sensible doit être récupérée par un appel serveur authentifié (comme la liste des comptes de
    // l'administration), jamais écrite dans le HTML statique de la page.
    montrerMain() { const m = $("main"); if (m) m.hidden = false; },

    // Vérifie la session ; renvoie l'utilisateur ou redirige vers la connexion. N'affiche <main> qu'en cas de succès.
    async requireUser({ admin = false } = {}) {
      if (!store.get()) { Hub.toLogin(); return null; }
      try { Hub.user = (await Hub.call("me")).user; cacheUser(Hub.user); }
      catch { Hub.toLogin(); return null; }
      if (admin && Hub.user.role !== "admin") { location.replace(ROOT.href + "index.html"); return null; }
      Hub.montrerMain();
      return Hub.user;
    },

    // Icônes : bibliothèque Lucide (https://lucide.dev, licence ISC/MIT, libre de réutilisation — tracés
    // officiels repris tels quels, pas de dessin maison), viewBox 24x24, trait 2px.
    ICONS: {
      burger: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>',
      recherche: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
      actualiser: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>',
      accueil: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      documentation: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>',
      inscriptions: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 2v2"/><path d="M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><path d="M8 2v2"/><circle cx="12" cy="11" r="3"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>',
      outils: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/></svg>',
      compte: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      reglages: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
      administration: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.77 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
      chatgdb: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      deconnexion: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>'
    },

    // Liste unique des entrées de navigation (barre du bas + tiroir + barre latérale ordinateur) : les 4 onglets
    // puis Mon compte/Réglages/Administration/Déconnexion — reprend la structure « ACCES CHEFS » de l'ancien intranet.
    navItems(user) {
      const items = Hub.tabs(user).map(([id, label, href]) => ({ id, label, href, icon: Hub.ICONS[id] }));
      items.push({ id: "compte", label: "Mon compte", href: "compte.html", icon: Hub.ICONS.compte });
      items.push({ id: "reglages", label: "Réglages (mes applications)", href: "compte.html#mes-applications", icon: Hub.ICONS.reglages });
      if (user.role === "admin") items.push({ id: "administration", label: "Administration", href: "admin.html", icon: Hub.ICONS.administration });
      items.push({ id: "deconnexion", label: "Se déconnecter", onClick: () => Hub.logout(), icon: Hub.ICONS.deconnexion });
      return items;
    },

    // En-tête façon ancien intranet : menu ☰ (tiroir), logo, titre de page, recherche, actualiser.
    renderBar(user, titre) {
      const bar = $("bar"); if (!bar) return;
      bar.textContent = "";
      if (!user) {
        bar.append(Object.assign(document.createElement("img"), { className: "tb-logo", src: "assets/fsggb.png", alt: "FSGGB" }),
          Object.assign(document.createElement("div"), { className: "tb-titre", textContent: "ScoutHub" }));
        const q = new URLSearchParams(location.search);
        if (!(Hub.here() === "index.html" && (q.has("connexion") || q.has("next")))) {
          const sp = document.createElement("span"); sp.className = "tb-spacer"; bar.append(sp);
          bar.append(Object.assign(document.createElement("a"), { className: "nav-btn", href: "index.html?connexion=1", textContent: "Se connecter" }));
        }
        return;
      }
      const burger = Object.assign(document.createElement("button"), { type: "button", className: "tb-icon", innerHTML: Hub.ICONS.burger, ariaLabel: "Menu" });
      // Ordinateur (rail visible) : ☰ étend/réduit le rail en place (réduit le contenu, ne le recouvre pas).
      // Téléphone (pas de rail) : ☰ ouvre le tiroir par-dessus la page, comme avant.
      burger.onclick = () => { if (window.matchMedia("(min-width:880px)").matches) Hub.toggleRail(); else Hub.ouvrirTiroir(user, Hub._actif); };
      // Recherche : champ toujours visible dans l'en-tête (pas une icône qui l'ouvre), comme « ACCES CHEFS »,
      // avec un intitulé qui reprend le nom de la page (« Rechercher Outils », « Rechercher Inscriptions »…).
      // Hub.onSearch, posé par la page elle-même (ex. outils.js), reçoit chaque frappe pour filtrer sur place ;
      // sans ça (page sans recherche locale), Entrée envoie vers Outils avec la recherche pré-remplie.
      const wrap = document.createElement("span"); wrap.className = "tb-search-wrap"; wrap.innerHTML = Hub.ICONS.recherche;
      const champ = Object.assign(document.createElement("input"), { type: "search", className: "tb-search", placeholder: "Rechercher " + (titre || "une application"), autocomplete: "off" });
      wrap.append(champ);
      champ.addEventListener("input", () => { if (Hub.onSearch) Hub.onSearch(champ.value); });
      champ.addEventListener("change", () => {
        if (Hub.onSearch) return;
        const v = champ.value.trim(); if (!v) return;
        location.href = "outils.html?q=" + encodeURIComponent(v);
      });
      Hub._champRecherche = champ; Hub._wrapRecherche = wrap; Hub.rechercheGlobale(champ, wrap);
      // Photo de profil (cliquable, façon Google) : la vraie photo du compte Google si on l'a (connexion Google,
      // lue dans le jeton), sinon le rond avec l'initiale comme avant. Ouvre « Mon compte ».
      const avatar = Hub.avatar(user, "tb-avatar"); avatar.href = "compte.html"; avatar.setAttribute("aria-label", "Mon compte");
      bar.append(burger,
        Object.assign(document.createElement("img"), { className: "tb-logo", src: "assets/fsggb.png", alt: "FSGGB" }),
        Object.assign(document.createElement("div"), { className: "tb-titre", textContent: Hub.ACCES_LABELS[Hub.normRole(user.role)] || "ScoutHub" }),
        Object.assign(document.createElement("span"), { className: "tb-spacer" }), wrap, avatar);
      Hub.bandeauSimulation(user);
      if (Hub._fil) Hub.renderFil(Hub._fil.items, Hub._fil.opts);   // la barre vient d'être reconstruite : on remet le fil
      Hub.placerRecherche();
    },
    // Ordinateur : la recherche se place à droite du fil d'Ariane (comme l'explorateur Windows). Téléphone : centrée dans la barre du haut.

    // Recherche générale (toute l'interface) : la page filtre d'abord sur son propre contenu (Hub.onSearch) ; en plus, une liste de
    // résultats propose les pages, les outils et les documents de la documentation, d'où que l'on parte.
    rechercheGlobale(champ, wrap) {
      const plat = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const liste = document.createElement("div"); liste.className = "rg-liste"; liste.hidden = true; liste.setAttribute("role", "listbox"); wrap.append(liste);
      let docs = null, chargeDocs = false;
      const sources = () => {
        const r = [];
        (Hub.tabs(Hub.user || Hub.cachedUser()) || []).forEach(([id, label, href]) => r.push({ type: "Page", nom: label, desc: "", href }));
        r.push({ type: "Page", nom: "Mon compte", desc: "", href: "compte.html" }, { type: "Page", nom: "Aide", desc: "Écrire au service informatique", href: "aide.html" });
        let apps = []; try { apps = (window.Portail && Portail.model ? Portail.model.apps : (JSON.parse(localStorage.getItem("scouthub.portail.vue") || "null") || {}).m.apps) || []; } catch {}
        apps.filter(a => !a.masque && a.url).forEach(a => r.push({ type: "Outil", nom: a.nom, desc: a.desc || "", href: a.url, externe: !a.local }));
        (docs || []).forEach(d => r.push({ type: "Document", nom: d.nom, desc: d.description || "", href: d.url, externe: true }));
        return r;
      };
      const rendre = () => {
        const q = plat(champ.value.trim()); liste.textContent = "";
        if (q.length < 2) { liste.hidden = true; return; }
        if (!docs && !chargeDocs && Hub.user && window.SCOUTHUB_AUTH_API) { chargeDocs = true; Hub.call("entrees", { section: "documentation" }).then(o => { docs = o.entrees || []; rendre(); }).catch(() => { docs = []; }); }
        const trouves = sources().filter(x => plat(x.nom + " " + x.desc).includes(q)).slice(0, 8);
        if (!trouves.length) { liste.hidden = true; return; }
        trouves.forEach(x => {
          const a = Object.assign(document.createElement("a"), { className: "rg-item", href: x.href }); a.setAttribute("role", "option");
          if (x.externe) { a.target = "_blank"; a.rel = "noopener"; }
          a.append(Object.assign(document.createElement("span"), { className: "rg-type", textContent: x.type }), Object.assign(document.createElement("strong"), { textContent: x.nom }));
          if (x.desc) a.append(Object.assign(document.createElement("small"), { textContent: x.desc }));
          liste.append(a);
        });
        liste.hidden = false;
      };
      champ.addEventListener("input", rendre); champ.addEventListener("focus", rendre);
      champ.addEventListener("keydown", e => { if (e.key === "Escape") liste.hidden = true; else if (e.key === "Enter" && !liste.hidden && !Hub.onSearch) { const p = liste.querySelector("a"); if (p) { e.preventDefault(); p.click(); } } });
      document.addEventListener("click", e => { if (!wrap.contains(e.target)) liste.hidden = true; });
    },
    placerRecherche() {
      const w = Hub._wrapRecherche, bar = $("bar"), fil = document.getElementById("fil"); if (!w || !bar || !w.isConnected && !bar.isConnected) return;
      const bureau = window.matchMedia("(min-width:880px)").matches;
      if (bureau && fil) { if (w.parentNode !== fil) fil.append(w); w.classList.add("dans-fil"); }
      else { w.classList.remove("dans-fil"); const av = bar.querySelector(".tb-avatar"); if (w.parentNode !== bar) { if (av) bar.insertBefore(w, av); else bar.append(w); } }
    },

    // Bandeau permanent pendant une simulation : on sait toujours qui on est « censé » être, et on peut en sortir d'un clic.
    bandeauSimulation(user) {
      document.getElementById("sim-bandeau")?.remove();
      const bar = $("bar"); if (!simule() || !bar) return;
      const b = document.createElement("div"); b.id = "sim-bandeau"; b.setAttribute("role", "status");
      const role = Hub.ROLE_LABELS[Hub.normRole(user && user.role)] || "";
      b.title = "Simulation : vous voyez le site comme " + simule() + " (" + role + "). Lecture seule.";
      b.append(Object.assign(document.createElement("span"), { className: "sim-texte", textContent: "Simulation · " }), Object.assign(document.createElement("b"), { textContent: simule() }));
      const q = Object.assign(document.createElement("button"), { type: "button", textContent: "Quitter", title: "Quitter la simulation" }); q.onclick = () => Hub.quitterSimulation(); b.append(q);
      const avatar = bar.querySelector(".tb-avatar"); if (avatar) bar.insertBefore(b, avatar); else bar.append(b);
    },

    // Fil d'Ariane façon explorateur : précédent, suivant, monter d'un niveau, actualiser, chemin cliquable.
    // items : [{ label, href | onClick }] (le dernier est la position courante) ; opts : { rafraichir: fonction, haut: { href | onClick } }.
    renderFil(items, opts = {}) {
      Hub._fil = { items, opts };
      const bar = $("bar"); if (!bar) return;
      document.getElementById("fil")?.remove();
      const svg = d => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
      const I = { retour: svg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'), avant: svg('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'), haut: svg('<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>'), actualiser: svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'), chevron: svg('<path d="m9 18 6-6-6-6"/>') };
      const nav = document.createElement("nav"); nav.id = "fil"; nav.className = "fil"; nav.setAttribute("aria-label", "Où je suis");
      const bouton = (icone, titre, fn, cls) => { const b = Object.assign(document.createElement("button"), { type: "button", className: "fil-btn" + (cls ? " " + cls : ""), innerHTML: icone, title: titre }); b.setAttribute("aria-label", titre); b.onclick = fn; return b; };
      const parent = opts.haut || (items.length > 1 ? items[items.length - 2] : null);
      const haut = bouton(I.haut, "Monter d’un niveau", () => { if (!parent) return; if (parent.onClick) parent.onClick(); else if (parent.href) location.href = parent.href; });
      if (!parent) haut.disabled = true;
      const chemin = document.createElement("ol"); chemin.className = "fil-chemin";
      items.forEach((it, i) => {
        const li = document.createElement("li"), dernier = i === items.length - 1;
        const c = dernier ? Object.assign(document.createElement("span"), { className: "crumb courant", textContent: it.label }) : it.href ? Object.assign(document.createElement("a"), { className: "crumb", href: it.href, textContent: it.label }) : Object.assign(document.createElement("button"), { type: "button", className: "crumb", textContent: it.label, onclick: it.onClick });
        c.title = it.label; if (dernier) c.setAttribute("aria-current", "page"); li.append(c);
        if (!dernier) li.append(Object.assign(document.createElement("span"), { className: "fil-sep-chemin", innerHTML: I.chevron, ariaHidden: "true" }));
        chemin.append(li);
      });
      nav.append(bouton(I.retour, "Page précédente", () => history.back()), bouton(I.avant, "Page suivante", () => history.forward(), "optionnel"), haut, bouton(I.actualiser, "Actualiser", opts.rafraichir || (() => location.reload()), "optionnel"), chemin);
      bar.after(nav);   // seconde ligne de l'en-tête (masquée sur téléphone)
      Hub.placerRecherche();
    },
    filParDefaut(actif) {
      const NOMS = { accueil: "Accueil", documentation: "Documentation", inscriptions: "Inscriptions", outils: "Outils", compte: "Mon compte", administration: "Administration", aide: "Aide" };
      const nom = NOMS[actif] || document.title.replace(/\s*·.*$/, "") || "ScoutHub";
      return actif === "accueil" ? [{ label: "Accueil" }] : [{ label: "Accueil", href: ROOT.href + "index.html" }, { label: nom }];
    },

    // Valeur du champ de recherche de l'en-tête (ex. en arrivant sur outils.html?q=...) : Hub.onSearch n'est posé
    // qu'après coup par la page, donc on met à jour le champ sans redéclencher onSearch (déjà fait par la page).
    setSearchValue(v) { if (Hub._champRecherche) Hub._champRecherche.value = v; },

    // Tiroir (menu ☰) : la liste complète (Hub.navItems), avec libellés — reprend le menu « ACCES CHEFS » de
    // l'ancien intranet. Sur téléphone, il s'ouvre par-dessus la page ; sur ordinateur, c'est la seule façon de
    // voir le libellé de chaque icône de la barre latérale (celle-ci reste réduite aux icônes seules).
    ouvrirTiroir(user, actif) {
      document.querySelectorAll(".tiroir,.tiroir-fond").forEach(n => n.remove());
      const fond = Object.assign(document.createElement("div"), { className: "tiroir-fond" });
      const tiroir = document.createElement("nav"); tiroir.className = "tiroir"; tiroir.setAttribute("aria-label", "Menu");
      const fermer = () => { fond.remove(); tiroir.remove(); };
      fond.onclick = fermer;
      const entete = document.createElement("div"); entete.className = "tiroir-entete";
      // Même mention que l'en-tête (ACCES CHEFS / MEMBRE / FAMILLE), pas « ScoutHub » : reprend « ACCES CHEFS »
      // en toutes lettres dans le tiroir de l'ancien intranet.
      entete.append(Object.assign(document.createElement("img"), { src: "assets/fsggb.png", alt: "" }), Object.assign(document.createElement("strong"), { textContent: Hub.ACCES_LABELS[Hub.normRole(user.role)] || "ScoutHub" }));
      const els = Hub.navItems(user).map(it => {
        const el = it.href ? Object.assign(document.createElement("a"), { href: it.href }) : Object.assign(document.createElement("button"), { type: "button" });
        el.className = "tiroir-lien" + (it.id === actif ? " actif" : ""); el.innerHTML = it.icon + "<span>" + it.label + "</span>";
        if (it.onClick) el.onclick = it.onClick; else el.addEventListener("click", fermer);
        return el;
      });
      const pied = document.createElement("a"); pied.className = "tiroir-pied"; pied.href = "compte.html";
      const avatar = Hub.avatar(user, "avatar");
      const chevron = document.createElement("span"); chevron.className = "tiroir-pied-chevron"; chevron.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      pied.append(avatar, Object.assign(document.createElement("span"), { className: "tiroir-pied-mail", textContent: user.email }), chevron);
      tiroir.append(entete, ...els, pied);
      document.body.append(fond, tiroir);
    },

    // Barre latérale (ordinateur) : icônes seules par défaut, toute la liste (Hub.navItems). Cliquer sur ☰ l'étend
    // en place (icônes + libellés, cf. toggleRail) : ça réduit le contenu, ça ne l'ouvre pas en tiroir par-dessus
    // — reprend le fonctionnement du vrai « ACCES CHEFS ». Barre du bas (téléphone) : seulement les 4 onglets.
    renderRail(user, actif) {
      document.querySelectorAll(".rail").forEach(n => n.remove());
      if (!user) return;
      const nav = document.createElement("nav");
      nav.className = "rail" + (Hub._railEtendu ? " etendu" : ""); nav.setAttribute("aria-label", "Navigation");
      Hub.navItems(user).forEach(it => {
        const el = it.href ? Object.assign(document.createElement("a"), { href: it.href }) : Object.assign(document.createElement("button"), { type: "button" });
        el.className = "rail-item" + (it.id === actif ? " actif" : ""); el.innerHTML = it.icon + "<span>" + it.label + "</span>";
        el.title = it.label; el.setAttribute("aria-label", it.label);
        if (it.onClick) el.onclick = it.onClick;
        nav.append(el);
      });
      document.body.append(nav);
    },

    // État étendu/réduit du rail : conservé d'une page à l'autre (site multi-pages, pas une appli monopage).
    _railEtendu: (() => { try { return sessionStorage.getItem("scouthub.railEtendu") === "1"; } catch { return false; } })(),
    toggleRail() {
      Hub._railEtendu = !Hub._railEtendu;
      try { sessionStorage.setItem("scouthub.railEtendu", Hub._railEtendu ? "1" : "0"); } catch {}
      const rail = document.querySelector(".rail"); if (rail) rail.classList.toggle("etendu", Hub._railEtendu);
    },

    // Barre du bas à 4 onglets (reprend la structure de l'ancien intranet : Accueil, Documentation, Inscriptions, Outils).
    // « actif » est l'un de ces 4 noms, ou un des autres identifiants de Hub.navItems (compte/reglages/administration),
    // ou rien. « user » : nécessaire pour construire la barre latérale ordinateur (absente si personne n'est connecté).
    // Onglets du bas et du panneau latéral. ChatGDB y est pour l'administrateur (au lieu de la rubrique Outils).
    tabs(user) {
      const t = Hub.TABS.slice();
      if (user && Hub.normRole(user.role) === "admin" && !Hub.simule()) t.push(["chatgdb", "ChatGDB", window.SCOUTHUB_LEGACY ? "https://fsggb.github.io/ChatGDB/" : "/ChatGDB/"]);
      return t;
    },
    TABS: [["accueil", "Accueil", "index.html"], ["documentation", "Documentation", "documentation.html"], ["inscriptions", "Inscriptions", "inscriptions.html"], ["outils", "Outils", "outils.html"]],
    // Barre du bas intelligente (toutes les pages) : elle se range en descendant dans la page, revient dès qu'on remonte ou en bas de page.
    masquageBarreBas(nav) {
      if (Hub._scrollBas) removeEventListener("scroll", Hub._scrollBas);
      let y = scrollY, cache = false;
      Hub._scrollBas = () => {
        const n = document.querySelector(".bottom-tabs"); if (!n) return;
        const d = scrollY - y, fin = innerHeight + scrollY >= document.documentElement.scrollHeight - 8;
        if (Math.abs(d) < 6) return;
        const veut = d > 0 && scrollY > 80 && !fin; if (veut !== cache) { cache = veut; n.classList.toggle("rangee", cache); }
        y = scrollY;
      };
      addEventListener("scroll", Hub._scrollBas, { passive: true });
    },
    renderTabs(actif, user) {
      Hub._actif = actif;
      Hub.renderFil(Hub.filParDefaut(actif));   // fil d'Ariane de la page (les pages à niveaux multiples le remplacent ensuite)
      document.querySelectorAll(".bottom-tabs").forEach(n => n.remove());
      const nav = document.createElement("nav");
      nav.className = "bottom-tabs"; nav.setAttribute("aria-label", "Sections de ScoutHub");
      const onglets = Hub.tabs(user); nav.style.gridTemplateColumns = "repeat(" + onglets.length + ",1fr)";
      onglets.forEach(([id, label, href]) => {
        const a = document.createElement("a"); a.className = "bottom-tab" + (id === actif ? " actif" : ""); a.href = href;
        a.innerHTML = Hub.ICONS[id] + "<span>" + label + "</span>";
        if (id === actif) a.setAttribute("aria-current", "page");
        nav.append(a);
      });
      document.body.append(nav);
      Hub.masquageBarreBas(nav);
      Hub.renderRail(user, actif);
    }
  };
  try { window.matchMedia("(min-width:880px)").addEventListener("change", () => Hub.placerRecherche()); } catch {}
})();
