const fetch = require('node-fetch');

// Test de l'upsert des objectifs
async function testUpsertObjectifs() {
  try {
    const personnelId = 212; // Remplacez par l'ID du personnel à tester
    
    const objectifData = {
      titre: 'Test Objectif Upsert',
      description: 'Description test pour upsert',
      objectif_ca: 75000,
      objectif_clients: 15,
      date_fin: '2025-12-31',
      statut: 'en_cours',
      progression: 25.5
    };

    console.log('Test de l\'upsert des objectifs...');
    console.log('Personnel ID:', personnelId);
    console.log('Données:', JSON.stringify(objectifData, null, 2));

    const response = await fetch(`http://localhost:3000/api/objectifs-commerciaux/personnel/${personnelId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Ajoutez ici le token JWT si nécessaire
        // 'Authorization': 'Bearer YOUR_JWT_TOKEN'
      },
      body: JSON.stringify(objectifData)
    });

    const result = await response.json();
    console.log('\nRéponse de l\'API:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ Upsert réussi !');
      
      // Vérifier la récupération
      console.log('\nVérification avec GET...');
      const getResponse = await fetch(`http://localhost:3000/api/objectifs-commerciaux/personnel/${personnelId}`);
      const getData = await getResponse.json();
      console.log('Données récupérées:', JSON.stringify(getData, null, 2));
    } else {
      console.log('\n❌ Erreur lors de l\'upsert');
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

testUpsertObjectifs();