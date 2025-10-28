-- Migration manuelle pour ajouter le soft delete aux tables CRM
-- À exécuter dans PostgreSQL si la migration Sequelize ne fonctionne pas

-- ====================================
-- 1. Table crm_leads (Prospects)
-- ====================================
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS archived_by INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_leads_deleted_at 
ON crm_leads(deleted_at) 
WHERE deleted_at IS NULL;

-- ====================================
-- 2. Table crm_opportunities
-- ====================================
ALTER TABLE crm_opportunities 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS archived_by INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_deleted_at 
ON crm_opportunities(deleted_at) 
WHERE deleted_at IS NULL;

-- ====================================
-- 3. Table crm_quotes (Cotations)
-- ====================================
ALTER TABLE crm_quotes 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS archived_by INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at 
ON crm_quotes(deleted_at) 
WHERE deleted_at IS NULL;

-- ====================================
-- 4. Foreign keys pour archived_by
-- ====================================
ALTER TABLE crm_leads 
ADD CONSTRAINT fk_leads_archived_by 
FOREIGN KEY (archived_by) 
REFERENCES personnel(id) 
ON DELETE SET NULL;

ALTER TABLE crm_opportunities 
ADD CONSTRAINT fk_opportunities_archived_by 
FOREIGN KEY (archived_by) 
REFERENCES personnel(id) 
ON DELETE SET NULL;

ALTER TABLE crm_quotes 
ADD CONSTRAINT fk_quotes_archived_by 
FOREIGN KEY (archived_by) 
REFERENCES personnel(id) 
ON DELETE SET NULL;

-- Vérification
SELECT 'crm_leads columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'crm_leads' 
AND column_name IN ('deleted_at', 'is_archived', 'archived_reason', 'archived_by');

SELECT 'crm_opportunities columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'crm_opportunities' 
AND column_name IN ('deleted_at', 'is_archived', 'archived_reason', 'archived_by');

SELECT 'crm_quotes columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'crm_quotes' 
AND column_name IN ('deleted_at', 'is_archived', 'archived_reason', 'archived_by');
