-- Script de vérification pour la colonne updated_by

-- 1. Vérifier si la colonne existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'crm_quotes' 
            AND column_name = 'updated_by'
        ) THEN 'La colonne updated_by EXISTE'
        ELSE 'La colonne updated_by N''EXISTE PAS'
    END as status;

-- 2. Si elle existe, afficher ses détails
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'crm_quotes'
AND column_name = 'updated_by';

-- 3. Afficher la structure complète de la table
\d crm_quotes

-- 4. Tester une requête UPDATE (sans modifier les données)
SELECT 
    id,
    quote_number,
    created_by,
    updated_by,
    created_at,
    updated_at
FROM crm_quotes
LIMIT 5;
