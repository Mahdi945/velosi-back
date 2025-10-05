-- ============================
-- Migration pour ajouter les champs de localisation et audio
-- aux messages VeChat - PostgreSQL
-- ============================

-- Vérifier si la table vechat_messages existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vechat_messages') THEN
        RAISE EXCEPTION 'Table vechat_messages n''existe pas. Veuillez d''abord créer les tables VeChat.';
    END IF;
END $$;

-- Ajouter les colonnes pour la localisation si elles n'existent pas
DO $$
BEGIN
    -- Vérifier et ajouter location_latitude
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vechat_messages' 
                   AND column_name = 'location_latitude') THEN
        ALTER TABLE vechat_messages 
        ADD COLUMN location_latitude DECIMAL(10,8) NULL;
        RAISE NOTICE 'Colonne location_latitude ajoutée';
    ELSE
        RAISE NOTICE 'Colonne location_latitude existe déjà';
    END IF;

    -- Vérifier et ajouter location_longitude
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vechat_messages' 
                   AND column_name = 'location_longitude') THEN
        ALTER TABLE vechat_messages 
        ADD COLUMN location_longitude DECIMAL(11,8) NULL;
        RAISE NOTICE 'Colonne location_longitude ajoutée';
    ELSE
        RAISE NOTICE 'Colonne location_longitude existe déjà';
    END IF;

    -- Vérifier et ajouter location_accuracy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vechat_messages' 
                   AND column_name = 'location_accuracy') THEN
        ALTER TABLE vechat_messages 
        ADD COLUMN location_accuracy DECIMAL(10,2) NULL;
        RAISE NOTICE 'Colonne location_accuracy ajoutée';
    ELSE
        RAISE NOTICE 'Colonne location_accuracy existe déjà';
    END IF;

    -- Vérifier et ajouter audio_duration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vechat_messages' 
                   AND column_name = 'audio_duration') THEN
        ALTER TABLE vechat_messages 
        ADD COLUMN audio_duration INTEGER NULL;
        RAISE NOTICE 'Colonne audio_duration ajoutée';
    ELSE
        RAISE NOTICE 'Colonne audio_duration existe déjà';
    END IF;

    -- Vérifier et ajouter audio_waveform
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vechat_messages' 
                   AND column_name = 'audio_waveform') THEN
        ALTER TABLE vechat_messages 
        ADD COLUMN audio_waveform TEXT NULL;
        RAISE NOTICE 'Colonne audio_waveform ajoutée';
    ELSE
        RAISE NOTICE 'Colonne audio_waveform existe déjà';
    END IF;
END $$;

-- Mettre à jour l'enum message_type pour inclure 'audio' et 'location' s'ils n'existent pas
DO $$
BEGIN
    -- Vérifier si les nouveaux types existent déjà
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%message_type%' 
        AND check_clause LIKE '%audio%'
    ) THEN
        -- Ajouter les nouveaux types à l'enum
        ALTER TABLE vechat_messages 
        DROP CONSTRAINT IF EXISTS "CHK_vechat_messages_message_type";
        
        ALTER TABLE vechat_messages 
        ADD CONSTRAINT "CHK_vechat_messages_message_type" 
        CHECK (message_type IN ('text', 'image', 'file', 'video', 'voice', 'audio', 'location'));
        
        RAISE NOTICE 'Types de messages audio et location ajoutés à l''enum';
    ELSE
        RAISE NOTICE 'Types de messages audio et location existent déjà';
    END IF;
EXCEPTION
    WHEN others THEN
        -- Si c'est une colonne enum native PostgreSQL, on utilise ALTER TYPE
        BEGIN
            ALTER TYPE message_type_enum ADD VALUE IF NOT EXISTS 'audio';
            ALTER TYPE message_type_enum ADD VALUE IF NOT EXISTS 'location';
            RAISE NOTICE 'Types audio et location ajoutés à l''enum natif';
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Impossible de modifier l''enum: %', SQLERRM;
        END;
END $$;

-- Créer des index pour les nouvelles colonnes pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_vechat_messages_location 
ON vechat_messages(location_latitude, location_longitude) 
WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vechat_messages_audio_duration 
ON vechat_messages(audio_duration) 
WHERE audio_duration IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vechat_messages_message_type_audio_location 
ON vechat_messages(message_type) 
WHERE message_type IN ('audio', 'location');

-- Commentaires pour documentation
COMMENT ON COLUMN vechat_messages.location_latitude IS 'Latitude du message de localisation (degrés décimaux)';
COMMENT ON COLUMN vechat_messages.location_longitude IS 'Longitude du message de localisation (degrés décimaux)';
COMMENT ON COLUMN vechat_messages.location_accuracy IS 'Précision de la localisation en mètres';
COMMENT ON COLUMN vechat_messages.audio_duration IS 'Durée du message audio en secondes';
COMMENT ON COLUMN vechat_messages.audio_waveform IS 'Données de forme d''onde audio au format JSON';

-- Vérification finale
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Vérifier toutes les colonnes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vechat_messages' AND column_name = 'location_latitude') THEN
        missing_columns := array_append(missing_columns, 'location_latitude');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vechat_messages' AND column_name = 'location_longitude') THEN
        missing_columns := array_append(missing_columns, 'location_longitude');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vechat_messages' AND column_name = 'location_accuracy') THEN
        missing_columns := array_append(missing_columns, 'location_accuracy');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vechat_messages' AND column_name = 'audio_duration') THEN
        missing_columns := array_append(missing_columns, 'audio_duration');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vechat_messages' AND column_name = 'audio_waveform') THEN
        missing_columns := array_append(missing_columns, 'audio_waveform');
    END IF;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'ERREUR: Colonnes manquantes: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ SUCCÈS: Toutes les colonnes nécessaires sont présentes';
        RAISE NOTICE '✅ Migration terminée avec succès';
    END IF;
END $$;

-- Afficher la structure finale de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'vechat_messages' 
    AND column_name IN ('location_latitude', 'location_longitude', 'location_accuracy', 'audio_duration', 'audio_waveform')
ORDER BY column_name;