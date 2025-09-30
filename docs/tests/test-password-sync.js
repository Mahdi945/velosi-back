const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const KEYCLOAK_URL = 'http://localhost:8080';
const REALM = 'ERP_Velosi';

// Données de test pour créer un utilisateur
const testUser = {
  nom: 'TestPassword',
  prenom: 'User',
  nom_utilisateur: `test_password_${Date.now()}`,
  role: 'employee',
  telephone: '+33123456789',
  email: `testpwd${Date.now()}@velosi.com`,
  genre: 'Homme',
  mot_de_passe: 'InitialPassword123!'
};

const newPassword = 'UpdatedPassword456!';

async function testKeycloakLogin(username, password) {
  try {
    const tokenUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;
    
    const response = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'password',
      client_id: 'velosi_auth',
      client_secret: 'SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF',
      username: username,
      password: password
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.status === 200) {
      console.log('✅ Connexion Keycloak réussie avec le mot de passe');
      return true;
    }
  } catch (error) {
    console.log('❌ Échec de connexion Keycloak:', error.response?.status || error.message);
    return false;
  }
}

async function testPasswordSync() {
  console.log('🔐 Test de synchronisation des mots de passe avec Keycloak...\n');

  try {
    // Étape 1: Créer un utilisateur avec un mot de passe
    console.log('📝 Création d\'un utilisateur avec mot de passe...');
    console.log('Mot de passe initial:', testUser.mot_de_passe);
    
    const createResponse = await axios.post(`${API_BASE_URL}/api/users/personnel`, testUser);
    
    if (createResponse.status === 201) {
      const createdUser = createResponse.data;
      console.log('✅ Utilisateur créé avec succès!');
      console.log(`- Nom d'utilisateur: ${createdUser.nom_utilisateur}`);
      console.log(`- Keycloak ID: ${createdUser.keycloak_id || 'NULL - PROBLÈME!'}`);
      
      if (!createdUser.keycloak_id) {
        console.log('❌ ERREUR: keycloak_id est NULL - impossible de tester la synchronisation!');
        return;
      }

      // Attendre un peu pour que Keycloak traite la création
      console.log('\n⏳ Attente pour permettre à Keycloak de traiter la création...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Étape 2: Tester la connexion avec le mot de passe initial
      console.log('\n🔑 Test de connexion avec le mot de passe initial...');
      const initialLoginSuccess = await testKeycloakLogin(createdUser.nom_utilisateur, testUser.mot_de_passe);
      
      if (!initialLoginSuccess) {
        console.log('❌ Le mot de passe initial n\'a pas été synchronisé avec Keycloak!');
        return;
      }

      // Étape 3: Mettre à jour le mot de passe
      console.log('\n🔄 Mise à jour du mot de passe...');
      console.log('Nouveau mot de passe:', newPassword);
      
      const updatePasswordResponse = await axios.put(`${API_BASE_URL}/api/users/personnel/${createdUser.id}/password`, {
        newPassword: newPassword
      });
      
      if (updatePasswordResponse.status === 200) {
        console.log('✅ Mot de passe mis à jour avec succès en base!');
        
        // Attendre un peu pour que Keycloak traite la mise à jour
        console.log('\n⏳ Attente pour permettre à Keycloak de traiter la mise à jour...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Étape 4: Tester la connexion avec l'ancien mot de passe (doit échouer)
        console.log('\n❌ Test de connexion avec l\'ancien mot de passe (doit échouer)...');
        const oldLoginSuccess = await testKeycloakLogin(createdUser.nom_utilisateur, testUser.mot_de_passe);
        
        if (oldLoginSuccess) {
          console.log('⚠️  PROBLÈME: L\'ancien mot de passe fonctionne encore dans Keycloak!');
        } else {
          console.log('✅ Ancien mot de passe correctement invalidé dans Keycloak');
        }

        // Étape 5: Tester la connexion avec le nouveau mot de passe
        console.log('\n✅ Test de connexion avec le nouveau mot de passe...');
        const newLoginSuccess = await testKeycloakLogin(createdUser.nom_utilisateur, newPassword);
        
        if (newLoginSuccess) {
          console.log('🎉 SUCCÈS: Synchronisation complète des mots de passe avec Keycloak!');
        } else {
          console.log('❌ ÉCHEC: Le nouveau mot de passe n\'est pas synchronisé avec Keycloak!');
        }

      } else {
        console.log('❌ Erreur lors de la mise à jour du mot de passe:', updatePasswordResponse.status);
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
testPasswordSync();