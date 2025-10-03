-- ============================
-- CORRECTION DES TRIGGERS VECHAT
-- ============================

-- Supprimer les triggers existants
DROP TRIGGER IF EXISTS trg_vechat_update_conversation_after_message_insert ON vechat_messages;
DROP TRIGGER IF EXISTS trg_vechat_update_conversation_after_message_read ON vechat_messages;
DROP FUNCTION IF EXISTS trg_update_conversation_after_message_insert();
DROP FUNCTION IF EXISTS trg_update_conversation_after_message_read();

-- ============================
-- NOUVEAU TRIGGER CORRIGÉ
-- ============================

-- Trigger function: after message insert (CORRIGÉ)
CREATE OR REPLACE FUNCTION trg_update_conversation_after_message_insert()
RETURNS TRIGGER AS $$
DECLARE
    conv_participant1_id INT;
    conv_participant2_id INT;
    conv_participant1_type VARCHAR(20);
    conv_participant2_type VARCHAR(20);
BEGIN
    -- Normaliser les participants (variables avec noms non ambigus)
    IF (NEW.sender_id < NEW.receiver_id) OR 
       (NEW.sender_id = NEW.receiver_id AND NEW.sender_type < NEW.receiver_type) THEN
        conv_participant1_id := NEW.sender_id;
        conv_participant1_type := NEW.sender_type;
        conv_participant2_id := NEW.receiver_id;
        conv_participant2_type := NEW.receiver_type;
    ELSE
        conv_participant1_id := NEW.receiver_id;
        conv_participant1_type := NEW.receiver_type;
        conv_participant2_id := NEW.sender_id;
        conv_participant2_type := NEW.sender_type;
    END IF;
    
    -- Insérer ou mettre à jour la conversation
    INSERT INTO vechat_conversations (
        participant1_id, participant1_type,
        participant2_id, participant2_type,
        last_message_id, last_message_at,
        unread_count_participant1, unread_count_participant2,
        created_at, updated_at
    ) VALUES (
        conv_participant1_id, conv_participant1_type,
        conv_participant2_id, conv_participant2_type,
        NEW.id, NEW.created_at,
        CASE WHEN NEW.receiver_id = conv_participant1_id AND NEW.receiver_type = conv_participant1_type THEN 1 ELSE 0 END,
        CASE WHEN NEW.receiver_id = conv_participant2_id AND NEW.receiver_type = conv_participant2_type THEN 1 ELSE 0 END,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT (participant1_id, participant1_type, participant2_id, participant2_type)
    DO UPDATE SET
        last_message_id = EXCLUDED.last_message_id,
        last_message_at = EXCLUDED.last_message_at,
        unread_count_participant1 = vechat_conversations.unread_count_participant1 + 
            (CASE WHEN NEW.receiver_id = vechat_conversations.participant1_id AND NEW.receiver_type = vechat_conversations.participant1_type THEN 1 ELSE 0 END),
        unread_count_participant2 = vechat_conversations.unread_count_participant2 + 
            (CASE WHEN NEW.receiver_id = vechat_conversations.participant2_id AND NEW.receiver_type = vechat_conversations.participant2_type THEN 1 ELSE 0 END),
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
CREATE TRIGGER trg_vechat_update_conversation_after_message_insert
AFTER INSERT ON vechat_messages
FOR EACH ROW EXECUTE FUNCTION trg_update_conversation_after_message_insert();

-- Trigger function: after message read (CORRIGÉ)
CREATE OR REPLACE FUNCTION trg_update_conversation_after_message_read()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
        UPDATE vechat_conversations 
        SET 
            unread_count_participant1 = CASE 
                WHEN NEW.receiver_id = vechat_conversations.participant1_id AND NEW.receiver_type = vechat_conversations.participant1_type 
                THEN GREATEST(0, vechat_conversations.unread_count_participant1 - 1) 
                ELSE vechat_conversations.unread_count_participant1 
            END,
            unread_count_participant2 = CASE 
                WHEN NEW.receiver_id = vechat_conversations.participant2_id AND NEW.receiver_type = vechat_conversations.participant2_type 
                THEN GREATEST(0, vechat_conversations.unread_count_participant2 - 1) 
                ELSE vechat_conversations.unread_count_participant2 
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE (vechat_conversations.participant1_id = NEW.sender_id AND vechat_conversations.participant1_type = NEW.sender_type 
               AND vechat_conversations.participant2_id = NEW.receiver_id AND vechat_conversations.participant2_type = NEW.receiver_type)
           OR (vechat_conversations.participant1_id = NEW.receiver_id AND vechat_conversations.participant1_type = NEW.receiver_type 
               AND vechat_conversations.participant2_id = NEW.sender_id AND vechat_conversations.participant2_type = NEW.sender_type);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
CREATE TRIGGER trg_vechat_update_conversation_after_message_read
AFTER UPDATE ON vechat_messages
FOR EACH ROW EXECUTE FUNCTION trg_update_conversation_after_message_read();

COMMIT;