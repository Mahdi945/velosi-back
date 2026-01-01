-- Script SQL pour corriger la configuration SMTP de l'organisation Velosi
-- Date: 26 décembre 2025
-- Description: Corrige smtp_use_tls et smtp_from_email pour l'organisation Velosi

-- Se connecter à la base de données shipnology
\c shipnology

-- Afficher la configuration actuelle
SELECT 
    id, 
    nom,
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_from_email,
    smtp_from_name,
    smtp_use_tls,
    smtp_enabled
FROM organisations
WHERE id = 1;

-- ⚠️ PROBLÈMES DÉTECTÉS:
-- 1. smtp_use_tls = false (devrait être true pour port 587)
-- 2. smtp_from_email = 'noreply@msp.com' (ne correspond pas au compte Gmail velosierp@gmail.com)
-- 3. Le port 587 nécessite TLS (STARTTLS)

-- Corriger la configuration SMTP
UPDATE organisations 
SET 
    smtp_use_tls = true,  -- ✅ Activer TLS pour port 587
    smtp_from_email = 'velosierp@gmail.com'  -- ✅ Doit correspondre au SMTP_USER pour Gmail
WHERE id = 1;

-- Vérifier les modifications
SELECT 
    id, 
    nom,
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_from_email,
    smtp_from_name,
    smtp_use_tls,
    smtp_enabled
FROM organisations
WHERE id = 1;

-- ✅ Configuration attendue après correction:
-- smtp_host: smtp.gmail.com
-- smtp_port: 587
-- smtp_user: velosierp@gmail.com
-- smtp_password: qaasamaktyqqrzet (mot de passe d'application Gmail)
-- smtp_from_email: velosierp@gmail.com (doit être identique à smtp_user)
-- smtp_from_name: Velosi
-- smtp_use_tls: true (obligatoire pour port 587)
-- smtp_enabled: true

SELECT '✅ Configuration SMTP corrigée pour organisation Velosi!' as status;

-- 📝 NOTE IMPORTANTE:
-- Pour Gmail, smtp_from_email DOIT être identique à smtp_user
-- Gmail rejette les emails si l'expéditeur ne correspond pas au compte authentifié
