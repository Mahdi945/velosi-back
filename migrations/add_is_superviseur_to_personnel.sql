-- =====================================================
-- Script de migration : Ajout du champ is_superviseur
-- Date : 2025-12-02
-- Description : Ajoute le champ is_superviseur pour permettre
--               aux superviseurs de créer et gérer du personnel administratif
-- =====================================================

-- Étape 1 : Ajout de la colonne is_superviseur avec valeur par défaut FALSE
ALTER TABLE personnel 
ADD COLUMN IF NOT EXISTS is_superviseur BOOLEAN NOT NULL DEFAULT FALSE; 

-- Étape 2 : Créer un index pour optimiser les requêtes sur is_superviseur
CREATE INDEX IF NOT EXISTS idx_personnel_is_superviseur 
ON personnel(is_superviseur);

-- Étape 3 : Créer un index composite pour les requêtes combinant rôle et superviseur
CREATE INDEX IF NOT EXISTS idx_personnel_role_superviseur 
ON personnel(role, is_superviseur);

-- Étape 4 : Ajouter un commentaire sur la colonne
COMMENT ON COLUMN personnel.is_superviseur IS 
'Indique si le personnel a le statut de superviseur. Les superviseurs peuvent créer et gérer du personnel administratif.';

-- =====================================================
-- EXEMPLES D'UTILISATION (ne pas exécuter automatiquement)
-- =====================================================

-- Exemple 1 : Promouvoir un personnel existant au statut de superviseur
-- UPDATE personnel 
-- SET is_superviseur = TRUE 
-- WHERE id = 1; -- Remplacer par l'ID du personnel

-- Exemple 2 : Récupérer tous les superviseurs
-- SELECT id, nom, prenom, role, is_superviseur 
-- FROM personnel 
-- WHERE is_superviseur = TRUE;

-- Exemple 3 : Récupérer tous les superviseurs administratifs
-- SELECT id, nom, prenom, role, is_superviseur 
-- FROM personnel 
-- WHERE role = 'administratif' AND is_superviseur = TRUE;

-- Exemple 4 : Compter le nombre de superviseurs par rôle
-- SELECT role, COUNT(*) as nombre_superviseurs
-- FROM personnel 
-- WHERE is_superviseur = TRUE 
-- GROUP BY role;

-- =====================================================
-- ROLLBACK (en cas de besoin)
-- =====================================================

-- Pour annuler cette migration, exécuter les commandes suivantes :
-- DROP INDEX IF EXISTS idx_personnel_is_superviseur;
-- DROP INDEX IF EXISTS idx_personnel_role_superviseur;
-- ALTER TABLE personnel DROP COLUMN IF EXISTS is_superviseur;

-- =====================================================
-- VÉRIFICATION POST-MIGRATION
-- =====================================================

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'personnel' AND column_name = 'is_superviseur';

-- Vérifier les index créés
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'personnel' 
AND indexname IN ('idx_personnel_is_superviseur', 'idx_personnel_role_superviseur');

-- Vérifier le nombre d'enregistrements affectés
SELECT 
  COUNT(*) as total_personnel,
  COUNT(CASE WHEN is_superviseur = TRUE THEN 1 END) as nombre_superviseurs,
  COUNT(CASE WHEN is_superviseur = FALSE THEN 1 END) as nombre_non_superviseurs
FROM personnel;
