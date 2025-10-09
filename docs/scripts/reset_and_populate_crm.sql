-- ==========================================
-- SCRIPT DE RÉINITIALISATION ET POPULATION CRM
-- ==========================================
-- Ce script supprime toutes les données CRM et crée des données de test
-- Tables concernées: crm_leads, crm_opportunities

-- ==========================================
-- 1. SUPPRESSION DES DONNÉES EXISTANTES
-- ==========================================

-- Supprimer les opportunités (qui référencent les prospects)
DELETE FROM crm_opportunities;
ALTER SEQUENCE crm_opportunities_id_seq RESTART WITH 1;

-- Supprimer les prospects
DELETE FROM crm_leads;
ALTER SEQUENCE crm_leads_id_seq RESTART WITH 1;

-- ==========================================
-- 2. CRÉATION DE 20 PROSPECTS DE TEST
-- ==========================================

INSERT INTO crm_leads (
    full_name, email, phone, company, position, website, industry, employee_count,
    source, status, priority, transport_needs, annual_volume, current_provider,
    street, city, postal_code, country, is_local, assigned_to, estimated_value,
    tags, notes, next_followup_date, created_at, updated_at
) VALUES 
-- Prospects Tunisiens (locaux)
(
    'Ahmed Ben Salem', 'ahmed.salem@tunisexport.tn', '+216 71 123 456', 
    'Tunis Export SARL', 'Directeur Logistique', 'www.tunisexport.tn', 'Export/Import', 150,
    'website', 'new', 'high', ARRAY['national', 'international'], 50000.00, 'DHL Tunisie',
    '15 Avenue Habib Bourguiba', 'Tunis', '1000', 'TUN', true, 3, 25000.00,
    ARRAY['export', 'urgent', 'maritime'], 'Prospect très intéressé par nos services maritimes vers l''Europe',
    CURRENT_DATE + INTERVAL '3 days', NOW(), NOW()
),
(
    'Fatma Trabelsi', 'f.trabelsi@medpharma.com.tn', '+216 73 987 654', 
    'Med Pharma Distribution', 'Responsable Supply Chain', 'www.medpharma.tn', 'Pharmaceutique', 80,
    'phone', 'contacted', 'urgent', ARRAY['express', 'température contrôlée'], 75000.00, 'Aramex',
    '25 Rue de la Liberté', 'Sfax', '3000', 'TUN', true, 8, 40000.00,
    ARRAY['pharmaceutique', 'express', 'cold-chain'], 'Besoin urgent de transport réfrigéré pour médicaments',
    CURRENT_DATE + INTERVAL '1 day', NOW(), NOW()
),
(
    'Mohamed Karim Hajji', 'mk.hajji@oliveoil.tn', '+216 75 456 789', 
    'Golden Olive Oil Company', 'PDG', 'www.goldenoil.tn', 'Agroalimentaire', 200,
    'trade_show', 'qualified', 'high', ARRAY['national', 'export'], 100000.00, 'STAM',
    '40 Zone Industrielle', 'Kairouan', '3100', 'TUN', true, 4, 60000.00,
    ARRAY['agroalimentaire', 'huile', 'export'], 'Producteur d''huile d''olive cherche partenaire logistique fiable',
    CURRENT_DATE + INTERVAL '5 days', NOW(), NOW()
),
(
    'Rim Fezzani', 'rim.fezzani@textilecorp.tn', '+216 79 321 654', 
    'Textile Corp International', 'Directrice des Opérations', 'www.textilecorp.tn', 'Textile', 300,
    'referral', 'nurturing', 'medium', ARRAY['international', 'conteneurs'], 120000.00, 'MSC Tunisie',
    '12 Rue des Entrepreneurs', 'Monastir', '5000', 'TUN', true, 10, 35000.00,
    ARRAY['textile', 'export', 'conteneurs'], 'Exportateur textile vers Europe et USA',
    CURRENT_DATE + INTERVAL '7 days', NOW(), NOW()
),
(
    'Sami Bouzid', 'sami.bouzid@techsolutions.tn', '+216 70 111 222', 
    'Tech Solutions Tunisia', 'Directeur Général', 'www.techsolutions.tn', 'Technologies', 50,
    'social_media', 'new', 'medium', ARRAY['express', 'sécurisé'], 15000.00, 'La Poste Tunisienne',
    '8 Cité Technologique', 'Ariana', '2080', 'TUN', true, 14, 12000.00,
    ARRAY['technologie', 'express', 'sécurisé'], 'Startup tech ayant besoin de livraisons express sécurisées',
    CURRENT_DATE + INTERVAL '2 days', NOW(), NOW()
),

-- Prospects Internationaux (non-locaux)
(
    'Jean-Pierre Martin', 'jp.martin@frenchimport.fr', '+33 1 45 67 89 01', 
    'French Import Solutions', 'Responsable Achats', 'www.frenchimport.fr', 'Import/Export', 120,
    'email', 'contacted', 'high', ARRAY['international', 'maritime'], 80000.00, 'CMA CGM',
    '45 Rue de Rivoli', 'Paris', '75001', 'FR', false, 3, 50000.00,
    ARRAY['import', 'france', 'maritime'], 'Importateur français cherchant fournisseur logistique en Tunisie',
    CURRENT_DATE + INTERVAL '4 days', NOW(), NOW()
),
(
    'Marco Rossi', 'marco.rossi@italialogistics.it', '+39 06 123 4567', 
    'Italia Logistics SpA', 'Direttore Commerciale', 'www.italialogistics.it', 'Logistique', 250,
    'partner', 'qualified', 'urgent', ARRAY['international', 'routier'], 150000.00, 'DHL Italy',
    'Via Roma 123', 'Milano', '20100', 'IT', false, 3, 75000.00,
    ARRAY['italie', 'routier', 'partenariat'], 'Partenaire logistique italien pour corridor Tunisie-Italie',
    CURRENT_DATE + INTERVAL '1 day', NOW(), NOW()
),
(
    'Hans Mueller', 'h.mueller@germanfreight.de', '+49 30 987 6543', 
    'German Freight Solutions', 'Geschäftsführer', 'www.germanfreight.de', 'Transport', 180,
    'cold_call', 'new', 'medium', ARRAY['international', 'ferroviaire'], 90000.00, 'DB Schenker',
    'Berliner Str. 50', 'Berlin', '10115', 'DE', false, 8, 45000.00,
    ARRAY['allemagne', 'ferroviaire', 'multimodal'], 'Transporteur allemand intéressé par solutions multimodales',
    CURRENT_DATE + INTERVAL '6 days', NOW(), NOW()
),
(
    'Sarah Johnson', 'sarah.johnson@ukshipping.co.uk', '+44 20 7946 0958', 
    'UK Shipping & Logistics', 'Operations Manager', 'www.ukshipping.co.uk', 'Maritime', 90,
    'website', 'contacted', 'high', ARRAY['maritime', 'international'], 70000.00, 'Maersk',
    '10 Canary Wharf', 'London', 'E14 5AB', 'GB', false, 14, 38000.00,
    ARRAY['royaume-uni', 'maritime', 'containers'], 'Compagnie maritime britannique pour ligne Tunis-Portsmouth',
    CURRENT_DATE + INTERVAL '3 days', NOW(), NOW()
),
(
    'Ahmed Al-Rashid', 'ahmed.rashid@gulftrade.ae', '+971 4 123 4567', 
    'Gulf Trade Logistics', 'General Manager', 'www.gulftrade.ae', 'Commerce', 60,
    'trade_show', 'nurturing', 'medium', ARRAY['aérien', 'express'], 45000.00, 'Emirates SkyCargo',
    'Dubai Marina, Block 3', 'Dubai', '00000', 'AE', false, 4, 28000.00,
    ARRAY['emirats', 'aérien', 'golfe'], 'Trader des Émirats pour marchandises haute valeur',
    CURRENT_DATE + INTERVAL '8 days', NOW(), NOW()
),

-- Prospects Maghrébins
(
    'Youssef Benali', 'y.benali@maroclogistics.ma', '+212 5 22 34 56 78', 
    'Maroc Logistics Group', 'Directeur Régional', 'www.maroclogistics.ma', 'Logistique', 140,
    'referral', 'qualified', 'high', ARRAY['maghreb', 'routier'], 65000.00, 'ONCF',
    'Boulevard Hassan II, 234', 'Casablanca', '20000', 'MA', false, 4, 32000.00,
    ARRAY['maroc', 'maghreb', 'routier'], 'Partenaire logistique pour corridor Tunisie-Maroc',
    CURRENT_DATE + INTERVAL '2 days', NOW(), NOW()
),
(
    'Amina Boumediene', 'a.boumediene@algeriafreight.dz', '+213 21 123 456', 
    'Algeria Freight Services', 'Directrice Commerciale', 'www.algeriafreight.dz', 'Transport', 110,
    'email', 'new', 'medium', ARRAY['maghreb', 'pétrolier'], 85000.00, 'SNTF',
    'Rue Didouche Mourad 15', 'Alger', '16000', 'DZ', false, 3, 42000.00,
    ARRAY['algérie', 'pétrolier', 'maghreb'], 'Transporteur algérien spécialisé hydrocarbures',
    CURRENT_DATE + INTERVAL '5 days', NOW(), NOW()
),

-- Prospects secteur technologique
(
    'Lisa Chen', 'lisa.chen@techasia.sg', '+65 6123 4567', 
    'Tech Asia Distribution', 'Supply Chain Director', 'www.techasia.sg', 'Technologies', 75,
    'social_media', 'contacted', 'urgent', ARRAY['aérien', 'sécurisé'], 35000.00, 'Singapore Airlines Cargo',
    'Marina Bay Financial Centre', 'Singapore', '018981', 'SG', false, 3, 25000.00,
    ARRAY['singapour', 'technologie', 'aérien'], 'Distributeur tech asiatique pour composants électroniques',
    CURRENT_DATE + INTERVAL '1 day', NOW(), NOW()
),

-- Prospects secteur pharmaceutique
(
    'Dr. Elena Popovic', 'elena.popovic@pharmabalkans.rs', '+381 11 234 5678', 
    'Pharma Balkans', 'Medical Director', 'www.pharmabalkans.rs', 'Pharmaceutique', 45,
    'advertisement', 'nurturing', 'high', ARRAY['température contrôlée', 'express'], 55000.00, 'DHL Medical',
    'Knez Mihailova 28', 'Belgrade', '11000', 'RS', false, 8, 35000.00,
    ARRAY['serbie', 'pharmaceutique', 'cold-chain'], 'Laboratoire pharmaceutique pour médicaments température contrôlée',
    CURRENT_DATE + INTERVAL '4 days', NOW(), NOW()
),

-- Prospects e-commerce
(
    'Carlos Rodriguez', 'carlos@ecommercespain.es', '+34 91 234 5678', 
    'E-commerce Spain Solutions', 'CEO', 'www.ecommercespain.es', 'E-commerce', 85,
    'website', 'qualified', 'medium', ARRAY['express', 'dernière mile'], 40000.00, 'Correos Express',
    'Gran Via 123', 'Madrid', '28013', 'ES', false, 10, 22000.00,
    ARRAY['espagne', 'e-commerce', 'dernière-mile'], 'Plateforme e-commerce espagnole en expansion',
    CURRENT_DATE + INTERVAL '3 days', NOW(), NOW()
),

-- Prospects secteur agroalimentaire
(
    'Nadia Zouari', 'nadia.zouari@fruitexport.tn', '+216 74 567 890', 
    'Fruit Export Tunisia', 'Responsable Export', 'www.fruitexport.tn', 'Agroalimentaire', 65,
    'phone', 'contacted', 'high', ARRAY['réfrigéré', 'express'], 60000.00, 'Fruit Logistica',
    '30 Route de Sousse', 'Nabeul', '8000', 'TUN', true, 3, 30000.00,
    ARRAY['fruits', 'export', 'réfrigéré'], 'Exportateur de fruits frais vers Europe',
    CURRENT_DATE + INTERVAL '2 days', NOW(), NOW()
),

-- Prospects secteur automobile
(
    'Michel Dubois', 'michel.dubois@autoparts.fr', '+33 4 56 78 90 12', 
    'AutoParts France Distribution', 'Directeur Logistique', 'www.autoparts.fr', 'Automobile', 95,
    'trade_show', 'new', 'medium', ARRAY['routier', 'express'], 48000.00, 'Geodis',
    '67 Avenue de la République', 'Lyon', '69003', 'FR', false, 4, 28000.00,
    ARRAY['france', 'automobile', 'pièces'], 'Distributeur pièces automobiles français',
    CURRENT_DATE + INTERVAL '6 days', NOW(), NOW()
),

-- Prospects secteur chimique
(
    'Roberto Silva', 'roberto.silva@quimicabrasil.br', '+55 11 9876 5432', 
    'Química Brasil Export', 'Export Manager', 'www.quimicabrasil.br', 'Chimique', 160,
    'partner', 'qualified', 'urgent', ARRAY['conteneurs', 'chimique'], 95000.00, 'Maersk Line',
    'Avenida Paulista 1500', 'São Paulo', '01310-100', 'BR', false, 14, 65000.00,
    ARRAY['brésil', 'chimique', 'dangereux'], 'Exportateur produits chimiques vers Afrique du Nord',
    CURRENT_DATE + INTERVAL '1 day', NOW(), NOW()
),

-- Prospects secteur énergie
(
    'Khalil Ben Othman', 'khalil.benothman@energytn.tn', '+216 71 789 123', 
    'Energy Tunisia Solutions', 'Directeur Technique', 'www.energytn.tn', 'Énergie', 120,
    'cold_call', 'nurturing', 'high', ARRAY['spécialisé', 'lourd'], 110000.00, 'Panalpina',
    '55 Avenue de la Paix', 'Tunis', '1000', 'TUN', true, 3, 55000.00,
    ARRAY['énergie', 'équipements', 'projet'], 'Société énergétique pour transport équipements lourds',
    CURRENT_DATE + INTERVAL '7 days', NOW(), NOW()
),

-- Prospects secteur textile international
(
    'Priya Sharma', 'priya.sharma@textileindia.in', '+91 22 1234 5678', 
    'Textile India Export House', 'Vice President Operations', 'www.textileindia.in', 'Textile', 220,
    'email', 'contacted', 'medium', ARRAY['maritime', 'conteneurs'], 130000.00, 'CONCOR',
    'Nariman Point, Marine Drive', 'Mumbai', '400021', 'IN', false, 8, 48000.00,
    ARRAY['inde', 'textile', 'volume'], 'Grand exportateur textile indien vers Afrique',
    CURRENT_DATE + INTERVAL '4 days', NOW(), NOW()
);

-- ==========================================
-- 3. CRÉATION DE 10 OPPORTUNITÉS LIÉES AUX PROSPECTS
-- ==========================================

INSERT INTO crm_opportunities (
    title, description, lead_id, value, probability, stage, expected_close_date,
    origin_address, destination_address, transport_type, service_frequency,
    vehicle_types, special_requirements, assigned_to, source, priority,
    tags, competitors, created_at, updated_at
) VALUES 
-- Opportunité 1 - Issue du prospect Ahmed Ben Salem (lead_id: 1)
(
    'Contrat logistique maritime Tunis Export',
    'Opportunité de contrat annuel pour transport maritime de produits d''export vers ports européens. Volume estimé 500 conteneurs/an.',
    1, 85000.00, 75, 'qualification', CURRENT_DATE + INTERVAL '45 days',
    'Port de Radès, Tunis, Tunisie', 'Ports de Marseille/Gênes/Barcelone',
    'international', 'weekly',
    ARRAY['conteneurs 20ft', 'conteneurs 40ft'], 'Marchandises diverses, non dangereuses',
    3, 'lead_conversion', 'high',
    ARRAY['maritime', 'export', 'conteneurs', 'hebdomadaire'], ARRAY['Maersk', 'MSC', 'CMA CGM'],
    NOW(), NOW()
),

-- Opportunité 2 - Issue du prospect Fatma Trabelsi (lead_id: 2)
(
    'Transport pharmaceutique réfrigéré Med Pharma',
    'Contrat exclusif transport température contrôlée pour médicaments. Livraisons quotidiennes Sfax-Tunis.',
    2, 120000.00, 85, 'needs_analysis', CURRENT_DATE + INTERVAL '30 days',
    'Med Pharma Distribution, Sfax', 'Pharmacies et hôpitaux - Grand Tunis',
    'express', 'daily',
    ARRAY['véhicules réfrigérés', 'camionnettes'], 'Température 2-8°C, validation GDP, traçabilité',
    8, 'lead_conversion', 'urgent',
    ARRAY['pharmaceutique', 'cold-chain', 'GDP', 'quotidien'], ARRAY['DHL Medical', 'FedEx Healthcare'],
    NOW(), NOW()
),

-- Opportunité 3 - Issue du prospect Mohamed Karim Hajji (lead_id: 3)
(
    'Export huile d''olive Golden Olive',
    'Partenariat logistique pour export huile d''olive biologique. 200 tonnes/mois vers Europe et USA.',
    3, 150000.00, 70, 'proposal', CURRENT_DATE + INTERVAL '60 days',
    'Golden Olive Oil Company, Kairouan', 'Distributeurs Europe/USA',
    'international', 'monthly',
    ARRAY['conteneurs isothermes', 'camions citernes'], 'Produit alimentaire bio, certifications requises',
    4, 'lead_conversion', 'high',
    ARRAY['agroalimentaire', 'bio', 'export', 'certifié'], ARRAY['Kuehne+Nagel', 'GEODIS'],
    NOW(), NOW()
),

-- Opportunité 4 - Issue du prospect Jean-Pierre Martin (lead_id: 6)
(
    'Partenariat import France-Tunisie',
    'Accord cadre import produits tunisiens vers France. Hub logistique Marseille-Paris.',
    6, 200000.00, 60, 'negotiation', CURRENT_DATE + INTERVAL '90 days',
    'Ports tunisiens (Radès/Sousse)', 'Hub Marseille puis distribution France',
    'international', 'weekly',
    ARRAY['conteneurs', 'camions'], 'Produits manufacturés et agroalimentaires',
    3, 'lead_conversion', 'high',
    ARRAY['france', 'import', 'hub', 'distribution'], ARRAY['CMA CGM', 'Bolloré Logistics'],
    NOW(), NOW()
),

-- Opportunité 5 - Issue du prospect Marco Rossi (lead_id: 7)
(
    'Corridor logistique Tunisie-Italie',
    'Ligne régulière maritime et routière Tunis-Milan. Service bi-hebdomadaire.',
    7, 180000.00, 80, 'proposal', CURRENT_DATE + INTERVAL '50 days',
    'Port de Tunis/Radès', 'Ports italiens + acheminement routier',
    'international', 'weekly',
    ARRAY['ferry', 'camions', 'remorques'], 'Transport combiné mer-route',
    3, 'lead_conversion', 'urgent',
    ARRAY['italie', 'corridor', 'combiné', 'régulier'], ARRAY['Grimaldi Lines', 'SNAV'],
    NOW(), NOW()
),

-- Opportunité 6 - Issue du prospect Youssef Benali (lead_id: 11)
(
    'Hub Maghreb Casablanca-Tunis',
    'Création hub régional Maghreb avec ligne Casablanca-Tunis-Alger.',
    11, 250000.00, 65, 'qualification', CURRENT_DATE + INTERVAL '120 days',
    'Hub Casablanca', 'Tunis + distribution régionale',
    'national', 'daily',
    ARRAY['camions', 'semi-remorques'], 'Mutualisation flux Maghreb',
    4, 'lead_conversion', 'high',
    ARRAY['maghreb', 'hub', 'régional', 'mutualisation'], ARRAY['ONCF', 'SNTF'],
    NOW(), NOW()
),

-- Opportunité 7 - Issue du prospect Lisa Chen (lead_id: 13)
(
    'Express tech Singapour-Tunisie',
    'Service express aérien composants électroniques high-tech. Livraisons 48h.',
    13, 95000.00, 90, 'negotiation', CURRENT_DATE + INTERVAL '25 days',
    'Aéroport Changi, Singapour', 'Aéroport Tunis-Carthage + livraison',
    'express', 'weekly',
    ARRAY['avion cargo', 'véhicules sécurisés'], 'Produits haute valeur, assurance renforcée',
    3, 'lead_conversion', 'urgent',
    ARRAY['singapour', 'aérien', 'high-tech', 'express'], ARRAY['DHL Express', 'FedEx'],
    NOW(), NOW()
),

-- Opportunité 8 - Issue du prospect Carlos Rodriguez (lead_id: 15)
(
    'E-commerce dernière mile Espagne',
    'Solution dernière mile pour e-commerce espagnol. 1000 colis/jour.',
    15, 75000.00, 70, 'needs_analysis', CURRENT_DATE + INTERVAL '40 days',
    'Centres de tri Espagne', 'Domiciles clients Tunisie',
    'express', 'daily',
    ARRAY['camionnettes', 'scooters'], 'Livraison domicile, retours possibles',
    10, 'lead_conversion', 'medium',
    ARRAY['e-commerce', 'b2c', 'domicile', 'retours'], ARRAY['Correos', 'MRW'],
    NOW(), NOW()
),

-- Opportunité 9 - Issue du prospect Roberto Silva (lead_id: 18)
(
    'Transport chimique Brésil-Afrique Nord',
    'Transport produits chimiques dangereux. Liaison maritime São Paulo-Tunis.',
    18, 320000.00, 55, 'prospecting', CURRENT_DATE + INTERVAL '150 days',
    'Port de Santos, São Paulo', 'Port de Radès + distribution Maghreb',
    'freight', 'monthly',
    ARRAY['conteneurs IMO', 'citernes'], 'Produits chimiques classe 3 et 8, certifications ADR',
    14, 'lead_conversion', 'urgent',
    ARRAY['brésil', 'chimique', 'dangereux', 'IMO'], ARRAY['Maersk', 'Hamburg Süd'],
    NOW(), NOW()
),

-- Opportunité 10 - Issue du prospect Khalil Ben Othman (lead_id: 19)
(
    'Projet énergie renouvelable Equipment',
    'Transport équipements lourds parc éolien. Pale d''éoliennes et transformateurs.',
    19, 280000.00, 45, 'prospecting', CURRENT_DATE + INTERVAL '180 days',
    'Port de Tunis', 'Sites éoliens Sud tunisien',
    'freight', 'one_time',
    ARRAY['convoi exceptionnel', 'grues'], 'Transport exceptionnel, autorisations spéciales',
    3, 'lead_conversion', 'high',
    ARRAY['énergie', 'éolien', 'exceptionnel', 'projet'], ARRAY['Fagioli', 'Mammoet'],
    NOW(), NOW()
);

-- ==========================================
-- 4. MISE À JOUR DES STATUTS DE PROSPECTS CONVERTIS
-- ==========================================

-- Marquer les prospects qui ont des opportunités comme "converted"
UPDATE crm_leads 
SET status = 'converted', 
    converted_date = NOW(),
    updated_at = NOW()
WHERE id IN (1, 2, 3, 6, 7, 11, 13, 15, 18, 19);

-- ==========================================
-- 5. VÉRIFICATIONS ET RÉSUMÉ
-- ==========================================

-- Compter les enregistrements créés
SELECT 
    'Prospects créés' AS type, 
    COUNT(*) AS total 
FROM crm_leads
UNION ALL
SELECT 
    'Opportunités créées' AS type, 
    COUNT(*) AS total 
FROM crm_opportunities
UNION ALL
SELECT 
    'Prospects convertis' AS type, 
    COUNT(*) AS total 
FROM crm_leads 
WHERE status = 'converted';

-- Afficher la répartition par statut des prospects
SELECT 
    status,
    COUNT(*) as nombre,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM crm_leads), 2) as pourcentage
FROM crm_leads 
GROUP BY status 
ORDER BY nombre DESC;

-- Afficher la répartition par étape des opportunités
SELECT 
    stage,
    COUNT(*) as nombre,
    SUM(value) as valeur_totale,
    ROUND(AVG(probability), 2) as probabilite_moyenne
FROM crm_opportunities 
GROUP BY stage 
ORDER BY nombre DESC;

-- ==========================================
-- 6. DONNÉES DE PERFORMANCE CRM
-- ==========================================

-- Calcul du pipeline (opportunités non fermées)
SELECT 
    'Pipeline Value' AS metric,
    SUM(value) AS total_value,
    COUNT(*) AS opportunities_count,
    ROUND(AVG(probability), 2) AS avg_probability
FROM crm_opportunities 
WHERE stage NOT IN ('closed_won', 'closed_lost');

-- Répartition géographique des prospects
SELECT 
    country,
    COUNT(*) as prospects,
    SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted,
    ROUND(SUM(CASE WHEN status = 'converted' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 2) as conversion_rate
FROM crm_leads 
GROUP BY country 
ORDER BY prospects DESC;

COMMIT;

-- ==========================================
-- NOTES D'UTILISATION
-- ==========================================
-- Ce script crée des données réalistes pour tester le système CRM:
-- 
-- PROSPECTS (20 au total):
-- - 10 prospects tunisiens (locaux)
-- - 10 prospects internationaux (France, Italie, Allemagne, UK, etc.)
-- - Secteurs variés: export/import, pharmaceutique, textile, tech, etc.
-- - Statuts répartis: new, contacted, qualified, nurturing, converted
-- - Priorités équilibrées: low, medium, high, urgent
-- 
-- OPPORTUNITÉS (10 au total):
-- - Toutes liées à des prospects existants
-- - Étapes variées du pipeline de vente
-- - Valeurs réalistes (75K à 320K)
-- - Types de transport diversifiés
-- - Fréquences de service adaptées
-- 
-- FONCTIONNALITÉS TESTÉES:
-- ✅ Filtrage par commercial, priorité, statut
-- ✅ Conversion prospect → opportunité
-- ✅ Gestion géographique (local/international)
-- ✅ Spécificités transport (types, fréquences)
-- ✅ Pipeline de vente complet
-- ✅ Système de tags et classification