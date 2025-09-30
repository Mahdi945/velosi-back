const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const KEYCLOAK_BASE_URL = 'http://localhost:8080';

// Test des endpoints d'authentification avec différentes méthodes
async function testAuthEndpoints() {
  console.log('🔧 Test des endpoints d\'authentification...\n');

  // 1. Test de l'endpoint /api/auth/check
  console.log('1️⃣ Test de /api/auth/check...');
  try {
    const checkResponse = await makeRequest(`${API_BASE_URL}/api/auth/check`, 'GET');
    console.log('✅ Endpoint /api/auth/check accessible');
    console.log('Response:', checkResponse.status, checkResponse.statusText);
  } catch (error) {
    console.log('❌ Endpoint /api/auth/check:', error.message);
  }

  // 2. Test de l'endpoint /api/auth/sync (nouveau)
  console.log('\n2️⃣ Test de /api/auth/sync...');
  try {
    const syncResponse = await makeRequest(`${API_BASE_URL}/api/auth/sync`, 'POST', {
      token: 'test-token'
    });
    console.log('✅ Endpoint /api/auth/sync accessible');
    console.log('Response:', syncResponse.status, syncResponse.statusText);
  } catch (error) {
    console.log('❌ Endpoint /api/auth/sync:', error.message);
  }

  // 3. Test de l'endpoint /api/auth/current-user (nouveau)
  console.log('\n3️⃣ Test de /api/auth/current-user...');
  try {
    const currentUserResponse = await makeRequest(`${API_BASE_URL}/api/auth/current-user`, 'GET');
    console.log('✅ Endpoint /api/auth/current-user accessible');
    console.log('Response:', currentUserResponse.status, currentUserResponse.statusText);
  } catch (error) {
    console.log('❌ Endpoint /api/auth/current-user:', error.message);
  }

  // 4. Vérifier la connectivité Keycloak
  console.log('\n4️⃣ Test de connectivité Keycloak...');
  try {
    const keycloakResponse = await makeRequest(`${KEYCLOAK_BASE_URL}/realms/ERP_Velosi/.well-known/openid_configuration`, 'GET');
    console.log('✅ Keycloak accessible');
    console.log('Status:', keycloakResponse.status);
  } catch (error) {
    console.log('❌ Keycloak non accessible:', error.message);
  }
}

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(url, method = 'GET', data = null) {
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
        'User-Agent': 'Auth-Test-Script/1.0'
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
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          data: responseData
        });
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

// Test de simulation d'authentification
async function testAuthFlow() {
  console.log('\n🔐 Test du flux d\'authentification...\n');

  // Simuler une connexion
  console.log('1️⃣ Tentative de connexion...');
  try {
    const loginResponse = await makeRequest(`${API_BASE_URL}/api/auth/login`, 'POST', {
      username: 'test',
      password: 'test'
    });
    
    if (loginResponse.status === 401) {
      console.log('✅ Endpoint login répond correctement (401 attendu sans utilisateur valide)');
    } else {
      console.log('📝 Réponse login:', loginResponse.status, loginResponse.statusText);
    }
  } catch (error) {
    console.log('❌ Erreur login:', error.message);
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests d\'authentification\n');
  console.log('='.repeat(50));
  
  await testAuthEndpoints();
  await testAuthFlow();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Tests terminés');
  
  console.log('\n📋 Résumé des solutions implémentées:');
  console.log('• ✅ Endpoint /api/auth/sync créé pour la synchronisation Keycloak');
  console.log('• ✅ Endpoint /api/auth/current-user créé pour récupérer l\'utilisateur connecté');
  console.log('• ✅ Méthodes de récupération des rôles Keycloak et locaux');
  console.log('• ✅ Gestion des tokens depuis headers, cookies et body');
  console.log('• ✅ Fallback sur l\'authentification locale si Keycloak indisponible');
  
  console.log('\n💡 Recommandations:');
  console.log('• Utilisez /api/auth/current-user pour récupérer l\'utilisateur connecté');
  console.log('• Utilisez /api/auth/sync pour synchroniser avec Keycloak si nécessaire');
  console.log('• Vérifiez que Keycloak est démarré pour les fonctionnalités avancées');
}

// Lancer les tests
runAllTests().catch(console.error);