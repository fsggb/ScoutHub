// Adresse du déploiement Apps Script (backend/Code.gs), terminée par /exec.
window.SCOUTHUB_API = "";
// Applications proposées dans le portail : liens directs vers chaque application.
(() => {
const O = "https://fsggb.github.io/";
window.SCOUTHUB_APPS = [
  { group: "Bureautique", name: "Word", desc: "Documents et traitement de texte", url: O + "ScoutOffice/Word/", icon: "assets/icons/Word.png" },
  { group: "Bureautique", name: "Excel", desc: "Tableurs et feuilles de calcul", url: O + "ScoutOffice/Excel/", icon: "assets/icons/Excel.png" },
  { group: "Bureautique", name: "PowerPoint", desc: "Présentations et diaporamas", url: O + "ScoutOffice/PowerPoint/", icon: "assets/icons/PowerPoint.png" },
  { group: "Bureautique", name: "PDF", desc: "Lecture et édition de PDF", url: O + "ScoutOffice/PDF/", icon: "assets/icons/PDF.png" },
  { group: "Bureautique", name: "Notes", desc: "Carnet personnel et wiki local", url: O + "ScoutOffice/Notes/", icon: "assets/icons/TiddlyWiki.png" },
  { group: "Création", name: "Photoshop", desc: "Retouche et création d’images", url: O + "ScoutOffice/Photoshop/", icon: "assets/icons/Photoshop.png" },
  { group: "Création", name: "Premiere", desc: "Montage vidéo", url: O + "ScoutOffice/Premiere/", icon: "assets/icons/Premiere.png" },
  { group: "Création", name: "Illustrator", desc: "Illustration vectorielle", url: O + "ScoutOffice/Illustrator/", icon: "assets/icons/Illustrator.png" },
  { group: "Création", name: "Draw", desc: "Dessin libre et tableaux blancs", url: O + "ScoutOffice/Draw/", icon: "assets/icons/Excalidraw.svg" },
  { group: "Conception et CAO", name: "ScoutDraft", desc: "Dessin technique 2D et 3D", url: O + "ScoutDraft/?lang=fr", icon: "assets/icons/ScoutDraft.png" },
  { group: "Conception et CAO", name: "ScoutCAD", desc: "Modélisation paramétrique", url: O + "ScoutCAD/?lang=fr", icon: "assets/icons/ScoutCAD.png" },
  { group: "Conception et CAO", name: "CathIA", desc: "Conception 3D pour le froissartage", url: O + "CathIA/", icon: "assets/icons/CathIA.jpg" },
  { group: "Cartographie et terrain", name: "ScoutMap", desc: "Cartes IGN, itinéraires, azimuts et profils", url: O + "ScoutMap/", icon: "assets/fsggb.png" },
  { group: "Suites complètes", name: "ScoutOffice", desc: "Toute la bureautique et les outils Adobe", url: O + "ScoutOffice/", icon: "assets/fsggb.png" },
  { group: "Suites complètes", name: "ScoutCraft", desc: "La suite complète d’applications", url: O + "ScoutCraft/", icon: "assets/fsggb.png" }
];
})();
