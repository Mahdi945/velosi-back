/**
 * Script de test d'authentification Railway
 * Usage: node test-railway-auth.js
 */

const https = require('https');

const RAILWAY_URL = 'https://velosi-back-production.up.railway.app';
const TEST_USER = {
  username: 'ahmed',
  password: '87Eq8384'
};

console.log('========================================');
console.log('  Test Authentification Railway');
console.log('========================================\n');

// Test 1: Ping API
console.log('🏓 Test 1: Ping API Railway...');
https.get(`${RAILWAY_URL}/api`, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  console.log(`   ✅ API Railway accessible\n`);
  
  // Test 2: Login
  console.log('🔐 Test 2: Login avec ahmed...');
  
  const loginData = JSON.stringify({
    usernameOrEmail: TEST_USER.username,
    password: TEST_USER.password
  });
  
  const options = {
    hostname: 'velosi-back-production.up.railway.app',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length,
      'Origin': 'https://velosi-front.vercel.app'
    }
  };
  
  const req = https.request(options, (res) => {
    let data = '';
    
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Headers:`, res.headers);
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('\n📨 Réponse:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.access_token) {
          console.log('\n✅ LOGIN RÉUSSI!');
          console.log('🎫 Token reçu:', response.access_token.substring(0, 50) + '...');
          
          // Test 3: Requête authentifiée
          console.log('\n🧪 Test 3: Requête authentifiée (GET /api/users/clients)...');
          
          const authOptions = {
            hostname: 'velosi-back-production.up.railway.app',
            port: 443,
            path: '/api/users/clients',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${response.access_token}`,
              'Origin': 'https://velosi-front.vercel.app'
            }
          };
          
          https.get(authOptions, (clientsRes) => {
            let clientsData = '';
            
            console.log(`   Status: ${clientsRes.statusCode}`);
            
            clientsRes.on('data', (chunk) => {
              clientsData += chunk;
            });
            
            clientsRes.on('end', () => {
              if (clientsRes.statusCode === 200) {
                console.log('   ✅ Requête authentifiée réussie!');
                try {
                  const clients = JSON.parse(clientsData);
                  console.log(`   📊 Nombre de clients: ${clients.length || 0}`);
                } catch (e) {
                  console.log('   📄 Réponse:', clientsData.substring(0, 200));
                }
              } else {
                console.log('   ❌ Erreur:', clientsRes.statusCode);
                console.log('   📄 Réponse:', clientsData);
              }
              
              console.log('\n========================================');
              console.log('✅ Tests terminés');
              console.log('========================================');
            });
          }).on('error', (e) => {
            console.error('   ❌ Erreur requête clients:', e.message);
          });
          
        } else {
          console.log('\n❌ LOGIN ÉCHOUÉ - Pas de token reçu');
        }
      } catch (e) {
        console.error('❌ Erreur parsing JSON:', e.message);
        console.log('Réponse brute:', data);
      }
    });
  });
  
  req.on('error', (e) => {
    console.error('❌ Erreur login:', e.message);
  });
  
  req.write(loginData);
  req.end();
  
}).on('error', (e) => {
  console.error('❌ Erreur ping API:', e.message);
});
