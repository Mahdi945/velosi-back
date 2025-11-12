-- =====================================================
-- MIGRATION: Ajout des informations bancaires aux clients
-- Date: 2025-11-12
-- Description: 
--   - Ajoute les champs bancaires à la table client
--   - Champs: banque, iban, rib, swift, bic
-- =====================================================

-- =====================================================
-- 1. AJOUT DES COLONNES BANCAIRES À LA TABLE CLIENT
-- =====================================================

-- Nom de la banque
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS banque VARCHAR(255);

COMMENT ON COLUMN client.banque IS 'Nom de la banque du client';

-- IBAN (International Bank Account Number)
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS iban VARCHAR(34);

COMMENT ON COLUMN client.iban IS 'IBAN - International Bank Account Number';

-- RIB (Relevé d''Identité Bancaire)
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS rib VARCHAR(23);

COMMENT ON COLUMN client.rib IS 'RIB - Relevé d''Identité Bancaire (format FR)';

-- SWIFT/BIC code
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS swift VARCHAR(11);

COMMENT ON COLUMN client.swift IS 'Code SWIFT - Society for Worldwide Interbank Financial Telecommunication';

-- BIC (Bank Identifier Code)
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS bic VARCHAR(11);

COMMENT ON COLUMN client.bic IS 'BIC - Bank Identifier Code';

-- =====================================================
-- 2. VÉRIFICATIONS
-- =====================================================

DO $$
BEGIN
    -- Vérifier banque
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'client' AND column_name = 'banque') THEN
        RAISE NOTICE '✅ Colonne banque ajoutée à la table client';
    END IF;
    
    -- Vérifier iban
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'client' AND column_name = 'iban') THEN
        RAISE NOTICE '✅ Colonne iban ajoutée à la table client';
    END IF;
    
    -- Vérifier rib
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'client' AND column_name = 'rib') THEN
        RAISE NOTICE '✅ Colonne rib ajoutée à la table client';
    END IF;
    
    -- Vérifier swift
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'client' AND column_name = 'swift') THEN
        RAISE NOTICE '✅ Colonne swift ajoutée à la table client';
    END IF;
    
    -- Vérifier bic
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'client' AND column_name = 'bic') THEN
        RAISE NOTICE '✅ Colonne bic ajoutée à la table client';
    END IF;
END $$;

-- =====================================================
-- 3. REQUÊTES DE TEST
-- =====================================================

/*
-- Tester un client avec informations bancaires
SELECT 
    id,
    nom,
    banque,
    iban,
    rib,
    swift,
    bic,
    created_at
FROM client
ORDER BY id DESC
LIMIT 5;

-- Compter les clients avec informations bancaires
SELECT 
    COUNT(*) as total_clients,
    COUNT(banque) as with_bank,
    COUNT(iban) as with_iban,
    COUNT(rib) as with_rib,
    COUNT(swift) as with_swift,
    COUNT(bic) as with_bic
FROM client;
*/

RAISE NOTICE '🎉 Migration terminée avec succès !';
RAISE NOTICE '📝 Champs bancaires ajoutés à la table client: banque, iban, rib, swift, bic';
RAISE NOTICE '💡 Les champs sont tous optionnels (nullable)';
