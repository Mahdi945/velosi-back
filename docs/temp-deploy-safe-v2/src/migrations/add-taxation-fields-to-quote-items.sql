-- ====================================================================
-- Migration: Ajout des champs de taxation par ligne dans crm_quote_items
-- Date: 2025-11-25
-- Description: Remplace le système de TVA globale par une TVA par ligne
--              + Ajout des champs comptables et classification
-- ====================================================================

-- 🔢 1. CHAMPS DE TAXATION PAR LIGNE
-- --------------------------------------------------------------------

-- Taux de TVA spécifique pour cette ligne (19%, 7%, 0%)
ALTER TABLE crm_quote_items
ADD COLUMN tax_rate NUMERIC(5,2) NOT NULL DEFAULT 19.0;

-- Montant de TVA calculé pour cette ligne
ALTER TABLE crm_quote_items
ADD COLUMN tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Indicateur si la ligne est soumise à TVA
ALTER TABLE crm_quote_items
ADD COLUMN is_taxable BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN crm_quote_items.tax_rate IS 'Taux de TVA appliqué à cette ligne (ex: 19.00, 7.00, 0.00)';
COMMENT ON COLUMN crm_quote_items.tax_amount IS 'Montant de TVA calculé pour cette ligne';
COMMENT ON COLUMN crm_quote_items.is_taxable IS 'Indique si cette ligne est soumise à la TVA';


-- 📊 2. CHAMPS COMPTABLES
-- --------------------------------------------------------------------

-- Compte comptable pour opérations taxables
ALTER TABLE crm_quote_items
ADD COLUMN taxable_account VARCHAR(200) NULL;

-- Compte comptable pour opérations non taxables
ALTER TABLE crm_quote_items
ADD COLUMN non_taxable_account VARCHAR(200) NULL;

COMMENT ON COLUMN crm_quote_items.taxable_account IS 'Libellé du compte comptable G.Taxable (ex: PRESTATIONS DE SERVICE IMPORT)';
COMMENT ON COLUMN crm_quote_items.non_taxable_account IS 'Libellé du compte comptable Non Taxable (ex: PRESTATIONS DE SERVICE EN SUISSE)';


-- 💼 3. CHAMPS DE CLASSIFICATION
-- --------------------------------------------------------------------

-- Indicateur débours (frais avancés pour le client sans marge)
ALTER TABLE crm_quote_items
ADD COLUMN is_debours BOOLEAN NOT NULL DEFAULT false;

-- Type de chiffre d'affaires: "Oui", "Non", "Oui débours"
ALTER TABLE crm_quote_items
ADD COLUMN ca_type VARCHAR(50) NULL DEFAULT 'Oui';

COMMENT ON COLUMN crm_quote_items.is_debours IS 'Indique si cette ligne est un débours (frais avancés sans marge)';
COMMENT ON COLUMN crm_quote_items.ca_type IS 'Type de CA: "Oui" (normal), "Non" (ligne info), "Oui débours" (CA sans marge)';


-- 🔄 4. MISE À JOUR DES DONNÉES EXISTANTES
-- --------------------------------------------------------------------

-- Mettre à jour les lignes existantes avec les valeurs par défaut
-- Les lignes existantes auront taxRate = 19% et isTaxable = true par défaut
UPDATE crm_quote_items
SET 
  tax_rate = 19.0,
  tax_amount = ROUND((selling_price * quantity * 19.0 / 100), 2),
  is_taxable = true,
  is_debours = false,
  ca_type = 'Oui'
WHERE tax_rate IS NULL;

-- Pour les exports (si importExport existe dans la cotation parente)
-- On peut définir isTaxable = false pour les lignes d'export
-- (Nécessiterait une jointure avec crm_quotes si besoin)


-- ✅ 5. VÉRIFICATION
-- --------------------------------------------------------------------

-- Vérifier les colonnes ajoutées
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'crm_quote_items'
  AND column_name IN (
    'tax_rate', 
    'tax_amount', 
    'is_taxable', 
    'taxable_account', 
    'non_taxable_account',
    'is_debours',
    'ca_type'
  )
ORDER BY ordinal_position;

-- Afficher un échantillon des données mises à jour
SELECT 
  id,
  description,
  selling_price,
  quantity,
  tax_rate,
  tax_amount,
  is_taxable,
  is_debours,
  ca_type
FROM crm_quote_items
LIMIT 5;
