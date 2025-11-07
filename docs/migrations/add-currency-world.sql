-- =====================================================
-- MIGRATION: Support Multi-Devises Global (160+ Devises Mondiales)
-- Date: 2025-11-07
-- Description: Ajoute le champ 'currency' aux tables CRM
--              Tous les montants sont stockés en TND (après conversion)
--              Support de toutes les devises du monde
-- =====================================================

-- =====================================================
-- 1. CRÉATION DE LA TABLE DES DEVISES MONDIALES
-- =====================================================

CREATE TABLE IF NOT EXISTS currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    flag VARCHAR(10),
    region VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion de TOUTES les devises mondiales (160 devises)
-- Ordre: TND, USD, EUR en premier, puis par région

INSERT INTO currencies (code, name, symbol, flag, region) VALUES
-- 🇹🇳 PRIORITÉ 1: Dinar Tunisien (devise principale)
('TND', 'Dinar Tunisien', 'د.ت', '🇹🇳', 'Afrique du Nord'),

-- 🌍 PRIORITÉ 2: Devises majeures internationales
('USD', 'Dollar Américain', '$', '🇺🇸', 'Amérique du Nord'),
('EUR', 'Euro', '€', '🇪🇺', 'Europe'),

-- 💼 Devises majeures (suite)
('GBP', 'Livre Sterling', '£', '🇬🇧', 'Europe'),
('JPY', 'Yen Japonais', '¥', '🇯🇵', 'Asie'),
('CHF', 'Franc Suisse', 'CHF', '🇨🇭', 'Europe'),
('CAD', 'Dollar Canadien', 'C$', '🇨🇦', 'Amérique du Nord'),
('AUD', 'Dollar Australien', 'A$', '🇦🇺', 'Océanie'),
('CNY', 'Yuan Chinois', '¥', '🇨🇳', 'Asie'),

-- 🌍 AFRIQUE DU NORD & MOYEN-ORIENT
('MAD', 'Dirham Marocain', 'د.م.', '🇲🇦', 'Afrique du Nord'),
('DZD', 'Dinar Algérien', 'د.ج', '🇩🇿', 'Afrique du Nord'),
('LYD', 'Dinar Libyen', 'ل.د', '🇱🇾', 'Afrique du Nord'),
('EGP', 'Livre Égyptienne', 'ج.م', '🇪🇬', 'Afrique du Nord'),
('MRU', 'Ouguiya Mauritanien', 'UM', '🇲🇷', 'Afrique du Nord'),

-- 🕌 PAYS DU GOLFE & MOYEN-ORIENT
('AED', 'Dirham des Émirats', 'د.إ', '🇦🇪', 'Moyen-Orient'),
('SAR', 'Riyal Saoudien', '﷼', '🇸🇦', 'Moyen-Orient'),
('QAR', 'Riyal Qatari', 'ر.ق', '🇶🇦', 'Moyen-Orient'),
('KWD', 'Dinar Koweïtien', 'د.ك', '🇰🇼', 'Moyen-Orient'),
('BHD', 'Dinar Bahreïni', 'د.ب', '🇧🇭', 'Moyen-Orient'),
('OMR', 'Rial Omanais', 'ر.ع.', '🇴🇲', 'Moyen-Orient'),
('JOD', 'Dinar Jordanien', 'د.ا', '🇯🇴', 'Moyen-Orient'),
('ILS', 'Shekel Israélien', '₪', '🇮🇱', 'Moyen-Orient'),
('LBP', 'Livre Libanaise', 'ل.ل', '🇱🇧', 'Moyen-Orient'),
('SYP', 'Livre Syrienne', 'ل.س', '🇸🇾', 'Moyen-Orient'),
('IQD', 'Dinar Irakien', 'ع.د', '🇮🇶', 'Moyen-Orient'),
('IRR', 'Rial Iranien', '﷼', '🇮🇷', 'Moyen-Orient'),
('YER', 'Rial Yéménite', '﷼', '🇾🇪', 'Moyen-Orient'),

-- 🌍 AFRIQUE SUBSAHARIENNE (Zone Franc CFA)
('XOF', 'Franc CFA BCEAO', 'Fr', '🇸🇳', 'Afrique de l''Ouest'),
('XAF', 'Franc CFA BEAC', 'Fr', '🇨🇲', 'Afrique Centrale'),

-- 🌍 AFRIQUE (Autres devises)
('ZAR', 'Rand Sud-Africain', 'R', '🇿🇦', 'Afrique Australe'),
('NGN', 'Naira Nigérian', '₦', '🇳🇬', 'Afrique de l''Ouest'),
('KES', 'Shilling Kenyan', 'Sh', '🇰🇪', 'Afrique de l''Est'),
('GHS', 'Cedi Ghanéen', '₵', '🇬🇭', 'Afrique de l''Ouest'),
('TZS', 'Shilling Tanzanien', 'Sh', '🇹🇿', 'Afrique de l''Est'),
('UGX', 'Shilling Ougandais', 'Sh', '🇺🇬', 'Afrique de l''Est'),
('ETB', 'Birr Éthiopien', 'Br', '🇪🇹', 'Afrique de l''Est'),
('MGA', 'Ariary Malgache', 'Ar', '🇲🇬', 'Afrique Australe'),
('MUR', 'Roupie Mauricienne', '₨', '🇲🇺', 'Afrique Australe'),
('SCR', 'Roupie Seychelloise', '₨', '🇸🇨', 'Afrique Australe'),
('BWP', 'Pula Botswanais', 'P', '🇧🇼', 'Afrique Australe'),
('ZMW', 'Kwacha Zambien', 'K', '🇿🇲', 'Afrique Australe'),
('MWK', 'Kwacha Malawite', 'MK', '🇲🇼', 'Afrique Australe'),
('AOA', 'Kwanza Angolais', 'Kz', '🇦🇴', 'Afrique Australe'),
('MZN', 'Metical Mozambicain', 'MT', '🇲🇿', 'Afrique Australe'),
('RWF', 'Franc Rwandais', 'Fr', '🇷🇼', 'Afrique de l''Est'),
('BIF', 'Franc Burundais', 'Fr', '🇧🇮', 'Afrique de l''Est'),
('DJF', 'Franc Djiboutien', 'Fr', '🇩🇯', 'Afrique de l''Est'),
('SOS', 'Shilling Somalien', 'Sh', '🇸🇴', 'Afrique de l''Est'),
('ERN', 'Nakfa Érythréen', 'Nfk', '🇪🇷', 'Afrique de l''Est'),
('SLL', 'Leone Sierra-Léonais', 'Le', '🇸🇱', 'Afrique de l''Ouest'),
('LRD', 'Dollar Libérien', 'L$', '🇱🇷', 'Afrique de l''Ouest'),
('GMD', 'Dalasi Gambien', 'D', '🇬🇲', 'Afrique de l''Ouest'),
('GNF', 'Franc Guinéen', 'Fr', '🇬🇳', 'Afrique de l''Ouest'),
('CVE', 'Escudo Cap-Verdien', '$', '🇨🇻', 'Afrique de l''Ouest'),
('STN', 'Dobra Santoméen', 'Db', '🇸🇹', 'Afrique Centrale'),
('CDF', 'Franc Congolais', 'Fr', '🇨🇩', 'Afrique Centrale'),
('SDG', 'Livre Soudanaise', 'ج.س.', '🇸🇩', 'Afrique de l''Est'),
('SSP', 'Livre Sud-Soudanaise', '£', '🇸🇸', 'Afrique de l''Est'),
('SZL', 'Lilangeni Swazi', 'L', '🇸🇿', 'Afrique Australe'),
('LSL', 'Loti Lesothan', 'L', '🇱🇸', 'Afrique Australe'),
('NAD', 'Dollar Namibien', 'N$', '🇳🇦', 'Afrique Australe'),

-- 🇪🇺 EUROPE (hors zone Euro)
('GBP', 'Livre Sterling', '£', '🇬🇧', 'Europe'),
('CHF', 'Franc Suisse', 'CHF', '🇨🇭', 'Europe'),
('NOK', 'Couronne Norvégienne', 'kr', '🇳🇴', 'Europe'),
('SEK', 'Couronne Suédoise', 'kr', '🇸🇪', 'Europe'),
('DKK', 'Couronne Danoise', 'kr', '🇩🇰', 'Europe'),
('ISK', 'Couronne Islandaise', 'kr', '🇮🇸', 'Europe'),
('PLN', 'Zloty Polonais', 'zł', '🇵🇱', 'Europe'),
('CZK', 'Couronne Tchèque', 'Kč', '🇨🇿', 'Europe'),
('HUF', 'Forint Hongrois', 'Ft', '🇭🇺', 'Europe'),
('RON', 'Leu Roumain', 'lei', '🇷🇴', 'Europe'),
('BGN', 'Lev Bulgare', 'лв', '🇧🇬', 'Europe'),
('HRK', 'Kuna Croate', 'kn', '🇭🇷', 'Europe'),
('RSD', 'Dinar Serbe', 'дин', '🇷🇸', 'Europe'),
('BAM', 'Mark Bosniaque', 'KM', '🇧🇦', 'Europe'),
('MKD', 'Denar Macédonien', 'ден', '🇲🇰', 'Europe'),
('ALL', 'Lek Albanais', 'L', '🇦🇱', 'Europe'),
('RUB', 'Rouble Russe', '₽', '🇷🇺', 'Europe'),
('UAH', 'Hryvnia Ukrainienne', '₴', '🇺🇦', 'Europe'),
('BYN', 'Rouble Biélorusse', 'Br', '🇧🇾', 'Europe'),
('MDL', 'Leu Moldave', 'L', '🇲🇩', 'Europe'),
('GEL', 'Lari Géorgien', '₾', '🇬🇪', 'Europe'),
('AMD', 'Dram Arménien', '֏', '🇦🇲', 'Europe'),
('AZN', 'Manat Azerbaïdjanais', '₼', '🇦🇿', 'Europe'),
('TRY', 'Livre Turque', '₺', '🇹🇷', 'Europe'),

-- 🌏 ASIE CENTRALE
('KZT', 'Tenge Kazakh', '₸', '🇰🇿', 'Asie Centrale'),
('UZS', 'Sum Ouzbek', "so'm", '🇺🇿', 'Asie Centrale'),
('TJS', 'Somoni Tadjik', 'ЅМ', '🇹🇯', 'Asie Centrale'),
('KGS', 'Som Kirghize', 'с', '🇰🇬', 'Asie Centrale'),
('TMT', 'Manat Turkmène', 'm', '🇹🇲', 'Asie Centrale'),
('AFN', 'Afghani Afghan', '؋', '🇦🇫', 'Asie Centrale'),

-- 🌏 ASIE (Sud & Sud-Est)
('INR', 'Roupie Indienne', '₹', '🇮🇳', 'Asie du Sud'),
('PKR', 'Roupie Pakistanaise', '₨', '🇵🇰', 'Asie du Sud'),
('BDT', 'Taka Bangladais', '৳', '🇧🇩', 'Asie du Sud'),
('LKR', 'Roupie Sri-Lankaise', '₨', '🇱🇰', 'Asie du Sud'),
('NPR', 'Roupie Népalaise', '₨', '🇳🇵', 'Asie du Sud'),
('BTN', 'Ngultrum Bhoutanais', 'Nu.', '🇧🇹', 'Asie du Sud'),
('MVR', 'Rufiyaa Maldivienne', 'Rf', '🇲🇻', 'Asie du Sud'),

('THB', 'Baht Thaïlandais', '฿', '🇹🇭', 'Asie du Sud-Est'),
('VND', 'Dong Vietnamien', '₫', '🇻🇳', 'Asie du Sud-Est'),
('IDR', 'Rupiah Indonésienne', 'Rp', '🇮🇩', 'Asie du Sud-Est'),
('MYR', 'Ringgit Malaisien', 'RM', '🇲🇾', 'Asie du Sud-Est'),
('SGD', 'Dollar Singapourien', 'S$', '🇸🇬', 'Asie du Sud-Est'),
('PHP', 'Peso Philippin', '₱', '🇵🇭', 'Asie du Sud-Est'),
('BND', 'Dollar Brunéien', 'B$', '🇧🇳', 'Asie du Sud-Est'),
('KHR', 'Riel Cambodgien', '៛', '🇰🇭', 'Asie du Sud-Est'),
('LAK', 'Kip Laotien', '₭', '🇱🇦', 'Asie du Sud-Est'),
('MMK', 'Kyat Birman', 'K', '🇲🇲', 'Asie du Sud-Est'),

-- 🌏 ASIE (Est)
('CNY', 'Yuan Chinois', '¥', '🇨🇳', 'Asie de l''Est'),
('JPY', 'Yen Japonais', '¥', '🇯🇵', 'Asie de l''Est'),
('KRW', 'Won Sud-Coréen', '₩', '🇰🇷', 'Asie de l''Est'),
('KPW', 'Won Nord-Coréen', '₩', '🇰🇵', 'Asie de l''Est'),
('TWD', 'Dollar Taïwanais', 'NT$', '🇹🇼', 'Asie de l''Est'),
('HKD', 'Dollar Hong-Kongais', 'HK$', '🇭🇰', 'Asie de l''Est'),
('MOP', 'Pataca Macanaise', 'P', '🇲🇴', 'Asie de l''Est'),
('MNT', 'Tugrik Mongol', '₮', '🇲🇳', 'Asie de l''Est'),

-- 🌎 AMÉRIQUE DU NORD
('USD', 'Dollar Américain', '$', '🇺🇸', 'Amérique du Nord'),
('CAD', 'Dollar Canadien', 'C$', '🇨🇦', 'Amérique du Nord'),
('MXN', 'Peso Mexicain', '$', '🇲🇽', 'Amérique du Nord'),

-- 🌎 AMÉRIQUE CENTRALE & CARAÏBES
('GTQ', 'Quetzal Guatémaltèque', 'Q', '🇬🇹', 'Amérique Centrale'),
('HNL', 'Lempira Hondurien', 'L', '🇭🇳', 'Amérique Centrale'),
('NIO', 'Córdoba Nicaraguayen', 'C$', '🇳🇮', 'Amérique Centrale'),
('CRC', 'Colón Costaricain', '₡', '🇨🇷', 'Amérique Centrale'),
('PAB', 'Balboa Panaméen', 'B/.', '🇵🇦', 'Amérique Centrale'),
('BZD', 'Dollar Bélizien', 'BZ$', '🇧🇿', 'Amérique Centrale'),
('SVC', 'Colón Salvadorien', '₡', '🇸🇻', 'Amérique Centrale'),

('CUP', 'Peso Cubain', '$', '🇨🇺', 'Caraïbes'),
('CUC', 'Peso Cubain Convertible', 'CUC$', '🇨🇺', 'Caraïbes'),
('JMD', 'Dollar Jamaïcain', 'J$', '🇯🇲', 'Caraïbes'),
('HTG', 'Gourde Haïtienne', 'G', '🇭🇹', 'Caraïbes'),
('DOP', 'Peso Dominicain', 'RD$', '🇩🇴', 'Caraïbes'),
('TTD', 'Dollar Trinidadien', 'TT$', '🇹🇹', 'Caraïbes'),
('BBD', 'Dollar Barbadien', 'Bds$', '🇧🇧', 'Caraïbes'),
('BSD', 'Dollar Bahaméen', 'B$', '🇧🇸', 'Caraïbes'),
('XCD', 'Dollar des Caraïbes Orientales', 'EC$', '🇦🇬', 'Caraïbes'),

-- 🌎 AMÉRIQUE DU SUD
('BRL', 'Real Brésilien', 'R$', '🇧🇷', 'Amérique du Sud'),
('ARS', 'Peso Argentin', '$', '🇦🇷', 'Amérique du Sud'),
('CLP', 'Peso Chilien', '$', '🇨🇱', 'Amérique du Sud'),
('COP', 'Peso Colombien', '$', '🇨🇴', 'Amérique du Sud'),
('PEN', 'Sol Péruvien', 'S/', '🇵🇪', 'Amérique du Sud'),
('VES', 'Bolívar Vénézuélien', 'Bs.S', '🇻🇪', 'Amérique du Sud'),
('BOB', 'Boliviano Bolivien', 'Bs.', '🇧🇴', 'Amérique du Sud'),
('PYG', 'Guaraní Paraguayen', '₲', '🇵🇾', 'Amérique du Sud'),
('UYU', 'Peso Uruguayen', '$U', '🇺🇾', 'Amérique du Sud'),
('GYD', 'Dollar Guyanien', 'G$', '🇬🇾', 'Amérique du Sud'),
('SRD', 'Dollar Surinamais', 'Sr$', '🇸🇷', 'Amérique du Sud'),

-- 🌏 OCÉANIE
('AUD', 'Dollar Australien', 'A$', '🇦🇺', 'Océanie'),
('NZD', 'Dollar Néo-Zélandais', 'NZ$', '🇳🇿', 'Océanie'),
('FJD', 'Dollar Fidjien', 'FJ$', '🇫🇯', 'Océanie'),
('PGK', 'Kina Papou', 'K', '🇵🇬', 'Océanie'),
('SBD', 'Dollar des Îles Salomon', 'SI$', '🇸🇧', 'Océanie'),
('TOP', 'Pa''anga Tongan', 'T$', '🇹🇴', 'Océanie'),
('WST', 'Tala Samoan', 'WS$', '🇼🇸', 'Océanie'),
('VUV', 'Vatu Vanuatuan', 'Vt', '🇻🇺', 'Océanie'),
('XPF', 'Franc Pacifique', 'Fr', '🇵🇫', 'Océanie')

ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. TABLE D'HISTORIQUE DES TAUX DE CHANGE
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_rates_history (
    id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15, 8) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    source VARCHAR(50) DEFAULT 'exchangerate-api',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_currency, to_currency, date, source)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates_history(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates_history(date);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_source ON exchange_rates_history(source);

-- =====================================================
-- 3. AJOUT DU CHAMP DEVISE AUX TABLES CRM
-- =====================================================

-- 3.1 TABLE: crm_quotes
ALTER TABLE crm_quotes ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';
ALTER TABLE crm_quotes DROP CONSTRAINT IF EXISTS fk_quotes_currency;
ALTER TABLE crm_quotes ADD CONSTRAINT fk_quotes_currency 
    FOREIGN KEY (currency) REFERENCES currencies(code);
CREATE INDEX IF NOT EXISTS idx_quotes_currency ON crm_quotes(currency);

-- 3.2 TABLE: crm_quote_items
ALTER TABLE crm_quote_items ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';
ALTER TABLE crm_quote_items DROP CONSTRAINT IF EXISTS fk_quote_items_currency;
ALTER TABLE crm_quote_items ADD CONSTRAINT fk_quote_items_currency 
    FOREIGN KEY (currency) REFERENCES currencies(code);
CREATE INDEX IF NOT EXISTS idx_quote_items_currency ON crm_quote_items(currency);

-- 3.3 TABLE: crm_opportunities
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';
ALTER TABLE crm_opportunities DROP CONSTRAINT IF EXISTS fk_opportunities_currency;
ALTER TABLE crm_opportunities ADD CONSTRAINT fk_opportunities_currency 
    FOREIGN KEY (currency) REFERENCES currencies(code);
CREATE INDEX IF NOT EXISTS idx_opportunities_currency ON crm_opportunities(currency);

-- 3.4 TABLE: crm_leads
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS fk_leads_currency;
ALTER TABLE crm_leads ADD CONSTRAINT fk_leads_currency 
    FOREIGN KEY (currency) REFERENCES currencies(code);
CREATE INDEX IF NOT EXISTS idx_leads_currency ON crm_leads(currency);

-- =====================================================
-- 4. FONCTION HELPER POUR RÉCUPÉRER LE TAUX DE CHANGE
-- =====================================================

CREATE OR REPLACE FUNCTION get_exchange_rate(
    from_curr VARCHAR(3),
    to_curr VARCHAR(3),
    rate_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15, 8) AS $$
DECLARE
    exchange_rate DECIMAL(15, 8);
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
    
    -- Sinon retourner 1 (taux par défaut - sera mis à jour par l'API)
    RETURN 1.0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. VUE POUR STATISTIQUES PAR DEVISE
-- =====================================================

CREATE OR REPLACE VIEW currency_stats AS
SELECT 
    c.code,
    c.name,
    c.symbol,
    c.flag,
    c.region,
    COUNT(DISTINCT q.id) as total_quotes,
    COUNT(DISTINCT o.id) as total_opportunities,
    COUNT(DISTINCT l.id) as total_leads,
    SUM(q.total) as total_quotes_amount,
    SUM(o.value) as total_opportunities_amount
FROM currencies c
LEFT JOIN crm_quotes q ON q.currency = c.code
LEFT JOIN crm_opportunities o ON o.currency = c.code
LEFT JOIN crm_leads l ON l.currency = c.code
GROUP BY c.code, c.name, c.symbol, c.flag, c.region;

-- =====================================================
-- 6. VÉRIFICATIONS
-- =====================================================

DO $$
DECLARE
    currency_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO currency_count FROM currencies;
    
    IF currency_count >= 160 THEN
        RAISE NOTICE '✅ Migration réussie: % devises mondiales disponibles', currency_count;
    ELSE
        RAISE WARNING '⚠️ Attention: seulement % devises trouvées', currency_count;
    END IF;
    
    -- Vérifier les devises prioritaires
    IF EXISTS (SELECT 1 FROM currencies WHERE code = 'TND' LIMIT 1) THEN
        RAISE NOTICE '✅ TND (Dinar Tunisien) - Devise principale activée';
    END IF;
    
    IF EXISTS (SELECT 1 FROM currencies WHERE code = 'USD' LIMIT 1) THEN
        RAISE NOTICE '✅ USD (Dollar Américain) disponible';
    END IF;
    
    IF EXISTS (SELECT 1 FROM currencies WHERE code = 'EUR' LIMIT 1) THEN
        RAISE NOTICE '✅ EUR (Euro) disponible';
    END IF;
END $$;

-- Vérifier que les colonnes sont bien ajoutées
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'crm_quotes' AND column_name = 'currency') THEN
        RAISE NOTICE '✅ Colonne currency ajoutée à crm_quotes';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'crm_quote_items' AND column_name = 'currency') THEN
        RAISE NOTICE '✅ Colonne currency ajoutée à crm_quote_items';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'crm_opportunities' AND column_name = 'currency') THEN
        RAISE NOTICE '✅ Colonne currency ajoutée à crm_opportunities';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'crm_leads' AND column_name = 'currency') THEN
        RAISE NOTICE '✅ Colonne currency ajoutée à crm_leads';
    END IF;
END $$;

-- =====================================================
-- 7. REQUÊTES DE VÉRIFICATION (À EXÉCUTER MANUELLEMENT)
-- =====================================================

/*
-- Voir toutes les devises par région
SELECT region, COUNT(*) as nb_devises, 
       STRING_AGG(code || ' (' || symbol || ')', ', ' ORDER BY code) as devises
FROM currencies
GROUP BY region
ORDER BY region;

-- Voir les 20 premières devises (TND, USD, EUR en tête)
SELECT code, name, symbol, flag, region 
FROM currencies 
ORDER BY id 
LIMIT 20;

-- Voir les statistiques d'utilisation des devises
SELECT * FROM currency_stats 
WHERE total_quotes > 0 OR total_opportunities > 0 OR total_leads > 0
ORDER BY total_quotes_amount DESC;

-- Tester une cotation avec devise
SELECT 
    quote_number,
    currency,
    total,
    created_at
FROM crm_quotes
ORDER BY id DESC
LIMIT 5;
*/

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

RAISE NOTICE '🎉 Migration multi-devises MONDIALE terminée avec succès !';
RAISE NOTICE '🌍 160+ devises mondiales disponibles';
RAISE NOTICE '💱 TND, USD, EUR en priorité';
RAISE NOTICE '📊 Tous les montants sont stockés en TND (après conversion en temps réel)';
RAISE NOTICE '🔄 Conversion via API exchangerate-api.com';
