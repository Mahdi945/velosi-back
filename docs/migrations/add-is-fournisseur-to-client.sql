-- Migration: Ajouter les champs is_fournisseur et code_fournisseur à la table client
-- Date: 2025-11-13
-- Description: Permet de marquer un client comme fournisseur et stocker le code fournisseur associé

-- Ajouter la colonne is_fournisseur (par défaut false)
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS is_fournisseur BOOLEAN DEFAULT false;

-- Ajouter la colonne code_fournisseur (nullable)
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS code_fournisseur VARCHAR(20) NULL;

-- Ajouter un commentaire pour documentation
COMMENT ON COLUMN client.is_fournisseur IS 'Indique si le client est également fournisseur';
COMMENT ON COLUMN client.code_fournisseur IS 'Code du fournisseur associé (si is_fournisseur = true)';

-- Créer un index pour améliorer les performances des requêtes filtrant les fournisseurs
CREATE INDEX IF NOT EXISTS idx_client_is_fournisseur ON client(is_fournisseur) WHERE is_fournisseur = true;

-- Optionnel: Ajouter une contrainte pour s'assurer que si is_fournisseur = true, code_fournisseur n'est pas null
-- ALTER TABLE client 
-- ADD CONSTRAINT chk_fournisseur_code 
-- CHECK (is_fournisseur = false OR (is_fournisseur = true AND code_fournisseur IS NOT NULL));

-- Afficher le résultat
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'client' 
AND column_name IN ('is_fournisseur', 'code_fournisseur');
