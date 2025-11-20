-- Migration pour permettre l'assignation de plusieurs commerciaux aux Clients
-- Date: 2025-01-12
-- Approche simplifiée : utilisation d'un array PostgreSQL au lieu d'une table de jonction

-- ========================================
-- 1. TABLE: client (Clients)
-- ========================================

-- Ajouter la nouvelle colonne charge_com_ids (array d'IDs de commerciaux)
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS charge_com_ids INTEGER[] DEFAULT '{}';

-- Migrer les données existantes depuis charge_com (username) vers charge_com_ids (array d'IDs)
-- Étape 1: Créer une table temporaire pour mapper nom_utilisateur -> user_id
CREATE TEMP TABLE temp_user_mapping AS
SELECT p.id, p.nom_utilisateur as username
FROM personnel p
WHERE p.role = 'commercial';

-- Étape 2: Migrer les données en convertissant username en ID
UPDATE client c
SET charge_com_ids = ARRAY[um.id]
FROM temp_user_mapping um
WHERE c.charge_com = um.username
  AND c.charge_com IS NOT NULL
  AND c.charge_com != '';

-- Étape 3: Vérifier les clients dont le charge_com n'a pas pu être converti
DO $$
DECLARE
    unmapped_count INTEGER;
    r RECORD;
BEGIN
    SELECT COUNT(*) INTO unmapped_count
    FROM client c
    WHERE c.charge_com IS NOT NULL 
      AND c.charge_com != ''
      AND c.charge_com_ids = '{}';
    
    IF unmapped_count > 0 THEN
        RAISE NOTICE 'ATTENTION: % client(s) ont un charge_com qui n''a pas pu être converti en ID', unmapped_count;
        RAISE NOTICE 'Vérifiez les usernames suivants:';
        
        -- Afficher les clients concernés
        FOR r IN (
            SELECT c.id, c.nom, c.charge_com
            FROM client c
            WHERE c.charge_com IS NOT NULL 
              AND c.charge_com != ''
              AND c.charge_com_ids = '{}'
            LIMIT 10
        ) LOOP
            RAISE NOTICE 'Client ID: %, Nom: %, charge_com: %', r.id, r.nom, r.charge_com;
        END LOOP;
    ELSE
        RAISE NOTICE 'Tous les charge_com ont été convertis avec succès';
    END IF;
END $$;

-- Index GIN pour recherche rapide dans l'array
CREATE INDEX IF NOT EXISTS idx_client_charge_com_ids ON client USING GIN (charge_com_ids);

COMMENT ON COLUMN client.charge_com_ids IS 'Array des IDs des commerciaux assignés au client (relation 1-N)';

-- ========================================
-- NOTES IMPORTANTES
-- ========================================
-- 1. Le champ charge_com (VARCHAR) est conservé temporairement pour compatibilité
-- 2. Il sera supprimé dans une future migration après validation du nouveau système
-- 3. Tous les nouveaux clients doivent utiliser charge_com_ids
-- 4. Pour assigner plusieurs commerciaux, utiliser charge_com_ids = ARRAY[id1, id2, id3]
-- 5. Pour rechercher les clients d'un commercial: WHERE id_commercial = ANY(charge_com_ids)

-- ========================================
-- VÉRIFICATIONS POST-MIGRATION
-- ========================================

-- Statistiques de migration
DO $$
DECLARE
    total_clients INTEGER;
    clients_with_old_charge_com INTEGER;
    clients_with_new_charge_com_ids INTEGER;
    clients_with_multiple_commercials INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_clients FROM client;
    
    SELECT COUNT(*) INTO clients_with_old_charge_com
    FROM client WHERE charge_com IS NOT NULL AND charge_com != '';
    
    SELECT COUNT(*) INTO clients_with_new_charge_com_ids
    FROM client WHERE charge_com_ids != '{}';
    
    SELECT COUNT(*) INTO clients_with_multiple_commercials
    FROM client WHERE array_length(charge_com_ids, 1) > 1;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STATISTIQUES DE MIGRATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total clients: %', total_clients;
    RAISE NOTICE 'Clients avec charge_com (ancien): %', clients_with_old_charge_com;
    RAISE NOTICE 'Clients avec charge_com_ids (nouveau): %', clients_with_new_charge_com_ids;
    RAISE NOTICE 'Clients avec plusieurs commerciaux: %', clients_with_multiple_commercials;
    RAISE NOTICE '========================================';
END $$;

-- Exemples de requêtes avec le nouveau système:
-- 
-- 1. Trouver tous les clients d'un commercial (ID = 5):
--    SELECT * FROM client WHERE 5 = ANY(charge_com_ids);
--
-- 2. Ajouter un commercial à un client:
--    UPDATE client SET charge_com_ids = array_append(charge_com_ids, 7) WHERE id = 123;
--
-- 3. Retirer un commercial d'un client:
--    UPDATE client SET charge_com_ids = array_remove(charge_com_ids, 7) WHERE id = 123;
--
-- 4. Remplacer tous les commerciaux d'un client:
--    UPDATE client SET charge_com_ids = ARRAY[5, 7, 9] WHERE id = 123;
--
-- 5. Compter les clients par commercial:
--    SELECT p.id, p.nom_utilisateur, COUNT(*) as nb_clients
--    FROM personnel p
--    LEFT JOIN client c ON p.id = ANY(c.charge_com_ids)
--    WHERE p.role = 'commercial'
--    GROUP BY p.id, p.nom_utilisateur
--    ORDER BY nb_clients DESC;
