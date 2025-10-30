-- Migration pour créer la table correspondants
-- Date: 2025-10-30

CREATE TABLE IF NOT EXISTS correspondants (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  nature VARCHAR(20) NOT NULL DEFAULT 'LOCAL', -- LOCAL ou ETRANGER
  libelle VARCHAR(255) NOT NULL,
  logo VARCHAR(255), -- Chemin vers le fichier logo
  
  -- Coordonnées
  adresse TEXT,
  ville VARCHAR(100),
  code_postal VARCHAR(20),
  pays VARCHAR(100),
  
  -- Contacts
  telephone VARCHAR(50),
  telephone_secondaire VARCHAR(50),
  fax VARCHAR(50),
  email VARCHAR(100),
  site_web VARCHAR(255),
  
  -- Informations fiscales
  etat_fiscal VARCHAR(50),
  tx_foids_volume DECIMAL(10,3) DEFAULT 0.000,
  matricule_fiscal VARCHAR(100),
  type_mf VARCHAR(50),
  timbre VARCHAR(20),
  echeance INTEGER DEFAULT 0,
  
  -- Informations comptables
  debit_initial DECIMAL(15,3) DEFAULT 0.000,
  credit_initial DECIMAL(15,3) DEFAULT 0.000,
  solde DECIMAL(15,3) DEFAULT 0.000,
  devise VARCHAR(10) DEFAULT 'TND',
  
  -- Compétences
  competence_maritime BOOLEAN DEFAULT false,
  competence_routier BOOLEAN DEFAULT false,
  competence_aerien BOOLEAN DEFAULT false,
  
  -- Notes
  notes TEXT,
  
  -- Statut et métadonnées
  statut VARCHAR(20) NOT NULL DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_nature CHECK (nature IN ('LOCAL', 'ETRANGER')),
  CONSTRAINT chk_statut CHECK (statut IN ('actif', 'inactif'))
);

-- Index pour optimiser les recherches
CREATE INDEX idx_correspondants_code ON correspondants(code);
CREATE INDEX idx_correspondants_libelle ON correspondants(libelle);
CREATE INDEX idx_correspondants_nature ON correspondants(nature);
CREATE INDEX idx_correspondants_statut ON correspondants(statut);
CREATE INDEX idx_correspondants_ville ON correspondants(ville);
CREATE INDEX idx_correspondants_pays ON correspondants(pays);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_correspondants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER trigger_update_correspondants_updated_at
BEFORE UPDATE ON correspondants
FOR EACH ROW
EXECUTE FUNCTION update_correspondants_updated_at();

-- Fonction pour générer automatiquement le code
CREATE OR REPLACE FUNCTION generate_correspondant_code()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  new_code VARCHAR(50);
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    -- Trouver le prochain numéro disponible
    SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1
    INTO next_number
    FROM correspondants
    WHERE code ~ '^COR[0-9]+$';
    
    -- Générer le code avec padding
    new_code := 'COR' || LPAD(next_number::TEXT, 6, '0');
    NEW.code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer le code automatiquement
CREATE TRIGGER trigger_generate_correspondant_code
BEFORE INSERT ON correspondants
FOR EACH ROW
EXECUTE FUNCTION generate_correspondant_code();

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE correspondants IS 'Table des correspondants (sociétés de transport et logistique)';
COMMENT ON COLUMN correspondants.code IS 'Code unique auto-généré (COR000001, COR000002, ...)';
COMMENT ON COLUMN correspondants.nature IS 'Nature du correspondant: LOCAL ou ETRANGER';
COMMENT ON COLUMN correspondants.libelle IS 'Nom du correspondant';
COMMENT ON COLUMN correspondants.logo IS 'Chemin vers le fichier logo';
COMMENT ON COLUMN correspondants.tx_foids_volume IS 'Taux FOIDS/VOLUME en pourcentage';
COMMENT ON COLUMN correspondants.matricule_fiscal IS 'Matricule fiscal (M.F)';
COMMENT ON COLUMN correspondants.timbre IS 'Timbre (Oui/Non)';
COMMENT ON COLUMN correspondants.echeance IS 'Échéance en jours';
COMMENT ON COLUMN correspondants.devise IS 'Devise pour les transactions (TND, EUR, USD, etc.)';
COMMENT ON COLUMN correspondants.competence_maritime IS 'Compétence dans le transport maritime';
COMMENT ON COLUMN correspondants.competence_routier IS 'Compétence dans le transport routier';
COMMENT ON COLUMN correspondants.competence_aerien IS 'Compétence dans le transport aérien';
-- Insertion de lignes de démonstration pour la table correspondants
INSERT INTO correspondants (
  code, nature, libelle, logo, adresse, ville, code_postal, pays, telephone, telephone_secondaire, fax, email, site_web,
  etat_fiscal, tx_foids_volume, matricule_fiscal, type_mf, timbre, echeance, debit_initial, credit_initial, solde, devise,
  competence_maritime, competence_routier, competence_aerien, notes, statut
) VALUES
('COR000001', 'LOCAL', 'A PLUS TRADING LIMITED', NULL, '2/F YAU BUILDING 167 LOCK', 'WANCHAI', NULL, 'CHINE', '+852-25755599', NULL, '+852-28911996', 'info@aplus.trade', NULL,
 'Assujeti', 0.000, NULL, NULL, 'Oui', 0, 0.000, 0.000, 0.000, 'USD', true, false, false, 'Correspondant maritime basé à Hong Kong', 'actif'),
('COR000002', 'ETRANGER', 'TRANSLOGISTICS SARL', NULL, '12 Rue de la Logistique', 'Tunis', '1002', 'Tunisie', '+216-71-123456', '+216-71-654321', '+216-71-789012', 'contact@translogistics.tn', 'https://translogistics.tn',
 'Non assujeti', 0.000, 'MF123456', 'TypeA', 'Non', 30, 1000.000, 500.000, 500.000, 'TND', false, true, false, 'Spécialiste du transport routier', 'actif'),
('COR000003', 'LOCAL', 'AIR CARGO EXPRESS', NULL, 'Aéroport International', 'Casablanca', '20000', 'Maroc', '+212-522-123456', NULL, NULL, 'info@aircargo.ma', 'https://aircargo.ma',
 'Assujeti', 0.000, 'MF654321', 'TypeB', 'Oui', 15, 0.000, 0.000, 0.000, 'MAD', false, false, true, 'Transport aérien international', 'inactif');
