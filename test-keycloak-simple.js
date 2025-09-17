#!/usr/bin/env node

// Script de test simple pour Keycloak
console.log('🔍 Test de Keycloak...\n');

const http = require('http');
const { URL } = require('url');

const KEYCLOAK_URL = 'http://localhost:8080';

function httpRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testKeycloak() {
  try {
    console.log('📡 Test de connectivité Keycloak...');
    const response = await httpRequest(`${KEYCLOAK_URL}/realms/master/.well-known/openid_connect_configuration`);
    
    if (response.status === 200) {
      console.log('✅ Keycloak est accessible sur le port 8080');
      const config = JSON.parse(response.data);
      console.log(`   Issuer: ${config.issuer}`);
      console.log(`   Authorization endpoint: ${config.authorization_endpoint}`);
      console.log(`   Token endpoint: ${config.token_endpoint}`);
    } else {
      console.log(`❌ Keycloak répond mais avec le status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Keycloak n\'est pas accessible:', error.message);
    console.log('💡 Solution: Démarrez Keycloak avec Docker:');
    console.log('   docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=87Eq8384 quay.io/keycloak/keycloak:latest start-dev');
  }
  
  console.log('\n🎯 Test terminé!');
}

if (require.main === module) {
  testKeycloak().catch(console.error);
}
