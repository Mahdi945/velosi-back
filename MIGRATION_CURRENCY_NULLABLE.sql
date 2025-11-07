-- Migration: Rendre le champ currency nullable et supprimer la valeur par défaut 'TND'
-- Date: 2025-11-07
-- Objectif: Permettre l'enregistrement de n'importe quelle devise (EUR, USD, etc.) sans forcer TND

-- ========================================
-- 1. Modifier la table crm_leads
-- ========================================

-- Supprimer la valeur par défaut et rendre la colonne nullable
ALTER TABLE crm_leads 
  ALTER COLUMN currency DROP DEFAULT,
  ALTER COLUMN currency DROP NOT NULL;

-- Vérification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'crm_leads' AND column_name = 'currency';

-- ========================================
-- 2. Modifier la table crm_opportunities
-- ========================================

-- Supprimer la valeur par défaut et rendre la colonne nullable
ALTER TABLE crm_opportunities 
  ALTER COLUMN currency DROP DEFAULT,
  ALTER COLUMN currency DROP NOT NULL;

-- Vérification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'crm_opportunities' AND column_name = 'currency';

-- ========================================
-- 3. Vérification des données existantes
-- ========================================

-- Compter les enregistrements par devise dans crm_leads
SELECT 
  currency,
  COUNT(*) as count
FROM crm_leads
GROUP BY currency
ORDER BY count DESC;

-- Compter les enregistrements par devise dans crm_opportunities
SELECT 
  currency,
  COUNT(*) as count
FROM crm_opportunities
GROUP BY currency
ORDER BY count DESC;

-- ========================================
-- 4. Notes importantes
-- ========================================

-- IMPORTANT: Cette migration NE modifie PAS les données existantes
-- Les enregistrements avec currency = 'TND' restent en TND
-- Les nouveaux enregistrements pourront avoir EUR, USD, GBP, etc.
-- 
-- Les montants (estimatedValue, value) sont TOUJOURS stockés en TND
-- La colonne 'currency' indique la devise ORIGINALE sélectionnée par l'utilisateur
--
-- Exemple:
-- Si l'utilisateur entre 200 EUR, le système enregistre:
--   - estimatedValue: 681.00 (converti en TND)
--   - currency: 'EUR' (devise originale pour référence)
