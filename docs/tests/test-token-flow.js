const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const requestModule = isHttps ? https : http;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Quick-Test/1.0',
        ...headers
      }
    };

    if (data && method !== 'GET') {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = requestModule.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: jsonData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testTokenFlow() {
  console.log('🧪 Test du flux de tokens');
  console.log('='.repeat(50));

  try {
    // 1. Authentification et récupération du token
    console.log('\n1️⃣ Authentification via sync...');
    const authData = {
      keycloak_id: '187',
      username: 'mahdi45',
      email: 'mahdibeyy@gmail.com',
      roles: ['Administratif']
    };
    
    const syncResponse = await makeRequest(`${API_BASE_URL}/api/auth/sync`, 'POST', authData);
    console.log(`✅ Sync: ${syncResponse.status}`);
    
    if (syncResponse.data && syncResponse.data.access_token) {
      const token = syncResponse.data.access_token;
      console.log(`✅ Token reçu: ${token.substring(0, 50)}...`);
      
      // 2. Test d'un endpoint protégé avec le token
      console.log('\n2️⃣ Test endpoint protégé avec token...');
      
      // Méthode 1: Token dans header Authorization
      console.log('📡 Test avec Authorization header...');
      const headerResponse = await makeRequest(`${API_BASE_URL}/api/users/personnel`, 'GET', null, {
        'Authorization': `Bearer ${token}`
      });
      console.log(`✅ Avec header: ${headerResponse.status}`);
      
      // Méthode 2: Token dans body (pour requêtes PUT)
      console.log('📡 Test avec token dans body...');
      const bodyResponse = await makeRequest(`${API_BASE_URL}/api/users/personnel/191`, 'PUT', {
        token: token,
        nom: 'Bey',
        prenom: 'Mehdi',
        email: 'mahdibeyy@gmail.com'
      });
      console.log(`✅ Avec body: ${bodyResponse.status}`);
      
      if (bodyResponse.status !== 200) {
        console.log('❌ Erreur body:', JSON.stringify(bodyResponse.data));
      }
      
    } else {
      console.log('❌ Pas de token dans la réponse sync');
      console.log('Réponse:', JSON.stringify(syncResponse.data));
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécuter le test
testTokenFlow().then(() => {
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test terminé');
  
  console.log('\n💡 Pour le frontend:');
  console.log('1. Après auth/sync, stockez le access_token');
  console.log('2. Ajoutez-le dans toutes les requêtes:');
  console.log('   - Headers: Authorization: Bearer <token>');
  console.log('   - Ou Body: { token: "<token>", ...data }');
  
}).catch(console.error);