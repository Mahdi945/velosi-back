const fetch = require('node-fetch');

// Test de récupération des objectifs pour un personnel
async function testGetObjectifs() {
  try {
    // Remplacez 212 par l'ID du personnel que vous voulez tester
    const personnelId = 212;
    const response = await fetch(`http://localhost:3000/api/objectifs-commerciaux/personnel/${personnelId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Ajoutez ici le token JWT si nécessaire
        // 'Authorization': 'Bearer YOUR_JWT_TOKEN'
      }
    });

    const data = await response.json();
    console.log('Réponse de l\'API:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    // Test direct de la base de données
    console.log('\n--- Test direct de la base de données ---');
    
    const { Client } = require('pg');
    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'erp_db',
      user: 'postgres',
      password: 'admin123'  // Remplacez par votre mot de passe
    });

    await client.connect();
    const result = await client.query('SELECT * FROM objectif_com WHERE id_personnel = $1', [personnelId]);
    console.log('Résultats directs de la DB:');
    console.log(result.rows);
    
    await client.end();
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

testGetObjectifs();