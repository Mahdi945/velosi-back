-- Script rapide pour supprimer les contraintes et permettre les nouvelles valeurs
-- À exécuter dans PostgreSQL

-- 1. Supprimer la contrainte transport_type qui bloque 'complet', 'groupage', etc.
ALTER TABLE crm_opportunities DROP CONSTRAINT IF EXISTS crm_opportunities_transport_type_check;

-- 2. Vérifier que la suppression a fonctionné
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'crm_opportunities' 
  AND constraint_type = 'CHECK' 
  AND constraint_name LIKE '%transport_type%';

-- 3. Si nécessaire, convertir la colonne en VARCHAR pour éviter les problèmes d'enum
-- ALTER TABLE crm_opportunities ALTER COLUMN transport_type TYPE VARCHAR(50);

-- 4. Vérifier la structure actuelle
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'crm_opportunities' 
  AND column_name IN ('transport_type', 'traffic', 'engine_type');

\echo 'Contraintes supprimées. Vous pouvez maintenant utiliser les nouvelles valeurs transport_type.'