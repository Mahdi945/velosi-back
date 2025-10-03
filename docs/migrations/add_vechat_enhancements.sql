-- Migration pour améliorer VeChat avec les fonctionnalités Messenger-like
-- Date: 2024-10-03
-- Description: Ajouter les champs pour les marqueurs de lecture, édition de messages, et tracking de connexion

-- Ajouter les champs pour les marqueurs de lecture et édition aux messages
ALTER TABLE vechat_messages 
ADD COLUMN is_delivered BOOLEAN DEFAULT FALSE,
ADD COLUMN delivered_at TIMESTAMP NULL,
ADD COLUMN is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN edited_at TIMESTAMP NULL,
ADD COLUMN original_message TEXT NULL;

-- Ajouter les champs pour le tracking de connexion dans presence
ALTER TABLE vechat_presence 
ADD COLUMN connected_at TIMESTAMP NULL,
ADD COLUMN connection_info TEXT NULL;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_vechat_messages_delivered ON vechat_messages(is_delivered);
CREATE INDEX IF NOT EXISTS idx_vechat_messages_edited ON vechat_messages(is_edited);
CREATE INDEX IF NOT EXISTS idx_vechat_presence_connected_at ON vechat_presence(connected_at);

-- Mettre à jour les messages existants comme étant délivrés et lus s'ils sont lus
UPDATE vechat_messages 
SET is_delivered = TRUE, delivered_at = read_at 
WHERE is_read = TRUE AND delivered_at IS NULL;

-- Mettre à jour les messages existants non lus comme étant délivrés avec la date de création
UPDATE vechat_messages 
SET is_delivered = TRUE, delivered_at = created_at 
WHERE is_read = FALSE AND delivered_at IS NULL;

-- Ajouter des contraintes pour maintenir la cohérence des données
ALTER TABLE vechat_messages 
ADD CONSTRAINT check_delivered_before_read 
CHECK (delivered_at IS NULL OR read_at IS NULL OR delivered_at <= read_at);

ALTER TABLE vechat_messages 
ADD CONSTRAINT check_edited_date 
CHECK (edited_at IS NULL OR edited_at >= created_at);

-- Mettre à jour la structure pour supporter les connexions en temps réel
UPDATE vechat_presence 
SET connected_at = last_seen 
WHERE status = 'online' AND connected_at IS NULL;

-- Commentaires pour documenter les nouveaux champs
COMMENT ON COLUMN vechat_messages.is_delivered IS 'Indique si le message a été délivré au destinataire';
COMMENT ON COLUMN vechat_messages.delivered_at IS 'Horodatage de la délivrance du message';
COMMENT ON COLUMN vechat_messages.is_edited IS 'Indique si le message a été modifié';
COMMENT ON COLUMN vechat_messages.edited_at IS 'Horodatage de la dernière modification';
COMMENT ON COLUMN vechat_messages.original_message IS 'Contenu original du message avant modification';
COMMENT ON COLUMN vechat_presence.connected_at IS 'Horodatage de la connexion de l\'utilisateur au chat';
COMMENT ON COLUMN vechat_presence.connection_info IS 'Informations supplémentaires sur la connexion';

-- Afficher un résumé des modifications
SELECT 
    'vechat_messages' as table_name,
    COUNT(*) as total_messages,
    SUM(CASE WHEN is_delivered THEN 1 ELSE 0 END) as delivered_messages,
    SUM(CASE WHEN is_read THEN 1 ELSE 0 END) as read_messages,
    SUM(CASE WHEN is_edited THEN 1 ELSE 0 END) as edited_messages
FROM vechat_messages
UNION ALL
SELECT 
    'vechat_presence' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_users,
    SUM(CASE WHEN connected_at IS NOT NULL THEN 1 ELSE 0 END) as users_with_connection_time,
    0 as unused_field
FROM vechat_presence;

COMMIT;