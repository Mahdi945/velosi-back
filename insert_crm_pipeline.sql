-- Insertion de la ligne manquante dans crm_pipelines

INSERT INTO crm_pipelines (uuid, name, description, is_default, created_at, updated_at, created_by) 
VALUES (
    '821c3f4a-e929-4937-9d89-f12d96e67fd3',
    'Pipeline Standard Transport',
    'Pipeline par défaut pour les opportunités de transport et logistique',
    true,
    '2025-10-24 11:17:54.154505',
    '2025-10-24 11:17:54.154505',
    2
);

-- Vérification
SELECT * FROM crm_pipelines;
