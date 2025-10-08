#!/usr/bin/env node

/**
 * Script de test pour l'API CRM - Prospects
 * Ce script teste directement les endpoints de l'API
 */

const http = require('http');

const API_CONFIG = {
  host: 'localhost',
  port: 3000,
  timeout: 5000
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ statusCode: res.statusCode, body: response });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(API_CONFIG.timeout, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAPI() {
  console.log('🚀 Test de l\'API CRM - Prospects');
  console.log('================================');

  try {
    // Test 1: Obtenir tous les prospects
    console.log('📊 Test 1: GET /api/crm/leads');
    const getOptions = {
      hostname: API_CONFIG.host,
      port: API_CONFIG.port,
      path: '/api/crm/leads',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const getResponse = await makeRequest(getOptions);
    console.log(`Status: ${getResponse.statusCode}`);
    console.log('Response:', JSON.stringify(getResponse.body, null, 2));

    // Test 2: Obtenir les statistiques
    console.log('\n📈 Test 2: GET /api/crm/leads/stats');
    const statsOptions = {
      hostname: API_CONFIG.host,
      port: API_CONFIG.port,
      path: '/api/crm/leads/stats',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const statsResponse = await makeRequest(statsOptions);
    console.log(`Status: ${statsResponse.statusCode}`);
    console.log('Response:', JSON.stringify(statsResponse.body, null, 2));

    // Test 3: Créer un prospect
    console.log('\n➕ Test 3: POST /api/crm/leads');
    const testProspect = {
      fullName: "Test Prospect " + Date.now(),
      email: `test${Date.now()}@example.tn`,
      phone: "+216 20 123 456",
      company: "Test Company",
      source: "website",
      status: "new",
      priority: "medium",
      country: "TUN",
      isLocal: true
    };

    const postOptions = {
      hostname: API_CONFIG.host,
      port: API_CONFIG.port,
      path: '/api/crm/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const postResponse = await makeRequest(postOptions, testProspect);
    console.log(`Status: ${postResponse.statusCode}`);
    console.log('Response:', JSON.stringify(postResponse.body, null, 2));

    console.log('\n✅ Tests terminés');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    console.log('Vérifiez que le serveur backend est démarré sur http://localhost:3000');
  }
}

// Exécuter les tests
testAPI();