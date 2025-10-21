-- ============================================
-- TRIGGER: Mise à jour automatique du statut prospect → CLIENT
-- Quand une cotation est acceptée (status = 'accepted')
-- ============================================

-- Fonction du trigger
CREATE OR REPLACE FUNCTION update_lead_status_on_quote_accepted()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier si la cotation vient d'être acceptée
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        
        -- Mettre à jour le statut du prospect si un lead_id existe
        IF NEW.lead_id IS NOT NULL THEN
            UPDATE crm_leads 
            SET 
                status = 'client',
                updated_at = NOW()
            WHERE id = NEW.lead_id;
            
            RAISE NOTICE 'Prospect #% mis à jour vers statut CLIENT suite à acceptation cotation #%', 
                NEW.lead_id, NEW.id;
        END IF;
        
        -- Mettre à jour le prospect via l'opportunité si elle existe
        IF NEW.opportunity_id IS NOT NULL AND NEW.lead_id IS NULL THEN
            UPDATE crm_leads 
            SET 
                status = 'client',
                updated_at = NOW()
            WHERE id = (
                SELECT lead_id 
                FROM crm_opportunities 
                WHERE id = NEW.opportunity_id
            );
            
            RAISE NOTICE 'Prospect mis à jour vers statut CLIENT via opportunité #% suite à acceptation cotation #%', 
                NEW.opportunity_id, NEW.id;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trg_update_lead_status_on_quote_accepted ON crm_quotes;

CREATE TRIGGER trg_update_lead_status_on_quote_accepted
    AFTER INSERT OR UPDATE OF status
    ON crm_quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_status_on_quote_accepted();

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION update_lead_status_on_quote_accepted() IS 
'Fonction trigger qui met automatiquement à jour le statut d''un prospect vers CLIENT lorsqu''une cotation est acceptée';

COMMENT ON TRIGGER trg_update_lead_status_on_quote_accepted ON crm_quotes IS 
'Trigger qui déclenche la mise à jour du statut prospect automatiquement lors de l''acceptation d''une cotation';

-- ============================================
-- TEST DU TRIGGER
-- ============================================

-- Pour tester le trigger, exécutez une mise à jour de cotation:
-- UPDATE crm_quotes SET status = 'accepted' WHERE id = <ID_COTATION>;
-- Puis vérifiez le statut du prospect:
-- SELECT id, full_name, status FROM crm_leads WHERE id = <ID_PROSPECT>;
-- Le statut devrait être 'client'

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que le trigger est créé
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_update_lead_status_on_quote_accepted';

-- Résultat attendu:
-- trigger_name: trg_update_lead_status_on_quote_accepted
-- event_manipulation: UPDATE
-- event_object_table: crm_quotes
-- action_statement: EXECUTE FUNCTION update_lead_status_on_quote_accepted()
