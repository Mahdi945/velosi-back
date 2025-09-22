#!/usr/bin/env node

// Script de vérification Keycloak - Velosi ERP
// Ce script teste la connectivité et la configuration Keycloak

const https = require('https');
const http = require('http');
const { URL } = require('url');

const KEYCLOAK_URL = 'http://localhost:8080';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '87Eq8384';

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
    console.log('✅ Keycloak est accessible'.green);
    console.log(`   Issuer: ${response.data.issuer}`);
  } catch (error) {
    console.log('❌ Keycloak n\'est pas accessible:'.red, error.message);
    console.log('💡 Solution: Démarrez Keycloak avec: docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=87Eq8384 quay.io/keycloak/keycloak:latest start-dev'.blue);
    return;
  }

  // Test 2: Authentification admin
  console.log('\n🔑 Test 2: Authentification admin...'.yellow);
  try {
    const tokenResponse = await axios.post(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, 
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    console.log('✅ Authentification admin réussie'.green);
    console.log(`   Token type: ${tokenResponse.data.token_type}`);
    console.log(`   Expires in: ${tokenResponse.data.expires_in}s`);
    
    const adminToken = tokenResponse.data.access_token;

    // Test 3: Vérifier le realm ERP_Velosi
    console.log('\n🏰 Test 3: Vérification du realm ERP_Velosi...'.yellow);
    try {
      const realmResponse = await axios.get(`${KEYCLOAK_URL}/admin/realms/ERP_Velosi`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      console.log('✅ Realm ERP_Velosi existe'.green);
      console.log(`   Nom: ${realmResponse.data.displayName || realmResponse.data.realm}`);
      console.log(`   Activé: ${realmResponse.data.enabled}`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('⚠️  Realm ERP_Velosi n\'existe pas'.orange);
        console.log('💡 Solution: Créez le realm ERP_Velosi dans l\'interface admin Keycloak'.blue);
        
        // Essayer de créer le realm
        console.log('\n🔨 Tentative de création du realm...'.cyan);
        try {
          await axios.post(`${KEYCLOAK_URL}/admin/realms`, {
            realm: 'ERP_Velosi',
            displayName: 'Velosi ERP',
            enabled: true,
          }, {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
          });
          console.log('✅ Realm ERP_Velosi créé avec succès'.green);
        } catch (createError) {
          console.log('❌ Échec de création du realm:'.red, createError.response?.data?.errorMessage || createError.message);
        }
      } else {
        console.log('❌ Erreur lors de la vérification du realm:'.red, error.response?.data?.errorMessage || error.message);
      }
    }

    // Test 4: Vérifier le client velosi_auth
    console.log('\n🔧 Test 4: Vérification du client velosi_auth...'.yellow);
    try {
      const clientsResponse = await axios.get(`${KEYCLOAK_URL}/admin/realms/ERP_Velosi/clients?clientId=velosi_auth`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      
      if (clientsResponse.data.length > 0) {
        console.log('✅ Client velosi_auth existe'.green);
        console.log(`   ID: ${clientsResponse.data[0].id}`);
        console.log(`   Activé: ${clientsResponse.data[0].enabled}`);
      } else {
        console.log('⚠️  Client velosi_auth n\'existe pas'.orange);
        console.log('💡 Solution: Créez le client velosi_auth dans le realm ERP_Velosi'.blue);
      }
    } catch (error) {
      console.log('❌ Erreur lors de la vérification du client:'.red, error.response?.data?.errorMessage || error.message);
    }
    
  } catch (error) {
    console.log('❌ Échec authentification admin:'.red);
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Message: ${error.response?.data?.error_description || error.message}`);
    console.log('💡 Vérifiez les identifiants admin dans votre fichier .env'.blue);
    console.log('💡 Identifiants par défaut: admin/admin'.blue);
  }

  console.log('\n🎯 Vérification terminée!'.cyan.bold);
}

// Exécuter la vérification
if (require.main === module) {
  checkKeycloak().catch(console.error);
}

module.exports = { checkKeycloak };
