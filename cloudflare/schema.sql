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

-- ===== Rupture avec Apps Script : identité et sessions (remplace PropertiesService « u: » et « s: ») =====
-- Comptes @fsggb.fr. role : membre | responsable | admin (ROLES de l'ancien Code.gs à reprendre tel quel côté client).
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'membre',
  name TEXT NOT NULL DEFAULT '',
  google INTEGER NOT NULL DEFAULT 0,      -- 1 si déjà prouvé par Google au moins une fois
  created INTEGER NOT NULL
);

-- Sessions ouvertes (jeton = sha256 envoyé au navigateur ; seul son empreinte est stockée).
CREATE TABLE IF NOT EXISTS sessions (
  hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  exp INTEGER NOT NULL,                   -- expiration, millisecondes epoch
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_exp ON sessions (exp);

-- Codes de connexion à 6 chiffres, par e-mail (remplace CacheService « cd: »/« cl: »/« cn: » ; purge périodique des lignes expirées).
CREATE TABLE IF NOT EXISTS login_codes (
  email TEXT PRIMARY KEY,
  hash TEXT NOT NULL,                     -- sha256(sel + ':' + email + ':' + code)
  sel TEXT NOT NULL,
  essais INTEGER NOT NULL DEFAULT 0,
  envoye INTEGER NOT NULL,                -- horodatage du dernier envoi (anti-rafale)
  demandes INTEGER NOT NULL DEFAULT 1,    -- demandes dans l'heure glissante (anti-abus)
  demandes_depuis INTEGER NOT NULL,
  exp INTEGER NOT NULL
);

-- Quota global d'envoi de codes (protège le compte Gmail d'expéditeur), une ligne par jour calendaire Europe/Paris.
CREATE TABLE IF NOT EXISTS login_codes_quota (jour TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0);
