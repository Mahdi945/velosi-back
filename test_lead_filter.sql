-- Test du filtre par ID de prospect dans les opportunités

-- 1. Vérifier les opportunités qui ont un leadId
SELECT 
    o.id as opportunity_id,
    o.title,
    o.lead_id,
    o.stage,
    o.value,
    l.full_name as prospect_name,
    l.company as prospect_company
FROM crm_opportunities o
LEFT JOIN crm_leads l ON o.lead_id = l.id
WHERE o.lead_id IS NOT NULL
ORDER BY o.created_at DESC;

-- 2. Compter les opportunités par prospect
SELECT 
    lead_id,
    COUNT(*) as nombre_opportunites,
    l.full_name as prospect_name,
    l.company as prospect_company
FROM crm_opportunities o
LEFT JOIN crm_leads l ON o.lead_id = l.id
WHERE o.lead_id IS NOT NULL
GROUP BY lead_id, l.full_name, l.company
ORDER BY nombre_opportunites DESC;

-- 3. Test du filtre backend - remplacer X par l'ID du prospect à tester
-- SELECT * FROM crm_opportunities WHERE lead_id = X;