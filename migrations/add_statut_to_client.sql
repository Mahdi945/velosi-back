-- Migration pour ajouter la colonne statut à la table client
-- Date de création: 2025-09-23
-- Description: Ajoute le champ statut après la colonne photo dans la table client

-- Ajouter la colonne statut avec une valeur par défaut
ALTER TABLE client 
ADD COLUMN statut VARCHAR(255) DEFAULT 'actif' AFTER photo;

-- Mettre à jour tous les clients existants pour qu'ils aient le statut 'actif'
UPDATE client 
SET statut = 'actif' 
WHERE statut IS NULL;

-- Ajouter un commentaire à la colonne pour documenter les valeurs possibles
ALTER TABLE client 
MODIFY COLUMN statut VARCHAR(255) DEFAULT 'actif' 
COMMENT 'Statut du client: actif, inactif, suspendu, bloqué';

-- Optionnel: Créer un index sur la colonne statut pour optimiser les requêtes
CREATE INDEX idx_client_statut ON client(statut);

-- Vérifier que la migration s'est bien passée
SELECT COUNT(*) as total_clients, statut 
FROM client 
GROUP BY statut;