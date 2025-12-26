-- ================================================================
-- ÉTAPE 1 : CRÉATION DE LA BASE PRINCIPALE shipnology
-- ================================================================
-- Cette base contient les informations COMMUNES à toutes les organisations
-- Elle sert de "registre central" pour gérer le multi-tenant
-- ================================================================

-- 1. Créer la base de données principale
CREATE DATABASE shipnology;

-- 2. Se connecter à shipnology
\c shipnology;

-- ================================================================
-- TABLE : organisations
-- ================================================================
-- Contient la liste de toutes les entreprises clientes
-- Chaque ligne = 1 client = 1 base de données dédiée
-- ================================================================

CREATE TABLE organisations (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL, -- Nom officiel: "Transport Rapide SARL"
  nom_affichage VARCHAR(100), -- Nom court: "Transport Rapide"
  database_name VARCHAR(100) UNIQUE NOT NULL, -- Nom de la BDD dédiée: "shipnology_transport_rapide"
  
  -- Personnalisation
  logo_url VARCHAR(500), -- Chemin vers le logo: "/uploads/logos/org_1_logo.png"
  
  -- Contact
  email_contact VARCHAR(255) NOT NULL,
  telephone VARCHAR(50),
  adresse TEXT,
  
  -- Statut et dates
  statut VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'inactif')),
  date_creation TIMESTAMP DEFAULT NOW(),
  date_derniere_connexion TIMESTAMP,
  
  -- Informations de facturation (pour vous, en tant que MSP)
  plan VARCHAR(50) DEFAULT 'standard', -- Ex: "basic", "standard", "premium"
  date_expiration_abonnement DATE,
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_organisations_database_name ON organisations(database_name);
CREATE INDEX idx_organisations_email ON organisations(email_contact);
CREATE INDEX idx_organisations_statut ON organisations(statut);

-- ================================================================
-- TABLE : setup_tokens
-- ================================================================
-- Tokens d'inscription pour les nouveaux clients
-- Générés par l'admin MSP et envoyés par email
-- ================================================================

CREATE TABLE setup_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL, -- Token unique: "a7f3c8d2e9b4f1a6"
  
  -- Informations du contact
  email_destinataire VARCHAR(255) NOT NULL, -- Email du client: "mohamed@transport-rapide.tn"
  nom_contact VARCHAR(255), -- Nom du contact: "Mohamed Ben Ali"
  
  -- Validité du token
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL, -- Expiration: NOW() + 48h
  
  -- Utilisation
  used BOOLEAN DEFAULT FALSE, -- false tant que non utilisé
  used_at TIMESTAMP, -- Date d'utilisation
  organisation_id INTEGER REFERENCES organisations(id), -- ID de l'org créée
  
  -- Métadonnées
  generated_by INTEGER, -- ID du personnel MSP qui a généré le token
  notes TEXT -- Notes internes (ex: "Client référé par partenaire X")
);

-- Index pour performances
CREATE INDEX idx_setup_tokens_token ON setup_tokens(token);
CREATE INDEX idx_setup_tokens_email ON setup_tokens(email_destinataire);
CREATE INDEX idx_setup_tokens_used ON setup_tokens(used);
CREATE INDEX idx_setup_tokens_expires ON setup_tokens(expires_at);

-- ================================================================
-- FONCTION : Génération automatique de database_name
-- ================================================================
-- Transforme "Transport Rapide SARL" en "shipnology_transport_rapide"
-- ================================================================

CREATE OR REPLACE FUNCTION generate_database_name(nom_org VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  nom_clean VARCHAR;
BEGIN
  -- Convertir en minuscules
  nom_clean := LOWER(nom_org);
  
  -- Remplacer espaces par underscores
  nom_clean := REPLACE(nom_clean, ' ', '_');
  
  -- Supprimer caractères spéciaux
  nom_clean := REGEXP_REPLACE(nom_clean, '[^a-z0-9_]', '', 'g');
  
  -- Ajouter préfixe
  nom_clean := 'shipnology_' || nom_clean;
  
  -- Limiter à 63 caractères (limite PostgreSQL)
  IF LENGTH(nom_clean) > 63 THEN
    nom_clean := SUBSTRING(nom_clean, 1, 63);
  END IF;
  
  RETURN nom_clean;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- FONCTION : Génération de token aléatoire
-- ================================================================
-- Génère un token de 32 caractères aléatoires
-- ================================================================

CREATE OR REPLACE FUNCTION generate_setup_token()
RETURNS VARCHAR AS $$
DECLARE
  chars VARCHAR := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result VARCHAR := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || SUBSTR(chars, (RANDOM() * (LENGTH(chars) - 1))::INTEGER + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TRIGGER : Mise à jour automatique du updated_at
-- ================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organisations_updated_at
BEFORE UPDATE ON organisations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- DONNÉES DE TEST (OPTIONNEL)
-- ================================================================
-- Décommentez pour insérer des données de test
-- ================================================================

-- INSERT INTO organisations (nom, nom_affichage, database_name, email_contact, telephone, plan)
-- VALUES 
--   ('MSP - Management System Productivity', 'MSP', 'shipnology_msp', 'contact@msp-erp.com', '+216 70 000 000', 'admin'),
--   ('Transport Rapide SARL', 'Transport Rapide', 'shipnology_transport_rapide', 'mohamed@transport-rapide.tn', '+216 70 123 456', 'standard');

-- ================================================================
-- VÉRIFICATIONS
-- ================================================================

-- Lister toutes les tables créées
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Vérifier la structure de la table organisations
\d organisations;

-- Vérifier la structure de la table setup_tokens
\d setup_tokens;

-- ================================================================
-- FIN DU SCRIPT
-- ================================================================
