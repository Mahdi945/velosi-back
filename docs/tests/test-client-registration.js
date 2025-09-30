// Test de création de client avec contact
const axios = require('axios');

const testClientRegistration = async () => {
  try {
    const clientData = {
      nom: 'Test Company INTERLOCUTEUR 2024',
      mot_de_passe: 'test123456',
      contact_tel1: '20123456',
      contact_mail1: 'test@company.com',
      interlocuteur: 'John Doe',
      adresse: '123 Test Street',
      ville: 'Tunis',
      pays: 'Tunisie'
    };

    console.log('Données envoyées:', JSON.stringify(clientData, null, 2));

    const response = await axios.post('http://localhost:3000/api/auth/register/client', clientData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('Réponse reçue:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
};

testClientRegistration();
