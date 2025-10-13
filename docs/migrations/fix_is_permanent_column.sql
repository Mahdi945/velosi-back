-- Vérification et ajout de la colonne is_permanent si elle n'existe pas
DO $$
BEGIN
    -- Vérifier si la colonne existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'client' AND column_name = 'is_permanent') THEN
        -- Ajouter la colonne si elle n'existe pas
        ALTER TABLE client ADD COLUMN is_permanent BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Colonne is_permanent ajoutée avec succès';
    ELSE
        RAISE NOTICE 'La colonne is_permanent existe déjà';
    END IF;
END $$;

-- Mettre à jour tous les clients existants pour avoir is_permanent = false par défaut
UPDATE client SET is_permanent = false WHERE is_permanent IS NULL;

-- Vérifier le résultat
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'client' AND column_name = 'is_permanent';

-- Afficher quelques exemples
SELECT id, nom, is_permanent FROM client LIMIT 10;