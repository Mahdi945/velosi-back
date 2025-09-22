-- Migration pour mettre à jour les avatars par défaut
-- Mettre à jour tous les utilisateurs qui n'ont pas de photo avec l'avatar par défaut PNG

-- Mettre à jour la table personnel
UPDATE personnel 
SET photo = 'uploads/profiles/default-avatar.png' 
WHERE photo IS NULL OR photo = '' OR photo = 'uploads/profiles/default-avatar.svg';

-- Mettre à jour la table client
UPDATE client 
SET photo = 'uploads/profiles/default-avatar.png' 
WHERE photo IS NULL OR photo = '' OR photo = 'uploads/profiles/default-avatar.svg';

-- Mettre à jour la valeur par défaut pour les nouvelles colonnes
ALTER TABLE personnel ALTER COLUMN photo SET DEFAULT 'uploads/profiles/default-avatar.png';
ALTER TABLE client ALTER COLUMN photo SET DEFAULT 'uploads/profiles/default-avatar.png';

COMMENT ON SCRIPT IS 'Migration pour mettre à jour les avatars par défaut en PNG - Version 1.1';