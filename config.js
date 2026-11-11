// Identifiant client OAuth « Application Web » du projet Google Cloud (identifiant PUBLIC, pas une clé secrète).
// Tant qu'il est vide, le bouton « Continuer avec Google » reste masqué. Le même identifiant doit aussi être
// enregistré dans la propriété de script GOOGLE_CLIENT_ID du serveur Apps Script (backend/Code.gs).
window.SCOUTHUB_GOOGLE_CLIENT_ID = "599247454430-5q2iim2k770v5159vphuael9sl6k160c.apps.googleusercontent.com";
// ChatGDB : assistant IA de la fédération. « live: false » = interface seule, envoi désactivé.
// Crédits (unité : 1 crédit ≈ une question courte). Limites glissantes façon Claude : une par session de 5 heures
// et une par semaine. Les valeurs sont des points de départ à ajuster ; voir docs/projet-chatgdb.md.
window.SCOUTHUB_CHATGDB = {
  live: false,
  windowHours: 5, windowCredits: 30, weekCredits: 60,
  // Crédits gagnés en utilisant les outils : 1 crédit par tranche de 5 minutes d'activité réelle, plafonné par semaine.
  earn: { minutes: 5, credits: 1, weekCap: 40 }
};
// Adresse du déploiement Apps Script (backend/Code.gs), terminée par /exec.
window.SCOUTHUB_API = "https://script.google.com/macros/s/AKfycbylU60sGF5NmQpjlrF2CdMNFbkUhXvihwNoTMm67IH0wOk7QZZL_nIfMhWaQinR9j-oFQ/exec";
// Applications proposées dans le portail : une seule entrée par application, sous son nom d’origine.
(() => {
const O = "https://fsggb.github.io/";
window.SCOUTHUB_APPS = [
  { group: "Assistant", featured: true, name: "ChatGDB", desc: "L’assistant IA de la fédération", url: "ChatGDB/", icon: "assets/icons/ChatGDB.png", local: true },
  { group: "Boutique", featured: true, name: "Boutique GDB", desc: "Uniformes, insignes et accessoires scouts", url: "https://boutique.fsggb.fr/", icon: "assets/icons/Boutique.svg" },
  { group: "Ressources et aide", name: "Bibliothèque", desc: "Documents et ressources de la fédération", url: "ScoutBibliotheque/", icon: "assets/icons/Bibliotheque.svg", local: true },
  { group: "Ressources et aide", name: "Aide", desc: "Un souci avec une application ? Écrire au service informatique", url: "aide.html", icon: "assets/icons/Aide.svg", local: true },
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
  { group: "Conception et CAO", featured: true, crop: true, name: "CathIA", desc: "Conception 3D pour le froissartage", url: "CathIA/", icon: "assets/icons/CathIA.jpg", local: true },
  { group: "Conception et CAO", featured: true, crop: true, name: "SoLeadWorks", desc: "Meubles et coins de patrouille en 3D, avec plans et historique", url: "SoLeadWorks/?lang=fr", icon: "assets/icons/CathIA.jpg", local: true },
  { group: "Conception et CAO", name: "AutoCAD", desc: "Dessin technique 2D et 3D", url: "CADCraft/?lang=fr", icon: "assets/icons/ScoutDraft.png", local: true },
  { group: "Conception et CAO", name: "SolidWorks", desc: "Modélisation 3D paramétrique", url: "SolidCraft/?lang=fr", icon: "assets/icons/ScoutCAD.png", local: true },
  { group: "Cartographie", featured: true, name: "Cartes IGN", desc: "Orientation, raids, itinéraires et GPX", url: "ScoutMap/", icon: "assets/icons/ScoutMap.svg", local: true },
];
})();
