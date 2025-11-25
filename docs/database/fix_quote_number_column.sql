-- =====================================================
-- SCRIPT: Corriger le type de colonne quote_number
-- Date: 25 Novembre 2025
-- Description: S'assure que quote_number est VARCHAR et nettoie les données
-- =====================================================

-- 1. Vérifier le type actuel de la colonne
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'crm_quotes' 
  AND column_name = 'quote_number';

-- 2. Si la colonne est de type INTEGER, la convertir en VARCHAR
-- Note: Cette commande échouera gracieusement si la colonne est déjà VARCHAR
DO $$ 
BEGIN
    -- Vérifier si la colonne est de type integer
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'crm_quotes' 
          AND column_name = 'quote_number' 
          AND data_type = 'integer'
    ) THEN
        -- Supprimer temporairement la contrainte d'unicité
        ALTER TABLE crm_quotes DROP CONSTRAINT IF EXISTS "crm_quotes_quote_number_key";
        ALTER TABLE crm_quotes DROP CONSTRAINT IF EXISTS "UQ_quote_number";
        
        -- Convertir en VARCHAR
        ALTER TABLE crm_quotes 
        ALTER COLUMN quote_number TYPE VARCHAR(50) USING quote_number::VARCHAR;
        
        -- Recréer la contrainte d'unicité
        ALTER TABLE crm_quotes 
        ADD CONSTRAINT "crm_quotes_quote_number_key" UNIQUE (quote_number);
        
        RAISE NOTICE 'Colonne quote_number convertie en VARCHAR(50)';
    ELSE
        RAISE NOTICE 'Colonne quote_number est déjà de type VARCHAR';
    END IF;
END $$;

-- 3. Renuméroter les cotations avec le nouveau format Q25/11-1, Q25/11-2...
-- Conserve le mois de création de chaque cotation
DO $$
DECLARE
    quote_record RECORD;
    year_month TEXT;
    sequence_counters HSTORE := hstore(ARRAY[]::TEXT[]); -- Compteur par année/mois
    current_sequence INTEGER;
BEGIN
    -- Parcourir toutes les cotations par ordre de création
    FOR quote_record IN 
        SELECT 
            id, 
            quote_number, 
            created_at,
            TO_CHAR(created_at, 'YY/MM') as year_month_str
        FROM crm_quotes 
        ORDER BY created_at ASC
    LOOP
        year_month := quote_record.year_month_str;
        
        -- Obtenir ou initialiser le compteur pour ce mois
        current_sequence := COALESCE((sequence_counters -> year_month)::INTEGER, 0) + 1;
        
        -- Mettre à jour le numéro de cotation
        UPDATE crm_quotes 
        SET quote_number = 'Q' || year_month || '-' || current_sequence
        WHERE id = quote_record.id;
        
        -- Sauvegarder le compteur mis à jour
        sequence_counters := sequence_counters || hstore(year_month, current_sequence::TEXT);
        
        RAISE NOTICE 'Cotation ID %: Q%-% (créée le %)', 
            quote_record.id, 
            year_month, 
            current_sequence,
            quote_record.created_at;
    END LOOP;
    
    RAISE NOTICE 'Renumérotation terminée';
END $$;

-- 4. Vérifier les résultats
SELECT 
    id,
    quote_number as "Numéro",
    title as "Titre",
    status as "Statut",
    TO_CHAR(created_at, 'YYYY-MM-DD') as "Créé le"
FROM crm_quotes
ORDER BY created_at DESC
LIMIT 20;

-- 5. Afficher le prochain numéro qui sera généré pour le mois en cours
SELECT 
    'Q' || TO_CHAR(NOW(), 'YY/MM') || '-' || 
    COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '-(\d+)$') AS INTEGER)) + 1, 1) as "Prochain numéro du mois"
FROM crm_quotes
WHERE quote_number LIKE 'Q' || TO_CHAR(NOW(), 'YY/MM') || '-%';

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

-- Notes:
-- - Format: Q25/11-1, Q25/11-2 (Année sur 2 chiffres / Mois sur 2 chiffres - Séquence)
-- - La séquence redémarre à 1 chaque nouveau mois
-- - Exemple: Q25/11-1, Q25/11-2, Q25/12-1, Q25/12-2, Q26/01-1...
-- - Conserve le mois de création original de chaque cotation
-- - La numérotation est continue à l'infini pour chaque mois
