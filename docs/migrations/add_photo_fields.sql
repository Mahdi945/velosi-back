-- Migration pour ajouter le champ photo aux tables personnel et client
-- Exécuter ce script si les tables existent déjà sans le champ photo

-- Vérifier et ajouter le champ photo à la table personnel (si pas déjà présent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'personnel' AND column_name = 'photo'
    ) THEN
        ALTER TABLE personnel ADD COLUMN photo TEXT;
        COMMENT ON COLUMN personnel.photo IS 'URL ou chemin vers la photo de profil';
    END IF;
END $$;

-- Vérifier et ajouter le champ photo à la table client (si pas déjà présent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'client' AND column_name = 'photo'
    ) THEN
        ALTER TABLE client ADD COLUMN photo TEXT;
        COMMENT ON COLUMN client.photo IS 'URL ou chemin vers la photo de profil';
    END IF;
END $$;

-- Optionnel: Ajouter quelques photos de test
-- UPDATE personnel SET photo = 'uploads/profiles/default-personnel.jpg' WHERE photo IS NULL;
-- UPDATE client SET photo = 'uploads/profiles/default-client.jpg' WHERE photo IS NULL;

COMMENT ON SCRIPT IS 'Migration pour ajouter le support des photos de profil - Version 1.0';