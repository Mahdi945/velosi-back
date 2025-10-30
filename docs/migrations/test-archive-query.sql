-- Test pour vérifier les données archivées dans les tables CRM

-- Vérifier prospects archivés
SELECT id, full_name, email, company, is_archived, deleted_at, created_at
FROM crm_leads
WHERE is_archived = true
ORDER BY id DESC
LIMIT 10;

-- Vérifier opportunités archivées
SELECT id, title, stage, value, is_archived, deleted_at, created_at
FROM crm_opportunities
WHERE is_archived = true
ORDER BY id DESC
LIMIT 10;

-- Vérifier cotations archivées
SELECT id, quote_number, title, status, total, is_archived, deleted_at, created_at
FROM crm_quotes
WHERE is_archived = true
ORDER BY id DESC
LIMIT 10;

-- Statistiques
SELECT 
  (SELECT COUNT(*) FROM crm_leads WHERE is_archived = true) as prospects_archives,
  (SELECT COUNT(*) FROM crm_leads WHERE is_archived = false) as prospects_actifs,
  (SELECT COUNT(*) FROM crm_opportunities WHERE is_archived = true) as opportunites_archivees,
  (SELECT COUNT(*) FROM crm_opportunities WHERE is_archived = false) as opportunites_actives,
  (SELECT COUNT(*) FROM crm_quotes WHERE is_archived = true) as cotations_archivees,
  (SELECT COUNT(*) FROM crm_quotes WHERE is_archived = false) as cotations_actives;
