-- ================================================================
-- ÉTAPE 2 : MIGRATION DE LA BASE ACTUELLE "velosi" VERS LE MODÈLE MULTI-TENANT
-- ================================================================
-- Ce script transforme votre base actuelle "velosi" en première organisation
-- "velosi" devient "shipnology_velosi" (une entreprise cliente)
-- ================================================================

-- ================================================================
-- PARTIE 1 : CRÉER LA STRUCTURE shipnology (si pas déjà fait)
-- ================================================================
-- Exécutez d'abord 000_create_shipnology_database.sql
-- ================================================================

-- ================================================================
-- PARTIE 2 : DUPLIQUER LA BASE "velosi" VERS "shipnology_velosi"
-- ================================================================

-- 1. Créer la nouvelle base de données pour Velosi (en tant que client)
CREATE DATABASE shipnology_velosi;

-- 2. Copier toute la structure et les données de "velosi" vers "shipnology_velosi"
-- MÉTHODE A : Utiliser pg_dump (RECOMMANDÉ)
-- Exécutez cette commande dans votre terminal :
-- pg_dump -U postgres velosi | psql -U postgres shipnology_velosi

-- MÉTHODE B : Copier manuellement (si pg_dump n'est pas disponible)
-- Se connecter à velosi et exporter les données, puis les importer dans shipnology_velosi

-- ================================================================
-- PARTIE 3 : ENREGISTRER VELOSI DANS LA TABLE organisations
-- ================================================================

\c shipnology;

-- Insérer Velosi comme première organisation
INSERT INTO organisations (
  id,
  nom,
  nom_affichage,
  database_name,
  email_contact,
  telephone,
  statut,
  plan,
  date_creation
) VALUES (
  1,
  'Velosi',
  'Velosi',
  'shipnology_velosi',
  'contact@velosi.com', -- CHANGEZ cet email par le vrai email de contact Velosi
  '+216 XX XXX XXX', -- CHANGEZ ce numéro
  'actif',
  'premium', -- Velosi a le plan premium car c'est votre première organisation
  NOW()
);

-- Optionnel : Insérer MSP comme organisation "admin" (pour vous-même)
INSERT INTO organisations (
  id,
  nom,
  nom_affichage,
  database_name,
  email_contact,
  telephone,
  statut,
  plan,
  date_creation
) VALUES (
  0,
  'MSP - Management System Productivity',
  'MSP',
  'shipnology_msp',
  'contact@msp-erp.com', -- Votre email MSP
  '+216 XX XXX XXX',
  'actif',
  'admin', -- Plan spécial "admin" pour MSP
  NOW()
);

-- ================================================================
-- PARTIE 4 : CRÉER LA BASE MSP (OPTIONNEL)
-- ================================================================
-- Cette base servira pour votre propre organisation MSP
-- Vous pouvez gérer les tokens, les organisations, etc.
-- ================================================================

CREATE DATABASE shipnology_msp;

\c shipnology_msp;

-- Copier la structure depuis velosi-structure.sql
-- Ou exécuter un script de création de tables

-- ================================================================
-- PARTIE 5 : AJUSTER LES SÉQUENCES
-- ================================================================

\c shipnology;

-- S'assurer que les prochains IDs commencent à 2 (ou 1 si MSP n'a pas été créé)
SELECT setval('organisations_id_seq', 1, true);

-- ================================================================
-- VÉRIFICATIONS APRÈS MIGRATION
-- ================================================================

-- Vérifier les organisations créées
SELECT id, nom, database_name, statut FROM organisations;

-- Vérifier que la base shipnology_velosi existe
SELECT datname FROM pg_database WHERE datname LIKE 'shipnology_%';

-- Compter les tables dans shipnology_velosi
\c shipnology_velosi;
SELECT COUNT(*) as nombre_tables 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Vérifier quelques tables importantes
SELECT 
  (SELECT COUNT(*) FROM personnel) as nb_personnel,
  (SELECT COUNT(*) FROM clients) as nb_clients,
  (SELECT COUNT(*) FROM prospects) as nb_prospects,
  (SELECT COUNT(*) FROM devis) as nb_devis;

-- ================================================================
-- ÉTAPES MANUELLES APRÈS CE SCRIPT
-- ================================================================

/*
1. BACKUP DE SÉCURITÉ (TRÈS IMPORTANT) :
   pg_dump -U postgres velosi > backup_velosi_before_migration.sql

2. EXÉCUTER LA COPIE :
   pg_dump -U postgres velosi | psql -U postgres shipnology_velosi

3. VÉRIFIER LES DONNÉES :
   - Se connecter à shipnology_velosi
   - Vérifier que toutes les tables existent
   - Vérifier que les données sont présentes

4. METTRE À JOUR LE FICHIER .env DU BACKEND :
   Anciennement:
   DB_DATABASE=velosi
   
   Maintenant (pour la connexion principale):
   DB_DATABASE=shipnology
   DB_DATABASE_MAIN=shipnology
   
   Les connexions aux bases clients se feront dynamiquement
   via le JWT (organisationId → database_name)

5. NE PAS SUPPRIMER "velosi" TOUT DE SUITE :
   - Gardez-la comme backup
   - Supprimez-la seulement après avoir testé que tout fonctionne
   - DROP DATABASE velosi; (UNIQUEMENT QUAND VOUS ÊTES SÛR)

6. TESTER LA CONNEXION :
   - Essayer de se connecter avec un utilisateur Velosi
   - Vérifier que les données s'affichent correctement
*/

-- ================================================================
-- FIN DU SCRIPT DE MIGRATION
-- ================================================================
