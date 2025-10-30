-- Ajouter le Port de Radès s'il n'existe pas
INSERT INTO ports (libelle, abbreviation, ville, pays, isactive) 
VALUES ('Port de Radès', 'TNRAD', 'Radès', 'Tunisie', false)
ON CONFLICT (abbreviation) DO NOTHING;

-- Mettre isactive à false par défaut pour tous les ports et aéroports existants
UPDATE ports SET isactive = false WHERE isactive = true;
UPDATE aeroports SET isactive = false WHERE isactive = true;
