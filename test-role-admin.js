const axios = require('axios');

async function testRoleAdmin() {
  try {
    console.log('🧪 Test d\'accès avec rôle administratif');
    console.log('==================================================\n');

    // 1. Authentification
    console.log('1️⃣ Authentification...');
    const syncResponse = await axios.post('http://localhost:3000/api/auth/sync', {
      username: 'mahdi45',
      password: 'oualid45*',
      isKeycloakUser: true
    });

    if (syncResponse.status !== 200) {
      console.log('❌ Échec authentification:', syncResponse.status);
      return;
    }

    const token = syncResponse.data.access_token;
    console.log('✅ Token obtenu');

    // 2. Test endpoint nécessitant rôle admin
    console.log('\n2️⃣ Test endpoint admin...');
    
    try {
      const adminResponse = await axios.get('http://localhost:3000/api/users/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Accès autorisé:', adminResponse.status);
      console.log('👤 Utilisateur:', adminResponse.data.username);
      console.log('🎭 Rôle:', adminResponse.data.role);
      
    } catch (adminError) {
      console.log('❌ Accès refusé:', adminError.response?.status);
      console.log('📝 Message:', adminError.response?.data?.message);
    }

    // 3. Test avec informations de rôle détaillées
    console.log('\n3️⃣ Vérification du rôle dans le token...');
    
    try {
      const checkResponse = await axios.post('http://localhost:3000/api/auth/verify-token', {
        token: token
      });
      
      console.log('✅ Token valide');
      console.log('🎭 Rôle dans token:', checkResponse.data.user.role);
      console.log('🔐 Rôles Keycloak:', checkResponse.data.user.keycloak_roles);
      
    } catch (verifyError) {
      console.log('❌ Erreur vérification:', verifyError.response?.status);
    }

  } catch (error) {
    console.log('❌ Erreur générale:', error.message);
  }
}

testRoleAdmin();