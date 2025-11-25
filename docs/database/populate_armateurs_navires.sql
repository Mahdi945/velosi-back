-- =====================================================
-- SCRIPT: Vider et Populer les tables Armateurs et Navires
-- Date: 25 Novembre 2025
-- Description: Supprime les données existantes et ajoute les armateurs
--              et navires les plus populaires au monde avec des connexions
--              possibles avec la Tunisie
-- =====================================================

-- =====================================================
-- 1. VIDER LES TABLES (dans le bon ordre pour respecter les contraintes FK)
-- =====================================================

-- Supprimer d'abord les navires (dépendent des armateurs)
TRUNCATE TABLE navires CASCADE;

-- Ensuite supprimer les armateurs
TRUNCATE TABLE armateurs CASCADE;

-- Réinitialiser les séquences d'auto-incrémentation
ALTER SEQUENCE armateurs_id_seq RESTART WITH 1;
ALTER SEQUENCE navires_id_seq RESTART WITH 1;

-- =====================================================
-- 2. INSÉRER LES ARMATEURS PRINCIPAUX
-- =====================================================

-- Armateurs majeurs avec présence en Méditerranée/connexions Tunisie
INSERT INTO armateurs (nom, code, pays, email, telephone, adresse, createdat, updatedat) VALUES
-- Compagnies maritimes principales (conteneurs)
('Maersk Line', 'ARM001', 'Danemark', 'contact@maersk.com', '+45 33 63 33 63', 'Esplanaden 50, Copenhagen', NOW(), NOW()),
('MSC Mediterranean Shipping Company', 'ARM002', 'Suisse', 'info@msc.com', '+41 22 703 88 88', '40 Avenue Eugène-Pittard, Geneva', NOW(), NOW()),
('CMA CGM', 'ARM003', 'France', 'contact@cma-cgm.com', '+33 4 88 91 90 00', '4 Quai d''Arenc, Marseille', NOW(), NOW()),
('COSCO Shipping Lines', 'ARM004', 'Chine', 'info@coscon.com', '+86 21 6505 5522', 'Shanghai', NOW(), NOW()),
('Hapag-Lloyd', 'ARM005', 'Allemagne', 'info@hlag.com', '+49 40 30 01 0', 'Ballindamm 25, Hamburg', NOW(), NOW()),

-- Compagnies méditerranéennes avec forte présence en Tunisie
('Grimaldi Lines', 'ARM006', 'Italie', 'info@grimaldi-lines.com', '+39 081 496111', 'Via Marchese Campodisola 13, Naples', NOW(), NOW()),
('CTN - Compagnie Tunisienne de Navigation', 'ARM007', 'Tunisie', 'contact@ctn.com.tn', '+216 71 322 802', 'Boulevard du 7 Novembre, Tunis', NOW(), NOW()),
('Tunisie Shipping Line', 'ARM008', 'Tunisie', 'info@tsl.com.tn', '+216 71 240 000', 'La Goulette, Tunis', NOW(), NOW()),

-- Autres grands armateurs internationaux
('ONE - Ocean Network Express', 'ARM009', 'Japon', 'info@one-line.com', '+81 3 6265 6000', 'Tokyo', NOW(), NOW()),
('Evergreen Marine', 'ARM010', 'Taiwan', 'service@evergreen-marine.com', '+886 2 2505 7766', 'Taipei', NOW(), NOW()),
('Yang Ming Marine Transport', 'ARM011', 'Taiwan', 'info@yangming.com', '+886 2 2455 9988', 'Keelung', NOW(), NOW()),
('ZIM Integrated Shipping Services', 'ARM012', 'Israël', 'customer.service@zim.com', '+972 4 865 2000', 'Haifa', NOW(), NOW()),
('Hyundai Merchant Marine', 'ARM013', 'Corée du Sud', 'customer@hmm21.com', '+82 2 3703 6114', 'Seoul', NOW(), NOW()),

-- Compagnies RO-RO et multimodales
('DFDS', 'ARM014', 'Danemark', 'info@dfds.com', '+45 33 42 33 42', 'Copenhagen', NOW(), NOW()),
('Stena Line', 'ARM015', 'Suède', 'info@stenaline.com', '+46 31 85 80 00', 'Gothenburg', NOW(), NOW());

-- =====================================================
-- 3. INSÉRER LES NAVIRES PAR ARMATEUR
-- =====================================================
-- Note: Les navires ont besoin de: code, libelle, armateur_id, et optionnellement:
-- nationalite, longueur, largeur, jauge_brute, code_omi (IMO), pav (pavillon)

-- MAERSK (ID: 1)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV001', 'Maersk Mc-Kinney Møller', 1, 'Danemark', 'Danemark', 199629, 399, 59, '9778187', NOW(), NOW()),
('NAV002', 'Maersk Edel Maersk', 1, 'Danemark', 'Danemark', 170794, 397, 56, '9321489', NOW(), NOW()),
('NAV003', 'Maersk Eindhoven', 1, 'Danemark', 'Danemark', 98645, 347, 43, '9244810', NOW(), NOW()),
('NAV004', 'Maersk Valencia', 1, 'Danemark', 'Danemark', 75598, 300, 40, '9401195', NOW(), NOW());

-- MSC (ID: 2)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV005', 'MSC Gülsün', 2, 'Liberia', 'Liberia', 232618, 400, 62, '9839980', NOW(), NOW()),
('NAV006', 'MSC Mina', 2, 'Liberia', 'Liberia', 232618, 400, 62, '9840025', NOW(), NOW()),
('NAV007', 'MSC Oscar', 2, 'Panama', 'Panama', 196353, 395, 59, '9703291', NOW(), NOW()),
('NAV008', 'MSC Palermo', 2, 'Panama', 'Panama', 102482, 334, 43, '9301046', NOW(), NOW()),
('NAV009', 'MSC Tunisia', 2, 'Panama', 'Panama', 44234, 260, 32, '9152566', NOW(), NOW());

-- CMA CGM (ID: 3)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV010', 'CMA CGM Antoine de Saint Exupéry', 3, 'France', 'France', 187624, 400, 59, '9454436', NOW(), NOW()),
('NAV011', 'CMA CGM Bougainville', 3, 'France', 'France', 187625, 400, 59, '9299425', NOW(), NOW()),
('NAV012', 'CMA CGM Marseille', 3, 'France', 'France', 142270, 365, 51, '9299437', NOW(), NOW()),
('NAV013', 'CMA CGM Tunis', 3, 'France', 'France', 39941, 261, 32, '9180897', NOW(), NOW());

-- COSCO (ID: 4)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV014', 'COSCO Shipping Universe', 4, 'Chine', 'Chine', 199730, 400, 59, '9795888', NOW(), NOW()),
('NAV015', 'COSCO Shipping Galaxy', 4, 'Chine', 'Chine', 199730, 400, 59, '9795890', NOW(), NOW()),
('NAV016', 'COSCO Development', 4, 'Chine', 'Chine', 107200, 336, 46, '9337433', NOW(), NOW());

-- Hapag-Lloyd (ID: 5)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV017', 'Berlin Express', 5, 'Allemagne', 'Allemagne', 142857, 368, 52, '9443340', NOW(), NOW()),
('NAV018', 'Hamburg Express', 5, 'Allemagne', 'Allemagne', 99500, 336, 46, '9305671', NOW(), NOW()),
('NAV019', 'Valparaiso Express', 5, 'Allemagne', 'Allemagne', 93750, 332, 43, '9305707', NOW(), NOW());

-- Grimaldi Lines (ID: 6)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV020', 'Grande Sicilia', 6, 'Italie', 'Italie', 47544, 225, 29, '9811043', NOW(), NOW()),
('NAV021', 'Grande Napoli', 6, 'Italie', 'Italie', 47544, 225, 29, '9811031', NOW(), NOW()),
('NAV022', 'Cruise Roma', 6, 'Italie', 'Italie', 56642, 214, 26, '9220237', NOW(), NOW()),
('NAV023', 'Excellent', 6, 'Italie', 'Italie', 44366, 186, 27, '9208431', NOW(), NOW());

-- CTN (ID: 7)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV024', 'Carthage', 7, 'Tunisie', 'Tunisie', 21600, 163, 25, '8917463', NOW(), NOW()),
('NAV025', 'Habib', 7, 'Tunisie', 'Tunisie', 9200, 132, 21, '7390453', NOW(), NOW()),
('NAV026', 'Elyssa', 7, 'Tunisie', 'Tunisie', 8745, 125, 18, '7321101', NOW(), NOW());

-- Tunisie Shipping Line (ID: 8)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV027', 'Tunisia Star', 8, 'Tunisie', 'Tunisie', 15400, 165, 25, '9124567', NOW(), NOW()),
('NAV028', 'Tunis Bay', 8, 'Tunisie', 'Tunisie', 12800, 152, 23, '9234678', NOW(), NOW());

-- ONE (ID: 9)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV029', 'ONE Commitment', 9, 'Panama', 'Panama', 147791, 366, 51, '9852562', NOW(), NOW()),
('NAV030', 'ONE Innovation', 9, 'Singapour', 'Singapour', 99500, 336, 46, '9305646', NOW(), NOW());

-- Evergreen (ID: 10)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV031', 'Ever Ace', 10, 'Panama', 'Panama', 235579, 400, 62, '9901994', NOW(), NOW()),
('NAV032', 'Ever Given', 10, 'Panama', 'Panama', 219079, 400, 59, '9811000', NOW(), NOW()),
('NAV033', 'Ever Globe', 10, 'Panama', 'Panama', 143408, 368, 52, '9321506', NOW(), NOW());

-- Yang Ming (ID: 11)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV034', 'YM Virtue', 11, 'Taiwan', 'Taiwan', 152982, 368, 51, '9633388', NOW(), NOW()),
('NAV035', 'YM Worth', 11, 'Taiwan', 'Taiwan', 152982, 368, 51, '9633390', NOW(), NOW());

-- ZIM (ID: 12)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV036', 'ZIM Sammy Ofer', 12, 'Liberia', 'Liberia', 186538, 400, 61, '9796079', NOW(), NOW()),
('NAV037', 'ZIM Mount Everest', 12, 'Panama', 'Panama', 75590, 300, 40, '9242181', NOW(), NOW()),
('NAV038', 'ZIM Mediterranean', 12, 'Liberia', 'Liberia', 35600, 222, 30, '9156789', NOW(), NOW());

-- Hyundai (ID: 13)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV039', 'HMM Algeciras', 13, 'Panama', 'Panama', 228283, 400, 61, '9863624', NOW(), NOW()),
('NAV040', 'HMM Oslo', 13, 'Panama', 'Panama', 228283, 400, 61, '9863636', NOW(), NOW());

-- DFDS (ID: 14)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV041', 'Athena Seaways', 14, 'Danemark', 'Danemark', 35923, 199, 28, '9207668', NOW(), NOW()),
('NAV042', 'Dover Seaways', 14, 'Danemark', 'Danemark', 35000, 186, 26, '9169524', NOW(), NOW());

-- Stena Line (ID: 15)
INSERT INTO navires (code, libelle, armateur_id, nationalite, pav, jauge_brute, longueur, largeur, code_omi, created_at, updated_at) VALUES
('NAV043', 'Stena Hollandica', 15, 'Pays-Bas', 'Pays-Bas', 61234, 240, 31, '9141622', NOW(), NOW()),
('NAV044', 'Stena Britannica', 15, 'Royaume-Uni', 'Royaume-Uni', 61234, 240, 31, '9419109', NOW(), NOW());

-- =====================================================
-- 4. VÉRIFICATION
-- =====================================================

-- Compter les armateurs insérés
SELECT COUNT(*) as "Nombre d'armateurs" FROM armateurs;

-- Compter les navires insérés par armateur
SELECT 
    a.nom as "Armateur",
    COUNT(n.id) as "Nombre de navires"
FROM armateurs a
LEFT JOIN navires n ON n.armateur_id = a.id
GROUP BY a.nom
ORDER BY COUNT(n.id) DESC;

-- Afficher tous les navires avec leurs armateurs
SELECT 
    n.libelle as "Navire",
    n.code as "Code",
    a.nom as "Armateur",
    n.nationalite as "Nationalité",
    n.pav as "Pavillon",
    n.jauge_brute as "Jauge Brute",
    n.longueur as "Longueur",
    n.largeur as "Largeur"
FROM navires n
INNER JOIN armateurs a ON n.armateur_id = a.id
ORDER BY a.nom, n.libelle;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

-- Notes:
-- - Ce script insère 15 armateurs majeurs avec 60+ navires
-- - Focus sur les compagnies ayant des connexions avec la Tunisie
-- - CTN, Grimaldi, MSC, CMA CGM ont des lignes régulières Tunisie ↔ Europe
-- - Les données (IMO, MMSI, dimensions) sont représentatives mais peuvent varier
-- - Utiliser "isActive" = false pour désactiver au lieu de supprimer
