-- Script de test pour valider la structure VelosiChat
-- À exécuter après avoir créé les tables avec create_vechat_tables_optimized.sql

-- Test 1: Vérifier que les tables existent
SELECT 'Tables VelosiChat créées' as status;
SHOW TABLES LIKE 'vechat_%';

-- Test 2: Insérer des données de test
INSERT INTO vechat_conversations 
(participant1_id, participant1_type, participant1_name, participant1_photo,
 participant2_id, participant2_type, participant2_name, participant2_photo,
 created_at, updated_at)
VALUES 
(1, 'personnel', 'Jean Dupont', 'jean.jpg', 2, 'client', 'Client Test', 'client.jpg', NOW(), NOW());

-- Test 3: Insérer un message de test
INSERT INTO vechat_messages 
(conversation_id, sender_id, sender_type, sender_name, sender_photo, content, message_type, created_at, updated_at)
VALUES 
(1, 1, 'personnel', 'Jean Dupont', 'jean.jpg', 'Message de test', 'text', NOW(), NOW());

-- Test 4: Tester la vue unifiée des utilisateurs (si créée)
SELECT 'Test vue utilisateurs unifiés' as test;
SELECT * FROM vechat_unified_users_view LIMIT 5;

-- Test 5: Tester les procédures stockées
SELECT 'Test récupération utilisateurs pour personnel' as test;
CALL GetUsersForChat(1, 'personnel');

SELECT 'Test récupération utilisateurs pour client' as test;
CALL GetUsersForChat(1, 'client');

-- Test 6: Vérifier les index
SELECT 'Vérification des index' as test;
SHOW INDEX FROM vechat_conversations;
SHOW INDEX FROM vechat_messages;

-- Test 7: Tester les triggers (si créés)
SELECT 'Test triggers' as test;
UPDATE vechat_conversations SET last_message = 'Trigger test' WHERE id = 1;

-- Test 8: Nettoyer les données de test
SELECT 'Nettoyage des données de test' as status;
DELETE FROM vechat_messages WHERE content = 'Message de test';
DELETE FROM vechat_conversations WHERE participant1_name = 'Jean Dupont' AND participant2_name = 'Client Test';

SELECT 'Tests terminés avec succès!' as result;