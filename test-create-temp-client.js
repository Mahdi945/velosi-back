// Script pour créer un client temporaire et tester l'affichage des types
const apiUrl = 'http://localhost:3000';

async function createTempClient() {
  try {
    // Données pour un client temporaire
    const tempClientData = {
      nom: 'Client Temporaire Test',
      interlocuteur: 'Test Interlocuteur',
      adresse: 'Adresse test',
      ville: 'Ville test',
      pays: 'Tunisie',
      categorie: 'Local',
      type_client: 'Particulier',
      is_permanent: false, // CLIENT TEMPORAIRE
      statut: 'actif'
    };

    console.log('🚀 Création d\'un client temporaire...');
    const response = await fetch(`${apiUrl}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tempClientData)
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Résultat:', result);

    if (result && result.data) {
      console.log('✅ Client créé:');
      console.log('- ID:', result.data.id);
      console.log('- Nom:', result.data.nom);
      console.log('- is_permanent:', result.data.is_permanent, '(type:', typeof result.data.is_permanent, ')');
      console.log('- mot_de_passe:', result.data.mot_de_passe ? 'PRÉSENT' : 'NULL/UNDEFINED');
    }

    // Récupérer la liste mise à jour
    console.log('\n📊 Vérification de la liste mise à jour...');
    const listResponse = await fetch(`${apiUrl}/api/clients`);
    const listData = await listResponse.json();
    
    if (listData && listData.data) {
      const tempClients = listData.data.filter(client => client.is_permanent === false);
      const permanentClients = listData.data.filter(client => client.is_permanent === true);
      
      console.log(`📈 Statistiques:`);
      console.log(`- Total clients: ${listData.data.length}`);
      console.log(`- Clients permanents: ${permanentClients.length}`);
      console.log(`- Clients temporaires: ${tempClients.length}`);
      
      if (tempClients.length > 0) {
        console.log('\n🕘 Clients temporaires:');
        tempClients.forEach(client => {
          console.log(`  - ${client.nom} (ID: ${client.id}) - is_permanent: ${client.is_permanent}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createTempClient();