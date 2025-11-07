-- =====================================================
-- MIGRATION: Ajout du champ DEVISE uniquement
-- Date: 2025-11-07
-- Description: Ajoute seulement le champ 'currency' aux tables CRM
--              La liste des devises est gérée côté code (frontend)
--              Les montants sont stockés en TND après conversion
-- =====================================================

-- TABLE: crm_quotes (cotations)
-- Une seule devise par cotation, tous les montants en TND
ALTER TABLE crm_quotes 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';

CREATE INDEX IF NOT EXISTS idx_quotes_currency ON crm_quotes(currency);

COMMENT ON COLUMN crm_quotes.currency IS 'Code ISO 4217 de la devise sélectionnée (TND, USD, EUR, etc.) - Tous les montants stockés en TND';

-- TABLE: crm_opportunities
ALTER TABLE crm_opportunities 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';

CREATE INDEX IF NOT EXISTS idx_opportunities_currency ON crm_opportunities(currency);

COMMENT ON COLUMN crm_opportunities.currency IS 'Devise pour le champ value';

-- TABLE: crm_leads (prospects)
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';

CREATE INDEX IF NOT EXISTS idx_leads_currency ON crm_leads(currency);

COMMENT ON COLUMN crm_leads.currency IS 'Devise pour estimatedValue et annualVolume';

-- =====================================================
-- VÉRIFICATIONS
-- =====================================================

DO $$
BEGIN
    -- Vérifier crm_quotes
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'crm_quotes' AND column_name = 'currency') THEN
        RAISE NOTICE '✅ Colonne currency ajoutée à crm_quotes';
    END IF;
    
    -- Vérifier crm_opportunities
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'crm_opportunities' AND column_name = 'currency') THEN
        RAISE NOTICE '✅ Colonne currency ajoutée à crm_opportunities';
    END IF;
    
    -- Vérifier crm_leads
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'crm_leads' AND column_name = 'currency') THEN
        RAISE NOTICE '✅ Colonne currency ajoutée à crm_leads';
    END IF;
END $$;

-- =====================================================
-- REQUÊTES DE TEST
-- =====================================================

/*
-- Tester une cotation avec devise
SELECT quote_number, currency, total, created_at
FROM crm_quotes
ORDER BY id DESC
LIMIT 5;

-- Tester une opportunité
SELECT title, currency, value, stage
FROM crm_opportunities
ORDER BY id DESC
LIMIT 5;

-- Tester un prospect
SELECT company, currency, estimated_value
FROM crm_leads
ORDER BY id DESC
LIMIT 5;
*/

RAISE NOTICE '🎉 Migration terminée avec succès !';
RAISE NOTICE '📝 Champ currency ajouté aux 3 tables CRM (quotes, opportunities, leads)';
RAISE NOTICE '💱 Une devise par cotation (pas par ligne)';
RAISE NOTICE '💱 Liste des 160+ devises mondiales gérée côté frontend';
RAISE NOTICE '🔄 Conversion temps réel via API exchangerate-api.com';
