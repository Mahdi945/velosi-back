-- Migration pour ajouter 'routier' à l'enum transport_type dans les tables CRM
-- Date: 2025-10-17

-- Mettre à jour l'enum transport_type dans crm_opportunities
ALTER TABLE crm_opportunities 
MODIFY COLUMN transport_type ENUM('aerien', 'groupage', 'complet', 'routier') NULL;

-- Note: Cette migration est safe car elle ajoute une valeur à l'enum sans supprimer les anciennes valeurs
