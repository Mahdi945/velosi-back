-- ===================================================================
-- Migration 009: Ajouter organisation_id à TOUTES les tables du système
-- ===================================================================
-- Description: Cette migration ajoute le champ organisation_id à toutes les
--             tables pour un vrai système multi-tenant avec isolation des données
-- Date: 2025-12-20
-- ===================================================================

-- ===================================================================
-- PARTIE 1: TABLES CRM
-- ===================================================================

-- Table crm_leads
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN crm_leads.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_crm_leads_organisation_id ON crm_leads(organisation_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_org_status ON crm_leads(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_org_created_at ON crm_leads(organisation_id, created_at DESC);

-- Table crm_opportunities
ALTER TABLE crm_opportunities 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN crm_opportunities.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_organisation_id ON crm_opportunities(organisation_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_org_stage ON crm_opportunities(organisation_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_org_created_at ON crm_opportunities(organisation_id, "createdAt" DESC);

-- Table crm_activities
ALTER TABLE crm_activities 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN crm_activities.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_crm_activities_organisation_id ON crm_activities(organisation_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_org_type ON crm_activities(organisation_id, type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_org_date ON crm_activities(organisation_id, scheduled_date);

-- ===================================================================
-- PARTIE 2: TABLES DE RÉFÉRENCE (Données partagées entre organisations)
-- ===================================================================

-- Table armateurs
ALTER TABLE armateurs 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN armateurs.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_armateurs_organisation_id ON armateurs(organisation_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_armateurs_org_code ON armateurs(organisation_id, code);

-- Table navires
ALTER TABLE navires 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN navires.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_navires_organisation_id ON navires(organisation_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_navires_org_nom ON navires(organisation_id, nom);

-- Table ports
ALTER TABLE ports 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN ports.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_ports_organisation_id ON ports(organisation_id);

-- Table aeroports
ALTER TABLE aeroports 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN aeroports.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_aeroports_organisation_id ON aeroports(organisation_id);

-- Table correspondants
ALTER TABLE correspondants 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN correspondants.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_correspondants_organisation_id ON correspondants(organisation_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_correspondants_org_code ON correspondants(organisation_id, code);

-- Table fournisseurs
ALTER TABLE fournisseurs 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN fournisseurs.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_fournisseurs_organisation_id ON fournisseurs(organisation_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fournisseurs_org_code ON fournisseurs(organisation_id, code);

-- Table type_frais_annexes
ALTER TABLE type_frais_annexes 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN type_frais_annexes.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_type_frais_annexes_organisation_id ON type_frais_annexes(organisation_id);

-- ===================================================================
-- PARTIE 3: TABLES DE DOCUMENTS ET COTATIONS
-- ===================================================================

-- Table quotes (cotations)
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN quotes.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_quotes_organisation_id ON quotes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_quotes_org_client ON quotes(organisation_id, client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_org_created_at ON quotes(organisation_id, "createdAt" DESC);

-- Table quote_items
ALTER TABLE quote_items 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN quote_items.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_quote_items_organisation_id ON quote_items(organisation_id);

-- Table quote_frais_annexes
ALTER TABLE quote_frais_annexes 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN quote_frais_annexes.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_quote_frais_annexes_organisation_id ON quote_frais_annexes(organisation_id);

-- ===================================================================
-- PARTIE 4: TABLES FINANCIÈRES
-- ===================================================================

-- Table factures
ALTER TABLE factures 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN factures.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_factures_organisation_id ON factures(organisation_id);
CREATE INDEX IF NOT EXISTS idx_factures_org_client ON factures(organisation_id, client_id);

-- Table reglements
ALTER TABLE reglements 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN reglements.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_reglements_organisation_id ON reglements(organisation_id);

-- ===================================================================
-- PARTIE 5: TABLES DE GESTION
-- ===================================================================

-- Table objectif_com
ALTER TABLE objectif_com 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN objectif_com.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_objectif_com_organisation_id ON objectif_com(organisation_id);

-- Table messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN messages.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_messages_organisation_id ON messages(organisation_id);

-- Table conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN conversations.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_conversations_organisation_id ON conversations(organisation_id);

-- Table login_history
ALTER TABLE login_history 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN login_history.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_login_history_organisation_id ON login_history(organisation_id);

-- Table contact_client
ALTER TABLE contact_client 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN contact_client.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_contact_client_organisation_id ON contact_client(organisation_id);

-- Table "AutorisationsTVA"
ALTER TABLE "AutorisationsTVA" 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN "AutorisationsTVA".organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_autorisations_tva_organisation_id ON "AutorisationsTVA"(organisation_id);

-- Table "BCsusTVA"
ALTER TABLE "BCsusTVA" 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN "BCsusTVA".organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

CREATE INDEX IF NOT EXISTS idx_bcs_us_tva_organisation_id ON "BCsusTVA"(organisation_id);

-- ===================================================================
-- PARTIE 6: VÉRIFICATIONS ET RÉSUMÉ
-- ===================================================================

-- Vérifier que tous les enregistrements ont un organisation_id valide
DO $$
DECLARE
    r RECORD;
    table_list TEXT[] := ARRAY[
        'personnel', 'client', 'crm_leads', 'crm_opportunities', 'crm_activities',
        'armateurs', 'navires', 'ports', 'aeroports', 'correspondants', 'fournisseurs',
        'type_frais_annexes', 'quotes', 'quote_items', 'quote_frais_annexes',
        'factures', 'reglements', 'objectif_com', 'messages', 'conversations',
        'login_history', 'contact_client', 'AutorisationsTVA', 'BCsusTVA'
    ];
    table_name TEXT;
    invalid_count INTEGER;
BEGIN
    FOREACH table_name IN ARRAY table_list
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE organisation_id IS NULL OR organisation_id = 0', table_name) INTO invalid_count;
        IF invalid_count > 0 THEN
            RAISE WARNING 'ATTENTION: % enregistrements dans % n''ont pas d''organisation_id valide !', invalid_count, table_name;
        END IF;
    END LOOP;
END $$;

-- Afficher un résumé par table
DO $$
DECLARE
    r RECORD;
    table_list TEXT[] := ARRAY[
        'personnel', 'client', 'crm_leads', 'crm_opportunities', 'crm_activities',
        'armateurs', 'navires', 'ports', 'aeroports', 'correspondants', 'fournisseurs',
        'quotes', 'factures', 'objectif_com', 'login_history'
    ];
    table_name TEXT;
    sql_query TEXT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RÉSUMÉ PAR ORGANISATION';
    RAISE NOTICE '========================================';
    
    FOREACH table_name IN ARRAY table_list
    LOOP
        sql_query := format('SELECT %L as table_name, organisation_id, COUNT(*) as count FROM %I GROUP BY organisation_id', table_name, table_name);
        FOR r IN EXECUTE sql_query
        LOOP
            RAISE NOTICE 'Table: % | Org ID: % | Count: %', r.table_name, r.organisation_id, r.count;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '========================================';
END $$;

-- ===================================================================
-- FIN DE LA MIGRATION 009
-- ===================================================================
