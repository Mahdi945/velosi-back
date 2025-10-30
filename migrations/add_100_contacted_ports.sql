-- Script SQL: add_100_contacted_ports.sql
-- But: Ajoute 100 ports maritimes marqués comme contactés (isactive = true).
-- Utiliser: psql -d yourdb -f add_100_contacted_ports.sql
-- Chaque insertion utilise ON CONFLICT (abbreviation) DO UPDATE pour marquer isactive = true

BEGIN;

-- Exemple: Tunisie - ports locaux (incluant Port de Radès)
INSERT INTO ports (libelle, abbreviation, ville, pays, isactive, createdat, updatedat)
VALUES
  ('Port de Radès', 'TNRAD', 'Radès', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de La Goulette', 'TNLGH', 'La Goulette', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Tunis - Lac', 'TNLAC', 'Tunis', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Sfax', 'TNSFX', 'Sfax', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Sousse', 'TNSOU', 'Sousse', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Bizerte', 'TNBIZ', 'Bizerte', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Gabès', 'TNGAB', 'Gabès', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Zarzis', 'TNZAR', 'Zarzis', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Monastir', 'TNMON', 'Monastir', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Kelibia', 'TNKEL', 'Kelibia', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (abbreviation) DO UPDATE SET libelle = EXCLUDED.libelle, ville = EXCLUDED.ville, pays = EXCLUDED.pays, isactive = true, updatedat = CURRENT_TIMESTAMP;

-- Ports en Tunisie supplémentaires (20)
INSERT INTO ports (libelle, abbreviation, ville, pays, isactive, createdat, updatedat) VALUES
  ('Port de La Skhira', 'TNSKH', 'Skhira', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Jebeniana', 'TNJEB', 'Jebeniana', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port d\'Ain Draham', 'TNAIN', 'Ain Draham', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Ras Ajdir', 'TNRADJ', 'Ras Ajdir', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Menzel Bourguiba', 'TNMBG', 'Menzel Bourguiba', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Ben Guerdane', 'TNBEN', 'Ben Guerdane', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Kélibia', 'TNKLB', 'Kélibia', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Enfidha', 'TNENF', 'Enfidha', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Skhira II', 'TNSK2', 'Skhira', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Terminal Pétrolier Sfax', 'TNSFT', 'Sfax', 'Tunisie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (abbreviation) DO UPDATE SET libelle = EXCLUDED.libelle, ville = EXCLUDED.ville, pays = EXCLUDED.pays, isactive = true, updatedat = CURRENT_TIMESTAMP;

-- Ports populaires en France (incluant Marseille)
INSERT INTO ports (libelle, abbreviation, ville, pays, isactive, createdat, updatedat) VALUES
  ('Port de Marseille-Fos', 'FRMRS', 'Marseille', 'France', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port du Havre', 'FRLEH', 'Le Havre', 'France', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Dunkerque', 'FRDKK', 'Dunkerque', 'France', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Nantes-Saint-Nazaire', 'FRNTE', 'Nantes', 'France', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Bordeaux', 'FRBOD', 'Bordeaux', 'France', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Calais', 'FRCAL', 'Calais', 'France', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Rouen', 'FRRNE', 'Rouen', 'France', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de La Rochelle', 'FRLAR', 'La Rochelle', 'France', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port du Guilvinec', 'FRGUI', 'Guilvinec', 'France', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Sète', 'FRSET', 'Sète', 'France', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (abbreviation) DO UPDATE SET libelle = EXCLUDED.libelle, ville = EXCLUDED.ville, pays = EXCLUDED.pays, isactive = true, updatedat = CURRENT_TIMESTAMP;

-- Ports populaires Europe & Monde (30)
INSERT INTO ports (libelle, abbreviation, ville, pays, isactive, createdat, updatedat) VALUES
  ('Port de Rotterdam', 'NLRTM', 'Rotterdam', 'Pays-Bas', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port d\'Anvers', 'BEANR', 'Anvers', 'Belgique', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Hambourg', 'DEHAM', 'Hambourg', 'Allemagne', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Felixstowe', 'GBFXT', 'Felixstowe', 'Royaume-Uni', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Southampton', 'GBSOU', 'Southampton', 'Royaume-Uni', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port d\'Algeciras', 'ESALG', 'Algésiras', 'Espagne', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Barcelone', 'ESBCN', 'Barcelone', 'Espagne', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Valence', 'ESVLC', 'Valence', 'Espagne', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Gênes', 'ITGOA', 'Gênes', 'Italie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Naples', 'ITNAP', 'Naples', 'Italie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Shanghai', 'CNSHA', 'Shanghai', 'Chine', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Singapour', 'SGSIN', 'Singapour', 'Singapour', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Shenzhen', 'CNSZX', 'Shenzhen', 'Chine', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Ningbo', 'CNNGB', 'Ningbo', 'Chine', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Hong Kong', 'HKHKG', 'Hong Kong', 'Hong Kong', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Busan', 'KRPUS', 'Busan', 'Corée du Sud', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Durban', 'ZADUR', 'Durban', 'Afrique du Sud', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port du Cap', 'ZACPT', 'Le Cap', 'Afrique du Sud', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Santos', 'BRSSZ', 'Santos', 'Brésil', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Santos 2', 'BRSS2', 'Santos', 'Brésil', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Los Angeles', 'USLAX', 'Los Angeles', 'États-Unis', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Long Beach', 'USLGB', 'Long Beach', 'États-Unis', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de New York', 'USNYC', 'New York', 'États-Unis', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Savannah', 'USSAV', 'Savannah', 'États-Unis', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Houston', 'USHOU', 'Houston', 'États-Unis', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Vancouver', 'CAVAN', 'Vancouver', 'Canada', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Montréal', 'CAMTR', 'Montréal', 'Canada', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Manzanillo', 'MXMAN', 'Manzanillo', 'Mexique', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Veracruz', 'MXVER', 'Veracruz', 'Mexique', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (abbreviation) DO UPDATE SET libelle = EXCLUDED.libelle, ville = EXCLUDED.ville, pays = EXCLUDED.pays, isactive = true, updatedat = CURRENT_TIMESTAMP;

-- Compléter jusqu'a ~100 en ajoutant d'autres ports populaires (30 restants)
INSERT INTO ports (libelle, abbreviation, ville, pays, isactive, createdat, updatedat) VALUES
  ('Port de Colombo', 'LKCOL', 'Colombo', 'Sri Lanka', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Colombo 2', 'LKCOL2', 'Colombo', 'Sri Lanka', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Jeddah', 'SAJED', 'Jeddah', 'Arabie Saoudite', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Dubaï (Jebel Ali)', 'AEDXB', 'Dubaï', 'Émirats Arabes Unis', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port d\'Alexandrie', 'EGALX', 'Alexandrie', 'Égypte', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Casablanca', 'MACAS', 'Casablanca', 'Maroc', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Tanger Med', 'MATNG', 'Tanger', 'Maroc', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Haïfa', 'ILHFA', 'Haïfa', 'Israël', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Piraeus', 'GRPIR', 'Piraeus', 'Grèce', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port d\'Izmir', 'TRIZM', 'Izmir', 'Turquie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Constanta', 'ROCND', 'Constanta', 'Roumanie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Odessa', 'RUODD', 'Odessa', 'Ukraine', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Novorossiysk', 'RUNOV', 'Novorossiysk', 'Russie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Chennai', 'INMAA', 'Chennai', 'Inde', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Mumbai', 'INBOM', 'Mumbai', 'Inde', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Mundra', 'INMUN', 'Mundra', 'Inde', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Nhava Sheva (JNPT)', 'INJNPT', 'Mumbai', 'Inde', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Colombo 3', 'LKCOL3', 'Colombo', 'Sri Lanka', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Singapore Terminal 2', 'SGS02', 'Singapour', 'Singapour', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Yokohama', 'JPYOK', 'Yokohama', 'Japon', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Tokyo', 'JPTYO', 'Tokyo', 'Japon', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Nagoya', 'JPNGO', 'Nagoya', 'Japon', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Incheon', 'KRINC', 'Incheon', 'Corée du Sud', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Kaohsiung', 'TWKHH', 'Kaohsiung', 'Taïwan', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Laem Chabang', 'THLCB', 'Laem Chabang', 'Thaïlande', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Manila', 'PHMNL', 'Manila', 'Philippines', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Subic Bay', 'PHSUB', 'Subic', 'Philippines', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Brisbane', 'AUBNE', 'Brisbane', 'Australie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Sydney', 'AUSYD', 'Sydney', 'Australie', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Port de Auckland', 'NZAUK', 'Auckland', 'Nouvelle-Zélande', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (abbreviation) DO UPDATE SET libelle = EXCLUDED.libelle, ville = EXCLUDED.ville, pays = EXCLUDED.pays, isactive = true, updatedat = CURRENT_TIMESTAMP;

COMMIT;

-- Fin du script
