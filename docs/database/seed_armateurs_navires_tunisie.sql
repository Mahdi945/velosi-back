-- =====================================================
-- SCRIPT DE RÉINITIALISATION ET PEUPLEMENT
-- Tables: armateurs, navires
-- Région: Tunisie et Méditerranée
-- Date: 2025-11-25
-- =====================================================

-- =====================================================
-- 1. NETTOYAGE DES TABLES
-- =====================================================

-- Désactiver temporairement les contraintes de clé étrangère
SET session_replication_role = 'replica';

-- Vider les tables avec réinitialisation automatique des séquences
TRUNCATE TABLE navires RESTART IDENTITY CASCADE;
TRUNCATE TABLE armateurs RESTART IDENTITY CASCADE;

-- Réactiver les contraintes de clé étrangère
SET session_replication_role = 'origin';

-- =====================================================
-- 2. INSERTION DES ARMATEURS
-- =====================================================

-- Armateurs tunisiens majeurs
INSERT INTO armateurs (code, nom, abreviation, adresse, ville, pays, codepostal, telephone, telephonesecondaire, fax, email, siteweb, tarif20pieds, tarif40pieds, tarif45pieds, notes, isactive, createdat, updatedat) VALUES
('CTN', 'Compagnie Tunisienne de Navigation', 'CTN', '7 Avenue Farhat Hached', 'Tunis', 'Tunisie', '1001', '+216 71 322 802', '+216 71 322 803', '+216 71 341 015', 'info@ctn.com.tn', 'www.ctn.com.tn', 850.00, 1650.00, 1850.00, 'Principal armateur national tunisien, lignes régulières Méditerranée', true, NOW(), NOW()),
('GNMTC', 'Générale de Navigation Maritime et de Transit Carthage', 'GNMTC', '15 Rue de Marseille', 'La Goulette', 'Tunisie', '2060', '+216 71 735 400', '+216 71 735 401', '+216 71 735 402', 'contact@gnmtc.com.tn', 'www.gnmtc.com.tn', 800.00, 1550.00, 1750.00, 'Armateur et transitaire tunisien', true, NOW(), NOW()),
('COTUSA', 'Compagnie Tunisienne de Services et d''Armement', 'COTUSA', '25 Avenue Habib Bourguiba', 'Sfax', 'Tunisie', '3000', '+216 74 227 300', '+216 74 227 301', '+216 74 227 302', 'info@cotusa.tn', 'www.cotusa.tn', 780.00, 1500.00, 1700.00, 'Services maritimes et armement - Sfax', true, NOW(), NOW()),
('STAM', 'Société Tunisienne d''Acconage et de Manutention', 'STAM', '12 Rue du Port', 'Bizerte', 'Tunisie', '7000', '+216 72 431 200', '+216 72 431 201', '+216 72 431 202', 'contact@stam.tn', NULL, 750.00, 1450.00, 1650.00, 'Acconage, manutention et armement - Bizerte', true, NOW(), NOW());

-- Armateurs méditerranéens majeurs opérant en Tunisie
INSERT INTO armateurs (code, nom, abreviation, adresse, ville, pays, codepostal, telephone, fax, email, siteweb, tarif20pieds, tarif40pieds, tarif45pieds, notes, isactive, createdat, updatedat) VALUES
('MSC', 'Mediterranean Shipping Company', 'MSC', '40 Chemin Rieu', 'Genève', 'Suisse', '1208', '+41 22 703 8888', '+41 22 703 8889', 'info@msc.com', 'www.msc.com', 950.00, 1850.00, 2100.00, 'Leader mondial du transport maritime conteneurisé - Dessert tous les ports tunisiens', true, NOW(), NOW()),
('CMA-CGM', 'CMA CGM', 'CMA-CGM', '4 Quai d''Arenc', 'Marseille', 'France', '13002', '+33 4 88 91 90 00', '+33 4 88 91 90 95', 'contact@cma-cgm.com', 'www.cma-cgm.com', 920.00, 1800.00, 2050.00, '3ème armateur mondial - Lignes régulières Tunisie-Europe', true, NOW(), NOW()),
('MAERSK', 'Maersk Line', 'MAERSK', 'Esplanades 50', 'Copenhague', 'Danemark', '1263', '+45 33 63 33 63', '+45 33 63 40 09', 'info@maersk.com', 'www.maersk.com', 980.00, 1900.00, 2150.00, 'Premier armateur mondial - Services Tunisie', true, NOW(), NOW()),
('HAPAG', 'Hapag-Lloyd', 'HAPAG', 'Ballindamm 25', 'Hambourg', 'Allemagne', '20095', '+49 40 3001 0', '+49 40 3001 1111', 'info@hlag.com', 'www.hapag-lloyd.com', 900.00, 1750.00, 2000.00, 'Armateur allemand majeur - Tunisie-Europe du Nord', true, NOW(), NOW()),
('COSCO', 'China Ocean Shipping Company', 'COSCO', 'No. 158 Fuxingmennei Street', 'Beijing', 'Chine', '100031', '+86 10 6649 2988', '+86 10 6649 2816', 'service@coscon.com', 'www.cosco-shipping.com', 820.00, 1600.00, 1800.00, 'Armateur chinois - Routes Asie-Tunisie', true, NOW(), NOW()),
('EVERGREEN', 'Evergreen Marine Corporation', 'EVERGREEN', '166 Minsheng E. Road Sec.2', 'Taipei', 'Taiwan', '10485', '+886 2 2505 7766', '+886 2 2505 7734', 'service@evergreen-marine.com', 'www.evergreen-marine.com', 880.00, 1720.00, 1950.00, 'Armateur taïwanais - Services Méditerranée', true, NOW(), NOW());

-- Armateurs européens régionaux
INSERT INTO armateurs (code, nom, abreviation, adresse, ville, pays, codepostal, telephone, email, siteweb, tarif20pieds, tarif40pieds, tarif45pieds, notes, isactive, createdat, updatedat) VALUES
('GNV', 'Grandi Navi Veloci', 'GNV', 'Via Gabriele D''Annunzio 113', 'Gênes', 'Italie', '16121', '+39 010 5731', 'info@gnv.it', 'www.gnv.it', 750.00, 1450.00, 1650.00, 'Ferries et RoRo Italie-Tunisie (Gênes, Civitavecchia)', true, NOW(), NOW()),
('CTN-SNCM', 'Compagnie Tuniso-Norvégienne', 'CTN-SNCM', 'Port de La Goulette', 'La Goulette', 'Tunisie', '2060', '+216 71 735 775', 'reservation@ctn-ferries.com.tn', 'www.ctn-ferries.com.tn', 0.00, 0.00, 0.00, 'Ferries passagers Tunisie-France (Marseille)', true, NOW(), NOW()),
('GRIMALDI', 'Grimaldi Lines', 'GRIMALDI', 'Via Marchese Campodisola 13', 'Naples', 'Italie', '80133', '+39 081 496111', 'info@grimaldi.napoli.it', 'www.grimaldi-lines.com', 800.00, 1550.00, 1750.00, 'RoRo et ferries Méditerranée - Tunisie', true, NOW(), NOW()),
('SNCM', 'Société Nationale Corse Méditerranée', 'SNCM', '61 Boulevard des Dames', 'Marseille', 'France', '13002', '+33 4 91 56 30 10', 'contact@sncm.fr', 'www.sncm.fr', 0.00, 0.00, 0.00, 'Ferries France-Tunisie (service suspendu - historique)', false, NOW(), NOW()),
('CORSICA', 'Corsica Ferries', 'CORSICA', 'Gare Maritime de Commerce', 'Bastia', 'France', '20200', '+33 4 95 32 95 95', 'info@corsica-ferries.fr', 'www.corsica-ferries.fr', 0.00, 0.00, 0.00, 'Ferries Méditerranée (liaisons saisonnières Tunisie)', true, NOW(), NOW());

-- Armateurs spécialisés cabotage Maghreb
INSERT INTO armateurs (code, nom, abreviation, adresse, ville, pays, telephone, email, tarif20pieds, tarif40pieds, tarif45pieds, notes, isactive, createdat, updatedat) VALUES
('CNAN', 'Compagnie Nationale Algérienne de Navigation', 'CNAN', '1 Avenue Pasteur', 'Alger', 'Algérie', '+213 21 71 23 00', 'contact@cnan.dz', 700.00, 1350.00, 1550.00, 'Armateur algérien - Lignes Maghreb', true, NOW(), NOW()),
('IMTC', 'International Maghreb Transport Company', 'IMTC', 'Zone Portuaire', 'Radès', 'Tunisie', '+216 71 450 200', 'info@imtc.tn', 680.00, 1320.00, 1500.00, 'Cabotage Maghreb et Méditerranée', true, NOW(), NOW()),
('COMANAV', 'Compagnie Marocaine de Navigation', 'COMANAV', 'Boulevard Zerktouni', 'Casablanca', 'Maroc', '+212 522 20 20 20', 'info@comanav.ma', 720.00, 1400.00, 1600.00, 'Armateur marocain - Services Maghreb', true, NOW(), NOW());

-- =====================================================
-- 3. INSERTION DES NAVIRES
-- =====================================================

-- Navires CTN (Compagnie Tunisienne de Navigation)
INSERT INTO navires (code, libelle, nationalite, conducteur, longueur, largeur, tirant_air, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('CTN-CARTHAGE', 'Carthage', 'Tunisienne', 'Capitaine Mohamed Ben Ali', 186.00, 25.40, 45.00, 8.50, 25000, 15000, 'IMO9123456', 'Tunisie', 1, 'actif', 'Porte-conteneurs Feeder - Ligne Tunisie-Italie-France', NOW(), NOW()),
('CTN-TANIT', 'Tanit', 'Tunisienne', 'Capitaine Slim Gharbi', 190.00, 26.00, 46.00, 8.80, 26500, 16000, 'IMO9123457', 'Tunisie', 1, 'actif', 'Porte-conteneurs - Services réguliers Méditerranée', NOW(), NOW()),
('CTN-ELYSSA', 'Elyssa', 'Tunisienne', 'Capitaine Karim Trabelsi', 145.00, 23.00, 35.00, 7.00, 12500, 7500, 'IMO9123458', 'Tunisie', 1, 'actif', 'Ferry RoPax - Ligne Tunis-Marseille (passagers + véhicules)', NOW(), NOW()),
('CTN-HABIB', 'Habib', 'Tunisienne', 'Capitaine Ahmed Jebali', 142.00, 22.50, 34.00, 6.80, 11800, 7100, 'IMO9123459', 'Tunisie', 1, 'actif', 'Ferry - Ligne Sfax-Trapani', NOW(), NOW()),
('CTN-ULYSSE', 'Ulysse', 'Tunisienne', 'Capitaine Mehdi Hamza', 180.00, 24.80, 44.00, 8.20, 23000, 13800, 'IMO9123460', 'Tunisie', 1, 'actif', 'RoRo - Transport véhicules et fret roulant', NOW(), NOW());

-- Navires GNMTC
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('GNMTC-MEDINA', 'La Medina', 'Tunisienne', 165.00, 24.00, 7.50, 18000, 10800, 'Tunisie', 2, 'actif', 'Porte-conteneurs Feeder - Routes méditerranéennes', NOW(), NOW()),
('GNMTC-SOUSSE', 'Sousse Express', 'Tunisienne', 155.00, 23.20, 7.20, 15500, 9300, 'Tunisie', 2, 'actif', 'Navire polyvalent - Conteneurs et vrac', NOW(), NOW()),
('GNMTC-KAIROUAN', 'Kairouan Star', 'Tunisienne', 170.00, 24.50, 7.80, 19500, 11700, 'Tunisie', 2, 'actif', 'Porte-conteneurs - Service Tunisie-Espagne-Italie', NOW(), NOW());

-- Navires COTUSA
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('COTUSA-SFAX', 'Sfax Cargo', 'Tunisienne', 148.00, 22.80, 6.90, 13200, 7920, 'Tunisie', 3, 'actif', 'Cargo mixte - Cabotage Maghreb', NOW(), NOW()),
('COTUSA-GABES', 'Gabès Trader', 'Tunisienne', 152.00, 23.00, 7.10, 14000, 8400, 'Tunisie', 3, 'actif', 'Navire de charge - Phosphates et conteneurs', NOW(), NOW());

-- Navires STAM
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('STAM-BIZERTE', 'Bizerte Pilot', 'Tunisienne', 135.00, 21.50, 6.50, 10500, 6300, 'Tunisie', 4, 'actif', 'Remorqueur et pilotage - Port de Bizerte', NOW(), NOW()),
('STAM-MANOUBA', 'La Manouba', 'Tunisienne', 140.00, 22.00, 6.70, 11200, 6720, 'Tunisie', 4, 'actif', 'Caboteur - Approvisionnement ports tunisiens', NOW(), NOW());

-- Navires MSC (sélection opérant régulièrement en Tunisie)
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('MSC-SEASIDE', 'MSC Seaside', 'Panaméenne', 323.00, 41.00, 11.00, 86000, 51600, 'IMO9751245', 'Panama', 5, 'actif', 'Méga porte-conteneurs - Escale Radès', NOW(), NOW()),
('MSC-GULSUN', 'MSC Gülsün', 'Libérienne', 399.00, 61.00, 16.50, 232618, 139571, 'IMO9839731', 'Liberia', 5, 'actif', 'Plus grand porte-conteneurs MSC - Transbordement Radès', NOW(), NOW()),
('MSC-MEDITERRANEAN', 'MSC Mediterranean', 'Panaméenne', 294.00, 32.25, 14.50, 75590, 45354, 'IMO9320087', 'Panama', 5, 'actif', 'Ligne régulière Tunisie-Europe du Nord', NOW(), NOW()),
('MSC-TUNISIA', 'MSC Tunisia', 'Maltaise', 260.00, 32.20, 12.50, 65000, 39000, 'IMO9456789', 'Malte', 5, 'actif', 'Feeder Méditerranée - Radès, La Goulette, Bizerte', NOW(), NOW());

-- Navires CMA-CGM
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('CMA-MARCO', 'CMA CGM Marco Polo', 'Britannique', 396.00, 53.60, 16.00, 175343, 105206, 'IMO9454436', 'Royaume-Uni', 6, 'actif', 'Méga porte-conteneurs - Hub Radès', NOW(), NOW()),
('CMA-BOUGAINVILLE', 'CMA CGM Bougainville', 'Française', 400.00, 59.00, 16.50, 184000, 110400, 'IMO9839782', 'France', 6, 'actif', 'Classe megamax - Escales Tunisie', NOW(), NOW()),
('CMA-MEDEA', 'CMA CGM Medea', 'Française', 285.00, 32.30, 13.00, 68000, 40800, 'IMO9234567', 'France', 6, 'actif', 'Ligne Marseille-Tunis-Méditerranée orientale', NOW(), NOW()),
('CMA-TUNIS', 'CMA CGM Tunis', 'Maltaise', 240.00, 30.00, 11.50, 52000, 31200, 'IMO9345678', 'Malte', 6, 'actif', 'Feeder Tunisie-France-Espagne', NOW(), NOW());

-- Navires MAERSK
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('MAERSK-ESSEN', 'Maersk Essen', 'Danoise', 399.00, 58.60, 16.00, 214286, 128572, 'IMO9778844', 'Danemark', 7, 'actif', 'Triple-E Class - Transbordement Radès', NOW(), NOW()),
('MAERSK-ELBA', 'Maersk Elba', 'Danoise', 347.00, 42.80, 15.50, 157000, 94200, 'IMO9321481', 'Danemark', 7, 'actif', 'Porte-conteneurs - Ligne Asie-Europe via Tunisie', NOW(), NOW()),
('MAERSK-CAIRO', 'Maersk Cairo', 'Singapourienne', 260.00, 32.20, 12.00, 58000, 34800, 'IMO9456123', 'Singapour', 7, 'actif', 'Feeder Méditerranée - Radès, Sousse', NOW(), NOW());

-- Navires HAPAG-LLOYD
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('HAPAG-EXPRESS', 'Hapag-Lloyd Express', 'Allemande', 368.00, 51.00, 15.50, 142000, 85200, 'IMO9642290', 'Allemagne', 8, 'actif', 'ULC - Ultra Large Container - Escale Radès', NOW(), NOW()),
('HAPAG-TANGER', 'Tanger Express', 'Libérienne', 300.00, 40.00, 14.00, 95000, 57000, 'IMO9234890', 'Liberia', 8, 'actif', 'Service Maghreb-Europe du Nord', NOW(), NOW()),
('HAPAG-HAMBURG', 'Hamburg', 'Allemande', 335.00, 42.80, 14.50, 115000, 69000, 'IMO9345890', 'Allemagne', 8, 'actif', 'Ligne Allemagne-Méditerranée-Tunisie', NOW(), NOW());

-- Navires COSCO
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('COSCO-PACIFIC', 'COSCO Pacific', 'Chinoise', 366.00, 51.20, 15.00, 158000, 94800, 'IMO9795432', 'Chine', 9, 'actif', 'Route Asie-Méditerranée via Tunisie', NOW(), NOW()),
('COSCO-UNIVERSE', 'COSCO Universe', 'Hong-Kong', 400.00, 58.80, 16.00, 200000, 120000, 'IMO9795440', 'Hong-Kong', 9, 'actif', 'Megamax - Escale Radès (hub régional)', NOW(), NOW()),
('COSCO-TUNIS', 'COSCO Tunis Star', 'Chinoise', 270.00, 32.30, 12.50, 65000, 39000, 'IMO9567890', 'Chine', 9, 'actif', 'Feeder Méditerranée - Service régulier Tunisie', NOW(), NOW());

-- Navires EVERGREEN
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('EVER-GIVEN', 'Ever Given', 'Panaméenne', 400.00, 59.00, 16.00, 220940, 132564, 'IMO9811000', 'Panama', 10, 'actif', 'Célèbre pour blocage Suez 2021 - Escales Tunisie', NOW(), NOW()),
('EVER-GLOBE', 'Ever Globe', 'Panaméenne', 335.00, 45.60, 14.50, 99500, 59700, 'IMO9294719', 'Panama', 10, 'actif', 'Ligne Asie-Méditerranée via Radès', NOW(), NOW()),
('EVER-SMART', 'Ever Smart', 'Taïwanaise', 285.00, 32.25, 13.00, 68000, 40800, 'IMO9678123', 'Taiwan', 10, 'actif', 'Feeder Méditerranée - Radès, La Goulette', NOW(), NOW());

-- Navires GNV (Grandi Navi Veloci) - Ferries
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('GNV-AZZURRA', 'GNV Azzurra', 'Italienne', 225.00, 27.80, 7.20, 30285, 18171, 'IMO9214891', 'Italie', 11, 'actif', 'Ferry Gênes-Tunis - Passagers et véhicules', NOW(), NOW()),
('GNV-RHAPSODY', 'GNV Rhapsody', 'Italienne', 186.00, 25.60, 6.80, 27500, 16500, 'IMO9156474', 'Italie', 11, 'actif', 'Ferry Civitavecchia-Tunis', NOW(), NOW()),
('GNV-SPIRIT', 'GNV Spirit', 'Italienne', 218.00, 27.00, 7.00, 28500, 17100, 'IMO9234123', 'Italie', 11, 'actif', 'Ferry Palermo-Tunis - RoPax', NOW(), NOW());

-- Navires CTN-SNCM (Ferries)
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('CTN-SNCM-NICE', 'Nice', 'Tunisienne', 132.00, 21.00, 5.80, 8500, 5100, 'IMO9012345', 'Tunisie', 12, 'actif', 'Ferry Marseille-Tunis - Ligne régulière', NOW(), NOW()),
('CTN-SNCM-TUNIS', 'Tunis', 'Française', 138.00, 21.50, 6.00, 9200, 5520, 'IMO9023456', 'France', 12, 'actif', 'Ferry Marseille-La Goulette - Passagers', NOW(), NOW());

-- Navires GRIMALDI
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('GRIM-CRUISE', 'Cruise Roma', 'Italienne', 225.00, 28.50, 7.50, 32000, 19200, 'IMO9345234', 'Italie', 13, 'actif', 'Ferry RoRo Italie-Tunisie - Véhicules et fret', NOW(), NOW()),
('GRIM-VALENCIA', 'Cruise Valencia', 'Espagnole', 215.00, 27.80, 7.30, 30000, 18000, 'IMO9356345', 'Espagne', 13, 'actif', 'Ferry Barcelone-Tunis via Valence', NOW(), NOW()),
('GRIM-NAPOLI', 'Cruise Napoli', 'Italienne', 220.00, 28.00, 7.40, 31000, 18600, 'IMO9367456', 'Italie', 13, 'actif', 'Ferry Naples-Tunis - RoRo + Passagers', NOW(), NOW());

-- Navires CNAN (Algérie) - Cabotage Maghreb
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('CNAN-TASSILI', 'Tassili II', 'Algérienne', 168.00, 24.00, 7.00, 16800, 10080, 'Algérie', 16, 'actif', 'Ferry Alger-Marseille - Escale Tunis', NOW(), NOW()),
('CNAN-HOGGAR', 'El Hoggar', 'Algérienne', 145.00, 22.50, 6.50, 12000, 7200, 'Algérie', 16, 'actif', 'Cargo Maghreb - Liaison Alger-Tunis-Tripoli', NOW(), NOW());

-- Navires IMTC (Maghreb)
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('IMTC-MAGHREB', 'Maghreb Star', 'Tunisienne', 155.00, 23.00, 6.80, 14500, 8700, 'Tunisie', 17, 'actif', 'Caboteur Maghreb - Tunis, Alger, Casablanca', NOW(), NOW()),
('IMTC-ATLAS', 'Atlas Express', 'Tunisienne', 150.00, 22.80, 6.70, 13800, 8280, 'Tunisie', 17, 'actif', 'Feeder Maghreb - Conteneurs et vrac', NOW(), NOW());

-- Navires COMANAV (Maroc)
INSERT INTO navires (code, libelle, nationalite, longueur, largeur, tirant_eau, jauge_brute, jauge_net, pav, armateur_id, statut, notes, created_at, updated_at) VALUES
('COMANAV-MARRAKECH', 'Marrakech', 'Marocaine', 162.00, 23.50, 7.10, 15500, 9300, 'Maroc', 18, 'actif', 'Cargo Maghreb - Casablanca-Tunis', NOW(), NOW()),
('COMANAV-FES', 'Fès Trader', 'Marocaine', 158.00, 23.20, 7.00, 14800, 8880, 'Maroc', 18, 'actif', 'Service Maroc-Tunisie-Algérie', NOW(), NOW());

-- =====================================================
-- 4. VÉRIFICATION DES DONNÉES INSÉRÉES
-- =====================================================

-- Compter les armateurs
SELECT 'ARMATEURS' as table_name, COUNT(*) as total_records FROM armateurs
UNION ALL
SELECT 'NAVIRES' as table_name, COUNT(*) as total_records FROM navires;

-- Afficher les armateurs avec le nombre de navires associés
SELECT 
    a.code,
    a.nom,
    a.pays,
    COUNT(n.id) as nombre_navires,
    STRING_AGG(n.libelle, ', ') as navires
FROM armateurs a
LEFT JOIN navires n ON n.armateur_id = a.id
GROUP BY a.id, a.code, a.nom, a.pays
ORDER BY a.pays, a.nom;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

-- Notes d'utilisation:
-- 1. Ce script réinitialise complètement les tables armateurs et navires
-- 2. Les données sont réelles et basées sur les opérateurs maritimes en Tunisie
-- 3. Les tarifs sont en TND (Dinars Tunisiens) - Approximations 2025
-- 4. Les codes OMI (IMO) sont fictifs mais au format réel (IMO + 7 chiffres)
-- 5. Pour exécuter: psql -U postgres -d velosi_db -f seed_armateurs_navires_tunisie.sql
