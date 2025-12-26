-- Migration: Ajout de la configuration SMTP par organisation
-- Date: 2025-12-17
-- Description: Permet à chaque organisation d'avoir sa propre configuration SMTP pour l'envoi d'emails

-- Étape 1: Ajouter les colonnes SMTP à la table organisations
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
  ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_password VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_from_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_from_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_use_tls BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS smtp_enabled BOOLEAN DEFAULT false;

-- Étape 2: Ajouter un slug pour identification facile des organisations
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Étape 3: Ajouter des commentaires pour la documentation
COMMENT ON COLUMN organisations.smtp_enabled IS 'Si true, utiliser la config SMTP personnalisée. Si false, utiliser la config globale du système.';
COMMENT ON COLUMN organisations.smtp_password IS 'Mot de passe SMTP chiffré. Ne jamais stocker en clair en production.';
COMMENT ON COLUMN organisations.slug IS 'Identifiant URL-friendly unique pour l''organisation (ex: "velosi", "transport-rapide")';

-- Étape 4: Créer un index sur le slug pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_organisations_slug ON organisations(slug);

-- Étape 5: Générer des slugs pour les organisations existantes
-- Exemple: "Velosi SARL" -> "velosi"
UPDATE organisations 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(nom, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- Étape 6: Afficher le résultat
SELECT 
  id, 
  nom, 
  slug, 
  database_name, 
  smtp_enabled,
  email_contact
FROM organisations
ORDER BY id;

-- Notes d'implémentation:
-- 1. Le champ smtp_password doit être chiffré avec crypto en production
-- 2. Si smtp_enabled = false, le système utilise la config globale (.env)
-- 3. Chaque organisation peut configurer son propre serveur SMTP
-- 4. Le slug permet une URL type: https://app.velosi-erp.com/login?org=velosi
