-- Script pour vérifier le nombre d'enregistrements dans toutes les tables

SELECT 'AutorisationsTVA' as table_name, COUNT(*) as count FROM "AutorisationsTVA"
UNION ALL SELECT 'BCsusTVA', COUNT(*) FROM "BCsusTVA"
UNION ALL SELECT 'aeroports', COUNT(*) FROM aeroports
UNION ALL SELECT 'armateurs', COUNT(*) FROM armateurs
UNION ALL SELECT 'client', COUNT(*) FROM client
UNION ALL SELECT 'contact_client', COUNT(*) FROM contact_client
UNION ALL SELECT 'correspondants', COUNT(*) FROM correspondants
UNION ALL SELECT 'crm_activities', COUNT(*) FROM crm_activities
UNION ALL SELECT 'crm_activity_participants', COUNT(*) FROM crm_activity_participants
UNION ALL SELECT 'crm_leads', COUNT(*) FROM crm_leads
UNION ALL SELECT 'crm_opportunities', COUNT(*) FROM crm_opportunities
UNION ALL SELECT 'crm_pipeline_stages', COUNT(*) FROM crm_pipeline_stages
UNION ALL SELECT 'crm_pipelines', COUNT(*) FROM crm_pipelines
UNION ALL SELECT 'crm_quote_items', COUNT(*) FROM crm_quote_items
UNION ALL SELECT 'crm_quotes', COUNT(*) FROM crm_quotes
UNION ALL SELECT 'crm_tags', COUNT(*) FROM crm_tags
UNION ALL SELECT 'engin', COUNT(*) FROM engin
UNION ALL SELECT 'fournisseurs', COUNT(*) FROM fournisseurs
UNION ALL SELECT 'industries', COUNT(*) FROM industries
UNION ALL SELECT 'objectif_com', COUNT(*) FROM objectif_com
UNION ALL SELECT 'personnel', COUNT(*) FROM personnel
UNION ALL SELECT 'ports', COUNT(*) FROM ports
UNION ALL SELECT 'vechat_conversations', COUNT(*) FROM vechat_conversations
UNION ALL SELECT 'vechat_messages', COUNT(*) FROM vechat_messages
ORDER BY table_name;
