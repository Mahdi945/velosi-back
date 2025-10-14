-- Script pour supprimer les contraintes transport_type
-- Date: 2025-10-14

-- 1. Identifier et supprimer toutes les contraintes CHECK sur transport_type
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Rechercher toutes les contraintes CHECK qui mentionnent transport_type
    FOR constraint_record IN
        SELECT 
            tc.constraint_name,
            tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'crm_opportunities' 
          AND tc.constraint_type = 'CHECK'
          AND cc.check_clause LIKE '%transport_type%'
    LOOP
        -- Supprimer la contrainte trouvée
        EXECUTE 'ALTER TABLE ' || constraint_record.table_name || 
                ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        
        RAISE NOTICE 'Contrainte supprimée: % sur table %', 
                     constraint_record.constraint_name, 
                     constraint_record.table_name;
    END LOOP;
    
    -- Également supprimer par nom potentiel de contrainte
    BEGIN
        ALTER TABLE crm_opportunities DROP CONSTRAINT IF EXISTS crm_opportunities_transport_type_check;
        RAISE NOTICE 'Contrainte crm_opportunities_transport_type_check supprimée';
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE NOTICE 'Contrainte crm_opportunities_transport_type_check n existe pas ou déjà supprimée';
    END;
    
    -- Supprimer d'autres noms possibles
    BEGIN
        ALTER TABLE crm_opportunities DROP CONSTRAINT IF EXISTS chk_transport_type;
        RAISE NOTICE 'Contrainte chk_transport_type supprimée';
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE NOTICE 'Contrainte chk_transport_type n existe pas';
    END;
    
END$$;

-- 2. Supprimer l'enum transport_type existant si il existe
DO $$
BEGIN
    -- Vérifier si l'enum existe
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transporttype') THEN
        -- Changer temporairement le type de colonne vers VARCHAR
        ALTER TABLE crm_opportunities 
        ALTER COLUMN transport_type TYPE VARCHAR(50);
        
        -- Supprimer l'enum
        DROP TYPE transporttype CASCADE;
        
        RAISE NOTICE 'Enum transporttype supprimé et colonne convertie en VARCHAR';
    ELSE
        RAISE NOTICE 'Enum transporttype n existe pas';
    END IF;
END$$;

-- 3. S'assurer que la colonne est en VARCHAR sans contraintes
ALTER TABLE crm_opportunities 
ALTER COLUMN transport_type TYPE VARCHAR(50);

-- 4. Vérification finale
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'crm_opportunities' 
  AND column_name = 'transport_type';

-- 5. Lister les contraintes restantes sur la table (pour vérification)
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'crm_opportunities'
  AND tc.constraint_type = 'CHECK';

RAISE NOTICE '===========================================';
RAISE NOTICE 'SUPPRESSION DES CONTRAINTES TERMINÉE';
RAISE NOTICE 'La colonne transport_type est maintenant en VARCHAR(50)';
RAISE NOTICE 'Aucune contrainte CHECK sur transport_type';
RAISE NOTICE '===========================================';