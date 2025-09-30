#!/usr/bin/env node

// Script de vérification Keycloak - Velosi ERP
// Version simplifiée sans dépendances externes

const https = require('https');
const http = require('http');
const { URL } = require('url');

const KEYCLOAK_URL = 'http://localhost:8080';
const REALM = 'ERP_Velosi';
const CLIENT_ID = 'velosi_auth';
const CLIENT_SECRET = 'SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF';

// Fonction utilitaire pour faire des requêtes HTTP
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    
    const req = lib.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: jsonData, text: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, text: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function checkKeycloak() {
  console.log('🔍 Vérification de Keycloak...\n');

  // Test 1: Vérifier si Keycloak est démarré
  console.log('📡 Test 1: Connectivité Keycloak...');
  try {
    const response = await httpRequest(`${KEYCLOAK_URL}/realms/master/.well-known/openid_connect_configuration`);
    if (response.status === 200) {
      console.log('✅ Keycloak est accessible');
      console.log(`   Issuer: ${response.data.issuer}`);
    } else {
      throw new Error(`Status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Keycloak n\'est pas accessible:', error.message);
    console.log('💡 Solution: Démarrez Keycloak avec Docker');
    console.log('   docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:latest start-dev');
    return;
  }

  // Test 2: Authentification avec client secret
  console.log('\n🔑 Test 2: Authentification client...');
  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }).toString();
    
    const tokenResponse = await httpRequest(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body
    });
    
    if (tokenResponse.status === 200) {
      console.log('✅ Authentification client réussie');
      console.log(`   Token type: ${tokenResponse.data.token_type}`);
      console.log(`   Expires in: ${tokenResponse.data.expires_in}s`);
      
      const clientToken = tokenResponse.data.access_token;

      // Test 3: Vérifier le realm ERP_Velosi
      console.log('\n🏰 Test 3: Vérification du realm ERP_Velosi...');
      const realmResponse = await httpRequest(`${KEYCLOAK_URL}/realms/${REALM}/.well-known/openid_connect_configuration`, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
      });
      
      if (realmResponse.status === 200) {
        console.log('✅ Realm ERP_Velosi accessible');
        console.log(`   Issuer: ${realmResponse.data.issuer}`);
        console.log(`   Token endpoint: ${realmResponse.data.token_endpoint}`);
      } else if (realmResponse.status === 404) {
        console.log('⚠️  Realm ERP_Velosi n\'existe pas');
        console.log('💡 Solution: Créez le realm ERP_Velosi dans l\'interface admin Keycloak');
        console.log('   URL: http://localhost:8080/admin');
      } else {
        console.log(`❌ Erreur realm: Status ${realmResponse.status}`);
      }
      
    } else {
      console.log('❌ Échec authentification client');
      console.log(`   Status: ${tokenResponse.status}`);
      console.log(`   Message: ${tokenResponse.text}`);
      console.log('💡 Vérifiez le client secret dans votre fichier .env');
      console.log('💡 Assurez-vous que le client velosi_auth existe dans le realm ERP_Velosi');
    }
    
  } catch (error) {
    console.log('❌ Erreur lors de l\'authentification:', error.message);
  }

  console.log('\n🎯 Vérification terminée!');
  
  // Résumé des solutions
  console.log('\n📋 Solutions possibles:');
  console.log('1. Vérifier que Keycloak est démarré sur le port 8080');
  console.log('2. Créer le realm ERP_Velosi manuellement');
  console.log('3. Créer le client velosi_auth dans le realm avec le bon client secret');
  console.log('4. Vérifier que le client secret correspond à celui du fichier .env');
  console.log('5. Ou désactiver Keycloak temporairement: KEYCLOAK_ENABLED=false');
}

// Exécuter la vérification
if (require.main === module) {
  checkKeycloak().catch(console.error);
}

module.exports = { checkKeycloak };
