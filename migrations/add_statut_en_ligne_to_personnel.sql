-- Migration: Ajout du statut en ligne et suivi d'activité pour les tables personnel et client
-- Date: 2025-12-02
-- Description: Ajoute les champs statut_en_ligne et last_activity pour gérer la présence en ligne

-- ========================================
-- TABLE PERSONNEL
-- ========================================

-- Ajouter la colonne statut_en_ligne (par défaut false - hors ligne)
ALTER TABLE personnel 
ADD COLUMN IF NOT EXISTS statut_en_ligne BOOLEAN DEFAULT false;

-- Ajouter la colonne last_activity pour tracker la dernière activité
ALTER TABLE personnel 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;

-- Créer un index pour optimiser les requêtes de recherche d'utilisateurs en ligne
CREATE INDEX IF NOT EXISTS idx_personnel_statut_en_ligne ON personnel(statut_en_ligne);
CREATE INDEX IF NOT EXISTS idx_personnel_last_activity ON personnel(last_activity);

-- Commentaires pour documentation
COMMENT ON COLUMN personnel.statut_en_ligne IS 'Indique si l''utilisateur est actuellement connecté (true) ou hors ligne (false)';
COMMENT ON COLUMN personnel.last_activity IS 'Timestamp de la dernière activité de l''utilisateur pour gérer l''expiration de session';

-- Initialiser tous les utilisateurs existants comme hors ligne
UPDATE personnel SET statut_en_ligne = false WHERE statut_en_ligne IS NULL;
UPDATE personnel SET last_activity = NOW() WHERE last_activity IS NULL;

-- ========================================
-- TABLE CLIENT
-- ========================================

-- Ajouter la colonne statut_en_ligne (par défaut false - hors ligne)
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS statut_en_ligne BOOLEAN DEFAULT false;

-- Ajouter la colonne last_activity pour tracker la dernière activité
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;

-- Créer un index pour optimiser les requêtes de recherche de clients en ligne
CREATE INDEX IF NOT EXISTS idx_client_statut_en_ligne ON client(statut_en_ligne);
CREATE INDEX IF NOT EXISTS idx_client_last_activity ON client(last_activity);

-- Commentaires pour documentation
COMMENT ON COLUMN client.statut_en_ligne IS 'Indique si le client est actuellement connecté (true) ou hors ligne (false)';
COMMENT ON COLUMN client.last_activity IS 'Timestamp de la dernière activité du client pour gérer l''expiration de session';

-- Initialiser tous les clients existants comme hors ligne
UPDATE client SET statut_en_ligne = false WHERE statut_en_ligne IS NULL;
UPDATE client SET last_activity = NOW() WHERE last_activity IS NULL;
