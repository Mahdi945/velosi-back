-- Migration pour mettre à jour les catégories de transport et ajouter les dimensions
-- Date: 2025-10-26
-- Description: Ajout des nouvelles catégories de transport (aerien_normale, aerien_expresse)
--              Modification de service_type en VARCHAR
--              Ajout des champs dimensions (longueur, largeur, hauteur, poids volumétrique)

-- ========================================
-- 1. Modifier l'enum category pour ajouter les nouvelles valeurs
-- ========================================

-- Pour PostgreSQL: Ajouter les nouvelles valeurs à l'enum existant
ALTER TYPE quote_item_category_enum ADD VALUE IF NOT EXISTS 'aerien_normale';
ALTER TYPE quote_item_category_enum ADD VALUE IF NOT EXISTS 'aerien_expresse';

-- Note: L'ancienne valeur 'aerien' reste pour compatibilité avec les données existantes
-- Elle sera convertie en 'aerien_normale' par le code frontend

-- ========================================
-- 2. Modifier service_type de ENUM vers VARCHAR
-- ========================================

-- Ajouter une colonne temporaire VARCHAR
ALTER TABLE crm_quote_items ADD COLUMN service_type_temp VARCHAR(50);

-- Copier les données existantes (si elles existent)
UPDATE crm_quote_items 
SET service_type_temp = CAST(service_type AS VARCHAR)
WHERE service_type IS NOT NULL;

-- Supprimer l'ancienne colonne enum
ALTER TABLE crm_quote_items DROP COLUMN service_type;

-- Renommer la colonne temporaire
ALTER TABLE crm_quote_items RENAME COLUMN service_type_temp TO service_type;

-- ========================================
-- 3. Ajouter les nouvelles colonnes pour dimensions
-- ========================================

-- Longueur en centimètres
ALTER TABLE crm_quote_items 
ADD COLUMN IF NOT EXISTS length_cm DECIMAL(8,2) NULL;

-- Largeur en centimètres
ALTER TABLE crm_quote_items 
ADD COLUMN IF NOT EXISTS width_cm DECIMAL(8,2) NULL;

-- Hauteur en centimètres
ALTER TABLE crm_quote_items 
ADD COLUMN IF NOT EXISTS height_cm DECIMAL(8,2) NULL;

-- Poids volumétrique en kilogrammes
ALTER TABLE crm_quote_items 
ADD COLUMN IF NOT EXISTS volumetric_weight DECIMAL(10,2) NULL;

-- ========================================
-- 4. Modifier la précision du volume_m3 pour plus de précision
-- ========================================

ALTER TABLE crm_quote_items 
ALTER COLUMN volume_m3 TYPE DECIMAL(10,3);

-- ========================================
-- 5. Ajouter des commentaires pour documentation
-- ========================================

COMMENT ON COLUMN crm_quote_items.length_cm IS 'Longueur du colis en centimètres (pour calcul volume)';
COMMENT ON COLUMN crm_quote_items.width_cm IS 'Largeur du colis en centimètres (pour calcul volume)';
COMMENT ON COLUMN crm_quote_items.height_cm IS 'Hauteur du colis en centimètres (pour calcul volume)';
COMMENT ON COLUMN crm_quote_items.volumetric_weight IS 'Poids volumétrique en kg (calculé selon catégorie: aérien normal /6000, express /5000, groupage /1000000)';
COMMENT ON COLUMN crm_quote_items.service_type IS 'Type de service: "avec_livraison" ou "sans_livraison"';
COMMENT ON COLUMN crm_quote_items.category IS 'Catégorie de transport: groupage (LCL), complet (FCL), routier, aerien_normale, aerien_expresse';

-- ========================================
-- 6. Mettre à jour les valeurs par défaut pour service_type
-- ========================================

-- Définir une valeur par défaut pour les nouvelles lignes
UPDATE crm_quote_items 
SET service_type = 'sans_livraison' 
WHERE service_type IS NULL;

-- ========================================
-- 7. Mettre à jour l'enum TransportType dans les opportunités
-- ========================================

-- Ajouter les nouvelles valeurs à l'enum transport_type
ALTER TYPE transport_type_enum ADD VALUE IF NOT EXISTS 'aerien_normale';
ALTER TYPE transport_type_enum ADD VALUE IF NOT EXISTS 'aerien_expresse';

-- ========================================
-- 8. Migration des données existantes (optionnel)
-- ========================================

-- Convertir les anciennes valeurs 'aerien' en 'aerien_normale' dans quote_items
UPDATE crm_quote_items 
SET category = 'aerien_normale' 
WHERE category = 'aerien';

-- Convertir les anciennes valeurs 'aerien' en 'aerien_normale' dans opportunities
UPDATE crm_opportunities 
SET transport_type = 'aerien_normale' 
WHERE transport_type = 'aerien';

-- ========================================
-- NOTES IMPORTANTES:
-- ========================================
-- 
-- 1. Formules de calcul poids volumétrique:
--    - Aérien Normale: (L × l × h × colis) / 6000
--    - Aérien Expresse: (L × l × h × colis) / 5000
--    - Groupage (LCL):  (L × l × h × colis) / 1000000 × 1000 (pour convertir en kg)
--
-- 2. Le calcul du volume en m³:
--    Volume = (longueur × largeur × hauteur × nombre_colis) / 1,000,000
--
-- 3. Les calculs sont effectués côté backend dans le service QuotesService
--
-- 4. Service Type:
--    - Anciennement enum, maintenant VARCHAR(50)
--    - Valeurs: "avec_livraison" ou "sans_livraison"
--    - Par défaut: "sans_livraison"
--
-- 5. Comportement du champ "Poids Total" (weight_kg):
--    - MASQUÉ dans l'interface pour Aérien Normale et Aérien Expresse
--    - Pour ces catégories, c'est le POIDS VOLUMÉTRIQUE qui est utilisé
--    - Affiché normalement pour: Groupage (LCL), Complet (FCL), Routier
--
-- ========================================
-- FIN DE LA MIGRATION
-- ========================================
