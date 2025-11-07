-- ========================================
-- MIGRATION: Ajout du support multi-devises
-- ========================================
-- Ce script ajoute les colonnes pour gérer plusieurs devises
-- avec conversion automatique en TND (devise de référence)
-- ========================================

-- ========================================
-- 1. TABLE crm_quotes (Cotations)
-- ========================================

-- Ajouter les colonnes de devise
ALTER TABLE crm_quotes 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS subtotal_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS subtotal_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS total_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS total_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,6) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS freight_purchased_currency VARCHAR(3) DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS freight_purchased_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS freight_purchased_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS freight_offered_currency VARCHAR(3) DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS freight_offered_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS freight_offered_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS additional_costs_purchased_currency VARCHAR(3) DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS additional_costs_purchased_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS additional_costs_purchased_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS additional_costs_offered_currency VARCHAR(3) DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS additional_costs_offered_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS additional_costs_offered_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS total_purchases_currency VARCHAR(3) DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS total_purchases_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS total_purchases_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS total_offers_currency VARCHAR(3) DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS total_offers_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS total_offers_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS total_margin_tnd NUMERIC(12,2);

-- Commentaires
COMMENT ON COLUMN crm_quotes.currency IS 'Devise principale de la cotation (ISO 4217)';
COMMENT ON COLUMN crm_quotes.exchange_rate IS 'Taux de change vers TND au moment de la création';
COMMENT ON COLUMN crm_quotes.subtotal_original IS 'Sous-total dans la devise originale';
COMMENT ON COLUMN crm_quotes.subtotal_tnd IS 'Sous-total converti en TND';
COMMENT ON COLUMN crm_quotes.total_original IS 'Total TTC dans la devise originale';
COMMENT ON COLUMN crm_quotes.total_tnd IS 'Total TTC converti en TND';

-- Initialiser les valeurs existantes (copier dans les colonnes _original et _tnd)
UPDATE crm_quotes 
SET 
  subtotal_original = subtotal,
  subtotal_tnd = subtotal,
  total_original = total,
  total_tnd = total,
  freight_purchased_original = freight_purchased,
  freight_purchased_tnd = freight_purchased,
  freight_offered_original = freight_offered,
  freight_offered_tnd = freight_offered,
  additional_costs_purchased_original = additional_costs_purchased,
  additional_costs_purchased_tnd = additional_costs_purchased,
  additional_costs_offered_original = additional_costs_offered,
  additional_costs_offered_tnd = additional_costs_offered,
  total_purchases_original = total_purchases,
  total_purchases_tnd = total_purchases,
  total_offers_original = total_offers,
  total_offers_tnd = total_offers,
  total_margin_tnd = total_margin
WHERE currency IS NULL OR currency = 'TND';

-- Index pour les recherches par devise
CREATE INDEX IF NOT EXISTS idx_quotes_currency ON crm_quotes(currency);

-- ========================================
-- 2. TABLE crm_quote_items (Lignes de cotation)
-- ========================================

ALTER TABLE crm_quote_items 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS unit_price_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS unit_price_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS total_price_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS total_price_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS purchase_price_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS purchase_price_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS selling_price_original NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS selling_price_tnd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS margin_tnd NUMERIC(12,2);

-- Commentaires
COMMENT ON COLUMN crm_quote_items.currency IS 'Devise de la ligne de cotation';
COMMENT ON COLUMN crm_quote_items.unit_price_original IS 'Prix unitaire dans la devise originale';
COMMENT ON COLUMN crm_quote_items.unit_price_tnd IS 'Prix unitaire converti en TND';

-- Initialiser les valeurs existantes
UPDATE crm_quote_items 
SET 
  unit_price_original = unit_price,
  unit_price_tnd = unit_price,
  total_price_original = total_price,
  total_price_tnd = total_price,
  purchase_price_original = purchase_price,
  purchase_price_tnd = purchase_price,
  selling_price_original = selling_price,
  selling_price_tnd = selling_price,
  margin_tnd = margin
WHERE currency IS NULL OR currency = 'TND';

-- ========================================
-- 3. TABLE crm_opportunities (Opportunités)
-- ========================================

ALTER TABLE crm_opportunities 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS value_original NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS value_tnd NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,6) DEFAULT 1.0;

-- Commentaires
COMMENT ON COLUMN crm_opportunities.currency IS 'Devise de l''opportunité';
COMMENT ON COLUMN crm_opportunities.value_original IS 'Valeur dans la devise originale';
COMMENT ON COLUMN crm_opportunities.value_tnd IS 'Valeur convertie en TND';
COMMENT ON COLUMN crm_opportunities.exchange_rate IS 'Taux de change utilisé';

-- Initialiser les valeurs existantes
UPDATE crm_opportunities 
SET 
  value_original = value,
  value_tnd = value
WHERE currency IS NULL OR currency = 'TND';

-- Index
CREATE INDEX IF NOT EXISTS idx_opportunities_currency ON crm_opportunities(currency);

-- ========================================
-- 4. TABLE crm_leads (Prospects)
-- ========================================

ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND',
ADD COLUMN IF NOT EXISTS estimated_value_original NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS estimated_value_tnd NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS annual_volume_original NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS annual_volume_tnd NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,6) DEFAULT 1.0;

-- Commentaires
COMMENT ON COLUMN crm_leads.currency IS 'Devise du prospect';
COMMENT ON COLUMN crm_leads.estimated_value_original IS 'Valeur estimée dans la devise originale';
COMMENT ON COLUMN crm_leads.estimated_value_tnd IS 'Valeur estimée convertie en TND';
COMMENT ON COLUMN crm_leads.annual_volume_original IS 'Volume annuel dans la devise originale';
COMMENT ON COLUMN crm_leads.annual_volume_tnd IS 'Volume annuel converti en TND';

-- Initialiser les valeurs existantes
UPDATE crm_leads 
SET 
  estimated_value_original = estimated_value,
  estimated_value_tnd = estimated_value,
  annual_volume_original = annual_volume,
  annual_volume_tnd = annual_volume
WHERE currency IS NULL OR currency = 'TND';

-- Index
CREATE INDEX IF NOT EXISTS idx_leads_currency ON crm_leads(currency);

-- ========================================
-- 5. TABLE de référence des devises
-- ========================================

CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  decimal_places INT DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commentaires
COMMENT ON TABLE currencies IS 'Table de référence des devises supportées';
COMMENT ON COLUMN currencies.code IS 'Code ISO 4217 (ex: TND, EUR, USD)';
COMMENT ON COLUMN currencies.symbol IS 'Symbole de la devise (ex: DT, €, $)';

-- Insérer les devises principales
INSERT INTO currencies (code, name, symbol, is_active) VALUES
('TND', 'Dinar Tunisien', 'DT', true),
('EUR', 'Euro', '€', true),
('USD', 'Dollar Américain', '$', true),
('GBP', 'Livre Sterling', '£', true),
('CHF', 'Franc Suisse', 'CHF', true),
('CAD', 'Dollar Canadien', 'CAD', true),
('AED', 'Dirham des Émirats', 'AED', true),
('SAR', 'Riyal Saoudien', 'SAR', true),
('MAD', 'Dirham Marocain', 'MAD', true),
('DZD', 'Dinar Algérien', 'DZD', true),
('LYD', 'Dinar Libyen', 'LYD', true),
('EGP', 'Livre Égyptienne', 'EGP', true),
('JPY', 'Yen Japonais', '¥', true),
('CNY', 'Yuan Chinois', '¥', true),
('AUD', 'Dollar Australien', 'AUD', true)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 6. TABLE d'historique des taux de change
-- ========================================

CREATE TABLE IF NOT EXISTS exchange_rates_history (
  id SERIAL PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL DEFAULT 'TND',
  rate NUMERIC(10,6) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_currency, to_currency, date)
);

-- Commentaires
COMMENT ON TABLE exchange_rates_history IS 'Historique des taux de change pour traçabilité';
COMMENT ON COLUMN exchange_rates_history.source IS 'Source du taux (api, manual, etc.)';

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_from ON exchange_rates_history(from_currency);

-- ========================================
-- 7. Fonction pour obtenir le taux de change
-- ========================================

CREATE OR REPLACE FUNCTION get_exchange_rate(
  p_from_currency VARCHAR(3),
  p_to_currency VARCHAR(3) DEFAULT 'TND',
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC(10,6) AS $$
DECLARE
  v_rate NUMERIC(10,6);
BEGIN
  -- Si c'est la même devise, retourner 1
  IF p_from_currency = p_to_currency THEN
    RETURN 1.0;
  END IF;
  
  -- Chercher le taux le plus récent
  SELECT rate INTO v_rate
  FROM exchange_rates_history
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND date <= p_date
  ORDER BY date DESC
  LIMIT 1;
  
  -- Si pas trouvé, retourner 1 (à configurer manuellement)
  IF v_rate IS NULL THEN
    v_rate := 1.0;
  END IF;
  
  RETURN v_rate;
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON FUNCTION get_exchange_rate IS 'Obtient le taux de change le plus récent pour une date donnée';

-- ========================================
-- 8. Vue pour les montants en TND
-- ========================================

CREATE OR REPLACE VIEW v_quotes_tnd AS
SELECT 
  q.*,
  COALESCE(q.total_tnd, q.total) as total_in_tnd,
  COALESCE(q.subtotal_tnd, q.subtotal) as subtotal_in_tnd
FROM crm_quotes q;

COMMENT ON VIEW v_quotes_tnd IS 'Vue des cotations avec montants garantis en TND';

-- ========================================
-- MESSAGE FINAL
-- ========================================

DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration multi-devises terminée!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables modifiées:';
  RAISE NOTICE '  - crm_quotes (colonnes devise ajoutées)';
  RAISE NOTICE '  - crm_quote_items (colonnes devise ajoutées)';
  RAISE NOTICE '  - crm_opportunities (colonnes devise ajoutées)';
  RAISE NOTICE '  - crm_leads (colonnes devise ajoutées)';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées:';
  RAISE NOTICE '  - currencies (référence des devises)';
  RAISE NOTICE '  - exchange_rates_history (historique taux)';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonction créée: get_exchange_rate()';
  RAISE NOTICE 'Vue créée: v_quotes_tnd';
  RAISE NOTICE '========================================';
END $$;
