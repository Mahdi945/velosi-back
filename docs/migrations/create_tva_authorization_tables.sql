-- ============================================================
-- Migration script : Création des tables AutorisationsTVA et BCsusTVA
-- Date : 2025-10-10
-- Objectif : Gestion des autorisations et suspensions de TVA
-- Compatible avec la table client (clé primaire = id)
-- ============================================================

-- =====================================
-- Table AutorisationsTVA
-- =====================================
CREATE TABLE IF NOT EXISTS "AutorisationsTVA" (
    "id" SERIAL PRIMARY KEY,
    "client_id" INTEGER NOT NULL, -- Référence vers client.id
    "NUMAUTORISATION" VARCHAR(50) NOT NULL,
    "VALDEDE" DATE,
    "VALIDEAU" DATE,
    "IMAGE" BYTEA,
    "DATEAUTO" DATE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN DEFAULT TRUE,
    CONSTRAINT "FK_AutorisationsTVA_Client" 
        FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE
);

-- =====================================
-- Table BCsusTVA
-- =====================================
CREATE TABLE IF NOT EXISTS "BCsusTVA" (
    "id" SERIAL PRIMARY KEY,
    "client_id" INTEGER NOT NULL, -- Référence vers client.id
    "NUMAUTORISATION" VARCHAR(50) NOT NULL,
    "VALDEDE" DATE,
    "VALIDEAU" DATE,
    "IMAGE" BYTEA,
    "DATEAUTO" DATE,
    "type_document" VARCHAR(50), -- Type de document (autorisation, certificat, etc.)
    "reference_document" VARCHAR(100), -- Référence du document
    "statut" VARCHAR(20) DEFAULT 'ACTIF', -- ACTIF, EXPIRE, SUSPENDU
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN DEFAULT TRUE,
    CONSTRAINT "FK_BCsusTVA_Client" 
        FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE
);

-- =====================================
-- Ajout de la colonne état_fiscal à la table client si non existante
-- =====================================
ALTER TABLE "client" 
ADD COLUMN IF NOT EXISTS "etat_fiscal" VARCHAR(50) DEFAULT 'ASSUJETTI_TVA';

-- =====================================
-- Commentaires descriptifs
-- =====================================
COMMENT ON COLUMN "AutorisationsTVA"."client_id" IS 'Référence vers le client concerné';
COMMENT ON COLUMN "AutorisationsTVA"."NUMAUTORISATION" IS 'Numéro d''autorisation TVA';
COMMENT ON COLUMN "AutorisationsTVA"."VALDEDE" IS 'Date de début de validité de l''autorisation';
COMMENT ON COLUMN "AutorisationsTVA"."VALIDEAU" IS 'Date de fin de validité de l''autorisation';
COMMENT ON COLUMN "AutorisationsTVA"."IMAGE" IS 'Image scannée de l''autorisation TVA';
COMMENT ON COLUMN "AutorisationsTVA"."DATEAUTO" IS 'Date d''émission de l''autorisation TVA';

COMMENT ON COLUMN "BCsusTVA"."client_id" IS 'Référence vers le client concerné';
COMMENT ON COLUMN "BCsusTVA"."NUMAUTORISATION" IS 'Numéro d''autorisation de suspension TVA';
COMMENT ON COLUMN "BCsusTVA"."VALDEDE" IS 'Date de début de validité de la suspension';
COMMENT ON COLUMN "BCsusTVA"."VALIDEAU" IS 'Date de fin de validité de la suspension';
COMMENT ON COLUMN "BCsusTVA"."IMAGE" IS 'Image du document de suspension TVA';
COMMENT ON COLUMN "BCsusTVA"."DATEAUTO" IS 'Date d''émission du document de suspension';
COMMENT ON COLUMN "BCsusTVA"."type_document" IS 'Type de document justificatif (autorisation, certificat, etc.)';
COMMENT ON COLUMN "BCsusTVA"."reference_document" IS 'Référence officielle du document';
COMMENT ON COLUMN "BCsusTVA"."statut" IS 'Statut actuel de la suspension (ACTIF, EXPIRE, SUSPENDU)';

COMMENT ON COLUMN "client"."etat_fiscal" IS 'État fiscal du client: ASSUJETTI_TVA, SUSPENSION_TVA, EXONERE';

-- =====================================
-- Index pour les performances
-- =====================================
CREATE INDEX IF NOT EXISTS "idx_autorisations_tva_client" ON "AutorisationsTVA"("client_id");
CREATE INDEX IF NOT EXISTS "idx_autorisations_tva_num" ON "AutorisationsTVA"("NUMAUTORISATION");
CREATE INDEX IF NOT EXISTS "idx_autorisations_tva_dates" ON "AutorisationsTVA"("VALDEDE", "VALIDEAU");

CREATE INDEX IF NOT EXISTS "idx_bcsus_tva_client" ON "BCsusTVA"("client_id");
CREATE INDEX IF NOT EXISTS "idx_bcsus_tva_num" ON "BCsusTVA"("NUMAUTORISATION");
CREATE INDEX IF NOT EXISTS "idx_bcsus_tva_dates" ON "BCsusTVA"("VALDEDE", "VALIDEAU");
CREATE INDEX IF NOT EXISTS "idx_bcsus_tva_statut" ON "BCsusTVA"("statut");

CREATE INDEX IF NOT EXISTS "idx_client_etat_fiscal" ON "client"("etat_fiscal");

-- =====================================
-- Fonction et triggers pour updated_at
-- =====================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_autorisations_tva_updated
    BEFORE UPDATE ON "AutorisationsTVA"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bcsus_tva_updated
    BEFORE UPDATE ON "BCsusTVA"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();