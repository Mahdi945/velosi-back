const axios = require('axios');

async function testClientAPI() {
  console.log('🔍 Test de l\'API /api/clients...');
  
  try {
    // Test de l'API clients
    const response = await axios.get('http://localhost:3000/api/clients', {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Réponse API reçue, statut:', response.status);
    console.log('📊 Nombre de clients:', response.data.length);

    if (response.data.length > 0) {
      console.log('\n🔍 Analyse des 3 premiers clients:');
      response.data.slice(0, 3).forEach((client, index) => {
        console.log(`\nClient ${index + 1}:`);
        console.log(`  ID: ${client.id}`);
        console.log(`  Nom: ${client.nom}`);
        console.log(`  is_permanent: ${client.is_permanent}`);
        console.log(`  Type is_permanent: ${typeof client.is_permanent}`);
        console.log(`  JSON.stringify: ${JSON.stringify(client.is_permanent)}`);
        console.log(`  Clés disponibles: ${Object.keys(client).join(', ')}`);
      });

      // Analyser la distribution des valeurs is_permanent
      console.log('\n📊 Distribution is_permanent:');
      const permanentCount = response.data.filter(c => c.is_permanent === true).length;
      const temporaryCount = response.data.filter(c => c.is_permanent === false).length;
      const nullCount = response.data.filter(c => c.is_permanent === null).length;
      const undefinedCount = response.data.filter(c => c.is_permanent === undefined).length;
      const otherCount = response.data.length - permanentCount - temporaryCount - nullCount - undefinedCount;

      console.log(`  - Permanent (true): ${permanentCount}`);
      console.log(`  - Temporaire (false): ${temporaryCount}`);
      console.log(`  - Null: ${nullCount}`);
      console.log(`  - Undefined: ${undefinedCount}`);
      console.log(`  - Autres valeurs: ${otherCount}`);

      // Afficher quelques exemples de chaque type s'ils existent
      const permanents = response.data.filter(c => c.is_permanent === true).slice(0, 2);
      const temporaires = response.data.filter(c => c.is_permanent === false).slice(0, 2);
      
      if (permanents.length > 0) {
        console.log('\n👥 Exemples clients permanents:');
        permanents.forEach(c => console.log(`  - ${c.nom} (ID: ${c.id}) => ${c.is_permanent}`));
      }
      
      if (temporaires.length > 0) {
        console.log('\n🕘 Exemples clients temporaires:');
        temporaires.forEach(c => console.log(`  - ${c.nom} (ID: ${c.id}) => ${c.is_permanent}`));
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du test API:', error.message);
    if (error.response) {
      console.error('Statut de réponse:', error.response.status);
      console.error('Données de réponse:', error.response.data);
    }
  }
}

// Attendre un peu avant de tester (laisser le temps au serveur de démarrer)
setTimeout(testClientAPI, 2000);