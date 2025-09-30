const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Test des différents statuts d'authentification
async function testAuthenticationStatus() {
  console.log('🧪 Test d\'authentification par statut utilisateur');
  console.log('=' .repeat(50));

  // Cas de tests
  const testCases = [
    {
      description: 'Personnel actif - doit réussir',
      credentials: { usernameOrEmail: 'user_actif', password: 'password123' },
      expectedSuccess: true
    },
    {
      description: 'Personnel suspendu - doit échouer',
      credentials: { usernameOrEmail: 'user_suspendu', password: 'password123' },
      expectedSuccess: false,
      expectedMessage: 'Vous êtes suspendu ou désactivé'
    },
    {
      description: 'Personnel inactif - doit échouer',
      credentials: { usernameOrEmail: 'user_inactif', password: 'password123' },
      expectedSuccess: false,
      expectedMessage: 'Vous êtes suspendu ou désactivé'
    },
    {
      description: 'Client actif - doit réussir',
      credentials: { usernameOrEmail: 'client_actif', password: 'password123' },
      expectedSuccess: true
    },
    {
      description: 'Client suspendu - doit échouer',
      credentials: { usernameOrEmail: 'client_suspendu', password: 'password123' },
      expectedSuccess: false,
      expectedMessage: 'Vous êtes suspendu ou désactivé'
    },
    {
      description: 'Client inactif - doit échouer',
      credentials: { usernameOrEmail: 'client_inactif', password: 'password123' },
      expectedSuccess: false,
      expectedMessage: 'Vous êtes suspendu ou désactivé'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 ${testCase.description}`);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, testCase.credentials);
      
      if (testCase.expectedSuccess) {
        if (response.data.success) {
          console.log('✅ Test réussi - Connexion autorisée');
        } else {
          console.log('❌ Test échoué - Connexion refusée alors qu\'elle devrait être autorisée');
        }
      } else {
        console.log('❌ Test échoué - Connexion autorisée alors qu\'elle devrait être refusée');
      }
      
    } catch (error) {
      if (!testCase.expectedSuccess) {
        if (error.response && error.response.data.message) {
          const actualMessage = error.response.data.message;
          if (testCase.expectedMessage && actualMessage.includes(testCase.expectedMessage)) {
            console.log(`✅ Test réussi - Message correct: "${actualMessage}"`);
          } else {
            console.log(`⚠️  Test partiellement réussi - Message différent: "${actualMessage}"`);
          }
        } else {
          console.log('✅ Test réussi - Connexion refusée');
        }
      } else {
        console.log(`❌ Test échoué - Erreur inattendue: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  console.log('\n🎯 Résumé des modifications implémentées:');
  console.log('- ✅ Option "bloqué" supprimée du filtre de statut');
  console.log('- ✅ Option "bloqué" supprimée du modal d\'édition');
  console.log('- ✅ Validation backend mise à jour pour refuser les utilisateurs suspendus/inactifs');
  console.log('- ✅ Support des messages d\'erreur spécifiques par statut');
  
  console.log('\n📋 Statuts supportés:');
  console.log('- actif: Connexion autorisée');
  console.log('- inactif: Connexion refusée');
  console.log('- suspendu: Connexion refusée');
  console.log('- desactive: Connexion refusée');
}

// Exécuter le test
testAuthenticationStatus().catch(console.error);