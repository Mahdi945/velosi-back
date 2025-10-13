-- Migration pour ajouter le champ is_permanent à la table clients
-- Date: 13/10/2025
-- Description: Ajout du champ is_permanent (boolean NOT NULL DEFAULT false) pour distinguer les clients permanents des temporaires

-- Étape 1: Ajouter la colonne avec valeur par défaut
ALTER TABLE clients 
ADD COLUMN is_permanent BOOLEAN NOT NULL DEFAULT false;

-- Étape 2: Ajouter un commentaire pour la documentation
COMMENT ON COLUMN clients.is_permanent IS 'Indique si le client est permanent (accès site web) ou temporaire (pas d''accès site)';

-- Étape 3: Créer un index pour optimiser les requêtes par type de client
CREATE INDEX idx_clients_is_permanent ON clients(is_permanent);

-- Étape 4: Mettre à jour les clients existants (tous seront temporaires par défaut)
UPDATE clients SET is_permanent = false WHERE is_permanent IS NULL;

-- Étape 5: Forcer la mise à jour pour s'assurer que tous les clients ont une valeur
UPDATE clients SET is_permanent = COALESCE(is_permanent, false);

-- Vérification
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name = 'is_permanent';

-- Afficher quelques lignes pour vérifier
SELECT id, nom, is_permanent, mot_de_passe IS NULL as password_is_null 
FROM clients 
LIMIT 5;