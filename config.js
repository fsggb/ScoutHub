// Adresse du déploiement Apps Script (backend/Code.gs), terminée par /exec.
window.SCOUTHUB_API = "https://script.google.com/macros/s/AKfycbylU60sGF5NmQpjlrF2CdMNFbkUhXvihwNoTMm67IH0wOk7QZZL_nIfMhWaQinR9j-oFQ/exec";
// Applications proposées dans le portail : liens directs vers chaque application.
(() => {
const O = "https://fsggb.github.io/";
window.SCOUTHUB_APPS = [
  { group: "Fichiers", name: "ScoutCloud", desc: "Vos fichiers, stockés dans GitHub", url: O + "ScoutCloud/", icon: "assets/fsggb.png" },
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
  { group: "Suite ScoutCraft", name: "ScoutWord", desc: "Traitement de texte", equiv: "Microsoft Word", url: O + "ScoutCraft/ScoutWord/", icon: "assets/icons/Word.png" },
  { group: "Suite ScoutCraft", name: "ScoutGrid", desc: "Tableur", equiv: "Microsoft Excel", url: O + "ScoutCraft/ScoutGrid/", icon: "assets/icons/Excel.png" },
  { group: "Suite ScoutCraft", name: "ScoutDeck", desc: "Présentations et diaporamas", equiv: "Microsoft PowerPoint", url: O + "ScoutCraft/ScoutDeck/", icon: "assets/icons/PowerPoint.png" },
  { group: "Suite ScoutCraft", name: "ScoutPDF", desc: "Lecture et édition de PDF", equiv: "Adobe Acrobat", url: O + "ScoutCraft/ScoutPDF/", icon: "assets/icons/PDF.png" },
  { group: "Suite ScoutCraft", name: "ScoutDesign", desc: "Mise en page de documents", equiv: "Adobe InDesign", url: O + "ScoutCraft/ScoutDesign/", icon: "assets/icons/InDesign.png" },
  { group: "Suite ScoutCraft", name: "ScoutPhoto", desc: "Retouche et création d’images", equiv: "Adobe Photoshop", url: O + "ScoutCraft/ScoutPhoto/", icon: "assets/icons/Photoshop.png" },
  { group: "Suite ScoutCraft", name: "ScoutLight", desc: "Développement photo non destructif", equiv: "Adobe Lightroom", url: O + "ScoutCraft/ScoutLight/", icon: "assets/icons/Lightroom.png" },
  { group: "Suite ScoutCraft", name: "ScoutVector", desc: "Illustration vectorielle", equiv: "Adobe Illustrator", url: O + "ScoutCraft/ScoutVector/", icon: "assets/icons/Illustrator.png" },
  { group: "Suite ScoutCraft", name: "ScoutFig", desc: "Interfaces et prototypes", equiv: "Figma", url: O + "ScoutCraft/ScoutFig/", icon: "assets/icons/Figma.png" },
  { group: "Suite ScoutCraft", name: "ScoutTexture", desc: "Peinture de textures 3D", equiv: "Adobe Substance 3D Painter", url: O + "ScoutCraft/ScoutTexture/", icon: "assets/fsggb.png" },
  { group: "Suite ScoutCraft", name: "ScoutFilm", desc: "Montage vidéo non linéaire", equiv: "Adobe Premiere Pro", url: O + "ScoutCraft/ScoutFilm/", icon: "assets/icons/Premiere.png" },
  { group: "Suite ScoutCraft", name: "ScoutEffect", desc: "Effets visuels et compositing", equiv: "Adobe After Effects", url: O + "ScoutCraft/ScoutEffect/", icon: "assets/icons/AfterEffects.png" },
  { group: "Suite ScoutCraft", name: "ScoutSound", desc: "Studio audio et mixage", equiv: "Avid Pro Tools", url: O + "ScoutCraft/ScoutSound/", icon: "assets/fsggb.png" }
];
})();
