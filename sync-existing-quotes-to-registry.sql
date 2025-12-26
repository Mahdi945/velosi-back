-- ================================================================
-- Script: Synchroniser les cotations existantes vers le registre
-- Date: 2025-01-22
-- Description: Insère les cotations existantes dans quote_registry
-- ================================================================

-- Se connecter à velosi
\c velosi

-- Nettoyer les anciennes données si besoin
-- TRUNCATE TABLE quote_registry;

-- Insérer les cotations de la base danino
INSERT INTO quote_registry (quote_id, quote_uuid, quote_number, organisation_id, database_name, created_at)
SELECT 
    q.id,
    q.uuid,
    q.quote_number,
    COALESCE(q.organisation_id, 17) as organisation_id,
    'danino' as database_name,
    q.created_at
FROM dblink('dbname=danino user=postgres password=admin',
    'SELECT id, uuid, quote_number, organisation_id, created_at FROM crm_quotes WHERE deleted_at IS NULL')
    AS q(id INTEGER, uuid UUID, quote_number VARCHAR, organisation_id INTEGER, created_at TIMESTAMP)
ON CONFLICT (quote_uuid) DO UPDATE 
    SET updated_at = NOW(),
        organisation_id = EXCLUDED.organisation_id;

-- Insérer les cotations de la base velosi (si différentes)
INSERT INTO quote_registry (quote_id, quote_uuid, quote_number, organisation_id, database_name, created_at)
SELECT 
    id,
    uuid,
    quote_number,
    COALESCE(organisation_id, 1) as organisation_id,
    'velosi' as database_name,
    created_at
FROM crm_quotes 
WHERE deleted_at IS NULL
ON CONFLICT (quote_uuid) DO UPDATE 
    SET updated_at = NOW(),
        organisation_id = EXCLUDED.organisation_id;

-- Afficher les statistiques
SELECT 
    database_name,
    COUNT(*) as quote_count,
    MIN(created_at) as oldest_quote,
    MAX(created_at) as newest_quote
FROM quote_registry
GROUP BY database_name
ORDER BY database_name;

\echo ''
\echo '✅ Synchronisation terminée'
\echo ''

SELECT COUNT(*) as total_quotes FROM quote_registry;
