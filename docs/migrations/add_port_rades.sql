-- Ajout du Port de Radès
INSERT INTO ports (libelle, abbreviation, ville, pays, isactive, createdat, updatedat) 
VALUES ('Port de Radès', 'TNRAD', 'Radès', 'Tunisie', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (abbreviation) DO NOTHING;

-- Vérification
SELECT * FROM ports WHERE abbreviation = 'TNRAD';
