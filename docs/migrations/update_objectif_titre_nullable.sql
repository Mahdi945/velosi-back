-- Migration pour rendre le champ titre nullable dans la table objectif_com
-- Date: 2025-01-25

-- Modifier la colonne titre pour qu'elle soit nullable avec une valeur par défaut
ALTER TABLE objectif_com 
ALTER COLUMN titre DROP NOT NULL;

-- Ajouter une valeur par défaut
ALTER TABLE objectif_com 
ALTER COLUMN titre SET DEFAULT 'Objectif Commercial';

-- Mettre à jour les enregistrements existants avec des titres vides ou NULL
UPDATE objectif_com 
SET titre = 'Objectif Commercial' 
WHERE titre IS NULL OR titre = '';

-- Vérification (optionnel)
-- SELECT id, titre, id_personnel FROM objectif_com LIMIT 10;