-- ================================================================
-- Migration: Créer table de registre central pour les cotations
-- Date: 2025-01-22
-- Description: Table centrale dans velosi pour mapper les cotations
--              vers leurs bases de données respectives
-- ================================================================

-- Se connecter à la base velosi pour créer la table centrale
\c velosi

-- Créer la table de registre si elle n'existe pas
CREATE TABLE IF NOT EXISTS quote_registry (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER NOT NULL,
    quote_uuid UUID NOT NULL UNIQUE,
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    organisation_id INTEGER NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_quote_org UNIQUE (quote_id, organisation_id)
);

-- Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_quote_registry_quote_id ON quote_registry(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_registry_uuid ON quote_registry(quote_uuid);
CREATE INDEX IF NOT EXISTS idx_quote_registry_organisation_id ON quote_registry(organisation_id);
CREATE INDEX IF NOT EXISTS idx_quote_registry_database ON quote_registry(database_name);

-- Commenter la table
COMMENT ON TABLE quote_registry IS 'Table centrale de mapping des cotations vers leurs bases de données respectives';
COMMENT ON COLUMN quote_registry.quote_id IS 'ID de la cotation dans sa base locale';
COMMENT ON COLUMN quote_registry.quote_uuid IS 'UUID unique global de la cotation';
COMMENT ON COLUMN quote_registry.quote_number IS 'Numéro de cotation (ex: Q25/12-3)';
COMMENT ON COLUMN quote_registry.organisation_id IS 'ID de l''organisation propriétaire';
COMMENT ON COLUMN quote_registry.database_name IS 'Nom de la base de données (ex: danino, velosi)';

-- Afficher le résultat
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'quote_registry';

\echo '✅ Table quote_registry créée avec succès dans velosi'
