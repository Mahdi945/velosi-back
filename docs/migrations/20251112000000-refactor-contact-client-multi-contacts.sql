-- Migration pour refactoriser la table contact_client pour supporter plusieurs contacts par client
-- Date: 2025-11-12
-- Description: Ajout d'un ID auto-incrémenté, champs nom/prénom, et flag is_principal

-- Étape 1: Créer une table temporaire avec la nouvelle structure
CREATE TABLE contact_client_new (
    id SERIAL PRIMARY KEY,
    id_client INTEGER NOT NULL,
    nom VARCHAR(255),
    prenom VARCHAR(255),
    tel1 VARCHAR(255),
    tel2 VARCHAR(255),
    tel3 VARCHAR(255),
    fax VARCHAR(255),
    mail1 VARCHAR(255),
    mail2 VARCHAR(255),
    fonction VARCHAR(255),
    is_principal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_client) REFERENCES client(id) ON DELETE CASCADE
);

-- Étape 2: Copier les données existantes
-- Les contacts existants deviennent automatiquement "contact principal" pour chaque client
INSERT INTO contact_client_new (id_client, tel1, tel2, tel3, fax, mail1, mail2, fonction, is_principal, created_at, updated_at)
SELECT 
    id_client, 
    tel1, 
    tel2, 
    tel3, 
    fax, 
    mail1, 
    mail2, 
    fonction,
    TRUE as is_principal, -- Les contacts existants deviennent principaux
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM contact_client;

-- Étape 3: Supprimer l'ancienne table
DROP TABLE contact_client;

-- Étape 4: Renommer la nouvelle table
ALTER TABLE contact_client_new RENAME TO contact_client;

-- Étape 5: Créer les index pour optimiser les requêtes
CREATE INDEX idx_contact_client_id_client ON contact_client(id_client);
CREATE INDEX idx_contact_client_is_principal ON contact_client(is_principal);
CREATE INDEX idx_contact_client_mail1 ON contact_client(mail1);
CREATE INDEX idx_contact_client_mail2 ON contact_client(mail2);

-- Commentaires sur les colonnes
COMMENT ON COLUMN contact_client.id IS 'Identifiant unique du contact';
COMMENT ON COLUMN contact_client.id_client IS 'Référence vers le client';
COMMENT ON COLUMN contact_client.nom IS 'Nom de famille du contact';
COMMENT ON COLUMN contact_client.prenom IS 'Prénom du contact';
COMMENT ON COLUMN contact_client.is_principal IS 'Indique si ce contact est le contact principal du client (pour emails, etc.)';
COMMENT ON COLUMN contact_client.created_at IS 'Date de création du contact';
COMMENT ON COLUMN contact_client.updated_at IS 'Date de dernière mise à jour du contact';

-- Note: Pour PostgreSQL, vous pouvez aussi ajouter une contrainte pour garantir qu'il n'y a qu'un seul contact principal par client
-- Décommentez si nécessaire:
-- CREATE UNIQUE INDEX idx_unique_principal_per_client ON contact_client(id_client) WHERE is_principal = TRUE;
