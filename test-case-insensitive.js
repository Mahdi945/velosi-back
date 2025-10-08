// Test simple pour vérifier la sensibilité à la casse dans l'authentification
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testCaseInsensitiveAuth() {
  console.log('🧪 Test de l\'authentification insensible à la casse...\n');

  // Test avec différentes casses d'un même nom d'utilisateur
  const testCases = [
    { username: 'admin', description: 'minuscule' },
    { username: 'Admin', description: 'première lettre majuscule' },
    { username: 'ADMIN', description: 'tout en majuscule' },
    { username: 'AdMiN', description: 'casse mixte' }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`🔍 Test avec "${testCase.username}" (${testCase.description})...`);
      
      const response = await axios.post(`${API_URL}/auth/login`, {
        usernameOrEmail: testCase.username,
        password: 'motDePasseTest123' // Remplacez par un mot de passe valide de test
      }, {
        timeout: 5000,
        validateStatus: () => true // Accepter toutes les réponses
      });

      if (response.status === 200) {
        console.log(`  ✅ Succès: ${testCase.username} s'est connecté avec succès`);
        console.log(`  👤 Utilisateur: ${response.data.user?.username || response.data.user?.nom}`);
      } else if (response.status === 401) {
        console.log(`  ❌ Échec: ${testCase.username} - Identifiants invalides`);
      } else {
        console.log(`  ⚠️  Autre erreur: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('  🔴 Erreur: Serveur backend non accessible');
        break;
      } else {
        console.log(`  ❌ Erreur: ${error.message}`);
      }
    }
    
    console.log(''); // Ligne vide pour la lisibilité
  }

  console.log('🏁 Test terminé.');
}

// Exécuter le test
testCaseInsensitiveAuth().catch(console.error);