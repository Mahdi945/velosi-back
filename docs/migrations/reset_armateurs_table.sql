-- =====================================================
-- Script de réinitialisation de la table armateurs
-- =====================================================

-- Supprimer la table si elle existe (avec cascade pour les dépendances)
DROP TABLE IF EXISTS armateurs CASCADE;

-- Supprimer les fonctions si elles existent
DROP FUNCTION IF EXISTS update_armateurs_updated_at() CASCADE;

-- Recréer la table avec les bons noms de colonnes
CREATE TABLE armateurs (
  id SERIAL PRIMARY KEY,
  
  -- Informations de base
  code VARCHAR(10) NOT NULL UNIQUE,
  nom VARCHAR(100) NOT NULL,
  abreviation VARCHAR(10),
  
  -- Coordonnées
  adresse VARCHAR(255),
  ville VARCHAR(100),
  pays VARCHAR(100),
  codepostal VARCHAR(20),
  
  -- Contacts
  telephone VARCHAR(20),
  telephonesecondaire VARCHAR(20),
  fax VARCHAR(20),
  email VARCHAR(100),
  siteweb VARCHAR(150),
  
  -- Informations commerciales - Tarifs (en TND - Dinar Tunisien)
  tarif20pieds DECIMAL(10, 2) DEFAULT 0.00,
  tarif40pieds DECIMAL(10, 2) DEFAULT 0.00,
  tarif45pieds DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Informations complémentaires
  logo TEXT, -- URL ou base64 du logo
  notes TEXT,
  
  -- Gestion du statut
  isactive BOOLEAN DEFAULT TRUE,
  
  -- Métadonnées
  createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les recherches
CREATE INDEX idx_armateurs_code ON armateurs(code);
CREATE INDEX idx_armateurs_nom ON armateurs(nom);
CREATE INDEX idx_armateurs_isactive ON armateurs(isactive);
CREATE INDEX idx_armateurs_ville ON armateurs(ville);
CREATE INDEX idx_armateurs_pays ON armateurs(pays);

-- Trigger pour mettre à jour automatiquement updatedat
CREATE OR REPLACE FUNCTION update_armateurs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedat = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_armateurs_timestamp
BEFORE UPDATE ON armateurs
FOR EACH ROW
EXECUTE FUNCTION update_armateurs_updated_at();

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE armateurs IS 'Table des compagnies maritimes (armateurs)';
COMMENT ON COLUMN armateurs.code IS 'Code unique de l''armateur';
COMMENT ON COLUMN armateurs.nom IS 'Nom complet de la compagnie maritime';
COMMENT ON COLUMN armateurs.abreviation IS 'Abréviation du nom de l''armateur';
COMMENT ON COLUMN armateurs.tarif20pieds IS 'Tarif pour conteneur 20 pieds (en TND)';
COMMENT ON COLUMN armateurs.tarif40pieds IS 'Tarif pour conteneur 40 pieds (en TND)';
COMMENT ON COLUMN armateurs.tarif45pieds IS 'Tarif pour conteneur 45 pieds (en TND)';
COMMENT ON COLUMN armateurs.isactive IS 'Statut actif/inactif de l''armateur';

-- Données de test (optionnel)
INSERT INTO armateurs (code, nom, abreviation, ville, pays, telephone, email, siteweb, tarif20pieds, tarif40pieds, tarif45pieds, isactive)
VALUES 
  ('ARM001', 'Mediterranean Shipping Company', 'MSC', 'Genève', 'Suisse', '+41 22 703 8888', 'contact@msc.com', 'https://www.msc.com', 1200.00, 2200.00, 2500.00, TRUE),
  ('ARM002', 'Maersk Line', 'MAERSK', 'Copenhagen', 'Danemark', '+45 33 63 33 63', 'info@maersk.com', 'https://www.maersk.com', 1250.00, 2300.00, 2600.00, TRUE),
  ('ARM003', 'CMA CGM Group', 'CMA-CGM', 'Marseille', 'France', '+33 4 88 91 90 00', 'contact@cma-cgm.com', 'https://www.cma-cgm.com', 1180.00, 2150.00, 2450.00, TRUE),
  ('ARM004', 'COSCO Shipping Lines', 'COSCO', 'Shanghai', 'Chine', '+86 21 6632 7777', 'info@cosco.com', 'https://www.cosco.com', 1100.00, 2000.00, 2300.00, TRUE),
  ('ARM005', 'Hapag-Lloyd', 'HAPAG', 'Hambourg', 'Allemagne', '+49 40 3001 0', 'info@hlag.com', 'https://www.hapag-lloyd.com', 1220.00, 2250.00, 2550.00, TRUE);

-- Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Table armateurs créée avec succès!';
  RAISE NOTICE 'Nombre d''armateurs insérés: %', (SELECT COUNT(*) FROM armateurs);
END $$;
