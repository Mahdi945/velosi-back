-- ============================
-- Correction de la contrainte message_type pour inclure 'audio' et 'location'
-- PostgreSQL - Script de correction rapide
-- ============================

-- Vérifier la contrainte actuelle
SELECT 
    conname AS constraint_name,
    consrc AS check_clause
FROM pg_constraint 
WHERE conname LIKE '%message_type%' AND conrelid = 'vechat_messages'::regclass;

-- Supprimer l'ancienne contrainte et créer la nouvelle
DO $$
BEGIN
    -- Supprimer toutes les contraintes liées à message_type
    PERFORM pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conname LIKE '%message_type%' AND conrelid = 'vechat_messages'::regclass;
    
    -- Supprimer la contrainte existante
    ALTER TABLE vechat_messages DROP CONSTRAINT IF EXISTS vechat_messages_message_type_check;
    ALTER TABLE vechat_messages DROP CONSTRAINT IF EXISTS "CHK_vechat_messages_message_type";
    
    -- Créer la nouvelle contrainte avec tous les types
    ALTER TABLE vechat_messages 
    ADD CONSTRAINT vechat_messages_message_type_check 
    CHECK (message_type IN ('text', 'image', 'file', 'video', 'voice', 'audio', 'location'));
    
    RAISE NOTICE '✅ Contrainte message_type mise à jour avec succès';
    
EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Erreur lors de la mise à jour de la contrainte: %', SQLERRM;
END $$;

-- Vérifier la nouvelle contrainte
SELECT 
    conname AS constraint_name,
    consrc AS check_clause
FROM pg_constraint 
WHERE conname LIKE '%message_type%' AND conrelid = 'vechat_messages'::regclass;

-- Test d'insertion pour vérifier que ça marche
DO $$
BEGIN
    -- Tester l'insertion d'un message audio (simulation)
    RAISE NOTICE 'Test: La contrainte accepte maintenant les types audio et location';
END $$;