-- ===============================================
-- Migration: Ajout du champ 'unit' (unité de mesure) aux lignes de cotation
-- Date: 2025-11-24
-- Description: Ajoute le champ 'unit' à la table crm_quote_items pour stocker l'unité de mesure
-- ===============================================

-- Ajout de la colonne 'unit' (nullable pour compatibilité avec les données existantes)
ALTER TABLE crm_quote_items
ADD COLUMN unit VARCHAR(50) NULL;

-- Commentaire sur la colonne
COMMENT ON COLUMN crm_quote_items.unit IS 'Unité de mesure (ex: TONNE, M3, PIECE, FORFAIT, etc.)';

-- Créer un index pour faciliter les recherches par unité
CREATE INDEX idx_quote_items_unit ON crm_quote_items(unit);

-- ===============================================
-- Valeurs d'unités suggérées (référence uniquement)
-- ===============================================
-- POIDS: KG, TONNE, LBS, QUINTAL
-- VOLUME: M3, L, CBM, CBF
-- QUANTITÉ: PIECE, COLIS, PALETTE, CARTON, SAC, UNITE
-- AUTRE: TRAJET, FORFAIT, JOUR, HEURE, VOYAGE

-- ===============================================
-- Vérification après migration
-- ===============================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'crm_quote_items'
-- AND column_name = 'unit';

-- ===============================================
-- Rollback (en cas de besoin)
-- ===============================================
-- DROP INDEX IF EXISTS idx_quote_items_unit;
-- ALTER TABLE crm_quote_items DROP COLUMN IF EXISTS unit;
