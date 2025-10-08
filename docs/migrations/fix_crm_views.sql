-- ========================================
-- SCRIPT DE CORRECTION CRM
-- Corrections après examen des entités backend
-- ========================================

-- Supprimer la vue existante si elle existe
DROP VIEW IF EXISTS view_leads_by_sales;

-- Recréer la vue avec les bons noms de colonnes
CREATE VIEW view_leads_by_sales AS
SELECT 
    p.id as personnel_id,
    p.prenom || ' ' || p.nom as sales_person,
    COUNT(l.id) as total_leads,
    COUNT(CASE WHEN l.status = 'new' THEN 1 END) as new_leads,
    COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) as qualified_leads,
    COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads,
    SUM(l.estimated_value) as total_estimated_value
FROM personnel p
LEFT JOIN crm_leads l ON p.id = l.assigned_to
WHERE p.role = 'commercial' OR p.role = 'administratif'
GROUP BY p.id, p.prenom, p.nom;

-- Créer une vue supplémentaire pour les statistiques par rôle
CREATE VIEW view_crm_stats_by_role AS
SELECT 
    p.role,
    COUNT(DISTINCT p.id) as personnel_count,
    COUNT(l.id) as total_leads,
    COUNT(o.id) as total_opportunities,
    COUNT(q.id) as total_quotes,
    SUM(o.value) as total_opportunity_value,
    SUM(q.total) as total_quotes_value
FROM personnel p
LEFT JOIN crm_leads l ON p.id = l.assigned_to
LEFT JOIN crm_opportunities o ON p.id = o.assigned_to
LEFT JOIN crm_quotes q ON p.id = q.created_by
WHERE p.role IN ('commercial', 'administratif')
GROUP BY p.role;

-- Vue pour le suivi des performances commerciales
CREATE VIEW view_commercial_performance AS
SELECT 
    p.id as personnel_id,
    p.prenom || ' ' || p.nom as commercial_name,
    p.role,
    
    -- Statistiques prospects
    COUNT(DISTINCT l.id) as total_leads,
    COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END) as converted_leads,
    CASE 
        WHEN COUNT(DISTINCT l.id) > 0 
        THEN ROUND((COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END)::decimal / COUNT(DISTINCT l.id)) * 100, 2)
        ELSE 0 
    END as conversion_rate,
    
    -- Statistiques opportunités
    COUNT(DISTINCT o.id) as total_opportunities,
    COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) as won_opportunities,
    SUM(CASE WHEN o.stage = 'closed_won' THEN o.value ELSE 0 END) as total_won_value,
    
    -- Statistiques devis
    COUNT(DISTINCT q.id) as total_quotes,
    COUNT(DISTINCT CASE WHEN q.status = 'accepted' THEN q.id END) as accepted_quotes,
    SUM(CASE WHEN q.status = 'accepted' THEN q.total ELSE 0 END) as total_accepted_value,
    
    -- Activités
    COUNT(DISTINCT a.id) as total_activities,
    COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_activities
    
FROM personnel p
LEFT JOIN crm_leads l ON p.id = l.assigned_to
LEFT JOIN crm_opportunities o ON p.id = o.assigned_to
LEFT JOIN crm_quotes q ON p.id = q.created_by
LEFT JOIN crm_activities a ON p.id = a.assigned_to
WHERE p.role IN ('commercial', 'administratif')
GROUP BY p.id, p.prenom, p.nom, p.role
ORDER BY total_won_value DESC;

-- Commentaires sur les nouvelles vues
COMMENT ON VIEW view_leads_by_sales IS 'Vue corrigée - Résumé des prospects par commercial avec les bons noms de colonnes';
COMMENT ON VIEW view_crm_stats_by_role IS 'Statistiques CRM globales par rôle (commercial/administratif)';
COMMENT ON VIEW view_commercial_performance IS 'Tableau de bord des performances commerciales détaillées';

-- ========================================
-- VERIFICATION DE LA CORRECTION
-- ========================================

-- Test des vues créées
SELECT 'TEST VIEW: view_leads_by_sales' as test_name, COUNT(*) as result_count FROM view_leads_by_sales;
SELECT 'TEST VIEW: view_crm_stats_by_role' as test_name, COUNT(*) as result_count FROM view_crm_stats_by_role;
SELECT 'TEST VIEW: view_commercial_performance' as test_name, COUNT(*) as result_count FROM view_commercial_performance;

-- Afficher les colonnes de la table personnel pour confirmation
SELECT 'PERSONNEL COLUMNS' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'personnel' 
ORDER BY ordinal_position;

-- Afficher les colonnes de la table client pour confirmation
SELECT 'CLIENT COLUMNS' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'client' 
ORDER BY ordinal_position;

-- ========================================
-- FIN DU SCRIPT DE CORRECTION
-- ========================================