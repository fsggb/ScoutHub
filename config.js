// Adresse du déploiement Apps Script (backend/Code.gs), terminée par /exec.
window.SCOUTHUB_API = "";
// Applications proposées dans le portail : liens directs vers chaque application.
(() => {
const O = "https://fsggb.github.io/";
window.SCOUTHUB_APPS = [
  { group: "Bureautique", name: "Word", desc: "Documents et traitement de texte", equiv: "Microsoft Word", url: O + "ScoutOffice/Word/", icon: "assets/icons/Word.png" },
  { group: "Bureautique", name: "Excel", desc: "Tableurs et feuilles de calcul", equiv: "Microsoft Excel", url: O + "ScoutOffice/Excel/", icon: "assets/icons/Excel.png" },
  { group: "Bureautique", name: "PowerPoint", desc: "Présentations et diaporamas", equiv: "Microsoft PowerPoint", url: O + "ScoutOffice/PowerPoint/", icon: "assets/icons/PowerPoint.png" },
  { group: "Bureautique", name: "PDF", desc: "Lecture et édition de PDF", equiv: "Adobe Acrobat", url: O + "ScoutOffice/PDF/", icon: "assets/icons/PDF.png" },
  { group: "Bureautique", name: "Notes", desc: "Carnet personnel et wiki local", equiv: "TiddlyWiki", url: O + "ScoutOffice/Notes/", icon: "assets/icons/TiddlyWiki.png" },
  { group: "Création", name: "Photoshop", desc: "Retouche et création d’images", equiv: "Adobe Photoshop", url: O + "ScoutOffice/Photoshop/", icon: "assets/icons/Photoshop.png" },
  { group: "Création", name: "Premiere", desc: "Montage vidéo", equiv: "Adobe Premiere Pro", url: O + "ScoutOffice/Premiere/", icon: "assets/icons/Premiere.png" },
  { group: "Création", name: "Illustrator", desc: "Illustration vectorielle", equiv: "Adobe Illustrator", url: O + "ScoutOffice/Illustrator/", icon: "assets/icons/Illustrator.png" },
  { group: "Création", name: "Draw", desc: "Dessin libre et tableaux blancs", equiv: "Excalidraw", url: O + "ScoutOffice/Draw/", icon: "assets/icons/Excalidraw.svg" },
  { group: "Conception et CAO", name: "ScoutDraft", desc: "Dessin technique 2D et 3D", equiv: "AutoCAD", url: O + "ScoutDraft/?lang=fr", icon: "assets/icons/ScoutDraft.png" },
  { group: "Conception et CAO", name: "ScoutCAD", desc: "Modélisation paramétrique", equiv: "SolidWorks / Fusion", url: O + "ScoutCAD/?lang=fr", icon: "assets/icons/ScoutCAD.png" },
  { group: "Conception et CAO", name: "CathIA", desc: "Conception 3D pour le froissartage", url: O + "CathIA/", icon: "assets/icons/CathIA.jpg" },
  { group: "Cartographie et terrain", name: "ScoutMap", desc: "Cartes IGN, itinéraires, azimuts et profils", equiv: "Géoportail / cartes IGN", url: O + "ScoutMap/", icon: "assets/fsggb.png" },
  { group: "Suites complètes", name: "ScoutOffice", desc: "Toute la bureautique et les outils Adobe", url: O + "ScoutOffice/", icon: "assets/fsggb.png" },
  { group: "Suites complètes", name: "ScoutCraft", desc: "La suite complète d’applications", url: O + "ScoutCraft/", icon: "assets/fsggb.png" }
];
})();
