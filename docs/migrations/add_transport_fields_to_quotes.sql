-- ================================================================
-- MIGRATION: Ajout des champs de transport et type de document
-- aux cotations (crm_quotes)
-- ================================================================
-- Description: Ajoute les champs pour gérer les informations
-- additionnelles de transport (armateur, navire, ports, aéroports)
-- et le type de document (cotation/fiche_dossier)
-- ================================================================

-- 1. Ajouter le champ TYPE (cotation ou fiche_dossier)
ALTER TABLE crm_quotes
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'cotation' CHECK (type IN ('cotation', 'fiche_dossier'));

COMMENT ON COLUMN crm_quotes.type IS 'Type de document: cotation (statut != accepted) ou fiche_dossier (statut = accepted avec infos transport complètes)';

-- 2. Ajouter les champs de transport maritime
ALTER TABLE crm_quotes
ADD COLUMN IF NOT EXISTS armateur_id INTEGER REFERENCES armateurs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS navire_id INTEGER REFERENCES navires(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS port_enlevement_id INTEGER REFERENCES ports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS port_livraison_id INTEGER REFERENCES ports(id) ON DELETE SET NULL;

COMMENT ON COLUMN crm_quotes.armateur_id IS 'Armateur assigné pour le transport maritime';
COMMENT ON COLUMN crm_quotes.navire_id IS 'Navire assigné pour le transport maritime';
COMMENT ON COLUMN crm_quotes.port_enlevement_id IS 'Port d''enlèvement';
COMMENT ON COLUMN crm_quotes.port_livraison_id IS 'Port de livraison';

-- 3. Ajouter les champs de transport aérien
ALTER TABLE crm_quotes
ADD COLUMN IF NOT EXISTS aeroport_enlevement_id INTEGER REFERENCES aeroports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS aeroport_livraison_id INTEGER REFERENCES aeroports(id) ON DELETE SET NULL;

COMMENT ON COLUMN crm_quotes.aeroport_enlevement_id IS 'Aéroport d''enlèvement';
COMMENT ON COLUMN crm_quotes.aeroport_livraison_id IS 'Aéroport de livraison';

-- 4. Ajouter les champs documentaires (HBL, MBL)
ALTER TABLE crm_quotes
ADD COLUMN IF NOT EXISTS hbl VARCHAR(100),
ADD COLUMN IF NOT EXISTS mbl VARCHAR(100);

COMMENT ON COLUMN crm_quotes.hbl IS 'House Bill of Lading (Connaissement maison)';
COMMENT ON COLUMN crm_quotes.mbl IS 'Master Bill of Lading (Connaissement principal)';

-- 5. Ajouter le champ condition (Contact, etc.)
ALTER TABLE crm_quotes
ADD COLUMN IF NOT EXISTS condition VARCHAR(100);

COMMENT ON COLUMN crm_quotes.condition IS 'Condition d''enlèvement/livraison (ex: Contact)';

-- 6. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_crm_quotes_type ON crm_quotes(type);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_armateur_id ON crm_quotes(armateur_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_navire_id ON crm_quotes(navire_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_port_enlevement_id ON crm_quotes(port_enlevement_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_port_livraison_id ON crm_quotes(port_livraison_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_aeroport_enlevement_id ON crm_quotes(aeroport_enlevement_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_aeroport_livraison_id ON crm_quotes(aeroport_livraison_id);

-- 7. Mettre à jour les cotations existantes selon leur statut
-- Les cotations acceptées deviennent des "fiches_dossier" si elles ont des infos de transport
UPDATE crm_quotes
SET type = 'fiche_dossier'
WHERE status = 'accepted'
  AND (
    armateur_id IS NOT NULL 
    OR navire_id IS NOT NULL 
    OR port_enlevement_id IS NOT NULL 
    OR port_livraison_id IS NOT NULL
    OR aeroport_enlevement_id IS NOT NULL
    OR aeroport_livraison_id IS NOT NULL
  );

-- 8. Vérifier la migration
SELECT 
  COUNT(*) as total_quotes,
  SUM(CASE WHEN type = 'cotation' THEN 1 ELSE 0 END) as cotations,
  SUM(CASE WHEN type = 'fiche_dossier' THEN 1 ELSE 0 END) as fiches_dossier
FROM crm_quotes;

-- ================================================================
-- FIN DE LA MIGRATION
-- ================================================================
