-- ================================================================
-- CORRECTION DU MOT DE PASSE ADMIN MSP
-- ================================================================
-- Hash bcrypt correct pour "Admin123!"
-- Généré avec bcryptjs, 12 rounds
-- ================================================================

\c shipnology;

-- Mettre à jour le mot de passe de l'admin MSP
UPDATE admin_msp 
SET mot_de_passe = '$2a$12$aGOcpV2DctGVok9qxzDrjeb2L.5.mawonU0wJE4JyFaGy0bSg1wia' 
WHERE nom_utilisateur = 'admin_msp';

-- Vérifier la mise à jour
SELECT 
  id, 
  nom, 
  prenom, 
  email, 
  nom_utilisateur, 
  role, 
  statut,
  LEFT(mot_de_passe, 10) || '...' as mot_de_passe_preview
FROM admin_msp
WHERE nom_utilisateur = 'admin_msp';

-- ================================================================
-- IDENTIFIANTS DE CONNEXION
-- ================================================================
-- URL: http://localhost:4200/admin-msp/login
-- Username: admin_msp
-- Password: Admin123!
-- 
-- ⚠️ IMPORTANT: Changez ce mot de passe après la première connexion !
-- ================================================================
