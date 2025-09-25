const axios = require('axios');

async function testPhoneValidation() {
  try {
    console.log('🧪 Test des validations de téléphone');
    console.log('==================================================\n');

    // 1. Test avec un téléphone trop court
    console.log('1️⃣ Test téléphone trop court (moins de 8 chiffres)...');
    try {
      const shortPhoneResponse = await axios.post('http://localhost:3000/api/users/personnel', {
        nom: 'Test',
        prenom: 'User',
        nom_utilisateur: 'testuser1',
        role: 'commercial',
        telephone: '123456', // Seulement 6 chiffres
        email: 'test1@example.com',
        genre: 'Homme',
        mot_de_passe: 'password123'
      }, {
        headers: {
          'Authorization': 'Bearer ' + 'your-token-here' // Remplacer par un vrai token
        }
      });
      console.log('❌ Test échoué: le téléphone court devrait être rejeté');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Téléphone court correctement rejeté:', error.response.data.message);
      } else {
        console.log('❌ Erreur inattendue:', error.response?.status, error.response?.data);
      }
    }

    // 2. Test avec un téléphone valide
    console.log('\n2️⃣ Test téléphone valide...');
    try {
      const validPhoneResponse = await axios.post('http://localhost:3000/api/users/personnel', {
        nom: 'Test',
        prenom: 'User',
        nom_utilisateur: 'testuser2',
        role: 'commercial',
        telephone: '+33123456789', // Téléphone valide
        email: 'test2@example.com',
        genre: 'Homme',
        mot_de_passe: 'password123'
      }, {
        headers: {
          'Authorization': 'Bearer ' + 'your-token-here' // Remplacer par un vrai token
        }
      });
      console.log('✅ Téléphone valide accepté:', validPhoneResponse.status);
    } catch (error) {
      console.log('❌ Erreur inattendue pour téléphone valide:', error.response?.status, error.response?.data);
    }

    // 3. Test avec le même téléphone (doit être rejeté)
    console.log('\n3️⃣ Test téléphone en doublon...');
    try {
      const duplicatePhoneResponse = await axios.post('http://localhost:3000/api/users/personnel', {
        nom: 'Test2',
        prenom: 'User2',
        nom_utilisateur: 'testuser3',
        role: 'commercial',
        telephone: '+33123456789', // Même téléphone
        email: 'test3@example.com',
        genre: 'Femme',
        mot_de_passe: 'password123'
      }, {
        headers: {
          'Authorization': 'Bearer ' + 'your-token-here' // Remplacer par un vrai token
        }
      });
      console.log('❌ Test échoué: le téléphone en doublon devrait être rejeté');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Téléphone en doublon correctement rejeté:', error.response.data.message);
      } else {
        console.log('❌ Erreur inattendue:', error.response?.status, error.response?.data);
      }
    }

    // 4. Test avec format invalide
    console.log('\n4️⃣ Test téléphone avec format invalide...');
    try {
      const invalidFormatResponse = await axios.post('http://localhost:3000/api/users/personnel', {
        nom: 'Test3',
        prenom: 'User3',
        nom_utilisateur: 'testuser4',
        role: 'commercial',
        telephone: 'abcd1234', // Format invalide
        email: 'test4@example.com',
        genre: 'Homme',
        mot_de_passe: 'password123'
      }, {
        headers: {
          'Authorization': 'Bearer ' + 'your-token-here' // Remplacer par un vrai token
        }
      });
      console.log('❌ Test échoué: le format invalide devrait être rejeté');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Format invalide correctement rejeté:', error.response.data.message);
      } else {
        console.log('❌ Erreur inattendue:', error.response?.status, error.response?.data);
      }
    }

  } catch (error) {
    console.log('❌ Erreur générale:', error.message);
  }
}

console.log('⚠️  Pour tester ces validations, vous devez:');
console.log('1. Remplacer "your-token-here" par un vrai token d\'authentification');
console.log('2. S\'assurer que le serveur backend est démarré');
console.log('3. Avoir les droits pour créer du personnel');
console.log('\nNe pas exécuter ce test tel quel - il est juste pour démonstration\n');

// testPhoneValidation();