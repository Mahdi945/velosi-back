-- Script de vérification et correction pour le champ is_permanent
-- Date: 13/10/2025

-- 1. Vérifier si la colonne existe
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name = 'is_permanent';

-- 2. Si la colonne n'existe pas, l'ajouter
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN NOT NULL DEFAULT false;

-- 3. Mettre à jour tous les clients pour avoir une valeur is_permanent
UPDATE clients SET is_permanent = COALESCE(is_permanent, false);

-- 4. Vérifier que tous les clients ont une valeur
SELECT 
    id, 
    nom, 
    is_permanent,
    CASE 
        WHEN is_permanent IS NULL THEN 'NULL'
        WHEN is_permanent = true THEN 'TRUE'
        WHEN is_permanent = false THEN 'FALSE'
        ELSE 'UNKNOWN'
    END as is_permanent_status
FROM clients 
ORDER BY id;

-- 5. Compter les clients par statut
SELECT 
    is_permanent,
    COUNT(*) as count
FROM clients 
GROUP BY is_permanent;

-- 6. Test : mettre un client en permanent pour tester
-- UPDATE clients SET is_permanent = true WHERE id = 1;

-- 7. Vérification finale
SELECT 
    'Total clients' as info,
    COUNT(*) as value
FROM clients
UNION ALL
SELECT 
    'Clients permanents' as info,
    COUNT(*) as value
FROM clients 
WHERE is_permanent = true
UNION ALL
SELECT 
    'Clients temporaires' as info,
    COUNT(*) as value
FROM clients 
WHERE is_permanent = false
UNION ALL
SELECT 
    'Clients avec is_permanent NULL' as info,
    COUNT(*) as value
FROM clients 
WHERE is_permanent IS NULL;