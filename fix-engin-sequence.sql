-- Script SQL pour corriger la séquence de la table engin et créer des engins de test
-- Exécuter ce script directement dans PostgreSQL

-- ========================================
-- ÉTAPE 1: Diagnostiquer le problème
-- ========================================

-- Vérifier si la séquence existe
SELECT sequence_name, last_value 
FROM information_schema.sequences 
WHERE sequence_name = 'engin_id_seq';

-- Vérifier l'ID maximum actuel dans la table
SELECT COALESCE(MAX(id), 0) as max_id FROM engin;

-- ========================================
-- ÉTAPE 2: Réinitialiser la séquence
-- ========================================

-- Réinitialiser la séquence à la valeur correcte (MAX(id) + 1)
-- Le 'false' indique que la prochaine valeur sera celle spécifiée + 1
SELECT setval('engin_id_seq', COALESCE((SELECT MAX(id) FROM engin), 0), true);

-- Vérifier la nouvelle valeur (utiliser nextval au lieu de currval)
SELECT nextval('engin_id_seq') as prochaine_valeur;

-- Remettre la séquence à sa position correcte après le test
SELECT setval('engin_id_seq', COALESCE((SELECT MAX(id) FROM engin), 0), true);

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
  ('Conteneur Flat Rack 40', 'CONTENEUR', 3900.00, '40', 'Conteneur plat 40 pieds pour charges hors gabarit', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- ÉTAPE 4: Vérification finale
-- ========================================

-- Compter le nombre total d'engins
SELECT COUNT(*) as total_engins FROM engin;

-- Afficher les 5 derniers engins créés
SELECT id, libelle, conteneur_remorque, pied, is_active 
FROM engin 
ORDER BY id DESC 
LIMIT 5;

-- Vérifier que la séquence est bien synchronisée
SELECT 
    (SELECT MAX(id) FROM engin) as max_id_table,
    (SELECT last_value FROM engin_id_seq) as valeur_sequence,
    CASE 
        WHEN (SELECT MAX(id) FROM engin) <= (SELECT last_value FROM engin_id_seq) 
        THEN '✅ Séquence correcte'
        ELSE '❌ Séquence désynchronisée'
    END as statut;

-- ========================================
-- ÉTAPE 5: Réinitialiser définitivement
-- ========================================

-- Synchroniser une dernière fois pour être sûr
SELECT setval('engin_id_seq', (SELECT MAX(id) FROM engin), true);

-- Message de confirmation
SELECT '✅ Script terminé avec succès. La séquence est maintenant synchronisée.' as message;

