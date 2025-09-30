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
        'User-Agent': 'Test-Script/1.0',
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

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testNewEndpoints() {
  console.log('🧪 Test des nouveaux endpoints d\'authentification');
  console.log('=' .repeat(60));

  // 1. Test debug endpoint
  console.log('\n1️⃣ Test de l\'endpoint de debug...');
  try {
    const debugResponse = await makeRequest(`${API_BASE_URL}/api/auth/debug`, 'GET');
    console.log('✅ Debug endpoint réponse:', debugResponse.status);
    console.log('📊 Données debug:', JSON.stringify(debugResponse.data, null, 2));
  } catch (error) {
    console.log('❌ Debug endpoint erreur:', error.message);
  }

  // 2. Test sync avec données directes (comme dans les logs)
  console.log('\n2️⃣ Test de sync avec données directes...');
  try {
    const syncData = {
      keycloak_id: '187',
      username: 'mahdi45',
      email: 'mahdibeyy@gmail.com',
      roles: ['Administratif']
    };
    
    const syncResponse = await makeRequest(`${API_BASE_URL}/api/auth/sync`, 'POST', syncData);
    console.log('✅ Sync endpoint réponse:', syncResponse.status);
    console.log('📊 Données sync:', JSON.stringify(syncResponse.data, null, 2));
  } catch (error) {
    console.log('❌ Sync endpoint erreur:', error.message);
  }

  // 3. Test de connexion pour obtenir un token
  console.log('\n3️⃣ Test de connexion...');
  try {
    const loginData = {
      username: 'mahdi45',
      password: 'votre_mot_de_passe' // À adapter
    };
    
    const loginResponse = await makeRequest(`${API_BASE_URL}/api/auth/login`, 'POST', loginData);
    console.log('📊 Réponse login:', loginResponse.status, loginResponse.statusText);
    
    if (loginResponse.data && loginResponse.data.access_token) {
      console.log('✅ Token obtenu, test de validation...');
      
      // 4. Test validate-token avec le token obtenu
      const validateResponse = await makeRequest(`${API_BASE_URL}/api/auth/validate-token`, 'POST', {
        token: loginResponse.data.access_token
      });
      
      console.log('✅ Validation token réponse:', validateResponse.status);
      console.log('📊 Données validation:', JSON.stringify(validateResponse.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Login/validation erreur:', error.message);
  }
}

// Exécuter les tests
testNewEndpoints().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests terminés');
  console.log('\n💡 Solutions implémentées:');
  console.log('• Endpoint /api/auth/debug pour diagnostiquer les cookies');
  console.log('• Endpoint /api/auth/sync modifié pour accepter les données directes');
  console.log('• Endpoint /api/auth/validate-token pour valider les tokens');
  console.log('• Support des données Keycloak directes du frontend');
}).catch(console.error);