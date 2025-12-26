-- ================================================================
-- Migration: Correction de la contrainte statut de la table organisations
-- ================================================================
-- Problème: La contrainte CHECK accepte 'actif', 'suspendu', 'inactif'
--           mais le code TypeORM utilise 'en_attente'
-- Solution: Mettre à jour la contrainte pour accepter tous les statuts
-- ================================================================

\c shipnology;

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE organisations 
  DROP CONSTRAINT IF EXISTS organisations_statut_check;

-- 2. Ajouter la nouvelle contrainte avec 'en_attente'
ALTER TABLE organisations 
  ADD CONSTRAINT organisations_statut_check 
  CHECK (statut IN ('actif', 'inactif', 'en_attente', 'suspendu'));

-- 3. Mettre à jour la valeur par défaut
ALTER TABLE organisations 
  ALTER COLUMN statut SET DEFAULT 'en_attente';

-- 4. Afficher les organisations pour vérifier
SELECT id, nom, statut FROM organisations;

COMMENT ON COLUMN organisations.statut IS 'Statut de l''organisation: actif (opérationnel), en_attente (en cours de setup), suspendu (bloqué), inactif (désactivé)';

-- ================================================================
-- Note: Les nouvelles organisations seront créées avec statut 'en_attente'
--       puis passées à 'actif' une fois la base de données créée et configurée
-- ================================================================
