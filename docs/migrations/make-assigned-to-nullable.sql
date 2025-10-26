-- Migration pour rendre assigned_to nullable dans crm_activities
-- Date: 2025-10-17
-- Description: Permet de créer des activités non assignées à un commercial

-- Étape 1: Rendre la colonne nullable
ALTER TABLE crm_activities 
MODIFY COLUMN assigned_to INT NULL;

-- Étape 2: Mettre à NULL les activités où assignedTo = createdBy
-- (pour les activités créées automatiquement assignées au créateur)
-- À exécuter uniquement si vous voulez nettoyer les données existantes
-- UPDATE crm_activities 
-- SET assigned_to = NULL 
-- WHERE assigned_to = created_by 
-- AND assigned_to IN (
--     SELECT id FROM personnel WHERE role IN ('administratif', 'admin', 'administrator')
-- );

-- Étape 3: Vérifier les contraintes de clé étrangère
-- Si nécessaire, recréer la contrainte avec ON DELETE SET NULL
-- ALTER TABLE crm_activities
-- DROP FOREIGN KEY fk_crm_activities_assigned_to;

-- ALTER TABLE crm_activities
-- ADD CONSTRAINT fk_crm_activities_assigned_to
-- FOREIGN KEY (assigned_to) REFERENCES personnel(id)
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;

-- Vérification
SELECT 
    id,
    title,
    assigned_to,
    created_by,
    CASE 
        WHEN assigned_to IS NULL THEN 'Non assigné'
        ELSE 'Assigné'
    END as statut_assignation
FROM crm_activities
ORDER BY created_at DESC
LIMIT 10;
