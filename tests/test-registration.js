#!/usr/bin/env node

/**
 * Script de test pour vérifier l'enregistrement du personnel avec le champ genre
 */

const axios = require('axios');

async function testPersonnelRegistration() {
  const API_URL = 'http://localhost:3000';
  
  const personnelData = {
    nom: 'Doe',
    prenom: 'John',
    nom_utilisateur: 'johndoe_test_' + Date.now(),
    role: 'commercial',
    genre: 'Homme',
    email: `johndoe_test_${Date.now()}@test.com`,
    telephone: '20123456',
    mot_de_passe: 'Test123456!'
  };

  try {
    console.log('🧪 Test d\'enregistrement du personnel avec genre...');
    console.log('Données envoyées:', JSON.stringify(personnelData, null, 2));
    
    const response = await axios.post(`${API_URL}/auth/register/personnel`, personnelData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Succès! Réponse:', JSON.stringify(response.data, null, 2));
    
    if (response.data.user) {
      console.log('👤 Utilisateur créé:', response.data.user);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:');
    if (error.response) {
      console.error('Code de statut:', error.response.status);
      console.error('Données d\'erreur:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Erreur:', error.message);
    }
  }
}

async function testClientRegistration() {
  const API_URL = 'http://localhost:3000';
  
  const clientData = {
    nom: 'Entreprise Test ' + Date.now(),
    interlocuteur: 'Marie Dupont',
    adresse: '123 Rue Test',
    ville: 'Tunis',
    pays: 'Tunisie',
    contact_tel1: '20654321',
    contact_mail1: `entreprise_test_${Date.now()}@test.com`,
    mot_de_passe: 'Test123456!'
  };

  try {
    console.log('🧪 Test d\'enregistrement du client...');
    console.log('Données envoyées:', JSON.stringify(clientData, null, 2));
    
    const response = await axios.post(`${API_URL}/auth/register/client`, clientData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Succès! Réponse:', JSON.stringify(response.data, null, 2));
    
    if (response.data.user) {
      console.log('👤 Utilisateur créé:', response.data.user);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:');
    if (error.response) {
      console.error('Code de statut:', error.response.status);
      console.error('Données d\'erreur:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Erreur:', error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 Démarrage des tests d\'enregistrement...\n');
  
  // Test personnel
  await testPersonnelRegistration();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test client
  await testClientRegistration();
  
  console.log('\n✨ Tests terminés!');
}

// Exécuter les tests
runTests().catch(console.error);