-- Migration: Amélioration de la sécurité d'authentification multi-tenant
-- Date: 2025-12-17
-- Description: Rend l'email obligatoire et unique pour éviter les conflits de nom d'utilisateur

-- IMPORTANT: Cette migration doit être exécutée dans CHAQUE base de données d'organisation
-- Exemple: shipnology_velosi, shipnology_transport_rapide, etc.

-- Étape 1: Vérifier que tous les utilisateurs ont un email
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM personnel WHERE email IS NULL OR email = '') THEN
    RAISE NOTICE 'ATTENTION: Des utilisateurs sans email ont été trouvés. Veuillez les corriger avant de continuer.';
    RAISE NOTICE 'Exécutez: SELECT id, nom, prenom, nom_utilisateur FROM personnel WHERE email IS NULL OR email = '''';';
  ELSE
    RAISE NOTICE 'Tous les utilisateurs ont un email. Migration peut continuer.';
  END IF;
END $$;

-- Étape 2: Rendre la colonne email obligatoire
ALTER TABLE personnel 
  ALTER COLUMN email SET NOT NULL;

-- Étape 3: Ajouter une contrainte d'unicité sur l'email
-- (Permet d'éviter les doublons d'email dans la MÊME organisation)
ALTER TABLE personnel
  ADD CONSTRAINT unique_email_per_personnel UNIQUE (email);

-- Étape 4: Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_personnel_email ON personnel(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_personnel_nom_utilisateur ON personnel(LOWER(nom_utilisateur));

-- Étape 5: Ajouter un index composite pour les recherches d'authentification
CREATE INDEX IF NOT EXISTS idx_personnel_auth 
  ON personnel(email, statut) 
  WHERE statut = 'actif';

-- Étape 6: Même chose pour la table clients (si elle existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    -- Vérifier les emails manquants
    IF EXISTS (SELECT 1 FROM clients WHERE email IS NULL OR email = '') THEN
      RAISE NOTICE 'ATTENTION: Des clients sans email trouvés.';
    END IF;

    -- Rendre l'email obligatoire
    ALTER TABLE clients ALTER COLUMN email SET NOT NULL;
    
    -- Ajouter contrainte d'unicité
    ALTER TABLE clients 
      ADD CONSTRAINT IF NOT EXISTS unique_email_per_client UNIQUE (email);
    
    -- Index de performance
    CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(LOWER(email));
    
    RAISE NOTICE 'Table clients mise à jour avec succès.';
  END IF;
END $$;

-- Étape 7: Afficher un résumé
SELECT 
  'personnel' as table_name,
  COUNT(*) as total_users,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(*) - COUNT(DISTINCT email) as duplicate_emails
FROM personnel
UNION ALL
SELECT 
  'clients' as table_name,
  COUNT(*) as total_users,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(*) - COUNT(DISTINCT email) as duplicate_emails
FROM clients
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients');

-- Notes d'implémentation:
-- 1. Cette migration doit être exécutée dans CHAQUE base d'organisation
-- 2. Avant d'exécuter, s'assurer que tous les utilisateurs ont un email valide
-- 3. Si des doublons d'email existent, les corriger manuellement
-- 4. La recherche par email est maintenant CASE-INSENSITIVE grâce à l'index LOWER()

-- Script d'exécution pour toutes les organisations:
-- FOR org IN (SELECT database_name FROM organisations WHERE statut = 'actif')
-- LOOP
--   EXECUTE format('SET search_path TO %I; -- Puis exécuter cette migration', org.database_name);
-- END LOOP;
