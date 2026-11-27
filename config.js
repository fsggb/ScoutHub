// Identifiant client OAuth « Application Web » du projet Google Cloud (identifiant PUBLIC, pas une clé secrète).
// Tant qu'il est vide, le bouton « Continuer avec Google » reste masqué.
// Nouveau client « Intranet general - Web » (projet intranet-general) : doit correspondre au GOOGLE_CLIENT_ID du
// Worker Cloudflare (cloudflare/wrangler.jsonc), qui vérifie le jeton. Site de test uniquement sur cette branche :
// la production (main) garde encore l'ancien client, utilisé par Apps Script (backend/Code.gs), inchangé.
window.SCOUTHUB_GOOGLE_CLIENT_ID = "746804418411-qp582kgsv182ljo33vs0hh3dbcu75kie.apps.googleusercontent.com";
// ChatGDB : assistant IA de la fédération. « live: false » = interface seule, envoi désactivé.
// Crédits (unité : 1 crédit ≈ une question courte). Limites glissantes façon Claude : une par session de 5 heures
// et une par semaine. Les valeurs sont des points de départ à ajuster ; voir ChatGDB/docs/projet-chatgdb.md.
window.SCOUTHUB_CHATGDB = {
  live: false,
  windowHours: 5, windowCredits: 30, weekCredits: 60,
  // Crédits gagnés en utilisant les outils : 1 crédit par tranche de 5 minutes d'activité réelle, plafonné par semaine.
  earn: { minutes: 5, credits: 1, weekCap: 40 }
};
// Adresse du déploiement Apps Script (backend/Code.gs), terminée par /exec. Sert encore tout ce qui n'est pas
// l'identité (portail, ChatGDB, boutique…) : voir cloudflare/MIGRATION.md.
window.SCOUTHUB_API = "https://script.google.com/macros/s/AKfycbylU60sGF5NmQpjlrF2CdMNFbkUhXvihwNoTMm67IH0wOk7QZZL_nIfMhWaQinR9j-oFQ/exec";
// Identité (Google, code, comptes) : Worker d'identité auth.fsggb.workers.dev (cloudflare/auth/, code de cloudflare/src/auth.js), qui remplace Apps Script
// pour ces actions précises. Common.js route automatiquement vers l'une ou l'autre adresse selon l'action appelée.
window.SCOUTHUB_AUTH_API = "https://auth.fsggb.workers.dev";
// Applications proposées dans le portail : une seule entrée par application, sous son nom d’origine.
(() => {
const O = "https://fsggb.github.io/";
window.SCOUTHUB_APPS = [
  // Outils de l'ancien intranet (feuille « Outils » de la base de données), en premier : un seul grand lanceur
  // d'applications, pas deux (ces outils vivent dans la même grille que Word/ChatGDB/etc., pas dans un bloc à
  // part sur Outils).
  // Réservés à l'encadrement (role: chef_unite et au-dessus), pas aux simples adhérents/membres : gestion des
  // unités, comptabilité, procurations, contacts.
  { group: "Outils fédération", name: "Gestion unité", desc: "Gestion des unités (ancien outil)", url: "https://script.google.com/macros/s/AKfycbxq02CNzaauOXL7cBWeLvUhiIwHvPHp0pEP3cZY9Or-2ntWgZCVW1CHy5DYE85i6uPSFA/exec", icon: "assets/fsggb.png", protege: true, role: "chef_unite" },
  { group: "Outils fédération", name: "Comptabilité", desc: "Comptabilité des groupes et unités (ancien outil)", url: "https://script.google.com/macros/s/AKfycbx59wWEfz2JDFIuGnwFuy66q4v-BG-QUS0ALgEpNlHCTz6Bv9nZumBzrFqupp1eOi0Q/exec", icon: "assets/fsggb.png", protege: true, role: "chef_unite" },
  { group: "Outils fédération", name: "Procuration", desc: "Création de procurations (ancien outil)", url: "https://www.appsheet.com/start/815a5b07-74ee-4bf4-8d29-c0f8b467d79b?platform=desktop#appName=Cr%C3%A9ationdeprocurationsCA-327649315&vss=H4sIAAAAAAAAA6WOSwrCMBRFtyJ3nBVkqg5EFEFx0jhIm1cJtklpUrWELMh1uDFTP-hUHb77OIcTcNR0WntZHMCz8L7m1IMjCGz6hgS4wNga39pKgAksZf0YV3JPo8n1kndeICLu2EvhyYGHrw387wYGrch4XWpqB90AJ80TTe8BTMMHhshQd17mFd3LExZj2kpbdI7UNgX9FuJmZnpupFELq5K1lJWjeAMfVKIndAEAAA==&view=Page%20D%C3%A9but", icon: "assets/fsggb.png", protege: true, role: "chef_unite" },
  { group: "Outils fédération", name: "Annuaire", desc: "Contacts des groupes et unités (ancien outil)", url: "https://script.google.com/macros/s/AKfycbya1brqCVAlR81m6yHi47QH6AuTkdDNaJQVsqoqh47F-Ue3XGDQHnt8cPZdvP6XvLaj/exec", icon: "assets/fsggb.png", protege: true, role: "chef_unite" },
  { group: "Outils fédération", name: "Agenda", desc: "Agenda de la fédération (ancien outil, accès restreint)", url: "https://script.google.com/macros/s/AKfycbwDrNnYdOiF09HREH4GEnu9u5-mFYzDEb47OFzRXZJMWQi95H4SgL2ta5dICfKt-Qhe/exec", icon: "assets/fsggb.png", protege: true, admin: true },
  // ChatGDB se publie seul (son propre workflow) : url absolue vers https://fsggb.github.io/ChatGDB/, même domaine que
  // ScoutHub donc même connexion. « local » reste vrai : même origine, le partage du jeton fonctionne pareil.
  { group: "Assistant", featured: true, name: "ChatGDB", desc: "L’assistant IA de la fédération", url: O + "ChatGDB/", icon: "assets/icons/ChatGDB.png", protege: true, local: true },
  { group: "Assistant", name: "Laboratoire", desc: "Essais de modèles, dictée, voix et recherche (administrateur)", url: O + "ChatGDB/laboratoire.html", icon: "assets/icons/Laboratoire.svg", protege: true, local: true, admin: true },
  { group: "Vie spirituelle", featured: true, name: "Divinum Officium", desc: "La messe et le bréviaire en latin, jour par jour (rubriques de 1960)", url: "DivinumOfficium/", icon: "assets/icons/DivinumOfficium.svg", local: true },
  { group: "Boutique", featured: true, name: "Boutique GDB", desc: "Uniformes, insignes et accessoires scouts", url: "https://boutique.fsggb.fr/", icon: "assets/icons/Boutique.svg" },
  { group: "Ressources et aide", name: "Bibliothèque", desc: "Documents et ressources de la fédération", url: "ScoutBibliotheque/", icon: "assets/icons/Bibliotheque.svg", protege: true, local: true },
  { group: "Ressources et aide", name: "Aide", desc: "Un souci avec une application ? Écrire au service informatique", url: "aide.html", icon: "assets/icons/Aide.svg", protege: true, local: true },
  { group: "Bureautique", name: "Word", desc: "Traitement de texte", url: "Word/", icon: "assets/icons/Word.png", local: true },
  { group: "Bureautique", name: "Excel", desc: "Tableur", url: "Excel/", icon: "assets/icons/Excel.png", local: true },
  { group: "Bureautique", name: "PowerPoint", desc: "Présentations et diaporamas", url: "PowerPoint/", icon: "assets/icons/PowerPoint.png", local: true },
  { group: "Bureautique", name: "Acrobat", desc: "Lecture et édition de PDF", url: "PDF/", icon: "assets/icons/PDF.png", local: true },
  { group: "Création", name: "Photoshop", desc: "Retouche et création d’images", url: "Photoshop/", icon: "assets/icons/Photoshop.png", local: true },
  { group: "Création", name: "Illustrator", desc: "Illustration vectorielle", url: "Illustrator/", icon: "assets/icons/Illustrator.png", local: true },
  { group: "Création", name: "InDesign", desc: "Mise en page de documents", url: "InDesign/", icon: "assets/icons/InDesign.png", local: true },
  { group: "Création", name: "Lightroom", desc: "Développement photo", url: "Lightroom/", icon: "assets/icons/Lightroom.png", local: true },
  { group: "Création", name: "Figma", desc: "Interfaces et prototypes", url: "Figma/", icon: "assets/icons/Figma.png", local: true },
  { group: "Création", name: "Excalidraw", desc: "Dessin libre et tableaux blancs", url: "Draw/", icon: "assets/icons/Excalidraw.svg", local: true },
  { group: "Création", name: "Premiere Pro", desc: "Montage vidéo", url: "Premiere/", icon: "assets/icons/Premiere.png", local: true },
  { group: "Création", name: "After Effects", desc: "Effets visuels et compositing", url: "AfterEffects/", icon: "assets/icons/AfterEffects.png", local: true },
  { group: "Création", name: "Pro Tools", desc: "Studio audio et mixage", url: "ProTools/", icon: "assets/icons/ProTools.svg", local: true },
  { group: "Création", name: "Substance Painter", desc: "Peinture de textures 3D", url: "SubstancePainter/", icon: "assets/icons/SubstancePainter.svg", local: true },
  { group: "Conception et CAO", featured: true, crop: true, name: "CathIA", desc: "Conception 3D pour le froissartage", url: O + "CathIA/", icon: "assets/icons/CathIA.jpg", local: true },
  // SoLeadWorks, AutoCAD (CADCraft) et SolidWorks (SolidCraft) se publient désormais seuls (ScoutCraft, ScoutDraft,
  // ScoutCAD ont chacun leur propre workflow Pages) : adresses absolues, même domaine que ScoutHub (connexion partagée).
  { group: "Conception et CAO", featured: true, crop: true, name: "SoLeadWorks", desc: "Meubles et coins de patrouille en 3D, avec plans et historique", url: O + "ScoutCraft/?lang=fr", icon: "assets/icons/SoLeadWorks.png", local: true },
  { group: "Conception et CAO", name: "AutoCAD", desc: "Dessin technique 2D et 3D", url: O + "ScoutDraft/?lang=fr", icon: "assets/icons/ScoutDraft.png", local: true },
  { group: "Conception et CAO", name: "SolidWorks", desc: "Modélisation 3D paramétrique", url: O + "ScoutCAD/?lang=fr", icon: "assets/icons/ScoutCAD.png", local: true },
  // Application de la fédération : un compte au moins (n'importe lequel, « accès membre ») est exigé, pour
  // garder une trace de qui y accède — jamais ouvert aux invités, contrairement aux suites bureautique/création.
  { group: "Cartographie", featured: true, name: "Cartes IGN", desc: "Orientation, raids, itinéraires et GPX", url: O + "ScoutMap/", icon: "assets/icons/ScoutMap.svg", local: true, role: "adherent" },
];
})();
