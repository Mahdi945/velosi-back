-- ==========================================
-- SCRIPT COMPLET : RECRÉATION DES COTATIONS
-- ==========================================
-- Ce script supprime et recrée toutes les cotations avec:
-- - Lien vers prospects (leads)
-- - Lien vers opportunités (opportunities)
-- - Lien vers clients
-- - Commercial assigné (créé par)
-- - Lignes de cotation avec prix réalistes
-- Date: 24 octobre 2025
-- ==========================================

-- ==========================================
-- ÉTAPE 1: SUPPRESSION DES DONNÉES EXISTANTES
-- ==========================================

-- D'abord supprimer les activités liées aux cotations (à cause de la contrainte FK)
DELETE FROM crm_activity_participants WHERE activity_id IN (
    SELECT id FROM crm_activities WHERE quote_id IS NOT NULL
);
DELETE FROM crm_activities WHERE quote_id IS NOT NULL;

-- Ensuite supprimer les lignes de cotation
DELETE FROM crm_quote_items;

-- Enfin supprimer les cotations
DELETE FROM crm_quotes;

-- Réinitialiser les séquences
ALTER SEQUENCE crm_quotes_id_seq RESTART WITH 1;
ALTER SEQUENCE crm_quote_items_id_seq RESTART WITH 1;

-- ==========================================
-- ÉTAPE 2: INSERTION DES COTATIONS
-- ==========================================

-- Cotation 1: BROUILLON - Liée au Prospect 1 (SOTUVER) - Commercial: Bassem Sassi (ID 3)
INSERT INTO crm_quotes (
    quote_number, lead_id, client_id, title, status,
    valid_until, 
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-001', 1, NULL, 'Cotation Transport Matériaux Construction', 'draft',
    CURRENT_DATE + INTERVAL '30 days',
    'Bassem Sassi', 'SOTUVER', 'b.sassi@sotuver.tn', '+216 71 123 456',
    'Zone Industrielle Radès, TUN',
    'Tunisie', 'Prospect', 'FOB', 'Virement bancaire',
    10000.00, 19.00, 1900.00, 11900.00,
    'Paiement 30 jours fin de mois', 'Franco départ',
    CURRENT_TIMESTAMP - INTERVAL '5 days', 3
);

-- Cotation 2: ENVOYÉE - Liée au Prospect 2 (AgriTech) - Commercial: Hatem Jlassi (ID 14)
INSERT INTO crm_quotes (
    quote_number, lead_id, title, status,
    valid_until, sent_at,
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-002', 2, 'Cotation Transport Pharmaceutique Express', 'sent',
    CURRENT_DATE + INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '5 days',
    'Salim Dhaoui', 'AgriTech Solutions', 's.dhaoui@agritech.tn', '+216 73 234 567',
    'Route de Sousse, TUN',
    'Tunisie', 'Prospect', 'EXW', 'Comptant',
    12500.00, 19.00, 2375.00, 14875.00,
    'Paiement à la livraison', 'Livraison express 24h',
    CURRENT_TIMESTAMP - INTERVAL '7 days', 14
);

-- Cotation 3: ACCEPTÉE - Liée au Client 1 (GafsaTransport) - Commercial: Bassem Sassi (ID 3)
INSERT INTO crm_quotes (
    quote_number, client_id, title, status,
    valid_until, sent_at, viewed_at, accepted_at,
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-003', 1, 'Cotation Distribution Agricole Hebdomadaire', 'accepted',
    CURRENT_DATE + INTERVAL '45 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '12 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    'Mohamed Trabelsi', 'GafsaTransport', 'contact@gafsatransport.tn', '+216 76 345 678',
    '650 Avenue Habib Bourguiba, 8919 Monastir, Tunisie',
    'Tunisie', 'Client', 'DDP', 'Virement bancaire',
    8000.00, 19.00, 1520.00, 9520.00,
    'Paiement 30 jours', 'Livraison hebdomadaire',
    CURRENT_TIMESTAMP - INTERVAL '20 days', 3
);

-- Cotation 4: REJETÉE (+ date expirée) - Liée à l'Opportunité 5 - Commercial: Hatem Jlassi (ID 14)
INSERT INTO crm_quotes (
    quote_number, opportunity_id, title, status,
    valid_until, sent_at, viewed_at, rejected_at,
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method, rejection_reason,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-004', 5, 'Cotation Transport Équipements Industriels', 'rejected',
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '18 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    'Sonia Gharbi', 'ElectroTech Industries', 's.gharbi@electrotech.tn', '+216 52 345 678',
    'Avenue Habib Bourguiba, Sfax 3000, TUN',
    'Tunisie', 'Prospect via Opportunité', 'FOB', 'Chèque',
    'Prix trop élevé par rapport à la concurrence. Client a choisi Trans-Maghreb avec tarif 25% inférieur.',
    5500.00, 19.00, 1045.00, 6545.00,
    'Paiement comptant', 'Franco départ',
    CURRENT_TIMESTAMP - INTERVAL '25 days', 14
);

-- Cotation 5: ACCEPTÉE - Liée au Client 5 (Mediterranean Transport Co) - Commercial: Bassem Sassi (ID 3)
INSERT INTO crm_quotes (
    quote_number, client_id, title, status,
    valid_until, sent_at, viewed_at, accepted_at,
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-005', 5, 'Cotation Transport Électronique Sensible', 'accepted',
    CURRENT_DATE + INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '6 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    'Amina Jouini', 'Mediterranean Transport Co', 'contact@medtransport.tn', '+216 71 456 789',
    '975 Avenue Habib Bourguiba, 3150 Tunis, Tunisie',
    'Tunisie', 'Client', 'CIF', 'Virement bancaire',
    13200.00, 19.00, 2508.00, 15708.00,
    'Paiement 30 jours', 'Livraison express avec assurance',
    CURRENT_TIMESTAMP - INTERVAL '8 days', 3
);

-- Cotation 6: ENVOYÉE - Liée au Client 8 (Logistique Sahel & Cie) - Commercial: Hatem Jlassi (ID 14)
INSERT INTO crm_quotes (
    quote_number, client_id, title, status,
    valid_until, sent_at,
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-006', 8, 'Cotation Déménagement Industriel', 'sent',
    CURRENT_DATE + INTERVAL '25 days', CURRENT_TIMESTAMP - INTERVAL '3 days',
    'Salim Gharbi', 'Logistique Sahel & Cie', 'contact@sahel-logistique.tn', '+216 73 567 890',
    '111 Avenue Habib Bourguiba, 2825 Kairouan, Tunisie',
    'Tunisie', 'Client', 'DDP', 'Virement bancaire',
    36200.00, 19.00, 6878.00, 43078.00,
    'Paiement 60 jours', 'Déménagement complet avec assurance',
    CURRENT_TIMESTAMP - INTERVAL '5 days', 14
);

-- Cotation 7: CONSULTÉE - Liée au Client 12 (Kairouan Transport Services) - Commercial: Bassem Sassi (ID 3)
INSERT INTO crm_quotes (
    quote_number, client_id, title, status,
    valid_until, sent_at, viewed_at,
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-007', 12, 'Cotation Transport Automobiles Neufs', 'viewed',
    CURRENT_DATE + INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    'Mohamed Trabelsi', 'Kairouan Transport Services', 'contact@kairouantransport.tn', '+216 77 678 901',
    '131 Avenue Habib Bourguiba, 5678 Bizerte, Tunisie',
    'Tunisie', 'Client', 'FOB', 'Comptant',
    12600.00, 19.00, 2394.00, 14994.00,
    'Paiement à la livraison', 'Distribution multi-points',
    CURRENT_TIMESTAMP - INTERVAL '10 days', 3
);

-- Cotation 8: ACCEPTÉE - Liée au Client 14 (Nabeul Logistics SARL) - Commercial: Hatem Jlassi (ID 14)
INSERT INTO crm_quotes (
    quote_number, client_id, title, status,
    valid_until, sent_at, viewed_at, accepted_at,
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-008', 14, 'Cotation Messagerie Express Nationale', 'accepted',
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_TIMESTAMP - INTERVAL '12 days',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    'Fatma Essid', 'Nabeul Logistics SARL', 'contact@nabeullogistics.tn', '+216 72 789 012',
    '73 Avenue Habib Bourguiba, 6949 Bizerte, Tunisie',
    'Tunisie', 'Client', 'EXW', 'Virement bancaire',
    10500.00, 19.00, 1995.00, 12495.00,
    'Paiement 15 jours', 'Livraison express J+1',
    CURRENT_TIMESTAMP - INTERVAL '15 days', 14
);

-- Cotation 9: BROUILLON - Liée au Prospect 5 (ChemCorp) - Commercial: Bassem Sassi (ID 3)
INSERT INTO crm_quotes (
    quote_number, lead_id, title, status,
    valid_until,
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-009', 5, 'Cotation Transport Produits Chimiques ADR', 'draft',
    CURRENT_DATE + INTERVAL '30 days',
    'Nadia Gharbi', 'ChemCorp Tunisia', 'n.gharbi@chemcorp.tn', '+216 75 890 123',
    'Zone Industrielle Gabès, TUN',
    'Tunisie', 'Prospect', 'FCA', 'Virement bancaire',
    35750.00, 19.00, 6792.50, 42542.50,
    'Paiement 45 jours', 'Transport ADR certifié avec escorte',
    CURRENT_TIMESTAMP - INTERVAL '2 days', 3
);

-- Cotation 10: EXPIRÉE - Liée au Client 20 (Monastir Shipping Company) - Commercial: Hatem Jlassi (ID 14)
INSERT INTO crm_quotes (
    quote_number, client_id, title, status,
    valid_until, sent_at, viewed_at,
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-010', 20, 'Cotation Transport Textile', 'expired',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '25 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    'Mohamed Trabelsi', 'Monastir Shipping Company', 'contact@monastirshipping.tn', '+216 73 901 234',
    '454 Avenue Habib Bourguiba, 7137 Tunis, Tunisie',
    'Tunisie', 'Client', 'FOB', 'Comptant',
    17000.00, 19.00, 3230.00, 20230.00,
    'Paiement comptant', 'Livraison standard',
    CURRENT_TIMESTAMP - INTERVAL '30 days', 14
);

-- Cotation 11: ANNULÉE - Liée au Client 3 (Iberian Logistics Spain SA) - Commercial: Bassem Sassi (ID 3)
INSERT INTO crm_quotes (
    quote_number, client_id, title, status,
    valid_until, sent_at, viewed_at,
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method, rejection_reason,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-011', 3, 'Cotation Import Conteneur Produits Alimentaires', 'cancelled',
    CURRENT_DATE + INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '18 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    'Contact Iberian', 'Iberian Logistics Spain SA', 'contact@iberianlog.es', '+34 91 123 456',
    '191 Avenue de la République, 97114 Madrid, Espagne',
    'Espagne', 'Client International', 'CIF', 'Virement SWIFT',
    'Client a annulé le projet d''importation pour raisons budgétaires.',
    7000.00, 0.00, 0.00, 7000.00,
    'Paiement 30 jours', 'Import avec dédouanement',
    CURRENT_TIMESTAMP - INTERVAL '20 days', 3
);

-- Cotation 12: ACCEPTÉE - Liée au Client 22 (Sousse Freight Solutions) - Commercial: Hatem Jlassi (ID 14)
INSERT INTO crm_quotes (
    quote_number, client_id, title, status,
    valid_until, sent_at, viewed_at, accepted_at,
    client_name, client_company, client_email, client_phone, client_address,
    country, client_type, terms, payment_method,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-012', 22, 'Cotation Livraison Quotidienne Produits Frais', 'accepted',
    CURRENT_DATE + INTERVAL '60 days',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    'Ahmed Ben Ali', 'Sousse Freight Solutions', 'contact@soussfreight.tn', '+216 73 012 345',
    '846 Avenue Habib Bourguiba, 4934 Sfax, Tunisie',
    'Tunisie', 'Client', 'DDP', 'Virement bancaire',
    20700.00, 19.00, 3933.00, 24633.00,
    'Paiement mensuel (30 jours)', 'Livraison quotidienne 30 jours',
    CURRENT_TIMESTAMP - INTERVAL '12 days', 14
);

-- ==========================================
-- ÉTAPE 3: INSERTION DES LIGNES DE COTATION
-- ==========================================

-- Cotation 1 (QUO-2025-001) - Transport matériaux
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, weight_kg, vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(1, 'Transport matériaux construction - Camion 19T', 'freight',
    'Radès', 'TUN', 'Tunis', 'TUN',
    25.00, 18000.00, 'truck_19t', 'scheduled_delivery',
    4, 1800.00, 1200.00, 1800.00, 7200.00, 2400.00, 1),
(1, 'Service grue chargement/déchargement', 'freight',
    'Radès', 'TUN', 'Tunis', 'TUN',
    NULL, NULL, NULL, 'packaging',
    4, 500.00, 300.00, 500.00, 2000.00, 800.00, 2),
(1, 'Assurance marchandise (valeur déclarée)', 'freight',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'insurance',
    1, 800.00, 500.00, 800.00, 800.00, 300.00, 3);

-- Cotation 2 (QUO-2025-002) - Transport pharmaceutique
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(2, 'Livraison express 24h - Camion frigorifique 3.5T', 'express',
    'Tunis', 'TUN', 'National', 'TUN',
    NULL, 'van', 'express_delivery',
    20, 450.00, 280.00, 450.00, 9000.00, 3400.00, 1),
(2, 'Suivi GPS temps réel et contrôle température', 'express',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL,
    20, 100.00, 60.00, 100.00, 2000.00, 800.00, 2),
(2, 'Emballage isotherme et blocs réfrigérants', 'express',
    NULL, NULL, NULL, NULL,
    NULL, NULL, 'packaging',
    20, 75.00, 45.00, 75.00, 1500.00, 600.00, 3);

-- Cotation 3 (QUO-2025-003) - Distribution agricole
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, weight_kg, vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(3, 'Distribution hebdomadaire - Camion 12T réfrigéré', 'standard',
    'Sousse', 'TUN', 'Région Centre', 'TUN',
    120.00, 11000.00, 'truck_12t', 'scheduled_delivery',
    4, 1800.00, 1200.00, 1800.00, 7200.00, 2400.00, 1),
(3, 'Livraison multi-points (5 destinations)', 'standard',
    'Sousse', 'TUN', 'Région Centre', 'TUN',
    NULL, NULL, NULL, 'door_to_door',
    4, 200.00, 120.00, 200.00, 800.00, 320.00, 2);

-- Cotation 4 (QUO-2025-004) - Transport équipements (rejetée)
INSERT INTO crm_quote_items (
    quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, weight_kg, vehicle_type, service_type,
    quantity, unit_price, purchase_price, selling_price, total_price, margin, line_order
) VALUES
(4, 'Transport équipement industriel lourd - Semi-remorque', 'freight',
    'Sfax', 'TUN', 'Tunis', 'TUN',
    270.00, 24000.00, 'semi_trailer', 'pickup_delivery',
    1, 4500.00, 3000.00, 4500.00, 4500.00, 1500.00, 1),
(4, 'Arrimage et sécurisation charge', 'freight',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'packaging',
    1, 1000.00, 600.00, 1000.00, 1000.00, 400.00, 2);

-- Cotation 5 (QUO-2025-005) - Transport électronique
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

-- Cotation 6 (QUO-2025-006) - Déménagement industriel
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

-- Cotation 7 (QUO-2025-007) - Transport automobile
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

-- Cotation 8 (QUO-2025-008) - Messagerie express
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

-- Cotation 9 (QUO-2025-009) - Transport chimique
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

-- Cotation 10 (QUO-2025-010) - Transport textile (expirée)
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

-- Cotation 11 (QUO-2025-011) - Import alimentaire (annulée)
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

-- Cotation 12 (QUO-2025-012) - Livraison quotidienne (acceptée)
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
-- ÉTAPE 4: VÉRIFICATION FINALE
-- ==========================================

-- Vue complète des cotations
SELECT 
    q.id,
    q.quote_number AS "Cotation",
    q.status AS "Statut",
    COALESCE(l.full_name, o.title, c.nom) AS "Source",
    CASE 
        WHEN q.lead_id IS NOT NULL THEN 'Prospect'
        WHEN q.opportunity_id IS NOT NULL THEN 'Opportunité'
        WHEN q.client_id IS NOT NULL THEN 'Client'
        ELSE 'N/A'
    END AS "Type Source",
    p.prenom || ' ' || p.nom AS "Commercial",
    COUNT(qi.id) AS "Nb Lignes",
    COALESCE(SUM(qi.total_price), 0) AS "CA",
    COALESCE(SUM(qi.margin), 0) AS "Marge",
    q.total AS "Total TTC"
FROM crm_quotes q
LEFT JOIN crm_leads l ON q.lead_id = l.id
LEFT JOIN crm_opportunities o ON q.opportunity_id = o.id
LEFT JOIN client c ON q.client_id = c.id
LEFT JOIN personnel p ON q.created_by = p.id
LEFT JOIN crm_quote_items qi ON qi.quote_id = q.id
GROUP BY q.id, q.quote_number, q.status, l.full_name, o.title, c.nom, p.prenom, p.nom, q.total
ORDER BY q.id;

-- ==========================================
-- FIN DU SCRIPT
-- ==========================================

/*
📊 RÉSUMÉ DES COTATIONS CRÉÉES
==============================

1. QUO-2025-001: BROUILLON - Prospect (SOTUVER) - Commercial: Bassem Sassi
2. QUO-2025-002: ENVOYÉE - Prospect (AgriTech) - Commercial: Hatem Jlassi
3. QUO-2025-003: ACCEPTÉE - Client (GafsaTransport) - Commercial: Bassem Sassi
4. QUO-2025-004: REJETÉE + EXPIRÉE - Opportunité 5 - Commercial: Hatem Jlassi
5. QUO-2025-005: ACCEPTÉE - Client (Mediterranean Transport) - Commercial: Bassem Sassi
6. QUO-2025-006: ENVOYÉE - Client (Logistique Sahel) - Commercial: Hatem Jlassi
7. QUO-2025-007: CONSULTÉE - Client (Kairouan Transport) - Commercial: Bassem Sassi
8. QUO-2025-008: ACCEPTÉE - Client (Nabeul Logistics) - Commercial: Hatem Jlassi
9. QUO-2025-009: BROUILLON - Prospect (ChemCorp) - Commercial: Bassem Sassi
10. QUO-2025-010: EXPIRÉE - Client (Monastir Shipping) - Commercial: Hatem Jlassi
11. QUO-2025-011: ANNULÉE - Client International (Iberian Logistics) - Commercial: Bassem Sassi
12. QUO-2025-012: ACCEPTÉE - Client (Sousse Freight) - Commercial: Hatem Jlassi

✅ Toutes les cotations ont:
- Des liens vers prospects/opportunités/clients
- Un commercial assigné (created_by)
- Des lignes de cotation avec prix réalistes
- Des marges entre 20-40%
- Des totaux avec TVA 19% (sauf client international)
*/
