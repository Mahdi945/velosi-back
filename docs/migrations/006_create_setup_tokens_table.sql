-- ================================================================
-- Migration: Création de la table setup_tokens
-- ================================================================
-- Cette table stocke les tokens d'invitation pour la configuration initiale
-- des organisations par les clients
-- ================================================================

\c shipnology;

-- Créer la table setup_tokens
CREATE TABLE IF NOT EXISTS setup_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide par token
CREATE INDEX idx_setup_tokens_token ON setup_tokens(token);
CREATE INDEX idx_setup_tokens_organisation_id ON setup_tokens(organisation_id);

-- Nettoyer les tokens expirés automatiquement (optionnel)
COMMENT ON TABLE setup_tokens IS 'Tokens d''invitation pour la configuration initiale des organisations';
COMMENT ON COLUMN setup_tokens.token IS 'Token unique généré (UUID v4)';
COMMENT ON COLUMN setup_tokens.expires_at IS 'Date d''expiration du token (généralement 7 jours après création)';
COMMENT ON COLUMN setup_tokens.used IS 'Indique si le token a été utilisé';
COMMENT ON COLUMN setup_tokens.used_at IS 'Date d''utilisation du token';

SELECT 'Table setup_tokens créée avec succès' AS status;
