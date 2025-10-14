-- Script simple pour supprimer la contrainte transport_type
-- Date: 2025-10-14

-- Supprimer la contrainte CHECK sur transport_type
ALTER TABLE crm_opportunities DROP CONSTRAINT IF EXISTS crm_opportunities_transport_type_check;

-- Vérifier que c'est supprimé
SELECT 
    constraint_name,
    constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'crm_opportunities' 
  AND constraint_name LIKE '%transport_type%';