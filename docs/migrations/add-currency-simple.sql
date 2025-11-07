-- =====================================================
-- MIGRATION: Ajout du Support Multi-Devises (VERSION SIMPLIFIÉE)
-- Date: 2025-11-07
-- Description: Ajoute seulement le champ 'currency' aux tables CRM
--              Les montants existants sont stockés en TND
--              La conversion se fait côté frontend avant enregistrement
-- =====================================================

-- =====================================================
-- 1. CRÉATION DE LA TABLE DES DEVISES DE RÉFÉRENCE
-- =====================================================

CREATE TABLE IF NOT EXISTS currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(5) NOT NULL,
    flag VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des 15 devises supportées
INSERT INTO currencies (code, name, symbol, flag) VALUES
('TND', 'Dinar Tunisien', 'د.ت', '🇹🇳'),
('EUR', 'Euro', '€', '🇪🇺'),
('USD', 'Dollar Américain', '$', '🇺🇸'),
('GBP', 'Livre Sterling', '£', '🇬🇧'),
('CHF', 'Franc Suisse', 'CHF', '🇨🇭'),
('CAD', 'Dollar Canadien', 'C$', '🇨🇦'),
('AED', 'Dirham des Émirats', 'د.إ', '🇦🇪'),
('SAR', 'Riyal Saoudien', '﷼', '🇸🇦'),
('MAD', 'Dirham Marocain', 'د.م.', '🇲🇦'),
('DZD', 'Dinar Algérien', 'د.ج', '🇩🇿'),
('LYD', 'Dinar Libyen', 'ل.د', '🇱🇾'),
('EGP', 'Livre Égyptienne', 'ج.م', '🇪🇬'),
('JPY', 'Yen Japonais', '¥', '🇯🇵'),
('CNY', 'Yuan Chinois', '¥', '🇨🇳'),
('AUD', 'Dollar Australien', 'A$', '🇦🇺')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. TABLE D'HISTORIQUE DES TAUX DE CHANGE (OPTIONNEL)
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_rates_history (
    id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10, 6) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_currency, to_currency, date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates_history(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates_history(date);

-- =====================================================
-- 3. AJOUT DU CHAMP DEVISE AUX TABLES CRM
-- =====================================================

-- 3.1 TABLE: crm_quotes
-- Tous les montants sont en TND, on ajoute juste la devise pour traçabilité
ALTER TABLE crm_quotes ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';
ALTER TABLE crm_quotes ADD CONSTRAINT fk_quotes_currency FOREIGN KEY (currency) REFERENCES currencies(code);
CREATE INDEX IF NOT EXISTS idx_quotes_currency ON crm_quotes(currency);

-- 3.2 TABLE: crm_quote_items
-- Tous les montants sont en TND
ALTER TABLE crm_quote_items ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';
ALTER TABLE crm_quote_items ADD CONSTRAINT fk_quote_items_currency FOREIGN KEY (currency) REFERENCES currencies(code);
CREATE INDEX IF NOT EXISTS idx_quote_items_currency ON crm_quote_items(currency);

-- 3.3 TABLE: crm_opportunities
-- Le montant 'value' est en TND
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';
ALTER TABLE crm_opportunities ADD CONSTRAINT fk_opportunities_currency FOREIGN KEY (currency) REFERENCES currencies(code);
CREATE INDEX IF NOT EXISTS idx_opportunities_currency ON crm_opportunities(currency);

-- 3.4 TABLE: crm_leads (prospects)
-- Les montants estimatedValue et annualVolume sont en TND
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';
ALTER TABLE crm_leads ADD CONSTRAINT fk_leads_currency FOREIGN KEY (currency) REFERENCES currencies(code);
CREATE INDEX IF NOT EXISTS idx_leads_currency ON crm_leads(currency);

-- =====================================================
-- 4. FONCTION HELPER POUR RÉCUPÉRER LE TAUX DE CHANGE
-- =====================================================

CREATE OR REPLACE FUNCTION get_exchange_rate(
    from_curr VARCHAR(3),
    to_curr VARCHAR(3),
    rate_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(10, 6) AS $$
DECLARE
    exchange_rate DECIMAL(10, 6);
BEGIN
    -- Si même devise, retourner 1
    IF from_curr = to_curr THEN
        RETURN 1.0;
    END IF;
    
    -- Chercher le taux dans l'historique
    SELECT rate INTO exchange_rate
    FROM exchange_rates_history
    WHERE from_currency = from_curr
      AND to_currency = to_curr
      AND date = rate_date
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Si trouvé, retourner le taux
    IF exchange_rate IS NOT NULL THEN
        RETURN exchange_rate;
    END IF;
    
    -- Sinon retourner 1 (taux par défaut)
    RETURN 1.0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. VÉRIFICATIONS
-- =====================================================

-- Vérifier que les devises sont bien insérées
DO $$
DECLARE
    currency_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO currency_count FROM currencies;
    
    IF currency_count >= 15 THEN
        RAISE NOTICE '✅ Migration réussie: % devises disponibles', currency_count;
    ELSE
        RAISE WARNING '⚠️ Attention: seulement % devises trouvées', currency_count;
    END IF;
END $$;

-- Vérifier que les colonnes sont bien ajoutées
DO $$
BEGIN
    -- Vérifier crm_quotes
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'crm_quotes' AND column_name = 'currency') THEN
        RAISE NOTICE '✅ Colonne currency ajoutée à crm_quotes';
    END IF;
    
    -- Vérifier crm_quote_items
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'crm_quote_items' AND column_name = 'currency') THEN
        RAISE NOTICE '✅ Colonne currency ajoutée à crm_quote_items';
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
-- 6. REQUÊTES DE VÉRIFICATION (À EXÉCUTER MANUELLEMENT)
-- =====================================================

/*
-- Vérifier les devises disponibles
SELECT code, name, symbol, flag FROM currencies ORDER BY code;

-- Vérifier une cotation avec devise
SELECT 
    quote_number,
    currency,
    freight_purchased,
    freight_offered,
    total_purchase,
    total_offered
FROM crm_quotes
ORDER BY id DESC
LIMIT 5;

-- Vérifier une opportunité avec devise
SELECT 
    name,
    currency,
    value,
    probability
FROM crm_opportunities
ORDER BY id DESC
LIMIT 5;

-- Vérifier un prospect avec devise
SELECT 
    company_name,
    currency,
    estimated_value,
    annual_volume
FROM crm_leads
ORDER BY id DESC
LIMIT 5;
*/

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

RAISE NOTICE '🎉 Migration multi-devises (version simplifiée) terminée avec succès !';
RAISE NOTICE '📝 Tous les montants sont stockés en TND';
RAISE NOTICE '💱 Le champ currency indique la devise d''origine pour traçabilité';
