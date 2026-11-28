-- Miroir des feuilles Google (lecture seule) : base distincte des comptes, juridiction UE.
-- Colonnes « clair » : liste blanche par feuille (voir feuilles.js). Tout le reste est chiffré (AES-256-GCM) dans « secret ».
CREATE TABLE IF NOT EXISTS feuilles (
  nom TEXT PRIMARY KEY,
  lignes INTEGER NOT NULL DEFAULT 0,
  maj INTEGER NOT NULL DEFAULT 0,          -- dernière synchronisation réussie (ms)
  tentative INTEGER NOT NULL DEFAULT 0,    -- dernière tentative (ms)
  statut TEXT NOT NULL DEFAULT 'jamais',   -- ok | inchangee | erreur | jamais
  erreur TEXT NOT NULL DEFAULT '',         -- message technique, jamais de donnée de la feuille
  empreinte TEXT NOT NULL DEFAULT '',      -- HMAC du contenu : saute la réécriture si rien n'a changé
  entetes TEXT NOT NULL DEFAULT '[]'       -- noms des colonnes, dans l'ordre de la feuille (jamais de contenu)
);
CREATE TABLE IF NOT EXISTS lignes (
  feuille TEXT NOT NULL,
  rang INTEGER NOT NULL,                   -- numéro de ligne dans la feuille
  clair TEXT NOT NULL,                     -- JSON des colonnes non sensibles
  secret TEXT NOT NULL,                    -- base64(iv || chiffré) du JSON des colonnes sensibles ; AAD = feuille|rang
  kid TEXT NOT NULL,                       -- identifiant de la clé de chiffrement (rotation)
  an TEXT NOT NULL DEFAULT '',             -- année (saison) de la ligne : filtre, lisible
  gk TEXT NOT NULL DEFAULT '',             -- groupe (identifiant normalisé) : filtre de portée, lisible
  uk TEXT NOT NULL DEFAULT '',             -- unité (identifiant normalisé) : filtre de portée, lisible
  PRIMARY KEY (feuille, rang)
);
-- Journal d'accès : qui a lu ou synchronisé quoi (jamais le contenu).
CREATE TABLE IF NOT EXISTS meta (cle TEXT PRIMARY KEY, valeur TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  email TEXT NOT NULL,
  action TEXT NOT NULL,                    -- lire | sync | refus
  feuille TEXT NOT NULL DEFAULT '',
  n INTEGER NOT NULL DEFAULT 0,            -- nombre de lignes déchiffrées
  comme TEXT NOT NULL DEFAULT ''           -- adresse simulée par un administrateur (sinon vide)
);
CREATE INDEX IF NOT EXISTS lignes_portee ON lignes (feuille, gk, uk);
CREATE INDEX IF NOT EXISTS lignes_an ON lignes (feuille, an);
CREATE INDEX IF NOT EXISTS journal_ts ON journal (ts);
