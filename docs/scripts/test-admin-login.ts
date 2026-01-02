import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testAdminLogin() {
  try {
    console.log('🔐 Test de connexion admin MSP...\n');
    
    // Tenter la connexion
    const loginResponse = await axios.post(`${API_URL}/admin-msp/auth/login`, {
      nom_utilisateur: 'admin',
      mot_de_passe: 'Admin@2025!'
    });
    
    console.log('✅ Connexion réussie!');
    console.log('📊 Réponse:', JSON.stringify(loginResponse.data, null, 2));
    console.log('\n🎫 Token obtenu:', loginResponse.data.access_token?.substring(0, 50) + '...');
    
    // Tester une requête avec le token
    const token = loginResponse.data.access_token;
    const orgsResponse = await axios.get(`${API_URL}/admin-msp/organisations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n✅ Requête organisations réussie!');
    console.log('📊 Nombre d\'organisations:', orgsResponse.data.length);
    
    // Tester les stats
    const statsResponse = await axios.get(`${API_URL}/admin-msp/organisations/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n✅ Requête stats réussie!');
    console.log('📊 Stats:', JSON.stringify(statsResponse.data, null, 2));
    
  } catch (error: any) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    console.error('📊 Status:', error.response?.status);
  }
}

testAdminLogin();
