const axios = require('axios');

async function testSyncWithCookies() {
  try {
    console.log('🧪 Test sync avec gestion des cookies');
    console.log('==================================================\n');

    // Créer une instance axios avec gestion des cookies
    const axiosInstance = axios.create({
      withCredentials: true, // Important pour les cookies
      timeout: 10000
    });

    // 1. Appel sync pour obtenir le token en cookie
    console.log('1️⃣ Appel /auth/sync pour obtenir token en cookie...');
    const syncResponse = await axiosInstance.post('http://localhost:3000/api/auth/sync', {
      keycloak_id: '187',
      username: 'mahdi45',
      email: 'mahdibeyy@gmail.com',
      roles: ['Administratif']
    });

    console.log('✅ Sync réussi:', syncResponse.status);
    console.log('🎫 Token dans réponse:', syncResponse.data.access_token ? 'OUI' : 'NON');
    console.log('🍪 Set-Cookie header:', syncResponse.headers['set-cookie'] ? 'OUI' : 'NON');
    
    if (syncResponse.headers['set-cookie']) {
      console.log('🍪 Cookies reçus:', syncResponse.headers['set-cookie']);
    }

    // 2. Test immédiat avec même instance (cookies automatiques)
    console.log('\n2️⃣ Test PUT /users/personnel/191 avec cookies automatiques...');
    try {
      const updateResponse = await axiosInstance.put('http://localhost:3000/api/users/personnel/191', {
        nom: 'Test Cookie Update',
      });
      console.log('✅ Update personnel avec cookies:', updateResponse.status);
    } catch (error) {
      console.log('❌ Update personnel échoué:', error.response?.status, error.response?.data?.message);
      console.log('🔍 Error complet:', error.message);
    }

    // 3. Test d'autres endpoints avec cookies
    console.log('\n3️⃣ Test d\'autres endpoints avec cookies...');
    
    try {
      const personnelResponse = await axiosInstance.get('http://localhost:3000/api/users/personnel');
      console.log('✅ Get personnel:', personnelResponse.status, '- Count:', personnelResponse.data.personnel?.length || 0);
    } catch (error) {
      console.log('❌ Get personnel échoué:', error.response?.status, error.response?.data?.message);
    }

    try {
      const currentUserResponse = await axiosInstance.post('http://localhost:3000/api/auth/current-user', {});
      console.log('✅ Current user:', currentUserResponse.status, '-', currentUserResponse.data.user?.username);
    } catch (error) {
      console.log('❌ Current user échoué:', error.response?.status, error.response?.data?.message);
    }

  } catch (error) {
    console.log('❌ Erreur générale:', error.message);
    if (error.response) {
      console.log('📄 Statut:', error.response.status);
      console.log('📄 Données:', error.response.data);
    }
  }
}

testSyncWithCookies();