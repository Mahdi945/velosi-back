// Test d'authentification par email et récupération de profil
const axios = require('axios');

const testAuthAndProfile = async () => {
  try {
    console.log('=== Test d\'authentification par email ===');
    
    // Test de connexion avec email
    const loginData = {
      usernameOrEmail: 'test@company.com', // Email du client créé précédemment
      password: 'test123456'
    };

    console.log('Tentative de connexion avec email:', loginData.usernameOrEmail);

    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('Connexion réussie:', JSON.stringify(loginResponse.data, null, 2));
    
    // Récupérer le token d'accès
    const accessToken = loginResponse.data.access_token;
    
    console.log('\n=== Test de récupération du profil ===');
    
    // Tester l'endpoint de profil
    const profileResponse = await axios.get('http://localhost:3000/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('Profil récupéré:', JSON.stringify(profileResponse.data, null, 2));
    
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
};

testAuthAndProfile();
