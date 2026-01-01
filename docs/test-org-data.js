const { Pool } = require('pg');

// Configuration de la base de données principale
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: 'velosi_main',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function testOrgData() {
  try {
    console.log('🔍 Test de récupération des données organisation...\n');
    
    // Récupérer toutes les organisations
    const result = await pool.query(
      `SELECT id, nom, nom_affichage, logo_url, adresse, telephone, email_contact, slug FROM organisations ORDER BY id`
    );
    
    console.log(`✅ ${result.rows.length} organisation(s) trouvée(s):\n`);
    
    result.rows.forEach(org => {
      console.log(`📋 Organisation ID: ${org.id}`);
      console.log(`   Nom: ${org.nom || '❌ NULL'}`);
      console.log(`   Nom affichage: ${org.nom_affichage || '❌ NULL'}`);
      console.log(`   Logo URL: ${org.logo_url || '❌ NULL'}`);
      console.log(`   Adresse: ${org.adresse || '❌ NULL'}`);
      console.log(`   Téléphone: ${org.telephone || '❌ NULL'}`);
      console.log(`   Email contact: ${org.email_contact || '❌ NULL'}`);
      console.log(`   Slug: ${org.slug || '❌ NULL'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

testOrgData();
