-- Verification de la qualite des donnees importees
-- Les villes et pays doivent etre en texte complet, pas en codes

-- 1. Verifier quelques ports
SELECT 
    abbreviation as "Code",
    libelle as "Nom",
    ville as "Ville",
    pays as "Pays",
    isactive as "Contacte"
FROM ports 
ORDER BY pays, ville
LIMIT 20;

-- 2. Verifier quelques aeroports
SELECT 
    abbreviation as "Code",
    libelle as "Nom",
    ville as "Ville", 
    pays as "Pays",
    isactive as "Contacte"
FROM aeroports 
ORDER BY pays, ville
LIMIT 20;

-- 3. Statistiques par pays pour les ports
SELECT 
    pays as "Pays",
    COUNT(*) as "Nombre de ports"
FROM ports 
GROUP BY pays
ORDER BY COUNT(*) DESC;

-- 4. Statistiques par pays pour les aeroports (top 10)
SELECT 
    pays as "Pays",
    COUNT(*) as "Nombre d'aeroports"
FROM aeroports 
GROUP BY pays
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 5. Verifier les ports tunisiens
SELECT 
    abbreviation as "Code",
    libelle as "Nom",
    ville as "Ville",
    pays as "Pays"
FROM ports 
WHERE pays LIKE '%Tunis%' OR pays LIKE '%Tunisia%'
ORDER BY ville;

-- 6. Verifier les aeroports tunisiens
SELECT 
    abbreviation as "Code",
    libelle as "Nom",
    ville as "Ville",
    pays as "Pays"
FROM aeroports 
WHERE pays LIKE '%Tunis%' OR pays LIKE '%Tunisia%'
ORDER BY ville;
