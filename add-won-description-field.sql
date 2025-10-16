-- Script pour ajouter le champ won_description à la table crm_opportunities
-- Date: 2025-10-16
-- Description: Ajoute le champ won_description pour stocker la description du succès lors de la fermeture d'une opportunité

-- Ajouter la colonne won_description 
ALTER TABLE crm_opportunities 
ADD COLUMN won_description TEXT NULL;

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN crm_opportunities.won_description IS 'Description détaillée du succès lorsque l''opportunité est marquée comme gagnée';

-- Vérifier que la colonne a été ajoutée correctement
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'crm_opportunities' 
AND column_name IN ('won_description', 'lost_reason')
ORDER BY column_name;