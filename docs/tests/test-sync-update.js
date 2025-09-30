const axios = require('axios');

async function testSyncAndUpdate() {
  try {
    console.log('🧪 Test du flux: Sync -> Update Personnel');
    console.log('==================================================\n');

    // 1. Appel sync
    console.log('1️⃣ Appel /auth/sync...');
    const syncResponse = await axios.post('http://localhost:3000/api/auth/sync', {
      keycloak_id: '187',
      username: 'mahdi45',
      email: 'mahdibeyy@gmail.com',
      roles: ['Administratif']
    });

    console.log('✅ Sync réussi:', syncResponse.status);
    console.log('🎫 Token reçu:', syncResponse.data.access_token ? 'OUI' : 'NON');
    
    if (!syncResponse.data.access_token) {
      console.log('❌ Aucun token dans la réponse sync');
      console.log('📄 Réponse complète:', JSON.stringify(syncResponse.data, null, 2));
      return;
    }

    const token = syncResponse.data.access_token;
    console.log('🔐 Token (extrait):', token.substring(0, 50) + '...');

    // 2. Test avec le token dans différents endpoints
    console.log('\n2️⃣ Test endpoints avec token...');
    
    // Test 1: current-user
    try {
      console.log('📡 Test /auth/current-user...');
      const currentUserResponse = await axios.post('http://localhost:3000/api/auth/current-user', {
        token: token
      });
      console.log('✅ Current user:', currentUserResponse.status, '-', currentUserResponse.data.user?.username);
    } catch (error) {
      console.log('❌ Current user échoué:', error.response?.status, error.response?.data?.message);
    }

    // Test 2: Tentative PUT personnel (la requête qui échoue dans les logs)
    try {
      console.log('📡 Test PUT /users/personnel/191 avec header...');
      const updateResponse = await axios.put('http://localhost:3000/api/users/personnel/191', {
        // Données de test pour la mise à jour
        nom: 'Test Update',
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Update personnel:', updateResponse.status);
    } catch (error) {
      console.log('❌ Update personnel échoué:', error.response?.status, error.response?.data?.message);
      console.log('🔍 Détails error:', error.message);
    }

    // Test 3: Même chose mais avec token dans le body
    try {
      console.log('📡 Test PUT /users/personnel/191 avec body token...');
      const updateResponse2 = await axios.put('http://localhost:3000/api/users/personnel/191', {
        token: token,
        nom: 'Test Update 2',
      });
      console.log('✅ Update personnel (body):', updateResponse2.status);
    } catch (error) {
      console.log('❌ Update personnel (body) échoué:', error.response?.status, error.response?.data?.message);
    }

  } catch (error) {
    console.log('❌ Erreur générale:', error.message);
    if (error.response) {
      console.log('📄 Statut:', error.response.status);
      console.log('📄 Données:', error.response.data);
    }
  }
}

testSyncAndUpdate();