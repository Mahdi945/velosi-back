-- ==========================================
-- MIGRATION : TABLE TYPE_FRAIS_ANNEXES
-- ==========================================
-- Cette migration crée la table pour gérer dynamiquement 
-- les types de frais annexes dans les cotations

-- 1. Créer la table type_frais_annexes
CREATE TABLE IF NOT EXISTS type_frais_annexes (
  id SERIAL PRIMARY KEY,
  description VARCHAR(200) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insérer les valeurs existantes (depuis fraisAnnexesList)
INSERT INTO type_frais_annexes (description) VALUES
  ('Frais de douane'),
  ('Manutention portuaire'),
  ('Assurance marchandise'),
  ('Frais de dépotage'),
  ('Frais d''empotage'),
  ('THC (Terminal Handling Charges)'),
  ('BAF (Bunker Adjustment Factor)'),
  ('CAF (Currency Adjustment Factor)'),
  ('Frais de stockage'),
  ('Frais de livraison'),
  ('Frais de chargement'),
  ('Frais de déchargement'),
  ('Frais de pesage'),
  ('Frais de palettisation'),
  ('Inspection douanière'),
  ('Certificat d''origine'),
  ('Frais administratifs'),
  ('Frais de transport local')
ON CONFLICT (description) DO NOTHING;

-- 3. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_type_frais_active 
  ON type_frais_annexes (is_active);

-- 4. Ajouter un trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_type_frais_annexes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_type_frais_annexes_timestamp
BEFORE UPDATE ON type_frais_annexes
FOR EACH ROW
EXECUTE FUNCTION update_type_frais_annexes_timestamp();

-- 5. Commentaires pour documentation
COMMENT ON TABLE type_frais_annexes IS 'Table des types de frais annexes disponibles pour les cotations';
COMMENT ON COLUMN type_frais_annexes.description IS 'Description du type de frais annexe';
COMMENT ON COLUMN type_frais_annexes.is_active IS 'Indique si le type est actif/disponible';
