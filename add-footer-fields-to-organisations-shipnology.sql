-- Script SQL pour ajouter les champs de footer à la table organisations dans shipnology
-- Date: 26 décembre 2025
-- Description: Ajoute les champs tel1, tel2, tel3, site_web, email_service_technique 
--              et les champs de suivi (database_created, has_users, setup_completed)

-- Se connecter à la base de données shipnology
\c shipnology

-- Ajouter les champs de téléphone si ils n'existent pas
DO $$ 
BEGIN
    -- Téléphone 1
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organisations' AND column_name = 'tel1'
    ) THEN
        ALTER TABLE organisations ADD COLUMN tel1 VARCHAR(50);
        RAISE NOTICE 'Colonne tel1 ajoutée';
    END IF;

    -- Téléphone 2
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organisations' AND column_name = 'tel2'
    ) THEN
        ALTER TABLE organisations ADD COLUMN tel2 VARCHAR(50);
        RAISE NOTICE 'Colonne tel2 ajoutée';
    END IF;

    -- Téléphone 3
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organisations' AND column_name = 'tel3'
    ) THEN
        ALTER TABLE organisations ADD COLUMN tel3 VARCHAR(50);
        RAISE NOTICE 'Colonne tel3 ajoutée';
    END IF;

    -- Site web
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organisations' AND column_name = 'site_web'
    ) THEN
        ALTER TABLE organisations ADD COLUMN site_web VARCHAR(255);
        RAISE NOTICE 'Colonne site_web ajoutée';
    END IF;

    -- Email service technique
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organisations' AND column_name = 'email_service_technique'
    ) THEN
        ALTER TABLE organisations ADD COLUMN email_service_technique VARCHAR(255);
        RAISE NOTICE 'Colonne email_service_technique ajoutée';
    END IF;

    -- Champs de suivi
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organisations' AND column_name = 'database_created'
    ) THEN
        ALTER TABLE organisations ADD COLUMN database_created BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Colonne database_created ajoutée';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organisations' AND column_name = 'has_users'
    ) THEN
        ALTER TABLE organisations ADD COLUMN has_users BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Colonne has_users ajoutée';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organisations' AND column_name = 'setup_completed'
    ) THEN
        ALTER TABLE organisations ADD COLUMN setup_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Colonne setup_completed ajoutée';
    END IF;
END $$;

-- Vérifier les colonnes ajoutées
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'organisations'
  AND column_name IN ('tel1', 'tel2', 'tel3', 'site_web', 'email_service_technique', 
                      'database_created', 'has_users', 'setup_completed')
ORDER BY column_name;

-- Afficher un exemple de mise à jour pour une organisation
-- (À adapter selon vos besoins)
/*
UPDATE organisations 
SET 
    tel1 = '(+216) 71 460 969',
    tel2 = '(+216) 71 460 991',
    tel3 = '(+216) 79 459 553',
    site_web = 'www.shipnology.com',
    email_service_technique = 'support@shipnology.com'
WHERE id = 1;
*/

SELECT '✅ Script terminé avec succès!' as status;
