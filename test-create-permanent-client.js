// Script pour créer un client permanent et tester les deux types
const apiUrl = 'http://localhost:3000';

async function createPermanentClient() {
  try {
    // Données pour un client permanent
    const permanentClientData = {
      nom: 'Client Permanent Test',
      interlocuteur: 'Test Interlocuteur Permanent',
      adresse: 'Adresse permanent test',
      ville: 'Ville permanent',
      pays: 'Tunisie',
      categorie: 'Local',
      type_client: 'Entreprise',
      is_permanent: true, // CLIENT PERMANENT
      mot_de_passe: 'MotDePasseTest123!',
      statut: 'actif'
    };

    console.log('🚀 Création d\'un client permanent...');
    const response = await fetch(`${apiUrl}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(permanentClientData)
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Résultat:', result);

    if (result && result.data) {
      console.log('✅ Client permanent créé:');
      console.log('- ID:', result.data.id);
      console.log('- Nom:', result.data.nom);
      console.log('- is_permanent:', result.data.is_permanent, '(type:', typeof result.data.is_permanent, ')');
      console.log('- mot_de_passe:', result.data.mot_de_passe ? 'HASHÉ PRÉSENT' : 'NULL/UNDEFINED');
      console.log('- keycloak_id:', result.data.keycloak_id ? 'CRÉÉ' : 'NULL');
    }

    // Récupérer les statistiques finales
    console.log('\n📊 Statistiques finales...');
    const listResponse = await fetch(`${apiUrl}/api/clients`);
    const listData = await listResponse.json();
    
    if (listData && listData.data) {
      const tempClients = listData.data.filter(client => client.is_permanent === false);
      const permanentClients = listData.data.filter(client => client.is_permanent === true);
      
      console.log(`📈 Résumé final:`);
      console.log(`- Total clients: ${listData.data.length}`);
      console.log(`- Clients permanents: ${permanentClients.length}`);
      console.log(`- Clients temporaires: ${tempClients.length}`);
      
      console.log('\n🔄 Derniers clients créés:');
      const recentClients = listData.data.slice(0, 3);
      recentClients.forEach(client => {
        const type = client.is_permanent ? 'PERMANENT' : 'TEMPORAIRE';
        const password = client.mot_de_passe ? '🔒 Avec mot de passe' : '🔓 Sans mot de passe';
        const keycloak = client.keycloak_id ? '👤 Keycloak créé' : '❌ Pas de Keycloak';
        console.log(`  - ${client.nom} (ID: ${client.id}) - ${type} - ${password} - ${keycloak}`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createPermanentClient();