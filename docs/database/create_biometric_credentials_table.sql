// Script SQL à exécuter dans PostgreSQL pour créer la table biometric_credentials
// Copiez et exécutez ce script dans votre base de données velosi

-- ================================================================
-- 🔐 TABLE BIOMETRIC_CREDENTIALS
-- Gestion multi-appareils et Resident Keys pour WebAuthn
-- ================================================================

-- Supprimer la table si elle existe déjà (ATTENTION: perte de données)
-- DROP TABLE IF EXISTS biometric_credentials CASCADE;

-- Créer l'enum pour le type d'utilisateur (si pas déjà existant)
DO $$ BEGIN
    CREATE TYPE user_type_enum AS ENUM ('personnel', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Créer la table
CREATE TABLE IF NOT EXISTS biometric_credentials (
    -- Clé primaire
    id SERIAL PRIMARY KEY,
    
    -- Relations avec personnel ou client (ONE-TO-MANY)
    personnel_id INTEGER NULL,
    client_id INTEGER NULL,
    user_type user_type_enum NOT NULL,
    
    -- Credential WebAuthn
    credential_id TEXT NOT NULL UNIQUE, -- Base64URL du credential ID
    public_key TEXT NOT NULL, -- Clé publique au format JWK ou PEM
    counter BIGINT NOT NULL DEFAULT 0, -- Compteur anti-replay
    
    -- Informations de l'appareil (multi-appareils)
    device_name VARCHAR(255) NOT NULL DEFAULT 'Appareil inconnu',
    device_type VARCHAR(50) NULL, -- 'mobile', 'desktop', 'tablet'
    browser_info TEXT NULL, -- User-Agent du navigateur
    
    -- Resident Key (permet connexion sans username)
    is_resident_key BOOLEAN NOT NULL DEFAULT false,
    user_handle TEXT NULL, -- Handle utilisateur pour Resident Keys (base64url)
    
    -- Métadonnées
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL,
    
    -- Contraintes
    CONSTRAINT fk_biometric_personnel 
        FOREIGN KEY (personnel_id) 
        REFERENCES personnel(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_biometric_client 
        FOREIGN KEY (client_id) 
        REFERENCES client(id) 
        ON DELETE CASCADE,
    
    -- Un credential doit être lié soit à un personnel soit à un client
    CONSTRAINT chk_biometric_user 
        CHECK (
            (personnel_id IS NOT NULL AND client_id IS NULL) OR
            (personnel_id IS NULL AND client_id IS NOT NULL)
        )
);

-- ================================================================
-- INDEX pour optimiser les recherches
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_biometric_credential_id ON biometric_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_biometric_personnel ON biometric_credentials(personnel_id) WHERE personnel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_biometric_client ON biometric_credentials(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_biometric_user_handle ON biometric_credentials(user_handle) WHERE user_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_biometric_last_used ON biometric_credentials(last_used_at);

-- ================================================================
-- COMMENTAIRES
-- ================================================================

COMMENT ON TABLE biometric_credentials IS '🔐 Credentials WebAuthn multi-appareils avec support Resident Keys';
COMMENT ON COLUMN biometric_credentials.credential_id IS 'ID unique du credential WebAuthn (généré par le navigateur/appareil)';
COMMENT ON COLUMN biometric_credentials.public_key IS 'Clé publique du credential (format JWK ou PEM)';
COMMENT ON COLUMN biometric_credentials.counter IS 'Compteur anti-replay WebAuthn';
COMMENT ON COLUMN biometric_credentials.is_resident_key IS 'true = Connexion possible sans username (Passkey)';
COMMENT ON COLUMN biometric_credentials.user_handle IS 'Handle utilisateur pour Resident Keys';
COMMENT ON COLUMN biometric_credentials.device_name IS 'Nom de l''appareil';

-- ================================================================
-- VÉRIFICATION
-- ================================================================

-- Vérifier que la table a été créée
SELECT 
    table_name, 
    table_type
FROM information_schema.tables 
WHERE table_name = 'biometric_credentials';

-- Afficher la structure de la table
\d biometric_credentials

-- Compter les credentials existants
SELECT COUNT(*) as total_credentials FROM biometric_credentials;

-- Afficher les credentials par type d'utilisateur
SELECT 
    user_type,
    COUNT(*) as count,
    COUNT(CASE WHEN is_resident_key THEN 1 END) as resident_keys
FROM biometric_credentials
GROUP BY user_type;

PRINT '✅ Table biometric_credentials créée avec succès !';
