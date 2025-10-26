-- ==========================================
-- MISE À JOUR DES PRIX DES COTATIONS
-- ==========================================
-- Ce script met à jour toutes les cotations avec des prix réalistes
-- pour les prix d'achat et prix de vente
-- Date: 24 octobre 2025
-- ==========================================

-- ==========================================
-- 1. MISE À JOUR DES LIGNES DE COTATION
-- ==========================================

-- Cotation 1 (QUO-2025-001) - Transport matériaux construction
UPDATE crm_quote_items SET 
    purchase_price = 1200.00,  -- Prix d'achat unitaire
    selling_price = 1800.00,   -- Prix de vente unitaire
    unit_price = 1800.00,      -- Prix unitaire (pour compatibilité)
    total_price = 7200.00,     -- Total vente (1800 x 4)
    margin = 2400.00           -- Marge (7200 - 4800)
WHERE quote_id = 1 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 300.00,
    selling_price = 500.00,
    unit_price = 500.00,
    total_price = 2000.00,     -- 500 x 4
    margin = 800.00            -- Marge (2000 - 1200)
WHERE quote_id = 1 AND line_order = 2;

UPDATE crm_quote_items SET 
    purchase_price = 500.00,
    selling_price = 800.00,
    unit_price = 800.00,
    total_price = 800.00,      -- 800 x 1
    margin = 300.00            -- Marge (800 - 500)
WHERE quote_id = 1 AND line_order = 3;

-- Cotation 2 (QUO-2025-002) - Transport pharmaceutique express
UPDATE crm_quote_items SET 
    purchase_price = 280.00,
    selling_price = 450.00,
    unit_price = 450.00,
    total_price = 9000.00,     -- 450 x 20
    margin = 3400.00           -- Marge (9000 - 5600)
WHERE quote_id = 2 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 60.00,
    selling_price = 100.00,
    unit_price = 100.00,
    total_price = 2000.00,     -- 100 x 20
    margin = 800.00            -- Marge (2000 - 1200)
WHERE quote_id = 2 AND line_order = 2;

UPDATE crm_quote_items SET 
    purchase_price = 45.00,
    selling_price = 75.00,
    unit_price = 75.00,
    total_price = 1500.00,     -- 75 x 20
    margin = 600.00            -- Marge (1500 - 900)
WHERE quote_id = 2 AND line_order = 3;

-- Cotation 3 (QUO-2025-003) - Distribution agricole
UPDATE crm_quote_items SET 
    unit_purchase_price = 650.00,
    unit_price = 1200.00,
    total_purchase_price = 3900.00,  -- 650 x 6
    total_price = 7200.00            -- 1200 x 6
WHERE quote_id = 3 AND line_order = 1;

UPDATE crm_quote_items SET 
    unit_purchase_price = 250.00,
    unit_price = 400.00,
    total_purchase_price = 1500.00,  -- 250 x 6
    total_price = 2400.00            -- 400 x 6
WHERE quote_id = 3 AND line_order = 2;

-- Cotation 4 (QUO-2025-004) - Conteneur Radès-Marseille (REJETÉE + EXPIRÉE)
UPDATE crm_quote_items SET 
    unit_purchase_price = 12000.00,
    unit_price = 18500.00,
    total_purchase_price = 12000.00, -- 12000 x 1
    total_price = 18500.00           -- 18500 x 1
WHERE quote_id = 4 AND line_order = 1;

UPDATE crm_quote_items SET 
    unit_purchase_price = 800.00,
    unit_price = 1200.00,
    total_purchase_price = 800.00,
    total_price = 1200.00
WHERE quote_id = 4 AND line_order = 2;

UPDATE crm_quote_items SET 
    unit_purchase_price = 600.00,
    unit_price = 900.00,
    total_purchase_price = 600.00,
    total_price = 900.00
WHERE quote_id = 4 AND line_order = 3;

-- Cotation 5 (QUO-2025-005) - Transport électronique
UPDATE crm_quote_items SET 
    unit_purchase_price = 2200.00,
    unit_price = 3500.00,
    total_purchase_price = 6600.00,  -- 2200 x 3
    total_price = 10500.00           -- 3500 x 3
WHERE quote_id = 5 AND line_order = 1;

UPDATE crm_quote_items SET 
    unit_purchase_price = 150.00,
    unit_price = 250.00,
    total_purchase_price = 450.00,   -- 150 x 3
    total_price = 750.00             -- 250 x 3
WHERE quote_id = 5 AND line_order = 2;

UPDATE crm_quote_items SET 
    unit_purchase_price = 400.00,
    unit_price = 650.00,
    total_purchase_price = 1200.00,  -- 400 x 3
    total_price = 1950.00            -- 650 x 3
WHERE quote_id = 5 AND line_order = 3;

-- Cotation 6 (QUO-2025-006) - Déménagement industriel
UPDATE crm_quote_items SET 
    unit_purchase_price = 18000.00,
    unit_price = 28000.00,
    total_purchase_price = 18000.00,
    total_price = 28000.00
WHERE quote_id = 6 AND line_order = 1;

UPDATE crm_quote_items SET 
    unit_purchase_price = 4500.00,
    unit_price = 7000.00,
    total_purchase_price = 4500.00,
    total_price = 7000.00
WHERE quote_id = 6 AND line_order = 2;

UPDATE crm_quote_items SET 
    unit_purchase_price = 800.00,
    unit_price = 1200.00,
    total_purchase_price = 800.00,
    total_price = 1200.00
WHERE quote_id = 6 AND line_order = 3;

-- Cotation 7 (QUO-2025-007) - Transport automobile
UPDATE crm_quote_items SET 
    unit_purchase_price = 350.00,
    unit_price = 550.00,
    total_purchase_price = 7000.00,  -- 350 x 20
    total_price = 11000.00           -- 550 x 20
WHERE quote_id = 7 AND line_order = 1;

UPDATE crm_quote_items SET 
    unit_purchase_price = 50.00,
    unit_price = 80.00,
    total_purchase_price = 1000.00,  -- 50 x 20
    total_price = 1600.00            -- 80 x 20
WHERE quote_id = 7 AND line_order = 2;

-- Cotation 8 (QUO-2025-008) - Messagerie express
UPDATE crm_quote_items SET 
    unit_purchase_price = 25.00,
    unit_price = 45.00,
    total_purchase_price = 3750.00,  -- 25 x 150
    total_price = 6750.00            -- 45 x 150
WHERE quote_id = 8 AND line_order = 1;

UPDATE crm_quote_items SET 
    unit_purchase_price = 15.00,
    unit_price = 25.00,
    total_purchase_price = 2250.00,  -- 15 x 150
    total_price = 3750.00            -- 25 x 150
WHERE quote_id = 8 AND line_order = 2;

-- Cotation 9 (QUO-2025-009) - Transport chimique
UPDATE crm_quote_items SET 
    unit_purchase_price = 3200.00,
    unit_price = 5000.00,
    total_purchase_price = 16000.00, -- 3200 x 5
    total_price = 25000.00           -- 5000 x 5
WHERE quote_id = 9 AND line_order = 1;

UPDATE crm_quote_items SET 
    unit_purchase_price = 600.00,
    unit_price = 950.00,
    total_purchase_price = 3000.00,  -- 600 x 5
    total_price = 4750.00            -- 950 x 5
WHERE quote_id = 9 AND line_order = 2;

UPDATE crm_quote_items SET 
    unit_purchase_price = 800.00,
    unit_price = 1200.00,
    total_purchase_price = 4000.00,  -- 800 x 5
    total_price = 6000.00            -- 1200 x 5
WHERE quote_id = 9 AND line_order = 3;

-- Cotation 10 (QUO-2025-010) - Transport textile (EXPIRÉE)
UPDATE crm_quote_items SET 
    unit_purchase_price = 800.00,
    unit_price = 1400.00,
    total_purchase_price = 8000.00,  -- 800 x 10
    total_price = 14000.00           -- 1400 x 10
WHERE quote_id = 10 AND line_order = 1;

UPDATE crm_quote_items SET 
    unit_purchase_price = 180.00,
    unit_price = 300.00,
    total_purchase_price = 1800.00,  -- 180 x 10
    total_price = 3000.00            -- 300 x 10
WHERE quote_id = 10 AND line_order = 2;

-- Cotation 11 (QUO-2025-011) - Import alimentaire
UPDATE crm_quote_items SET 
    unit_purchase_price = 1800.00,
    unit_price = 2800.00,
    total_purchase_price = 3600.00,  -- 1800 x 2
    total_price = 5600.00            -- 2800 x 2
WHERE quote_id = 11 AND line_order = 1;

UPDATE crm_quote_items SET 
    unit_purchase_price = 450.00,
    unit_price = 700.00,
    total_purchase_price = 900.00,   -- 450 x 2
    total_price = 1400.00            -- 700 x 2
WHERE quote_id = 11 AND line_order = 2;

-- Cotation 12 (QUO-2025-012) - Livraison alimentaire quotidienne
UPDATE crm_quote_items SET 
    unit_purchase_price = 320.00,
    unit_price = 550.00,
    total_purchase_price = 9600.00,  -- 320 x 30
    total_price = 16500.00           -- 550 x 30
WHERE quote_id = 12 AND line_order = 1;

UPDATE crm_quote_items SET 
    unit_purchase_price = 80.00,
    unit_price = 140.00,
    total_purchase_price = 2400.00,  -- 80 x 30
    total_price = 4200.00            -- 140 x 30
WHERE quote_id = 12 AND line_order = 2;

-- ==========================================
-- 2. RECALCUL DES TOTAUX DES COTATIONS
-- ==========================================

-- Cotation 1: Sous-total achat et vente + TVA
UPDATE crm_quotes SET 
    subtotal_purchase = 6500.00,     -- 4800 + 1200 + 500
    subtotal = 10000.00,             -- 7200 + 2000 + 800
    tax_amount = 1900.00,            -- 10000 x 0.19
    total = 11900.00                 -- 10000 + 1900
WHERE id = 1;

-- Cotation 2: Sous-total achat et vente + TVA
UPDATE crm_quotes SET 
    subtotal_purchase = 7700.00,     -- 5600 + 1200 + 900
    subtotal = 12500.00,             -- 9000 + 2000 + 1500
    tax_amount = 2375.00,            -- 12500 x 0.19
    total = 14875.00                 -- 12500 + 2375
WHERE id = 2;

-- Cotation 3: Sous-total achat et vente + TVA
UPDATE crm_quotes SET 
    subtotal_purchase = 5400.00,     -- 3900 + 1500
    subtotal = 9600.00,              -- 7200 + 2400
    tax_amount = 1824.00,            -- 9600 x 0.19
    total = 11424.00                 -- 9600 + 1824
WHERE id = 3;

-- Cotation 4: Sous-total achat et vente + TVA (REJETÉE + EXPIRÉE)
UPDATE crm_quotes SET 
    subtotal_purchase = 13400.00,    -- 12000 + 800 + 600
    subtotal = 20600.00,             -- 18500 + 1200 + 900
    tax_amount = 3914.00,            -- 20600 x 0.19
    total = 24514.00                 -- 20600 + 3914
WHERE id = 4;

-- Cotation 5: Sous-total achat et vente + TVA
UPDATE crm_quotes SET 
    subtotal_purchase = 8250.00,     -- 6600 + 450 + 1200
    subtotal = 13200.00,             -- 10500 + 750 + 1950
    tax_amount = 2508.00,            -- 13200 x 0.19
    total = 15708.00                 -- 13200 + 2508
WHERE id = 5;

-- Cotation 6: Sous-total achat et vente + TVA
UPDATE crm_quotes SET 
    subtotal_purchase = 23300.00,    -- 18000 + 4500 + 800
    subtotal = 36200.00,             -- 28000 + 7000 + 1200
    tax_amount = 6878.00,            -- 36200 x 0.19
    total = 43078.00                 -- 36200 + 6878
WHERE id = 6;

-- Cotation 7: Sous-total achat et vente + TVA
UPDATE crm_quotes SET 
    subtotal_purchase = 8000.00,     -- 7000 + 1000
    subtotal = 12600.00,             -- 11000 + 1600
    tax_amount = 2394.00,            -- 12600 x 0.19
    total = 14994.00                 -- 12600 + 2394
WHERE id = 7;

-- Cotation 8: Sous-total achat et vente + TVA
UPDATE crm_quotes SET 
    subtotal_purchase = 6000.00,     -- 3750 + 2250
    subtotal = 10500.00,             -- 6750 + 3750
    tax_amount = 1995.00,            -- 10500 x 0.19
    total = 12495.00                 -- 10500 + 1995
WHERE id = 8;

-- Cotation 9: Sous-total achat et vente + TVA
UPDATE crm_quotes SET 
    subtotal_purchase = 23000.00,    -- 16000 + 3000 + 4000
    subtotal = 35750.00,             -- 25000 + 4750 + 6000
    tax_amount = 6792.50,            -- 35750 x 0.19
    total = 42542.50                 -- 35750 + 6792.50
WHERE id = 9;

-- Cotation 10: Sous-total achat et vente + TVA (EXPIRÉE)
UPDATE crm_quotes SET 
    subtotal_purchase = 9800.00,     -- 8000 + 1800
    subtotal = 17000.00,             -- 14000 + 3000
    tax_amount = 3230.00,            -- 17000 x 0.19
    total = 20230.00                 -- 17000 + 3230
WHERE id = 10;

-- Cotation 11: Sous-total achat et vente + TVA
UPDATE crm_quotes SET 
    subtotal_purchase = 4500.00,     -- 3600 + 900
    subtotal = 7000.00,              -- 5600 + 1400
    tax_amount = 1330.00,            -- 7000 x 0.19
    total = 8330.00                  -- 7000 + 1330
WHERE id = 11;

-- Cotation 12: Sous-total achat et vente + TVA
UPDATE crm_quotes SET 
    subtotal_purchase = 12000.00,    -- 9600 + 2400
    subtotal = 20700.00,             -- 16500 + 4200
    tax_amount = 3933.00,            -- 20700 x 0.19
    total = 24633.00                 -- 20700 + 3933
WHERE id = 12;

-- ==========================================
-- 3. VÉRIFICATION DES MISES À JOUR
-- ==========================================

-- Afficher un résumé des cotations avec prix
SELECT 
    q.number AS "Numéro Cotation",
    q.title AS "Titre",
    q.status AS "Statut",
    q.subtotal_purchase AS "Sous-total Achat (TND)",
    q.subtotal AS "Sous-total Vente (TND)",
    q.tax_amount AS "TVA (TND)",
    q.total AS "Total TTC (TND)",
    (q.subtotal - q.subtotal_purchase) AS "Marge Brute (TND)",
    ROUND(((q.subtotal - q.subtotal_purchase) / q.subtotal * 100), 2) AS "Marge %"
FROM crm_quotes q
ORDER BY q.id;

-- Afficher les lignes de cotation avec prix
SELECT 
    qi.quote_id AS "ID Cotation",
    q.number AS "Numéro",
    qi.description AS "Description",
    qi.quantity AS "Quantité",
    qi.unit_purchase_price AS "Prix Achat Unit.",
    qi.unit_price AS "Prix Vente Unit.",
    qi.total_purchase_price AS "Total Achat",
    qi.total_price AS "Total Vente",
    (qi.total_price - qi.total_purchase_price) AS "Marge"
FROM crm_quote_items qi
JOIN crm_quotes q ON qi.quote_id = q.id
ORDER BY qi.quote_id, qi.line_order;

-- ==========================================
-- FIN DU SCRIPT
-- ==========================================
