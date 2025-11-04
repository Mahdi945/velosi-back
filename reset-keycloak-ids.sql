-- Script SQL pour réinitialiser tous les keycloak_id
-- Date: 4 novembre 2025
-- Raison: Nouvelle installation Keycloak, anciens IDs invalides

-- ============================================
-- BACKUP : Sauvegarder les anciens IDs avant suppression
-- ============================================

-- Créer une table de backup des anciens keycloak_id (au cas où)
CREATE TABLE IF NOT EXISTS keycloak_id_backup_20251104 (
    table_name VARCHAR(50),
    record_id INTEGER,
    old_keycloak_id UUID,
    backup_date TIMESTAMP DEFAULT NOW()
);

-- Sauvegarder les keycloak_id du personnel
INSERT INTO keycloak_id_backup_20251104 (table_name, record_id, old_keycloak_id)
SELECT 'personnel', id, keycloak_id 
FROM personnel 
WHERE keycloak_id IS NOT NULL;

-- Sauvegarder les keycloak_id des clients
INSERT INTO keycloak_id_backup_20251104 (table_name, record_id, old_keycloak_id)
SELECT 'client', id, keycloak_id 
FROM client 
WHERE keycloak_id IS NOT NULL;

-- Afficher le nombre de sauvegardes
SELECT 
    table_name,
    COUNT(*) as nb_backups
FROM keycloak_id_backup_20251104
GROUP BY table_name;

-- ============================================
-- RÉINITIALISATION : Mettre tous les keycloak_id à NULL
-- ============================================

-- Réinitialiser les keycloak_id du personnel
UPDATE personnel 
SET keycloak_id = NULL 
WHERE keycloak_id IS NOT NULL;

-- Réinitialiser les keycloak_id des clients
UPDATE client 
SET keycloak_id = NULL 
WHERE keycloak_id IS NOT NULL;

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que tous les keycloak_id sont NULL
SELECT 
    'personnel' as table_name,
    COUNT(*) as total,
    COUNT(keycloak_id) as avec_keycloak_id,
    COUNT(*) - COUNT(keycloak_id) as sans_keycloak_id
FROM personnel
WHERE statut = 'actif'

UNION ALL

SELECT 
    'client' as table_name,
    COUNT(*) as total,
    COUNT(keycloak_id) as avec_keycloak_id,
    COUNT(*) - COUNT(keycloak_id) as sans_keycloak_id
FROM client
WHERE is_permanent = true AND statut = 'actif';

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- Les colonnes "avec_keycloak_id" doivent toutes afficher 0
-- Les colonnes "sans_keycloak_id" doivent correspondre au total
