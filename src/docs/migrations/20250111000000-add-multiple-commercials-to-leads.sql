-- Migration pour permettre l'assignation de plusieurs commerciaux 
-- aux Prospects, Opportunités, Activités et Cotations
-- Date: 2025-01-11
-- Approche simplifiée : utilisation d'un array PostgreSQL au lieu d'une table de jonction

-- ========================================
-- 1. TABLE: crm_leads (Prospects)
-- ========================================
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS assigned_to_ids INTEGER[] DEFAULT '{}';

-- Migrer les données existantes
UPDATE crm_leads 
SET assigned_to_ids = ARRAY[assigned_to]
WHERE assigned_to IS NOT NULL;

-- Index GIN pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to_ids ON crm_leads USING GIN (assigned_to_ids);

COMMENT ON COLUMN crm_leads.assigned_to_ids IS 'Array des IDs des commerciaux assignés au prospect (relation 1-N)';

-- ========================================
-- 2. TABLE: crm_opportunities (Opportunités)
-- ========================================
ALTER TABLE crm_opportunities 
ADD COLUMN IF NOT EXISTS assigned_to_ids INTEGER[] DEFAULT '{}';

-- Migrer les données existantes
UPDATE crm_opportunities 
SET assigned_to_ids = ARRAY[assigned_to]
WHERE assigned_to IS NOT NULL;

-- Index GIN pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_to_ids ON crm_opportunities USING GIN (assigned_to_ids);

COMMENT ON COLUMN crm_opportunities.assigned_to_ids IS 'Array des IDs des commerciaux assignés à l''opportunité (relation 1-N)';

-- ========================================
-- 3. TABLE: crm_activities (Activités)
-- ========================================
ALTER TABLE crm_activities 
ADD COLUMN IF NOT EXISTS assigned_to_ids INTEGER[] DEFAULT '{}';

-- Migrer les données existantes
UPDATE crm_activities 
SET assigned_to_ids = ARRAY[assigned_to]
WHERE assigned_to IS NOT NULL;

-- Index GIN pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to_ids ON crm_activities USING GIN (assigned_to_ids);

COMMENT ON COLUMN crm_activities.assigned_to_ids IS 'Array des IDs des commerciaux assignés à l''activité (relation 1-N)';

-- ========================================
-- 4. TABLE: crm_quotes (Cotations)
-- ========================================
ALTER TABLE crm_quotes 
ADD COLUMN IF NOT EXISTS commercial_ids INTEGER[] DEFAULT '{}';

-- Migrer les données existantes (utilise commercial_id pour les cotations)
UPDATE crm_quotes 
SET commercial_ids = ARRAY[commercial_id]
WHERE commercial_id IS NOT NULL;

-- Index GIN pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_quotes_commercial_ids ON crm_quotes USING GIN (commercial_ids);

COMMENT ON COLUMN crm_quotes.commercial_ids IS 'Array des IDs des commerciaux assignés à la cotation (relation 1-N)';

-- ========================================
-- NOTES
-- ========================================
-- Les champs assigned_to et commercial_id sont conservés temporairement pour compatibilité
-- Ils seront supprimés dans une future migration après validation du nouveau système
