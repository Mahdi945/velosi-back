-- Script SQL pour vérifier l'utilisateur mahdibeyy@gmail.com
-- Date: 26 décembre 2025

-- 1. Vérifier dans quelle organisation existe l'email
\c shipnology
SELECT id, nom, database_name FROM organisations ORDER BY id;

-- 2. Chercher dans la base velosi
\c velosi
SELECT 
    id, 
    nom_utilisateur, 
    email, 
    organisation_id,
    is_active
FROM personnel
WHERE LOWER(email) = LOWER('mahdibeyy@gmail.com');

-- 3. Si trouvé, vérifier l'organisation_id
-- L'organisation_id devrait être 1 (Velosi)

-- 4. Afficher les détails de l'organisation Velosi
\c shipnology
SELECT 
    id,
    nom,
    database_name,
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_from_email,
    smtp_enabled
FROM organisations
WHERE id = 1;

-- 5. Afficher les détails de l'organisation hyt (ID: 24)
SELECT 
    id,
    nom,
    database_name,
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_from_email,
    smtp_enabled
FROM organisations
WHERE id = 24;

-- 6. Si l'utilisateur existe dans velosi mais avec mauvais organisation_id, le corriger:
\c velosi
/*
UPDATE personnel 
SET organisation_id = 1
WHERE LOWER(email) = LOWER('mahdibeyy@gmail.com')
AND organisation_id != 1;
*/
