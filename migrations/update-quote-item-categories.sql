-- Migration pour mettre à jour les catégories des lignes de devis
-- Date: 2025-01-18
-- Description: Remplace les anciennes catégories par les nouvelles (groupage, aerien, routier, complet)

-- 1. D'abord, modifier le type ENUM pour ajouter les nouvelles valeurs
ALTER TABLE crm_quote_items 
MODIFY COLUMN category ENUM('groupage', 'aerien', 'routier', 'complet', 'national', 'international', 'express', 'standard', 'freight', 'logistics', 'warehousing', 'distribution');

-- 2. Migrer les anciennes valeurs vers les nouvelles
-- National -> Routier
UPDATE crm_quote_items SET category = 'routier' WHERE category = 'national';

-- International -> Aerien
UPDATE crm_quote_items SET category = 'aerien' WHERE category = 'international';

-- Express -> Aerien
UPDATE crm_quote_items SET category = 'aerien' WHERE category = 'express';

-- Standard -> Routier
UPDATE crm_quote_items SET category = 'routier' WHERE category = 'standard';

-- Freight -> Complet
UPDATE crm_quote_items SET category = 'complet' WHERE category = 'freight';

-- Logistics -> Complet
UPDATE crm_quote_items SET category = 'complet' WHERE category = 'logistics';

-- Warehousing -> Groupage
UPDATE crm_quote_items SET category = 'groupage' WHERE category = 'warehousing';

-- Distribution -> Groupage
UPDATE crm_quote_items SET category = 'groupage' WHERE category = 'distribution';

-- 3. Supprimer les anciennes valeurs du ENUM
ALTER TABLE crm_quote_items 
MODIFY COLUMN category ENUM('groupage', 'aerien', 'routier', 'complet');

-- 4. Vérifier les résultats
SELECT category, COUNT(*) as count 
FROM crm_quote_items 
WHERE category IS NOT NULL
GROUP BY category;
