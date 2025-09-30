-- Migration pour ajouter la colonne updated_at à la table client
-- Date: 2025-09-30
-- Description: Ajoute le suivi des modifications pour la suppression automatique

-- 1. Ajouter la colonne updated_at à la table client
ALTER TABLE client 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Créer une fonction trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Créer le trigger pour la table client
CREATE TRIGGER update_client_updated_at 
    BEFORE UPDATE ON client 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Mettre à jour les enregistrements existants avec la valeur de created_at
UPDATE client 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- 5. Rendre la colonne NOT NULL après avoir mis à jour les données existantes
ALTER TABLE client 
ALTER COLUMN updated_at SET NOT NULL;

-- 6. Ajouter un index pour optimiser les requêtes de nettoyage
CREATE INDEX idx_client_statut_updated_at ON client(statut, updated_at);

-- 7. Optionnel: Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN client.updated_at IS 'Timestamp de la dernière modification, utilisé pour la suppression automatique après 7 jours de désactivation';

-- Vérification des données
SELECT 
    nom,
    statut,
    created_at,
    updated_at,
    (CURRENT_TIMESTAMP - updated_at) as age_depuis_modif
FROM client 
WHERE statut IN ('inactif', 'desactive', 'suspendu')
ORDER BY updated_at DESC;