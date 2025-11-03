-- Script pour vider toutes les tables et réimporter les données

-- Désactiver les contraintes de clés étrangères temporairement
SET session_replication_role = replica;

-- Vider toutes les tables
TRUNCATE TABLE "AutorisationsTVA" CASCADE;
TRUNCATE TABLE "BCsusTVA" CASCADE;
TRUNCATE TABLE aeroports CASCADE;
TRUNCATE TABLE armateurs CASCADE;
TRUNCATE TABLE client CASCADE;
TRUNCATE TABLE contact_client CASCADE;
TRUNCATE TABLE correspondants CASCADE;
TRUNCATE TABLE crm_activities CASCADE;
TRUNCATE TABLE crm_activity_participants CASCADE;
TRUNCATE TABLE crm_leads CASCADE;
TRUNCATE TABLE crm_opportunities CASCADE;
TRUNCATE TABLE crm_pipeline_stages CASCADE;
TRUNCATE TABLE crm_pipelines CASCADE;
TRUNCATE TABLE crm_quote_items CASCADE;
TRUNCATE TABLE crm_quotes CASCADE;
TRUNCATE TABLE crm_tags CASCADE;
TRUNCATE TABLE engin CASCADE;
TRUNCATE TABLE fournisseurs CASCADE;
TRUNCATE TABLE industries CASCADE;
TRUNCATE TABLE objectif_com CASCADE;
TRUNCATE TABLE personnel CASCADE;
TRUNCATE TABLE ports CASCADE;
TRUNCATE TABLE vechat_conversations CASCADE;
TRUNCATE TABLE vechat_messages CASCADE;

-- Réactiver les contraintes
SET session_replication_role = DEFAULT;

SELECT 'Toutes les tables sont vidées et prêtes pour l''import' AS status;
