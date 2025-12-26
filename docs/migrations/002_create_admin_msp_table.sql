-- ================================================================
-- TABLE ADMIN MSP DANS LA BASE PRINCIPALE 'shipnology'
-- ================================================================
-- Cette table stocke les administrateurs MSP qui gèrent les organisations
-- Ces admins peuvent générer des tokens, créer des organisations, etc.
-- ================================================================

\c shipnology;

-- Table des administrateurs MSP
CREATE TABLE admin_msp (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  nom_utilisateur VARCHAR(100) UNIQUE NOT NULL,
  mot_de_passe VARCHAR(255) NOT NULL, -- Hashé avec bcrypt
  
  -- Permissions
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'viewer')),
  -- super_admin: tous les droits
  -- admin: peut créer organisations et tokens
  -- viewer: peut seulement voir
  
  -- Statut
  statut VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'suspendu')),
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  derniere_connexion TIMESTAMP,
  
  -- Audit
  created_by INTEGER REFERENCES admin_msp(id),
  notes TEXT
);

-- Index
CREATE INDEX idx_admin_msp_email ON admin_msp(email);
CREATE INDEX idx_admin_msp_username ON admin_msp(nom_utilisateur);
CREATE INDEX idx_admin_msp_statut ON admin_msp(statut);

-- Trigger pour update
CREATE OR REPLACE FUNCTION update_admin_msp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_msp_updated_at
BEFORE UPDATE ON admin_msp
FOR EACH ROW
EXECUTE FUNCTION update_admin_msp_updated_at();

-- ================================================================
-- CRÉER LE PREMIER ADMIN MSP
-- ================================================================
-- Mot de passe par défaut: "Admin123!" (à changer immédiatement)
-- Hash bcrypt de "Admin123!" = $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr4mj3Sle

INSERT INTO admin_msp (
  nom,
  prenom,
  email,
  nom_utilisateur,
  mot_de_passe,
  role,
  statut
) VALUES (
  'Admin',
  'MSP',
  'admin@msp-erp.com',
  'admin_msp',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr4mj3Sle',
  'super_admin',
  'actif'
);

-- Vérifier
SELECT id, nom, prenom, email, nom_utilisateur, role, statut 
FROM admin_msp;

-- ================================================================
-- IMPORTANT : CHANGER LE MOT DE PASSE IMMÉDIATEMENT
-- ================================================================
-- Générer un nouveau hash avec bcrypt pour votre mot de passe
-- Puis exécuter:
-- UPDATE admin_msp SET mot_de_passe = 'votre_nouveau_hash' WHERE id = 1;
