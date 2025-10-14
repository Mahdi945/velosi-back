-- Vérification de l'opportunité créée (ID 26)
SELECT 
    id,
    title,
    engine_type,
    traffic,
    transport_type,
    created_at
FROM crm_opportunities 
WHERE id = 26;

-- Vérifier toutes les opportunités récentes avec engine_type
SELECT 
    id,
    title,
    engine_type,
    traffic,
    transport_type,
    created_at
FROM crm_opportunities 
WHERE engine_type IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Vérifier que l'engin ID 11 existe
SELECT id, libelle, pied, is_active
FROM engin 
WHERE id = 11;