-- Migration pour ajouter les colonnes auto_delete aux tables personnel et client
-- Date: 2025-09-30
-- Description: Ajoute le contrôle de suppression automatique optionnelle après 7 jours

-- 1. Ajouter la colonne auto_delete à la table personnel
ALTER TABLE personnel 
ADD COLUMN auto_delete BOOLEAN DEFAULT false NOT NULL;

-- 2. Ajouter la colonne auto_delete à la table client
ALTER TABLE client 
ADD COLUMN auto_delete BOOLEAN DEFAULT false NOT NULL;

-- 3. Ajouter des index pour optimiser les requêtes de nettoyage
CREATE INDEX idx_personnel_auto_delete_statut_updated_at 
ON personnel(auto_delete, statut, updated_at) 
WHERE auto_delete = true;

CREATE INDEX idx_client_auto_delete_statut_updated_at 
ON client(auto_delete, statut, updated_at) 
WHERE auto_delete = true;

-- 4. Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN personnel.auto_delete IS 'Indique si le compte doit être supprimé automatiquement après 7 jours de désactivation';
COMMENT ON COLUMN client.auto_delete IS 'Indique si le compte doit être supprimé automatiquement après 7 jours de désactivation';

-- 5. Statistiques après migration
SELECT 
    'personnel' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE auto_delete = true) as auto_delete_enabled,
    COUNT(*) FILTER (WHERE statut IN ('inactif', 'desactive') AND auto_delete = true) as ready_for_auto_deletion
FROM personnel
UNION ALL
SELECT 
    'client' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE auto_delete = true) as auto_delete_enabled,
    COUNT(*) FILTER (WHERE statut IN ('inactif', 'desactive') AND auto_delete = true) as ready_for_auto_deletion
FROM client;

-- 6. Vérification des index créés
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE '%auto_delete%'
ORDER BY tablename, indexname;