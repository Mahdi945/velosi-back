const axios = require('axios');

async function testPersonnelCreation() {
  try {
    console.log('Test de création de personnel...');
    
    const newPersonnel = {
      nom: 'TestUser',
      prenom: 'Test',
      nom_utilisateur: 'testuser_' + Date.now(),
      role: 'commercial', // Changé pour un rôle valide
      telephone: '0123456789',
      email: 'testuser' + Date.now() + '@example.com',
      mot_de_passe: 'Password123!',
    };

    console.log('Données à envoyer:', newPersonnel);

    const response = await axios.post('http://localhost:3000/api/auth/register/personnel', newPersonnel, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    console.log('✅ Succès:', response.data);
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testPersonnelCreation();
