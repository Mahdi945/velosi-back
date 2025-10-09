-- Migration: Améliorer le champ téléphone des prospects
-- Date: 2025-01-09
-- Description: S'assurer que le champ phone supporte les indicatifs internationaux

-- Vérifier la colonne phone actuelle
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_name = 'crm_leads' 
AND column_name = 'phone';

-- Si nécessaire, modifier la longueur pour supporter les numéros internationaux
-- ALTER TABLE crm_leads ALTER COLUMN phone TYPE VARCHAR(20);

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN crm_leads.phone IS 'Numéro de téléphone avec indicatif international (ex: +21658123456)';