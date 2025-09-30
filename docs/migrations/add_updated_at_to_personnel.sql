-- Migration pour ajouter la colonne updated_at à la table personnel
-- Date: 2025-09-26

-- Ajouter la colonne updated_at à la table personnel
ALTER TABLE personnel 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Mettre à jour les enregistrements existants avec la valeur de created_at
UPDATE personnel 
SET updated_at = created_at 
WHERE updated_at IS NULL;