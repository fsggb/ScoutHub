// Feuilles du classeur « intranet » reprises dans le miroir. Chaque feuille est indépendante (sa propre synchronisation,
// sa propre erreur). SÉCURITÉ PAR DÉFAUT : seules les colonnes listées dans « clair » restent lisibles dans la base ;
// toute autre colonne (y compris une colonne ajoutée plus tard dans la feuille) est chiffrée. Jamais l'inverse.
// Aucune donnée de personne en clair : noms, adresses, contacts, dates de naissance, liens, remarques sont chiffrés.
export const FEUILLES = {
  "Mineurs": { clair: ["Annee", "Date", "Groupe", "Unité", "Paiement", "Assurance"] },
  "Majeurs": { clair: ["Annee", "Date", "Groupe", "Unité", "Routier", "Chef", "Renouvellement", "Date de début", "Date de fin", "Paiement", "Assurance"] },
  "Cotisations": { clair: ["Année", "Groupe", "Unité", "Montant (par enfant)", "Montant dû / famille (dans ce groupe)"] },
  "Camps": { clair: ["Année d'adhésion", "Date d'inscription", "Typ d'inscription camp", "Groupe", "Unité", "Date de début de camp", "Date de fin de camp", "Type de responsable", "Moyen de transport - Aller", "Moyen de transport - Retour", "Moyen de paiement"] },
  "Groupes et unités": { clair: ["Groupe", "Unité", "Longitude et Latitude (à remplir pour les groupes uniquement)"] },
  "Compta": { clair: ["Groupe", "Unité", "Date d'enregistrement", "Date de la facture", "Montant", "Mode de paiement", "État", "Type compta", "Année"] }
};
