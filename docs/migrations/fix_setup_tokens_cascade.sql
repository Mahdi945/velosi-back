-- ================================================================
-- Script de correction: Ajouter ON DELETE CASCADE à setup_tokens
-- ================================================================

\c shipnology;

-- Supprimer l'ancienne contrainte
ALTER TABLE setup_tokens 
DROP CONSTRAINT IF EXISTS setup_tokens_organisation_id_fkey;

-- Recréer la contrainte avec ON DELETE CASCADE
ALTER TABLE setup_tokens 
ADD CONSTRAINT setup_tokens_organisation_id_fkey 
FOREIGN KEY (organisation_id) 
REFERENCES organisations(id) 
ON DELETE CASCADE;

SELECT '✅ Contrainte mise à jour avec ON DELETE CASCADE' AS status;
