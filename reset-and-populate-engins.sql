-- Script SQL pour RÉINITIALISER complètement la table engin
-- ⚠️ ATTENTION: Ce script supprime TOUTES les données existantes
-- Exécuter ce script directement dans PostgreSQL

-- ========================================
-- ÉTAPE 1: Sauvegarde (optionnelle)
-- ========================================

-- Créer une table de backup (décommenter si nécessaire)
-- CREATE TABLE engin_backup AS SELECT * FROM engin;

-- ========================================
-- ÉTAPE 2: Nettoyage complet
-- ========================================

-- Supprimer tous les engins existants
TRUNCATE TABLE engin RESTART IDENTITY CASCADE;

-- Vérifier que la table est vide
SELECT COUNT(*) as engins_restants FROM engin;

-- ========================================
-- ÉTAPE 3: Créer 20 engins de test
-- ========================================

INSERT INTO engin (libelle, conteneur_remorque, poids_vide, pied, description, is_active)
VALUES
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
  ('Conteneur Flat Rack 40', 'CONTENEUR', 3900.00, '40', 'Conteneur plat 40 pieds pour charges hors gabarit', true);

-- ========================================
-- ÉTAPE 4: Vérification
-- ========================================

-- Compter le nombre total d'engins créés
SELECT COUNT(*) as total_engins_crees FROM engin;

-- Afficher tous les engins créés
SELECT 
    id, 
    libelle, 
    conteneur_remorque, 
    pied, 
    poids_vide,
    is_active 
FROM engin 
ORDER BY id;

-- Vérifier la séquence
SELECT 
    (SELECT MAX(id) FROM engin) as max_id_table,
    (SELECT last_value FROM engin_id_seq) as valeur_sequence,
    CASE 
        WHEN (SELECT MAX(id) FROM engin) <= (SELECT last_value FROM engin_id_seq) 
        THEN '✅ Séquence correcte'
        ELSE '❌ Séquence désynchronisée'
    END as statut;

-- Statistiques par type
SELECT 
    conteneur_remorque as type,
    COUNT(*) as nombre,
    AVG(poids_vide) as poids_moyen
FROM engin 
WHERE conteneur_remorque IS NOT NULL
GROUP BY conteneur_remorque
ORDER BY nombre DESC;

-- Message de confirmation
SELECT '✅ 20 engins créés avec succès. La table est maintenant prête.' as message;
