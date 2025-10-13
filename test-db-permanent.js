const pg = require('pg');

async function testDatabaseDirect() {
  console.log('🔍 Test direct de la base de données PostgreSQL...');
  
  const client = new pg.Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin',
    database: 'velosi_erp'
  });

  try {
    await client.connect();
    console.log('✅ Connexion PostgreSQL établie');

    // Test 1: Vérifier si la colonne exists
    console.log('\n📊 Test 1: Vérification existence colonne is_permanent');
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'client' AND column_name = 'is_permanent'
    `);
    console.log('Info colonne:', columnCheck.rows);

    // Test 2: Requête directe sur la table
    console.log('\n📊 Test 2: Valeurs actuelles dans la table');
    const directQuery = await client.query(`
      SELECT id, nom, is_permanent,
             CASE WHEN is_permanent IS NULL THEN 'NULL'
                  WHEN is_permanent = true THEN 'TRUE'
                  WHEN is_permanent = false THEN 'FALSE'
                  ELSE 'AUTRE: ' || is_permanent::text END as status_interpretation
      FROM client 
      ORDER BY id DESC 
      LIMIT 10
    `);
    
    console.log('Résultats directs:');
    directQuery.rows.forEach(row => {
      console.log(`  - Client ${row.id} (${row.nom}): is_permanent = ${row.is_permanent} (${row.status_interpretation})`);
    });

    // Test 3: Statistiques globales
    console.log('\n📊 Test 3: Statistiques globales');
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN is_permanent = true THEN 1 END) as permanents,
        COUNT(CASE WHEN is_permanent = false THEN 1 END) as temporaires,
        COUNT(CASE WHEN is_permanent IS NULL THEN 1 END) as nulls
      FROM client
    `);
    
    console.log('Statistiques:', stats.rows[0]);

    // Test 4: Vérifier s'il y a des clients permanents
    console.log('\n📊 Test 4: Recherche clients permanents');
    const permanentClients = await client.query(`
      SELECT id, nom, is_permanent, created_at
      FROM client 
      WHERE is_permanent = true
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (permanentClients.rows.length > 0) {
      console.log('Clients permanents trouvés:');
      permanentClients.rows.forEach(row => {
        console.log(`  - ${row.nom} (ID: ${row.id})`);
      });
    } else {
      console.log('❌ Aucun client permanent trouvé dans la base !');
      
      // Essayons de créer un client permanent pour test
      console.log('\n� Création d\'un client permanent pour test...');
      try {
        await client.query(`
          UPDATE client 
          SET is_permanent = true 
          WHERE id = (SELECT id FROM client ORDER BY id DESC LIMIT 1)
        `);
        console.log('✅ Client test mis à jour comme permanent');
      } catch (updateError) {
        console.error('❌ Erreur lors de la mise à jour:', updateError.message);
      }
    }

    await client.end();
    console.log('\n✅ Test terminé');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await client.end();
  }
}

testDatabaseDirect();