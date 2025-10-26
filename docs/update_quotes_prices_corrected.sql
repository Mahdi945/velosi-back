-- ==========================================
-- MISE À JOUR DES PRIX DES COTATIONS (VERSION CORRIGÉE)
-- ==========================================
-- Ce script met à jour toutes les cotations avec des prix réalistes
-- Colonnes utilisées: purchase_price, selling_price, unit_price, total_price, margin
-- Date: 24 octobre 2025
-- ==========================================

-- ==========================================
-- 1. MISE À JOUR DES LIGNES DE COTATION
-- ==========================================

-- Cotation 1 (QUO-2025-001) - Transport matériaux construction
UPDATE crm_quote_items SET 
    purchase_price = 1200.00,
    selling_price = 1800.00,
    unit_price = 1800.00,
    total_price = 7200.00,
    margin = 2400.00
WHERE quote_id = 1 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 300.00,
    selling_price = 500.00,
    unit_price = 500.00,
    total_price = 2000.00,
    margin = 800.00
WHERE quote_id = 1 AND line_order = 2;

UPDATE crm_quote_items SET 
    purchase_price = 500.00,
    selling_price = 800.00,
    unit_price = 800.00,
    total_price = 800.00,
    margin = 300.00
WHERE quote_id = 1 AND line_order = 3;

-- Cotation 2 (QUO-2025-002) - Transport pharmaceutique express
UPDATE crm_quote_items SET 
    purchase_price = 280.00,
    selling_price = 450.00,
    unit_price = 450.00,
    total_price = 9000.00,
    margin = 3400.00
WHERE quote_id = 2 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 60.00,
    selling_price = 100.00,
    unit_price = 100.00,
    total_price = 2000.00,
    margin = 800.00
WHERE quote_id = 2 AND line_order = 2;

UPDATE crm_quote_items SET 
    purchase_price = 45.00,
    selling_price = 75.00,
    unit_price = 75.00,
    total_price = 1500.00,
    margin = 600.00
WHERE quote_id = 2 AND line_order = 3;

-- Cotation 3 (QUO-2025-003) - Distribution agricole
UPDATE crm_quote_items SET 
    purchase_price = 650.00,
    selling_price = 1200.00,
    unit_price = 1200.00,
    total_price = 7200.00,
    margin = 3300.00
WHERE quote_id = 3 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 250.00,
    selling_price = 400.00,
    unit_price = 400.00,
    total_price = 2400.00,
    margin = 900.00
WHERE quote_id = 3 AND line_order = 2;

-- Cotation 4 (QUO-2025-004) - Conteneur Radès-Marseille (REJETÉE + EXPIRÉE)
UPDATE crm_quote_items SET 
    purchase_price = 12000.00,
    selling_price = 18500.00,
    unit_price = 18500.00,
    total_price = 18500.00,
    margin = 6500.00
WHERE quote_id = 4 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 800.00,
    selling_price = 1200.00,
    unit_price = 1200.00,
    total_price = 1200.00,
    margin = 400.00
WHERE quote_id = 4 AND line_order = 2;

UPDATE crm_quote_items SET 
    purchase_price = 600.00,
    selling_price = 900.00,
    unit_price = 900.00,
    total_price = 900.00,
    margin = 300.00
WHERE quote_id = 4 AND line_order = 3;

-- Cotation 5 (QUO-2025-005) - Transport électronique
UPDATE crm_quote_items SET 
    purchase_price = 2200.00,
    selling_price = 3500.00,
    unit_price = 3500.00,
    total_price = 10500.00,
    margin = 3900.00
WHERE quote_id = 5 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 150.00,
    selling_price = 250.00,
    unit_price = 250.00,
    total_price = 750.00,
    margin = 300.00
WHERE quote_id = 5 AND line_order = 2;

UPDATE crm_quote_items SET 
    purchase_price = 400.00,
    selling_price = 650.00,
    unit_price = 650.00,
    total_price = 1950.00,
    margin = 750.00
WHERE quote_id = 5 AND line_order = 3;

-- Cotation 6 (QUO-2025-006) - Déménagement industriel
UPDATE crm_quote_items SET 
    purchase_price = 18000.00,
    selling_price = 28000.00,
    unit_price = 28000.00,
    total_price = 28000.00,
    margin = 10000.00
WHERE quote_id = 6 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 4500.00,
    selling_price = 7000.00,
    unit_price = 7000.00,
    total_price = 7000.00,
    margin = 2500.00
WHERE quote_id = 6 AND line_order = 2;

UPDATE crm_quote_items SET 
    purchase_price = 800.00,
    selling_price = 1200.00,
    unit_price = 1200.00,
    total_price = 1200.00,
    margin = 400.00
WHERE quote_id = 6 AND line_order = 3;

-- Cotation 7 (QUO-2025-007) - Transport automobile
UPDATE crm_quote_items SET 
    purchase_price = 350.00,
    selling_price = 550.00,
    unit_price = 550.00,
    total_price = 11000.00,
    margin = 4000.00
WHERE quote_id = 7 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 50.00,
    selling_price = 80.00,
    unit_price = 80.00,
    total_price = 1600.00,
    margin = 600.00
WHERE quote_id = 7 AND line_order = 2;

-- Cotation 8 (QUO-2025-008) - Messagerie express
UPDATE crm_quote_items SET 
    purchase_price = 25.00,
    selling_price = 45.00,
    unit_price = 45.00,
    total_price = 6750.00,
    margin = 3000.00
WHERE quote_id = 8 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 15.00,
    selling_price = 25.00,
    unit_price = 25.00,
    total_price = 3750.00,
    margin = 1500.00
WHERE quote_id = 8 AND line_order = 2;

-- Cotation 9 (QUO-2025-009) - Transport chimique
UPDATE crm_quote_items SET 
    purchase_price = 3200.00,
    selling_price = 5000.00,
    unit_price = 5000.00,
    total_price = 25000.00,
    margin = 9000.00
WHERE quote_id = 9 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 600.00,
    selling_price = 950.00,
    unit_price = 950.00,
    total_price = 4750.00,
    margin = 1750.00
WHERE quote_id = 9 AND line_order = 2;

UPDATE crm_quote_items SET 
    purchase_price = 800.00,
    selling_price = 1200.00,
    unit_price = 1200.00,
    total_price = 6000.00,
    margin = 2000.00
WHERE quote_id = 9 AND line_order = 3;

-- Cotation 10 (QUO-2025-010) - Transport textile (EXPIRÉE)
UPDATE crm_quote_items SET 
    purchase_price = 800.00,
    selling_price = 1400.00,
    unit_price = 1400.00,
    total_price = 14000.00,
    margin = 6000.00
WHERE quote_id = 10 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 180.00,
    selling_price = 300.00,
    unit_price = 300.00,
    total_price = 3000.00,
    margin = 1200.00
WHERE quote_id = 10 AND line_order = 2;

-- Cotation 11 (QUO-2025-011) - Import alimentaire
UPDATE crm_quote_items SET 
    purchase_price = 1800.00,
    selling_price = 2800.00,
    unit_price = 2800.00,
    total_price = 5600.00,
    margin = 2000.00
WHERE quote_id = 11 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 450.00,
    selling_price = 700.00,
    unit_price = 700.00,
    total_price = 1400.00,
    margin = 500.00
WHERE quote_id = 11 AND line_order = 2;

-- Cotation 12 (QUO-2025-012) - Livraison alimentaire quotidienne
UPDATE crm_quote_items SET 
    purchase_price = 320.00,
    selling_price = 550.00,
    unit_price = 550.00,
    total_price = 16500.00,
    margin = 6900.00
WHERE quote_id = 12 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 80.00,
    selling_price = 140.00,
    unit_price = 140.00,
    total_price = 4200.00,
    margin = 1800.00
WHERE quote_id = 12 AND line_order = 2;

-- ==========================================
-- 2. RECALCUL DES TOTAUX DES COTATIONS
-- ==========================================

-- Cotation 1: Sous-total vente + TVA (pas de subtotal_purchase dans crm_quotes)
UPDATE crm_quotes SET 
    subtotal = 10000.00,      -- 7200 + 2000 + 800
    tax_amount = 1900.00,     -- 10000 x 0.19
    total = 11900.00          -- 10000 + 1900
WHERE id = 1;

-- Cotation 2
UPDATE crm_quotes SET 
    subtotal = 12500.00,      -- 9000 + 2000 + 1500
    tax_amount = 2375.00,
    total = 14875.00
WHERE id = 2;

-- Cotation 3
UPDATE crm_quotes SET 
    subtotal = 9600.00,       -- 7200 + 2400
    tax_amount = 1824.00,
    total = 11424.00
WHERE id = 3;

-- Cotation 4 (REJETÉE + EXPIRÉE)
UPDATE crm_quotes SET 
    subtotal = 20600.00,      -- 18500 + 1200 + 900
    tax_amount = 3914.00,
    total = 24514.00
WHERE id = 4;

-- Cotation 5
UPDATE crm_quotes SET 
    subtotal = 13200.00,      -- 10500 + 750 + 1950
    tax_amount = 2508.00,
    total = 15708.00
WHERE id = 5;

-- Cotation 6
UPDATE crm_quotes SET 
    subtotal = 36200.00,      -- 28000 + 7000 + 1200
    tax_amount = 6878.00,
    total = 43078.00
WHERE id = 6;

-- Cotation 7
UPDATE crm_quotes SET 
    subtotal = 12600.00,      -- 11000 + 1600
    tax_amount = 2394.00,
    total = 14994.00
WHERE id = 7;

-- Cotation 8
UPDATE crm_quotes SET 
    subtotal = 10500.00,      -- 6750 + 3750
    tax_amount = 1995.00,
    total = 12495.00
WHERE id = 8;

-- Cotation 9
UPDATE crm_quotes SET 
    subtotal = 35750.00,      -- 25000 + 4750 + 6000
    tax_amount = 6792.50,
    total = 42542.50
WHERE id = 9;

-- Cotation 10 (EXPIRÉE)
UPDATE crm_quotes SET 
    subtotal = 17000.00,      -- 14000 + 3000
    tax_amount = 3230.00,
    total = 20230.00
WHERE id = 10;

-- Cotation 11
UPDATE crm_quotes SET 
    subtotal = 7000.00,       -- 5600 + 1400
    tax_amount = 1330.00,
    total = 8330.00
WHERE id = 11;

-- Cotation 12
UPDATE crm_quotes SET 
    subtotal = 20700.00,      -- 16500 + 4200
    tax_amount = 3933.00,
    total = 24633.00
WHERE id = 12;

-- ==========================================
-- 3. VÉRIFICATION DES MISES À JOUR
-- ==========================================

-- Afficher un résumé des cotations avec prix
SELECT 
    q.quote_number AS "Numéro",
    q.title AS "Titre",
    q.status AS "Statut",
    q.subtotal AS "Sous-total (TND)",
    q.tax_amount AS "TVA (TND)",
    q.total AS "Total TTC (TND)"
FROM crm_quotes q
ORDER BY q.id;

-- Afficher les lignes de cotation avec prix et marges
SELECT 
    qi.quote_id AS "ID",
    q.quote_number AS "Numéro",
    qi.description AS "Description",
    qi.quantity AS "Qté",
    qi.purchase_price AS "Prix Achat",
    qi.selling_price AS "Prix Vente",
    qi.total_price AS "Total",
    qi.margin AS "Marge"
FROM crm_quote_items qi
JOIN crm_quotes q ON qi.quote_id = q.id
ORDER BY qi.quote_id, qi.line_order;

-- Calculer la marge totale par cotation
SELECT 
    q.quote_number AS "Numéro",
    q.title AS "Titre",
    SUM(qi.total_price) AS "CA Total",
    SUM(qi.margin) AS "Marge Totale",
    ROUND((SUM(qi.margin) / NULLIF(SUM(qi.total_price), 0) * 100), 2) AS "Taux Marge %"
FROM crm_quotes q
LEFT JOIN crm_quote_items qi ON qi.quote_id = q.id
GROUP BY q.id, q.quote_number, q.title
ORDER BY q.id;

-- ==========================================
-- FIN DU SCRIPT
-- ==========================================
