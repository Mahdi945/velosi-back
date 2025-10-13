-- Migration pour supprimer la contrainte de longueur sur le champ country
-- Date: 2024
-- Description: Permet la saisie libre du nom de pays sans limitation de 3 caractères

-- Modifier la colonne country pour supprimer la contrainte de longueur
ALTER TABLE crm_leads 
ALTER COLUMN country TYPE text;

-- Optionnel: Mettre à jour la valeur par défaut si nécessaire
-- UPDATE crm_leads SET country = 'Tunisie' WHERE country = 'TUN';

-- Commentaire pour la colonne
COMMENT ON COLUMN crm_leads.country IS 'Nom du pays (saisie libre sans limitation de caractères)';