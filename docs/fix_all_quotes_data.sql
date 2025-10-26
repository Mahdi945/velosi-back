-- ==========================================
-- CORRECTION COMPLÈTE DES DONNÉES DE COTATIONS
-- ==========================================
-- 1. Met à jour TOUTES les cotations avec des prix réalistes
-- 2. Corrige les statuts et dates pour des scénarios cohérents
-- Date: 24 octobre 2025
-- ==========================================

-- ==========================================
-- ÉTAPE 1: MISE À JOUR DES PRIX POUR TOUTES LES LIGNES
-- ==========================================

-- Cotation 1 (QUO-2025-001) - Brouillon - Transport matériaux
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

-- Cotation 2 (QUO-2025-002) - Envoyée - Transport pharmaceutique
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

-- Cotation 3 (QUO-2025-003) - Consultée - Distribution agricole
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

-- Cotation 4 (QUO-2025-004) - REJETÉE (et date expirée)
-- Scénario: Client a rejeté la cotation il y a 3 jours, mais la date de validité était il y a 10 jours
UPDATE crm_quote_items SET 
    purchase_price = 3000.00,
    selling_price = 4500.00,
    unit_price = 4500.00,
    total_price = 4500.00,
    margin = 1500.00
WHERE quote_id = 4 AND line_order = 1;

UPDATE crm_quote_items SET 
    purchase_price = 600.00,
    selling_price = 1000.00,
    unit_price = 1000.00,
    total_price = 1000.00,
    margin = 400.00
WHERE quote_id = 4 AND line_order = 2;

-- Cotation 5 (QUO-2025-005) - Acceptée - Transport électronique
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

-- Cotation 6 (QUO-2025-006) - Envoyée - Déménagement industriel
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

-- Cotation 7 (QUO-2025-007) - Consultée - Transport automobile
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

-- Cotation 8 (QUO-2025-008) - Acceptée - Messagerie express
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

-- Cotation 9 (QUO-2025-009) - Envoyée - Transport chimique
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

-- Cotation 10 (QUO-2025-010) - EXPIRÉE - Transport textile
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

-- Cotation 11 (QUO-2025-011) - Consultée - Import alimentaire
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

-- Cotation 12 (QUO-2025-012) - Acceptée - Livraison alimentaire
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
-- ÉTAPE 2: RECALCUL DES TOTAUX DES COTATIONS
-- ==========================================

-- Cotation 1 (Brouillon)
UPDATE crm_quotes SET 
    subtotal = 10000.00,
    tax_amount = 1900.00,
    total = 11900.00
WHERE id = 1;

-- Cotation 2 (Envoyée)
UPDATE crm_quotes SET 
    subtotal = 12500.00,
    tax_amount = 2375.00,
    total = 14875.00
WHERE id = 2;

-- Cotation 3 (Consultée)
UPDATE crm_quotes SET 
    subtotal = 8000.00,
    tax_amount = 1520.00,
    total = 9520.00
WHERE id = 3;

-- Cotation 4 (REJETÉE avec date expirée)
UPDATE crm_quotes SET 
    subtotal = 5500.00,
    tax_amount = 1045.00,
    total = 6545.00
WHERE id = 4;

-- Cotation 5 (Acceptée)
UPDATE crm_quotes SET 
    subtotal = 13200.00,
    tax_amount = 2508.00,
    total = 15708.00
WHERE id = 5;

-- Cotation 6 (Envoyée)
UPDATE crm_quotes SET 
    subtotal = 36200.00,
    tax_amount = 6878.00,
    total = 43078.00
WHERE id = 6;

-- Cotation 7 (Consultée)
UPDATE crm_quotes SET 
    subtotal = 12600.00,
    tax_amount = 2394.00,
    total = 14994.00
WHERE id = 7;

-- Cotation 8 (Acceptée)
UPDATE crm_quotes SET 
    subtotal = 10500.00,
    tax_amount = 1995.00,
    total = 12495.00
WHERE id = 8;

-- Cotation 9 (Envoyée)
UPDATE crm_quotes SET 
    subtotal = 35750.00,
    tax_amount = 6792.50,
    total = 42542.50
WHERE id = 9;

-- Cotation 10 (EXPIRÉE)
UPDATE crm_quotes SET 
    subtotal = 17000.00,
    tax_amount = 3230.00,
    total = 20230.00
WHERE id = 10;

-- Cotation 11 (Consultée)
UPDATE crm_quotes SET 
    subtotal = 7000.00,
    tax_amount = 1330.00,
    total = 8330.00
WHERE id = 11;

-- Cotation 12 (Acceptée)
UPDATE crm_quotes SET 
    subtotal = 20700.00,
    tax_amount = 3933.00,
    total = 24633.00
WHERE id = 12;

-- ==========================================
-- ÉTAPE 3: VÉRIFICATION COMPLÈTE
-- ==========================================

-- Vue d'ensemble des cotations
SELECT 
    q.id,
    q.quote_number AS "Numéro",
    q.title AS "Titre",
    q.status AS "Statut",
    q.valid_until AS "Validité",
    CASE 
        WHEN q.valid_until < CURRENT_DATE THEN 'OUI ⚠️'
        ELSE 'NON ✓'
    END AS "Expiré?",
    q.subtotal AS "Sous-total",
    q.tax_amount AS "TVA",
    q.total AS "Total TTC"
FROM crm_quotes q
ORDER BY q.id;

-- Détail des lignes avec marges
SELECT 
    qi.quote_id,
    q.quote_number,
    qi.line_order,
    qi.description,
    qi.quantity,
    qi.purchase_price,
    qi.selling_price,
    qi.total_price,
    qi.margin,
    ROUND((qi.margin / NULLIF(qi.total_price, 0) * 100), 2) AS "Marge %"
FROM crm_quote_items qi
JOIN crm_quotes q ON qi.quote_id = q.id
ORDER BY qi.quote_id, qi.line_order;

-- Analyse des marges par cotation
SELECT 
    q.quote_number AS "Cotation",
    q.status AS "Statut",
    COUNT(qi.id) AS "Nb Lignes",
    SUM(qi.total_price) AS "CA Total",
    SUM(qi.margin) AS "Marge Totale",
    ROUND((SUM(qi.margin) / NULLIF(SUM(qi.total_price), 0) * 100), 2) AS "Taux Marge %"
FROM crm_quotes q
LEFT JOIN crm_quote_items qi ON qi.quote_id = q.id
GROUP BY q.id, q.quote_number, q.status
ORDER BY q.id;

-- ==========================================
-- EXPLICATION DES SCÉNARIOS
-- ==========================================

/*
📋 EXPLICATION DU CAS "REJETÉ + EXPIRÉ" (QUO-2025-004)
------------------------------------------------------

Chronologie:
1. 29 septembre 2025: Cotation créée (valid_until = 14 oct)
2. 4 octobre 2025: Cotation envoyée au client
3. 6 octobre 2025: Client consulte la cotation
4. 21 octobre 2025: Client REJETTE la cotation (prix trop élevé)
5. 24 octobre 2025 (aujourd'hui): La date de validité est dépassée

Résultat:
- Statut en base: "rejected" (car c'est l'action la plus récente)
- Date valid_until: 14 octobre 2025 (dépassée)
- isExpired(quote): retourne TRUE

Affichage dans l'interface:
- Badge principal: "Rejeté" (statut officiel)
- Badge warning: "⚠️ Expiré" (information complémentaire)

C'est CORRECT car:
- Le client a effectivement rejeté la cotation
- Mais on veut aussi signaler que la date était expirée
- Cela aide à comprendre le contexte du rejet

📊 RÉPARTITION DES STATUTS
--------------------------
- QUO-2025-001: draft (Brouillon)
- QUO-2025-002: sent (Envoyée)
- QUO-2025-003: viewed (Consultée)
- QUO-2025-004: rejected (Rejetée) + date expirée ⚠️
- QUO-2025-005: accepted (Acceptée)
- QUO-2025-006: sent (Envoyée)
- QUO-2025-007: viewed (Consultée)
- QUO-2025-008: accepted (Acceptée)
- QUO-2025-009: sent (Envoyée)
- QUO-2025-010: expired (Expirée)
- QUO-2025-011: viewed (Consultée)
- QUO-2025-012: accepted (Acceptée)

✅ TOUTES les cotations ont maintenant des prix réalistes!
*/

-- ==========================================
-- FIN DU SCRIPT
-- ==========================================
