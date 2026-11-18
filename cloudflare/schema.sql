-- Consommation de ChatGDB par personne : une ligne par appel à Claude
CREATE TABLE IF NOT EXISTS usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ts INTEGER NOT NULL,            -- millisecondes
  modele TEXT NOT NULL,
  entree INTEGER NOT NULL DEFAULT 0,
  sortie INTEGER NOT NULL DEFAULT 0,
  recherches INTEGER NOT NULL DEFAULT 0,
  dollars REAL NOT NULL DEFAULT 0,
  credits INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS usage_email_ts ON usage (email, ts);

-- Neurons Workers AI consommés par jour (créée aussi à la demande par le Worker)
CREATE TABLE IF NOT EXISTS neurons (jour TEXT PRIMARY KEY, n REAL NOT NULL DEFAULT 0, appels INTEGER NOT NULL DEFAULT 0);
