const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Données de test pour se connecter
const loginData = {
  username: 'mahdi45',
  password: 'mahdi45' // Remplacez par le vrai mot de passe
};

// Données de test pour créer un commercial avec objectifs
const testCommercial = {
  nom: 'Commercial',
  prenom: 'Test',
  nom_utilisateur: `commercial_${Date.now()}`,
  role: 'commercial',
  telephone: '+33123456789',
  email: `commercial${Date.now()}@velosi.com`,
  genre: 'Homme',
  mot_de_passe: 'CommercialTest123!',
  // Champs objectifs
  objectif_titre: 'Augmenter le CA de 20%',
  objectif_description: 'Objectif de croissance pour le trimestre',
  objectif_ca: 150000,
  objectif_clients: 25,
  objectif_date_fin: '2025-12-31'
};

async function testCommercialWithAuth() {
  console.log('🎯 Test de création d\'un commercial avec authentification...\n');

  try {
    // Étape 1: Se connecter pour obtenir un token
    console.log('🔑 Connexion pour obtenir un token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, loginData);
    
    if (loginResponse.status === 200) {
      console.log('✅ Connexion réussie');
      
      // Extraire le token des cookies ou de la réponse
      const cookies = loginResponse.headers['set-cookie'];
      let cookieHeader = '';
      if (cookies) {
        cookieHeader = cookies.join('; ');
        console.log('🍪 Cookies reçus');
      }

      // Étape 2: Créer le commercial avec objectifs
      console.log('\n📝 Création du commercial avec objectifs...');
      console.log('Données envoyées:', JSON.stringify(testCommercial, null, 2));
      
      const createResponse = await axios.post(`${API_BASE_URL}/api/users/personnel`, testCommercial, {
        headers: {
          'Cookie': cookieHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (createResponse.status === 201) {
        const createdCommercial = createResponse.data;
        console.log('✅ Commercial créé avec succès!');
        console.log('📋 Données du commercial créé:');
        console.log(`- ID: ${createdCommercial.id}`);
        console.log(`- Nom d'utilisateur: ${createdCommercial.nom_utilisateur}`);
        console.log(`- Rôle: ${createdCommercial.role}`);
        console.log(`- Email: ${createdCommercial.email}`);
        
        // Étape 3: Vérifier si les objectifs ont été créés
        console.log('\n🎯 Vérification des objectifs créés...');
        
        const objectifsResponse = await axios.get(`${API_BASE_URL}/api/objectifs-commerciaux/personnel/${createdCommercial.id}`, {
          headers: {
            'Cookie': cookieHeader
          }
        });
        
        if (objectifsResponse.status === 200) {
          const objectifs = objectifsResponse.data;
          console.log(`📊 Nombre d'objectifs trouvés: ${objectifs.length}`);
          
          if (objectifs.length > 0) {
            console.log('✅ Objectifs créés avec succès!');
            objectifs.forEach((obj, index) => {
              console.log(`Objectif ${index + 1}:`);
              console.log(`- Titre: ${obj.titre}`);
              console.log(`- Description: ${obj.description}`);
              console.log(`- CA Objectif: ${obj.objectif_ca}`);
              console.log(`- Clients Objectif: ${obj.objectif_clients}`);
              console.log(`- Date fin: ${obj.date_fin}`);
              console.log(`- Statut: ${obj.statut}`);
            });
          } else {
            console.log('❌ PROBLÈME: Aucun objectif créé pour ce commercial!');
            console.log('📋 Données du commercial final:', JSON.stringify(createdCommercial, null, 2));
            
            // Debugger: vérifier les logs du serveur pour voir ce qui s'est passé
            console.log('\n🔍 Vérifiez les logs du serveur pour voir si:');
            console.log('1. La condition objectif_titre est remplie');
            console.log('2. Le rôle est bien "commercial"');
            console.log('3. Il y a des erreurs lors de la création d\'objectif');
          }
        } else {
          console.log('❌ Erreur lors de la récupération des objectifs:', objectifsResponse.status);
        }
        
      } else {
        console.log('❌ Erreur lors de la création du commercial:', createResponse.status);
      }
      
    } else {
      console.log('❌ Erreur de connexion:', loginResponse.status);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
      console.error('Status:', error.response.status);
    }
  }
}

// Exécuter le test
testCommercialWithAuth();