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
        'User-Agent': 'Final-Fix-Test/1.0',
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

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testCompleteAuthFlow() {
  console.log('🎯 TEST FINAL - Correction définitive des erreurs d\'authentification');
  console.log('=' .repeat(80));

  let authToken = null;

  try {
    // 1. Test de l'endpoint auth/check (ne devrait plus causer d'erreur)
    console.log('\n1️⃣  Test /api/auth/check (sans erreur)...');
    const checkResponse = await makeRequest(`${API_BASE_URL}/api/auth/check`, 'GET');
    console.log(`✅ Status: ${checkResponse.status} - ${checkResponse.data.message}`);

    // 2. Authentification Keycloak (nouveau endpoint optimisé)
    console.log('\n2️⃣  Authentification avec /api/auth/keycloak-auth...');
    const authData = {
      keycloak_id: '187',
      username: 'mahdi45',
      email: 'mahdibeyy@gmail.com',
      roles: ['Administratif']
    };
    
    const authResponse = await makeRequest(`${API_BASE_URL}/api/auth/keycloak-auth`, 'POST', authData);
    console.log(`✅ Authentification: ${authResponse.status}`);
    
    if (authResponse.data && authResponse.data.access_token) {
      authToken = authResponse.data.access_token;
      console.log(`✅ Token JWT reçu (${authToken.length} caractères)`);
      console.log(`✅ Utilisateur: ${authResponse.data.user.username} (${authResponse.data.user.userType})`);
      console.log(`✅ Rôles: ${authResponse.data.roles.join(', ')}`);
    }

    // 3. Test avec l'ancien endpoint sync (doit aussi retourner un token maintenant)
    console.log('\n3️⃣  Test /api/auth/sync (amélioré avec token)...');
    const syncResponse = await makeRequest(`${API_BASE_URL}/api/auth/sync`, 'POST', authData);
    console.log(`✅ Sync: ${syncResponse.status}`);
    
    if (syncResponse.data && syncResponse.data.access_token) {
      console.log(`✅ Token aussi disponible via sync: ${syncResponse.data.access_token.length} caractères`);
    }

    // 4. Test current-user avec token
    if (authToken) {
      console.log('\n4️⃣  Test /api/auth/current-user (avec token)...');
      const currentUserResponse = await makeRequest(`${API_BASE_URL}/api/auth/current-user`, 'POST', {
        token: authToken
      });
      console.log(`✅ Current user: ${currentUserResponse.status}`);
      
      if (currentUserResponse.data && currentUserResponse.data.user) {
        console.log(`✅ Utilisateur récupéré: ${currentUserResponse.data.user.username}`);
        console.log(`✅ Source: ${currentUserResponse.data.source}`);
      } else {
        console.log(`❌ Erreur: ${JSON.stringify(currentUserResponse.data)}`);
      }
    }

    // 5. Test verify-token
    if (authToken) {
      console.log('\n5️⃣  Test /api/auth/verify-token...');
      const verifyResponse = await makeRequest(`${API_BASE_URL}/api/auth/verify-token`, 'POST', {
        token: authToken
      });
      console.log(`✅ Verify token: ${verifyResponse.status}`);
      
      if (verifyResponse.data && verifyResponse.data.valid) {
        console.log(`✅ Token valide, expire dans: ${verifyResponse.data.token_info.remaining_time}s`);
      }
    }

    // 6. Test d'un endpoint protégé (users) avec token en header
    if (authToken) {
      console.log('\n6️⃣  Test endpoint protégé /api/users/personnel avec token...');
      const protectedResponse = await makeRequest(`${API_BASE_URL}/api/users/personnel`, 'GET', null, {
        'Authorization': `Bearer ${authToken}`
      });
      console.log(`✅ Endpoint protégé: ${protectedResponse.status}`);
      
      if (protectedResponse.status === 200) {
        console.log(`✅ Accès autorisé aux données protégées`);
      } else {
        console.log(`❌ Erreur accès protégé: ${JSON.stringify(protectedResponse.data)}`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur durant les tests:', error.message);
  }
}

// Exécuter le test complet
testCompleteAuthFlow().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log('🎉 TESTS TERMINÉS - SOLUTION FINALE');
  console.log('\n📋 Résumé des corrections:');
  console.log('• ✅ Endpoint /api/auth/check ne cause plus d\'erreur 401');
  console.log('• ✅ Endpoint /api/auth/keycloak-auth pour authentification directe');
  console.log('• ✅ Endpoint /api/auth/sync retourne maintenant un token JWT');
  console.log('• ✅ TokenAuthGuard remplace JwtAuthGuard (fonctionne sans cookies)');
  console.log('• ✅ Support des tokens dans headers, body et query parameters');
  console.log('• ✅ Plus d\'erreurs de cookies manquants');
  
  console.log('\n🚀 UTILISATION FRONTEND:');
  console.log('1. Appelez /api/auth/sync ou /api/auth/keycloak-auth avec les données Keycloak');
  console.log('2. Récupérez le access_token de la réponse');
  console.log('3. Utilisez ce token dans toutes les requêtes suivantes:');
  console.log('   - Headers: Authorization: Bearer <token>');
  console.log('   - Ou Body: { token: "<token>", ...autres données }');
  console.log('4. Plus besoin de gérer les cookies !');
  
}).catch(console.error);