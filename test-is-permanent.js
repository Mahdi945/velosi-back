// Test pour vérifier les champs is_permanent depuis l'API
const apiUrl = 'http://localhost:3000';

async function testClient() {
  try {
    // Test 1: Récupérer la liste des clients
    console.log('📊 Test 1: Récupération de tous les clients');
    const response = await fetch(`${apiUrl}/api/clients`);
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Data type:', typeof data);
    console.log('Data:', data);
    
    if (data && data.data && Array.isArray(data.data)) {
      console.log('Nombre de clients:', data.data.length);
      if (data.data.length > 0) {
        const firstClient = data.data[0];
        console.log('🔍 Premier client:');
        console.log('- ID:', firstClient.id);
        console.log('- Nom:', firstClient.nom);
        console.log('- is_permanent:', firstClient.is_permanent, '(type:', typeof firstClient.is_permanent, ')');
        console.log('- Clés disponibles:', Object.keys(firstClient));
      }
    }
    
    // Test 2: Tester l'endpoint de debug s'il existe
    console.log('\n📊 Test 2: Endpoint de debug');
    try {
      const debugResponse = await fetch(`${apiUrl}/api/clients/debug/is-permanent`);
      const debugData = await debugResponse.json();
      console.log('Debug response:', debugData);
    } catch (debugError) {
      console.log('Endpoint de debug non disponible:', debugError.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testClient();