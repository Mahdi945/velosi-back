-- ============================================
-- SCRIPT DE CRÉATION TABLE NAVIRES ET INSERTION DE DONNÉES
-- ============================================

-- ============================================
-- 1. RÉVISION DE LA TABLE CRM_ARMATEURS
-- ============================================

-- Vérifier si la table existe déjà
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_armateurs') THEN
        CREATE TABLE crm_armateurs (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            nom VARCHAR(255) NOT NULL,
            abreviation VARCHAR(50),
            adresse TEXT,
            ville VARCHAR(100),
            code_postal VARCHAR(20),
            pays VARCHAR(100),
            telephone VARCHAR(50),
            telephone_secondaire VARCHAR(50),
            fax VARCHAR(50),
            email VARCHAR(255),
            site_web VARCHAR(255),
            logo_url TEXT,
            tarif_20_pieds DECIMAL(10,2),
            tarif_40_pieds DECIMAL(10,2),
            tarif_45_pieds DECIMAL(10,2),
            notes TEXT,
            statut VARCHAR(20) DEFAULT 'actif',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER
        );
        
        -- Index pour optimiser les recherches
        CREATE INDEX idx_armateurs_code ON crm_armateurs(code);
        CREATE INDEX idx_armateurs_nom ON crm_armateurs(nom);
        CREATE INDEX idx_armateurs_statut ON crm_armateurs(statut);
        
        RAISE NOTICE 'Table crm_armateurs créée avec succès';
    ELSE
        RAISE NOTICE 'Table crm_armateurs existe déjà';
    END IF;
END $$;

-- ============================================
-- 2. CRÉATION DE LA TABLE CRM_NAVIRES
-- ============================================

DROP TABLE IF EXISTS crm_navires;

CREATE TABLE crm_navires (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    nationalite VARCHAR(100),
    conducteur VARCHAR(255),
    longueur DECIMAL(10,2),
    largeur DECIMAL(10,2),
    tirant_air DECIMAL(10,2),
    tirant_eau DECIMAL(10,2),
    jauge_brute INTEGER,
    jauge_net INTEGER,
    code_omi VARCHAR(50),
    pav VARCHAR(100),
    armateur_id INTEGER,
    statut VARCHAR(20) DEFAULT 'actif',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    CONSTRAINT fk_navire_armateur FOREIGN KEY (armateur_id) REFERENCES crm_armateurs(id) ON DELETE SET NULL
);

-- Index pour optimiser les recherches
CREATE INDEX idx_navires_code ON crm_navires(code);
CREATE INDEX idx_navires_libelle ON crm_navires(libelle);
CREATE INDEX idx_navires_armateur ON crm_navires(armateur_id);
CREATE INDEX idx_navires_statut ON crm_navires(statut);
CREATE INDEX idx_navires_nationalite ON crm_navires(nationalite);

COMMENT ON TABLE crm_navires IS 'Table des navires avec relation vers les armateurs';
COMMENT ON COLUMN crm_navires.code IS 'Code unique du navire (auto-généré)';
COMMENT ON COLUMN crm_navires.libelle IS 'Nom du navire';
COMMENT ON COLUMN crm_navires.nationalite IS 'Nationalité du navire';
COMMENT ON COLUMN crm_navires.conducteur IS 'Nom du conducteur/capitaine';
COMMENT ON COLUMN crm_navires.longueur IS 'Longueur en mètres';
COMMENT ON COLUMN crm_navires.largeur IS 'Largeur en mètres';
COMMENT ON COLUMN crm_navires.tirant_air IS 'Tirant d''air en mètres';
COMMENT ON COLUMN crm_navires.tirant_eau IS 'Tirant d''eau en mètres';
COMMENT ON COLUMN crm_navires.jauge_brute IS 'Jauge brute (tonnage brut)';
COMMENT ON COLUMN crm_navires.jauge_net IS 'Jauge nette (tonnage net)';
COMMENT ON COLUMN crm_navires.code_omi IS 'Code OMI du navire';
COMMENT ON COLUMN crm_navires.pav IS 'Pavillon du navire';
COMMENT ON COLUMN crm_navires.armateur_id IS 'ID de l''armateur propriétaire';

-- ============================================
-- 3. INSERTION DE 30 ARMATEURS
-- ============================================

INSERT INTO crm_armateurs (code, nom, abreviation, adresse, ville, code_postal, pays, telephone, email, site_web, tarif_20_pieds, tarif_40_pieds, tarif_45_pieds, statut) VALUES
('ARM001', 'Mediterranean Shipping Company', 'MSC', '12-14 Chemin Rieu', 'Genève', '1208', 'Suisse', '+41 22 703 8888', 'contact@msc.com', 'https://www.msc.com', 3500.00, 6500.00, 7200.00, 'actif'),
('ARM002', 'Maersk Line', 'MAERSK', 'Esplanaden 50', 'Copenhague', '1098', 'Danemark', '+45 33 63 33 63', 'info@maersk.com', 'https://www.maersk.com', 3800.00, 7000.00, 7800.00, 'actif'),
('ARM003', 'CMA CGM Group', 'CMA CGM', '4 quai d''Arenc', 'Marseille', '13002', 'France', '+33 4 88 91 90 00', 'contact@cma-cgm.com', 'https://www.cma-cgm.com', 3600.00, 6800.00, 7500.00, 'actif'),
('ARM004', 'COSCO Shipping Lines', 'COSCO', 'Ocean Plaza', 'Shanghai', '200120', 'Chine', '+86 21 6508 8888', 'service@coscon.com', 'https://www.coscon.com', 3400.00, 6300.00, 7000.00, 'actif'),
('ARM005', 'Hapag-Lloyd', 'HAPAG', 'Ballindamm 25', 'Hambourg', '20095', 'Allemagne', '+49 40 3001 0', 'info@hlag.com', 'https://www.hapag-lloyd.com', 3700.00, 6900.00, 7600.00, 'actif'),
('ARM006', 'Ocean Network Express', 'ONE', '1-1-1 Shibaura', 'Tokyo', '105-0023', 'Japon', '+81 3 6889 7000', 'contact@one-line.com', 'https://www.one-line.com', 3550.00, 6600.00, 7300.00, 'actif'),
('ARM007', 'Evergreen Marine', 'EVERGREEN', 'No.166 Minsheng E. Rd', 'Taipei', '10446', 'Taiwan', '+886 2 2505 7766', 'service@evergreen-marine.com', 'https://www.evergreen-marine.com', 3450.00, 6400.00, 7100.00, 'actif'),
('ARM008', 'Yang Ming Marine Transport', 'YANG MING', 'No.271 Ming Chuan Rd', 'Keelung', '20603', 'Taiwan', '+886 2 2455 9988', 'ymtw@yangming.com', 'https://www.yangming.com', 3350.00, 6200.00, 6900.00, 'actif'),
('ARM009', 'Hyundai Merchant Marine', 'HMM', '112 Heungan-daero', 'Seoul', '03072', 'Corée du Sud', '+82 2 3764 1114', 'webmaster@hmm21.com', 'https://www.hmm21.com', 3650.00, 6750.00, 7450.00, 'actif'),
('ARM010', 'ZIM Integrated Shipping', 'ZIM', '9 Andrei Sakharov St', 'Haifa', '3190500', 'Israël', '+972 4 865 2000', 'zim@zim.com', 'https://www.zim.com', 3500.00, 6500.00, 7200.00, 'actif'),
('ARM011', 'Pacific International Lines', 'PIL', '138 Market Street', 'Singapore', '048946', 'Singapour', '+65 6278 5288', 'pil@pilship.com', 'https://www.pilship.com', 3300.00, 6100.00, 6800.00, 'actif'),
('ARM012', 'Wan Hai Lines', 'WAN HAI', 'No.136-2 Chung Yang Rd', 'Taipei', '11167', 'Taiwan', '+886 2 2515 9988', 'service@wanhai.com', 'https://www.wanhai.com', 3250.00, 6000.00, 6700.00, 'actif'),
('ARM013', 'Compagnie Générale Maritime', 'CGM', '5 Avenue de l''Opéra', 'Paris', '75001', 'France', '+33 1 44 94 20 00', 'info@cgm.fr', 'https://www.cgm.fr', 3600.00, 6700.00, 7400.00, 'actif'),
('ARM014', 'Tunisian Maritime Transport Company', 'CTN', 'Port de La Goulette', 'Tunis', '2060', 'Tunisie', '+216 71 735 022', 'contact@ctn.com.tn', 'https://www.ctn.com.tn', 3000.00, 5500.00, 6200.00, 'actif'),
('ARM015', 'Algérie Ferries', 'ALGERIE FERRIES', 'Route Nationale N°11', 'Alger', '16000', 'Algérie', '+213 21 98 58 00', 'info@algerieferries.dz', 'https://www.algerieferries.dz', 3200.00, 5900.00, 6600.00, 'actif'),
('ARM016', 'Grimaldi Lines', 'GRIMALDI', 'Via Marchese Campodisola 13', 'Naples', '80133', 'Italie', '+39 081 496 111', 'info@grimaldi.it', 'https://www.grimaldi-lines.com', 3400.00, 6300.00, 7000.00, 'actif'),
('ARM017', 'Stena Line', 'STENA', 'Fisherman''s Bend', 'Göteborg', '40519', 'Suède', '+46 31 704 00 00', 'info@stenaline.com', 'https://www.stenaline.com', 3550.00, 6550.00, 7250.00, 'actif'),
('ARM018', 'DFDS Seaways', 'DFDS', 'Sundkrogsgade 11', 'Copenhague', '2100', 'Danemark', '+45 33 42 33 00', 'info@dfds.com', 'https://www.dfds.com', 3450.00, 6450.00, 7150.00, 'actif'),
('ARM019', 'Brittany Ferries', 'BRITTANY', 'Port de Plymouth', 'Roscoff', '29680', 'France', '+33 2 98 29 28 00', 'contact@brittanyferries.com', 'https://www.brittanyferries.fr', 3350.00, 6250.00, 6950.00, 'actif'),
('ARM020', 'Corsica Ferries', 'CORSICA', 'Port de Commerce', 'Bastia', '20200', 'France', '+33 4 95 32 95 95', 'info@corsicaferries.com', 'https://www.corsicaferries.com', 3250.00, 6050.00, 6750.00, 'actif'),
('ARM021', 'Grandi Navi Veloci', 'GNV', 'Via Fieschi 17', 'Gênes', '16121', 'Italie', '+39 010 209 4591', 'info@gnv.it', 'https://www.gnv.it', 3400.00, 6350.00, 7050.00, 'actif'),
('ARM022', 'Moby Lines', 'MOBY', 'Via Molo Mediceo', 'Livourne', '57123', 'Italie', '+39 0586 409 800', 'info@moby.it', 'https://www.moby.it', 3300.00, 6150.00, 6850.00, 'actif'),
('ARM023', 'Tirrenia', 'TIRRENIA', 'Via dell''Aeroporto', 'Naples', '80144', 'Italie', '+39 081 317 2999', 'info@tirrenia.it', 'https://www.tirrenia.it', 3350.00, 6200.00, 6900.00, 'actif'),
('ARM024', 'Trasmediterranea', 'TRASMED', 'Calle Pedro Muñoz Seca 2', 'Madrid', '28001', 'Espagne', '+34 902 45 46 45', 'info@trasmediterranea.es', 'https://www.trasmediterranea.es', 3250.00, 6100.00, 6800.00, 'actif'),
('ARM025', 'Baleària', 'BALEARIA', 'Muelle de Poniente', 'Dénia', '03700', 'Espagne', '+34 96 642 87 00', 'info@balearia.com', 'https://www.balearia.com', 3200.00, 5950.00, 6650.00, 'actif'),
('ARM026', 'Armas', 'ARMAS', 'Muelle Ribera Este', 'Las Palmas', '35008', 'Espagne', '+34 928 30 05 00', 'info@navieraarmas.com', 'https://www.navieraarmas.com', 3150.00, 5850.00, 6550.00, 'actif'),
('ARM027', 'Fred Olsen Express', 'FRED OLSEN', 'Estación Marítima', 'Santa Cruz de Tenerife', '38001', 'Espagne', '+34 902 10 01 07', 'info@fredolsen.es', 'https://www.fredolsen.es', 3300.00, 6050.00, 6750.00, 'actif'),
('ARM028', 'Minoan Lines', 'MINOAN', 'Akti Miaouli', 'Le Pirée', '18538', 'Grèce', '+30 210 414 5700', 'info@minoan.gr', 'https://www.minoan.gr', 3400.00, 6250.00, 6950.00, 'actif'),
('ARM029', 'Anek Lines', 'ANEK', '54 Akti Kondyli', 'Le Pirée', '18545', 'Grèce', '+30 210 419 7400', 'anek@anek.gr', 'https://www.anek.gr', 3350.00, 6150.00, 6850.00, 'actif'),
('ARM030', 'Blue Star Ferries', 'BLUE STAR', '123-125 Syngrou Avenue', 'Athènes', '11745', 'Grèce', '+30 210 891 9800', 'info@bluestarferries.com', 'https://www.bluestarferries.com', 3300.00, 6100.00, 6800.00, 'actif');

-- ============================================
-- 4. INSERTION DE 30 NAVIRES
-- ============================================

INSERT INTO crm_navires (code, libelle, nationalite, conducteur, longueur, largeur, tirant_air, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut) VALUES
('NAV001', 'MSC Gülsün', 'Suisse', 'Captain Marco Rossi', 399.90, 61.50, 73.00, 16.50, 232618, 139000, 'IMO 9839731', 'Panama', 1, 'actif'),
('NAV002', 'MSC Mina', 'Suisse', 'Captain Ahmed Ben Ali', 399.90, 61.50, 73.00, 16.50, 232618, 139000, 'IMO 9839743', 'Liberia', 1, 'actif'),
('NAV003', 'Madrid Maersk', 'Danemark', 'Captain Lars Nielsen', 399.00, 58.60, 69.80, 16.00, 214286, 128000, 'IMO 9778249', 'Danemark', 2, 'actif'),
('NAV004', 'Maersk Essex', 'Danemark', 'Captain Søren Hansen', 367.00, 56.40, 68.50, 15.50, 204372, 122000, 'IMO 9801715', 'Danemark', 2, 'actif'),
('NAV005', 'CMA CGM Antoine De Saint Exupery', 'France', 'Captain Jean Dupont', 400.00, 59.00, 72.00, 16.50, 236000, 141000, 'IMO 9454435', 'France', 3, 'actif'),
('NAV006', 'CMA CGM Kerguelen', 'France', 'Captain Pierre Martin', 365.00, 51.00, 65.00, 15.00, 175000, 105000, 'IMO 9708070', 'Malte', 3, 'actif'),
('NAV007', 'COSCO Shipping Universe', 'Chine', 'Captain Wang Wei', 400.00, 58.60, 72.50, 16.00, 215000, 128500, 'IMO 9795294', 'Hong Kong', 4, 'actif'),
('NAV008', 'COSCO Shipping Galaxy', 'Chine', 'Captain Li Ming', 400.00, 58.60, 72.50, 16.00, 215000, 128500, 'IMO 9795309', 'Hong Kong', 4, 'actif'),
('NAV009', 'Sajir', 'Allemagne', 'Captain Hans Schmidt', 399.95, 58.80, 71.80, 16.50, 228283, 136500, 'IMO 9814328', 'Allemagne', 5, 'actif'),
('NAV010', 'Tsingtao Express', 'Allemagne', 'Captain Klaus Müller', 366.00, 51.20, 67.00, 15.50, 142027, 85000, 'IMO 9744217', 'Liberia', 5, 'actif'),
('NAV011', 'ONE Innovation', 'Japon', 'Captain Takashi Yamamoto', 400.00, 58.80, 72.00, 16.20, 220940, 132000, 'IMO 9838600', 'Panama', 6, 'actif'),
('NAV012', 'ONE Infinity', 'Japon', 'Captain Hiroshi Tanaka', 400.00, 58.80, 72.00, 16.20, 220940, 132000, 'IMO 9838612', 'Panama', 6, 'actif'),
('NAV013', 'Ever Ace', 'Taiwan', 'Captain Chen Wei', 399.90, 61.50, 73.00, 16.00, 235579, 141000, 'IMO 9863514', 'Panama', 7, 'actif'),
('NAV014', 'Ever Forward', 'Taiwan', 'Captain Lin Cheng', 368.00, 51.00, 66.00, 15.00, 116000, 69500, 'IMO 9698983', 'Marshall Islands', 7, 'actif'),
('NAV015', 'YM Worth', 'Taiwan', 'Captain Wu Jian', 400.00, 59.00, 72.00, 16.00, 214296, 128000, 'IMO 9863502', 'Taiwan', 8, 'actif'),
('NAV016', 'YM Wellness', 'Taiwan', 'Captain Chang Ming', 368.00, 51.00, 66.00, 15.00, 142027, 85000, 'IMO 9732076', 'Taiwan', 8, 'actif'),
('NAV017', 'HMM Algeciras', 'Corée du Sud', 'Captain Park Jin', 399.90, 61.00, 72.80, 16.50, 228283, 136500, 'IMO 9863514', 'Panama', 9, 'actif'),
('NAV018', 'HMM Oslo', 'Corée du Sud', 'Captain Kim Sung', 399.90, 61.00, 72.80, 16.50, 228283, 136500, 'IMO 9863526', 'Panama', 9, 'actif'),
('NAV019', 'ZIM Sammy Ofer', 'Israël', 'Captain David Cohen', 369.00, 51.00, 66.50, 15.20, 151000, 90500, 'IMO 9708733', 'Liberia', 10, 'actif'),
('NAV020', 'ZIM Mount Everest', 'Israël', 'Captain Moshe Levi', 336.00, 48.20, 63.00, 14.50, 117000, 70000, 'IMO 9333632', 'Israel', 10, 'actif'),
('NAV021', 'Kota Megah', 'Singapour', 'Captain Tan Wei', 335.00, 45.60, 62.00, 14.00, 114000, 68000, 'IMO 9778316', 'Singapore', 11, 'actif'),
('NAV022', 'Kota Pemimpin', 'Singapour', 'Captain Lee Kuan', 300.00, 42.80, 58.00, 13.50, 93750, 56000, 'IMO 9508436', 'Singapore', 11, 'actif'),
('NAV023', 'Wan Hai 626', 'Taiwan', 'Captain Liu Hong', 335.00, 45.60, 62.00, 14.00, 114000, 68000, 'IMO 9839755', 'Taiwan', 12, 'actif'),
('NAV024', 'Wan Hai 625', 'Taiwan', 'Captain Zhou Ming', 335.00, 45.60, 62.00, 14.00, 114000, 68000, 'IMO 9839743', 'Taiwan', 12, 'actif'),
('NAV025', 'Carthage', 'Tunisie', 'Captain Mohamed Trabelsi', 170.00, 27.00, 42.00, 6.80, 25000, 15000, 'IMO 9301212', 'Tunisie', 14, 'actif'),
('NAV026', 'Tanit', 'Tunisie', 'Captain Habib Mansouri', 170.00, 27.00, 42.00, 6.80, 25000, 15000, 'IMO 9301224', 'Tunisie', 14, 'actif'),
('NAV027', 'El Djazair II', 'Algérie', 'Captain Karim Benali', 185.00, 28.60, 45.00, 7.20, 32000, 19200, 'IMO 9494542', 'Algérie', 15, 'actif'),
('NAV028', 'Tassili II', 'Algérie', 'Captain Rachid Bouazza', 185.00, 28.60, 45.00, 7.20, 32000, 19200, 'IMO 9494554', 'Algérie', 15, 'actif'),
('NAV029', 'Cruise Roma', 'Italie', 'Captain Giuseppe Bianchi', 225.00, 30.80, 52.00, 8.50, 65000, 39000, 'IMO 9595321', 'Italie', 16, 'actif'),
('NAV030', 'Cruise Barcelona', 'Italie', 'Captain Antonio Ferrari', 225.00, 30.80, 52.00, 8.50, 65000, 39000, 'IMO 9595333', 'Italie', 16, 'actif');

-- ============================================
-- 5. VÉRIFICATIONS
-- ============================================

-- Compter les armateurs
SELECT COUNT(*) as total_armateurs FROM crm_armateurs;

-- Compter les navires
SELECT COUNT(*) as total_navires FROM crm_navires;

-- Afficher les navires avec leurs armateurs
SELECT 
    n.code,
    n.libelle,
    n.nationalite,
    a.nom as armateur,
    n.statut
FROM crm_navires n
LEFT JOIN crm_armateurs a ON n.armateur_id = a.id
ORDER BY n.id;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
