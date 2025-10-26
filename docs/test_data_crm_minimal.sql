-- ==========================================
-- DONNÉES DE TEST MINIMALES - CRM VELOSI
-- ==========================================
-- Ce script insère des données de test minimales dans toutes les tables CRM
-- pour effectuer des tests fonctionnels complets
-- Date: 24 octobre 2025
-- ==========================================

-- ==========================================
-- 1. SUPPRESSION DES DONNÉES EXISTANTES
-- ==========================================

DELETE FROM crm_activity_participants;
DELETE FROM crm_activities;
DELETE FROM crm_quote_items;
DELETE FROM crm_quotes;
DELETE FROM crm_opportunities;
DELETE FROM crm_leads;
DELETE FROM crm_pipeline_stages;
DELETE FROM crm_pipelines;
DELETE FROM crm_tags;
DELETE FROM engin WHERE id <= 20; -- Supprimer les engins de test

-- Réinitialiser les séquences
ALTER SEQUENCE crm_leads_id_seq RESTART WITH 1;
ALTER SEQUENCE crm_opportunities_id_seq RESTART WITH 1;
ALTER SEQUENCE crm_quotes_id_seq RESTART WITH 1;
ALTER SEQUENCE crm_quote_items_id_seq RESTART WITH 1;
ALTER SEQUENCE crm_activities_id_seq RESTART WITH 1;
ALTER SEQUENCE crm_activity_participants_id_seq RESTART WITH 1;
ALTER SEQUENCE crm_pipelines_id_seq RESTART WITH 1;
ALTER SEQUENCE crm_pipeline_stages_id_seq RESTART WITH 1;
ALTER SEQUENCE crm_tags_id_seq RESTART WITH 1;
ALTER SEQUENCE engin_id_seq RESTART WITH 1;

-- ==========================================
-- 2. INSERTION ENGINS DE TEST
-- ==========================================

INSERT INTO engin (id, libelle, conteneur_remorque, poids_vide, pied, description, is_active) VALUES
(1, 'CONTENEUR 20'' VIDE', 'Conteneur', 2000.00, '20', 'Conteneur standard 20 pieds vide', true),
(2, 'CONTENEUR 40'' VIDE', 'Conteneur', 3800.00, '40', 'Conteneur standard 40 pieds vide', true),
(3, 'CONTENEUR 40'' HIGH CUBE', 'Conteneur', 4100.00, '40', 'Conteneur 40 pieds High Cube (plus haut)', true),
(4, 'REMORQUE PLATEAU 20''', 'Remorque', 4800.00, '20', 'Remorque plateau adaptée pour conteneur 20 pieds', true),
(5, 'REMORQUE PLATEAU 40''', 'Remorque', 6200.00, '40', 'Remorque plateau adaptée pour conteneur 40 pieds', true),
(6, 'REMORQUE CITERNE', 'Remorque', 7500.00, NULL, 'Remorque citerne pour le transport de liquides', true),
(7, 'CONTENEUR FRIGORIFIQUE 40''', 'Conteneur', 4500.00, '40', 'Conteneur frigorifique (reefer) 40 pieds', true),
(8, 'REMORQUE BENNE', 'Remorque', 6800.00, NULL, 'Remorque benne pour le transport de matériaux en vrac', true),
(9, 'CONTENEUR OPEN TOP 20''', 'Conteneur', 2300.00, '20', 'Conteneur 20 pieds à toit ouvert pour cargaisons spéciales', true),
(10, 'REMORQUE SURBAISSÉE', 'Remorque', 8500.00, NULL, 'Remorque surbaissée pour le transport d''engins lourds', true),
(11, 'CONTENEUR 45'' HIGH CUBE', 'Conteneur', 4800.00, '45', 'Conteneur 45 pieds High Cube grande capacité', true),
(12, 'REMORQUE PORTE-BOBINES', 'Remorque', 7200.00, NULL, 'Remorque spécialement conçue pour le transport de bobines', true),
(13, 'CONTENEUR RÉSERVOIR 20''', 'Conteneur', 3400.00, '20', 'Conteneur-citerne pour produits liquides', true),
(14, 'REMORQUE PORTE-VOITURES', 'Remorque', 6400.00, NULL, 'Remorque à étages pour transport de véhicules', true),
(15, 'CONTENEUR À PLANCHER MOBILE 40''', 'Conteneur', 4200.00, '40', 'Conteneur 40 pieds avec plancher mobile pour chargement facilité', true),
(16, 'REMORQUE FOURGON', 'Remorque', 7000.00, NULL, 'Remorque fermée pour transport de marchandises générales', true),
(17, 'CONTENEUR ISOTHERME 20''', 'Conteneur', 2600.00, '20', 'Conteneur 20 pieds isotherme pour produits sensibles', true),
(18, 'REMORQUE PORTE-CONTENEUR TRIPLE', 'Remorque', 8900.00, NULL, 'Remorque multi-conteneurs (jusqu''à 3 conteneurs 20'')', true),
(19, 'CONTENEUR SPÉCIAL MATIÈRES DANGEREUSES', 'Conteneur', 3600.00, '20', 'Conteneur renforcé pour le transport de matières dangereuses', true),
(20, 'REMORQUE EXTENSIBLE', 'Remorque', 8800.00, NULL, 'Remorque extensible pour charges longues', true);

-- ==========================================
-- 3. INSERTION PIPELINE PAR DÉFAUT
-- ==========================================

INSERT INTO crm_pipelines (id, name, description, is_default, is_active, created_by, created_at) VALUES
(1, 'Pipeline Standard Transport', 'Pipeline par défaut pour les opportunités de transport et logistique', true, true, 2, CURRENT_TIMESTAMP);

-- ==========================================
-- 4. INSERTION ÉTAPES DU PIPELINE
-- ==========================================

INSERT INTO crm_pipeline_stages (pipeline_id, name, description, color, stage_order, probability, stage_enum) VALUES
(1, 'Prospection', 'Identification et premier contact', '#17a2b8', 1, 10, 'prospecting'),
(1, 'Qualification', 'Validation du besoin et du budget', '#ffc107', 2, 25, 'qualification'),
(1, 'Analyse des besoins', 'Étude détaillée des besoins transport', '#0dcaf0', 3, 50, 'needs_analysis'),
(1, 'Proposition', 'Élaboration et envoi de la cotation', '#0d6efd', 4, 75, 'proposal'),
(1, 'Négociation', 'Négociation des conditions', '#e83e8c', 5, 90, 'negotiation'),
(1, 'Gagné', 'Opportunité convertie en client', '#28a745', 6, 100, 'closed_won'),
(1, 'Perdu', 'Opportunité perdue', '#dc3545', 7, 0, 'closed_lost');

-- ==========================================
-- 5. INSERTION TAGS
-- ==========================================

INSERT INTO crm_tags (name, color, category) VALUES
('Transport National', '#28a745', 'lead'),
('Transport International', '#17a2b8', 'lead'),
('Logistique', '#ffc107', 'lead'),
('Client VIP', '#fd7e14', 'opportunity'),
('Urgent', '#dc3545', 'general'),
('Suivi Régulier', '#6f42c1', 'general');

-- ==========================================
-- 6. INSERTION PROSPECTS (LEADS) - 20 LIGNES
-- ==========================================

-- Lead 1: Nouveau prospect (NEW) - Bassem Sassi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, website, industry, employee_count,
    source, status, priority, transport_needs, annual_volume, current_provider,
    street, city, postal_code, country, is_local,
    assigned_to, estimated_value, tags, notes,
    last_contact_date, next_followup_date,
    created_at, created_by
) VALUES (
    'Mohamed Ben Salah', 'contact@sotuver.tn', '+216 71 234 567', 
    'SOTUVER', 'Directeur Logistique', 'www.sotuver.tn', 'Textile', 150,
    'website', 'new', 'medium', 
    ARRAY['national', 'international'], 250000.00, 'FedEx Tunisia',
    'Zone Industrielle Mghira', 'Monastir', '5000', 'TUN', true,
    3, 50000.00, ARRAY['Transport International', 'Logistique'], 
    'Premier contact via formulaire web. Intéressé par transport conteneurs vers Europe.',
    NULL, CURRENT_TIMESTAMP + INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day', 2
);

-- Lead 2: Contacté (CONTACTED) - Salim Dhaoui
INSERT INTO crm_leads (
    full_name, email, phone, company, position, website, industry, employee_count,
    source, status, priority, transport_needs, annual_volume, current_provider,
    street, city, postal_code, country, is_local,
    assigned_to, estimated_value, tags, notes,
    last_contact_date, next_followup_date,
    created_at, created_by
) VALUES (
    'Amina Kacem', 'a.kacem@freshproduce.tn', '+216 25 987 654', 
    'Fresh Produce Distribution', 'Directrice Commerciale', 'www.freshproduce.tn', 'Distribution', 60,
    'email', 'contacted', 'medium', 
    ARRAY['national'], 90000.00, 'Transports Rapides',
    'Avenue de la Liberté', 'Béja', '9000', 'TUN', true,
    4, 35000.00, ARRAY['Transport National'], 
    'Contact email effectué. Intéressée par distribution produits frais région Nord.',
    CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '9 days', 2
);

-- Lead 3: Qualifié (QUALIFIED) - Fares Agrebi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, website, industry, employee_count,
    source, status, priority, transport_needs, annual_volume, current_provider, contract_end_date,
    street, city, postal_code, country, is_local,
    assigned_to, estimated_value, tags, notes,
    last_contact_date, next_followup_date, qualified_date,
    created_at, created_by
) VALUES (
    'Ahmed Trabelsi', 'a.trabelsi@pharmalog.tn', '+216 98 123 456', 
    'PharmaLog Tunisia', 'Directeur Général', 'www.pharmalog.tn', 'Pharmaceutique', 200,
    'trade_show', 'qualified', 'urgent', 
    ARRAY['national', 'international', 'express'], 500000.00, 'TNT Express', '2025-12-31',
    'Rue de la Liberté', 'Tunis', '1002', 'TUN', false,
    8, 150000.00, ARRAY['Transport International', 'Client VIP', 'Urgent'], 
    'Prospect très qualifié. Budget confirmé. Besoin urgent de remplacer prestataire actuel. Contrat actuel expire fin 2025.',
    CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days', 2
);

-- Lead 4: En maturation (NURTURING) - Sofien Hammami
INSERT INTO crm_leads (
    full_name, email, phone, company, position, website, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    street, city, postal_code, country, is_local,
    assigned_to, estimated_value, tags, notes,
    last_contact_date, next_followup_date,
    created_at, created_by
) VALUES (
    'Sonia Gharbi', 's.gharbi@electrotech.tn', '+216 52 345 678', 
    'ElectroTech Industries', 'Chef de Projet', 'www.electrotech.tn', 'Électronique', 120,
    'cold_call', 'nurturing', 'low', 
    ARRAY['national'], 80000.00,
    'Avenue Habib Bourguiba', 'Sfax', '3000', 'TUN', true,
    10, 25000.00, ARRAY['Transport National', 'Suivi Régulier'], 
    'Pas de besoin immédiat. Intéressé pour Q2 2026. Maintenir contact régulier.',
    CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP + INTERVAL '30 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days', 2
);

-- Lead 5: Converti (CONVERTED) - Mehdi Riahi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, website, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    street, city, postal_code, country, is_local,
    assigned_to, estimated_value, tags, notes,
    last_contact_date, qualified_date, converted_date,
    created_at, created_by
) VALUES (
    'Karim Bennour', 'k.bennour@construbat.tn', '+216 70 456 789', 
    'ConstruBat', 'Directeur Achats', 'www.construbat.tn', 'Construction', 300,
    'partner', 'converted', 'high', 
    ARRAY['national', 'freight'], 350000.00,
    'Zone Industrielle Ben Arous', 'Ben Arous', '2013', 'TUN', true,
    14, 120000.00, ARRAY['Transport National', 'Logistique'], 
    'Prospect converti en opportunité. Besoin transport matériaux construction.',
    CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '30 days', 2
);

-- Lead 6: Non qualifié (UNQUALIFIED) - Bassem Sassi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, source, status, priority, transport_needs,
    street, city, postal_code, country, is_local, assigned_to, estimated_value, notes,
    last_contact_date, created_at, created_by
) VALUES (
    'Nadia Slim', 'n.slim@petitcommerce.tn', '+216 55 234 567', 
    'Petit Commerce SARL', 'Gérante', 'cold_call', 'unqualified', 'low', 
    ARRAY['national'], 'Rue Mongi Slim', 'Kairouan', '3100', 'TUN', true,
    3, 5000.00, 'Pas de budget transport. Utilise véhicules personnels.',
    CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '12 days', 2
);

-- Lead 7: Nouveau (NEW) - Fares Agrebi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, website, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    street, city, postal_code, country, is_local, assigned_to, estimated_value,
    next_followup_date, created_at, created_by
) VALUES (
    'Hichem Mahjoub', 'h.mahjoub@techpro.tn', '+216 98 345 678', 
    'TechPro Industries', 'Responsable Logistique', 'www.techpro.tn', 'Technologie', 180,
    'website', 'new', 'medium', ARRAY['national', 'international'], 200000.00,
    'Zone Industrielle', 'Bizerte', '7000', 'TUN', true,
    8, 60000.00, CURRENT_TIMESTAMP + INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '6 hours', 2
);

-- Lead 8: Contacté (CONTACTED) - Sofien Hammami
INSERT INTO crm_leads (
    full_name, email, phone, company, position, website, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    street, city, postal_code, country, is_local, assigned_to, estimated_value, notes,
    last_contact_date, next_followup_date, created_at, created_by
) VALUES (
    'Samia Khelifi', 's.khelifi@cosmetica.tn', '+216 22 456 789', 
    'Cosmetica Tunisia', 'Directrice Commerciale', 'www.cosmetica.tn', 'Cosmétique', 95,
    'referral', 'contacted', 'high', ARRAY['international', 'express'], 180000.00,
    'Avenue de la République', 'La Marsa', '2078', 'TUN', false,
    10, 80000.00, 'Intéressée par transport express vers pays du Golfe.',
    CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '8 days', 2
);

-- Lead 9: Qualifié (QUALIFIED) - Bassem Sassi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, website, industry, employee_count,
    source, status, priority, transport_needs, annual_volume, current_provider, contract_end_date,
    street, city, postal_code, country, is_local, assigned_to, estimated_value, notes,
    last_contact_date, qualified_date, next_followup_date, created_at, created_by
) VALUES (
    'Riadh Trabelsi', 'r.trabelsi@foodexport.tn', '+216 71 567 890', 
    'Food Export SA', 'PDG', 'www.foodexport.tn', 'Agroalimentaire', 250,
    'trade_show', 'qualified', 'urgent', 
    ARRAY['international', 'freight'], 600000.00, 'Agility Logistics', '2025-11-30',
    'Route de Tunis', 'Grombalia', '8030', 'TUN', false,
    3, 200000.00, 'Budget confirmé. Veut changer de prestataire. Export huile olive vers Europe.',
    CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '18 days', 2
);

-- Lead 10: En maturation (NURTURING) - Salim Dhaoui
INSERT INTO crm_leads (
    full_name, email, phone, company, position, source, status, priority, transport_needs,
    street, city, postal_code, country, is_local, assigned_to, estimated_value, notes,
    last_contact_date, next_followup_date, created_at, created_by
) VALUES (
    'Fatma Bouazizi', 'f.bouazizi@artisanat.tn', '+216 26 678 901', 
    'Artisanat Tunisien', 'Responsable Export', 'social_media', 'nurturing', 'low', 
    ARRAY['international'], 'Medina', 'Tunis', '1001', 'TUN', false,
    4, 30000.00, 'Projet export pour 2026. Maintenir contact régulier.',
    CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP + INTERVAL '45 days',
    CURRENT_TIMESTAMP - INTERVAL '25 days', 2
);

-- Lead 11: Nouveau (NEW) - Mehdi Riahi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, source, status, priority, transport_needs, annual_volume,
    street, city, postal_code, country, is_local, assigned_to, estimated_value,
    next_followup_date, created_at, created_by
) VALUES (
    'Slim Jebali', 's.jebali@metalindustrie.tn', '+216 73 123 456', 
    'Metal Industrie', 'Chef Projet', 'email', 'new', 'medium', 
    ARRAY['national', 'freight'], 150000.00,
    'Zone Industrielle', 'Sousse', '4000', 'TUN', true,
    14, 45000.00, CURRENT_TIMESTAMP + INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '3 hours', 2
);

-- Lead 12: Perdu (LOST) - Fares Agrebi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, source, status, priority, transport_needs,
    street, city, postal_code, country, is_local, assigned_to, estimated_value, notes,
    last_contact_date, created_at, created_by
) VALUES (
    'Mounir Gharbi', 'm.gharbi@quickstore.tn', '+216 54 789 012', 
    'QuickStore', 'Manager', 'phone', 'lost', 'low', 
    ARRAY['national'], 'Centre Ville', 'Nabeul', '8000', 'TUN', true,
    8, 8000.00, 'A choisi un concurrent local. Prix trop élevé.',
    CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '20 days', 2
);

-- Lead 13: CLIENT (converti et cotation acceptée) - Sofien Hammami
INSERT INTO crm_leads (
    full_name, email, phone, company, position, website, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    street, city, postal_code, country, is_local, assigned_to, estimated_value, notes,
    last_contact_date, qualified_date, converted_date, created_at, created_by
) VALUES (
    'Leila Jemni', 'l.jemni@agritech.tn', '+216 29 876 543', 
    'AgriTech Solutions', 'Responsable Supply Chain', 'www.agritech-tn.com', 'Agriculture', 80,
    'referral', 'client', 'high', ARRAY['national', 'express'], 180000.00,
    'Route Touristique', 'Sousse', '4000', 'TUN', true,
    10, 95000.00, 'Client actif suite acceptation cotation QUO-2025-003.',
    CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '30 days', 2
);

-- Lead 14: Contacté (CONTACTED) - Bassem Sassi - Données récentes pour graphiques
INSERT INTO crm_leads (
    full_name, email, phone, company, position, source, status, priority, transport_needs, annual_volume,
    street, city, postal_code, country, is_local, assigned_to, estimated_value, notes,
    last_contact_date, next_followup_date, created_at, created_by
) VALUES (
    'Youssef Hamdi', 'y.hamdi@mobilier.tn', '+216 99 234 567', 
    'Mobilier Design', 'Directeur', 'website', 'contacted', 'medium', 
    ARRAY['national'], 120000.00,
    'Avenue Bourguiba', 'Sfax', '3000', 'TUN', true,
    3, 40000.00, 'Premier contact effectué. Besoins transport meubles.',
    CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days', 2
);

-- Lead 15: Qualifié (QUALIFIED) - Salim Dhaoui - Données récentes
INSERT INTO crm_leads (
    full_name, email, phone, company, position, website, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    street, city, postal_code, country, is_local, assigned_to, estimated_value, notes,
    last_contact_date, qualified_date, next_followup_date, created_at, created_by
) VALUES (
    'Ines Mejri', 'i.mejri@pharmadistrib.tn', '+216 20 345 678', 
    'Pharma Distrib', 'Directrice Logistique', 'www.pharmadistrib.tn', 'Pharmaceutique', 150,
    'email', 'qualified', 'urgent', ARRAY['national', 'express'], 280000.00,
    'Zone Industrielle', 'Ariana', '2080', 'TUN', true,
    4, 110000.00, 'Budget validé. Besoin urgent transport température contrôlée.',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '10 days', 2
);

-- Lead 6: Nouveau (NEW) - Bassem Sassi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value,
    created_at, created_by
) VALUES (
    'Nabil Ferchichi', 'n.ferchichi@technopack.tn', '+216 22 567 890', 
    'TechnoPack', 'Responsable Logistique', 'Emballage', 60,
    'website', 'new', 'low', ARRAY['national'], 95000.00,
    'Sousse', 'TUN', true, 3, 35000.00,
    CURRENT_TIMESTAMP - INTERVAL '2 hours', 2
);

-- Lead 7: Contacté (CONTACTED) - Salim Dhaoui
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value, last_contact_date,
    created_at, created_by
) VALUES (
    'Fatma Cherif', 'f.cherif@medtech.tn', '+216 98 234 567', 
    'MedTech Solutions', 'Directeur Commercial', 'Dispositifs médicaux', 95,
    'email', 'contacted', 'medium', ARRAY['international', 'express'], 280000.00,
    'Tunis', 'TUN', false, 4, 85000.00, CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '12 days', 2
);

-- Lead 8: Nouveau (NEW) - Fares Agrebi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value,
    created_at, created_by
) VALUES (
    'Youssef Mansour', 'contact@autoparts-tn.com', '+216 71 890 123', 
    'AutoParts Tunisia', 'CEO', 'Automobile', 180,
    'referral', 'new', 'high', ARRAY['international'], 420000.00,
    'Ariana', 'TUN', false, 8, 130000.00,
    CURRENT_TIMESTAMP - INTERVAL '6 hours', 2
);

-- Lead 9: Qualifié (QUALIFIED) - Sofien Hammami
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume, current_provider,
    city, country, is_local, assigned_to, estimated_value, 
    last_contact_date, qualified_date,
    created_at, created_by
) VALUES (
    'Samia Bouzid', 's.bouzid@cosmetica.tn', '+216 52 678 901', 
    'Cosmetica Tunisia', 'Responsable Export', 'Cosmétiques', 75,
    'trade_show', 'qualified', 'medium', ARRAY['international'], 310000.00, 'Aramex',
    'La Marsa', 'TUN', false, 10, 95000.00,
    CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '8 days',
    CURRENT_TIMESTAMP - INTERVAL '18 days', 2
);

-- Lead 10: Contacté (CONTACTED) - Mehdi Riahi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value, last_contact_date,
    created_at, created_by
) VALUES (
    'Hatem Jlassi', 'h.jlassi@foodcorp.tn', '+216 29 345 678', 
    'FoodCorp Tunisia', 'Directeur Supply Chain', 'Agroalimentaire', 250,
    'phone', 'contacted', 'high', ARRAY['national', 'express'], 560000.00,
    'Sfax', 'TUN', true, 14, 175000.00, CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '9 days', 2
);

-- Lead 11: Nouveau (NEW) - Bassem Sassi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value,
    created_at, created_by
) VALUES (
    'Rania Karoui', 'r.karoui@plastinov.tn', '+216 98 765 432', 
    'PlastInov', 'Chef de Projet Logistique', 'Plastiques', 110,
    'social_media', 'new', 'medium', ARRAY['national'], 145000.00,
    'Monastir', 'TUN', true, 3, 48000.00,
    CURRENT_TIMESTAMP - INTERVAL '5 hours', 2
);

-- Lead 12: Perdu (LOST) - Salim Dhaoui
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value,
    created_at, created_by
) VALUES (
    'Mehdi Agrebi', 'm.agrebi@steelworks.tn', '+216 71 456 789', 
    'Steel Works', 'Directeur Général', 'Métallurgie', 320,
    'cold_call', 'lost', 'low', ARRAY['freight'], 280000.00,
    'Bizerte', 'TUN', true, 4, 65000.00,
    CURRENT_TIMESTAMP - INTERVAL '45 days', 2
);

-- Lead 13: Non qualifié (UNQUALIFIED) - Fares Agrebi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value,
    created_at, created_by
) VALUES (
    'Ines Guesmi', 'i.guesmi@minilog.tn', '+216 55 123 456', 
    'MiniLog', 'Gérante', 'Transport', 8,
    'website', 'unqualified', 'low', ARRAY['national'], 15000.00,
    'Kairouan', 'TUN', true, 8, 5000.00,
    CURRENT_TIMESTAMP - INTERVAL '22 days', 2
);

-- Lead 14: Qualifié (QUALIFIED) - Sofien Hammami
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume, current_provider,
    city, country, is_local, assigned_to, estimated_value,
    last_contact_date, qualified_date,
    created_at, created_by
) VALUES (
    'Tarek Oueslati', 't.oueslati@petroserv.tn', '+216 97 890 123', 
    'PetroServ', 'Directeur Logistique', 'Pétrole et Gaz', 450,
    'partner', 'qualified', 'urgent', ARRAY['national', 'freight'], 780000.00, 'UPS',
    'Gabès', 'TUN', true, 10, 220000.00,
    CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '6 days',
    CURRENT_TIMESTAMP - INTERVAL '14 days', 2
);

-- Lead 15: Contacté (CONTACTED) - Mehdi Riahi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value, last_contact_date,
    created_at, created_by
) VALUES (
    'Olfa Hammami', 'o.hammami@biopharm.tn', '+216 22 456 789', 
    'BioPharma', 'Responsable Achats', 'Pharmaceutique', 135,
    'advertisement', 'contacted', 'high', ARRAY['express', 'international'], 385000.00,
    'Sousse', 'TUN', false, 14, 115000.00, CURRENT_TIMESTAMP - INTERVAL '6 days',
    CURRENT_TIMESTAMP - INTERVAL '16 days', 2
);

-- Lead 16: Nouveau (NEW) - Bassem Sassi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value,
    created_at, created_by
) VALUES (
    'Sami Dridi', 's.dridi@furnideco.tn', '+216 70 234 567', 
    'FurniDeco', 'Directeur Export', 'Mobilier', 95,
    'email', 'new', 'medium', ARRAY['international'], 195000.00,
    'Tunis', 'TUN', false, 3, 62000.00,
    CURRENT_TIMESTAMP - INTERVAL '1 day', 2
);

-- Lead 17: Nurturing (NURTURING) - Salim Dhaoui
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value, last_contact_date,
    created_at, created_by
) VALUES (
    'Wafa Bouaziz', 'w.bouaziz@techdev.tn', '+216 29 567 890', 
    'TechDev', 'COO', 'Technologies', 68,
    'referral', 'nurturing', 'low', ARRAY['express'], 125000.00,
    'Sfax', 'TUN', true, 4, 42000.00, CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '35 days', 2
);

-- Lead 18: Qualifié (QUALIFIED) - Fares Agrebi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume, current_provider,
    city, country, is_local, assigned_to, estimated_value,
    last_contact_date, qualified_date,
    created_at, created_by
) VALUES (
    'Chokri Slama', 'c.slama@ceramart.tn', '+216 98 345 678', 
    'CeramArt', 'Directeur Général', 'Céramique', 210,
    'trade_show', 'qualified', 'high', ARRAY['national', 'international'], 440000.00, 'DHL',
    'Nabeul', 'TUN', false, 8, 145000.00,
    CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '9 days',
    CURRENT_TIMESTAMP - INTERVAL '17 days', 2
);

-- Lead 19: Contacté (CONTACTED) - Sofien Hammami
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value, last_contact_date,
    created_at, created_by
) VALUES (
    'Amira Triki', 'a.triki@greenpack.tn', '+216 55 678 901', 
    'GreenPack', 'Responsable Logistique', 'Emballage Écologique', 52,
    'website', 'contacted', 'medium', ARRAY['national'], 165000.00,
    'Ben Arous', 'TUN', true, 10, 58000.00, CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '11 days', 2
);

-- Lead 20: Converti (CONVERTED) - Mehdi Riahi
INSERT INTO crm_leads (
    full_name, email, phone, company, position, industry, employee_count,
    source, status, priority, transport_needs, annual_volume,
    city, country, is_local, assigned_to, estimated_value,
    last_contact_date, qualified_date, converted_date,
    created_at, created_by
) VALUES (
    'Nizar Jendoubi', 'n.jendoubi@industrialmat.tn', '+216 71 678 901', 
    'Industrial Materials', 'Directeur Achats', 'Matériaux Industriels', 175,
    'partner', 'converted', 'high', ARRAY['freight', 'national'], 520000.00,
    'La Goulette', 'TUN', true, 14, 165000.00,
    CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '28 days', 2
);

-- ==========================================
-- 7. INSERTION OPPORTUNITÉS - 15 LIGNES
-- ==========================================

-- Opportunité 1: Qualification - Bassem Sassi - depuis Lead 5
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type, special_requirements,
    assigned_to, source, priority, tags,
    created_at, created_by
) VALUES (
    'Transport matériaux construction ConstruBat',
    'Besoin de transport régulier de matériaux de construction depuis le port de Radès vers différents chantiers.',
    5, 120000.00, 25, 'qualification',
    CURRENT_TIMESTAMP + INTERVAL '45 days',
    'Port de Radès, Radès 2040, TUN', 'Divers chantiers région Grand Tunis',
    'freight', 'weekly', 8, 
    'Transport de matériaux lourds (ciment, acier). Besoin de grues de chargement.',
    3, 'lead_conversion', 'high', ARRAY['Transport National', 'Client VIP'],
    CURRENT_TIMESTAMP - INTERVAL '1 day', 2
);

-- Opportunité 2: Analyse des besoins - Salim Dhaoui
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type, special_requirements,
    assigned_to, source, priority, tags,
    created_at, created_by
) VALUES (
    'Logistique produits pharmaceutiques PharmaLog',
    'Transport express de produits pharmaceutiques avec contrôle température entre Tunis et les pharmacies nationales.',
    3, 150000.00, 50, 'needs_analysis',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    'Tunis 1002, TUN', 'Réseau national pharmacies',
    'express', 'daily', 16, 
    'Température contrôlée 2-8°C. Suivi GPS temps réel. Livraison express 24h.',
    4, 'lead_conversion', 'urgent', ARRAY['Transport National', 'Client VIP', 'Urgent'],
    CURRENT_TIMESTAMP - INTERVAL '5 days', 2
);

-- Opportunité 3: Proposition - Fares Agrebi
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type, special_requirements,
    assigned_to, source, priority, tags,
    created_at, created_by
) VALUES (
    'Export conteneurs textile SOTUVER vers Europe',
    'Transport de conteneurs 40" HC de produits textiles depuis Monastir vers ports européens (Marseille, Gênes).',
    1, 180000.00, 75, 'proposal',
    CURRENT_TIMESTAMP + INTERVAL '20 days',
    'Monastir 5000, TUN', 'Ports européens (Marseille, Gênes)',
    'international', 'weekly', 3, 
    'Conteneurs 40" High Cube. Documents douaniers EUR1. Assurance marchandise.',
    8, 'lead_conversion', 'high', ARRAY['Transport International', 'Logistique'],
    CURRENT_TIMESTAMP - INTERVAL '15 days', 2
);

-- Opportunité 4: Négociation - Sofien Hammami
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type, special_requirements,
    assigned_to, source, priority, tags,
    created_at, created_by
) VALUES (
    'Distribution produits agricoles AgriTech',
    'Distribution hebdomadaire de produits agricoles depuis Sousse vers supermarchés région Centre.',
    2, 95000.00, 90, 'negotiation',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    'Sousse 4000, TUN', 'Supermarchés région Centre (Sousse, Monastir, Mahdia)',
    'standard', 'weekly', 7, 
    'Produits frais. Livraison tôt le matin. Température contrôlée.',
    10, 'lead_conversion', 'high', ARRAY['Transport National', 'Logistique'],
    CURRENT_TIMESTAMP - INTERVAL '25 days', 2
);

-- Opportunité 5: Perdue - Mehdi Riahi
INSERT INTO crm_opportunities (
    title, description, value, probability, stage,
    expected_close_date, actual_close_date,
    origin_address, destination_address,
    transport_type, service_frequency,
    assigned_to, source, priority,
    lost_reason, lost_to_competitor,
    created_at, created_by
) VALUES (
    'Transport équipements industriels ElectroTech',
    'Transport ponctuel d''équipements industriels lourds.',
    45000.00, 0, 'closed_lost',
    CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '3 days',
    'Sfax 3000, TUN', 'Tunis 1000, TUN',
    'freight', 'one_time',
    14, 'cold_call', 'medium',
    'Prix trop élevé. Client a choisi concurrent local avec tarif inférieur de 25%.', 'Trans-Maghreb Logistique',
    CURRENT_TIMESTAMP - INTERVAL '40 days', 2
);

-- Opportunité 6: Prospection - Bassem Sassi - depuis Lead 8
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type,
    assigned_to, source, priority,
    created_at, created_by
) VALUES (
    'Import pièces automobiles AutoParts',
    'Transport régulier de pièces détachées depuis ports européens vers Tunis.',
    8, 130000.00, 10, 'prospecting',
    CURRENT_TIMESTAMP + INTERVAL '60 days',
    'Ports européens', 'Ariana, TUN',
    'international', 'monthly', 3,
    8, 'lead_conversion', 'high',
    CURRENT_TIMESTAMP - INTERVAL '3 days', 2
);

-- Opportunité 7: Qualification - Salim Dhaoui - depuis Lead 7
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type, special_requirements,
    assigned_to, source, priority,
    created_at, created_by
) VALUES (
    'Export dispositifs médicaux MedTech',
    'Transport express de dispositifs médicaux vers l''Europe et le Moyen-Orient.',
    7, 85000.00, 25, 'qualification',
    CURRENT_TIMESTAMP + INTERVAL '50 days',
    'Tunis, TUN', 'Europe et Moyen-Orient',
    'express', 'weekly', 16, 
    'Emballage spécial. Suivi température. Livraison express 48h.',
    4, 'lead_conversion', 'medium',
    CURRENT_TIMESTAMP - INTERVAL '8 days', 2
);

-- Opportunité 8: Needs Analysis - Fares Agrebi - depuis Lead 9
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type,
    assigned_to, source, priority,
    created_at, created_by
) VALUES (
    'Export produits cosmétiques Cosmetica',
    'Distribution de produits cosmétiques vers réseaux internationaux.',
    9, 95000.00, 50, 'needs_analysis',
    CURRENT_TIMESTAMP + INTERVAL '35 days',
    'La Marsa, TUN', 'Marchés internationaux',
    'international', 'monthly', 2,
    8, 'lead_conversion', 'medium',
    CURRENT_TIMESTAMP - INTERVAL '14 days', 2
);

-- Opportunité 9: Proposal - Sofien Hammami - depuis Lead 14
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type, special_requirements,
    assigned_to, source, priority,
    created_at, created_by
) VALUES (
    'Transport produits pétroliers PetroServ',
    'Transport spécialisé de produits pétroliers et lubrifiants.',
    14, 220000.00, 75, 'proposal',
    CURRENT_TIMESTAMP + INTERVAL '25 days',
    'Gabès, TUN', 'Réseau national',
    'freight', 'weekly', 6,
    'Transport de matières dangereuses (ADR). Citernes certifiées.',
    10, 'lead_conversion', 'urgent',
    CURRENT_TIMESTAMP - INTERVAL '12 days', 2
);

-- Opportunité 10: Negotiation - Mehdi Riahi - depuis Lead 10
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type, special_requirements,
    assigned_to, source, priority,
    created_at, created_by
) VALUES (
    'Distribution agroalimentaire FoodCorp',
    'Livraison quotidienne de produits alimentaires vers supermarchés et restaurants.',
    10, 175000.00, 90, 'negotiation',
    CURRENT_TIMESTAMP + INTERVAL '15 days',
    'Sfax, TUN', 'Région Sud (Sfax, Gabès, Médenine)',
    'standard', 'daily', 7,
    'Produits frais et surgelés. Camions frigorifiques. Livraisons matinales.',
    14, 'lead_conversion', 'high',
    CURRENT_TIMESTAMP - INTERVAL '18 days', 2
);

-- Opportunité 11: Closed Won - Bassem Sassi - depuis Lead 20
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date, actual_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type,
    assigned_to, source, priority,
    created_at, created_by
) VALUES (
    'Transport matériaux industriels Industrial Materials',
    'Livraison de matériaux industriels depuis port Radès vers sites industriels.',
    20, 165000.00, 100, 'closed_won',
    CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day',
    'Port Radès, TUN', 'Sites industriels région Tunis',
    'freight', 'weekly', 8,
    3, 'lead_conversion', 'high',
    CURRENT_TIMESTAMP - INTERVAL '26 days', 2
);

-- Opportunité 12: Closed Lost - Salim Dhaoui
INSERT INTO crm_opportunities (
    title, description, value, probability, stage,
    expected_close_date, actual_close_date,
    transport_type, service_frequency,
    assigned_to, source, priority,
    lost_reason, lost_to_competitor,
    created_at, created_by
) VALUES (
    'Transport express petit volume',
    'Besoin ponctuel de transport express pour petits colis.',
    18000.00, 0, 'closed_lost',
    CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '18 days',
    'express', 'one_time',
    4, 'inbound', 'low',
    'Volume trop faible pour notre capacité. Client redirigé vers service express spécialisé.', 'Aramex',
    CURRENT_TIMESTAMP - INTERVAL '55 days', 2
);

-- Opportunité 13: Qualification - Fares Agrebi - depuis Lead 18
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type,
    assigned_to, source, priority,
    created_at, created_by
) VALUES (
    'Export céramique CeramArt',
    'Transport conteneurs de produits céramiques vers marchés européens et africains.',
    18, 145000.00, 25, 'qualification',
    CURRENT_TIMESTAMP + INTERVAL '40 days',
    'Nabeul, TUN', 'Europe et Afrique',
    'international', 'monthly', 3,
    8, 'lead_conversion', 'high',
    CURRENT_TIMESTAMP - INTERVAL '16 days', 2
);

-- Opportunité 14: Needs Analysis - Sofien Hammami - depuis Lead 15
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type, special_requirements,
    assigned_to, source, priority,
    created_at, created_by
) VALUES (
    'Transport pharmaceutique BioPharma',
    'Livraison de produits pharmaceutiques avec contrôle température strict.',
    15, 115000.00, 50, 'needs_analysis',
    CURRENT_TIMESTAMP + INTERVAL '32 days',
    'Sousse, TUN', 'Réseau pharmacies national',
    'express', 'daily', 16,
    'Température 2-8°C. Validation GDP. Traçabilité complète.',
    10, 'lead_conversion', 'high',
    CURRENT_TIMESTAMP - INTERVAL '13 days', 2
);

-- Opportunité 15: Prospection - Mehdi Riahi - depuis Lead 19
INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage,
    expected_close_date,
    origin_address, destination_address,
    transport_type, service_frequency, engine_type,
    assigned_to, source, priority,
    created_at, created_by
) VALUES (
    'Distribution emballages écologiques GreenPack',
    'Livraison de solutions d''emballage écologique vers clients B2B.',
    19, 58000.00, 10, 'prospecting',
    CURRENT_TIMESTAMP + INTERVAL '55 days',
    'Ben Arous, TUN', 'Clients B2B région Tunis',
    'standard', 'weekly', 16,
    14, 'lead_conversion', 'medium',
    CURRENT_TIMESTAMP - INTERVAL '9 days', 2
);

-- ==========================================
-- 8. INSERTION COTATIONS (QUOTES) - 12 LIGNES
-- ==========================================

-- Cotation 1: Brouillon (DRAFT) - Pour Opportunité 1 - Bassem Sassi
INSERT INTO crm_quotes (
    quote_number, opportunity_id, lead_id, title, status,
    valid_until, client_name, client_company, client_email, client_phone, client_address,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms, terms_conditions, notes,
    created_at, created_by
) VALUES (
    'QUO-2025-001', 1, 5, 'Cotation Transport ConstruBat', 'draft',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    'Karim Bennour', 'ConstruBat', 'k.bennour@construbat.tn', '+216 70 456 789',
    'Zone Industrielle Ben Arous, Ben Arous 2013, TUN',
    10000.00, 19.00, 1900.00, 11900.00,
    'Paiement 30 jours fin de mois', 'Franco départ port Radès',
    'Conditions générales Velosi applicables. TVA 19% incluse.', 
    'Tarifs valables pour 12 mois. Révision possible selon évolution carburant.',
    CURRENT_TIMESTAMP - INTERVAL '2 hours', 3
);

-- Cotation 2: Envoyée (SENT) - Pour Opportunité 2 - Salim Dhaoui
INSERT INTO crm_quotes (
    quote_number, opportunity_id, lead_id, title, status,
    valid_until, sent_at,
    client_name, client_company, client_email, client_phone, client_address,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms, terms_conditions, notes,
    created_at, created_by
) VALUES (
    'QUO-2025-002', 2, 3, 'Cotation Transport Pharmaceutique PharmaLog', 'sent',
    CURRENT_TIMESTAMP + INTERVAL '25 days', CURRENT_TIMESTAMP - INTERVAL '3 days',
    'Ahmed Trabelsi', 'PharmaLog Tunisia', 'a.trabelsi@pharmalog.tn', '+216 98 123 456',
    'Rue de la Liberté, Tunis 1002, TUN',
    12500.00, 0.00, 0.00, 12500.00,
    'Paiement comptant à réception facture', 'Livraison express 24h',
    'TVA suspendue selon attestation client. Conditions générales Velosi applicables.',
    'Transport température contrôlée 2-8°C. Suivi GPS inclus.',
    CURRENT_TIMESTAMP - INTERVAL '5 days', 4
);

-- Cotation 3: Acceptée (ACCEPTED) - Pour Opportunité 4 - Sofien Hammami
INSERT INTO crm_quotes (
    quote_number, opportunity_id, lead_id, title, status,
    valid_until, sent_at, viewed_at, accepted_at,
    client_name, client_company, client_email, client_phone, client_address,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms, terms_conditions, notes,
    created_at, created_by
) VALUES (
    'QUO-2025-003', 4, 2, 'Cotation Distribution AgriTech', 'accepted',
    CURRENT_TIMESTAMP + INTERVAL '20 days', 
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    'Leila Jemni', 'AgriTech Solutions', 'l.jemni@agritech.tn', '+216 29 876 543',
    'Route Touristique, Sousse 4000, TUN',
    8000.00, 19.00, 1520.00, 9520.00,
    'Paiement 45 jours fin de mois', 'Départ Sousse tous les lundis 6h00',
    'Conditions générales Velosi applicables. TVA 19% incluse.',
    'Livraisons hebdomadaires. Température contrôlée pour produits frais.',
    CURRENT_TIMESTAMP - INTERVAL '12 days', 10
);

-- Cotation 4: Rejetée (REJECTED) - Pour Opportunité 5 - Mehdi Riahi
INSERT INTO crm_quotes (
    quote_number, opportunity_id, title, status,
    valid_until, sent_at, viewed_at, rejected_at,
    client_name, client_company, client_email, client_phone, client_address,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms, rejection_reason,
    created_at, created_by
) VALUES (
    'QUO-2025-004', 5, 'Cotation Transport Équipements Industriels', 'rejected',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '18 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    'Sonia Gharbi', 'ElectroTech Industries', 's.gharbi@electrotech.tn', '+216 52 345 678',
    'Avenue Habib Bourguiba, Sfax 3000, TUN',
    5500.00, 19.00, 1045.00, 6545.00,
    'Paiement comptant', 'Franco départ',
    'Prix trop élevé par rapport à la concurrence. Client a choisi Trans-Maghreb avec tarif 25% inférieur.',
    CURRENT_TIMESTAMP - INTERVAL '25 days', 14
);

-- Cotation 5: Acceptée (ACCEPTED) - Pour Opportunité 11 - Bassem Sassi
INSERT INTO crm_quotes (
    quote_number, opportunity_id, lead_id, title, status,
    valid_until, sent_at, viewed_at, accepted_at,
    client_name, client_company, client_email, client_phone, client_address,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-005', 11, 20, 'Cotation Industrial Materials', 'accepted',
    CURRENT_TIMESTAMP + INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '6 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    'Nizar Jendoubi', 'Industrial Materials', 'n.jendoubi@industrialmat.tn', '+216 71 678 901',
    'La Goulette, TUN',
    13800.00, 19.00, 2622.00, 16422.00,
    'Paiement 30 jours', 'Départ port Radès',
    CURRENT_TIMESTAMP - INTERVAL '8 days', 3
);

-- Cotation 6: Envoyée (SENT) - Pour Opportunité 3 - Fares Agrebi
INSERT INTO crm_quotes (
    quote_number, opportunity_id, lead_id, title, status,
    valid_until, sent_at,
    client_name, client_company, client_email, client_phone, client_address,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-006', 3, 1, 'Cotation Export Textile SOTUVER', 'sent',
    CURRENT_TIMESTAMP + INTERVAL '22 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    'Mohamed Ben Salah', 'SOTUVER', 'contact@sotuver.tn', '+216 71 234 567',
    'Zone Industrielle Mghira, Monastir 5000, TUN',
    15000.00, 19.00, 2850.00, 17850.00,
    'Paiement à 60 jours', 'Incoterm FOB',
    CURRENT_TIMESTAMP - INTERVAL '14 days', 8
);

-- Cotation 7: Viewed (VIEWED) - Pour Opportunité 9 - Sofien Hammami
INSERT INTO crm_quotes (
    quote_number, opportunity_id, lead_id, title, status,
    valid_until, sent_at, viewed_at,
    client_name, client_company, client_email, client_phone, client_address,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms, notes,
    created_at, created_by
) VALUES (
    'QUO-2025-007', 9, 14, 'Cotation Transport PetroServ', 'viewed',
    CURRENT_TIMESTAMP + INTERVAL '28 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    'Tarek Oueslati', 'PetroServ', 't.oueslati@petroserv.tn', '+216 97 890 123',
    'Gabès, TUN',
    18500.00, 19.00, 3515.00, 22015.00,
    'Paiement 30 jours', 'Transport ADR certifié',
    'Transport matières dangereuses classe 3. Citernes certifiées ADR.',
    CURRENT_TIMESTAMP - INTERVAL '11 days', 10
);

-- Cotation 8: Envoyée (SENT) - Pour Opportunité 10 - Mehdi Riahi
INSERT INTO crm_quotes (
    quote_number, opportunity_id, lead_id, title, status,
    valid_until, sent_at,
    client_name, client_company, client_email, client_phone, client_address,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-008', 10, 10, 'Cotation Distribution FoodCorp', 'sent',
    CURRENT_TIMESTAMP + INTERVAL '18 days',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    'Hatem Jlassi', 'FoodCorp Tunisia', 'h.jlassi@foodcorp.tn', '+216 29 345 678',
    'Sfax, TUN',
    14600.00, 19.00, 2774.00, 17374.00,
    'Paiement 30 jours fin de mois', 'Livraisons quotidiennes dès 5h',
    CURRENT_TIMESTAMP - INTERVAL '17 days', 14
);

-- Cotation 9: Brouillon (DRAFT) - Pour Opportunité 7 - Salim Dhaoui
INSERT INTO crm_quotes (
    quote_number, opportunity_id, lead_id, title, status,
    valid_until,
    client_name, client_company, client_email, client_phone,
    subtotal, tax_rate, tax_amount, total,
    created_at, created_by
) VALUES (
    'QUO-2025-009', 7, 7, 'Cotation Export MedTech', 'draft',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    'Fatma Cherif', 'MedTech Solutions', 'f.cherif@medtech.tn', '+216 98 234 567',
    7100.00, 0.00, 0.00, 7100.00,
    CURRENT_TIMESTAMP - INTERVAL '1 day', 4
);

-- Cotation 10: Expirée (EXPIRED) - Ancienne cotation
INSERT INTO crm_quotes (
    quote_number, opportunity_id, title, status,
    valid_until, sent_at, viewed_at,
    client_name, client_company, client_email, client_phone,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-010', 12, 'Cotation Transport Express', 'expired',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    CURRENT_TIMESTAMP - INTERVAL '38 days',
    'Client Test', 'Test Company', 'test@test.tn', '+216 00 000 000',
    1500.00, 19.00, 285.00, 1785.00,
    'Paiement comptant', 'Express 24h',
    CURRENT_TIMESTAMP - INTERVAL '50 days', 4
);

-- Cotation 11: Cancelled (CANCELLED) - Cotation annulée
INSERT INTO crm_quotes (
    quote_number, opportunity_id, title, status,
    valid_until, sent_at,
    client_name, client_company, client_email, client_phone,
    subtotal, tax_rate, tax_amount, total,
    created_at, created_by
) VALUES (
    'QUO-2025-011', 8, 'Cotation Cosmetica (Annulée)', 'cancelled',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    'Samia Bouzid', 'Cosmetica Tunisia', 's.bouzid@cosmetica.tn', '+216 52 678 901',
    7900.00, 19.00, 1501.00, 9401.00,
    CURRENT_TIMESTAMP - INTERVAL '17 days', 8
);

-- Cotation 12: Acceptée (ACCEPTED) - Pour Opportunité 10 - Mehdi Riahi
INSERT INTO crm_quotes (
    quote_number, opportunity_id, lead_id, title, status,
    valid_until, sent_at, viewed_at, accepted_at,
    client_name, client_company, client_email, client_phone, client_address,
    subtotal, tax_rate, tax_amount, total,
    payment_terms, delivery_terms,
    created_at, created_by
) VALUES (
    'QUO-2025-012', 10, 10, 'Cotation FoodCorp - Version Finale', 'accepted',
    CURRENT_TIMESTAMP + INTERVAL '16 days',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    'Hatem Jlassi', 'FoodCorp Tunisia', 'h.jlassi@foodcorp.tn', '+216 29 345 678',
    'Sfax, TUN',
    14200.00, 19.00, 2698.00, 16898.00,
    'Paiement 30 jours', 'Livraisons quotidiennes',
    CURRENT_TIMESTAMP - INTERVAL '8 days', 14
);

-- ==========================================
-- 9. INSERTION LIGNES DE COTATION
-- ==========================================

-- Lignes pour Cotation 1 (QUO-2025-001) - Transport matériaux
INSERT INTO crm_quote_items (quote_id, description, category, 
    origin_city, origin_country, destination_city, destination_country,
    distance_km, weight_kg, vehicle_type, service_type,
    quantity, unit_price, total_price, line_order
) VALUES
(1, 'Transport matériaux construction - Camion 19T', 'freight',
    'Radès', 'TUN', 'Tunis', 'TUN',
    25.00, 18000.00, 'truck_19t', 'scheduled_delivery',
    4, 1800.00, 7200.00, 1),
(1, 'Service grue chargement/déchargement', 'freight',
    'Radès', 'TUN', 'Tunis', 'TUN',
    NULL, NULL, NULL, 'packaging',
    4, 500.00, 2000.00, 2),
(1, 'Assurance marchandise (valeur déclarée)', 'freight',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'insurance',
    1, 800.00, 800.00, 3);

-- Lignes pour Cotation 2 (QUO-2025-002) - Transport pharmaceutique
INSERT INTO crm_quote_items (quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, vehicle_type, service_type,
    quantity, unit_price, total_price, line_order
) VALUES
(2, 'Livraison express 24h - Camion frigorifique 3.5T', 'express',
    'Tunis', 'TUN', 'National', 'TUN',
    NULL, 'van', 'express_delivery',
    20, 450.00, 9000.00, 1),
(2, 'Suivi GPS temps réel et contrôle température', 'express',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL,
    20, 100.00, 2000.00, 2),
(2, 'Emballage isotherme et blocs réfrigérants', 'express',
    NULL, NULL, NULL, NULL,
    NULL, NULL, 'packaging',
    20, 75.00, 1500.00, 3);

-- Lignes pour Cotation 3 (QUO-2025-003) - Distribution agricole
INSERT INTO crm_quote_items (quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, weight_kg, vehicle_type, service_type,
    quantity, unit_price, total_price, line_order
) VALUES
(3, 'Distribution hebdomadaire - Camion 12T réfrigéré', 'standard',
    'Sousse', 'TUN', 'Région Centre', 'TUN',
    120.00, 11000.00, 'truck_12t', 'scheduled_delivery',
    4, 1800.00, 7200.00, 1),
(3, 'Livraison multi-points (5 destinations)', 'standard',
    'Sousse', 'TUN', 'Région Centre', 'TUN',
    NULL, NULL, NULL, 'door_to_door',
    4, 200.00, 800.00, 2);

-- Lignes pour Cotation 4 (QUO-2025-004) - Transport équipements (rejetée)
INSERT INTO crm_quote_items (quote_id, description, category,
    origin_city, origin_country, destination_city, destination_country,
    distance_km, weight_kg, vehicle_type, service_type,
    quantity, unit_price, total_price, line_order
) VALUES
(4, 'Transport équipement industriel lourd - Semi-remorque', 'freight',
    'Sfax', 'TUN', 'Tunis', 'TUN',
    270.00, 24000.00, 'semi_trailer', 'pickup_delivery',
    1, 4500.00, 4500.00, 1),
(4, 'Arrimage et sécurisation charge', 'freight',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, 'packaging',
    1, 1000.00, 1000.00, 2);

-- ==========================================
-- 10. INSERTION ACTIVITÉS - 25 LIGNES
-- ==========================================

-- Activité 1: Appel terminé - Lead 1 - Bassem Sassi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    lead_id, scheduled_at, completed_at, duration_minutes,
    assigned_to, created_by, outcome, next_steps, follow_up_date,
    tags, created_at
) VALUES (
    'call', 'Appel de qualification SOTUVER',
    'Premier contact téléphonique avec le directeur logistique pour comprendre les besoins en transport international.',
    'completed', 'medium',
    1, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', 30,
    3, 3, 
    'Contact très positif. Besoin confirmé de transport conteneurs vers Europe. Budget disponible. Intéressé par une présentation détaillée.',
    'Envoyer documentation commerciale. Planifier visite sur site.',
    CURRENT_TIMESTAMP + INTERVAL '5 days',
    ARRAY['Premier contact', 'Qualifié'],
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Activité 2: Réunion planifiée - Lead 2 - Salim Dhaoui
INSERT INTO crm_activities (
    type, title, description, status, priority,
    lead_id, scheduled_at, duration_minutes, location,
    assigned_to, created_by, next_steps,
    tags, created_at
) VALUES (
    'meeting', 'Présentation services AgriTech',
    'Réunion de présentation des services Velosi et analyse détaillée des besoins de distribution.',
    'scheduled', 'high',
    2, CURRENT_TIMESTAMP + INTERVAL '1 day', 60, 'AgriTech Solutions - Sousse',
    4, 4, 'Préparer présentation PowerPoint. Apporter brochures. Analyser volume mensuel.',
    ARRAY['Présentation', 'Important'],
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Activité 3: Email envoyé - Opportunité 2 - Salim Dhaoui
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, scheduled_at, completed_at, duration_minutes,
    assigned_to, created_by, outcome,
    tags, created_at
) VALUES (
    'email', 'Envoi cotation PharmaLog',
    'Envoi de la cotation détaillée pour le transport pharmaceutique avec conditions température contrôlée.',
    'completed', 'urgent',
    2, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days', 15,
    4, 4,
    'Cotation envoyée avec succès. Email accusé réception. Client doit étudier la proposition.',
    ARRAY['Cotation', 'Urgent'],
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- Activité 4: Visite client planifiée - Opportunité 3 - Fares Agrebi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, scheduled_at, duration_minutes, location, meeting_link,
    assigned_to, created_by, next_steps,
    tags, created_at
) VALUES (
    'visit', 'Visite site SOTUVER Monastir',
    'Visite du site de production textile pour évaluer les besoins logistiques et les contraintes de chargement conteneurs.',
    'scheduled', 'high',
    3, CURRENT_TIMESTAMP + INTERVAL '3 days', 120, 
    'SOTUVER - Zone Industrielle Mghira, Monastir 5000', NULL,
    8, 8, 
    'Évaluer zone de chargement. Prendre photos. Mesurer temps chargement. Discuter planning hebdomadaire.',
    ARRAY['Visite terrain', 'Important'],
    CURRENT_TIMESTAMP - INTERVAL '5 days'
);

-- Activité 5: Négociation en cours - Opportunité 4 - Sofien Hammami
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, quote_id, scheduled_at, duration_minutes, meeting_link,
    assigned_to, created_by, outcome, next_steps,
    tags, created_at
) VALUES (
    'negotiation', 'Négociation finale AgriTech',
    'Séance de négociation des conditions commerciales et signature du contrat.',
    'in_progress', 'urgent',
    4, 3, CURRENT_TIMESTAMP, 90, 
    'https://teams.microsoft.com/meeting/agritech-negotiation',
    10, 10,
    'Négociation en cours. Client souhaite un rabais de 5% sur le tarif proposé. Discussion sur les modalités de paiement.',
    'Obtenir validation direction pour rabais. Préparer contrat-cadre. Organiser réunion signature.',
    ARRAY['Négociation', 'Signature imminente', 'Urgent'],
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
);

-- Activité 6: Tâche - Préparation cotation - Opportunité 1 - Bassem Sassi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, due_date, duration_minutes,
    assigned_to, created_by, next_steps,
    tags, created_at
) VALUES (
    'task', 'Finaliser cotation ConstruBat',
    'Compléter la cotation avec les tarifs grues et assurances. Vérifier disponibilité camions 19T pour période demandée.',
    'in_progress', 'high',
    1, CURRENT_TIMESTAMP + INTERVAL '1 day', 60,
    3, 3,
    'Contacter fournisseur grues pour tarifs. Vérifier planning flotte. Calculer marges. Soumettre pour validation.',
    ARRAY['Cotation', 'À finaliser'],
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
);

-- Activité 7: Suivi post-acceptation - Opportunité 4 / Cotation 3 - Sofien Hammami
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, quote_id, scheduled_at, completed_at, duration_minutes,
    assigned_to, created_by, outcome, next_steps, follow_up_date,
    tags, created_at
) VALUES (
    'follow_up', 'Suivi post-acceptation AgriTech',
    'Appel de suivi suite à acceptation de la cotation pour confirmer les détails de démarrage du service.',
    'completed', 'high',
    4, 3, 
    CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', 20,
    10, 10,
    'Client confirme acceptation. Démarrage service prévu lundi prochain. A fourni liste des 5 points de livraison.',
    'Créer dossier client. Affecter chauffeur. Préparer tournée. Envoyer contrat pour signature.',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    ARRAY['Post-vente', 'Démarrage service'],
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Activité 8: Note interne - Opportunité 5 (perdue) - Mehdi Riahi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, scheduled_at, completed_at, duration_minutes,
    assigned_to, created_by, outcome,
    tags, created_at
) VALUES (
    'note', 'Analyse échec ElectroTech',
    'Note d''analyse sur la perte de l''opportunité ElectroTech Industries.',
    'completed', 'medium',
    5, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days', 10,
    14, 14,
    'Opportunité perdue face à Trans-Maghreb qui a proposé -25% sur nos tarifs. Notre tarif était de 6545 TND TTC, concurrent à 4900 TND TTC. Client très sensible au prix. Pas de possibilité de négociation. Opportunité de transport ponctuel donc marge faible. Leçon: mieux qualifier les one-shot sur critère prix.',
    ARRAY['Post-mortem', 'Analyse'],
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- Activité 9: Appel planifié - Lead 6 - Bassem Sassi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    lead_id, scheduled_at, duration_minutes,
    assigned_to, created_by, next_steps,
    tags, created_at
) VALUES (
    'call', 'Appel qualification TechnoPack',
    'Premier appel de qualification pour comprendre les besoins en transport.',
    'scheduled', 'medium',
    6, CURRENT_TIMESTAMP + INTERVAL '4 hours', 20,
    3, 3, 'Qualifier le besoin. Évaluer le volume. Proposer RDV si pertinent.',
    ARRAY['Qualification'],
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
);

-- Activité 10: Email envoyé - Opportunité 6 - Fares Agrebi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, scheduled_at, completed_at, duration_minutes,
    assigned_to, created_by, outcome,
    tags, created_at
) VALUES (
    'email', 'Envoi documentation AutoParts',
    'Envoi de la documentation commerciale et références clients.',
    'completed', 'high',
    6, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days', 15,
    8, 8, 'Documentation envoyée. Client a bien reçu et va étudier.',
    ARRAY['Documentation'],
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Activité 11: Démonstration planifiée - Opportunité 7 - Salim Dhaoui
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, scheduled_at, duration_minutes, location,
    assigned_to, created_by, next_steps,
    tags, created_at
) VALUES (
    'demo', 'Démonstration plateforme tracking MedTech',
    'Présentation de notre plateforme de suivi en temps réel pour dispositifs médicaux.',
    'scheduled', 'high',
    7, CURRENT_TIMESTAMP + INTERVAL '2 days', 45, 'MedTech Solutions - Tunis',
    4, 4, 'Préparer démo. Préparer ordinateur portable. Apporter documentation.',
    ARRAY['Démonstration', 'Important'],
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- Activité 12: Tâche - Préparation cotation - Opportunité 8 - Fares Agrebi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, due_date, duration_minutes,
    assigned_to, created_by, next_steps,
    tags, created_at
) VALUES (
    'task', 'Préparer cotation Cosmetica',
    'Finaliser la cotation pour l''export de produits cosmétiques.',
    'in_progress', 'medium',
    8, CURRENT_TIMESTAMP + INTERVAL '3 days', 90,
    8, 8, 'Obtenir tarifs douane. Calculer coûts transport international. Vérifier incoterms.',
    ARRAY['Cotation'],
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Activité 13: Rendez-vous - Opportunité 9 - Sofien Hammami
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, scheduled_at, duration_minutes, location,
    assigned_to, created_by, next_steps,
    tags, created_at
) VALUES (
    'appointment', 'RDV signature contrat PetroServ',
    'Rendez-vous pour finaliser et signer le contrat-cadre.',
    'scheduled', 'urgent',
    9, CURRENT_TIMESTAMP + INTERVAL '5 days', 60, 'Siège PetroServ - Gabès',
    10, 10, 'Préparer 2 exemplaires du contrat. Apporter cachet société. Confirmer présence DG.',
    ARRAY['Signature', 'Urgent'],
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Activité 14: Appel terminé - Lead 11 - Bassem Sassi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    lead_id, scheduled_at, completed_at, duration_minutes,
    assigned_to, created_by, outcome, follow_up_date,
    tags, created_at
) VALUES (
    'call', 'Appel PlastInov',
    'Contact téléphonique pour présenter nos services.',
    'completed', 'medium',
    11, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours', 25,
    3, 3, 'Bonne conversation. Intéressée par nos services. A demandé une brochure.', 
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    ARRAY['Premier contact'],
    CURRENT_TIMESTAMP - INTERVAL '4 hours'
);

-- Activité 15: Réunion annulée - Lead 16 - Bassem Sassi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    lead_id, scheduled_at, duration_minutes,
    assigned_to, created_by, outcome,
    tags, created_at
) VALUES (
    'meeting', 'Réunion FurniDeco (Annulée)',
    'Réunion de présentation - Annulée par le client, à reprogrammer.',
    'cancelled', 'medium',
    16, CURRENT_TIMESTAMP + INTERVAL '1 day', 60,
    3, 3, 'Client a un imprévu. Demande de reporter à la semaine prochaine.',
    ARRAY['À reprogrammer'],
    CURRENT_TIMESTAMP - INTERVAL '5 days'
);

-- Activité 16: Présentation terminée - Opportunité 13 - Fares Agrebi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, scheduled_at, completed_at, duration_minutes, location,
    assigned_to, created_by, outcome, next_steps, follow_up_date,
    tags, created_at
) VALUES (
    'presentation', 'Présentation services CeramArt',
    'Présentation complète de nos services de transport international pour céramique.',
    'completed', 'high',
    13, CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days', 75, 'CeramArt - Nabeul',
    8, 8, 
    'Excellente présentation. Client très intéressé. A posé beaucoup de questions sur délais et assurances. Demande une cotation détaillée.',
    'Préparer cotation détaillée. Inclure options assurance. Proposer visite de nos installations.',
    CURRENT_TIMESTAMP + INTERVAL '5 days',
    ARRAY['Présentation', 'Positif'],
    CURRENT_TIMESTAMP - INTERVAL '14 days'
);

-- Activité 17: Visite client terminée - Opportunité 14 - Sofien Hammami
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, scheduled_at, completed_at, duration_minutes, location,
    assigned_to, created_by, outcome, next_steps,
    tags, created_at
) VALUES (
    'visit', 'Visite site BioPharma',
    'Visite du site de production pour évaluer les besoins logistiques pharmaceutiques.',
    'completed', 'high',
    14, CURRENT_TIMESTAMP - INTERVAL '11 days', CURRENT_TIMESTAMP - INTERVAL '11 days', 90, 'BioPharma - Sousse',
    10, 10,
    'Visite très productive. Prise de photos. Mesures effectuées. Besoin de 3 camions frigorifiques dédiés. Volume quotidien: 2-3 tonnes.',
    'Calculer coûts flotte dédiée. Préparer cotation incluant location long terme véhicules. Vérifier disponibilité.',
    ARRAY['Visite terrain', 'Important'],
    CURRENT_TIMESTAMP - INTERVAL '11 days'
);

-- Activité 18: Suivi - Opportunité 11 - Bassem Sassi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, scheduled_at, completed_at, duration_minutes,
    assigned_to, created_by, outcome, next_steps,
    tags, created_at
) VALUES (
    'follow_up', 'Suivi post-signature Industrial Materials',
    'Appel de suivi après signature du contrat pour organiser le démarrage.',
    'completed', 'high',
    11, CURRENT_TIMESTAMP - INTERVAL '12 hours', CURRENT_TIMESTAMP - INTERVAL '12 hours', 20,
    3, 3,
    'Client très satisfait. Planning de démarrage confirmé pour lundi prochain. Liste des sites de livraison reçue.',
    'Affecter 2 chauffeurs. Planifier rotations. Créer dossier client dans système.',
    ARRAY['Post-signature', 'Démarrage'],
    CURRENT_TIMESTAMP - INTERVAL '12 hours'
);

-- Activité 19: Négociation en cours - Opportunité 9 - Sofien Hammami
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, scheduled_at, duration_minutes, meeting_link,
    assigned_to, created_by, outcome, next_steps,
    tags, created_at
) VALUES (
    'negotiation', 'Négociation tarifs PetroServ',
    'Session de négociation des tarifs et conditions commerciales.',
    'in_progress', 'urgent',
    9, CURRENT_TIMESTAMP - INTERVAL '30 minutes', 120,
    'https://teams.microsoft.com/meeting/petroserv-nego',
    10, 10,
    'Négociation en cours. Client demande rabais 3% sur volume annuel. Discussion sur pénalités retard.',
    'Valider rabais avec direction. Préparer clause pénalités. Envoyer version amendée du contrat.',
    ARRAY['Négociation', 'En cours'],
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
);

-- Activité 20: Email - Lead 17 - Salim Dhaoui
INSERT INTO crm_activities (
    type, title, description, status, priority,
    lead_id, scheduled_at, completed_at, duration_minutes,
    assigned_to, created_by, outcome,
    tags, created_at
) VALUES (
    'email', 'Envoi newsletter TechDev',
    'Envoi de la newsletter mensuelle et offres spéciales.',
    'completed', 'low',
    17, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days', 5,
    4, 4, 'Newsletter envoyée. Taux d''ouverture en attente.',
    ARRAY['Marketing'],
    CURRENT_TIMESTAMP - INTERVAL '15 days'
);

-- Activité 21: Tâche reportée - Lead 12 - Salim Dhaoui
INSERT INTO crm_activities (
    type, title, description, status, priority,
    lead_id, due_date, duration_minutes,
    assigned_to, created_by, outcome,
    tags, created_at
) VALUES (
    'task', 'Relance Steel Works (Reportée)',
    'Tentative de relance du prospect perdu - Reportée',
    'postponed', 'low',
    12, CURRENT_TIMESTAMP + INTERVAL '60 days', 30,
    4, 4, 'Prospect toujours sous contrat avec concurrent. Reporter relance dans 2 mois.',
    ARRAY['Relance', 'Reporté'],
    CURRENT_TIMESTAMP - INTERVAL '40 days'
);

-- Activité 22: Appel absent - Lead 19 - Sofien Hammami
INSERT INTO crm_activities (
    type, title, description, status, priority,
    lead_id, scheduled_at, duration_minutes,
    assigned_to, created_by, outcome, follow_up_date,
    tags, created_at
) VALUES (
    'call', 'Appel GreenPack (Non répondu)',
    'Appel de suivi après réunion initiale.',
    'no_show', 'medium',
    19, CURRENT_TIMESTAMP - INTERVAL '2 days', 15,
    10, 10, 'Aucune réponse. Message vocal laissé. Email de suivi envoyé.',
    CURRENT_TIMESTAMP + INTERVAL '3 days',
    ARRAY['À relancer'],
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- Activité 23: Proposition envoyée - Opportunité 15 - Mehdi Riahi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    opportunity_id, scheduled_at, completed_at, duration_minutes,
    assigned_to, created_by, outcome, next_steps, follow_up_date,
    tags, created_at
) VALUES (
    'proposal', 'Envoi proposition commerciale GreenPack',
    'Envoi de la proposition commerciale détaillée avec tarifs et conditions.',
    'completed', 'medium',
    15, CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days', 30,
    14, 14,
    'Proposition envoyée par email avec accusé de réception. Client a 2 semaines pour étudier.',
    'Relancer dans 1 semaine si pas de nouvelles. Préparer arguments pour négociation.',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    ARRAY['Proposition', 'Envoyée'],
    CURRENT_TIMESTAMP - INTERVAL '8 days'
);

-- Activité 24: Réunion d'équipe - Bassem Sassi
INSERT INTO crm_activities (
    type, title, description, status, priority,
    scheduled_at, completed_at, duration_minutes, location,
    assigned_to, created_by, outcome,
    tags, created_at
) VALUES (
    'meeting', 'Réunion équipe commerciale - Bilan hebdomadaire',
    'Réunion hebdomadaire de l''équipe commerciale pour faire le point sur le pipeline.',
    'completed', 'medium',
    CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days', 60, 'Siège Velosi',
    3, 2,
    'Bilan positif. 3 nouvelles signatures cette semaine. Pipeline à 1,2M TND. Objectif mois en bonne voie.',
    ARRAY['Réunion interne', 'Bilan'],
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- Activité 25: Appel planifié urgent - Lead 14 - Sofien Hammami
INSERT INTO crm_activities (
    type, title, description, status, priority,
    lead_id, scheduled_at, duration_minutes,
    assigned_to, created_by, next_steps,
    tags, created_at
) VALUES (
    'call', 'Appel urgent PetroServ - Négociation finale',
    'Appel urgent pour finaliser les derniers points de négociation avant signature.',
    'scheduled', 'urgent',
    14, CURRENT_TIMESTAMP + INTERVAL '2 hours', 30,
    10, 10, 'Valider conditions finales. Obtenir accord sur pénalités. Fixer date signature.',
    ARRAY['Urgent', 'Signature imminente'],
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
);

-- ==========================================
-- 11. INSERTION PARTICIPANTS ACTIVITÉS
-- ==========================================

-- Participants pour Activité 2 (Réunion AgriTech)
INSERT INTO crm_activity_participants (activity_id, participant_type, personnel_id, full_name, email, phone, response_status, response_date) VALUES
(2, 'internal', 4, 'Salim Dhaoui', 'salim.dhaoui@velosi.tn', '+216 27 682 986', 'accepted', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(2, 'client', NULL, 'Leila Jemni', 'l.jemni@agritech.tn', '+216 29 876 543', 'accepted', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(2, 'client', NULL, 'Faouzi Hamdi', 'f.hamdi@agritech.tn', '+216 22 111 222', 'tentative', NULL);

-- Participants pour Activité 4 (Visite SOTUVER)
INSERT INTO crm_activity_participants (activity_id, participant_type, personnel_id, full_name, email, phone, response_status, response_date) VALUES
(4, 'internal', 8, 'Fares Agrebi', 'fares.agrebi@velosi.tn', '+216 54 158 201', 'accepted', CURRENT_TIMESTAMP - INTERVAL '4 days'),
(4, 'internal', 2, 'Saber Msakni', 'saber.msakni@velosi.tn', '+216 28 682 378', 'accepted', CURRENT_TIMESTAMP - INTERVAL '4 days'),
(4, 'client', NULL, 'Mohamed Ben Salah', 'contact@sotuver.tn', '+216 71 234 567', 'accepted', CURRENT_TIMESTAMP - INTERVAL '3 days');

-- Participants pour Activité 5 (Négociation AgriTech)
INSERT INTO crm_activity_participants (activity_id, participant_type, personnel_id, full_name, email, phone, response_status, response_date) VALUES
(5, 'internal', 10, 'Sofien Hammami', 'sofien.hammami@velosi.tn', '+216 97 550 278', 'accepted', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(5, 'client', NULL, 'Leila Jemni', 'l.jemni@agritech.tn', '+216 29 876 543', 'accepted', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
(5, 'client', NULL, 'Nabil Ayari', 'n.ayari@agritech.tn', '+216 98 765 432', 'accepted', CURRENT_TIMESTAMP - INTERVAL '3 hours');



-- ==========================================
-- 12. INSERTION CLIENTS (pour prospects devenus clients)
-- ==========================================
-- Pour les prospects avec statut CLIENT et cotations acceptées, créer les clients correspondants

-- Client 1: AgriTech Solutions (Lead 13 - Leila Jemni - Cotation acceptée QUO-2025-003)
INSERT INTO client (
    nom, interlocuteur, categorie, type_client,
    adresse, code_postal, ville, pays,
    etat_fiscal, timbre, devise,
    maj_web, stop_envoie_solde, blocage,
    statut, first_login, is_permanent, auto_delete,
    mot_de_passe, keycloak_id,
    created_at, updated_at
) VALUES (
    'AgriTech Solutions', 'Leila Jemni', 'Agriculture', 'Client',
    'Route Touristique', '4000', 'Sousse', 'TUN',
    'ASSUJETTI_TVA', true, 'TND',
    false, false, false,
    'actif', true, false, false,
    NULL, NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Insérer contact client pour AgriTech
INSERT INTO contact_client (id_client, tel1, mail1, fonction)
SELECT 
    id, '+216 29 876 543', 'l.jemni@agritech.tn', 'Responsable Supply Chain'
FROM client 
WHERE nom = 'AgriTech Solutions' 
  AND interlocuteur = 'Leila Jemni'
LIMIT 1;

-- ==========================================
-- FIN DU SCRIPT - VÉRIFICATIONS
-- ==========================================

-- Afficher un résumé des données créées
DO $$
DECLARE
    count_leads INTEGER;
    count_opportunities INTEGER;
    count_quotes INTEGER;
    count_activities INTEGER;
    count_participants INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_leads FROM crm_leads;
    SELECT COUNT(*) INTO count_opportunities FROM crm_opportunities;
    SELECT COUNT(*) INTO count_quotes FROM crm_quotes;
    SELECT COUNT(*) INTO count_activities FROM crm_activities;
    SELECT COUNT(*) INTO count_participants FROM crm_activity_participants;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DONNÉES DE TEST CRM CRÉÉES AVEC SUCCÈS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Prospects (Leads): %', count_leads;
    RAISE NOTICE 'Opportunités: %', count_opportunities;
    RAISE NOTICE 'Cotations: %', count_quotes;
    RAISE NOTICE 'Lignes de cotation: %', (SELECT COUNT(*) FROM crm_quote_items);
    RAISE NOTICE 'Activités: %', count_activities;
    RAISE NOTICE 'Participants: %', count_participants;
    RAISE NOTICE 'Clients créés: %', (SELECT COUNT(*) FROM client WHERE nom IN ('AgriTech Solutions'));
    RAISE NOTICE 'Contacts clients créés: %', (SELECT COUNT(*) FROM contact_client WHERE mail1 IN ('l.jemni@agritech.tn'));
    RAISE NOTICE 'Pipelines: %', (SELECT COUNT(*) FROM crm_pipelines);
    RAISE NOTICE 'Étapes pipeline: %', (SELECT COUNT(*) FROM crm_pipeline_stages);
    RAISE NOTICE 'Tags: %', (SELECT COUNT(*) FROM crm_tags);
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Répartition Prospects par statut:';
    RAISE NOTICE '  - NEW: %', (SELECT COUNT(*) FROM crm_leads WHERE status = 'new');
    RAISE NOTICE '  - CONTACTED: %', (SELECT COUNT(*) FROM crm_leads WHERE status = 'contacted');
    RAISE NOTICE '  - QUALIFIED: %', (SELECT COUNT(*) FROM crm_leads WHERE status = 'qualified');
    RAISE NOTICE '  - NURTURING: %', (SELECT COUNT(*) FROM crm_leads WHERE status = 'nurturing');
    RAISE NOTICE '  - CONVERTED: %', (SELECT COUNT(*) FROM crm_leads WHERE status = 'converted');
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Répartition Opportunités par stage:';
    RAISE NOTICE '  - QUALIFICATION: %', (SELECT COUNT(*) FROM crm_opportunities WHERE stage = 'qualification');
    RAISE NOTICE '  - NEEDS_ANALYSIS: %', (SELECT COUNT(*) FROM crm_opportunities WHERE stage = 'needs_analysis');
    RAISE NOTICE '  - PROPOSAL: %', (SELECT COUNT(*) FROM crm_opportunities WHERE stage = 'proposal');
    RAISE NOTICE '  - NEGOTIATION: %', (SELECT COUNT(*) FROM crm_opportunities WHERE stage = 'negotiation');
    RAISE NOTICE '  - CLOSED_LOST: %', (SELECT COUNT(*) FROM crm_opportunities WHERE stage = 'closed_lost');
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Répartition Cotations par statut:';
    RAISE NOTICE '  - DRAFT: %', (SELECT COUNT(*) FROM crm_quotes WHERE status = 'draft');
    RAISE NOTICE '  - SENT: %', (SELECT COUNT(*) FROM crm_quotes WHERE status = 'sent');
    RAISE NOTICE '  - ACCEPTED: %', (SELECT COUNT(*) FROM crm_quotes WHERE status = 'accepted');
    RAISE NOTICE '  - REJECTED: %', (SELECT COUNT(*) FROM crm_quotes WHERE status = 'rejected');
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tests possibles:';
    RAISE NOTICE '✅ Cycle complet Prospect → Opportunité → Cotation → Client';
    RAISE NOTICE '✅ Différents statuts (NEW, QUALIFIED, CONVERTED, etc.)';
    RAISE NOTICE '✅ Pipeline avec toutes les étapes';
    RAISE NOTICE '✅ Cotations (Brouillon, Envoyée, Acceptée, Rejetée)';
    RAISE NOTICE '✅ Clients créés automatiquement pour cotations acceptées';
    RAISE NOTICE '✅ Activités variées (Appels, Réunions, Visites, etc.)';
    RAISE NOTICE '✅ Participants multiples aux activités';
    RAISE NOTICE '✅ Données distribuées sur 7 commerciaux';
    RAISE NOTICE '========================================';
END $$;
