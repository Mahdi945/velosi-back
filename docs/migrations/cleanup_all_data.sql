-- Script SQL pour nettoyer et réimporter les données
-- Auteur: Velosi ERP
-- Date: 2025-10-30
-- Description: Supprime toutes les données existantes des ports et aéroports

-- ============================================
-- 1. SUPPRESSION DES DONNÉES EXISTANTES
-- ============================================

-- Supprimer tous les aéroports
DELETE FROM aeroports;
SELECT 'Tous les aéroports ont été supprimés' as message;

-- Supprimer tous les ports
DELETE FROM ports;
SELECT 'Tous les ports ont été supprimés' as message;

-- Réinitialiser les séquences
ALTER SEQUENCE ports_id_seq RESTART WITH 1;
ALTER SEQUENCE aeroports_id_seq RESTART WITH 1;

SELECT 'Les séquences ont été réinitialisées' as message;

-- ============================================
-- 2. VÉRIFICATION
-- ============================================

SELECT 
    'Ports' as table_name, 
    COUNT(*) as count_rows 
FROM ports
UNION ALL
SELECT 
    'Aéroports' as table_name, 
    COUNT(*) as count_rows 
FROM aeroports;

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- Après l'exécution de ce script, utilisez le script PowerShell
-- pour réimporter les données avec noms complets :
--
-- .\reimport-complete-data.ps1 -Token "VOTRE_TOKEN_JWT"
--
-- OU utilisez les endpoints API :
-- POST http://localhost:3000/api/admin/import/ports
-- POST http://localhost:3000/api/admin/import/aeroports
