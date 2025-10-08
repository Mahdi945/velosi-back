const { Client } = require('pg');

// Configuration de la base de données
const client = new Client({
  host: process.env.DB_ADDR || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'msp',
  password: process.env.DB_PASSWORD || '87Eq8384',
  database: process.env.DB_DATABASE || 'velosi',
});

async function testClients() {
  try {
    await client.connect();
    console.log('✅ Connexion réussie à PostgreSQL');
    
    // Vérifier tous les clients et leurs charge_com
    const allClients = await client.query('SELECT id, nom, charge_com FROM client ORDER BY id');
    console.log('\n📊 TOUS LES CLIENTS:');
    console.table(allClients.rows);
    
    // Vérifier les clients avec bassem.sassi comme charge_com
    const bassamClients = await client.query('SELECT id, nom, charge_com FROM client WHERE charge_com = $1', ['bassem.sassi']);
    console.log('\n👤 CLIENTS ASSIGNÉS À bassem.sassi:');
    console.table(bassamClients.rows);
    
    // Vérifier les utilisateurs personnel
    const personnel = await client.query('SELECT id, nom, prenom, nom_utilisateur, role FROM personnel WHERE role = $1', ['commercial']);
    console.log('\n💼 COMMERCIAUX:');
    console.table(personnel.rows);
    
  } catch (err) {
    console.error('❌ Erreur:', err);
  } finally {
    await client.end();
  }
}

testClients();