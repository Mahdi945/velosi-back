-- Migration pour augmenter la longueur de la colonne country de 3 à 100 caractères
-- Date: 2025-10-18

-- Modifier la colonne country dans crm_quotes
ALTER TABLE crm_quotes 
ALTER COLUMN country TYPE VARCHAR(100);

-- Retirer la valeur par défaut si elle existe
ALTER TABLE crm_quotes 
ALTER COLUMN country DROP DEFAULT;

COMMENT ON COLUMN crm_quotes.country IS 'Pays (texte libre, pas de limitation à 3 caractères)';
