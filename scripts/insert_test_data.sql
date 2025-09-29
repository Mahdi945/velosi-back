-- Script PostgreSQL pour insérer des données de test réalistes pour Velosi Transport (Tunisie)
-- Société tunisienne de transport et logistique

-- ===============================
-- 1. INSERTION DU PERSONNEL
-- ===============================

-- Vider les tables dans l'ordre des dépendances
DELETE FROM objectif_com;
DELETE FROM contact_client;
DELETE FROM client;
DELETE FROM personnel;

-- Réinitialiser les séquences
ALTER SEQUENCE personnel_id_seq RESTART WITH 1;
ALTER SEQUENCE client_id_seq RESTART WITH 1;
ALTER SEQUENCE objectif_com_id_seq RESTART WITH 1;

-- Personnel avec noms et numéros tunisiens
INSERT INTO personnel (nom, prenom, nom_utilisateur, role, telephone, email, genre, statut, mot_de_passe, keycloak_id, photo, first_login, created_at, updated_at) VALUES
-- Direction
('Ben Salah', 'Mohamed', 'mohamed.bensalah', 'admin', '+216 22 345 678', 'mohamed.bensalah@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/mohamed_bensalah.jpg', false, NOW(), NOW()),
('Trabelsi', 'Amina', 'amina.trabelsi', 'direction', '+216 98 765 432', 'amina.trabelsi@velosi.tn', 'Femme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/amina_trabelsi.jpg', false, NOW(), NOW()),

-- Équipe Commerciale
('Karray', 'Sami', 'sami.karray', 'commercial', '+216 20 123 456', 'sami.karray@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/sami_karray.jpg', true, NOW(), NOW()),
('Bejaoui', 'Leila', 'leila.bejaoui', 'commercial', '+216 55 789 123', 'leila.bejaoui@velosi.tn', 'Femme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/leila_bejaoui.jpg', false, NOW(), NOW()),
('Ouali', 'Karim', 'karim.ouali', 'commercial', '+216 24 567 890', 'karim.ouali@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/karim_ouali.jpg', false, NOW(), NOW()),
('Mansouri', 'Fatma', 'fatma.mansouri', 'commercial', '+216 97 234 567', 'fatma.mansouri@velosi.tn', 'Femme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/fatma_mansouri.jpg', true, NOW(), NOW()),

-- Équipe Exploitation
('Hammami', 'Youssef', 'youssef.hammami', 'exploitation', '+216 21 345 678', 'youssef.hammami@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/youssef_hammami.jpg', false, NOW(), NOW()),
('Chebbi', 'Meriem', 'meriem.chebbi', 'exploitation', '+216 56 789 012', 'meriem.chebbi@velosi.tn', 'Femme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/meriem_chebbi.jpg', false, NOW(), NOW()),
('Jebali', 'Ahmed', 'ahmed.jebali', 'exploitation', '+216 25 678 901', 'ahmed.jebali@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/ahmed_jebali.jpg', false, NOW(), NOW()),

-- Chauffeurs
('Slimani', 'Hedi', 'hedi.slimani', 'chauffeur', '+216 22 456 789', 'hedi.slimani@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/hedi_slimani.jpg', false, NOW(), NOW()),
('Bourguiba', 'Nabil', 'nabil.bourguiba', 'chauffeur', '+216 98 567 234', 'nabil.bourguiba@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/nabil_bourguiba.jpg', false, NOW(), NOW()),
('Ghanmi', 'Tarek', 'tarek.ghanmi', 'chauffeur', '+216 53 890 123', 'tarek.ghanmi@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/tarek_ghanmi.jpg', false, NOW(), NOW()),
('Dakhli', 'Ridha', 'ridha.dakhli', 'chauffeur', '+216 27 234 567', 'ridha.dakhli@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/ridha_dakhli.jpg', false, NOW(), NOW()),
('Mliki', 'Sofiene', 'sofiene.mliki', 'chauffeur', '+216 99 345 678', 'sofiene.mliki@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/sofiene_mliki.jpg', false, NOW(), NOW()),

-- Finance et Comptabilité
('Saidi', 'Rania', 'rania.saidi', 'comptabilite', '+216 54 123 456', 'rania.saidi@velosi.tn', 'Femme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/rania_saidi.jpg', false, NOW(), NOW()),
('Mekki', 'Walid', 'walid.mekki', 'finance', '+216 26 789 012', 'walid.mekki@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/walid_mekki.jpg', false, NOW(), NOW()),

-- RH et Support
('Habib', 'Sonia', 'sonia.habib', 'rh', '+216 95 456 789', 'sonia.habib@velosi.tn', 'Femme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/sonia_habib.jpg', false, NOW(), NOW()),
('Kouki', 'Amine', 'amine.kouki', 'support', '+216 28 567 890', 'amine.kouki@velosi.tn', 'Homme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/amine_kouki.jpg', false, NOW(), NOW()),

-- Qualité
('Zouari', 'Olfa', 'olfa.zouari', 'qualite', '+216 57 234 567', 'olfa.zouari@velosi.tn', 'Femme', 'actif', '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/olfa_zouari.jpg', false, NOW(), NOW());

-- ===============================
-- 2. INSERTION DES CLIENTS
-- ===============================

-- Clients tunisiens et internationaux pour société de transport
INSERT INTO client (nom, interlocuteur, categorie, type_client, adresse, code_postal, ville, pays, id_fiscal, nature, c_douane, nbr_jour_ech, etat_fiscal, n_auto, date_auto, franchise_sur, date_fin, blocage, devise, timbre, compte_cpt, sec_activite, charge_com, stop_envoie_solde, maj_web, d_initial, c_initial, solde, mot_de_passe, keycloak_id, photo, statut, first_login, created_at) VALUES

-- Clients tunisiens
('SOTRANSTU', 'mohamed.ben.ahmed@sotranstu.tn', 'Grande Entreprise', 'National', 'Avenue Habib Bourguiba, Tunis', '1000', 'Tunis', 'Tunisie', '0123456789012', 'Transport Public', 'TUN001', 30, 'Régulier', 'AUTO2024001', '2024-01-15', 50000.00, '2024-12-31', false, 'TND', true, '411001', 'Transport', 'Sami Karray', false, true, 0.00, 0.00, 15000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/sotranstu.jpg', 'actif', true, NOW()),

('Groupe Loukil Transport', 'contact@loukiltransport.tn', 'Grande Entreprise', 'National', 'Zone Industrielle Sfax', '3000', 'Sfax', 'Tunisie', '0987654321098', 'Transport Marchandises', 'TUN002', 45, 'Régulier', 'AUTO2024002', '2024-02-01', 75000.00, '2024-12-31', false, 'TND', true, '411002', 'Logistique', 'Leila Bejaoui', false, true, 0.00, 0.00, 22500.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/loukil_transport.jpg', 'actif', true, NOW()),

('STAFIM Transport', 'direction@stafim.com.tn', 'Grande Entreprise', 'National', 'Rue de la République, Sousse', '4000', 'Sousse', 'Tunisie', '1234567890123', 'Transport et Logistique', 'TUN003', 30, 'Régulier', 'AUTO2024003', '2024-01-20', 60000.00, '2024-12-31', false, 'TND', true, '411003', 'Transport', 'Karim Ouali', false, true, 0.00, 0.00, 18750.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/stafim.jpg', 'actif', true, NOW()),

('Transtu Bizerte', 'admin@transtu-bizerte.tn', 'Moyenne Entreprise', 'National', 'Avenue de la Corniche, Bizerte', '7000', 'Bizerte', 'Tunisie', '2345678901234', 'Transport Urbain', 'TUN004', 30, 'Régulier', 'AUTO2024004', '2024-02-10', 35000.00, '2024-12-31', false, 'TND', true, '411004', 'Transport', 'Fatma Mansouri', false, true, 0.00, 0.00, 12000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/transtu_bizerte.jpg', 'actif', true, NOW()),

('SNTRI - Société Nationale de Transport Rural et Interurbain', 'contact@sntri.tn', 'Grande Entreprise', 'National', 'Avenue Mohamed V, Tunis', '1001', 'Tunis', 'Tunisie', '3456789012345', 'Transport Interurbain', 'TUN005', 30, 'Régulier', 'AUTO2024005', '2024-01-25', 80000.00, '2024-12-31', false, 'TND', true, '411005', 'Transport', 'Sami Karray', false, true, 0.00, 0.00, 25000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/sntri.jpg', 'actif', true, NOW()),

('Carthago Airlines Cargo', 'cargo@carthago.tn', 'Grande Entreprise', 'National', 'Aéroport International Tunis-Carthage', '1080', 'Tunis', 'Tunisie', '4567890123456', 'Transport Aérien', 'TUN006', 15, 'Régulier', 'AUTO2024006', '2024-02-05', 100000.00, '2024-12-31', false, 'TND', true, '411006', 'Aérien', 'Leila Bejaoui', false, true, 0.00, 0.00, 45000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/carthago_cargo.jpg', 'actif', true, NOW()),

('SNCFT - Société Nationale des Chemins de Fer Tunisiens', 'commercial@sncft.tn', 'Grande Entreprise', 'National', 'Place Barcelone, Tunis', '1000', 'Tunis', 'Tunisie', '5678901234567', 'Transport Ferroviaire', 'TUN007', 30, 'Régulier', 'AUTO2024007', '2024-01-30', 120000.00, '2024-12-31', false, 'TND', true, '411007', 'Ferroviaire', 'Karim Ouali', false, true, 0.00, 0.00, 35000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/sncft.jpg', 'actif', true, NOW()),

('CTN - Compagnie Tunisienne de Navigation', 'commercial@ctn.tn', 'Grande Entreprise', 'National', 'Port de Tunis, La Goulette', '2060', 'La Goulette', 'Tunisie', '6789012345678', 'Transport Maritime', 'TUN008', 45, 'Régulier', 'AUTO2024008', '2024-02-15', 150000.00, '2024-12-31', false, 'TND', true, '411008', 'Maritime', 'Fatma Mansouri', false, true, 0.00, 0.00, 55000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/ctn.jpg', 'actif', true, NOW()),

('Transport Ben Youssef', 'contact@benyoussef-transport.tn', 'PME', 'National', 'Route de Kairouan, Km 12', '3100', 'Kairouan', 'Tunisie', '7890123456789', 'Transport Régional', 'TUN009', 30, 'Régulier', 'AUTO2024009', '2024-02-20', 25000.00, '2024-12-31', false, 'TND', true, '411009', 'Transport', 'Sami Karray', false, true, 0.00, 0.00, 8500.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/benyoussef.jpg', 'actif', true, NOW()),

('Mehiri Logistique', 'info@mehiri-log.tn', 'Moyenne Entreprise', 'National', 'Zone Industrielle Gabès', '6000', 'Gabès', 'Tunisie', '8901234567890', 'Logistique et Stockage', 'TUN010', 30, 'Régulier', 'AUTO2024010', '2024-01-10', 40000.00, '2024-12-31', false, 'TND', true, '411010', 'Logistique', 'Leila Bejaoui', false, true, 0.00, 0.00, 15500.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/mehiri_log.jpg', 'actif', true, NOW()),

-- Clients internationaux
('DHL Express Algeria', 'tunisia@dhl.com', 'Multinationale', 'International', '15 Rue Alger, Hydra', '16000', 'Alger', 'Algérie', 'DZ123456789', 'Express International', 'ALG001', 15, 'Régulier', 'AUTO2024011', '2024-01-05', 200000.00, '2024-12-31', false, 'EUR', false, '411011', 'Express', 'Karim Ouali', false, true, 0.00, 0.00, 85000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/dhl_algeria.jpg', 'actif', true, NOW()),

('FedEx Morocco', 'operations.morocco@fedex.com', 'Multinationale', 'International', 'Casablanca Finance City', '20000', 'Casablanca', 'Maroc', 'MA987654321', 'Express International', 'MAR001', 15, 'Régulier', 'AUTO2024012', '2024-01-12', 180000.00, '2024-12-31', false, 'EUR', false, '411012', 'Express', 'Fatma Mansouri', false, true, 0.00, 0.00, 75000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/fedex_morocco.jpg', 'actif', true, NOW()),

('Bollore Logistics Libya', 'tunis@bollore.com', 'Multinationale', 'International', 'Tripoli Business Center', '00218', 'Tripoli', 'Libye', 'LY456789123', 'Logistique Internationale', 'LIB001', 30, 'Régulier', 'AUTO2024013', '2024-02-25', 250000.00, '2024-12-31', false, 'USD', false, '411013', 'Logistique', 'Sami Karray', false, true, 0.00, 0.00, 95000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/bollore_libya.jpg', 'actif', true, NOW()),

('Maersk Line Mediterranean', 'med.operations@maersk.com', 'Multinationale', 'International', 'Via del Porto 25', '16121', 'Gênes', 'Italie', 'IT789123456', 'Transport Maritime', 'ITA001', 45, 'Régulier', 'AUTO2024014', '2024-01-18', 500000.00, '2024-12-31', false, 'EUR', false, '411014', 'Maritime', 'Leila Bejaoui', false, true, 0.00, 0.00, 150000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/maersk_med.jpg', 'actif', true, NOW()),

('CMA CGM Marseille', 'tunisia@cma-cgm.com', 'Multinationale', 'International', 'Port de Marseille Fos', '13000', 'Marseille', 'France', 'FR123789456', 'Transport Maritime', 'FRA001', 30, 'Régulier', 'AUTO2024015', '2024-02-08', 400000.00, '2024-12-31', false, 'EUR', false, '411015', 'Maritime', 'Karim Ouali', false, true, 0.00, 0.00, 120000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/cma_cgm.jpg', 'actif', true, NOW()),

('Turkish Cargo', 'partnerships@turkishcargo.com', 'Grande Entreprise', 'International', 'Istanbul Airport Cargo Terminal', '34149', 'Istanbul', 'Turquie', 'TR654321987', 'Fret Aérien', 'TUR001', 15, 'Régulier', 'AUTO2024016', '2024-01-22', 300000.00, '2024-12-31', false, 'EUR', false, '411016', 'Aérien', 'Fatma Mansouri', false, true, 0.00, 0.00, 105000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/turkish_cargo.jpg', 'actif', true, NOW()),

-- Quelques clients inactifs pour tester
('Ancien Client SARL', 'ancien@client.tn', 'PME', 'National', 'Ancienne Adresse', '2000', 'Tunis', 'Tunisie', '9999999999999', 'Ancien', 'OLD001', 30, 'Suspendu', 'AUTO2023001', '2023-01-01', 10000.00, '2023-12-31', true, 'TND', true, '411999', 'Ancien', 'N/A', true, false, 0.00, 0.00, -5000.00, '$2b$10$encrypted_password', gen_random_uuid(), 'uploads/profiles/default-avatar.png', 'inactif', true, NOW() - INTERVAL '6 months');

-- ===============================
-- 3. INSERTION DES CONTACTS CLIENTS
-- ===============================

-- Contacts pour les clients (1 à 3 contacts par client)
INSERT INTO contact_client (id_client, tel1, tel2, tel3, fax, mail1, mail2, fonction) VALUES
-- SOTRANSTU
(1, '+216 71 123 456', '+216 22 345 678', '+216 98 765 432', '+216 71 123 457', 'mohamed.ben.ahmed@sotranstu.tn', 'commercial@sotranstu.tn', 'Directeur Commercial'),

-- Groupe Loukil Transport
(2, '+216 74 456 789', '+216 55 234 567', '+216 99 876 543', '+216 74 456 790', 'contact@loukiltransport.tn', 'exploitation@loukiltransport.tn', 'Responsable Exploitation'),

-- STAFIM Transport
(3, '+216 73 789 012', '+216 24 567 890', '+216 97 654 321', '+216 73 789 013', 'direction@stafim.com.tn', 'logistique@stafim.com.tn', 'Directeur Logistique'),

-- Transtu Bizerte
(4, '+216 72 234 567', '+216 53 890 123', NULL, '+216 72 234 568', 'admin@transtu-bizerte.tn', 'tech@transtu-bizerte.tn', 'Administrateur'),

-- SNTRI
(5, '+216 71 567 890', '+216 26 123 456', '+216 95 432 109', '+216 71 567 891', 'contact@sntri.tn', 'planning@sntri.tn', 'Chef de Planning'),

-- Carthago Airlines Cargo
(6, '+216 71 890 123', '+216 27 456 789', '+216 52 109 876', '+216 71 890 124', 'cargo@carthage.tn', 'operations@carthago.tn', 'Responsable Opérations'),

-- SNCFT
(7, '+216 71 345 678', '+216 28 789 012', '+216 96 543 210', '+216 71 345 679', 'commercial@sncft.tn', 'fret@sncft.tn', 'Directeur Fret'),

-- CTN
(8, '+216 71 678 901', '+216 54 012 345', '+216 98 210 987', '+216 71 678 902', 'commercial@ctn.tn', 'operations@ctn.tn', 'Chef Opérations'),

-- Transport Ben Youssef
(9, '+216 77 901 234', '+216 25 345 678', NULL, NULL, 'contact@benyoussef-transport.tn', NULL, 'Gérant'),

-- Mehiri Logistique
(10, '+216 75 234 567', '+216 56 678 901', '+216 99 876 543', '+216 75 234 568', 'info@mehiri-log.tn', 'warehouse@mehiri-log.tn', 'Responsable Entrepôt'),

-- DHL Express Algeria
(11, '+213 21 456 789', '+213 555 123 456', '+213 777 890 123', '+213 21 456 790', 'tunisia@dhl.com', 'operations.algeria@dhl.com', 'Country Manager Tunisia'),

-- FedEx Morocco
(12, '+212 522 789 012', '+212 666 234 567', '+212 777 345 678', '+212 522 789 013', 'operations.morocco@fedex.com', 'sales.morocco@fedex.com', 'Regional Sales Manager'),

-- Bollore Logistics Libya
(13, '+218 21 234 567', '+218 91 456 789', '+218 92 890 123', '+218 21 234 568', 'tunis@bollore.com', 'libya.operations@bollore.com', 'Regional Director'),

-- Maersk Line Mediterranean
(14, '+39 010 567 890', '+39 333 123 456', '+39 347 789 012', '+39 010 567 891', 'med.operations@maersk.com', 'italy.sales@maersk.com', 'Mediterranean Hub Manager'),

-- CMA CGM Marseille
(15, '+33 4 91 234 567', '+33 6 12 34 56 78', '+33 6 98 76 54 32', '+33 4 91 234 568', 'tunisia@cma-cgm.com', 'marseille.ops@cma-cgm.com', 'Partnership Manager'),

-- Turkish Cargo
(16, '+90 212 456 789', '+90 555 123 4567', '+90 533 987 6543', '+90 212 456 790', 'partnerships@turkishcargo.com', 'mena.sales@turkishcargo.com', 'MENA Regional Manager');

-- ===============================
-- 4. INSERTION DES OBJECTIFS COMMERCIAUX
-- ===============================

-- Objectifs pour l'équipe commerciale (personnel avec role 'commercial')
INSERT INTO objectif_com (id_personnel, titre, description, objectif_ca, objectif_clients, date_debut, date_fin, statut, progression, created_at, updated_at) VALUES

-- Sami Karray (id 3)
(3, 'Objectif Q1 2024 - Clients Nationaux', 'Développement du portefeuille clients tunisiens avec focus sur le transport public et la logistique industrielle', 850000.00, 8, '2024-01-01', '2024-03-31', 'atteint', 105.50, NOW(), NOW()),
(3, 'Objectif Q2 2024 - Expansion Régionale', 'Extension vers les gouvernorats du Sud avec nouveaux partenariats transport touristique', 750000.00, 6, '2024-04-01', '2024-06-30', 'en_cours', 78.20, NOW(), NOW()),
(3, 'Objectif Q3 2024 - Clients Corporate', 'Acquisition de 5 nouveaux clients grande entreprise secteur industriel', 950000.00, 5, '2024-07-01', '2024-09-30', 'en_cours', 45.60, NOW(), NOW()),

-- Leila Bejaoui (id 4)
(4, 'Objectif Q1 2024 - Fret International', 'Développement activité fret international vers Maghreb et Europe', 1200000.00, 4, '2024-01-01', '2024-03-31', 'atteint', 112.30, NOW(), NOW()),
(4, 'Objectif Q2 2024 - Logistique Maritime', 'Partenariats stratégiques avec compagnies maritimes méditerranéennes', 1100000.00, 3, '2024-04-01', '2024-06-30', 'atteint', 98.75, NOW(), NOW()),
(4, 'Objectif Q3 2024 - Express International', 'Consolidation position sur marché express international', 1300000.00, 5, '2024-07-01', '2024-09-30', 'en_cours', 67.40, NOW(), NOW()),

-- Karim Ouali (id 5)
(5, 'Objectif Q1 2024 - PME Transport', 'Ciblage PME transport régional et développement offres adaptées', 600000.00, 12, '2024-01-01', '2024-03-31', 'atteint', 108.90, NOW(), NOW()),
(5, 'Objectif Q2 2024 - E-commerce Logistique', 'Développement solutions logistique pour e-commerce tunisien', 700000.00, 10, '2024-04-01', '2024-06-30', 'en_cours', 85.60, NOW(), NOW()),
(5, 'Objectif Q3 2024 - Transport Spécialisé', 'Acquisition clients transport spécialisé (pharmaceutique, alimentaire)', 800000.00, 6, '2024-07-01', '2024-09-30', 'en_cours', 52.30, NOW(), NOW()),

-- Fatma Mansouri (id 6)
(6, 'Objectif Q1 2024 - Clients Aériens', 'Développement portefeuille clients fret aérien et express', 900000.00, 4, '2024-01-01', '2024-03-31', 'non_atteint', 87.20, NOW(), NOW()),
(6, 'Objectif Q2 2024 - Partenariats Stratégiques', 'Négociation accords-cadres avec grands comptes transport', 1000000.00, 3, '2024-04-01', '2024-06-30', 'en_cours', 92.10, NOW(), NOW()),
(6, 'Objectif Q3 2024 - Diversification Services', 'Développement nouveaux services valeur ajoutée (stockage, packaging)', 750000.00, 8, '2024-07-01', '2024-09-30', 'en_cours', 38.70, NOW(), NOW()),

-- Objectifs additionnels pour tester différents statuts
(3, 'Objectif Annuel 2024 - Leadership Market', 'Positionner Velosi comme leader transport et logistique en Tunisie', 3000000.00, 25, '2024-01-01', '2024-12-31', 'en_cours', 65.80, NOW(), NOW()),
(4, 'Objectif Spécial - Ramadan 2024', 'Campagne spéciale transport et logistique période Ramadan', 400000.00, 15, '2024-03-10', '2024-04-10', 'atteint', 115.25, NOW(), NOW()),
(5, 'Objectif Innovation 2024', 'Lancement solutions digitales et tracking temps réel', 500000.00, 20, '2024-05-01', '2024-08-31', 'suspendu', 25.40, NOW(), NOW());

-- ===============================
-- VÉRIFICATION DES DONNÉES
-- ===============================

-- Afficher un résumé des données insérées
SELECT 'PERSONNEL' as table_name, COUNT(*) as nb_records FROM personnel
UNION ALL
SELECT 'CLIENT' as table_name, COUNT(*) as nb_records FROM client
UNION ALL
SELECT 'CONTACT_CLIENT' as table_name, COUNT(*) as nb_records FROM contact_client
UNION ALL
SELECT 'OBJECTIF_COM' as table_name, COUNT(*) as nb_records FROM objectif_com;

-- Afficher la répartition par rôle du personnel
SELECT role, COUNT(*) as nb_personnel, 
       STRING_AGG(nom || ' ' || prenom, ', ') as noms
FROM personnel 
GROUP BY role 
ORDER BY COUNT(*) DESC;

-- Afficher la répartition des clients par pays
SELECT pays, COUNT(*) as nb_clients,
       ROUND(AVG(solde), 2) as solde_moyen
FROM client 
GROUP BY pays 
ORDER BY COUNT(*) DESC;

-- Afficher les objectifs par commercial avec progression
SELECT p.nom || ' ' || p.prenom as commercial,
       COUNT(o.id) as nb_objectifs,
       ROUND(AVG(o.progression), 2) as progression_moyenne,
       SUM(o.objectif_ca) as ca_objectif_total
FROM personnel p
LEFT JOIN objectif_com o ON p.id = o.id_personnel
WHERE p.role = 'commercial'
GROUP BY p.id, p.nom, p.prenom
ORDER BY progression_moyenne DESC;