-- ============================
-- VelosiChat - Système de Messagerie ERP
-- Script PostgreSQL
-- ============================

-- ============================
-- MODIFICATIONS TABLES EXISTANTES
-- ============================

-- Ajouter colonnes nécessaires à la table personnel (si pas déjà présentes)
-- ALTER TABLE personnel ADD COLUMN IF NOT EXISTS is_chat_enabled BOOLEAN DEFAULT TRUE;

-- Ajouter colonnes nécessaires à la table client (si pas déjà présentes) 
-- ALTER TABLE client ADD COLUMN IF NOT EXISTS is_chat_enabled BOOLEAN DEFAULT TRUE;

-- ============================
-- TABLE MESSAGES VECHAT
-- ============================
CREATE TABLE IF NOT EXISTS vechat_messages (
    id SERIAL PRIMARY KEY,
    
    -- Identifiants des participants
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('personnel', 'client')),
    receiver_type VARCHAR(20) NOT NULL CHECK (receiver_type IN ('personnel', 'client')),
    
    -- Contenu du message
    message TEXT,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text','image','file','video','voice')),
    
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
    reply_to_message_id INTEGER NULL,
    
    -- Horodatage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL
);

-- Index pour les messages
CREATE INDEX IF NOT EXISTS idx_vechat_messages_sender ON vechat_messages(sender_id, sender_type);
CREATE INDEX IF NOT EXISTS idx_vechat_messages_receiver ON vechat_messages(receiver_id, receiver_type);
CREATE INDEX IF NOT EXISTS idx_vechat_messages_conversation ON vechat_messages(sender_id, sender_type, receiver_id, receiver_type);
CREATE INDEX IF NOT EXISTS idx_vechat_messages_read ON vechat_messages(receiver_id, receiver_type, is_read);
CREATE INDEX IF NOT EXISTS idx_vechat_messages_created_at ON vechat_messages(created_at);

-- Contrainte FK pour reply_to_message_id
ALTER TABLE vechat_messages ADD CONSTRAINT fk_vechat_messages_reply 
    FOREIGN KEY (reply_to_message_id) REFERENCES vechat_messages(id) ON DELETE SET NULL;

-- ============================
-- TABLE CONVERSATIONS VECHAT
-- ============================
CREATE TABLE IF NOT EXISTS vechat_conversations (
    id SERIAL PRIMARY KEY,
    
    -- Participants (ordre normalisé : participant1 a toujours l'ID le plus petit ou priorité personnel)
    participant1_id INTEGER NOT NULL,
    participant1_type VARCHAR(20) NOT NULL CHECK (participant1_type IN ('personnel', 'client')),
    participant2_id INTEGER NOT NULL,
    participant2_type VARCHAR(20) NOT NULL CHECK (participant2_type IN ('personnel', 'client')),
    
    -- Dernier message
    last_message_id INTEGER NULL,
    last_message_at TIMESTAMP NULL,
    
    -- Compteurs messages non lus
    unread_count_participant1 INTEGER DEFAULT 0,
    unread_count_participant2 INTEGER DEFAULT 0,
    
    -- Paramètres conversation
    is_archived_by_participant1 BOOLEAN DEFAULT FALSE,
    is_archived_by_participant2 BOOLEAN DEFAULT FALSE,
    is_muted_by_participant1 BOOLEAN DEFAULT FALSE,
    is_muted_by_participant2 BOOLEAN DEFAULT FALSE,
    
    -- Horodatage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index et contraintes pour les conversations
CREATE UNIQUE INDEX IF NOT EXISTS idx_vechat_conversations_unique 
    ON vechat_conversations(participant1_id, participant1_type, participant2_id, participant2_type);
CREATE INDEX IF NOT EXISTS idx_vechat_conversations_participant1 ON vechat_conversations(participant1_id, participant1_type);
CREATE INDEX IF NOT EXISTS idx_vechat_conversations_participant2 ON vechat_conversations(participant2_id, participant2_type);
CREATE INDEX IF NOT EXISTS idx_vechat_conversations_last_message ON vechat_conversations(last_message_at);

-- Contrainte FK pour last_message_id
ALTER TABLE vechat_conversations ADD CONSTRAINT fk_vechat_conversations_last_message 
    FOREIGN KEY (last_message_id) REFERENCES vechat_messages(id) ON DELETE SET NULL;

-- ============================
-- TABLE PRESENCE VECHAT
-- ============================
CREATE TABLE IF NOT EXISTS vechat_presence (
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('personnel', 'client')),
    
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy')),
    last_seen TIMESTAMP NULL,
    last_activity TIMESTAMP NULL,
    
    -- Informations de session
    socket_id VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    
    -- Géolocalisation (optionnel)
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    location_name VARCHAR(255) NULL,
    
    -- Paramètres de visibilité
    is_visible BOOLEAN DEFAULT TRUE,
    show_last_seen BOOLEAN DEFAULT TRUE,
    
    -- Message de statut personnalisé
    status_message VARCHAR(100) NULL,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id, user_type)
);

-- Index pour la presence
CREATE INDEX IF NOT EXISTS idx_vechat_presence_status ON vechat_presence(status);
CREATE INDEX IF NOT EXISTS idx_vechat_presence_last_seen ON vechat_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_vechat_presence_user ON vechat_presence(user_id, user_type);

-- ============================
-- FONCTION DE MISE À JOUR TIMESTAMP
-- ============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_vechat_messages_updated_at BEFORE UPDATE ON vechat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vechat_conversations_updated_at BEFORE UPDATE ON vechat_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vechat_presence_updated_at BEFORE UPDATE ON vechat_presence 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================
-- DONNÉES INITIALES (optionnel)
-- ============================

-- Vous pouvez ajouter ici des données de test si nécessaire

COMMIT;