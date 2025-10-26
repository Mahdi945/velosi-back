-- ============================================
-- FIX CONTACT_CLIENT TABLE STRUCTURE
-- ============================================
-- Ce script corrige la structure de la table contact_client
-- pour garantir que l'email et le téléphone s'enregistrent correctement

-- 1️⃣ VÉRIFIER LA STRUCTURE ACTUELLE
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contact_client'
ORDER BY ordinal_position;

-- 2️⃣ VÉRIFIER LES CONTRAINTES
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'contact_client'::regclass;

-- 3️⃣ VÉRIFIER LES DONNÉES EXISTANTES
SELECT 
    id_client,
    tel1,
    tel2,
    tel3,
    mail1,
    mail2,
    fonction
FROM contact_client
LIMIT 10;

-- 4️⃣ SI LA TABLE N'EXISTE PAS OU EST MAL STRUCTURÉE, LA RECRÉER
-- ⚠️ ATTENTION: Décommenter SEULEMENT si nécessaire
/*
DROP TABLE IF EXISTS contact_client CASCADE;

CREATE TABLE contact_client (
    id_client INTEGER PRIMARY KEY,
    tel1 VARCHAR(50),
    tel2 VARCHAR(50),
    tel3 VARCHAR(50),
    fax VARCHAR(50),
    mail1 VARCHAR(255),
    mail2 VARCHAR(255),
    fonction VARCHAR(100),
    CONSTRAINT fk_contact_client_client 
        FOREIGN KEY (id_client) 
        REFERENCES client(id) 
        ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX idx_contact_client_mail1 ON contact_client(mail1);
CREATE INDEX idx_contact_client_tel1 ON contact_client(tel1);

-- Commentaires
COMMENT ON TABLE contact_client IS 'Table des contacts clients (1 contact par client)';
COMMENT ON COLUMN contact_client.id_client IS 'ID du client (clé primaire)';
COMMENT ON COLUMN contact_client.mail1 IS 'Email principal du client';
COMMENT ON COLUMN contact_client.tel1 IS 'Téléphone principal du client';
*/

-- 5️⃣ TEST D'INSERTION MANUELLE
-- Remplacer 999 par un vrai ID de client existant
/*
INSERT INTO contact_client (id_client, mail1, tel1, fonction)
VALUES (999, 'test@example.com', '+216 12 345 678', 'Test')
ON CONFLICT (id_client) 
DO UPDATE SET 
    mail1 = EXCLUDED.mail1,
    tel1 = EXCLUDED.tel1,
    fonction = EXCLUDED.fonction
RETURNING id_client, mail1, tel1, fonction;
*/

-- 6️⃣ VÉRIFIER LES CLIENTS SANS CONTACT
SELECT 
    c.id,
    c.nom,
    c.interlocuteur,
    cc.mail1,
    cc.tel1
FROM client c
LEFT JOIN contact_client cc ON c.id = cc.id_client
WHERE cc.id_client IS NULL
LIMIT 20;

-- 7️⃣ STATISTIQUES
SELECT 
    COUNT(*) AS total_clients,
    COUNT(cc.id_client) AS clients_avec_contact,
    COUNT(*) - COUNT(cc.id_client) AS clients_sans_contact
FROM client c
LEFT JOIN contact_client cc ON c.id = cc.id_client;
