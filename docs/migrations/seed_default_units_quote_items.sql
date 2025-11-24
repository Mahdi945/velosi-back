-- ===============================================
-- Script de seed: Ajout d'unités par défaut aux cotations existantes
-- Date: 2025-11-24
-- Description: Assigne des unités par défaut aux lignes de cotation existantes
-- ===============================================

-- ⚠️ ATTENTION: Ce script est OPTIONNEL
-- Exécutez-le seulement si vous souhaitez remplir automatiquement les unités pour les données existantes

-- 1. Assigner 'TRAJET' aux lignes de type 'freight' sans unité
UPDATE crm_quote_items
SET unit = 'TRAJET'
WHERE item_type = 'freight' 
AND unit IS NULL;

-- 2. Assigner 'FORFAIT' aux lignes de type 'additional_cost' sans unité
UPDATE crm_quote_items
SET unit = 'FORFAIT'
WHERE item_type = 'additional_cost' 
AND unit IS NULL;

-- 3. Assigner des unités selon la catégorie (si définie)
UPDATE crm_quote_items
SET unit = CASE
    WHEN category = 'groupage' THEN 'M3'
    WHEN category = 'complet' THEN 'PIECE'
    WHEN category = 'routier' THEN 'TRAJET'
    WHEN category = 'aerien_normale' THEN 'KG'
    WHEN category = 'aerien_expresse' THEN 'KG'
    ELSE 'PIECE'
END
WHERE item_type = 'freight' 
AND unit = 'TRAJET' 
AND category IS NOT NULL;

-- ===============================================
-- Vérification après seed
-- ===============================================
-- SELECT 
--     item_type,
--     category,
--     unit,
--     COUNT(*) as count
-- FROM crm_quote_items
-- GROUP BY item_type, category, unit
-- ORDER BY item_type, category, unit;

-- Afficher les lignes sans unité (devrait être vide après le seed)
-- SELECT id, description, item_type, category, unit
-- FROM crm_quote_items
-- WHERE unit IS NULL;
