-- Migration pour ajouter le champ first_login aux tables personnel et client
-- Date: 2025-09-29

-- Ajouter le champ first_login à la table personnel
ALTER TABLE personnel 
ADD COLUMN first_login BOOLEAN NOT NULL DEFAULT TRUE;

-- Ajouter le champ first_login à la table client
ALTER TABLE client 
ADD COLUMN first_login BOOLEAN NOT NULL DEFAULT TRUE;

-- Commenter les champs pour la documentation
COMMENT ON COLUMN personnel.first_login IS 'Indique si l''utilisateur doit changer son mot de passe au premier login';
COMMENT ON COLUMN client.first_login IS 'Indique si l''utilisateur doit changer son mot de passe au premier login';

-- Mettre à jour les utilisateurs existants pour qu'ils n'aient pas besoin de changer leur mot de passe
-- (car ils utilisent déjà le système)
UPDATE personnel SET first_login = FALSE WHERE created_at < NOW();
UPDATE client SET first_login = FALSE WHERE created_at < NOW();