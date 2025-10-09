-- Migration: Ajouter colonnes téléphone et devise aux opportunités
-- Date: 2025-01-09
-- Description: Ajouter les champs telephone et currency à la table crm_opportunities

-- Ajouter colonne téléphone avec indicatif international
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS telephone VARCHAR(20);
COMMENT ON COLUMN crm_opportunities.telephone IS 'Numéro de téléphone avec indicatif international (ex: +21658123456)';

-- Ajouter colonne devise
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TND';
COMMENT ON COLUMN crm_opportunities.currency IS 'Code devise ISO 4217 (ex: TND, EUR, USD)';

-- Vérifier les colonnes ajoutées
SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'crm_opportunities' 
AND column_name IN ('telephone', 'currency')
ORDER BY ordinal_position;