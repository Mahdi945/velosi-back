-- ==========================================
-- INSERTION DES LIGNES MANQUANTES POUR COTATIONS 5-12
-- ==========================================
-- Ce script ajoute les lignes de cotation manquantes avec des prix réalistes
-- Date: 24 octobre 2025
-- ==========================================

-- ==========================================
-- SUPPRESSION DES ANCIENNES DONNÉES (si besoin)
-- ==========================================
DELETE FROM crm_quote_items WHERE quote_id >= 5;

-- ==========================================
-- INSERTION DES NOUVELLES LIGNES
-- ==========================================

-- Cotation 5 (QUO-2025-005) - Acceptée - Transport électronique
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, weight_kg, vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(5, 'Transport électronique sensible - Camion 7.5T climatisé', 'freight',
    'Tunis', 'TUN', 'Sfax', 'TUN',
    270.00, 6500.00, 'truck_7_5t', 'express_delivery',
    3, 3500.00, 2200.00, 3500.00, 10500.00, 3900.00, 1),
(5, 'Emballage anti-statique et protection renforcée', 'freight',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'packaging',
    3, 250.00, 150.00, 250.00, 750.00, 300.00, 2),
(5, 'Assurance tous risques matériel électronique', 'freight',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'insurance',
    3, 650.00, 400.00, 650.00, 1950.00, 750.00, 3);

-- Cotation 6 (QUO-2025-006) - Envoyée - Déménagement industriel
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, weight_kg, vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(6, 'Déménagement usine - Semi-remorque + grue 50T', 'freight',
    'Bizerte', 'TUN', 'Ben Arous', 'TUN',
    80.00, 45000.00, 'semi_trailer', 'pickup_delivery',
    1, 28000.00, 18000.00, 28000.00, 28000.00, 10000.00, 1),
(6, 'Démontage, arrimage et remontage équipements', 'freight',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'packaging',
    1, 7000.00, 4500.00, 7000.00, 7000.00, 2500.00, 2),
(6, 'Assurance bris de machine et responsabilité civile', 'freight',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'insurance',
    1, 1200.00, 800.00, 1200.00, 1200.00, 400.00, 3);

-- Cotation 7 (QUO-2025-007) - Consultée - Transport automobile
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(7, 'Transport véhicules neufs - Porte-voitures (10 unités)', 'standard',
    'Port La Goulette', 'TUN', 'Réseau concessionnaires', 'TUN',
    150.00, 'container', 'door_to_door',
    20, 550.00, 350.00, 550.00, 11000.00, 4000.00, 1),
(7, 'Préparation véhicules et protection carrosserie', 'standard',
    NULL, NULL, NULL, NULL,
    NULL, NULL, 'packaging',
    20, 80.00, 50.00, 80.00, 1600.00, 600.00, 2);

-- Cotation 8 (QUO-2025-008) - Envoyée - Messagerie express
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(8, 'Messagerie express J+1 - Colis < 30kg', 'express',
    'Grand Tunis', 'TUN', 'National', 'TUN',
    'van', 'next_day',
    150, 45.00, 25.00, 45.00, 6750.00, 3000.00, 1),
(8, 'Tracking temps réel + preuve de livraison numérique', 'express',
    NULL, NULL, NULL, NULL,
    NULL, NULL,
    150, 25.00, 15.00, 25.00, 3750.00, 1500.00, 2);

-- Cotation 9 (QUO-2025-009) - Draft - Transport chimique
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, weight_kg, vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(9, 'Transport produits chimiques ADR - Citerne 20m³', 'freight',
    'Gabès', 'TUN', 'Bizerte', 'TUN',
    420.00, 18000.00, 'container', 'scheduled_delivery',
    5, 5000.00, 3200.00, 5000.00, 25000.00, 9000.00, 1),
(9, 'Certification ADR et équipements sécurité', 'freight',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'insurance',
    5, 950.00, 600.00, 950.00, 4750.00, 1750.00, 2),
(9, 'Escorte sécurisée et plan intervention urgence', 'freight',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'insurance',
    5, 1200.00, 800.00, 1200.00, 6000.00, 2000.00, 3);

-- Cotation 10 (QUO-2025-010) - Expirée - Transport textile
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, weight_kg, vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(10, 'Transport textile - Camion plateau bâché 12T', 'standard',
    'Monastir', 'TUN', 'Tunis', 'TUN',
    160.00, 11500.00, 'truck_12t', 'scheduled_delivery',
    10, 1400.00, 800.00, 1400.00, 14000.00, 6000.00, 1),
(10, 'Protection anti-humidité et manutention soignée', 'standard',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'packaging',
    10, 300.00, 180.00, 300.00, 3000.00, 1200.00, 2);

-- Cotation 11 (QUO-2025-011) - Cancelled - Import alimentaire
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, weight_kg, vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(11, 'Import conteneur 40ft produits alimentaires', 'freight',
    'Port Radès', 'TUN', 'Entrepôt client', 'TUN',
    35.00, 22000.00, 'container', 'pickup_delivery',
    2, 2800.00, 1800.00, 2800.00, 5600.00, 2000.00, 1),
(11, 'Dédouanement + inspection sanitaire', 'freight',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'insurance',
    2, 700.00, 450.00, 700.00, 1400.00, 500.00, 2);

-- Cotation 12 (QUO-2025-012) - Acceptée - Livraison alimentaire quotidienne
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(12, 'Livraison quotidienne produits frais - Camion frigo 3.5T', 'standard',
    'Tunis', 'TUN', 'Réseau points de vente (30 jours)', 'TUN',
    50.00, 'van', 'same_day',
    30, 550.00, 320.00, 550.00, 16500.00, 6900.00, 1),
(12, 'Contrôle température + traçabilité chaîne du froid', 'standard',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL,
    30, 140.00, 80.00, 140.00, 4200.00, 1800.00, 2);

-- ==========================================
-- MISE À JOUR DES TOTAUX DES COTATIONS
-- ==========================================

-- Les cotations 1-4 ont déjà leurs totaux, on met à jour seulement 5-12

-- Cotation 5 (Acceptée)
UPDATE crm_quotes SET 
    subtotal = 13200.00,      -- 10500 + 750 + 1950
    tax_amount = 2508.00,     -- 13200 x 0.19
    total = 15708.00          -- 13200 + 2508
WHERE id = 5;

-- Cotation 6 (Envoyée)
UPDATE crm_quotes SET 
    subtotal = 36200.00,      -- 28000 + 7000 + 1200
    tax_amount = 6878.00,
    total = 43078.00
WHERE id = 6;

-- Cotation 7 (Consultée)
UPDATE crm_quotes SET 
    subtotal = 12600.00,      -- 11000 + 1600
    tax_amount = 2394.00,
    total = 14994.00
WHERE id = 7;

-- Cotation 8 (Envoyée)
UPDATE crm_quotes SET 
    subtotal = 10500.00,      -- 6750 + 3750
    tax_amount = 1995.00,
    total = 12495.00
WHERE id = 8;

-- Cotation 9 (Draft)
UPDATE crm_quotes SET 
    subtotal = 35750.00,      -- 25000 + 4750 + 6000
    tax_amount = 6792.50,
    total = 42542.50
WHERE id = 9;

-- Cotation 10 (Expirée)
UPDATE crm_quotes SET 
    subtotal = 17000.00,      -- 14000 + 3000
    tax_amount = 3230.00,
    total = 20230.00
WHERE id = 10;

-- Cotation 11 (Cancelled)
UPDATE crm_quotes SET 
    subtotal = 7000.00,       -- 5600 + 1400
    tax_amount = 1330.00,
    total = 8330.00
WHERE id = 11;

-- Cotation 12 (Acceptée)
UPDATE crm_quotes SET 
    subtotal = 20700.00,      -- 16500 + 4200
    tax_amount = 3933.00,
    total = 24633.00
WHERE id = 12;

-- ==========================================
-- VÉRIFICATION FINALE
-- ==========================================

-- Vue complète des cotations avec leurs lignes
SELECT 
    q.quote_number AS "Cotation",
    q.status AS "Statut",
    COUNT(qi.id) AS "Nb Lignes",
    COALESCE(SUM(qi.total_price), 0) AS "CA Total",
    COALESCE(SUM(qi.margin), 0) AS "Marge Totale",
    CASE 
        WHEN SUM(qi.total_price) > 0 THEN ROUND((SUM(qi.margin) / SUM(qi.total_price) * 100), 2)
        ELSE 0
    END AS "Taux Marge %",
    q.total AS "Total TTC (avec TVA)"
FROM crm_quotes q
LEFT JOIN crm_quote_items qi ON qi.quote_id = q.id
GROUP BY q.id, q.quote_number, q.status, q.total
ORDER BY q.id;

-- Détail de chaque ligne
SELECT 
    qi.quote_id,
    q.quote_number,
    qi.line_order,
    LEFT(qi.description, 50) AS "Description",
    qi.quantity,
    qi.purchase_price AS "Achat",
    qi.selling_price AS "Vente",
    qi.total_price AS "Total",
    qi.margin AS "Marge"
FROM crm_quote_items qi
JOIN crm_quotes q ON qi.quote_id = q.id
ORDER BY qi.quote_id, qi.line_order;

-- ==========================================
-- FIN DU SCRIPT
-- ==========================================
