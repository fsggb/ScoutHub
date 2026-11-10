// Identifiant client OAuth « Application Web » du projet Google Cloud (identifiant PUBLIC, pas une clé secrète).
// Tant qu'il est vide, le bouton « Continuer avec Google » reste masqué. Le même identifiant doit aussi être
// enregistré dans la propriété de script GOOGLE_CLIENT_ID du serveur Apps Script (backend/Code.gs).
window.SCOUTHUB_GOOGLE_CLIENT_ID = "";
// ChatGDB : assistant IA de la fédération. « live: false » = interface seule, envoi désactivé.
// Crédits (unité : 1 crédit ≈ une question courte). Limites glissantes façon Claude : une par session de 5 heures
// et une par semaine. Les valeurs sont des points de départ à ajuster ; voir docs/projet-chatgdb.md.
window.SCOUTHUB_CHATGDB = {
  live: false,
  windowHours: 5, windowCredits: 30, weekCredits: 150,
  // Crédits gagnés en utilisant les outils : 1 crédit par tranche de 5 minutes d'activité réelle, plafonné par semaine.
  earn: { minutes: 5, credits: 1, weekCap: 50 }
};
// Adresse du déploiement Apps Script (backend/Code.gs), terminée par /exec.
window.SCOUTHUB_API = "https://script.google.com/macros/s/AKfycbylU60sGF5NmQpjlrF2CdMNFbkUhXvihwNoTMm67IH0wOk7QZZL_nIfMhWaQinR9j-oFQ/exec";
// Applications proposées dans le portail : une seule entrée par application, sous son nom d’origine.
(() => {
const O = "https://fsggb.github.io/";
window.SCOUTHUB_APPS = [
  { group: "Mon espace", name: "ScoutCloud", desc: "Vos fichiers dans Google Drive (bientôt)", url: O + "ScoutCloud/", icon: "assets/icons/ScoutCloud.svg" },
  { group: "Assistant", featured: true, name: "ChatGDB", desc: "L’assistant IA de la fédération (bientôt)", url: "chatgdb.html", icon: "assets/icons/ChatGDB.svg", local: true },
  { group: "Boutique", name: "Boutique GDB", desc: "Uniformes, insignes et accessoires scouts", url: "https://boutique.fsggb.fr/", icon: "assets/icons/Boutique.svg" },
  { group: "Bureautique", name: "Word", desc: "Traitement de texte", url: O + "ScoutOffice/Word/", icon: "assets/icons/Word.png" },
  { group: "Bureautique", name: "Excel", desc: "Tableur", url: O + "ScoutOffice/Excel/", icon: "assets/icons/Excel.png" },
  { group: "Bureautique", name: "PowerPoint", desc: "Présentations et diaporamas", url: O + "ScoutOffice/PowerPoint/", icon: "assets/icons/PowerPoint.png" },
  { group: "Bureautique", name: "Acrobat", desc: "Lecture et édition de PDF", url: O + "ScoutOffice/PDF/", icon: "assets/icons/PDF.png" },
  { group: "Création", name: "Photoshop", desc: "Retouche et création d’images", url: O + "ScoutOffice/Photoshop/", icon: "assets/icons/Photoshop.png" },
  { group: "Création", name: "Illustrator", desc: "Illustration vectorielle", url: O + "ScoutOffice/Illustrator/", icon: "assets/icons/Illustrator.png" },
  { group: "Création", name: "InDesign", desc: "Mise en page de documents", url: O + "ScoutOffice/InDesign/", icon: "assets/icons/InDesign.png" },
  { group: "Création", name: "Lightroom", desc: "Développement photo", url: O + "ScoutOffice/Lightroom/", icon: "assets/icons/Lightroom.png" },
  { group: "Création", name: "Figma", desc: "Interfaces et prototypes", url: O + "ScoutOffice/Figma/", icon: "assets/icons/Figma.png" },
  { group: "Création", name: "Excalidraw", desc: "Dessin libre et tableaux blancs", url: O + "ScoutOffice/Draw/", icon: "assets/icons/Excalidraw.svg" },
  { group: "Création", name: "Premiere Pro", desc: "Montage vidéo", url: O + "ScoutOffice/Premiere/", icon: "assets/icons/Premiere.png" },
  { group: "Création", name: "After Effects", desc: "Effets visuels et compositing", url: O + "ScoutOffice/AfterEffects/", icon: "assets/icons/AfterEffects.png" },
  { group: "Création", name: "Pro Tools", desc: "Studio audio et mixage", url: O + "ScoutOffice/ProTools/", icon: "assets/icons/ProTools.svg" },
  { group: "Création", name: "Substance Painter", desc: "Peinture de textures 3D", url: O + "ScoutOffice/SubstancePainter/", icon: "assets/icons/SubstancePainter.svg" },
  { group: "Conception et CAO", featured: true, crop: true, name: "CathIA", desc: "Conception 3D pour le froissartage", url: O + "CathIA/", icon: "assets/icons/CathIA.jpg" },
  { group: "Conception et CAO", featured: true, crop: true, name: "SoLeadWorks", desc: "Meubles et coins de patrouille en 3D, avec plans et historique", url: O + "SoLeadWorks/?lang=fr", icon: "assets/icons/CathIA.jpg" },
  { group: "Conception et CAO", name: "AutoCAD", desc: "Dessin technique 2D et 3D", url: O + "ScoutDraft/?lang=fr", icon: "assets/icons/ScoutDraft.png" },
  { group: "Conception et CAO", name: "SolidWorks", desc: "Modélisation 3D paramétrique", url: O + "ScoutCAD/?lang=fr", icon: "assets/icons/ScoutCAD.png" },
  { group: "Cartographie", featured: true, name: "Cartes IGN", desc: "Orientation, raids, itinéraires et GPX", url: O + "ScoutMap/", icon: "assets/icons/ScoutMap.svg" },
];
})();
