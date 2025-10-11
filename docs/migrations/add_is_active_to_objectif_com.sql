-- Script de migration pour ajouter la colonne is_active à la table objectif_com
-- Date: 2025-10-10
-- Description: Ajout de la fonctionnalité d'activation/désactivation des objectifs commerciaux

-- 1. Ajouter la colonne is_active (boolean, par défaut TRUE)
ALTER TABLE objectif_com 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN objectif_com.is_active IS 'Indique si l''objectif commercial est actif (TRUE) ou désactivé (FALSE)';

-- 3. Créer un index pour optimiser les requêtes sur les objectifs actifs
CREATE INDEX idx_objectif_com_is_active ON objectif_com(is_active);

-- 4. Créer un index composé pour optimiser les requêtes par personnel et statut actif
CREATE INDEX idx_objectif_com_personnel_active ON objectif_com(id_personnel, is_active);

-- 5. Mettre à jour tous les objectifs existants pour qu'ils soient actifs par défaut
UPDATE objectif_com SET is_active = TRUE WHERE is_active IS NULL;

-- 6. Vérification de la migration
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'objectif_com' 
AND column_name = 'is_active';

-- 7. Afficher un résumé des objectifs actifs/inactifs après migration
SELECT 
    is_active,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM objectif_com 
GROUP BY is_active
ORDER BY is_active DESC;

COMMIT;