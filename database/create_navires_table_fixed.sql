-- ============================================
-- SCRIPT DE CRÉATION TABLE NAVIRES ET INSERTION DE DONNÉES
-- ============================================

-- ============================================
-- 1. CRÉATION DE LA TABLE CRM_NAVIRES
-- ============================================

DROP TABLE IF EXISTS crm_navires CASCADE;

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
    CONSTRAINT fk_navire_armateur FOREIGN KEY (armateur_id) REFERENCES armateurs(id) ON DELETE SET NULL
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
-- 2. INSERTION DE 30 NAVIRES
-- ============================================

-- Vérifier que des armateurs existent
DO $$ 
BEGIN
    IF (SELECT COUNT(*) FROM armateurs) < 10 THEN
        RAISE EXCEPTION 'Il faut au moins 10 armateurs dans la table armateurs avant d''insérer des navires';
    END IF;
END $$;

-- Insertion des navires liés aux armateurs existants
INSERT INTO crm_navires (code, libelle, nationalite, conducteur, longueur, largeur, tirant_air, tirant_eau, jauge_brute, jauge_net, code_omi, pav, armateur_id, statut) VALUES
('NAV001', 'MSC Gülsün', 'Suisse', 'Captain Marco Rossi', 399.90, 61.50, 73.00, 16.50, 232618, 139000, 'IMO 9839731', 'Panama', (SELECT id FROM armateurs WHERE code = 'ARM001' LIMIT 1), 'actif'),
('NAV002', 'MSC Mina', 'Suisse', 'Captain Ahmed Ben Ali', 399.90, 61.50, 73.00, 16.50, 232618, 139000, 'IMO 9839743', 'Liberia', (SELECT id FROM armateurs WHERE code = 'ARM001' LIMIT 1), 'actif'),
('NAV003', 'Madrid Maersk', 'Danemark', 'Captain Lars Nielsen', 399.00, 58.60, 69.80, 16.00, 214286, 128000, 'IMO 9778249', 'Danemark', (SELECT id FROM armateurs WHERE code = 'ARM002' LIMIT 1), 'actif'),
('NAV004', 'Maersk Essex', 'Danemark', 'Captain Søren Hansen', 367.00, 56.40, 68.50, 15.50, 204372, 122000, 'IMO 9801715', 'Danemark', (SELECT id FROM armateurs WHERE code = 'ARM002' LIMIT 1), 'actif'),
('NAV005', 'CMA CGM Antoine De Saint Exupery', 'France', 'Captain Jean Dupont', 400.00, 59.00, 72.00, 16.50, 236000, 141000, 'IMO 9454435', 'France', (SELECT id FROM armateurs WHERE code = 'ARM003' LIMIT 1), 'actif'),
('NAV006', 'CMA CGM Kerguelen', 'France', 'Captain Pierre Martin', 365.00, 51.00, 65.00, 15.00, 175000, 105000, 'IMO 9708070', 'Malte', (SELECT id FROM armateurs WHERE code = 'ARM003' LIMIT 1), 'actif'),
('NAV007', 'COSCO Shipping Universe', 'Chine', 'Captain Wang Wei', 400.00, 58.60, 72.50, 16.00, 215000, 128500, 'IMO 9795294', 'Hong Kong', (SELECT id FROM armateurs WHERE code = 'ARM004' LIMIT 1), 'actif'),
('NAV008', 'COSCO Shipping Galaxy', 'Chine', 'Captain Li Ming', 400.00, 58.60, 72.50, 16.00, 215000, 128500, 'IMO 9795309', 'Hong Kong', (SELECT id FROM armateurs WHERE code = 'ARM004' LIMIT 1), 'actif'),
('NAV009', 'Sajir', 'Allemagne', 'Captain Hans Schmidt', 399.95, 58.80, 71.80, 16.50, 228283, 136500, 'IMO 9814328', 'Allemagne', (SELECT id FROM armateurs WHERE code = 'ARM005' LIMIT 1), 'actif'),
('NAV010', 'Tsingtao Express', 'Allemagne', 'Captain Klaus Müller', 366.00, 51.20, 67.00, 15.50, 142027, 85000, 'IMO 9744217', 'Liberia', (SELECT id FROM armateurs WHERE code = 'ARM005' LIMIT 1), 'actif'),
('NAV011', 'ONE Innovation', 'Japon', 'Captain Takashi Yamamoto', 400.00, 58.80, 72.00, 16.20, 220940, 132000, 'IMO 9838600', 'Panama', (SELECT id FROM armateurs WHERE code = 'ARM006' LIMIT 1), 'actif'),
('NAV012', 'ONE Infinity', 'Japon', 'Captain Hiroshi Tanaka', 400.00, 58.80, 72.00, 16.20, 220940, 132000, 'IMO 9838612', 'Panama', (SELECT id FROM armateurs WHERE code = 'ARM006' LIMIT 1), 'actif'),
('NAV013', 'Ever Ace', 'Taiwan', 'Captain Chen Wei', 399.90, 61.50, 73.00, 16.00, 235579, 141000, 'IMO 9863514', 'Panama', (SELECT id FROM armateurs WHERE code = 'ARM007' LIMIT 1), 'actif'),
('NAV014', 'Ever Forward', 'Taiwan', 'Captain Lin Cheng', 368.00, 51.00, 66.00, 15.00, 116000, 69500, 'IMO 9698983', 'Marshall Islands', (SELECT id FROM armateurs WHERE code = 'ARM007' LIMIT 1), 'actif'),
('NAV015', 'YM Worth', 'Taiwan', 'Captain Wu Jian', 400.00, 59.00, 72.00, 16.00, 214296, 128000, 'IMO 9863502', 'Taiwan', (SELECT id FROM armateurs WHERE code = 'ARM008' LIMIT 1), 'actif'),
('NAV016', 'YM Wellness', 'Taiwan', 'Captain Chang Ming', 368.00, 51.00, 66.00, 15.00, 142027, 85000, 'IMO 9732076', 'Taiwan', (SELECT id FROM armateurs WHERE code = 'ARM008' LIMIT 1), 'actif'),
('NAV017', 'HMM Algeciras', 'Corée du Sud', 'Captain Park Jin', 399.90, 61.00, 72.80, 16.50, 228283, 136500, 'IMO 9863514', 'Panama', (SELECT id FROM armateurs WHERE code = 'ARM009' LIMIT 1), 'actif'),
('NAV018', 'HMM Oslo', 'Corée du Sud', 'Captain Kim Sung', 399.90, 61.00, 72.80, 16.50, 228283, 136500, 'IMO 9863526', 'Panama', (SELECT id FROM armateurs WHERE code = 'ARM009' LIMIT 1), 'actif'),
('NAV019', 'ZIM Sammy Ofer', 'Israël', 'Captain David Cohen', 369.00, 51.00, 66.50, 15.20, 151000, 90500, 'IMO 9708733', 'Liberia', (SELECT id FROM armateurs WHERE code = 'ARM010' LIMIT 1), 'actif'),
('NAV020', 'ZIM Mount Everest', 'Israël', 'Captain Moshe Levi', 336.00, 48.20, 63.00, 14.50, 117000, 70000, 'IMO 9333632', 'Israel', (SELECT id FROM armateurs WHERE code = 'ARM010' LIMIT 1), 'actif'),
('NAV021', 'Kota Megah', 'Singapour', 'Captain Tan Wei', 335.00, 45.60, 62.00, 14.00, 114000, 68000, 'IMO 9778316', 'Singapore', (SELECT id FROM armateurs LIMIT 1 OFFSET 10), 'actif'),
('NAV022', 'Kota Pemimpin', 'Singapour', 'Captain Lee Kuan', 300.00, 42.80, 58.00, 13.50, 93750, 56000, 'IMO 9508436', 'Singapore', (SELECT id FROM armateurs LIMIT 1 OFFSET 10), 'actif'),
('NAV023', 'Wan Hai 626', 'Taiwan', 'Captain Liu Hong', 335.00, 45.60, 62.00, 14.00, 114000, 68000, 'IMO 9839755', 'Taiwan', (SELECT id FROM armateurs LIMIT 1 OFFSET 11), 'actif'),
('NAV024', 'Wan Hai 625', 'Taiwan', 'Captain Zhou Ming', 335.00, 45.60, 62.00, 14.00, 114000, 68000, 'IMO 9839743', 'Taiwan', (SELECT id FROM armateurs LIMIT 1 OFFSET 11), 'actif'),
('NAV025', 'Carthage', 'Tunisie', 'Captain Mohamed Trabelsi', 170.00, 27.00, 42.00, 6.80, 25000, 15000, 'IMO 9301212', 'Tunisie', (SELECT id FROM armateurs LIMIT 1 OFFSET 0), 'actif'),
('NAV026', 'Tanit', 'Tunisie', 'Captain Habib Mansouri', 170.00, 27.00, 42.00, 6.80, 25000, 15000, 'IMO 9301224', 'Tunisie', (SELECT id FROM armateurs LIMIT 1 OFFSET 0), 'actif'),
('NAV027', 'El Djazair II', 'Algérie', 'Captain Karim Benali', 185.00, 28.60, 45.00, 7.20, 32000, 19200, 'IMO 9494542', 'Algérie', (SELECT id FROM armateurs LIMIT 1 OFFSET 1), 'actif'),
('NAV028', 'Tassili II', 'Algérie', 'Captain Rachid Bouazza', 185.00, 28.60, 45.00, 7.20, 32000, 19200, 'IMO 9494554', 'Algérie', (SELECT id FROM armateurs LIMIT 1 OFFSET 1), 'actif'),
('NAV029', 'Cruise Roma', 'Italie', 'Captain Giuseppe Bianchi', 225.00, 30.80, 52.00, 8.50, 65000, 39000, 'IMO 9595321', 'Italie', (SELECT id FROM armateurs LIMIT 1 OFFSET 2), 'actif'),
('NAV030', 'Cruise Barcelona', 'Italie', 'Captain Antonio Ferrari', 225.00, 30.80, 52.00, 8.50, 65000, 39000, 'IMO 9595333', 'Italie', (SELECT id FROM armateurs LIMIT 1 OFFSET 2), 'actif');

-- ============================================
-- 3. VÉRIFICATIONS
-- ============================================

-- Compter les armateurs
SELECT COUNT(*) as total_armateurs FROM armateurs;

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
LEFT JOIN armateurs a ON n.armateur_id = a.id
ORDER BY n.id;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
