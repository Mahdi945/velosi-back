-- Script SQL SÉCURISÉ pour ajouter des engins sans supprimer les existants
-- Ce script n'insère QUE les engins qui n'existent pas déjà
-- Exécuter ce script directement dans PostgreSQL

-- ========================================
-- ÉTAPE 1: Diagnostic initial
-- ========================================

SELECT 
    COUNT(*) as engins_existants,
    COALESCE(MAX(id), 0) as max_id_actuel
FROM engin;

-- ========================================
-- ÉTAPE 2: Réinitialiser la séquence
-- ========================================

-- Forcer la séquence à partir du MAX(id) actuel
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM engin;
    PERFORM setval('engin_id_seq', max_id, true);
    RAISE NOTICE 'Séquence réinitialisée à %', max_id;
END $$;

-- ========================================
-- ÉTAPE 3: Insérer les engins (éviter les doublons par libellé)
-- ========================================

-- Insérer uniquement si le libellé n'existe pas
INSERT INTO engin (libelle, conteneur_remorque, poids_vide, pied, description, is_active)
SELECT * FROM (VALUES
  ('Camion Porte-Conteneur 20', 'CONTENEUR', 3500.00, '20', 'Camion standard pour transport de conteneurs 20 pieds', true),
  ('Camion Porte-Conteneur 40', 'CONTENEUR', 4200.00, '40', 'Camion standard pour transport de conteneurs 40 pieds', true),
  ('Semi-Remorque Plateau', 'REMORQUE', 5500.00, '40', 'Semi-remorque plateau pour charges diverses', true),
  ('Semi-Remorque Frigorifique 20', 'CONTENEUR', 4800.00, '20', 'Conteneur frigorifique 20 pieds pour produits périssables', true),
  ('Semi-Remorque Frigorifique 40', 'CONTENEUR', 6200.00, '40', 'Conteneur frigorifique 40 pieds pour produits périssables', true),
  ('Camion Benne Basculante', 'VRAC', 6000.00, NULL, 'Camion benne pour transport de matériaux en vrac', true),
  ('Semi-Remorque Citerne', 'VRAC', 7500.00, NULL, 'Citerne pour transport de liquides', true),
  ('Porte-Conteneur HC 40', 'CONTENEUR', 4500.00, '40', 'Conteneur High Cube 40 pieds (hauteur supplémentaire)', true),
  ('Camion Fourgon 20m³', 'AUTRE', 2800.00, NULL, 'Fourgon fermé de 20 mètres cubes', true),
  ('Semi-Remorque Tautliner', 'REMORQUE', 5200.00, NULL, 'Remorque avec bâches coulissantes', true),
  ('Porte-Conteneur Open Top 20', 'CONTENEUR', 3800.00, '20', 'Conteneur 20 pieds à toit ouvrant', true),
  ('Porte-Conteneur Open Top 40', 'CONTENEUR', 4400.00, '40', 'Conteneur 40 pieds à toit ouvrant', true),
  ('Semi-Remorque Porte-Engins', 'REMORQUE', 5800.00, NULL, 'Remorque surbaissée pour transport d''engins', true),
  ('Camion Grue Mobile', 'AUTRE', 8500.00, NULL, 'Camion équipé d''une grue hydraulique', true),
  ('Conteneur Dry 45', 'CONTENEUR', 4800.00, '45', 'Conteneur sec 45 pieds High Cube', true),
  ('Semi-Remorque Isotherme', 'REMORQUE', 5500.00, NULL, 'Remorque isotherme non réfrigérée', true),
  ('Porte-Conteneur Tank 20', 'CONTENEUR', 4200.00, '20', 'Conteneur citerne 20 pieds pour liquides', true),
  ('Camion Hayon Élévateur', 'AUTRE', 3200.00, NULL, 'Camion avec hayon élévateur arrière', true),
  ('Semi-Remorque Porte-Voitures', 'REMORQUE', 6800.00, NULL, 'Remorque pour transport de véhicules', true),
  ('Conteneur Flat Rack 40', 'CONTENEUR', 3900.00, '40', 'Conteneur plat 40 pieds pour charges hors gabarit', true)
) AS v(libelle, conteneur_remorque, poids_vide, pied, description, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM engin WHERE engin.libelle = v.libelle
);

-- ========================================
-- ÉTAPE 4: Resynchroniser la séquence après insertion
-- ========================================

SELECT setval('engin_id_seq', (SELECT MAX(id) FROM engin), true);

-- ========================================
-- ÉTAPE 5: Vérifications finales
-- ========================================

-- Nombre total d'engins
SELECT 
    COUNT(*) as total_engins,
    COUNT(CASE WHEN is_active THEN 1 END) as engins_actifs,
    COUNT(CASE WHEN NOT is_active THEN 1 END) as engins_inactifs
FROM engin;

-- Les 10 derniers engins créés
SELECT 
    id, 
    libelle, 
    conteneur_remorque, 
    pied,
    is_active,
    'Récent' as statut
FROM engin 
ORDER BY id DESC 
LIMIT 10;

-- Statistiques par type
SELECT 
    COALESCE(conteneur_remorque, 'NON SPÉCIFIÉ') as type,
    COUNT(*) as nombre,
    ROUND(AVG(COALESCE(poids_vide, 0))::numeric, 2) as poids_moyen_kg
FROM engin 
GROUP BY conteneur_remorque
ORDER BY nombre DESC;

-- Vérifier la synchronisation de la séquence
SELECT 
    (SELECT MAX(id) FROM engin) as max_id_table,
    (SELECT last_value FROM engin_id_seq) as valeur_sequence,
    CASE 
        WHEN (SELECT MAX(id) FROM engin) = (SELECT last_value FROM engin_id_seq) 
        THEN '✅ Séquence parfaitement synchronisée'
        WHEN (SELECT MAX(id) FROM engin) < (SELECT last_value FROM engin_id_seq)
        THEN '✅ Séquence OK (prête pour insertions)'
        ELSE '❌ ERREUR: Séquence désynchronisée'
    END as statut_sequence;

-- Tester la prochaine valeur de la séquence
SELECT nextval('engin_id_seq') as prochaine_valeur_test;

-- Remettre la séquence à sa valeur correcte après le test
SELECT setval('engin_id_seq', (SELECT MAX(id) FROM engin), true);

-- Message de confirmation final
SELECT 
    '✅ Script terminé avec succès!' as message,
    (SELECT COUNT(*) FROM engin) as total_engins,
    'La séquence est synchronisée et prête pour de nouvelles insertions' as statut;
