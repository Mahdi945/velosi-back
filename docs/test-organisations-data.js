const { Client } = require('pg');

// Configuration de la connexion
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'shipnology',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
});

async function testOrganisations() {
  try {
    await client.connect();
    console.log('✅ Connexion à la base de données réussie\n');

    // Compter les organisations
    const countResult = await client.query('SELECT COUNT(*) FROM organisations');
    console.log('📊 Nombre total d\'organisations:', countResult.rows[0].count);

    // Récupérer toutes les organisations
    const result = await client.query(`
      SELECT 
        id, nom, nom_affichage, database_name, statut, 
        email_contact, telephone, logo_url, slug,
        created_at, updated_at
      FROM organisations 
      ORDER BY created_at DESC
    `);

    console.log('\n📋 Liste des organisations:\n');
    result.rows.forEach((org, index) => {
      console.log(`${index + 1}. ${org.nom}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Database: ${org.database_name}`);
      console.log(`   Statut: ${org.statut}`);
      console.log(`   Email: ${org.email_contact || 'N/A'}`);
      console.log(`   Slug: ${org.slug || 'N/A'}`);
      console.log(`   Créé le: ${org.created_at}`);
      console.log('   ---');
    });

    // Afficher la structure de la table
    console.log('\n🔍 Structure de la table organisations:\n');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'organisations'
      ORDER BY ordinal_position
    `);

    columnsResult.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}

testOrganisations();
