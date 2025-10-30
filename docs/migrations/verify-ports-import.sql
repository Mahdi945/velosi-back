-- Script SQL pour verifier l'import des ports mondiaux
-- Apres execution du script PowerShell reimport-ports-mondiaux.ps1

-- =========================================
-- 1. STATISTIQUES GLOBALES
-- =========================================

-- Nombre total de ports
SELECT COUNT(*) as "Total Ports" FROM ports;

-- Nombre de ports par statut
SELECT 
    CASE 
        WHEN isactive = true THEN 'Contactes'
        ELSE 'Non contactes'
    END as "Statut",
    COUNT(*) as "Nombre"
FROM ports
GROUP BY isactive
ORDER BY isactive DESC;

-- =========================================
-- 2. PORTS PAR PAYS (TOP 20)
-- =========================================

SELECT 
    pays as "Pays",
    COUNT(*) as "Nombre de ports"
FROM ports 
GROUP BY pays
ORDER BY COUNT(*) DESC
LIMIT 20;

-- =========================================
-- 3. VERIFICATION DES NOMS COMPLETS
-- =========================================

-- Verifier que les villes ne sont PAS des codes (longueur > 3)
SELECT 
    COUNT(*) as "Ports avec noms complets",
    (SELECT COUNT(*) FROM ports WHERE LENGTH(ville) <= 3) as "Ports avec codes courts",
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ports)), 2) as "Pourcentage noms complets"
FROM ports 
WHERE LENGTH(ville) > 3;

-- Exemples de ports avec noms complets
SELECT 
    abbreviation as "Code",
    libelle as "Nom",
    ville as "Ville",
    pays as "Pays"
FROM ports 
WHERE LENGTH(ville) > 3
ORDER BY pays, ville
LIMIT 30;

-- =========================================
-- 4. PORTS TUNISIENS
-- =========================================

SELECT 
    abbreviation as "Code",
    libelle as "Nom du port",
    ville as "Ville",
    pays as "Pays",
    CASE 
        WHEN isactive = true THEN 'Contacte'
        ELSE 'Non contacte'
    END as "Statut"
FROM ports 
WHERE pays LIKE '%Tunis%' OR pays LIKE '%Tunisia%'
ORDER BY ville;

-- =========================================
-- 5. PORTS FRANCAIS
-- =========================================

SELECT 
    abbreviation as "Code",
    libelle as "Nom du port",
    ville as "Ville",
    pays as "Pays"
FROM ports 
WHERE pays LIKE '%France%' OR pays = 'FR'
ORDER BY ville
LIMIT 20;

-- =========================================
-- 6. PORTS EUROPEENS MAJEURS
-- =========================================

SELECT 
    abbreviation as "Code",
    libelle as "Nom du port",
    ville as "Ville",
    pays as "Pays"
FROM ports 
WHERE pays IN ('France', 'Italie', 'Espagne', 'Allemagne', 'Pays-Bas', 'Belgique', 'Royaume-Uni')
ORDER BY pays, ville;

-- =========================================
-- 7. PORTS ASIATIQUES MAJEURS
-- =========================================

SELECT 
    abbreviation as "Code",
    libelle as "Nom du port",
    ville as "Ville",
    pays as "Pays"
FROM ports 
WHERE pays IN ('Chine', 'Singapour', 'Japon', 'Coree du Sud', 'Hong Kong', 'Emirats Arabes Unis')
ORDER BY pays, ville
LIMIT 30;

-- =========================================
-- 8. PORTS AMERICAINS
-- =========================================

SELECT 
    abbreviation as "Code",
    libelle as "Nom du port",
    ville as "Ville",
    pays as "Pays"
FROM ports 
WHERE pays IN ('Etats-Unis', 'Canada', 'Bresil', 'Mexique')
ORDER BY pays, ville
LIMIT 30;

-- =========================================
-- 9. PORTS AFRICAINS
-- =========================================

SELECT 
    abbreviation as "Code",
    libelle as "Nom du port",
    ville as "Ville",
    pays as "Pays"
FROM ports 
WHERE pays IN ('Maroc', 'Egypte', 'Algerie', 'Tunisie', 'Afrique du Sud', 'Nigeria', 'Kenya', 'Ghana')
ORDER BY pays, ville;

-- =========================================
-- 10. VERIFICATION DE LA QUALITE DES DONNEES
-- =========================================

-- Ports avec des donnees manquantes
SELECT 
    'Ports sans ville' as "Probleme",
    COUNT(*) as "Nombre"
FROM ports 
WHERE ville IS NULL OR ville = ''
UNION ALL
SELECT 
    'Ports sans pays' as "Probleme",
    COUNT(*) as "Nombre"
FROM ports 
WHERE pays IS NULL OR pays = ''
UNION ALL
SELECT 
    'Ports sans code' as "Probleme",
    COUNT(*) as "Nombre"
FROM ports 
WHERE abbreviation IS NULL OR abbreviation = '';

-- =========================================
-- 11. AJOUTER LE PORT DE RADES SI MANQUANT
-- =========================================

INSERT INTO ports (libelle, abbreviation, ville, pays, isactive, createdat, updatedat) 
VALUES ('Port de Rades', 'TNRAD', 'Rades', 'Tunisie', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (abbreviation) DO NOTHING;

-- Verifier que le Port de Rades existe
SELECT 
    abbreviation as "Code",
    libelle as "Nom",
    ville as "Ville",
    pays as "Pays",
    CASE 
        WHEN isactive = true THEN 'Contacte'
        ELSE 'Non contacte'
    END as "Statut"
FROM ports 
WHERE abbreviation = 'TNRAD';
