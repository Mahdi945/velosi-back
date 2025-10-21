-- ========================================
-- MIGRATION: Ajout du statut 'client' à l'enum LeadStatus
-- Date: 2025-01-21
-- Description: Ajoute le statut 'client' pour les prospects devenus clients après acceptation d'une cotation
-- ========================================

-- 1. Vérifier si le type enum existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leadstatus') THEN
        -- 2. Ajouter la nouvelle valeur 'client' à l'enum si elle n'existe pas déjà
        BEGIN
            ALTER TYPE leadstatus ADD VALUE IF NOT EXISTS 'client';
            RAISE NOTICE 'Valeur "client" ajoutée à l''enum leadstatus';
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'La valeur "client" existe déjà dans l''enum leadstatus';
        END;
    ELSE
        RAISE NOTICE 'L''enum leadstatus n''existe pas encore. Il sera créé lors de la première synchronisation TypeORM';
    END IF;
END
$$;

-- 3. Vérifier le résultat
SELECT 
    enumlabel as "Valeurs de l'enum leadstatus"
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'leadstatus') 
ORDER BY enumsortorder;

-- 4. Afficher les prospects qui pourraient être concernés par ce nouveau statut
-- (prospects avec statut 'converted' qui ont une cotation acceptée)
SELECT 
    l.id,
    l.full_name,
    l.company,
    l.status as statut_actuel,
    COUNT(q.id) as nb_cotations_acceptees
FROM crm_leads l
LEFT JOIN crm_quotes q ON l.id = q.lead_id AND q.status = 'accepted'
WHERE l.status = 'converted'
GROUP BY l.id, l.full_name, l.company, l.status
HAVING COUNT(q.id) > 0;

-- ========================================
-- NOTES:
-- ========================================
-- Le nouveau statut 'client' sera automatiquement appliqué aux prospects
-- lorsqu'une cotation est acceptée et qu'un client temporaire est créé.
--
-- Différence entre les statuts:
-- - 'converted': Prospect converti en opportunité
-- - 'client': Prospect devenu client après acceptation d'une cotation
--
-- Ce nouveau statut permet de:
-- 1. Distinguer clairement les prospects devenus clients
-- 2. Les exclure de la colonne "Prospection" du pipeline kanban
-- 3. Suivre la conversion complète du cycle de vente
-- ========================================
