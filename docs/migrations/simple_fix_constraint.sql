-- Script simple pour corriger la contrainte message_type
-- Exécutez ceci dans votre console PostgreSQL

-- 1. Vérifier la contrainte actuelle
SELECT conname, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'vechat_messages'::regclass 
AND conname LIKE '%message_type%';

-- 2. Supprimer l'ancienne contrainte
ALTER TABLE vechat_messages DROP CONSTRAINT vechat_messages_message_type_check;

-- 3. Ajouter la nouvelle contrainte avec tous les types
ALTER TABLE vechat_messages 
ADD CONSTRAINT vechat_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'file', 'video', 'voice', 'audio', 'location'));

-- 4. Vérifier que la nouvelle contrainte est en place
SELECT conname, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'vechat_messages'::regclass 
AND conname LIKE '%message_type%';