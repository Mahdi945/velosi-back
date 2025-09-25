const axios = require('axios');

async function debugCookieTransmission() {
  try {
    console.log('🔍 Debug transmission des cookies');
    console.log('==================================================\n');

    // 1. Appel sync
    console.log('1️⃣ Appel /auth/sync...');
    const syncResponse = await axios.post('http://localhost:3000/api/auth/sync', {
      keycloak_id: '187',
      username: 'mahdi45',
      email: 'mahdibeyy@gmail.com',
      roles: ['Administratif']
    }, {
      withCredentials: true
    });

    console.log('✅ Sync réussi:', syncResponse.status);
    
    // Extraire le cookie manuellement
    const setCookieHeader = syncResponse.headers['set-cookie'];
    let cookieValue = '';
    if (setCookieHeader && setCookieHeader.length > 0) {
      const cookieString = setCookieHeader[0];
      const match = cookieString.match(/access_token=([^;]+)/);
      if (match) {
        cookieValue = match[1];
        console.log('🍪 Token extrait du cookie:', cookieValue.substring(0, 50) + '...');
      }
    }

    // 2. Test avec cookie manuel dans header
    console.log('\n2️⃣ Test PUT avec cookie manuel...');
    try {
      const updateResponse = await axios.put('http://localhost:3000/api/users/personnel/191', {
        nom: 'Test Cookie Manual',
      }, {
        headers: {
          'Cookie': `access_token=${cookieValue}`
        },
        withCredentials: true
      });
      console.log('✅ Update avec cookie manuel:', updateResponse.status);
    } catch (error) {
      console.log('❌ Update avec cookie manuel échoué:', error.response?.status, error.response?.data?.message);
    }

    // 3. Test avec le token dans Authorization header
    console.log('\n3️⃣ Test PUT avec Authorization header...');
    try {
      const updateResponse2 = await axios.put('http://localhost:3000/api/users/personnel/191', {
        nom: 'Test Auth Header',
      }, {
        headers: {
          'Authorization': `Bearer ${cookieValue}`
        }
      });
      console.log('✅ Update avec Authorization header:', updateResponse2.status);
    } catch (error) {
      console.log('❌ Update avec Authorization header échoué:', error.response?.status, error.response?.data?.message);
    }

    // 4. Test simple pour vérifier si le serveur voit les cookies
    console.log('\n4️⃣ Test simple endpoint debug...');
    try {
      const debugResponse = await axios.get('http://localhost:3000/api/auth/debug', {
        headers: {
          'Cookie': `access_token=${cookieValue}`
        }
      });
      console.log('✅ Debug endpoint:', debugResponse.status);
      console.log('📄 Debug data:', JSON.stringify(debugResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Debug endpoint échoué:', error.response?.status, error.response?.data?.message);
    }

  } catch (error) {
    console.log('❌ Erreur générale:', error.message);
    if (error.response) {
      console.log('📄 Statut:', error.response.status);
      console.log('📄 Données:', error.response.data);
    }
  }
}

debugCookieTransmission();