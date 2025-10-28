-- Script SQL pour créer la table industries manuellement
-- À exécuter dans PostgreSQL si la migration n'a pas fonctionné

-- Créer la table
CREATE TABLE IF NOT EXISTS industries (
  id SERIAL PRIMARY KEY,
  libelle VARCHAR(100) NOT NULL UNIQUE
);

-- Ajouter des commentaires
COMMENT ON TABLE industries IS 'Secteurs d''activité pour la classification des prospects/clients';
COMMENT ON COLUMN industries.libelle IS 'Libellé du secteur d''activité';

-- Insérer les secteurs par défaut
INSERT INTO industries (libelle) VALUES
  ('Transport'),
  ('Logistique'),
  ('Industrie'),
  ('Commerce'),
  ('Construction'),
  ('Agriculture'),
  ('Technologie'),
  ('Santé'),
  ('Finance'),
  ('Éducation'),
  ('Services'),
  ('Autre')
ON CONFLICT (libelle) DO NOTHING;

-- Vérifier les données
SELECT * FROM industries ORDER BY libelle;
