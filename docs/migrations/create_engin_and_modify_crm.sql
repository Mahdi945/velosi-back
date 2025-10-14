-- ========================================
-- SCRIPT SQL - CRÉATION TABLE ENGIN ET MODIFICATION TABLES CRM
-- Ajout table engin + champ traffic + modification types transport
-- Compatible avec le schéma CRM existant
-- ========================================


-- ========================================
-- 1. CRÉATION TABLE ENGIN
-- ========================================
CREATE TABLE IF NOT EXISTS engin (
    id SERIAL PRIMARY KEY,
    
    -- Libellé (d'après l'image)
    libelle VARCHAR(200) NOT NULL,
    
    -- Conteneur/Remorque (d'après l'image)
    conteneur_remorque VARCHAR(100),
    
    -- Poids Vide (d'après l'image)
    poids_vide DECIMAL(10,2), -- en kg
    
    -- Champ supplémentaire Pied (non présent dans l'image mais demandé)
    pied VARCHAR(50), -- Taille en pieds (20', 40', 45', etc.)
    
    -- Métadonnées
    description TEXT,
    is_active BOOLEAN DEFAULT true
   

);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_engin_libelle ON engin(libelle);
CREATE INDEX IF NOT EXISTS idx_engin_is_active ON engin(is_active);




-- Commentaire
COMMENT ON TABLE engin IS 'Table des engins/véhicules de transport avec spécifications techniques';

-- ========================================
-- 2. MODIFICATION DES TYPES DE TRANSPORT
-- ========================================
-- Modifier l'enum transport_type existant
DO $$
BEGIN
    -- Vérifier si l'enum existe et le modifier si nécessaire
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transporttype') THEN
        -- Supprimer l'ancien enum et créer le nouveau avec les nouvelles valeurs
        ALTER TYPE transporttype RENAME TO transporttype_old;
        
        CREATE TYPE transporttype AS ENUM (
            'complet',
            'groupage', 
            'aerien',
            'projet'
        );
        
        -- Mettre à jour les colonnes qui utilisent cet enum
        ALTER TABLE crm_opportunities 
        ALTER COLUMN transport_type TYPE transporttype USING 
        CASE 
            WHEN transport_type::text = 'national' THEN 'complet'::transporttype
            WHEN transport_type::text = 'international' THEN 'aerien'::transporttype
            WHEN transport_type::text = 'express' THEN 'aerien'::transporttype
            WHEN transport_type::text = 'freight' THEN 'groupage'::transporttype
            ELSE 'complet'::transporttype
        END;
        
        -- Supprimer l'ancien enum
        DROP TYPE transporttype_old;
    ELSE 
        -- Créer l'enum s'il n'existe pas
        CREATE TYPE transporttype AS ENUM (
            'complet',
            'groupage', 
            'aerien',
            'projet'
        );
    END IF;
END
$$;

-- ========================================
-- 3. AJOUT CHAMP TRAFFIC AUX TABLES CRM
-- ========================================

-- Créer l'enum pour le traffic si pas existant
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'traffictype') THEN
        CREATE TYPE traffictype AS ENUM ('import', 'export');
    END IF;
END
$$;

-- Ajouter le champ traffic à la table crm_leads
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS traffic traffictype;

-- Ajouter le champ traffic à la table crm_opportunities  
ALTER TABLE crm_opportunities 
ADD COLUMN IF NOT EXISTS traffic traffictype;

-- ========================================
-- 4. MODIFICATION CHAMP VEHICLE_TYPES vers ENGINE_TYPES
-- ========================================

-- Supprimer l'ancienne colonne vehicle_types de crm_opportunities
ALTER TABLE crm_opportunities 
DROP COLUMN IF EXISTS vehicle_types;

-- Ajouter nouvelle colonne engine_type dans crm_opportunities (single engine, not array)
ALTER TABLE crm_opportunities 
ADD COLUMN IF NOT EXISTS engine_type INTEGER REFERENCES engin(id);

-- Ajouter référence vers table engin dans crm_quote_items
ALTER TABLE crm_quote_items 
ADD COLUMN IF NOT EXISTS engin_id INTEGER REFERENCES engin(id);

-- Supprimer l'ancienne colonne vehicle_type de crm_quote_items
ALTER TABLE crm_quote_items 
DROP COLUMN IF EXISTS vehicle_type;

-- ========================================
-- 5. DONNÉES INITIALES POUR TABLE ENGIN
-- ========================================

-- Insérer les engins de base d'après l'image
INSERT INTO engin (libelle, conteneur_remorque, poids_vide, pied, description)
VALUES 
-- Conteneurs standards
('CONTENEUR 20'' VIDE', 'CONTENEUR', 2000.00, '20', 'Conteneur standard 20 pieds vide'),
('CONTENEUR 20'' DC', 'CONTENEUR 20'' DC', 2000.00, '20', 'Conteneur 20 pieds dry container'),
('CONTENEUR FLAT VIDE 20''', 'CONTENEUR FLAT VIDE 20''', 2000.00, '20', 'Conteneur flat vide 20 pieds'),
('CONTENEUR 20'' FR', 'CONTENEUR 20'' FR', 2000.00, '20', 'Conteneur 20 pieds reefer'),
('CONTENEUR HC VIDE 20''', 'CONTENEUR HC VIDE 20''', 2200.00, '20', 'Conteneur high cube vide 20 pieds'),
('CONTENEUR 20'' OT', 'CONTENEUR 20'' OT', 2200.00, '20', 'Conteneur 20 pieds open top'),
('CONTENEUR REEFER 20''', 'CONTENEUR REEFER 20''', 2200.00, '20', 'Conteneur reefer 20 pieds'),
('ISOTANK VIDE', 'ISOTANK VIDE', 2200.00, '20', 'Isotank vide'),
('CONTENEUR VT VIDE 20''', 'CONTENEUR VT VIDE 20''', 2200.00, '20', 'Conteneur ventilé vide 20 pieds'),

-- Conteneurs 40 pieds
('CONTENEUR 40'' PLEIN', 'CONTENEUR 40'' PLEIN', 4400.00, '40', 'Conteneur standard 40 pieds plein'),
('CONTENEUR 40'' DC', 'CONTENEUR 40'' DC', 4400.00, '40', 'Conteneur 40 pieds dry container'),
('CONTENEUR FLAT VIDE 40''', 'CONTENEUR FLAT VIDE 40''', 4000.00, '40', 'Conteneur flat vide 40 pieds'),
('CONTENEUR 40'' FR', 'CONTENEUR 40'' FR', 4000.00, '40', 'Conteneur 40 pieds reefer'),
('CONTENEUR 40'' HC', 'CONTENEUR 40'' HC', 4400.00, '40', 'Conteneur high cube 40 pieds'),
('CONTENEUR VIDE HARDTOP', 'CONTENEUR VIDE HARDTOP', 4800.00, '40', 'Conteneur hardtop vide 40 pieds'),
('MAFI 40''', 'MAFI 40''', 4000.00, '40', 'Remorque MAFI 40 pieds'),
('CONTENEUR 40'' OT', 'CONTENEUR 40'' OT', 4400.00, '40', 'Conteneur 40 pieds open top'),
('CONTENEUR 40 PW', 'CONTENEUR 40 PW', 5000.00, '40', 'Conteneur 40 pieds pallet wide'),
('CONTENEUR REEFER 40''', 'CONTENEUR REEFER 40''', 4400.00, '40', 'Conteneur reefer 40 pieds'),
('CONT VIDE 40'' VENT', 'CONT VIDE 40'' VENT', 3550.00, '40', 'Conteneur ventilé vide 40 pieds'),

-- Conteneurs 45 pieds
('45 DC', '45 DC', 0.00, '45', 'Conteneur 45 pieds dry container'),
('CONT VIDE 45'' HIGH', 'CONT VIDE 45'' HIGH', 4970.00, '45', 'Conteneur high cube vide 45 pieds'),

-- Équipements spéciaux
('BUS', 'BUS', 0.00, '', 'Autobus'),
('CAMION REMORQUE', 'CAMION REMORQUE', 10500.00, '', 'Camion avec remorque'),
('CAMION VIDE', 'CAMION VIDE', 0.00, '', 'Camion vide'),
('VOITURE', 'VOITURE', 0.00, '', 'Véhicule léger'),
('CHASSIS', 'CHASSIS', 0.00, '', 'Chassis pour conteneur'),
('CONVEPTIONNEL', 'CONVEPTIONNEL', 0.00, '', 'Transport conventionnel'),
('DUMPER', 'DUMPER', 0.00, '', 'Camion benne'),
('ENGIN', 'ENGIN', 0.00, '', 'Engin de chantier'),
('EXCAVATEUR', 'EXCAVATEUR', 0.00, '', 'Excavatrice'),
('CHARIOT ELEVATEUR', 'CHARIOT ELEVATEUR', 0.00, '', 'Chariot élévateur');

-- ========================================
-- 6. VUES MISES À JOUR
-- ========================================

-- Vue des engins actifs
DROP VIEW IF EXISTS view_engins_actifs;
CREATE VIEW view_engins_actifs AS
SELECT 
    id,
    libelle,
    conteneur_remorque,
    poids_vide,
    pied,
    description
FROM engin 
WHERE is_active = true
ORDER BY libelle;

-- Vue des prospects avec traffic
DROP VIEW IF EXISTS view_prospects_with_traffic;
CREATE VIEW view_prospects_with_traffic AS
SELECT 
    l.*,
    l.traffic as traffic_type,
    CASE 
        WHEN l.traffic = 'import' THEN 'Import'
        WHEN l.traffic = 'export' THEN 'Export'
        ELSE 'Non défini'
    END as traffic_label
FROM crm_leads l;

-- Vue des opportunités avec traffic et nouveau transport type
DROP VIEW IF EXISTS view_opportunities_enhanced;
CREATE VIEW view_opportunities_enhanced AS
SELECT 
    o.*,
    o.traffic as traffic_type,
    CASE 
        WHEN o.traffic = 'import' THEN 'Import'
        WHEN o.traffic = 'export' THEN 'Export'
        ELSE 'Non défini'
    END as traffic_label,
    CASE 
        WHEN o.transport_type = 'complet' THEN 'Complet'
        WHEN o.transport_type = 'groupage' THEN 'Groupage'
        WHEN o.transport_type = 'aerien' THEN 'Aérien'
        WHEN o.transport_type = 'projet' THEN 'Projet'
        ELSE 'Non défini'
    END as transport_type_label
FROM crm_opportunities o;

-- ========================================
-- 7. INDEX SUPPLÉMENTAIRES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_leads_traffic ON crm_leads(traffic);
CREATE INDEX IF NOT EXISTS idx_opportunities_traffic ON crm_opportunities(traffic);
CREATE INDEX IF NOT EXISTS idx_opportunities_engine_type ON crm_opportunities(engine_type);

-- ========================================
-- COMMENTAIRES FINAUX
-- ========================================
COMMENT ON COLUMN crm_leads.traffic IS 'Type de traffic: import ou export';
COMMENT ON COLUMN crm_opportunities.traffic IS 'Type de traffic: import ou export';
COMMENT ON COLUMN crm_opportunities.engine_type IS 'ID de l engin/véhicule utilisé (référence à table engin)';
COMMENT ON COLUMN engin.pied IS 'Taille en pieds pour les conteneurs (20, 40, 45, etc.)';
COMMENT ON TYPE traffictype IS 'Enum pour définir le sens du traffic: import/export';

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================
DO $$
DECLARE
    engin_count INTEGER;
    traffic_count_leads INTEGER;
    traffic_count_opps INTEGER;
BEGIN
    -- Vérifier que la table engin a été créée avec des données
    SELECT COUNT(*) INTO engin_count FROM engin;
    
    -- Vérifier que les colonnes traffic ont été ajoutées
    SELECT COUNT(*) INTO traffic_count_leads 
    FROM information_schema.columns 
    WHERE table_name = 'crm_leads' AND column_name = 'traffic';
    
    SELECT COUNT(*) INTO traffic_count_opps 
    FROM information_schema.columns 
    WHERE table_name = 'crm_opportunities' AND column_name = 'traffic';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'MODIFICATION CRM TERMINÉE AVEC SUCCÈS !';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Table engin créée avec % engins', engin_count;
    RAISE NOTICE 'Champ traffic ajouté aux leads: %', CASE WHEN traffic_count_leads > 0 THEN 'OUI' ELSE 'NON' END;
    RAISE NOTICE 'Champ traffic ajouté aux opportunities: %', CASE WHEN traffic_count_opps > 0 THEN 'OUI' ELSE 'NON' END;
    RAISE NOTICE 'Types de transport modifiés: complet, groupage, aerien, projet';
    RAISE NOTICE 'Champ engine_types ajouté pour remplacer vehicle_types';
    RAISE NOTICE '===========================================';
END
$$;