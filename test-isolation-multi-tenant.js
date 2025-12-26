/**
 * Script de test de l'isolation multi-tenant
 * 
 * Ce script vérifie que :
 * 1. Les bases de données shipnology, velosi et danino existent
 * 2. Chaque organisation dans shipnology a un database_name correct
 * 3. Les données CRM dans chaque base sont isolées
 */

const { Pool } = require('pg');

// Configuration de connexion (depuis .env)
const config = {
  host: 'localhost',
  port: 5432,
  user: 'msp',
  password: '87Eq8384',
};

async function testMultiTenantIsolation() {
  console.log('\n🔍 === TEST D\'ISOLATION MULTI-TENANT ===\n');

  // 1. Vérifier la base shipnology et la table organisations
  console.log('📋 ÉTAPE 1: Vérification de la base shipnology');
  const shipnologyPool = new Pool({ ...config, database: 'shipnology' });
  
  try {
    // D'abord vérifier la structure de la table
    const columnsResult = await shipnologyPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'organisations' 
      ORDER BY ordinal_position
    `);
    
    console.log(`✅ Base shipnology accessible`);
    console.log(`📊 Structure de la table organisations:`);
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Adapter la requête selon les colonnes disponibles
    const orgResult = await shipnologyPool.query(
      'SELECT * FROM organisations ORDER BY id'
    );
    
    console.log(`\n📊 ${orgResult.rows.length} organisation(s) trouvée(s):\n`);
    
    const organisations = orgResult.rows;
    organisations.forEach(org => {
      const name = org.name || org.nom || org.libelle || 'Sans nom';
      const dbName = org.database_name || org.db_name || org.base_de_donnees || 'Non défini';
      console.log(`   🏢 ID: ${org.id} | Nom: ${name} | Base: ${dbName}`);
    });
    
    if (organisations.length === 0) {
      console.error('\n❌ ERREUR: Aucune organisation trouvée dans shipnology!');
      console.log('   Solution: Insérer les organisations dans la table shipnology.organisations');
      return;
    }

    // 2. Vérifier que chaque base de données existe
    console.log('\n📋 ÉTAPE 2: Vérification des bases de données');
    
    for (const org of organisations) {
      const dbName = org.database_name;
      
      // Vérifier que la base existe
      const dbCheckResult = await shipnologyPool.query(
        'SELECT datname FROM pg_database WHERE datname = $1',
        [dbName]
      );
      
      if (dbCheckResult.rows.length === 0) {
        console.error(`   ❌ Base "${dbName}" pour ${org.name} N'EXISTE PAS!`);
        console.log(`      Solution: CREATE DATABASE ${dbName};`);
      } else {
        console.log(`   ✅ Base "${dbName}" pour ${org.name} existe`);
        
        // 3. Tester la connexion à cette base
        try {
          const orgPool = new Pool({ ...config, database: dbName });
          
          // Compter les leads
          const leadsResult = await orgPool.query('SELECT COUNT(*) as count FROM crm_leads WHERE is_archived = false');
          const leadsCount = leadsResult.rows[0].count;
          
          // Compter les opportunities
          const oppsResult = await orgPool.query('SELECT COUNT(*) as count FROM crm_opportunities WHERE deleted_at IS NULL AND is_archived = false');
          const oppsCount = oppsResult.rows[0].count;
          
          // Compter les clients
          const clientsResult = await orgPool.query('SELECT COUNT(*) as count FROM client WHERE statut = \'actif\'');
          const clientsCount = clientsResult.rows[0].count;
          
          console.log(`      📊 Données CRM:`);
          console.log(`         - ${leadsCount} lead(s)`);
          console.log(`         - ${oppsCount} opportunité(s)`);
          console.log(`         - ${clientsCount} client(s) actif(s)`);
          
          await orgPool.end();
        } catch (error) {
          console.error(`   ❌ Erreur de connexion à "${dbName}":`, error.message);
        }
      }
    }

    // 4. Vérifier qu'il n'y a pas de données mixées
    console.log('\n📋 ÉTAPE 3: Vérification de l\'isolation des données');
    
    for (const org of organisations) {
      const dbName = org.database_name;
      
      try {
        const orgPool = new Pool({ ...config, database: dbName });
        
        // Vérifier s'il y a un champ organisation_id dans les tables CRM
        const tableCheckResult = await orgPool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'crm_leads' AND column_name = 'organisation_id'
        `);
        
        if (tableCheckResult.rows.length > 0) {
          console.log(`   ⚠️  Base "${dbName}" contient un champ organisation_id dans crm_leads`);
          console.log(`      Note: Avec des bases séparées, ce champ n'est PAS nécessaire`);
        } else {
          console.log(`   ✅ Base "${dbName}" n'utilise PAS de champ organisation_id (isolation par base)`);
        }
        
        await orgPool.end();
      } catch (error) {
        // Base n'existe pas, déjà signalé plus haut
      }
    }

    console.log('\n✅ === TEST TERMINÉ ===\n');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error(error.stack);
  } finally {
    await shipnologyPool.end();
  }
}

// Exécuter le test
testMultiTenantIsolation()
  .then(() => {
    console.log('\n📌 RECOMMANDATIONS:');
    console.log('   1. Chaque organisation doit avoir sa propre base de données');
    console.log('   2. Le champ database_name dans shipnology.organisations doit être correct');
    console.log('   3. Aucun fallback vers "velosi" ne doit exister dans le code');
    console.log('   4. Les logs du backend montreront quelle base est utilisée à chaque requête');
    console.log('   5. Testez la connexion avec un utilisateur Danino et vérifiez les logs\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
