-- ========================================
-- MIGRATION: Ajout du taux de conversion et devise par ligne de cotation
-- Date: 2025-01-07
-- Description: 
--   - Supprime le champ currency de crm_quotes (cotation globale)
--   - Ajoute les champs conversion_rate et currency aux lignes de cotation
--   - La devise est gérée au niveau de chaque ligne de FRET uniquement
--   - Les frais annexes sont toujours en TND (sans conversion)
-- ========================================

-- ========================================
-- 1. Sauvegarder les devises existantes des cotations dans une table temporaire
-- ========================================

CREATE TEMP TABLE IF NOT EXISTS temp_quote_currencies AS
SELECT id, currency FROM crm_quotes WHERE currency IS NOT NULL;

-- ========================================
-- 2. Ajouter le champ currency à crm_quote_items (AVANT suppression de crm_quotes.currency)
-- ========================================

ALTER TABLE crm_quote_items 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT NULL;

-- ========================================
-- 3. Migrer les devises des cotations vers les lignes de FRET
-- ========================================

-- Les lignes de FRET héritent de la devise de la cotation parente
UPDATE crm_quote_items qi
SET currency = COALESCE(
    (SELECT tqc.currency FROM temp_quote_currencies tqc WHERE tqc.id = qi.quote_id),
    'TND'
)
WHERE qi.item_type = 'freight';

-- Les frais annexes sont toujours en TND (pas de conversion)
UPDATE crm_quote_items
SET currency = 'TND'
WHERE item_type = 'additional_cost';

-- ========================================
-- 4. Supprimer le champ currency de crm_quotes
-- ========================================

ALTER TABLE crm_quotes 
DROP COLUMN IF EXISTS currency;

-- ========================================
-- 5. Ajouter le champ conversion_rate à crm_quote_items
-- ========================================

ALTER TABLE crm_quote_items 
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10,4) DEFAULT NULL;

-- ========================================
-- 2. Ajouter les commentaires pour documentation
-- ========================================

COMMENT ON COLUMN crm_quote_items.currency IS 
'Devise de la ligne de cotation (EUR, USD, TND, etc.). Les frais annexes sont toujours en TND';

COMMENT ON COLUMN crm_quote_items.conversion_rate IS 
'Taux de conversion appliqué lors de la transformation de la ligne de cotation en ligne de devis (ex: 0.95 pour 95%)';

-- ========================================
-- 6. Créer des index pour améliorer les performances
-- ========================================

CREATE INDEX IF NOT EXISTS idx_quote_items_currency 
ON crm_quote_items(currency);

CREATE INDEX IF NOT EXISTS idx_quote_items_conversion_rate 
ON crm_quote_items(conversion_rate) 
WHERE conversion_rate IS NOT NULL;

-- ========================================
-- 7. Vérification de la migration
-- ========================================

DO $$ 
BEGIN
    -- Vérifier que les colonnes ont été ajoutées à crm_quote_items
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'crm_quote_items' 
        AND column_name = 'currency'
    ) AND EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'crm_quote_items' 
        AND column_name = 'conversion_rate'
    ) THEN
        RAISE NOTICE '✅ Colonnes currency et conversion_rate ajoutées à crm_quote_items';
    ELSE
        RAISE EXCEPTION '❌ Erreur: Les colonnes n''ont pas été ajoutées à crm_quote_items';
    END IF;
    
    -- Vérifier que currency a été supprimée de crm_quotes
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'crm_quotes' 
        AND column_name = 'currency'
    ) THEN
        RAISE NOTICE '✅ Colonne currency supprimée de crm_quotes';
    ELSE
        RAISE WARNING '⚠️ La colonne currency existe encore dans crm_quotes';
    END IF;
END $$;

-- ========================================
-- NOTES IMPORTANTES
-- ========================================
-- 
-- 1. Suppression du champ currency de crm_quotes:
--    - La devise n'est plus gérée au niveau de la cotation globale
--    - Chaque ligne de cotation a maintenant sa propre devise
--    - Permet plus de flexibilité (frets en différentes devises dans une même cotation)
--
-- 2. Devise par ligne (currency) dans crm_quote_items:
--    - Les lignes de FRET peuvent avoir différentes devises (EUR, USD, TND, etc.)
--    - Les lignes de FRAIS ANNEXES sont TOUJOURS en TND (pas de conversion)
--    - La devise est héritée de l'ancienne devise de la cotation pour la migration
--
-- 3. Le champ conversion_rate est nullable car:
--    - Les cotations existantes n'ont pas de taux de conversion
--    - Le taux n'est défini que lors de la conversion en devis
--
-- 3. Le taux de conversion est un nombre décimal entre 0 et 1:
--    - 1.00 = 100% (pas de remise)
--    - 0.95 = 95% (5% de remise)
--    - 0.80 = 80% (20% de remise)
--
-- 4. Logique de conversion (similaire à prospects/opportunités):
--    - L'utilisateur saisit le taux de conversion souhaité par ligne
--    - Le système applique: prix_devis = prix_cotation × conversion_rate
--    - Chaque ligne peut avoir un taux différent
--    - Les frais annexes (TND) ne nécessitent pas de conversion de devise
--
-- 5. Avantages de la conversion par ligne:
--    - Plus de flexibilité: appliquer des remises différentes selon les services
--    - Meilleure traçabilité: savoir exactement quelle remise a été appliquée
--    - Calculs automatiques: le système recalcule automatiquement les prix
--    - Gestion multi-devises: les frets peuvent être dans différentes devises
--
-- ========================================
-- FIN DE LA MIGRATION
-- ========================================

-- Message final
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Migration terminée avec succès!';
    RAISE NOTICE '';
    RAISE NOTICE 'Changements appliqués:';
    RAISE NOTICE '  • Champ currency SUPPRIMÉ de crm_quotes';
    RAISE NOTICE '  • Champ currency AJOUTÉ à crm_quote_items';
    RAISE NOTICE '  • Champ conversion_rate AJOUTÉ à crm_quote_items';
    RAISE NOTICE '';
    RAISE NOTICE 'Logique:';
    RAISE NOTICE '  • Lignes FRET: devise personnalisable par ligne';
    RAISE NOTICE '  • Lignes FRAIS ANNEXES: toujours TND (sans conversion)';
    RAISE NOTICE '========================================';
END $$;
