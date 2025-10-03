-- Table pour stocker les messages VelosiChat
CREATE TABLE vechat_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Identifiants des participants
    sender_id INT NOT NULL,                    -- ID de l'expéditeur
    receiver_id INT NOT NULL,                  -- ID du destinataire
    sender_type ENUM('personnel', 'client') NOT NULL,   -- Type d'expéditeur
    receiver_type ENUM('personnel', 'client') NOT NULL, -- Type de destinataire
    
    -- Contenu du message
    message TEXT,                              -- Contenu textuel du message
    message_type ENUM('text', 'file', 'image', 'voice', 'video') DEFAULT 'text',
    
    -- Gestion des fichiers et pièces jointes
    file_url VARCHAR(500),                     -- URL du fichier attaché
    file_name VARCHAR(255),                    -- Nom original du fichier
    file_size BIGINT,                          -- Taille du fichier en bytes
    file_type VARCHAR(100),                    -- Type MIME du fichier
    
    -- Métadonnées du message
    is_read BOOLEAN DEFAULT FALSE,             -- Message lu ou non
    is_deleted_by_sender BOOLEAN DEFAULT FALSE,    -- Supprimé par l'expéditeur
    is_deleted_by_receiver BOOLEAN DEFAULT FALSE,  -- Supprimé par le destinataire
    
    -- Gestion des réponses
    reply_to_message_id INT NULL,              -- ID du message auquel on répond
    
    -- Horodatage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,                    -- Quand le message a été lu
    
    -- Clés étrangères
    FOREIGN KEY (reply_to_message_id) REFERENCES vechat_messages(id) ON DELETE SET NULL,
    
    -- Index pour les performances
    INDEX idx_sender (sender_id, sender_type),
    INDEX idx_receiver (receiver_id, receiver_type),
    INDEX idx_conversation (sender_id, receiver_id, sender_type, receiver_type),
    INDEX idx_created_at (created_at),
    INDEX idx_unread (receiver_id, receiver_type, is_read)
);

-- Table pour gérer les conversations/threads
CREATE TABLE vechat_conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Participants
    participant1_id INT NOT NULL,
    participant1_type ENUM('personnel', 'client') NOT NULL,
    participant2_id INT NOT NULL,
    participant2_type ENUM('personnel', 'client') NOT NULL,
    
    -- Métadonnées de la conversation
    last_message_id INT NULL,                  -- Référence au dernier message
    last_message_at TIMESTAMP NULL,           -- Horodatage du dernier message
    
    -- Compteurs de messages non lus pour chaque participant
    unread_count_participant1 INT DEFAULT 0,
    unread_count_participant2 INT DEFAULT 0,
    
    -- Statuts de la conversation
    is_archived_by_participant1 BOOLEAN DEFAULT FALSE,
    is_archived_by_participant2 BOOLEAN DEFAULT FALSE,
    is_muted_by_participant1 BOOLEAN DEFAULT FALSE,
    is_muted_by_participant2 BOOLEAN DEFAULT FALSE,
    
    -- Horodatage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clé unique pour éviter les doublons de conversations
    UNIQUE KEY unique_conversation (participant1_id, participant1_type, participant2_id, participant2_type),
    
    -- Index
    INDEX idx_participant1 (participant1_id, participant1_type),
    INDEX idx_participant2 (participant2_id, participant2_type),
    INDEX idx_last_message (last_message_at),
    
    FOREIGN KEY (last_message_id) REFERENCES vechat_messages(id) ON DELETE SET NULL
);

-- Table pour gérer les statuts de présence en ligne
CREATE TABLE vechat_presence (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_type ENUM('personnel', 'client') NOT NULL,
    
    -- Statut de présence
    status ENUM('online', 'offline', 'away', 'busy') DEFAULT 'offline',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Informations de connexion
    socket_id VARCHAR(255),                    -- ID de socket pour WebSocket
    device_info TEXT,                          -- Informations sur l'appareil
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clé unique par utilisateur
    UNIQUE KEY unique_user_presence (user_id, user_type),
    
    INDEX idx_status (status),
    INDEX idx_last_seen (last_seen)
);

-- Table pour les paramètres de chat par utilisateur
CREATE TABLE vechat_user_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_type ENUM('personnel', 'client') NOT NULL,
    
    -- Paramètres de notification
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sound_notifications BOOLEAN DEFAULT TRUE,
    
    -- Paramètres d'affichage
    theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
    font_size ENUM('small', 'medium', 'large') DEFAULT 'medium',
    
    -- Paramètres de confidentialité
    show_online_status BOOLEAN DEFAULT TRUE,
    show_read_receipts BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_settings (user_id, user_type)
);

-- Modifications à apporter aux tables existantes

-- 1. Ajouter des champs à la table personnel pour le chat
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS 
    chat_avatar VARCHAR(500) COMMENT 'URL de l\'avatar pour le chat',
    is_chat_enabled BOOLEAN DEFAULT TRUE COMMENT 'Utilisateur autorisé à utiliser le chat',
    chat_status_message VARCHAR(255) COMMENT 'Message de statut personnalisé';

-- 2. Ajouter des champs à la table client pour le chat  
ALTER TABLE client ADD COLUMN IF NOT EXISTS
    chat_avatar VARCHAR(500) COMMENT 'URL de l\'avatar pour le chat',
    is_chat_enabled BOOLEAN DEFAULT TRUE COMMENT 'Client autorisé à utiliser le chat',
    chat_status_message VARCHAR(255) COMMENT 'Message de statut personnalisé';

-- 3. Index supplémentaires pour optimiser les requêtes de chat
ALTER TABLE personnel ADD INDEX IF NOT EXISTS idx_chat_enabled (is_chat_enabled);
ALTER TABLE client ADD INDEX IF NOT EXISTS idx_chat_enabled (is_chat_enabled);
ALTER TABLE client ADD INDEX IF NOT EXISTS idx_charge_com (charge_com);

-- Triggers pour maintenir la cohérence des données

DELIMITER //

-- Trigger pour mettre à jour la conversation après insertion d'un nouveau message
CREATE TRIGGER update_conversation_after_message_insert
AFTER INSERT ON vechat_messages
FOR EACH ROW
BEGIN
    -- Identifier les participants
    DECLARE conv_id INT;
    DECLARE participant1_id INT;
    DECLARE participant1_type VARCHAR(20);
    DECLARE participant2_id INT;
    DECLARE participant2_type VARCHAR(20);
    
    -- Normaliser l'ordre des participants (plus petit ID en premier)
    IF (NEW.sender_id < NEW.receiver_id) OR 
       (NEW.sender_id = NEW.receiver_id AND NEW.sender_type < NEW.receiver_type) THEN
        SET participant1_id = NEW.sender_id;
        SET participant1_type = NEW.sender_type;
        SET participant2_id = NEW.receiver_id;
        SET participant2_type = NEW.receiver_type;
    ELSE
        SET participant1_id = NEW.receiver_id;
        SET participant1_type = NEW.receiver_type;
        SET participant2_id = NEW.sender_id;
        SET participant2_type = NEW.sender_type;
    END IF;
    
    -- Créer ou mettre à jour la conversation
    INSERT INTO vechat_conversations (
        participant1_id, participant1_type,
        participant2_id, participant2_type,
        last_message_id, last_message_at,
        unread_count_participant1,
        unread_count_participant2
    ) VALUES (
        participant1_id, participant1_type,
        participant2_id, participant2_type,
        NEW.id, NEW.created_at,
        CASE WHEN NEW.receiver_id = participant1_id AND NEW.receiver_type = participant1_type THEN 1 ELSE 0 END,
        CASE WHEN NEW.receiver_id = participant2_id AND NEW.receiver_type = participant2_type THEN 1 ELSE 0 END
    )
    ON DUPLICATE KEY UPDATE
        last_message_id = NEW.id,
        last_message_at = NEW.created_at,
        unread_count_participant1 = unread_count_participant1 + 
            CASE WHEN NEW.receiver_id = participant1_id AND NEW.receiver_type = participant1_type THEN 1 ELSE 0 END,
        unread_count_participant2 = unread_count_participant2 + 
            CASE WHEN NEW.receiver_id = participant2_id AND NEW.receiver_type = participant2_type THEN 1 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP;
END//

-- Trigger pour décrémenter le compteur de messages non lus quand un message est marqué comme lu
CREATE TRIGGER update_conversation_after_message_read
AFTER UPDATE ON vechat_messages
FOR EACH ROW
BEGIN
    IF OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
        UPDATE vechat_conversations 
        SET 
            unread_count_participant1 = CASE 
                WHEN NEW.receiver_id = participant1_id AND NEW.receiver_type = participant1_type 
                THEN GREATEST(0, unread_count_participant1 - 1) 
                ELSE unread_count_participant1 
            END,
            unread_count_participant2 = CASE 
                WHEN NEW.receiver_id = participant2_id AND NEW.receiver_type = participant2_type 
                THEN GREATEST(0, unread_count_participant2 - 1) 
                ELSE unread_count_participant2 
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE 
            ((participant1_id = NEW.sender_id AND participant1_type = NEW.sender_type AND 
              participant2_id = NEW.receiver_id AND participant2_type = NEW.receiver_type) OR
             (participant1_id = NEW.receiver_id AND participant1_type = NEW.receiver_type AND 
              participant2_id = NEW.sender_id AND participant2_type = NEW.sender_type));
    END IF;
END//

DELIMITER ;

-- Vues pour simplifier les requêtes

-- Vue pour obtenir les conversations avec les informations des participants
CREATE VIEW vechat_conversations_with_details AS
SELECT 
    c.*,
    -- Informations participant 1
    CASE 
        WHEN c.participant1_type = 'personnel' THEN CONCAT(p1.prenom, ' ', p1.nom)
        WHEN c.participant1_type = 'client' THEN CONCAT(cl1.prenom, ' ', cl1.nom)
    END as participant1_name,
    CASE 
        WHEN c.participant1_type = 'personnel' THEN p1.chat_avatar
        WHEN c.participant1_type = 'client' THEN cl1.chat_avatar
    END as participant1_avatar,
    
    -- Informations participant 2
    CASE 
        WHEN c.participant2_type = 'personnel' THEN CONCAT(p2.prenom, ' ', p2.nom)
        WHEN c.participant2_type = 'client' THEN CONCAT(cl2.prenom, ' ', cl2.nom)
    END as participant2_name,
    CASE 
        WHEN c.participant2_type = 'personnel' THEN p2.chat_avatar
        WHEN c.participant2_type = 'client' THEN cl2.chat_avatar
    END as participant2_avatar,
    
    -- Dernier message
    m.message as last_message_text,
    m.message_type as last_message_type
    
FROM vechat_conversations c
LEFT JOIN personnel p1 ON c.participant1_type = 'personnel' AND c.participant1_id = p1.id
LEFT JOIN client cl1 ON c.participant1_type = 'client' AND c.participant1_id = cl1.id
LEFT JOIN personnel p2 ON c.participant2_type = 'personnel' AND c.participant2_id = p2.id
LEFT JOIN client cl2 ON c.participant2_type = 'client' AND c.participant2_id = cl2.id
LEFT JOIN vechat_messages m ON c.last_message_id = m.id;

-- Vue pour les messages avec les détails des expéditeurs
CREATE VIEW vechat_messages_with_details AS
SELECT 
    m.*,
    -- Informations expéditeur
    CASE 
        WHEN m.sender_type = 'personnel' THEN CONCAT(ps.prenom, ' ', ps.nom)
        WHEN m.sender_type = 'client' THEN CONCAT(cs.prenom, ' ', cs.nom)
    END as sender_name,
    CASE 
        WHEN m.sender_type = 'personnel' THEN ps.chat_avatar
        WHEN m.sender_type = 'client' THEN cs.chat_avatar
    END as sender_avatar,
    
    -- Informations destinataire  
    CASE 
        WHEN m.receiver_type = 'personnel' THEN CONCAT(pr.prenom, ' ', pr.nom)
        WHEN m.receiver_type = 'client' THEN CONCAT(cr.prenom, ' ', cr.nom)
    END as receiver_name,
    CASE 
        WHEN m.receiver_type = 'personnel' THEN pr.chat_avatar
        WHEN m.receiver_type = 'client' THEN cr.chat_avatar
    END as receiver_avatar
    
FROM vechat_messages m
LEFT JOIN personnel ps ON m.sender_type = 'personnel' AND m.sender_id = ps.id
LEFT JOIN client cs ON m.sender_type = 'client' AND m.sender_id = cs.id
LEFT JOIN personnel pr ON m.receiver_type = 'personnel' AND m.receiver_id = pr.id
LEFT JOIN client cr ON m.receiver_type = 'client' AND m.receiver_id = cr.id;

-- Données de test (optionnel)
-- INSERT INTO vechat_user_settings (user_id, user_type) 
-- SELECT id, 'personnel' FROM personnel WHERE is_chat_enabled = TRUE;

-- INSERT INTO vechat_user_settings (user_id, user_type) 
-- SELECT id, 'client' FROM client WHERE is_chat_enabled = TRUE;