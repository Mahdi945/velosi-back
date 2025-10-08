-- Script SQL pour créer des données de test pour les prospects
-- À exécuter après avoir créé la table crm_leads
-- Vérifie que bassem.sassi (ID=3) existe dans la table personnel

-- Test de l'existence de bassem.sassi
SELECT id, name, email FROM personnel WHERE id = 3;

-- Insertion de prospects de test avec bassem.sassi comme commercial assigné
INSERT INTO crm_leads (
    full_name,
    email,
    phone,
    company,
    position,
    website,
    industry,
    employee_count,
    source,
    status,
    priority,
    transport_needs,
    annual_volume,
    current_provider,
    contract_end_date,
    street,
    city,
    state,
    postal_code,
    country,
    is_local,
    assigned_to,
    estimated_value,
    tags,
    notes,
    last_contact_date,
    next_followup_date,
    created_by,
    updated_by
) VALUES 
-- Prospect 1: Transport maritime - Forte valeur
(
    'Ahmed Ben Ali',
    'ahmed.benali@maritrans.tn',
    '+216 71 123 456',
    'Maritrans Logistics',
    'Directeur Commercial',
    'https://www.maritrans.tn',
    'Maritime Transport',
    250,
    'referral',
    'qualified',
    'high',
    ARRAY['Maritime', 'Container Transport', 'Port Operations'],
    850000.00,
    'TransMed Shipping',
    '2024-12-31',
    '15 Avenue Habib Bourguiba',
    'Tunis',
    'Tunis',
    '1001',
    'TUN',
    true,
    3, -- bassem.sassi
    120000.00,
    ARRAY['Maritime', 'High Priority', 'Q4 2024'],
    'Prospect très intéressé par nos services de transport maritime. Contrat actuel expire fin 2024. Besoin de services complets port-à-port.',
    '2024-10-15 10:30:00',
    '2024-11-05 14:00:00',
    3, -- créé par bassem.sassi
    3  -- mis à jour par bassem.sassi
),

-- Prospect 2: Transport routier - Valeur moyenne
(
    'Fatma Karoui',
    'f.karoui@express-cargo.com',
    '+216 22 987 654',
    'Express Cargo Solutions',
    'Responsable Logistique',
    'https://express-cargo.com',
    'Road Transport',
    85,
    'website',
    'contacted',
    'medium',
    ARRAY['Road Transport', 'Express Delivery', 'Last Mile'],
    320000.00,
    'RapidTrans',
    '2025-03-15',
    '42 Rue de la République',
    'Sfax',
    'Sfax',
    '3000',
    'TUN',
    true,
    3, -- bassem.sassi
    45000.00,
    ARRAY['Road Transport', 'Express', 'Follow-up'],
    'Entreprise en croissance cherchant à optimiser ses coûts de transport. Intéressée par nos solutions express.',
    '2024-10-20 09:15:00',
    '2024-10-30 16:30:00',
    3, -- créé par bassem.sassi
    3  -- mis à jour par bassem.sassi
),

-- Prospect 3: Import/Export - Nouvelle piste
(
    'Mohamed Trabelsi',
    'trabelsi@global-trade.tn',
    '+216 98 456 789',
    'Global Trade Partners',
    'CEO',
    'https://www.global-trade.tn',
    'Import/Export',
    120,
    'cold_call',
    'new',
    'medium',
    ARRAY['Air Freight', 'Customs Clearance', 'Warehousing'],
    480000.00,
    'International Cargo',
    '2024-11-30',
    '8 Boulevard du 7 Novembre',
    'Sousse',
    'Sousse',
    '4000',
    'TUN',
    true,
    3, -- bassem.sassi
    75000.00,
    ARRAY['Import/Export', 'Air Freight', 'New Lead'],
    'Premier contact prometteur. Société spécialisée dans l''import/export avec l''Europe. Cherche partenaire fiable pour transport aérien.',
    '2024-10-25 11:00:00',
    '2024-11-01 10:00:00',
    3, -- créé par bassem.sassi
    3  -- mis à jour par bassem.sassi
),

-- Prospect 4: Transport industriel - Haute priorité
(
    'Sonia Gharbi',
    'gharbi@industrans.tn',
    '+216 70 333 222',
    'IndusTrans Heavy Cargo',
    'Directrice Générale',
    'https://industrans.tn',
    'Heavy Industry',
    300,
    'trade_show',
    'nurturing',
    'urgent',
    ARRAY['Heavy Cargo', 'Industrial Equipment', 'Special Transport'],
    1200000.00,
    'HeavyLift Solutions',
    '2025-06-30',
    '25 Zone Industrielle Ben Arous',
    'Ben Arous',
    'Ben Arous',
    '2013',
    'TUN',
    true,
    3, -- bassem.sassi
    180000.00,
    ARRAY['Heavy Cargo', 'Industrial', 'Urgent', 'Trade Show'],
    'Rencontrée au salon LogisTech 2024. Besoins spécialisés en transport de matériel industriel lourd. Projet d''expansion prévu.',
    '2024-10-10 14:45:00',
    '2024-10-28 09:30:00',
    3, -- créé par bassem.sassi
    3  -- mis à jour par bassem.sassi
),

-- Prospect 5: E-commerce - Secteur émergent
(
    'Riadh Bouazizi',
    'bouazizi@ecom-logistics.tn',
    '+216 55 777 888',
    'E-Commerce Logistics Hub',
    'COO',
    'https://ecom-logistics.tn',
    'E-commerce',
    60,
    'social_media',
    'contacted',
    'high',
    ARRAY['E-commerce Fulfillment', 'Last Mile Delivery', 'Returns Management'],
    280000.00,
    'FastDelivery Pro',
    '2025-01-31',
    '12 Rue Mongi Slim',
    'Ariana',
    'Ariana',
    '2080',
    'TUN',
    true,
    3, -- bassem.sassi
    38000.00,
    ARRAY['E-commerce', 'Last Mile', 'Digital'],
    'Startup e-commerce en forte croissance. Besoin urgent de solutions logistiques pour accompagner l''expansion. Contact via LinkedIn.',
    '2024-10-22 16:20:00',
    '2024-11-02 11:15:00',
    3, -- créé par bassem.sassi
    3  -- mis à jour par bassem.sassi
);

-- Vérification des données insérées
SELECT 
    id,
    full_name,
    company,
    status,
    priority,
    estimated_value,
    (SELECT name FROM personnel WHERE id = assigned_to) as assigned_commercial,
    created_at
FROM crm_leads 
WHERE assigned_to = 3
ORDER BY created_at DESC;

-- Statistiques par statut pour bassem.sassi
SELECT 
    status,
    COUNT(*) as count,
    SUM(estimated_value) as total_value,
    AVG(estimated_value) as avg_value
FROM crm_leads 
WHERE assigned_to = 3
GROUP BY status
ORDER BY count DESC;

-- Statistiques par priorité pour bassem.sassi
SELECT 
    priority,
    COUNT(*) as count,
    SUM(estimated_value) as total_value
FROM crm_leads 
WHERE assigned_to = 3
GROUP BY priority
ORDER BY 
    CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' then 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END;