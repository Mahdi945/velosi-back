-- ========================================
-- Migration: Rendre assigned_to nullable dans crm_opportunities
-- Date: 2025-10-08
-- Description: Permet la création d'opportunités sans assignation immédiate
-- ========================================

-- Vérifier si la table existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_opportunities') THEN
        RAISE EXCEPTION 'Table crm_opportunities n''existe pas. Veuillez d''abord créer les tables CRM.';
    END IF;
    
    RAISE NOTICE 'Modification de la contrainte assigned_to dans crm_opportunities...';
END
$$;

-- Supprimer la contrainte NOT NULL sur assigned_to
ALTER TABLE crm_opportunities 
ALTER COLUMN assigned_to DROP NOT NULL;

-- Vérifier le changement
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'crm_opportunities' 
        AND column_name = 'assigned_to' 
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '✅ Succès: La colonne assigned_to accepte maintenant les valeurs NULL';
    ELSE
        RAISE EXCEPTION '❌ Erreur: La colonne assigned_to est toujours NOT NULL';
    END IF;
END
$$;

-- Commentaire explicatif
COMMENT ON COLUMN crm_opportunities.assigned_to IS 
'Personnel commercial assigné à l''opportunité (nullable - peut être assigné plus tard)';

RAISE NOTICE 'Migration terminée: assigned_to est maintenant nullable dans crm_opportunities';