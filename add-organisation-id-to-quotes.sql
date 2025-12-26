-- ================================================================
-- Migration: Ajouter organisation_id à crm_quotes
-- Date: 2025-01-22
-- Description: Ajoute la colonne organisation_id pour faciliter 
--              l'accès public aux cotations sans authentification
-- ================================================================

-- Étape 1: Ajouter la colonne organisation_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'crm_quotes' 
        AND column_name = 'organisation_id'
    ) THEN
        -- Ajouter la colonne avec valeur par défaut = 1
        ALTER TABLE crm_quotes 
        ADD COLUMN organisation_id INTEGER NOT NULL DEFAULT 17;
        
        RAISE NOTICE '✅ Colonne organisation_id ajoutée avec succès à crm_quotes';
    ELSE
        RAISE NOTICE 'ℹ️ La colonne organisation_id existe déjà dans crm_quotes';
    END IF;
    
    -- Créer un index pour améliorer les performances de recherche
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'crm_quotes' 
        AND indexname = 'idx_crm_quotes_organisation_id'
    ) THEN
        CREATE INDEX idx_crm_quotes_organisation_id 
        ON crm_quotes(organisation_id);
        RAISE NOTICE '✅ Index créé sur organisation_id';
    ELSE
        RAISE NOTICE 'ℹ️ Index idx_crm_quotes_organisation_id existe déjà';
    END IF;
END $$;

-- Étape 2: Afficher les statistiques
DO $$
DECLARE
    quote_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM crm_quotes;
    SELECT COUNT(*) INTO quote_count FROM crm_quotes WHERE organisation_id = 1;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE '📊 Statistiques après migration:';
    RAISE NOTICE '   - Total de cotations: %', total_count;
    RAISE NOTICE '   - Cotations avec organisation_id = 1: %', quote_count;
    RAISE NOTICE '================================================';
END $$;

-- Étape 3: Vérification finale
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'crm_quotes' 
AND column_name = 'organisation_id';
