-- Insertion de lignes de démonstration pour la table correspondants
INSERT INTO correspondants (
  code, nature, libelle, logo, adresse, ville, code_postal, pays, telephone, telephone_secondaire, fax, email, site_web,
  etat_fiscal, tx_foids_volume, matricule_fiscal, type_mf, timbre, echeance, debit_initial, credit_initial, solde, devise,
  competence_maritime, competence_routier, competence_aerien, notes, statut
) VALUES
('COR000001', 'LOCAL', 'A PLUS TRADING LIMITED', NULL, '2/F YAU BUILDING 167 LOCK', 'WANCHAI', NULL, 'CHINE', '+852-25755599', NULL, '+852-28911996', 'info@aplus.trade', NULL,
 'Assujeti', 0.000, NULL, NULL, 'Oui', 0, 0.000, 0.000, 0.000, 'USD', true, false, false, 'Correspondant maritime basé à Hong Kong', 'actif'),
('COR000002', 'ETRANGER', 'TRANSLOGISTICS SARL', NULL, '12 Rue de la Logistique', 'Tunis', '1002', 'Tunisie', '+216-71-123456', '+216-71-654321', '+216-71-789012', 'contact@translogistics.tn', 'https://translogistics.tn',
 'Non assujeti', 0.000, 'MF123456', 'TypeA', 'Non', 30, 1000.000, 500.000, 500.000, 'TND', false, true, false, 'Spécialiste du transport routier', 'actif'),
('COR000003', 'LOCAL', 'AIR CARGO EXPRESS', NULL, 'Aéroport International', 'Casablanca', '20000', 'Maroc', '+212-522-123456', NULL, NULL, 'info@aircargo.ma', 'https://aircargo.ma',
 'Assujeti', 0.000, 'MF654321', 'TypeB', 'Oui', 15, 0.000, 0.000, 0.000, 'MAD', false, false, true, 'Transport aérien international', 'inactif');
