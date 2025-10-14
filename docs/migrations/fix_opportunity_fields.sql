-- Migration pour corriger la structure des opportunités
-- Date: 2025-10-14

-- 1. Ajouter la colonne traffic si elle n'existe pas déjà
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='crm_opportunities' AND column_name='traffic') THEN
        ALTER TABLE crm_opportunities ADD COLUMN traffic VARCHAR(20);
        
        -- Ajouter la contrainte pour l'enum
        ALTER TABLE crm_opportunities ADD CONSTRAINT chk_traffic 
        CHECK (traffic IN ('import', 'export'));
        
        RAISE NOTICE 'Colonne traffic ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne traffic existe déjà';
    END IF;
END$$;

-- 2. Remplacer engine_types (array) par engine_type (integer) 
DO $$
BEGIN
    -- Vérifier si engine_types existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name='crm_opportunities' AND column_name='engine_types') THEN
        
        -- Ajouter la nouvelle colonne engine_type
        ALTER TABLE crm_opportunities ADD COLUMN engine_type INTEGER;
        
        -- Migrer les données: prendre le premier élément du tableau s'il existe
        UPDATE crm_opportunities 
        SET engine_type = (
            CASE 
                WHEN engine_types IS NOT NULL AND array_length(engine_types, 1) > 0 
                THEN engine_types[1] 
                ELSE NULL 
            END
        );
        
        -- Supprimer l'ancienne colonne
        ALTER TABLE crm_opportunities DROP COLUMN engine_types;
        
        RAISE NOTICE 'Migration engine_types vers engine_type terminée';
    ELSE
        -- Si engine_types n existe pas, créer directement engine_type
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='crm_opportunities' AND column_name='engine_type') THEN
            ALTER TABLE crm_opportunities ADD COLUMN engine_type INTEGER;
            RAISE NOTICE 'Colonne engine_type créée';
        ELSE
            RAISE NOTICE 'Colonne engine_type existe déjà';
        END IF;
    END IF;
END$$;

-- 3. Ajouter une contrainte de clé étrangère vers la table engin si elle existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='engin') THEN
        -- Supprimer la contrainte existante si elle existe
        IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage 
                  WHERE constraint_name='fk_opportunity_engine_type') THEN
            ALTER TABLE crm_opportunities DROP CONSTRAINT fk_opportunity_engine_type;
        END IF;
        
        -- Ajouter la nouvelle contrainte
        ALTER TABLE crm_opportunities 
        ADD CONSTRAINT fk_opportunity_engine_type 
        FOREIGN KEY (engine_type) REFERENCES engin(id);
        
        RAISE NOTICE 'Contrainte de clé étrangère vers engin ajoutée';
    ELSE
        RAISE NOTICE 'Table engin non trouvée, contrainte FK non ajoutée';
    END IF;
END$$;

-- 4. Vérification finale
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'crm_opportunities' 
  AND column_name IN ('traffic', 'engine_type', 'transport_type')
ORDER BY column_name;