-- Script pour ajouter les champs du footer d'impression à la table organisations
-- Date: 2025-12-24
-- Description: Ajout des coordonnées supplémentaires pour le footer des documents

-- Ajouter les champs de téléphone
ALTER TABLE organisations 
ADD COLUMN IF NOT EXISTS tel1 VARCHAR(50),
ADD COLUMN IF NOT EXISTS tel2 VARCHAR(50),
ADD COLUMN IF NOT EXISTS tel3 VARCHAR(50);

-- Ajouter le site web
ALTER TABLE organisations 
ADD COLUMN IF NOT EXISTS site_web VARCHAR(255);

-- Ajouter l'email de service technique/aide
ALTER TABLE organisations 
ADD COLUMN IF NOT EXISTS email_service_technique VARCHAR(255);

-- Ajouter les colonnes de suivi
ALTER TABLE organisations 
ADD COLUMN IF NOT EXISTS database_created BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_users BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN organisations.tel1 IS 'Premier numéro de téléphone pour le footer des documents';
COMMENT ON COLUMN organisations.tel2 IS 'Deuxième numéro de téléphone pour le footer des documents';
COMMENT ON COLUMN organisations.tel3 IS 'Troisième numéro de téléphone pour le footer des documents';
COMMENT ON COLUMN organisations.site_web IS 'URL du site web de l''organisation';
COMMENT ON COLUMN organisations.email_service_technique IS 'Email du service technique/aide pour le footer';
COMMENT ON COLUMN organisations.database_created IS 'Indique si la base de données a été créée physiquement';
COMMENT ON COLUMN organisations.has_users IS 'Indique si l''organisation a au moins un utilisateur';
COMMENT ON COLUMN organisations.setup_completed IS 'Indique si la configuration initiale a été complétée';

-- Vérifier que les colonnes ont été ajoutées
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'organisations' 
    AND column_name IN ('tel1', 'tel2', 'tel3', 'site_web', 'email_service_technique', 'database_created', 'has_users', 'setup_completed')
ORDER BY 
    column_name;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Colonnes footer et de suivi ajoutées avec succès à la table organisations';
END $$;
