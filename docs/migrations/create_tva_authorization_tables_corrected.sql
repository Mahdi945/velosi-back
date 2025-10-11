-- ============================================================
-- Migration script CORRIGÉ : Création des tables AutorisationsTVA et BCsusTVA
-- Date : 2025-10-10
-- Objectif : Gestion correcte des autorisations TVA et bons de commande
-- Logique : AutorisationsTVA (table principale) -> BCsusTVA (bons de commande)
-- ============================================================

-- =====================================
-- Table AutorisationsTVA (Table principale)
-- =====================================
CREATE TABLE IF NOT EXISTS "AutorisationsTVA" (
    "id" SERIAL PRIMARY KEY,
    "client_id" INTEGER NOT NULL, -- Référence vers client.id
    "numeroAutorisation" VARCHAR(50) NOT NULL UNIQUE, -- Numéro unique d'autorisation
    "dateDebutValidite" DATE, -- Date de début de validité
    "dateFinValidite" DATE, -- Date de fin de validité
    "dateAutorisation" DATE, -- Date d'émission de l'autorisation
        "imagePath" TEXT, -- Chemin vers le document scanné de l'autorisation TVA
    "typeDocument" VARCHAR(20) DEFAULT 'AUTORISATION', -- AUTORISATION, CERTIFICAT, ATTESTATION, DECISION, AUTRE
    "referenceDocument" VARCHAR(100), -- Référence officielle du document
    "statutAutorisation" VARCHAR(20) DEFAULT 'ACTIF', -- ACTIF, EXPIRE, SUSPENDU, ANNULE
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN DEFAULT TRUE,
    CONSTRAINT "FK_AutorisationsTVA_Client" 
        FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE
);

-- =====================================
-- Table BCsusTVA (Bons de commande liés aux autorisations)
-- =====================================
CREATE TABLE IF NOT EXISTS "BCsusTVA" (
    "id" SERIAL PRIMARY KEY,
    "autorisation_id" INTEGER NOT NULL, -- Référence vers AutorisationsTVA.id (OBLIGATOIRE)
    "numeroBonCommande" VARCHAR(50) NOT NULL, -- Numéro du bon de commande
    "dateBonCommande" DATE NOT NULL, -- Date du bon de commande
    "montantBonCommande" DECIMAL(15,3) NOT NULL, -- Montant du bon de commande
    "description" TEXT, -- Description/observations du bon de commande
    "imagePath" TEXT, -- Chemin vers le document scanné du bon de commande
    "statut" VARCHAR(20) DEFAULT 'ACTIF', -- ACTIF, EXPIRE, SUSPENDU, ANNULE
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN DEFAULT TRUE,
    CONSTRAINT "FK_BCsusTVA_Autorisation" 
        FOREIGN KEY ("autorisation_id") REFERENCES "AutorisationsTVA"("id") ON DELETE CASCADE
);

-- =====================================
-- Ajout de la colonne état_fiscal à la table client si non existante
-- =====================================
ALTER TABLE "client" 
ADD COLUMN IF NOT EXISTS "etat_fiscal" VARCHAR(50) DEFAULT 'ASSUJETTI_TVA';

-- =====================================
-- Contraintes d'unicité
-- =====================================
-- Un numéro d'autorisation ne peut exister qu'une seule fois
ALTER TABLE "AutorisationsTVA" 
ADD CONSTRAINT "UQ_AutorisationsTVA_numeroAutorisation" 
UNIQUE ("numeroAutorisation");

-- Un numéro de bon de commande ne peut exister qu'une seule fois par autorisation
ALTER TABLE "BCsusTVA" 
ADD CONSTRAINT "UQ_BCsusTVA_numeroBonCommande_autorisation" 
UNIQUE ("autorisation_id", "numeroBonCommande");

-- =====================================
-- Commentaires descriptifs
-- =====================================
COMMENT ON TABLE "AutorisationsTVA" IS 'Table principale des autorisations TVA';
COMMENT ON COLUMN "AutorisationsTVA"."client_id" IS 'Référence vers le client propriétaire de l''autorisation';
COMMENT ON COLUMN "AutorisationsTVA"."numeroAutorisation" IS 'Numéro unique d''autorisation TVA';
COMMENT ON COLUMN "AutorisationsTVA"."dateDebutValidite" IS 'Date de début de validité de l''autorisation';
COMMENT ON COLUMN "AutorisationsTVA"."dateFinValidite" IS 'Date de fin de validité de l''autorisation';
COMMENT ON COLUMN "AutorisationsTVA"."dateAutorisation" IS 'Date d''émission de l''autorisation';
COMMENT ON COLUMN "AutorisationsTVA"."imagePath" IS 'Chemin vers le document scanné de l''autorisation TVA';
COMMENT ON COLUMN "AutorisationsTVA"."typeDocument" IS 'Type de document (AUTORISATION, CERTIFICAT, ATTESTATION, DECISION, AUTRE)';
COMMENT ON COLUMN "AutorisationsTVA"."referenceDocument" IS 'Référence officielle du document';
COMMENT ON COLUMN "AutorisationsTVA"."statutAutorisation" IS 'Statut de l''autorisation (ACTIF, EXPIRE, SUSPENDU, ANNULE)';

COMMENT ON TABLE "BCsusTVA" IS 'Table des bons de commande liés aux autorisations TVA';
COMMENT ON COLUMN "BCsusTVA"."autorisation_id" IS 'Référence vers l''autorisation TVA parent (obligatoire)';
COMMENT ON COLUMN "BCsusTVA"."numeroBonCommande" IS 'Numéro du bon de commande';
COMMENT ON COLUMN "BCsusTVA"."dateBonCommande" IS 'Date d''émission du bon de commande';
COMMENT ON COLUMN "BCsusTVA"."montantBonCommande" IS 'Montant total du bon de commande';
COMMENT ON COLUMN "BCsusTVA"."description" IS 'Description ou observations du bon de commande';
COMMENT ON COLUMN "BCsusTVA"."imagePath" IS 'Chemin vers le document scanné du bon de commande';
COMMENT ON COLUMN "BCsusTVA"."statut" IS 'Statut du bon de commande (ACTIF, EXPIRE, SUSPENDU, ANNULE)';

COMMENT ON COLUMN "client"."etat_fiscal" IS 'État fiscal du client: ASSUJETTI_TVA, SUSPENSION_TVA, EXONERE';

-- =====================================
-- Index pour les performances
-- =====================================
-- Index pour AutorisationsTVA
CREATE INDEX IF NOT EXISTS "idx_autorisations_tva_client" ON "AutorisationsTVA"("client_id");
CREATE INDEX IF NOT EXISTS "idx_autorisations_tva_numero" ON "AutorisationsTVA"("numeroAutorisation");
CREATE INDEX IF NOT EXISTS "idx_autorisations_tva_dates" ON "AutorisationsTVA"("dateDebutValidite", "dateFinValidite");
CREATE INDEX IF NOT EXISTS "idx_autorisations_tva_statut" ON "AutorisationsTVA"("statutAutorisation");
CREATE INDEX IF NOT EXISTS "idx_autorisations_tva_active" ON "AutorisationsTVA"("is_active");

-- Index pour BCsusTVA
CREATE INDEX IF NOT EXISTS "idx_bcsus_tva_autorisation" ON "BCsusTVA"("autorisation_id");
CREATE INDEX IF NOT EXISTS "idx_bcsus_tva_numero" ON "BCsusTVA"("numeroBonCommande");
CREATE INDEX IF NOT EXISTS "idx_bcsus_tva_date" ON "BCsusTVA"("dateBonCommande");
CREATE INDEX IF NOT EXISTS "idx_bcsus_tva_statut" ON "BCsusTVA"("statut");
CREATE INDEX IF NOT EXISTS "idx_bcsus_tva_active" ON "BCsusTVA"("is_active");

-- Index pour client
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

-- Triggers pour AutorisationsTVA
DROP TRIGGER IF EXISTS trg_autorisations_tva_updated ON "AutorisationsTVA";
CREATE TRIGGER trg_autorisations_tva_updated
    BEFORE UPDATE ON "AutorisationsTVA"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour BCsusTVA
DROP TRIGGER IF EXISTS trg_bcsus_tva_updated ON "BCsusTVA";
CREATE TRIGGER trg_bcsus_tva_updated
    BEFORE UPDATE ON "BCsusTVA"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- Vues utiles pour les rapports
-- =====================================
CREATE OR REPLACE VIEW "v_autorisations_avec_client" AS
SELECT 
    a."id" as autorisation_id,
    a."numeroAutorisation",
    a."dateDebutValidite",
    a."dateFinValidite",
    a."dateAutorisation",
    a."typeDocument",
    a."referenceDocument",
    a."statutAutorisation",
    a."is_active" as autorisation_active,
    a."created_at" as autorisation_created_at,
    c."id" as client_id,
    c."nom" as client_nom,
    c."etat_fiscal",
    -- Nombre de bons de commande pour cette autorisation
    (SELECT COUNT(*) FROM "BCsusTVA" bc WHERE bc."autorisation_id" = a."id" AND bc."is_active" = true) as nombre_bons_commande,
    -- Montant total des bons de commande
    (SELECT COALESCE(SUM(bc."montantBonCommande"), 0) FROM "BCsusTVA" bc WHERE bc."autorisation_id" = a."id" AND bc."is_active" = true AND bc."statut" = 'ACTIF') as montant_total_bons
FROM "AutorisationsTVA" a
LEFT JOIN "client" c ON c."id" = a."client_id"
WHERE a."is_active" = true;

CREATE OR REPLACE VIEW "v_bons_commande_avec_details" AS
SELECT 
    bc."id" as bon_commande_id,
    bc."numeroBonCommande",
    bc."dateBonCommande",
    bc."montantBonCommande",
    bc."description",
    bc."statut" as bon_statut,
    bc."is_active" as bon_active,
    bc."created_at" as bon_created_at,
    a."id" as autorisation_id,
    a."numeroAutorisation",
    a."dateDebutValidite",
    a."dateFinValidite",
    a."statutAutorisation",
    c."id" as client_id,
    c."nom" as client_nom,
    c."etat_fiscal"
FROM "BCsusTVA" bc
LEFT JOIN "AutorisationsTVA" a ON a."id" = bc."autorisation_id"
LEFT JOIN "client" c ON c."id" = a."client_id"
WHERE bc."is_active" = true;

-- =====================================
-- Données de test (optionnel)
-- =====================================
-- Exemple d'insertion de données de test
/*
-- Exemple d'autorisation
INSERT INTO "AutorisationsTVA" ("client_id", "numeroAutorisation", "dateDebutValidite", "dateFinValidite", "dateAutorisation", "typeDocument", "statutAutorisation")
VALUES (1, 'AUTO-2024-001', '2024-01-01', '2024-12-31', '2024-01-01', 'AUTORISATION', 'ACTIF');

-- Exemple de bons de commande pour cette autorisation
INSERT INTO "BCsusTVA" ("autorisation_id", "numeroBonCommande", "dateBonCommande", "montantBonCommande", "description", "statut")
VALUES 
    (1, 'BC-2024-001', '2024-01-15', 1000.500, 'Premier bon de commande', 'ACTIF'),
    (1, 'BC-2024-002', '2024-02-15', 2500.750, 'Deuxième bon de commande', 'ACTIF');
*/