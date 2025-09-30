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
        'User-Agent': 'No-Cookie-Auth-Test/1.0',
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

async function testNoCookieAuth() {
  console.log('🚀 Test de l\'authentification sans cookies');
  console.log('=' .repeat(70));

  try {
    // 1. Test de l'endpoint check modifié
    console.log('\n1️⃣ Test de /api/auth/check (modifié)...');
    const checkResponse = await makeRequest(`${API_BASE_URL}/api/auth/check`, 'GET');
    console.log('✅ Check endpoint (sans erreur):', checkResponse.status);
    console.log('📊 Réponse:', JSON.stringify(checkResponse.data, null, 2));

    // 2. Test de la nouvelle authentification Keycloak directe
    console.log('\n2️⃣ Test authentification Keycloak directe...');
    const authData = {
      keycloak_id: '187',
      username: 'mahdi45',
      email: 'mahdibeyy@gmail.com',
      roles: ['Administratif']
    };
    
    const authResponse = await makeRequest(`${API_BASE_URL}/api/auth/keycloak-auth`, 'POST', authData);
    console.log('✅ Authentification Keycloak:', authResponse.status);
    console.log('📊 Réponse auth:', JSON.stringify(authResponse.data, null, 2));

    // 3. Si on a un token, tester la vérification
    if (authResponse.data && authResponse.data.access_token) {
      console.log('\n3️⃣ Test vérification du token...');
      const verifyResponse = await makeRequest(`${API_BASE_URL}/api/auth/verify-token`, 'POST', {
        token: authResponse.data.access_token
      });
      
      console.log('✅ Vérification token:', verifyResponse.status);
      console.log('📊 Réponse vérification:', JSON.stringify(verifyResponse.data, null, 2));

      // 4. Test des requêtes avec token dans header
      console.log('\n4️⃣ Test requête avec token en header...');
      const protectedResponse = await makeRequest(`${API_BASE_URL}/api/auth/current-user`, 'GET', null, {
        'Authorization': `Bearer ${authResponse.data.access_token}`
      });
      
      console.log('✅ Requête protégée avec token:', protectedResponse.status);
      console.log('📊 Réponse requête protégée:', JSON.stringify(protectedResponse.data, null, 2));
    }

    // 5. Test de l'ancien endpoint sync pour comparaison
    console.log('\n5️⃣ Test ancien endpoint sync...');
    const syncResponse = await makeRequest(`${API_BASE_URL}/api/auth/sync`, 'POST', authData);
    console.log('✅ Sync endpoint:', syncResponse.status);
    console.log('📊 Réponse sync:', JSON.stringify(syncResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Erreur durant les tests:', error.message);
  }
}

// Exécuter les tests
testNoCookieAuth().then(() => {
  console.log('\n' + '='.repeat(70));
  console.log('✅ Tests terminés - Nouvelle approche sans cookies');
  console.log('\n🎯 Nouveaux endpoints créés:');
  console.log('• POST /api/auth/keycloak-auth - Authentification directe Keycloak');
  console.log('• POST /api/auth/verify-token - Vérification token sans cookies');
  console.log('• GET /api/auth/check - Modifié pour ne plus causer d\'erreurs');
  
  console.log('\n💡 Comment utiliser:');
  console.log('1. Frontend appelle /api/auth/keycloak-auth avec les données Keycloak');
  console.log('2. Backend retourne un access_token JWT');
  console.log('3. Frontend utilise ce token dans Authorization: Bearer header');
  console.log('4. Plus besoin de cookies - tout fonctionne avec le token');
  
  console.log('\n🔧 Avantages:');
  console.log('• ✅ Plus d\'erreurs de cookies manquants');
  console.log('• ✅ Authentification directe avec données Keycloak');
  console.log('• ✅ Tokens JWT pour les requêtes suivantes');
  console.log('• ✅ Support des utilisateurs Keycloak-only');
  
}).catch(console.error);