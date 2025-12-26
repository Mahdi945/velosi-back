-- Migration: Ajouter le champ updated_by à la table crm_quotes
-- Date: 2025-12-15
-- Description: Permet de tracker qui modifie une cotation

-- Ajouter la colonne updated_by
ALTER TABLE crm_quotes 
ADD COLUMN updated_by INTEGER;

-- Ajouter la contrainte de clé étrangère vers personnel
ALTER TABLE crm_quotes 
ADD CONSTRAINT fk_quotes_updated_by 
FOREIGN KEY (updated_by) REFERENCES personnel(id) 
ON DELETE SET NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX idx_quotes_updated_by ON crm_quotes(updated_by);

-- Commentaire pour la documentation
COMMENT ON COLUMN crm_quotes.updated_by IS 'ID du personnel qui a effectué la dernière modification';

-- Initialiser updated_by avec created_by pour les cotations existantes
UPDATE crm_quotes 
SET updated_by = created_by 
WHERE updated_by IS NULL;

-- Afficher le résumé
SELECT 
    COUNT(*) as total_cotations,
    COUNT(updated_by) as cotations_avec_updated_by
FROM crm_quotes;
