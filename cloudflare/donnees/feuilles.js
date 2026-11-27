// Feuilles du classeur « intranet » reprises dans le miroir. Chaque feuille est indépendante (sa propre synchronisation,
// sa propre erreur). SÉCURITÉ PAR DÉFAUT : seules les colonnes listées dans « clair » restent lisibles dans la base ;
// toute autre colonne (y compris une colonne ajoutée plus tard dans la feuille) est chiffrée. Jamais l'inverse.
// Aucune donnée de personne en clair : noms, adresses, contacts, dates de naissance, liens, remarques sont chiffrés.
//  titre  : nom affiché              chefs : lisible par les chefs, dans leur groupe / leur unité (sinon administrateur seul)
//  annee  : colonne de l'année       vue   : colonnes de la liste (la fiche complète les montre toutes)
export const FEUILLES = {
  "Mineurs": { titre: "Mineurs", chefs: true, annee: "Annee",
    clair: ["Annee", "Date", "Groupe", "Unité", "Paiement", "Assurance"],
    vue: ["Nom enfant", "Prénom", "Date de naissance", "Unité", "Nom du responsable", "Paiement", "Assurance", "Fiche Sanitaire"] },
  "Majeurs": { titre: "Majeurs", chefs: true, annee: "Annee",
    clair: ["Annee", "Date", "Groupe", "Unité", "Routier", "Chef", "Renouvellement", "Date de début", "Date de fin", "Paiement", "Assurance"],
    vue: ["Nom", "Prenom", "Unité", "Chef", "Routier", "Date de début", "Date de fin", "Paiement", "Assurance"] },
  "Camps": { titre: "Camp", chefs: true, annee: "Année d'adhésion",
    clair: ["Année d'adhésion", "Date d'inscription", "Typ d'inscription camp", "Groupe", "Unité", "Date de début de camp", "Date de fin de camp", "Type de responsable", "Moyen de transport - Aller", "Moyen de transport - Retour", "Moyen de paiement"],
    vue: ["Prénom de l'enfant", "Nom du responsable", "Unité", "Typ d'inscription camp", "Date de début de camp", "Date de fin de camp", "Moyen de paiement"] },
  "Cotisations": { titre: "Cotisations Mineurs", chefs: true, annee: "Année",
    clair: ["Année", "Groupe", "Unité", "Montant (par enfant)", "Montant dû / famille (dans ce groupe)"],
    vue: ["Nom enfant", "Prénom enfant", "Nom responsable", "Unité", "Montant (par enfant)", "Montant dû / famille (dans ce groupe)"] },
  "Cotisations_Chefs": { titre: "Cotisations Majeurs", chefs: true, annee: "Année",
    clair: ["Année", "Rôle chef", "Routier / Guide aînée", "Renouvellement", "Groupe", "Unité", "Montant", "Doublon"],
    vue: ["Nom", "Prénom", "Rôle chef", "Unité", "Renouvellement", "Montant"] },
  // Réservées à l'administrateur
  "Compta": { titre: "Comptabilité", chefs: false, annee: "Année",
    clair: ["Groupe", "Unité", "Date d'enregistrement", "Date de la facture", "Montant", "Mode de paiement", "État", "Type compta", "Année"],
    vue: ["Groupe", "Unité", "Date de la facture", "Montant", "Mode de paiement", "État"] },
  "Groupes et unités": { titre: "Groupes et unités", chefs: false, annee: null,
    clair: ["Groupe", "Unité", "Longitude et Latitude (à remplir pour les groupes uniquement)"],
    vue: ["Groupe", "Unité", "Nom", "Prénom", "Mail"] }
};
