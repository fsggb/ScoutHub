// Adresse du déploiement Apps Script (backend/Code.gs), terminée par /exec.
window.SCOUTHUB_API = "https://script.google.com/macros/s/AKfycbylU60sGF5NmQpjlrF2CdMNFbkUhXvihwNoTMm67IH0wOk7QZZL_nIfMhWaQinR9j-oFQ/exec";
// Applications proposées dans le portail : une seule entrée par application, sous son nom d’origine.
(() => {
const O = "https://fsggb.github.io/";
window.SCOUTHUB_APPS = [
  { group: "Mon espace", name: "ScoutCloud", desc: "Vos fichiers, stockés dans GitHub", url: O + "ScoutCloud/", icon: "assets/fsggb.png" },
  { group: "Bureautique", name: "Word", desc: "Traitement de texte", url: O + "ScoutOffice/Word/", icon: "assets/icons/Word.png" },
  { group: "Bureautique", name: "Excel", desc: "Tableur", url: O + "ScoutOffice/Excel/", icon: "assets/icons/Excel.png" },
  { group: "Bureautique", name: "PowerPoint", desc: "Présentations et diaporamas", url: O + "ScoutOffice/PowerPoint/", icon: "assets/icons/PowerPoint.png" },
  { group: "Bureautique", name: "Acrobat", desc: "Lecture et édition de PDF", url: O + "ScoutOffice/PDF/", icon: "assets/icons/PDF.png" },
  { group: "Bureautique", name: "TiddlyWiki", desc: "Carnet de notes et wiki personnel", url: O + "ScoutOffice/Notes/", icon: "assets/icons/TiddlyWiki.png" },
  { group: "Création", name: "Photoshop", desc: "Retouche et création d’images", url: O + "ScoutOffice/Photoshop/", icon: "assets/icons/Photoshop.png" },
  { group: "Création", name: "Illustrator", desc: "Illustration vectorielle", url: O + "ScoutOffice/Illustrator/", icon: "assets/icons/Illustrator.png" },
  { group: "Création", name: "InDesign", desc: "Mise en page de documents", url: O + "ScoutCraft/InDesign/", icon: "assets/icons/InDesign.png" },
  { group: "Création", name: "Lightroom", desc: "Développement photo", url: O + "ScoutCraft/Lightroom/", icon: "assets/icons/Lightroom.png" },
  { group: "Création", name: "Figma", desc: "Interfaces et prototypes", url: O + "ScoutCraft/Figma/", icon: "assets/icons/Figma.png" },
  { group: "Création", name: "Excalidraw", desc: "Dessin libre et tableaux blancs", url: O + "ScoutOffice/Draw/", icon: "assets/icons/Excalidraw.svg" },
  { group: "Création", name: "Premiere Pro", desc: "Montage vidéo", url: O + "ScoutOffice/Premiere/", icon: "assets/icons/Premiere.png" },
  { group: "Création", name: "After Effects", desc: "Effets visuels et compositing", url: O + "ScoutCraft/AfterEffects/", icon: "assets/icons/AfterEffects.png" },
  { group: "Création", name: "Pro Tools", desc: "Studio audio et mixage", url: O + "ScoutCraft/ProTools/", icon: "assets/fsggb.png" },
  { group: "Création", name: "Substance Painter", desc: "Peinture de textures 3D", url: O + "ScoutCraft/SubstancePainter/", icon: "assets/fsggb.png" },
  { group: "Conception et CAO", name: "AutoCAD", desc: "Dessin technique 2D et 3D", url: O + "ScoutDraft/?lang=fr", icon: "assets/icons/ScoutDraft.png" },
  { group: "Conception et CAO", name: "SolidWorks", desc: "Modélisation 3D paramétrique", url: O + "ScoutCAD/?lang=fr", icon: "assets/icons/ScoutCAD.png" },
  { group: "Conception et CAO", name: "CathIA", desc: "Conception 3D pour le froissartage", url: O + "CathIA/", icon: "assets/icons/CathIA.jpg" },
  { group: "Cartographie et terrain", name: "Cartes IGN", desc: "Itinéraires, azimuts, profils d’altitude, GPX", url: O + "ScoutMap/", icon: "assets/fsggb.png" }
];
})();
