const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Données de test pour créer un utilisateur
const testUser = {
  nom: 'Test',
  prenom: 'Utilisateur',
  nom_utilisateur: `test_user_${Date.now()}`,
  role: 'employee',
  telephone: '+33123456789',
  email: `test${Date.now()}@velosi.com`,
  genre: 'Homme',
  mot_de_passe: 'TestPassword123!'
};

async function testKeycloakSync() {
  console.log('🧪 Test de synchronisation Keycloak...\n');

  try {
    // Étape 1: Créer un utilisateur
    console.log('📝 Création d\'un nouvel utilisateur...');
    console.log('Données utilisateur:', JSON.stringify(testUser, null, 2));
    
    const createResponse = await axios.post(`${API_BASE_URL}/api/users/personnel`, testUser);
    
    if (createResponse.status === 201) {
      const createdUser = createResponse.data;
      console.log('✅ Utilisateur créé avec succès!');
      console.log('📋 Données de l\'utilisateur créé:');
      console.log(`- ID: ${createdUser.id}`);
      console.log(`- Nom d'utilisateur: ${createdUser.nom_utilisateur}`);
      console.log(`- Keycloak ID: ${createdUser.keycloak_id || 'NULL - PROBLÈME!'}`);
      console.log(`- Email: ${createdUser.email}`);
      console.log(`- Rôle: ${createdUser.role}`);
      
      if (!createdUser.keycloak_id) {
        console.log('❌ ERREUR: keycloak_id est NULL - la synchronisation a échoué!');
        return;
      }

      // Étape 2: Tester la modification
      console.log('\n🔄 Test de modification de l\'utilisateur...');
      const updateData = {
        email: `updated_${Date.now()}@velosi.com`,
        telephone: '+33987654321',
        role: 'manager'
      };
      
      console.log('Données de modification:', JSON.stringify(updateData, null, 2));
      
      const updateResponse = await axios.put(`${API_BASE_URL}/api/users/personnel/${createdUser.id}`, updateData);
      
      if (updateResponse.status === 200) {
        const updatedUser = updateResponse.data;
        console.log('✅ Utilisateur modifié avec succès!');
        console.log('📋 Données de l\'utilisateur modifié:');
        console.log(`- Email: ${updatedUser.email}`);
        console.log(`- Téléphone: ${updatedUser.telephone}`);
        console.log(`- Rôle: ${updatedUser.role}`);
        console.log(`- Keycloak ID: ${updatedUser.keycloak_id}`);
      } else {
        console.log('❌ Erreur lors de la modification:', updateResponse.status);
      }

      // Étape 3: Récupérer l'utilisateur pour vérifier
      console.log('\n🔍 Vérification des données finales...');
      const getResponse = await axios.get(`${API_BASE_URL}/api/users/personnel/${createdUser.id}`);
      
      if (getResponse.status === 200) {
        const finalUser = getResponse.data;
        console.log('📋 État final de l\'utilisateur:');
        console.log(`- ID: ${finalUser.id}`);
        console.log(`- Nom d'utilisateur: ${finalUser.nom_utilisateur}`);
        console.log(`- Keycloak ID: ${finalUser.keycloak_id}`);
        console.log(`- Email: ${finalUser.email}`);
        console.log(`- Rôle: ${finalUser.role}`);
        console.log(`- Statut: ${finalUser.statut}`);
        
        if (finalUser.keycloak_id) {
          console.log('✅ Synchronisation Keycloak réussie!');
        } else {
          console.log('❌ Synchronisation Keycloak échouée - keycloak_id manquant');
        }
      }

    } else {
      console.log('❌ Erreur lors de la création:', createResponse.status);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
  }
}

// Exécuter le test
testKeycloakSync();