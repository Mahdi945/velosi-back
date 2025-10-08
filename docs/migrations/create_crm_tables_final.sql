-- ========================================
-- SCRIPT SQL FINAL - CRÉATION TABLES CRM
-- Pour société de transport et logistique Velosi
-- Compatible avec les entités existantes
-- ========================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- VÉRIFICATIONS PRÉALABLES
-- ========================================
DO $$
BEGIN
    -- Vérifier que les tables de référence existent
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personnel') THEN
        RAISE EXCEPTION 'Table personnel n''existe pas. Veuillez la créer avant d''exécuter ce script.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client') THEN
        RAISE EXCEPTION 'Table client n''existe pas. Veuillez la créer avant d''exécuter ce script.';
    END IF;
    
    -- Vérifier les colonnes essentielles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personnel' AND column_name = 'prenom') THEN
        RAISE EXCEPTION 'Colonne prenom manquante dans la table personnel.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personnel' AND column_name = 'nom') THEN
        RAISE EXCEPTION 'Colonne nom manquante dans la table personnel.';
    END IF;
    
    RAISE NOTICE 'Vérifications préalables réussies. Création des tables CRM...';
END
$$;

-- ========================================
-- 1. TABLE: crm_leads (Prospects)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_leads (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Informations personnelles
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    
    -- Informations entreprise
    company VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    website VARCHAR(255),
    industry VARCHAR(100),
    employee_count INTEGER,
    
    -- Classification prospect
    source VARCHAR(50) DEFAULT 'website' CHECK (source IN (
        'website', 'email', 'phone', 'referral', 'social_media', 
        'trade_show', 'cold_call', 'partner', 'advertisement', 'other'
    )),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN (
        'new', 'contacted', 'qualified', 'unqualified', 
        'nurturing', 'converted', 'lost'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Transport spécifique
    transport_needs TEXT[], -- Types de besoins: 'national', 'international', 'express', etc.
    annual_volume DECIMAL(12,2), -- Volume annuel estimé
    current_provider VARCHAR(255), -- Prestataire actuel
    contract_end_date DATE, -- Fin contrat actuel
    
    -- Géographie
    street VARCHAR(300),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(3) DEFAULT 'TUN',
    is_local BOOLEAN DEFAULT true, -- Local/International
    
    -- Gestion commerciale
    assigned_to INTEGER REFERENCES personnel(id),
    estimated_value DECIMAL(12,2),
    tags TEXT[],
    notes TEXT,
    
    -- Dates de suivi
    last_contact_date TIMESTAMP,
    next_followup_date TIMESTAMP,
    qualified_date TIMESTAMP,
    converted_date TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES personnel(id),
    updated_by INTEGER REFERENCES personnel(id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_leads_email ON crm_leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_company ON crm_leads(company);
CREATE INDEX IF NOT EXISTS idx_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON crm_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_country ON crm_leads(country);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON crm_leads(created_at);

-- ========================================
-- 2. TABLE: crm_opportunities (Opportunités)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_opportunities (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Informations de base
    title VARCHAR(255) NOT NULL,
    description TEXT,
    lead_id INTEGER REFERENCES crm_leads(id),
    client_id INTEGER REFERENCES client(id),
    
    -- Valeur et probabilité
    value DECIMAL(12,2) NOT NULL DEFAULT 0,
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    
    -- Pipeline
    stage VARCHAR(50) DEFAULT 'prospecting' CHECK (stage IN (
        'prospecting', 'qualification', 'needs_analysis', 
        'proposal', 'negotiation', 'closed_won', 'closed_lost'
    )),
    
    -- Dates
    expected_close_date DATE,
    actual_close_date DATE,
    
    -- Transport spécifique
    origin_address TEXT,
    destination_address TEXT,
    transport_type VARCHAR(50) CHECK (transport_type IN (
        'national', 'international', 'express', 'standard', 
        'freight', 'logistics', 'warehousing', 'distribution'
    )),
    service_frequency VARCHAR(50), -- 'one_time', 'weekly', 'monthly', 'daily'
    vehicle_types TEXT[], -- Types de véhicules requis
    special_requirements TEXT,
    
    -- Gestion commerciale
    assigned_to INTEGER REFERENCES personnel(id) NOT NULL,
    source VARCHAR(50) DEFAULT 'inbound',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    tags TEXT[],
    competitors TEXT[],
    
    -- Si perdu
    lost_reason TEXT,
    lost_to_competitor VARCHAR(255),
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES personnel(id),
    updated_by INTEGER REFERENCES personnel(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_to ON crm_opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close_date ON crm_opportunities(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_value ON crm_opportunities(value);

-- ========================================
-- 3. TABLE: crm_quotes (Devis)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_quotes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Relations
    opportunity_id INTEGER REFERENCES crm_opportunities(id),
    lead_id INTEGER REFERENCES crm_leads(id),
    client_id INTEGER REFERENCES client(id),
    
    -- Informations devis
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'cancelled'
    )),
    
    -- Dates
    valid_until DATE NOT NULL,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    
    -- Client info (snapshot)
    client_name VARCHAR(255) NOT NULL,
    client_company VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20),
    client_address TEXT,
    
    -- Calculs
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 19.00, -- TVA en Tunisie
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,
    
    -- Conditions
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(100),
    terms_conditions TEXT,
    notes TEXT,
    
    -- Statut
    rejection_reason TEXT,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES personnel(id) NOT NULL,
    approved_by INTEGER REFERENCES personnel(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON crm_quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON crm_quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON crm_quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON crm_quotes(valid_until);

-- ========================================
-- 4. TABLE: crm_quote_items (Lignes de devis)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES crm_quotes(id) ON DELETE CASCADE,
    
    -- Description service
    description TEXT NOT NULL,
    category VARCHAR(50) CHECK (category IN (
        'national', 'international', 'express', 'standard', 
        'freight', 'logistics', 'warehousing', 'distribution'
    )),
    
    -- Itinéraire
    origin_street VARCHAR(300),
    origin_city VARCHAR(100),
    origin_postal_code VARCHAR(20),
    origin_country VARCHAR(3) DEFAULT 'TUN',
    
    destination_street VARCHAR(300),
    destination_city VARCHAR(100),
    destination_postal_code VARCHAR(20),
    destination_country VARCHAR(3) DEFAULT 'TUN',
    
    -- Détails transport
    distance_km DECIMAL(8,2),
    weight_kg DECIMAL(10,2),
    volume_m3 DECIMAL(10,2),
    vehicle_type VARCHAR(50) CHECK (vehicle_type IN (
        'van', 'truck_3_5t', 'truck_7_5t', 'truck_12t', 
        'truck_19t', 'truck_26t', 'semi_trailer', 'container'
    )),
    service_type VARCHAR(50) CHECK (service_type IN (
        'pickup_delivery', 'door_to_door', 'express_delivery', 
        'scheduled_delivery', 'same_day', 'next_day', 
        'warehousing', 'packaging', 'insurance'
    )),
    
    -- Prix
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    
    -- Métadonnées
    line_order INTEGER DEFAULT 1,
    notes TEXT
);

-- Index
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON crm_quote_items(quote_id);

-- ========================================
-- 5. TABLE: crm_activities (Activités)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_activities (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Type et contenu
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'call', 'email', 'meeting', 'task', 'note', 'appointment',
        'follow_up', 'presentation', 'proposal', 'negotiation', 'visit', 'demo'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Statut
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'no_show'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Relations CRM
    lead_id INTEGER REFERENCES crm_leads(id),
    opportunity_id INTEGER REFERENCES crm_opportunities(id),
    quote_id INTEGER REFERENCES crm_quotes(id),
    client_id INTEGER REFERENCES client(id),
    
    -- Dates et durée
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP,
    duration_minutes INTEGER,
    reminder_at TIMESTAMP,
    
    -- Localisation
    location VARCHAR(255),
    meeting_link VARCHAR(500), -- Lien Teams/Zoom
    
    -- Gestion
    assigned_to INTEGER REFERENCES personnel(id) NOT NULL,
    created_by INTEGER REFERENCES personnel(id) NOT NULL,
    
    -- Résultats
    outcome TEXT,
    next_steps TEXT,
    follow_up_date TIMESTAMP,
    
    -- Récurrence
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern JSONB, -- Pattern de récurrence
    parent_activity_id INTEGER REFERENCES crm_activities(id),
    
    -- Métadonnées
    tags TEXT[],
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_activities_type ON crm_activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_status ON crm_activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to ON crm_activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled_at ON crm_activities(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON crm_activities(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_opportunity_id ON crm_activities(opportunity_id);

-- ========================================
-- 6. TABLE: crm_activity_participants (Participants aux activités)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_activity_participants (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES crm_activities(id) ON DELETE CASCADE,
    
    -- Participant
    participant_type VARCHAR(20) CHECK (participant_type IN ('internal', 'client', 'partner', 'vendor')),
    personnel_id INTEGER REFERENCES personnel(id), -- Si interne
    full_name VARCHAR(255) NOT NULL, -- Nom complet
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Réponse
    response_status VARCHAR(20) DEFAULT 'pending' CHECK (response_status IN (
        'pending', 'accepted', 'declined', 'tentative'
    )),
    response_date TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_activity_participants_activity_id ON crm_activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_participants_personnel_id ON crm_activity_participants(personnel_id);

-- ========================================
-- 7. TABLE: crm_pipelines (Pipelines personnalisés)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_pipelines (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES personnel(id) NOT NULL
);

-- ========================================
-- 8. TABLE: crm_pipeline_stages (Étapes des pipelines)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
    id SERIAL PRIMARY KEY,
    pipeline_id INTEGER REFERENCES crm_pipelines(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6c757d', -- Couleur hex
    stage_order INTEGER NOT NULL,
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    is_active BOOLEAN DEFAULT true,
    
    -- Mapping avec enum
    stage_enum VARCHAR(50) CHECK (stage_enum IN (
        'prospecting', 'qualification', 'needs_analysis', 
        'proposal', 'negotiation', 'closed_won', 'closed_lost'
    )),
    
    -- Règles
    required_fields TEXT[], -- Champs obligatoires
    auto_advance_days INTEGER, -- Auto-avancement après X jours
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON crm_pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON crm_pipeline_stages(stage_order);

-- ========================================
-- 9. TABLE: crm_attachments (Pièces jointes CRM)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_attachments (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Relations
    lead_id INTEGER REFERENCES crm_leads(id),
    opportunity_id INTEGER REFERENCES crm_opportunities(id),
    quote_id INTEGER REFERENCES crm_quotes(id),
    activity_id INTEGER REFERENCES crm_activities(id),
    
    -- Fichier
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    mime_type VARCHAR(100),
    
    -- Métadonnées
    title VARCHAR(255),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    
    -- Audit
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER REFERENCES personnel(id) NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_attachments_lead_id ON crm_attachments(lead_id);
CREATE INDEX IF NOT EXISTS idx_attachments_opportunity_id ON crm_attachments(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_quote_id ON crm_attachments(quote_id);
CREATE INDEX IF NOT EXISTS idx_attachments_activity_id ON crm_attachments(activity_id);

-- ========================================
-- 10. TABLE: crm_tags (Tags CRM)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#6c757d',
    description TEXT,
    category VARCHAR(50), -- 'lead', 'opportunity', 'general'
    
    -- Usage
    usage_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES personnel(id)
);

-- ========================================
-- TRIGGERS pour updated_at automatique
-- ========================================

-- Fonction générique pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers (avec IF NOT EXISTS simulé)
DROP TRIGGER IF EXISTS trigger_leads_updated_at ON crm_leads;
CREATE TRIGGER trigger_leads_updated_at BEFORE UPDATE ON crm_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_opportunities_updated_at ON crm_opportunities;
CREATE TRIGGER trigger_opportunities_updated_at BEFORE UPDATE ON crm_opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_quotes_updated_at ON crm_quotes;
CREATE TRIGGER trigger_quotes_updated_at BEFORE UPDATE ON crm_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_activities_updated_at ON crm_activities;
CREATE TRIGGER trigger_activities_updated_at BEFORE UPDATE ON crm_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_pipelines_updated_at ON crm_pipelines;
CREATE TRIGGER trigger_pipelines_updated_at BEFORE UPDATE ON crm_pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_pipeline_stages_updated_at ON crm_pipeline_stages;
CREATE TRIGGER trigger_pipeline_stages_updated_at BEFORE UPDATE ON crm_pipeline_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VUES UTILES
-- ========================================

-- Vue: Résumé des prospects par commercial (CORRIGÉE)
DROP VIEW IF EXISTS view_leads_by_sales;
CREATE VIEW view_leads_by_sales AS
SELECT 
    p.id as personnel_id,
    p.prenom || ' ' || p.nom as sales_person,
    COUNT(l.id) as total_leads,
    COUNT(CASE WHEN l.status = 'new' THEN 1 END) as new_leads,
    COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) as qualified_leads,
    COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads,
    SUM(l.estimated_value) as total_estimated_value
FROM personnel p
LEFT JOIN crm_leads l ON p.id = l.assigned_to
WHERE p.role = 'commercial' OR p.role = 'administratif'
GROUP BY p.id, p.prenom, p.nom;

-- Vue: Pipeline des opportunités
DROP VIEW IF EXISTS view_opportunities_pipeline;
CREATE VIEW view_opportunities_pipeline AS
SELECT 
    o.stage,
    COUNT(o.id) as opportunity_count,
    SUM(o.value) as total_value,
    AVG(o.probability) as avg_probability,
    SUM(o.value * o.probability / 100) as weighted_value
FROM crm_opportunities o
WHERE o.stage NOT IN ('closed_won', 'closed_lost')
GROUP BY o.stage
ORDER BY 
    CASE o.stage
        WHEN 'prospecting' THEN 1
        WHEN 'qualification' THEN 2
        WHEN 'needs_analysis' THEN 3
        WHEN 'proposal' THEN 4
        WHEN 'negotiation' THEN 5
    END;

-- ========================================
-- DONNÉES INITIALES
-- ========================================

-- Pipeline par défaut (avec protection contre la duplication)
INSERT INTO crm_pipelines (name, description, is_default, created_by) 
SELECT 'Pipeline Standard Transport', 'Pipeline par défaut pour les opportunités de transport', true, 1
WHERE NOT EXISTS (SELECT 1 FROM crm_pipelines WHERE name = 'Pipeline Standard Transport');

-- Étapes du pipeline par défaut
DO $$
DECLARE
    pipeline_id_val INTEGER;
BEGIN
    -- Récupérer l'ID du pipeline par défaut
    SELECT id INTO pipeline_id_val FROM crm_pipelines WHERE name = 'Pipeline Standard Transport' LIMIT 1;
    
    IF pipeline_id_val IS NOT NULL THEN
        -- Insérer les étapes seulement si elles n'existent pas
        INSERT INTO crm_pipeline_stages (pipeline_id, name, description, color, stage_order, probability, stage_enum)
        SELECT pipeline_id_val, 'Prospection', 'Identification et premier contact', '#17a2b8', 1, 10, 'prospecting'
        WHERE NOT EXISTS (SELECT 1 FROM crm_pipeline_stages WHERE pipeline_id = pipeline_id_val AND stage_enum = 'prospecting');
        
        INSERT INTO crm_pipeline_stages (pipeline_id, name, description, color, stage_order, probability, stage_enum)
        SELECT pipeline_id_val, 'Qualification', 'Validation du besoin et du budget', '#ffc107', 2, 25, 'qualification'
        WHERE NOT EXISTS (SELECT 1 FROM crm_pipeline_stages WHERE pipeline_id = pipeline_id_val AND stage_enum = 'qualification');
        
        INSERT INTO crm_pipeline_stages (pipeline_id, name, description, color, stage_order, probability, stage_enum)
        SELECT pipeline_id_val, 'Analyse des besoins', 'Étude détaillée des besoins transport', '#fd7e14', 3, 50, 'needs_analysis'
        WHERE NOT EXISTS (SELECT 1 FROM crm_pipeline_stages WHERE pipeline_id = pipeline_id_val AND stage_enum = 'needs_analysis');
        
        INSERT INTO crm_pipeline_stages (pipeline_id, name, description, color, stage_order, probability, stage_enum)
        SELECT pipeline_id_val, 'Proposition/Devis', 'Envoi de la proposition commerciale', '#6f42c1', 4, 75, 'proposal'
        WHERE NOT EXISTS (SELECT 1 FROM crm_pipeline_stages WHERE pipeline_id = pipeline_id_val AND stage_enum = 'proposal');
        
        INSERT INTO crm_pipeline_stages (pipeline_id, name, description, color, stage_order, probability, stage_enum)
        SELECT pipeline_id_val, 'Négociation', 'Négociation des conditions', '#e83e8c', 5, 90, 'negotiation'
        WHERE NOT EXISTS (SELECT 1 FROM crm_pipeline_stages WHERE pipeline_id = pipeline_id_val AND stage_enum = 'negotiation');
        
        INSERT INTO crm_pipeline_stages (pipeline_id, name, description, color, stage_order, probability, stage_enum)
        SELECT pipeline_id_val, 'Gagné', 'Opportunité convertie en client', '#28a745', 6, 100, 'closed_won'
        WHERE NOT EXISTS (SELECT 1 FROM crm_pipeline_stages WHERE pipeline_id = pipeline_id_val AND stage_enum = 'closed_won');
        
        INSERT INTO crm_pipeline_stages (pipeline_id, name, description, color, stage_order, probability, stage_enum)
        SELECT pipeline_id_val, 'Perdu', 'Opportunité non convertie', '#dc3545', 6, 0, 'closed_lost'
        WHERE NOT EXISTS (SELECT 1 FROM crm_pipeline_stages WHERE pipeline_id = pipeline_id_val AND stage_enum = 'closed_lost');
    END IF;
END
$$;

-- Tags par défaut (avec protection contre la duplication)
INSERT INTO crm_tags (name, color, category, created_by)
SELECT 'Transport Express', '#dc3545', 'lead', 1
WHERE NOT EXISTS (SELECT 1 FROM crm_tags WHERE name = 'Transport Express');

INSERT INTO crm_tags (name, color, category, created_by)
SELECT 'Transport National', '#007bff', 'lead', 1
WHERE NOT EXISTS (SELECT 1 FROM crm_tags WHERE name = 'Transport National');

INSERT INTO crm_tags (name, color, category, created_by)
SELECT 'Transport International', '#28a745', 'lead', 1
WHERE NOT EXISTS (SELECT 1 FROM crm_tags WHERE name = 'Transport International');

INSERT INTO crm_tags (name, color, category, created_by)
SELECT 'Logistique', '#ffc107', 'lead', 1
WHERE NOT EXISTS (SELECT 1 FROM crm_tags WHERE name = 'Logistique');

INSERT INTO crm_tags (name, color, category, created_by)
SELECT 'Entreposage', '#6f42c1', 'lead', 1
WHERE NOT EXISTS (SELECT 1 FROM crm_tags WHERE name = 'Entreposage');

INSERT INTO crm_tags (name, color, category, created_by)
SELECT 'Client Premium', '#fd7e14', 'opportunity', 1
WHERE NOT EXISTS (SELECT 1 FROM crm_tags WHERE name = 'Client Premium');

INSERT INTO crm_tags (name, color, category, created_by)
SELECT 'Urgent', '#dc3545', 'general', 1
WHERE NOT EXISTS (SELECT 1 FROM crm_tags WHERE name = 'Urgent');

INSERT INTO crm_tags (name, color, category, created_by)
SELECT 'Suivi Régulier', '#17a2b8', 'general', 1
WHERE NOT EXISTS (SELECT 1 FROM crm_tags WHERE name = 'Suivi Régulier');

-- ========================================
-- COMMENTAIRES FINAUX
-- ========================================

COMMENT ON TABLE crm_leads IS 'Table des prospects - Contacts potentiels non encore clients';
COMMENT ON TABLE crm_opportunities IS 'Table des opportunités - Prospects qualifiés avec potentiel de vente';
COMMENT ON TABLE crm_quotes IS 'Table des devis - Propositions commerciales envoyées';
COMMENT ON TABLE crm_quote_items IS 'Lignes de détail des devis avec services transport';
COMMENT ON TABLE crm_activities IS 'Activités CRM - Appels, emails, rendez-vous, taches';
COMMENT ON TABLE crm_activity_participants IS 'Participants aux activités CRM';
COMMENT ON TABLE crm_pipelines IS 'Pipelines de vente personnalisables';
COMMENT ON TABLE crm_pipeline_stages IS 'Étapes des pipelines de vente';
COMMENT ON TABLE crm_attachments IS 'Pièces jointes liées aux entités CRM';
COMMENT ON TABLE crm_tags IS 'Tags pour catégoriser les éléments CRM';

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_name LIKE 'crm_%' AND table_schema = 'public';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'INSTALLATION CRM TERMINÉE AVEC SUCCÈS !';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Nombre de tables CRM créées: %', table_count;
    RAISE NOTICE 'Tables créées: crm_leads, crm_opportunities, crm_quotes, crm_quote_items,';
    RAISE NOTICE '               crm_activities, crm_activity_participants, crm_pipelines,';
    RAISE NOTICE '               crm_pipeline_stages, crm_attachments, crm_tags';
    RAISE NOTICE 'Vues créées: view_leads_by_sales, view_opportunities_pipeline';
    RAISE NOTICE 'Pipeline par défaut et tags installés.';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Le système CRM Velosi est prêt à être utilisé !';
    RAISE NOTICE '===========================================';
END
$$;