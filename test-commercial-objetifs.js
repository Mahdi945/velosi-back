const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Données de test pour créer un commercial avec objectifs
const testCommercial = {
  nom: 'Commercial',
  prenom: 'Test',
  nom_utilisateur: `commercial_${Date.now()}`,
  role: 'commercial',
  telephone: '+33123456789',
  email: `commercial${Date.now()}@velosi.com`,
  genre: 'Homme',
  mot_de_passe: 'CommercialPassword123!',
  // Objectifs commerciaux
  objectif_titre: 'Objectif Test Commercial',
  objectif_ca: 50000,
  objectif_clients: 10,
  objectif_date_fin: '2025-12-31',
  objectif_description: 'Objectif de test pour validation du système'
};

async function testCommercialCreation() {
  console.log('🎯 Test de création d\'un commercial avec objectifs...\n');

  try {
    // Créer le commercial avec objectifs
    console.log('📝 Création d\'un commercial avec objectifs...');
    console.log('Données du commercial:', JSON.stringify(testCommercial, null, 2));
    
    const createResponse = await axios.post(`${API_BASE_URL}/api/users/personnel`, testCommercial);
    
    if (createResponse.status === 201) {
      const createdUser = createResponse.data;
      console.log('✅ Commercial créé avec succès!');
      console.log(`- ID: ${createdUser.id}`);
      console.log(`- Nom d'utilisateur: ${createdUser.nom_utilisateur}`);
      console.log(`- Rôle: ${createdUser.role}`);
      console.log(`- Keycloak ID: ${createdUser.keycloak_id || 'NULL'}`);

      // Vérifier si les objectifs ont été créés
      console.log('\n🔍 Vérification des objectifs créés...');
      try {
        const objectifsResponse = await axios.get(`${API_BASE_URL}/api/objectifs-commerciaux/personnel/${createdUser.id}`);
        
        if (objectifsResponse.status === 200) {
          const objectifs = objectifsResponse.data;
          console.log('📊 Objectifs trouvés:', objectifs.length);
          
          if (objectifs.length > 0) {
            console.log('✅ Objectifs commerciaux créés avec succès!');
            objectifs.forEach((obj, index) => {
              console.log(`\n📋 Objectif ${index + 1}:`);
              console.log(`- Titre: ${obj.titre}`);
              console.log(`- CA Objectif: ${obj.objectif_ca}€`);
              console.log(`- Clients Objectif: ${obj.objectif_clients}`);
              console.log(`- Date fin: ${obj.date_fin}`);
              console.log(`- Statut: ${obj.statut}`);
              console.log(`- Description: ${obj.description}`);
            });
          } else {
            console.log('❌ PROBLÈME: Aucun objectif trouvé pour ce commercial!');
          }
        }
      } catch (error) {
        console.log('❌ Erreur lors de la récupération des objectifs:', error.response?.status || error.message);
        if (error.response?.data) {
          console.log('Détails:', error.response.data);
        }
      }

      // Test avec un personnel non-commercial (ne doit pas créer d'objectifs)
      console.log('\n👔 Test avec un personnel non-commercial...');
      const testEmployee = {
        ...testCommercial,
        nom_utilisateur: `employee_${Date.now()}`,
        role: 'employee',
        email: `employee${Date.now()}@velosi.com`,
        objectif_titre: 'Objectif qui ne devrait pas être créé'
      };

      const employeeResponse = await axios.post(`${API_BASE_URL}/api/users/personnel`, testEmployee);
      
      if (employeeResponse.status === 201) {
        const createdEmployee = employeeResponse.data;
        console.log('✅ Employé créé avec succès');
        
        // Vérifier qu'aucun objectif n'a été créé
        try {
          const employeeObjectifsResponse = await axios.get(`${API_BASE_URL}/api/objectifs-commerciaux/personnel/${createdEmployee.id}`);
          
          if (employeeObjectifsResponse.status === 200) {
            const employeeObjectifs = employeeObjectifsResponse.data;
            if (employeeObjectifs.length === 0) {
              console.log('✅ Correct: Aucun objectif créé pour un employé non-commercial');
            } else {
              console.log('⚠️  ATTENTION: Des objectifs ont été créés pour un employé non-commercial!');
            }
          }
        } catch (error) {
          if (error.response?.status === 404) {
            console.log('✅ Correct: Aucun objectif trouvé pour l\'employé non-commercial');
          } else {
            console.log('❌ Erreur lors de la vérification des objectifs employé:', error.message);
          }
        }
      }

    } else {
      console.log('❌ Erreur lors de la création du commercial:', createResponse.status);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
  }
}

// Exécuter le test
testCommercialCreation();