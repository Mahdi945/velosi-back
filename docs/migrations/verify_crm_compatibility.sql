-- ========================================
-- SCRIPT DE VÉRIFICATION CRM
-- Vérification de compatibilité avec les entités existantes
-- ========================================

-- 1. Vérifier l'existence des tables de référence
SELECT 'Vérification table personnel' as check_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personnel') 
            THEN 'OK' ELSE 'ERREUR - Table personnel manquante' END as status;

SELECT 'Vérification table client' as check_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client') 
            THEN 'OK' ELSE 'ERREUR - Table client manquante' END as status;

-- 2. Vérifier la structure des colonnes de personnel
SELECT 'Vérification colonnes personnel' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'personnel' AND column_name = 'prenom')
            AND EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'personnel' AND column_name = 'nom')
            AND EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'personnel' AND column_name = 'role')
            THEN 'OK' ELSE 'ERREUR - Colonnes manquantes dans personnel' END as status;

-- 3. Vérifier la structure des colonnes de client
SELECT 'Vérification colonnes client' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'client' AND column_name = 'id')
            THEN 'OK' ELSE 'ERREUR - Colonne id manquante dans client' END as status;

-- 4. Test de la vue view_leads_by_sales
SELECT 'Test vue view_leads_by_sales' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'view_leads_by_sales')
            THEN 'OK' ELSE 'Vue non créée' END as status;

-- 5. Afficher les colonnes de personnel pour vérification
SELECT 'Colonnes table personnel:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'personnel' 
ORDER BY ordinal_position;

-- 6. Afficher les colonnes de client pour vérification  
SELECT 'Colonnes table client:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'client' 
ORDER BY ordinal_position;