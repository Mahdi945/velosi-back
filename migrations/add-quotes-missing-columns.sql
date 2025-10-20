-- ========================================
-- Migration: Ajouter TOUTES les colonnes manquantes à la table crm_quotes
-- Date: 2025-10-18
-- Description: Synchronisation complète avec l'entité Quote TypeORM
-- ========================================

-- Fonction pour vérifier et ajouter une colonne
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    table_name TEXT,
    column_name TEXT,
    column_definition TEXT
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = table_name AND column_name = column_name
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', table_name, column_name, column_definition);
        RAISE NOTICE 'Colonne % ajoutée à %', column_name, table_name;
    ELSE
        RAISE NOTICE 'Colonne % existe déjà dans %', column_name, table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- AJOUTER TOUTES LES COLONNES MANQUANTES
-- ========================================

DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Début de la migration crm_quotes';
    RAISE NOTICE '========================================';

    -- 1. COMMERCIAL_ID (relation avec personnel)
    PERFORM add_column_if_not_exists('crm_quotes', 'commercial_id', 'INTEGER');
    
    -- 2. CHAMPS TRANSPORT SPÉCIFIQUES
    PERFORM add_column_if_not_exists('crm_quotes', 'country', 'VARCHAR(3) DEFAULT ''TUN''');
    PERFORM add_column_if_not_exists('crm_quotes', 'tiers', 'VARCHAR(100)');
    PERFORM add_column_if_not_exists('crm_quotes', 'attention_to', 'VARCHAR(200)');
    PERFORM add_column_if_not_exists('crm_quotes', 'pickup_location', 'TEXT');
    PERFORM add_column_if_not_exists('crm_quotes', 'delivery_location', 'TEXT');
    PERFORM add_column_if_not_exists('crm_quotes', 'transit_time', 'VARCHAR(100)');
    PERFORM add_column_if_not_exists('crm_quotes', 'departure_frequency', 'VARCHAR(100)');
    PERFORM add_column_if_not_exists('crm_quotes', 'client_type', 'VARCHAR(50)');
    PERFORM add_column_if_not_exists('crm_quotes', 'import_export', 'VARCHAR(50)');
    PERFORM add_column_if_not_exists('crm_quotes', 'file_status', 'VARCHAR(50)');
    PERFORM add_column_if_not_exists('crm_quotes', 'terms', 'VARCHAR(100)');
    PERFORM add_column_if_not_exists('crm_quotes', 'payment_method', 'VARCHAR(100)');
    PERFORM add_column_if_not_exists('crm_quotes', 'payment_conditions', 'TEXT');
    PERFORM add_column_if_not_exists('crm_quotes', 'requester', 'VARCHAR(200)');
    PERFORM add_column_if_not_exists('crm_quotes', 'vehicle_id', 'INTEGER');

    -- 3. TOTAUX FINANCIERS SPÉCIFIQUES
    PERFORM add_column_if_not_exists('crm_quotes', 'freight_purchased', 'DECIMAL(12,2) DEFAULT 0');
    PERFORM add_column_if_not_exists('crm_quotes', 'freight_offered', 'DECIMAL(12,2) DEFAULT 0');
    PERFORM add_column_if_not_exists('crm_quotes', 'freight_margin', 'DECIMAL(12,2) DEFAULT 0');
    PERFORM add_column_if_not_exists('crm_quotes', 'additional_costs_purchased', 'DECIMAL(12,2) DEFAULT 0');
    PERFORM add_column_if_not_exists('crm_quotes', 'additional_costs_offered', 'DECIMAL(12,2) DEFAULT 0');
    PERFORM add_column_if_not_exists('crm_quotes', 'total_purchases', 'DECIMAL(12,2) DEFAULT 0');
    PERFORM add_column_if_not_exists('crm_quotes', 'total_offers', 'DECIMAL(12,2) DEFAULT 0');
    PERFORM add_column_if_not_exists('crm_quotes', 'total_margin', 'DECIMAL(12,2) DEFAULT 0');

    -- 4. NOTES ET INSTRUCTIONS SUPPLÉMENTAIRES
    PERFORM add_column_if_not_exists('crm_quotes', 'internal_instructions', 'TEXT');
    PERFORM add_column_if_not_exists('crm_quotes', 'customer_request', 'TEXT');
    PERFORM add_column_if_not_exists('crm_quotes', 'exchange_notes', 'TEXT');

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Colonnes ajoutées avec succès';
    RAISE NOTICE '========================================';
END $$;

-- ========================================
-- AJOUTER LES CONTRAINTES ET INDEX
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Ajout des contraintes et index';
    RAISE NOTICE '========================================';

    -- Ajouter la contrainte de clé étrangère pour commercial_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_quotes_commercial'
    ) THEN
        ALTER TABLE crm_quotes ADD CONSTRAINT fk_quotes_commercial 
            FOREIGN KEY (commercial_id) REFERENCES personnel(id) ON DELETE SET NULL;
        RAISE NOTICE 'Contrainte fk_quotes_commercial ajoutée';
    END IF;

    -- Ajouter la contrainte de clé étrangère pour vehicle_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engin') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_quotes_vehicle'
        ) THEN
            ALTER TABLE crm_quotes ADD CONSTRAINT fk_quotes_vehicle 
                FOREIGN KEY (vehicle_id) REFERENCES engin(id) ON DELETE SET NULL;
            RAISE NOTICE 'Contrainte fk_quotes_vehicle ajoutée';
        END IF;
    END IF;

END $$;

-- ========================================
-- AJOUTER DES INDEX POUR LES PERFORMANCES
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Création des index';
    RAISE NOTICE '========================================';
END $$;

CREATE INDEX IF NOT EXISTS idx_quotes_commercial_id ON crm_quotes(commercial_id);
CREATE INDEX IF NOT EXISTS idx_quotes_vehicle_id ON crm_quotes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_quotes_country ON crm_quotes(country);
CREATE INDEX IF NOT EXISTS idx_quotes_client_type ON crm_quotes(client_type);

-- ========================================
-- AJOUTER DES COMMENTAIRES POUR LA DOCUMENTATION
-- ========================================

COMMENT ON COLUMN crm_quotes.commercial_id IS 'Commercial assigné au devis';
COMMENT ON COLUMN crm_quotes.country IS 'Code pays (ISO 3 lettres)';
COMMENT ON COLUMN crm_quotes.tiers IS 'Tiers';
COMMENT ON COLUMN crm_quotes.attention_to IS 'L''Attention De';
COMMENT ON COLUMN crm_quotes.pickup_location IS 'Enlèvement/Frs';
COMMENT ON COLUMN crm_quotes.delivery_location IS 'Livraison/Dist';
COMMENT ON COLUMN crm_quotes.transit_time IS 'Transit-Time';
COMMENT ON COLUMN crm_quotes.departure_frequency IS 'Fréquence-Départ';
COMMENT ON COLUMN crm_quotes.client_type IS 'Client/Prospect/Correspondant';
COMMENT ON COLUMN crm_quotes.import_export IS 'Import/Export';
COMMENT ON COLUMN crm_quotes.file_status IS 'Statut du dossier (COMPLET, etc.)';
COMMENT ON COLUMN crm_quotes.terms IS 'Termes';
COMMENT ON COLUMN crm_quotes.payment_method IS 'Méthode de paiement';
COMMENT ON COLUMN crm_quotes.payment_conditions IS 'Conditions de paiement';
COMMENT ON COLUMN crm_quotes.requester IS 'Demandeur';
COMMENT ON COLUMN crm_quotes.vehicle_id IS 'Engin assigné';
COMMENT ON COLUMN crm_quotes.freight_purchased IS 'Fret Acheté';
COMMENT ON COLUMN crm_quotes.freight_offered IS 'Fret Offert';
COMMENT ON COLUMN crm_quotes.freight_margin IS 'Marge sur le Fret';
COMMENT ON COLUMN crm_quotes.additional_costs_purchased IS 'Achats Frais Annexes';
COMMENT ON COLUMN crm_quotes.additional_costs_offered IS 'Frais Annexes Offerts';
COMMENT ON COLUMN crm_quotes.total_purchases IS 'Total Achats';
COMMENT ON COLUMN crm_quotes.total_offers IS 'Total Offres';
COMMENT ON COLUMN crm_quotes.total_margin IS 'Marge Totale';
COMMENT ON COLUMN crm_quotes.internal_instructions IS 'Instructions Internes';
COMMENT ON COLUMN crm_quotes.customer_request IS 'Demande du Client';
COMMENT ON COLUMN crm_quotes.exchange_notes IS 'Notes d''Échange';

-- ========================================
-- NETTOYER LA FONCTION TEMPORAIRE
-- ========================================

DROP FUNCTION IF EXISTS add_column_if_not_exists(TEXT, TEXT, TEXT);

-- ========================================
-- MESSAGE FINAL
-- ========================================

DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration terminée avec succès!';
    RAISE NOTICE 'Toutes les colonnes ont été ajoutées à crm_quotes';
    RAISE NOTICE '========================================';
END $$;
