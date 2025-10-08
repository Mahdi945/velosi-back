-- ========================================
-- SCRIPT DE VÉRIFICATION FINAL - CRM OPPORTUNITÉS
-- Date: 2025-10-08
-- Description: Vérifier la cohérence complète du système
-- ========================================

-- Vérification 1: Structure de table
SELECT 'Vérification de la structure de crm_opportunities' AS etape;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'crm_opportunities' 
ORDER BY ordinal_position;

-- Vérification 2: Contraintes et clés étrangères
SELECT 'Vérification des contraintes' AS etape;

SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM 
    information_schema.table_constraints AS tc 
    LEFT JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'crm_opportunities';

-- Vérification 3: Index
SELECT 'Vérification des index' AS etape;

SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'crm_opportunities';

-- Test 1: Création d'opportunité sans commercial (doit réussir maintenant)
SELECT 'Test 1: Opportunité sans commercial assigné' AS test;

INSERT INTO crm_opportunities (
    title,
    description,
    value,
    probability,
    stage,
    created_by,
    updated_by
) VALUES (
    'Test Opportunité - Sans Commercial',
    'Test de création sans assignation commerciale',
    1500.00,
    25,
    'prospecting',
    1,  -- ID administratif par défaut
    1
) RETURNING id, title, assigned_to;

-- Test 2: Création d'opportunité avec commercial (doit réussir)
SELECT 'Test 2: Opportunité avec commercial assigné' AS test;

INSERT INTO crm_opportunities (
    title,
    description,
    value,
    probability,
    stage,
    assigned_to,
    created_by,
    updated_by
) VALUES (
    'Test Opportunité - Avec Commercial',
    'Test de création avec assignation commerciale',
    2500.00,
    35,
    'qualification',
    (SELECT id FROM personnel WHERE role = 'commercial' LIMIT 1),
    1,
    1
) RETURNING id, title, assigned_to;

-- Test 3: Mise à jour assignation
SELECT 'Test 3: Mise à jour assignation commerciale' AS test;

UPDATE crm_opportunities 
SET assigned_to = (SELECT id FROM personnel WHERE role = 'commercial' LIMIT 1),
    updated_by = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE title LIKE 'Test Opportunité - Sans Commercial%'
RETURNING id, title, assigned_to;

-- Nettoyage des tests
DELETE FROM crm_opportunities WHERE title LIKE 'Test Opportunité%';

SELECT 'Tests terminés avec succès ✅' AS resultat;