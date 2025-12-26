-- ================================================================
-- Migration: Correction de la contrainte de clé étrangère setup_tokens
-- ================================================================
-- Ajouter ON DELETE CASCADE pour supprimer automatiquement les tokens
-- lorsqu'une organisation est supprimée
-- ================================================================

\c shipnology;

-- 1. Supprimer l'ancienne contrainte de clé étrangère
ALTER TABLE setup_tokens 
DROP CONSTRAINT IF EXISTS setup_tokens_organisation_id_fkey;

-- 2. Recréer la contrainte avec ON DELETE CASCADE
ALTER TABLE setup_tokens 
ADD CONSTRAINT setup_tokens_organisation_id_fkey 
FOREIGN KEY (organisation_id) 
REFERENCES organisations(id) 
ON DELETE CASCADE;

-- Vérification
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'setup_tokens'
    AND kcu.column_name = 'organisation_id';

SELECT '✅ Contrainte de clé étrangère mise à jour avec ON DELETE CASCADE' AS status;
