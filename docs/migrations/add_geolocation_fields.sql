-- Migration: Ajouter les champs de géolocalisation à la table personnel
-- Date: 2025-10-02
-- Description: Ajoute le système de suivi GPS en temps réel pour le personnel

-- 1. Ajouter les colonnes de géolocalisation
ALTER TABLE personnel 
ADD COLUMN latitude DECIMAL(10, 8) NULL,
ADD COLUMN longitude DECIMAL(11, 8) NULL,
ADD COLUMN last_location_update TIMESTAMP NULL,
ADD COLUMN location_tracking_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN location_accuracy DECIMAL(8, 2) NULL,
ADD COLUMN location_source VARCHAR(50) DEFAULT 'unknown',
ADD COLUMN is_location_active BOOLEAN DEFAULT FALSE;

-- 2. Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN personnel.latitude IS 'Latitude GPS du personnel (-90 à +90)';
COMMENT ON COLUMN personnel.longitude IS 'Longitude GPS du personnel (-180 à +180)';
COMMENT ON COLUMN personnel.last_location_update IS 'Timestamp de la dernière mise à jour de position';
COMMENT ON COLUMN personnel.location_tracking_enabled IS 'Indique si le suivi GPS est activé pour ce personnel';
COMMENT ON COLUMN personnel.location_accuracy IS 'Précision de la localisation en mètres';
COMMENT ON COLUMN personnel.location_source IS 'Source de la localisation (gps, network, passive)';
COMMENT ON COLUMN personnel.is_location_active IS 'Indique si la localisation est actuellement active (dernière position < 5 min)';

-- 3. Créer des index pour optimiser les requêtes de géolocalisation
CREATE INDEX idx_personnel_location_tracking 
ON personnel(location_tracking_enabled, is_location_active) 
WHERE location_tracking_enabled = true;

CREATE INDEX idx_personnel_last_location_update 
ON personnel(last_location_update DESC) 
WHERE last_location_update IS NOT NULL;

CREATE INDEX idx_personnel_geolocation 
ON personnel(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Créer une table pour l'historique des positions (optionnel)
CREATE TABLE IF NOT EXISTS personnel_location_history (
    id SERIAL PRIMARY KEY,
    personnel_id INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    source VARCHAR(50) DEFAULT 'unknown',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour l'historique
CREATE INDEX idx_personnel_location_history_personnel_id_timestamp 
ON personnel_location_history(personnel_id, timestamp DESC);

-- 5. Activer le suivi par défaut pour les rôles mobiles
UPDATE personnel 
SET location_tracking_enabled = true 
WHERE role IN ('chauffeur', 'commercial', 'exploitation','finance') 
AND statut = 'actif';

-- 6. Statistiques après migration
SELECT 
    'Géolocalisation activée' as operation,
    COUNT(*) as total_personnel,
    COUNT(*) FILTER (WHERE location_tracking_enabled = true) as tracking_enabled,
    COUNT(*) FILTER (WHERE latitude IS NOT NULL) as with_position
FROM personnel 
WHERE statut = 'actif';

-- 7. Vérification de la structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'personnel' 
AND column_name LIKE '%location%' OR column_name IN ('latitude', 'longitude')
ORDER BY ordinal_position;