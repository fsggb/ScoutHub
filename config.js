// Adresse du déploiement Apps Script (backend/Code.gs), terminée par /exec.
window.SCOUTHUB_API = "https://script.google.com/macros/s/AKfycbylU60sGF5NmQpjlrF2CdMNFbkUhXvihwNoTMm67IH0wOk7QZZL_nIfMhWaQinR9j-oFQ/exec";
// Applications proposées dans le portail : une seule entrée par application, sous son nom d’origine.
(() => {
const O = "https://fsggb.github.io/";
window.SCOUTHUB_APPS = [
  { group: "Mon espace", name: "ScoutCloud", desc: "Vos fichiers (connexion requise)", url: O + "ScoutCloud/", icon: "assets/icons/ScoutCloud.svg", login: true },
  { group: "Bureautique", name: "Word", desc: "Traitement de texte", url: O + "ScoutOffice/Word/", icon: "assets/icons/Word.png" },
  { group: "Bureautique", name: "Excel", desc: "Tableur", url: O + "ScoutOffice/Excel/", icon: "assets/icons/Excel.png" },
  { group: "Bureautique", name: "PowerPoint", desc: "Présentations et diaporamas", url: O + "ScoutOffice/PowerPoint/", icon: "assets/icons/PowerPoint.png" },
  { group: "Bureautique", name: "Acrobat", desc: "Lecture et édition de PDF", url: O + "ScoutOffice/PDF/", icon: "assets/icons/PDF.png" },
  { group: "Création", name: "Photoshop", desc: "Retouche et création d’images", url: O + "ScoutOffice/Photoshop/", icon: "assets/icons/Photoshop.png" },
  { group: "Création", name: "Illustrator", desc: "Illustration vectorielle", url: O + "ScoutOffice/Illustrator/", icon: "assets/icons/Illustrator.png" },
  { group: "Création", name: "InDesign", desc: "Mise en page de documents", url: O + "ScoutCraft/InDesign/", icon: "assets/icons/InDesign.png" },
  { group: "Création", name: "Lightroom", desc: "Développement photo", url: O + "ScoutCraft/Lightroom/", icon: "assets/icons/Lightroom.png" },
  { group: "Création", name: "Figma", desc: "Interfaces et prototypes", url: O + "ScoutCraft/Figma/", icon: "assets/icons/Figma.png" },
  { group: "Création", name: "Excalidraw", desc: "Dessin libre et tableaux blancs", url: O + "ScoutOffice/Draw/", icon: "assets/icons/Excalidraw.svg" },
  { group: "Création", name: "Premiere Pro", desc: "Montage vidéo", url: O + "ScoutOffice/Premiere/", icon: "assets/icons/Premiere.png" },
  { group: "Création", name: "After Effects", desc: "Effets visuels et compositing", url: O + "ScoutCraft/AfterEffects/", icon: "assets/icons/AfterEffects.png" },
  { group: "Création", name: "Pro Tools", desc: "Studio audio et mixage", url: O + "ScoutCraft/ProTools/", icon: "assets/icons/ProTools.svg" },
  { group: "Création", name: "Substance Painter", desc: "Peinture de textures 3D", url: O + "ScoutCraft/SubstancePainter/", icon: "assets/icons/SubstancePainter.svg" },
  { group: "Conception et CAO", featured: true, crop: true, name: "CathIA", desc: "Conception 3D pour le froissartage", url: O + "CathIA/", icon: "assets/icons/CathIA.jpg" },
  { group: "Conception et CAO", name: "AutoCAD", desc: "Dessin technique 2D et 3D", url: O + "ScoutDraft/?lang=fr", icon: "assets/icons/ScoutDraft.png" },
  { group: "Conception et CAO", name: "SolidWorks", desc: "Modélisation 3D paramétrique", url: O + "ScoutCAD/?lang=fr", icon: "assets/icons/ScoutCAD.png" },
  { group: "Cartographie", featured: true, name: "Cartes IGN", desc: "Orientation, raids, itinéraires et GPX", url: O + "ScoutMap/", icon: "assets/icons/ScoutMap.svg" },
];
// « Ouvrir avec » (ScoutCloud) : extension -> applications compatibles, la première étant celle par défaut.
window.SCOUTHUB_OPEN_WITH = {
  docx: ["Word"], doc: ["Word"], odt: ["Word"], rtf: ["Word"], txt: ["Word"], md: ["Word"],
  xlsx: ["Excel"], xls: ["Excel"], ods: ["Excel"], csv: ["Excel"],
  pptx: ["PowerPoint"], ppt: ["PowerPoint"], odp: ["PowerPoint"],
  pdf: ["Acrobat"],
  psd: ["Photoshop"], png: ["Photoshop", "Lightroom"], jpg: ["Photoshop", "Lightroom"], jpeg: ["Photoshop", "Lightroom"],
  webp: ["Photoshop"], bmp: ["Photoshop"], gif: ["Photoshop"], tif: ["Photoshop"], tiff: ["Photoshop"],
  svg: ["Illustrator", "CathIA"], ai: ["Illustrator"], eps: ["Illustrator"],
  idml: ["InDesign"], indd: ["InDesign"],
  mp4: ["Premiere Pro"], mov: ["Premiere Pro"], webm: ["Premiere Pro"], avi: ["Premiere Pro"],
  wav: ["Pro Tools"], mp3: ["Pro Tools"], aif: ["Pro Tools"], aiff: ["Pro Tools"],
  excalidraw: ["Excalidraw"],
  dxf: ["AutoCAD"], dwg: ["AutoCAD"],
  stl: ["SolidWorks"], step: ["SolidWorks"], stp: ["SolidWorks"], iges: ["SolidWorks"],
  gpx: ["Cartes IGN"], kml: ["Cartes IGN"],
  json: ["CathIA"], html: ["CathIA"], htm: ["CathIA"]
};
})();
