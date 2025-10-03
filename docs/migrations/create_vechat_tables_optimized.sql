-- ============================
-- VelosiChat - Système de Messagerie ERP
-- Adapté pour structure client avec interlocuteur
-- ============================

-- ============================
-- MODIFICATIONS TABLES EXISTANTES
-- ============================

-- Ajouter colonnes nécessaires à la table personnel (si pas déjà présentes)
-- ALTER TABLE personnel ADD COLUMN is_chat_enabled BOOLEAN DEFAULT TRUE;

-- Ajouter colonnes nécessaires à la table client (si pas déjà présentes) 
-- ALTER TABLE client ADD COLUMN is_chat_enabled BOOLEAN DEFAULT TRUE;

-- ============================
-- TABLE MESSAGES VECHAT
-- ============================
CREATE TABLE vechat_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Identifiants des participants
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    sender_type ENUM('personnel', 'client') NOT NULL,
    receiver_type ENUM('personnel', 'client') NOT NULL,
    
    -- Contenu du message
    message TEXT,
    message_type ENUM('text','image','file','video','voice') DEFAULT 'text',
    
    -- Gestion des fichiers
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    
    -- Statuts du message
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted_by_sender BOOLEAN DEFAULT FALSE,
    is_deleted_by_receiver BOOLEAN DEFAULT FALSE,
    
    -- Réponses
    reply_to_message_id INT NULL,
    
    -- Horodatage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    -- Clés étrangères
    FOREIGN KEY (reply_to_message_id) REFERENCES vechat_messages(id) ON DELETE SET NULL
);

-- Index pour performance
CREATE INDEX idx_vechat_sender ON vechat_messages(sender_id, sender_type);
CREATE INDEX idx_vechat_receiver ON vechat_messages(receiver_id, receiver_type);
CREATE INDEX idx_vechat_conversation ON vechat_messages(sender_id, receiver_id, sender_type, receiver_type);
CREATE INDEX idx_vechat_created_at ON vechat_messages(created_at);
CREATE INDEX idx_vechat_unread ON vechat_messages(receiver_id, receiver_type, is_read);

-- ============================
-- TABLE CONVERSATIONS
-- ============================
CREATE TABLE vechat_conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Participants (ordre normalisé)
    participant1_id INT NOT NULL,
    participant1_type ENUM('personnel','client') NOT NULL,
    participant2_id INT NOT NULL,
    participant2_type ENUM('personnel','client') NOT NULL,
    
    -- Dernier message
    last_message_id INT NULL,
    last_message_at TIMESTAMP NULL,
    
    -- Compteurs messages non lus
    unread_count_participant1 INT DEFAULT 0,
    unread_count_participant2 INT DEFAULT 0,
    
    -- Paramètres conversation
    is_archived_by_participant1 BOOLEAN DEFAULT FALSE,
    is_archived_by_participant2 BOOLEAN DEFAULT FALSE,
    is_muted_by_participant1 BOOLEAN DEFAULT FALSE,
    is_muted_by_participant2 BOOLEAN DEFAULT FALSE,
    
    -- Horodatage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Contraintes
    UNIQUE KEY unique_conversation (participant1_id, participant1_type, participant2_id, participant2_type),
    FOREIGN KEY (last_message_id) REFERENCES vechat_messages(id) ON DELETE SET NULL
);

-- Index conversations
CREATE INDEX idx_vechat_participant1 ON vechat_conversations(participant1_id, participant1_type);
CREATE INDEX idx_vechat_participant2 ON vechat_conversations(participant2_id, participant2_type);
CREATE INDEX idx_vechat_last_message ON vechat_conversations(last_message_at);

-- ============================
-- TABLE PRÉSENCE UTILISATEURS
-- ============================
CREATE TABLE vechat_presence (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_type ENUM('personnel','client') NOT NULL,
    
    status ENUM('online','offline','away','busy') DEFAULT 'offline',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    socket_id VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_presence (user_id, user_type)
);

CREATE INDEX idx_vechat_status ON vechat_presence(status);
CREATE INDEX idx_vechat_last_seen ON vechat_presence(last_seen);

-- ============================
-- TABLE PARAMÈTRES UTILISATEURS
-- ============================
CREATE TABLE vechat_user_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_type ENUM('personnel','client') NOT NULL,
    
    -- Notifications (simplifiées)
    sound_notifications BOOLEAN DEFAULT TRUE,
    
    -- Interface
    theme ENUM('light','dark','auto') DEFAULT 'light',
    font_size ENUM('small','medium','large') DEFAULT 'medium',
    
    -- Confidentialité
    show_online_status BOOLEAN DEFAULT TRUE,
    show_read_receipts BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_settings (user_id, user_type)
);

-- ============================
-- TRIGGERS MYSQL
-- ============================

DELIMITER //

-- Trigger pour mettre à jour les conversations après insertion d'un message
CREATE TRIGGER trg_vechat_update_conversation_after_message_insert
AFTER INSERT ON vechat_messages
FOR EACH ROW
BEGIN
    DECLARE participant1_id INT;
    DECLARE participant1_type VARCHAR(20);
    DECLARE participant2_id INT;
    DECLARE participant2_type VARCHAR(20);
    
    -- Normaliser l'ordre des participants
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

    -- Insérer ou mettre à jour la conversation
    INSERT INTO vechat_conversations (
        participant1_id, participant1_type,
        participant2_id, participant2_type,
        last_message_id, last_message_at,
        unread_count_participant1, unread_count_participant2
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

-- Trigger pour décrémenter le compteur après lecture
CREATE TRIGGER trg_vechat_update_conversation_after_message_read
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
        WHERE (participant1_id = NEW.sender_id AND participant1_type = NEW.sender_type 
               AND participant2_id = NEW.receiver_id AND participant2_type = NEW.receiver_type)
           OR (participant1_id = NEW.receiver_id AND participant1_type = NEW.receiver_type 
               AND participant2_id = NEW.sender_id AND participant2_type = NEW.sender_type);
    END IF;
END//

DELIMITER ;

-- ============================
-- VUES ADAPTÉES À VOTRE STRUCTURE
-- ============================

-- Vue conversations avec détails (utilise interlocuteur pour clients)
CREATE OR REPLACE VIEW vechat_conversations_with_details AS
SELECT 
    c.*,
    -- Participant 1
    CASE 
        WHEN c.participant1_type = 'personnel' THEN CONCAT(p1.prenom, ' ', p1.nom)
        WHEN c.participant1_type = 'client' THEN cl1.interlocuteur 
    END AS participant1_name,
    CASE 
        WHEN c.participant1_type = 'personnel' THEN p1.photo
        WHEN c.participant1_type = 'client' THEN cl1.photo 
    END AS participant1_photo,
    CASE 
        WHEN c.participant1_type = 'personnel' THEN p1.email
        WHEN c.participant1_type = 'client' THEN cl1.email 
    END AS participant1_email,
    CASE 
        WHEN c.participant1_type = 'personnel' THEN p1.poste
        WHEN c.participant1_type = 'client' THEN cl1.societe 
    END AS participant1_info,
    
    -- Participant 2
    CASE 
        WHEN c.participant2_type = 'personnel' THEN CONCAT(p2.prenom, ' ', p2.nom)
        WHEN c.participant2_type = 'client' THEN cl2.interlocuteur 
    END AS participant2_name,
    CASE 
        WHEN c.participant2_type = 'personnel' THEN p2.photo
        WHEN c.participant2_type = 'client' THEN cl2.photo 
    END AS participant2_photo,
    CASE 
        WHEN c.participant2_type = 'personnel' THEN p2.email
        WHEN c.participant2_type = 'client' THEN cl2.email 
    END AS participant2_email,
    CASE 
        WHEN c.participant2_type = 'personnel' THEN p2.poste
        WHEN c.participant2_type = 'client' THEN cl2.societe 
    END AS participant2_info,
    
    -- Dernier message
    m.message AS last_message_text,
    m.message_type AS last_message_type,
    
    -- Statut chat activé
    CASE 
        WHEN c.participant1_type = 'personnel' THEN COALESCE(p1.is_chat_enabled, TRUE)
        WHEN c.participant1_type = 'client' THEN COALESCE(cl1.is_chat_enabled, TRUE) 
    END AS participant1_chat_enabled,
    CASE 
        WHEN c.participant2_type = 'personnel' THEN COALESCE(p2.is_chat_enabled, TRUE)
        WHEN c.participant2_type = 'client' THEN COALESCE(cl2.is_chat_enabled, TRUE) 
    END AS participant2_chat_enabled
    
FROM vechat_conversations c
LEFT JOIN personnel p1 ON c.participant1_type = 'personnel' AND c.participant1_id = p1.id
LEFT JOIN client cl1 ON c.participant1_type = 'client' AND c.participant1_id = cl1.id
LEFT JOIN personnel p2 ON c.participant2_type = 'personnel' AND c.participant2_id = p2.id
LEFT JOIN client cl2 ON c.participant2_type = 'client' AND c.participant2_id = cl2.id
LEFT JOIN vechat_messages m ON c.last_message_id = m.id;

-- Vue messages avec détails (utilise interlocuteur pour clients)
CREATE OR REPLACE VIEW vechat_messages_with_details AS
SELECT 
    m.*,
    -- Expéditeur
    CASE 
        WHEN m.sender_type = 'personnel' THEN CONCAT(ps.prenom, ' ', ps.nom)
        WHEN m.sender_type = 'client' THEN cs.interlocuteur 
    END AS sender_name,
    CASE 
        WHEN m.sender_type = 'personnel' THEN ps.photo
        WHEN m.sender_type = 'client' THEN cs.photo 
    END AS sender_photo,
    
    -- Destinataire
    CASE 
        WHEN m.receiver_type = 'personnel' THEN CONCAT(pr.prenom, ' ', pr.nom)
        WHEN m.receiver_type = 'client' THEN cr.interlocuteur 
    END AS receiver_name,
    CASE 
        WHEN m.receiver_type = 'personnel' THEN pr.photo
        WHEN m.receiver_type = 'client' THEN cr.photo 
    END AS receiver_photo
    
FROM vechat_messages m
LEFT JOIN personnel ps ON m.sender_type = 'personnel' AND m.sender_id = ps.id
LEFT JOIN client cs ON m.sender_type = 'client' AND m.sender_id = cs.id
LEFT JOIN personnel pr ON m.receiver_type = 'personnel' AND m.receiver_id = pr.id
LEFT JOIN client cr ON m.receiver_type = 'client' AND m.receiver_id = cr.id;

-- ============================
-- VUE CONTACTS DISPONIBLES SELON RÈGLES MÉTIER
-- ============================
CREATE OR REPLACE VIEW vechat_available_contacts AS
SELECT 
    -- Personnel accessible par tous
    p.id,
    'personnel' as user_type,
    CONCAT(p.prenom, ' ', p.nom) as name,
    p.email,
    p.poste as info,
    p.photo,
    COALESCE(p.is_chat_enabled, TRUE) as is_chat_enabled,
    NULL as charge_com,
    'Personnel' as category
FROM personnel p
WHERE COALESCE(p.is_chat_enabled, TRUE) = TRUE

UNION ALL

SELECT 
    -- Clients accessibles selon règles métier
    c.id,
    'client' as user_type,
    c.interlocuteur as name,
    c.email,
    c.societe as info,
    c.photo,
    COALESCE(c.is_chat_enabled, TRUE) as is_chat_enabled,
    c.charge_com,
    'Client' as category
FROM client c
WHERE COALESCE(c.is_chat_enabled, TRUE) = TRUE;

-- ============================
-- PROCÉDURES UTILES
-- ============================

DELIMITER //

-- Procédure pour obtenir les contacts d'un utilisateur selon les règles métier
CREATE PROCEDURE GetUserContacts(
    IN user_id INT,
    IN user_type_param ENUM('personnel','client')
)
BEGIN
    IF user_type_param = 'personnel' THEN
        -- Personnel voit tous les contacts
        SELECT * FROM vechat_available_contacts 
        WHERE user_type != user_type_param OR id != user_id
        ORDER BY category, name;
    ELSE
        -- Client voit seulement le personnel
        SELECT * FROM vechat_available_contacts 
        WHERE user_type = 'personnel'
        ORDER BY name;
    END IF;
END//

-- Procédure pour obtenir les contacts d'un commercial (seulement ses clients)
CREATE PROCEDURE GetCommercialContacts(
    IN commercial_id INT
)
BEGIN
    SELECT * FROM vechat_available_contacts 
    WHERE (user_type = 'personnel' AND id != commercial_id)
       OR (user_type = 'client' AND charge_com = commercial_id)
    ORDER BY category, name;
END//

DELIMITER ;

-- ============================
-- DONNÉES DE TEST
-- ============================

-- Messages de test (adaptez les IDs selon votre base)
INSERT INTO vechat_messages (sender_id, sender_type, receiver_id, receiver_type, message, message_type) 
VALUES 
    (1, 'personnel', 2, 'personnel', 'Bonjour, comment allez-vous ?', 'text'),
    (2, 'personnel', 1, 'personnel', 'Très bien merci ! Et vous ?', 'text'),
    (1, 'personnel', 1, 'client', 'Bonjour, avez-vous reçu notre proposition ?', 'text'),
    (1, 'client', 1, 'personnel', 'Oui, je l''ai reçue. Pouvons-nous en discuter ?', 'text')
ON DUPLICATE KEY UPDATE message = VALUES(message);

-- ============================
-- REQUÊTES DE VÉRIFICATION
-- ============================

-- Vérifier les conversations
-- SELECT * FROM vechat_conversations_with_details LIMIT 5;

-- Vérifier les messages
-- SELECT * FROM vechat_messages_with_details ORDER BY created_at DESC LIMIT 10;

-- Vérifier les contacts disponibles
-- SELECT * FROM vechat_available_contacts LIMIT 10;

-- Test procédure contacts personnel
-- CALL GetUserContacts(1, 'personnel');

-- Test procédure contacts commercial
-- CALL GetCommercialContacts(1);