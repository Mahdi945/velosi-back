-- ========================================
-- Migration: Ajouter TOUTES les colonnes manquantes à la table crm_quote_items
-- Date: 2025-10-18
-- Description: Synchronisation complète avec l'entité QuoteItem TypeORM
-- ========================================

-- Fonction pour vérifier et ajouter une colonne si elle n'existe pas
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    tbl_name TEXT,
    col_name TEXT,
    col_def TEXT
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = tbl_name AND column_name = col_name
    ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', tbl_name, col_name, col_def);
        RAISE NOTICE '✅ Colonne "%" ajoutée à "%"', col_name, tbl_name;
    ELSE
        RAISE NOTICE 'ℹ️ Colonne "%" existe déjà dans "%"', col_name, tbl_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- AJOUTER TOUTES LES COLONNES MANQUANTES
-- ========================================

DO $$ 
BEGIN
    RAISE NOTICE '🚀 Début de la migration crm_quote_items';

    -- 1. CHAMPS DE BASE
    PERFORM add_column_if_not_exists('crm_quote_items', 'description', 'TEXT');
    PERFORM add_column_if_not_exists('crm_quote_items', 'category', 'VARCHAR(50)');

    -- 2. CARGO / MARCHANDISE
    PERFORM add_column_if_not_exists('crm_quote_items', 'vehicle_description', 'VARCHAR(200)');
    PERFORM add_column_if_not_exists('crm_quote_items', 'cargo_designation', 'TEXT');
    PERFORM add_column_if_not_exists('crm_quote_items', 'packages_count', 'INTEGER');
    PERFORM add_column_if_not_exists('crm_quote_items', 'weight_kg', 'DECIMAL(10,2)');

    -- 3. ORIGINE
    PERFORM add_column_if_not_exists('crm_quote_items', 'origin_street', 'VARCHAR(300)');
    PERFORM add_column_if_not_exists('crm_quote_items', 'origin_city', 'VARCHAR(100)');
    PERFORM add_column_if_not_exists('crm_quote_items', 'origin_postal_code', 'VARCHAR(20)');
    PERFORM add_column_if_not_exists('crm_quote_items', 'origin_country', 'VARCHAR(3) DEFAULT ''TUN''');

    -- 4. DESTINATION
    PERFORM add_column_if_not_exists('crm_quote_items', 'destination_street', 'VARCHAR(300)');
    PERFORM add_column_if_not_exists('crm_quote_items', 'destination_city', 'VARCHAR(100)');
    PERFORM add_column_if_not_exists('crm_quote_items', 'destination_postal_code', 'VARCHAR(20)');
    PERFORM add_column_if_not_exists('crm_quote_items', 'destination_country', 'VARCHAR(3) DEFAULT ''TUN''');

    -- 5. TRANSPORT
    PERFORM add_column_if_not_exists('crm_quote_items', 'distance_km', 'DECIMAL(8,2)');
    PERFORM add_column_if_not_exists('crm_quote_items', 'volume_m3', 'DECIMAL(10,2)');
    PERFORM add_column_if_not_exists('crm_quote_items', 'vehicle_type', 'VARCHAR(50)');
    PERFORM add_column_if_not_exists('crm_quote_items', 'service_type', 'VARCHAR(50)');

    -- 6. PRIX ET QUANTITÉS
    PERFORM add_column_if_not_exists('crm_quote_items', 'quantity', 'DECIMAL(10,2) DEFAULT 1');
    PERFORM add_column_if_not_exists('crm_quote_items', 'unit_price', 'DECIMAL(10,2) DEFAULT 0');
    PERFORM add_column_if_not_exists('crm_quote_items', 'total_price', 'DECIMAL(12,2) DEFAULT 0');

    -- 7. PRIX D'ACHAT ET MARGE
    PERFORM add_column_if_not_exists('crm_quote_items', 'purchase_price', 'DECIMAL(10,2) DEFAULT 0');
    PERFORM add_column_if_not_exists('crm_quote_items', 'selling_price', 'DECIMAL(10,2) DEFAULT 0');
    PERFORM add_column_if_not_exists('crm_quote_items', 'margin', 'DECIMAL(10,2) DEFAULT 0');

    -- 8. TYPE DE LIGNE
    PERFORM add_column_if_not_exists('crm_quote_items', 'item_type', 'VARCHAR(50) DEFAULT ''freight''');

    -- 9. MÉTADONNÉES
    PERFORM add_column_if_not_exists('crm_quote_items', 'line_order', 'INTEGER DEFAULT 1');
    PERFORM add_column_if_not_exists('crm_quote_items', 'notes', 'TEXT');

    RAISE NOTICE '✅ Colonnes ajoutées avec succès à crm_quote_items';
END $$;

-- ========================================
-- CONTRAINTES CHECK
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '⚙️ Ajout des contraintes CHECK';

    -- CATEGORY
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_quote_items_category'
    ) THEN
        ALTER TABLE crm_quote_items ADD CONSTRAINT chk_quote_items_category 
            CHECK (category IN ('national','international','express','standard','freight','logistics','warehousing','distribution'));
    END IF;

    -- VEHICLE_TYPE
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_quote_items_vehicle_type'
    ) THEN
        ALTER TABLE crm_quote_items ADD CONSTRAINT chk_quote_items_vehicle_type 
            CHECK (vehicle_type IN ('van','truck_3_5t','truck_7_5t','truck_12t','truck_19t','truck_26t','semi_trailer','container'));
    END IF;

    -- SERVICE_TYPE
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_quote_items_service_type'
    ) THEN
        ALTER TABLE crm_quote_items ADD CONSTRAINT chk_quote_items_service_type 
            CHECK (service_type IN ('pickup_delivery','door_to_door','express_delivery','scheduled_delivery','same_day','next_day','warehousing','packaging','insurance'));
    END IF;

    -- ITEM_TYPE
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_quote_items_item_type'
    ) THEN
        ALTER TABLE crm_quote_items ADD CONSTRAINT chk_quote_items_item_type 
            CHECK (item_type IN ('freight','additional_cost'));
    END IF;

    -- QUANTITY
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_quote_items_quantity_positive'
    ) THEN
        ALTER TABLE crm_quote_items ADD CONSTRAINT chk_quote_items_quantity_positive 
            CHECK (quantity > 0);
    END IF;

END $$;

-- ========================================
-- INDEX
-- ========================================

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON crm_quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_category ON crm_quote_items(category);
CREATE INDEX IF NOT EXISTS idx_quote_items_item_type ON crm_quote_items(item_type);
CREATE INDEX IF NOT EXISTS idx_quote_items_line_order ON crm_quote_items(line_order);
CREATE INDEX IF NOT EXISTS idx_quote_items_origin_city ON crm_quote_items(origin_city);
CREATE INDEX IF NOT EXISTS idx_quote_items_destination_city ON crm_quote_items(destination_city);

-- ========================================
-- COMMENTAIRES
-- ========================================

COMMENT ON COLUMN crm_quote_items.description IS 'Description du service ou de la ligne';
COMMENT ON COLUMN crm_quote_items.category IS 'Catégorie de service (national, international, etc.)';
COMMENT ON COLUMN crm_quote_items.vehicle_description IS 'Description du véhicule';
COMMENT ON COLUMN crm_quote_items.cargo_designation IS 'Désignation de la marchandise';
COMMENT ON COLUMN crm_quote_items.packages_count IS 'Nombre de colis';
COMMENT ON COLUMN crm_quote_items.weight_kg IS 'Poids en kilogrammes';
COMMENT ON COLUMN crm_quote_items.origin_city IS 'Ville d''origine';
COMMENT ON COLUMN crm_quote_items.destination_city IS 'Ville de destination';
COMMENT ON COLUMN crm_quote_items.vehicle_type IS 'Type de véhicule utilisé';
COMMENT ON COLUMN crm_quote_items.service_type IS 'Type de service (pickup, express, etc.)';
COMMENT ON COLUMN crm_quote_items.quantity IS 'Quantité du service ou marchandise';
COMMENT ON COLUMN crm_quote_items.unit_price IS 'Prix unitaire HT';
COMMENT ON COLUMN crm_quote_items.total_price IS 'Prix total HT de la ligne';
COMMENT ON COLUMN crm_quote_items.purchase_price IS 'Prix d''achat unitaire';
COMMENT ON COLUMN crm_quote_items.margin IS 'Marge sur la ligne';
COMMENT ON COLUMN crm_quote_items.item_type IS 'Type de ligne: freight (fret) ou additional_cost (frais annexe)';

-- ========================================
-- NETTOYAGE
-- ========================================

DROP FUNCTION IF EXISTS add_column_if_not_exists(TEXT, TEXT, TEXT);

-- ========================================
-- MESSAGE FINAL
-- ========================================

DO $$ 
BEGIN
    RAISE NOTICE '🎉 Migration terminée avec succès — crm_quote_items à jour !';
END $$;
