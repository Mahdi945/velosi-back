-- ============================================
-- Script de création de la table fournisseurs
-- ============================================

-- Supprimer la table si elle existe
DROP TABLE IF EXISTS fournisseurs CASCADE;

-- Créer la table fournisseurs
CREATE TABLE fournisseurs (
    -- Clé primaire
    id SERIAL PRIMARY KEY,
    
    -- Code fournisseur (auto-généré: FRN001, FRN002, etc.)
    code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Informations de base
    nom VARCHAR(100) NOT NULL,
    type_fournisseur VARCHAR(20) DEFAULT 'local' CHECK (type_fournisseur IN ('local', 'etranger')),
    categorie VARCHAR(20) DEFAULT 'personne_morale' CHECK (categorie IN ('personne_morale', 'personne_physique')),
    activite VARCHAR(250),
    
    -- Identification fiscale
    nature_identification VARCHAR(20) DEFAULT 'mf' CHECK (nature_identification IN ('mf', 'cin', 'passeport', 'carte_sejour', 'autre')),
    numero_identification VARCHAR(20), -- MF, CIN, Passeport, etc.
    code_fiscal VARCHAR(20),
    type_mf SMALLINT DEFAULT 0, -- Type de mouvement fournisseur
    
    -- Adresses
    adresse VARCHAR(300),
    adresse2 VARCHAR(100),
    adresse3 VARCHAR(300),
    ville VARCHAR(30),
    code_postal VARCHAR(10),
    pays VARCHAR(40) DEFAULT 'Tunisie',
    
    -- Contacts
    nom_contact VARCHAR(40),
    telephone VARCHAR(20),
    fax VARCHAR(20),
    email VARCHAR(50),
    
    -- Informations bancaires
    rib_iban VARCHAR(50),
    swift VARCHAR(50),
    adresse_banque VARCHAR(100),
    code_pays_payeur VARCHAR(8), -- Code du pays pour transferts
    
    -- Conditions commerciales
    modalite_paiement VARCHAR(30), -- Ex: "Comptant", "30 jours", "Chèque", etc.
    delai_paiement INTEGER DEFAULT 0, -- En jours
    timbre_fiscal BOOLEAN DEFAULT false,
    
    -- Types de fournisseur (flags)
    est_fournisseur_marchandise BOOLEAN DEFAULT true,
    a_charge_fixe BOOLEAN DEFAULT false,
    
    -- Comptabilité
    compte_comptable VARCHAR(20), -- Ex: 401001
    
    -- Logo
    logo VARCHAR(255),
    
    -- Notes
    notes TEXT,
    
    -- Statut
    is_active BOOLEAN DEFAULT true,
    
    -- Dates de création et modification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX idx_fournisseurs_code ON fournisseurs(code);
CREATE INDEX idx_fournisseurs_nom ON fournisseurs(nom);
CREATE INDEX idx_fournisseurs_ville ON fournisseurs(ville);
CREATE INDEX idx_fournisseurs_pays ON fournisseurs(pays);
CREATE INDEX idx_fournisseurs_is_active ON fournisseurs(is_active);
CREATE INDEX idx_fournisseurs_type_fournisseur ON fournisseurs(type_fournisseur);
CREATE INDEX idx_fournisseurs_categorie ON fournisseurs(categorie);
CREATE INDEX idx_fournisseurs_numero_identification ON fournisseurs(numero_identification);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_fournisseurs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fournisseurs_updated_at
    BEFORE UPDATE ON fournisseurs
    FOR EACH ROW
    EXECUTE FUNCTION update_fournisseurs_updated_at();

-- Données de test
INSERT INTO fournisseurs (
    code, nom, type_fournisseur, categorie, nature_identification, numero_identification,
    adresse, ville, code_postal, pays, telephone, email,
    rib_iban, modalite_paiement, est_fournisseur_marchandise, is_active
) VALUES
('FRN001', 'SOTUDIS Distribution', 'local', 'personne_morale', 'mf', '0123456A',
 'Zone Industrielle de Ben Arous', 'Ben Arous', '2013', 'Tunisie', '+216 71 123 456', 'contact@sotudis.tn',
 'TN59 1234 5678 9012 3456 7890', 'Chèque 30 jours', true, true),

('FRN002', 'Global Parts Trading', 'etranger', 'personne_morale', 'autre', 'FR123456789',
 '15 Rue de la République', 'Marseille', '13001', 'France', '+33 4 91 12 34 56', 'info@globalparts.fr',
 'FR76 1234 5678 9012 3456 7890 123', 'Virement 60 jours', true, true),

('FRN003', 'Mohamed Ben Ali', 'local', 'personne_physique', 'cin', '12345678',
 'Avenue Habib Bourguiba', 'Tunis', '1000', 'Tunisie', '+216 98 765 432', 'mbali@email.tn',
 'TN59 8765 4321 0987 6543 2109', 'Comptant', false, true),

('FRN004', 'Tech Solutions SARL', 'local', 'personne_morale', 'mf', '9876543B',
 'Rue du Lac Victoria', 'Tunis', '1053', 'Tunisie', '+216 71 999 888', 'contact@techsol.tn',
 'TN59 1111 2222 3333 4444 5555', 'Virement 30 jours', false, true),

('FRN005', 'Import Export International', 'etranger', 'personne_morale', 'passeport', 'IT9876543',
 'Via Roma 123', 'Milan', '20100', 'Italie', '+39 02 1234 5678', 'sales@impexp-intl.it',
 'IT60 X054 2811 1010 0000 0123 456', 'Virement 45 jours', true, true);

-- Afficher le résultat
SELECT 
    code,
    nom,
    type_fournisseur,
    ville,
    pays,
    telephone,
    is_active
FROM fournisseurs
ORDER BY id DESC;

COMMENT ON TABLE fournisseurs IS 'Table des fournisseurs de l''ERP';
COMMENT ON COLUMN fournisseurs.code IS 'Code unique auto-généré (FRN001, FRN002, etc.)';
COMMENT ON COLUMN fournisseurs.type_fournisseur IS 'Type: local ou etranger';
COMMENT ON COLUMN fournisseurs.categorie IS 'Catégorie: personne_morale ou personne_physique';
COMMENT ON COLUMN fournisseurs.nature_identification IS 'Type d''identification: mf, cin, passeport, carte_sejour, autre';
COMMENT ON COLUMN fournisseurs.numero_identification IS 'Numéro MF, CIN, Passeport, etc.';
COMMENT ON COLUMN fournisseurs.type_mf IS 'Type de mouvement fournisseur';
COMMENT ON COLUMN fournisseurs.timbre_fiscal IS 'Application du timbre fiscal (true/false)';
COMMENT ON COLUMN fournisseurs.modalite_paiement IS 'Modalité de paiement (Chèque, Virement, Comptant, etc.)';
COMMENT ON COLUMN fournisseurs.code_pays_payeur IS 'Code pays pour transferts bancaires';
COMMENT ON COLUMN fournisseurs.compte_comptable IS 'Référence dans le plan comptable (ex: 401xxx)';
