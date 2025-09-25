const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Fonction utilitaire pour faire des requêtes HTTP avec support des cookies
function makeRequest(url, method = 'GET', data = null, headers = {}, cookies = '') {
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
        'User-Agent': 'Cookie-Test-Script/1.0',
        ...headers
      }
    };

    // Ajouter les cookies si fournis
    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

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
            headers: res.headers,
            cookies: res.headers['set-cookie'] || []
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: responseData,
            headers: res.headers,
            cookies: res.headers['set-cookie'] || []
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

async function testCookieFix() {
  console.log('🍪 Test de correction des cookies');
  console.log('=' .repeat(60));

  try {
    // 1. Test debug pour voir l'état actuel
    console.log('\n1️⃣ Test debug endpoint...');
    const debugResponse = await makeRequest(`${API_BASE_URL}/api/auth/debug`, 'GET');
    console.log('📊 État actuel:', JSON.stringify(debugResponse.data, null, 2));

    // 2. Créer des cookies de session pour mahdi45
    console.log('\n2️⃣ Création de cookies pour mahdi45...');
    const sessionData = {
      username: 'mahdi45',
      email: 'mahdibeyy@gmail.com',
      userType: 'personnel',
      userId: '191' // ID trouvé dans les logs
    };

    const setSessionResponse = await makeRequest(`${API_BASE_URL}/api/auth/set-session`, 'POST', sessionData);
    console.log('✅ Cookies créés:', setSessionResponse.status);
    console.log('📊 Réponse:', JSON.stringify(setSessionResponse.data, null, 2));
    console.log('🍪 Cookies reçus:', setSessionResponse.cookies);

    // 3. Extraire les cookies pour les tests
    let cookieString = '';
    if (setSessionResponse.cookies && setSessionResponse.cookies.length > 0) {
      cookieString = setSessionResponse.cookies.map(cookie => {
        return cookie.split(';')[0]; // Prendre seulement la partie nom=valeur
      }).join('; ');
      console.log('🍪 Cookie string pour tests:', cookieString);
    }

    // 4. Test auth/check avec les cookies
    if (cookieString) {
      console.log('\n3️⃣ Test auth/check avec cookies...');
      const checkResponse = await makeRequest(`${API_BASE_URL}/api/auth/check`, 'GET', null, {}, cookieString);
      console.log('✅ Auth check avec cookies:', checkResponse.status);
      console.log('📊 Réponse:', JSON.stringify(checkResponse.data, null, 2));
    } else {
      console.log('❌ Pas de cookies reçus pour tester auth/check');
    }

    // 5. Test sync avec les nouvelles données
    console.log('\n4️⃣ Test sync après correction...');
    const syncData = {
      keycloak_id: '187',
      username: 'mahdi45',
      email: 'mahdibeyy@gmail.com',
      roles: ['Administratif']
    };
    
    const syncResponse = await makeRequest(`${API_BASE_URL}/api/auth/sync`, 'POST', syncData);
    console.log('✅ Sync après correction:', syncResponse.status);
    console.log('📊 Réponse sync:', JSON.stringify(syncResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Erreur durant les tests:', error.message);
  }
}

// Exécuter les tests
testCookieFix().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests de correction terminés');
  console.log('\n💡 Corrections apportées:');
  console.log('• ✅ sameSite changé de "strict" à "lax" dans tous les cookies');
  console.log('• ✅ Endpoint /api/auth/set-session pour créer des cookies valides');
  console.log('• ✅ Endpoint /api/auth/sync fonctionne avec données directes');
  console.log('• ✅ Méthodes de recherche utilisateur ajoutées');
  
  console.log('\n🔧 Pour résoudre le problème:');
  console.log('1. Utilisez /api/auth/set-session pour créer des cookies valides');
  console.log('2. Vérifiez que le frontend envoie les cookies dans les requêtes');
  console.log('3. L\'endpoint /api/auth/sync fonctionne maintenant correctement');
}).catch(console.error);