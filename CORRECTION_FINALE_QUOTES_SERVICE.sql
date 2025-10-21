-- ✅ CORRECTION FINALE : Créer contact_client après création du client

-- Cette requête SQL peut être exécutée manuellement après chaque création de client
-- pour s'assurer que l'email et le téléphone sont bien enregistrés

-- Exemple d'insertion pour un nouveau client
INSERT INTO contact_client (id_client, mail1, tel1)
VALUES (
  (SELECT id FROM client WHERE nom = 'NOM_DU_CLIENT' ORDER BY id DESC LIMIT 1),
  'email@example.com',
  '+216 12 345 678'
)
ON CONFLICT (id_client) 
DO UPDATE SET 
  mail1 = EXCLUDED.mail1,
  tel1 = EXCLUDED.tel1;

-- Vérifier si contact_client existe pour un client donné
SELECT 
  c.id,
  c.nom,
  c.is_permanent,
  cc.mail1,
  cc.tel1
FROM client c
LEFT JOIN contact_client cc ON cc.id_client = c.id
WHERE c.type_client = 'PROSPECT_CONVERTI'
ORDER BY c.id DESC
LIMIT 10;
