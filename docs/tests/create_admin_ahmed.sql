-- ==========================================
-- Script de création d'un administrateur Ahmed
-- Mot de passe: 87Eq8384
-- Hash bcrypt: $2b$10$XYZ... (généré ci-dessous)
-- ==========================================

-- 1. Supprimer l'ancien utilisateur Ahmed s'il existe
DELETE FROM crm_personnel WHERE email = 'ahmed@velosi.com';

-- 2. Créer l'utilisateur administratif Ahmed avec mot de passe correctement haché
INSERT INTO crm_personnel (
    nom,
    prenom,
    email,
    password,
    role,
    statut,
    telephone,
    date_embauche,
    created_at,
    updated_at
) VALUES (
    'Ahmed',
    'Administrateur',
    'ahmed@velosi.com',
    -- ✅ Hash bcrypt du mot de passe: 87Eq8384
    -- Généré avec: bcryptjs.hashSync('87Eq8384', 10)
    '$2a$10$fHkoz9vaBbS.1a8WoMnGtunJdEBiYfgoWAxu9xocSmJGxpiKHNpZa',
    'admin',
    'actif',
    '+33612345678',
    CURRENT_DATE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 3. Vérifier la création
SELECT 
    id,
    nom,
    prenom,
    email,
    role,
    statut,
    date_embauche,
    created_at
FROM crm_personnel 
WHERE email = 'ahmed@velosi.com';

-- ==========================================
-- INSTRUCTIONS D'EXÉCUTION DANS SUPABASE:
-- ==========================================
-- 1. Aller sur: https://supabase.com/dashboard
-- 2. Sélectionner votre projet Velosi
-- 3. Menu gauche → SQL Editor
-- 4. Copier-coller ce script complet
-- 5. Cliquer sur "Run" (ou Ctrl+Enter)
-- 6. Vérifier le résultat dans le panneau inférieur
-- ==========================================

-- ==========================================
-- TEST DE CONNEXION:
-- ==========================================
-- Email: ahmed@velosi.com
-- Mot de passe: 87Eq8384
-- ==========================================
