-- Migration pour ajouter les colonnes keycloak_id si elles n'existent pas

-- Pour la table personnel
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personnel' AND column_name = 'keycloak_id') THEN
        ALTER TABLE personnel ADD COLUMN keycloak_id UUID NULL;
    END IF;
END $$;

-- Pour la table client
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'client' AND column_name = 'keycloak_id') THEN
        ALTER TABLE client ADD COLUMN keycloak_id UUID NULL;
    END IF;
END $$;

-- Optionnel : Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_personnel_keycloak_id ON personnel(keycloak_id);
CREATE INDEX IF NOT EXISTS idx_client_keycloak_id ON client(keycloak_id);
CREATE INDEX IF NOT EXISTS idx_personnel_nom_utilisateur ON personnel(nom_utilisateur);
CREATE INDEX IF NOT EXISTS idx_client_nom ON client(nom);

-- Vérification des colonnes ajoutées
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('personnel', 'client') 
    AND column_name = 'keycloak_id'
ORDER BY table_name;
