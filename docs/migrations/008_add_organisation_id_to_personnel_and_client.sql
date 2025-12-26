-- ===================================================================
-- Migration 008: Ajouter organisation_id aux tables personnel et client
-- ===================================================================
-- Description: Cette migration ajoute le champ organisation_id pour lier
--             chaque utilisateur/client à son organisation et corrige les
--             contraintes UNIQUE pour permettre les doublons entre organisations
-- Date: 2025-12-19
-- ===================================================================

-- ÉTAPE 1: Ajouter la colonne organisation_id à la table personnel
-- ===================================================================
ALTER TABLE personnel 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN personnel.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

-- ÉTAPE 2: Supprimer les anciennes contraintes UNIQUE globales sur personnel
-- ===================================================================
-- Supprimer la contrainte unique sur nom_utilisateur (l'index sera supprimé automatiquement)
ALTER TABLE personnel DROP CONSTRAINT IF EXISTS personnel_nom_utilisateur_key CASCADE;
ALTER TABLE personnel DROP CONSTRAINT IF EXISTS uq_personnel_nom_utilisateur CASCADE;
DROP INDEX IF EXISTS personnel_nom_utilisateur_key CASCADE;

-- Supprimer la contrainte unique sur email (l'index sera supprimé automatiquement)
ALTER TABLE personnel DROP CONSTRAINT IF EXISTS personnel_email_key CASCADE;
ALTER TABLE personnel DROP CONSTRAINT IF EXISTS uq_personnel_email CASCADE;
DROP INDEX IF EXISTS personnel_email_key CASCADE;

-- Supprimer la contrainte unique sur keycloak_id (peut être null pour plusieurs utilisateurs)
ALTER TABLE personnel DROP CONSTRAINT IF EXISTS personnel_keycloak_id_key CASCADE;
DROP INDEX IF EXISTS personnel_keycloak_id_key CASCADE;

-- ÉTAPE 3: Créer les nouvelles contraintes UNIQUE composites sur personnel
-- ===================================================================
-- UNIQUE par organisation pour nom_utilisateur
CREATE UNIQUE INDEX IF NOT EXISTS idx_personnel_org_username 
ON personnel(organisation_id, nom_utilisateur);

-- UNIQUE par organisation pour email (uniquement si email n'est pas null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_personnel_org_email 
ON personnel(organisation_id, email) 
WHERE email IS NOT NULL AND TRIM(email) <> '';

-- Index simple sur organisation_id pour les requêtes
CREATE INDEX IF NOT EXISTS idx_personnel_organisation_id ON personnel(organisation_id);

-- ÉTAPE 4: Ajouter la colonne organisation_id à la table client
-- ===================================================================
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS organisation_id INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN client.organisation_id IS 'ID de l''organisation (référence vers shipnology.organisations)';

-- ÉTAPE 5: Supprimer les anciennes contraintes UNIQUE globales sur client
-- ===================================================================
-- Supprimer la contrainte unique sur id_fiscal (l'index sera supprimé automatiquement)
ALTER TABLE client DROP CONSTRAINT IF EXISTS client_id_fiscal_key CASCADE;
DROP INDEX IF EXISTS client_id_fiscal_key CASCADE;

-- Supprimer la contrainte unique sur c_douane (l'index sera supprimé automatiquement)
ALTER TABLE client DROP CONSTRAINT IF EXISTS client_c_douane_key CASCADE;
DROP INDEX IF EXISTS client_c_douane_key CASCADE;

-- Supprimer la contrainte unique sur iban (l'index sera supprimé automatiquement)
ALTER TABLE client DROP CONSTRAINT IF EXISTS client_iban_key CASCADE;
DROP INDEX IF EXISTS client_iban_key CASCADE;

-- Supprimer la contrainte unique sur compte_cpt (l'index sera supprimé automatiquement)
ALTER TABLE client DROP CONSTRAINT IF EXISTS client_compte_cpt_key CASCADE;
DROP INDEX IF EXISTS client_compte_cpt_key CASCADE;

-- ÉTAPE 5.5: Nettoyer les données avant de créer les index UNIQUE
-- ===================================================================
-- Convertir les chaînes vides en NULL pour éviter les doublons sur les index UNIQUE
UPDATE client SET id_fiscal = NULL WHERE id_fiscal = '' OR TRIM(id_fiscal) = '';
UPDATE client SET c_douane = NULL WHERE c_douane = '' OR TRIM(c_douane) = '';
UPDATE client SET iban = NULL WHERE iban = '' OR TRIM(iban) = '';
UPDATE client SET compte_cpt = NULL WHERE compte_cpt = '' OR TRIM(compte_cpt) = '';

-- Convertir les chaînes vides en NULL pour personnel aussi
UPDATE personnel SET email = NULL WHERE email = '' OR TRIM(email) = '';
-- Note: keycloak_id est de type UUID, il ne peut pas être une chaîne vide, seulement NULL

-- ÉTAPE 6: Créer les nouvelles contraintes UNIQUE composites sur client
-- ===================================================================
-- UNIQUE par organisation pour id_fiscal (uniquement si non null et non vide)
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_org_id_fiscal 
ON client(organisation_id, id_fiscal) 
WHERE id_fiscal IS NOT NULL AND TRIM(id_fiscal) <> '';

-- UNIQUE par organisation pour c_douane (uniquement si non null et non vide)
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_org_c_douane 
ON client(organisation_id, c_douane) 
WHERE c_douane IS NOT NULL AND TRIM(c_douane) <> '';

-- UNIQUE par organisation pour iban (uniquement si non null et non vide)
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_org_iban 
ON client(organisation_id, iban) 
WHERE iban IS NOT NULL AND TRIM(iban) <> '';

-- UNIQUE par organisation pour compte_cpt (uniquement si non null et non vide)
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_org_compte_cpt 
ON client(organisation_id, compte_cpt) 
WHERE compte_cpt IS NOT NULL AND TRIM(compte_cpt) <> '';

-- Index simple sur organisation_id pour les requêtes
CREATE INDEX IF NOT EXISTS idx_client_organisation_id ON client(organisation_id);

-- ===================================================================
-- ÉTAPE 7: Mettre à jour les données existantes
-- ===================================================================
-- IMPORTANT: Cette section doit être personnalisée pour chaque base de données
-- 
-- Pour la base VELOSI (organisation_id = 1):
-- UPDATE personnel SET organisation_id = 1 WHERE organisation_id IS NULL OR organisation_id = 0;
-- UPDATE client SET organisation_id = 1 WHERE organisation_id IS NULL OR organisation_id = 0;
--
-- Pour la base DANINO (organisation_id = 2):
-- UPDATE personnel SET organisation_id = 2 WHERE organisation_id IS NULL OR organisation_id = 0;
-- UPDATE client SET organisation_id = 2 WHERE organisation_id IS NULL OR organisation_id = 0;
--
-- ===================================================================

-- Vérification
-- ===================================================================
-- Vérifier que tous les enregistrements ont un organisation_id valide
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM personnel WHERE organisation_id IS NULL OR organisation_id = 0) THEN
        RAISE WARNING 'ATTENTION: Des enregistrements dans personnel n''ont pas d''organisation_id valide !';
    END IF;
    
    IF EXISTS (SELECT 1 FROM client WHERE organisation_id IS NULL OR organisation_id = 0) THEN
        RAISE WARNING 'ATTENTION: Des enregistrements dans client n''ont pas d''organisation_id valide !';
    END IF;
END $$;

-- Afficher un résumé
SELECT 
    'personnel' as table_name,
    organisation_id,
    COUNT(*) as count
FROM personnel
GROUP BY organisation_id
UNION ALL
SELECT 
    'client' as table_name,
    organisation_id,
    COUNT(*) as count
FROM client
GROUP BY organisation_id
ORDER BY table_name, organisation_id;

-- ===================================================================
-- FIN DE LA MIGRATION 008
-- ===================================================================
