// Test de création de client avec email
const axios = require('axios');

const testClientCreation = async () => {
  try {
    console.log('🧪 Test de création de client avec email...');
    
    const clientData = {
      nom: 'Test Client Email',
      interlocuteur: 'Test Interlocuteur',
      email: 'test@example.com', // Email principal
      type_client: 'entreprise',
      categorie: 'local',
      mot_de_passe: 'TestPassword123!',
      // Données de contact
      contact_tel1: '+216 71 123 456',
      contact_mail1: 'test@example.com',
      contact_fonction: 'Contact principal'
    };

    console.log('📤 Data envoyées:', JSON.stringify(clientData, null, 2));

    const response = await axios.post('http://localhost:3000/auth/register/client', clientData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Réponse:', response.data);
    console.log('📧 Email devrait être envoyé à:', clientData.contact_mail1);

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
};

testClientCreation();