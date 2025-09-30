const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const KEYCLOAK_URL = 'http://localhost:8080';
const REALM = 'ERP_Velosi';

// Données de test pour créer un utilisateur
const testUser = {
  nom: 'TestSync',
  prenom: 'Complete',
  nom_utilisateur: `test_sync_${Date.now()}`,
  role: 'employee',
  telephone: '+33123456789',
  email: `testsync${Date.now()}@velosi.com`,
  genre: 'Homme',
  mot_de_passe: 'SyncPassword123!'
};

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
      return { success: true, token: response.data.access_token };
    }
  } catch (error) {
    return { success: false, error: error.response?.status || error.message };
  }
}

async function getUserFromKeycloak(token, username) {
  try {
    const usersUrl = `${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}`;
    
    const response = await axios.get(usersUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200 && response.data.length > 0) {
      return response.data[0];
    }
  } catch (error) {
    console.log('Erreur récupération utilisateur Keycloak:', error.response?.status || error.message);
  }
  return null;
}

async function getAdminToken() {
  try {
    const tokenUrl = `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`;
    
    const response = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: 'admin',
      password: 'admin'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.status === 200) {
      return response.data.access_token;
    }
  } catch (error) {
    console.log('Erreur obtention token admin:', error.response?.status || error.message);
  }
  return null;
}

async function testCompleteSync() {
  console.log('🔄 Test de synchronisation complète avec Keycloak...\n');

  let createdUserId = null;
  let adminToken = null;

  try {
    // Obtenir un token admin pour interroger Keycloak
    console.log('🔑 Obtention du token admin Keycloak...');
    adminToken = await getAdminToken();
    if (!adminToken) {
      console.log('❌ Impossible d\'obtenir le token admin - arrêt du test');
      return;
    }
    console.log('✅ Token admin obtenu');

    // Étape 1: Créer un utilisateur
    console.log('\n📝 1. Création d\'un utilisateur...');
    console.log('Données utilisateur:', JSON.stringify(testUser, null, 2));
    
    const createResponse = await axios.post(`${API_BASE_URL}/api/users/personnel`, testUser);
    
    if (createResponse.status === 201) {
      const createdUser = createResponse.data;
      createdUserId = createdUser.id;
      console.log('✅ Utilisateur créé en base');
      console.log(`- ID: ${createdUser.id}`);
      console.log(`- Nom d'utilisateur: ${createdUser.nom_utilisateur}`);
      console.log(`- Keycloak ID: ${createdUser.keycloak_id || 'NULL - PROBLÈME!'}`);
      console.log(`- Statut: ${createdUser.statut}`);
      console.log(`- Rôle: ${createdUser.role}`);
      
      if (!createdUser.keycloak_id) {
        console.log('❌ ERREUR: keycloak_id est NULL - synchronisation échouée!');
        return;
      }

      // Vérifier dans Keycloak
      await new Promise(resolve => setTimeout(resolve, 1000));
      const keycloakUser = await getUserFromKeycloak(adminToken, createdUser.nom_utilisateur);
      if (keycloakUser) {
        console.log('✅ Utilisateur trouvé dans Keycloak');
        console.log(`- Enabled: ${keycloakUser.enabled}`);
        console.log(`- Email: ${keycloakUser.email}`);
      } else {
        console.log('❌ Utilisateur NON trouvé dans Keycloak!');
      }

      // Test de connexion initiale
      console.log('\n🔑 Test de connexion initiale...');
      const loginResult = await testKeycloakLogin(createdUser.nom_utilisateur, testUser.mot_de_passe);
      if (loginResult.success) {
        console.log('✅ Connexion réussie - mot de passe synchronisé');
      } else {
        console.log('❌ Connexion échouée:', loginResult.error);
      }

      // Étape 2: Modifier les informations utilisateur
      console.log('\n🔄 2. Modification des informations utilisateur...');
      const updateData = {
        email: `updated_${Date.now()}@velosi.com`,
        role: 'manager',
        telephone: '+33987654321'
      };
      
      const updateResponse = await axios.put(`${API_BASE_URL}/api/users/personnel/${createdUser.id}`, updateData);
      
      if (updateResponse.status === 200) {
        console.log('✅ Informations mises à jour en base');
        const updatedUser = updateResponse.data;
        console.log(`- Nouvel email: ${updatedUser.email}`);
        console.log(`- Nouveau rôle: ${updatedUser.role}`);
        
        // Vérifier la synchronisation dans Keycloak
        await new Promise(resolve => setTimeout(resolve, 1000));
        const updatedKeycloakUser = await getUserFromKeycloak(adminToken, createdUser.nom_utilisateur);
        if (updatedKeycloakUser && updatedKeycloakUser.email === updateData.email) {
          console.log('✅ Email synchronisé dans Keycloak');
        } else {
          console.log('❌ Email NON synchronisé dans Keycloak');
        }
      }

      // Étape 3: Tester la désactivation
      console.log('\n❌ 3. Test de désactivation...');
      const deactivateResponse = await axios.post(`${API_BASE_URL}/api/users/personnel/${createdUser.id}/deactivate`, {
        reason: 'Test de synchronisation'
      });
      
      if (deactivateResponse.status === 200) {
        console.log('✅ Utilisateur désactivé en base');
        
        // Vérifier dans Keycloak
        await new Promise(resolve => setTimeout(resolve, 1000));
        const disabledKeycloakUser = await getUserFromKeycloak(adminToken, createdUser.nom_utilisateur);
        if (disabledKeycloakUser && !disabledKeycloakUser.enabled) {
          console.log('✅ Utilisateur désactivé dans Keycloak');
        } else {
          console.log('❌ Utilisateur NON désactivé dans Keycloak');
        }
        
        // Test de connexion (doit échouer)
        const loginAfterDisable = await testKeycloakLogin(createdUser.nom_utilisateur, testUser.mot_de_passe);
        if (!loginAfterDisable.success) {
          console.log('✅ Connexion correctement bloquée après désactivation');
        } else {
          console.log('❌ Connexion encore possible après désactivation!');
        }
      }

      // Étape 4: Tester la réactivation
      console.log('\n✅ 4. Test de réactivation...');
      const reactivateResponse = await axios.post(`${API_BASE_URL}/api/users/personnel/${createdUser.id}/reactivate`);
      
      if (reactivateResponse.status === 200) {
        console.log('✅ Utilisateur réactivé en base');
        
        // Vérifier dans Keycloak
        await new Promise(resolve => setTimeout(resolve, 1000));
        const enabledKeycloakUser = await getUserFromKeycloak(adminToken, createdUser.nom_utilisateur);
        if (enabledKeycloakUser && enabledKeycloakUser.enabled) {
          console.log('✅ Utilisateur réactivé dans Keycloak');
        } else {
          console.log('❌ Utilisateur NON réactivé dans Keycloak');
        }
        
        // Test de connexion (doit réussir)
        const loginAfterEnable = await testKeycloakLogin(createdUser.nom_utilisateur, testUser.mot_de_passe);
        if (loginAfterEnable.success) {
          console.log('✅ Connexion rétablie après réactivation');
        } else {
          console.log('❌ Connexion impossible après réactivation');
        }
      }

      // Étape 5: Tester la suspension
      console.log('\n⏸️  5. Test de suspension...');
      const suspendResponse = await axios.post(`${API_BASE_URL}/api/users/personnel/${createdUser.id}/suspend`, {
        reason: 'Test de synchronisation suspension'
      });
      
      if (suspendResponse.status === 200) {
        console.log('✅ Utilisateur suspendu en base');
        
        // Vérifier dans Keycloak
        await new Promise(resolve => setTimeout(resolve, 1000));
        const suspendedKeycloakUser = await getUserFromKeycloak(adminToken, createdUser.nom_utilisateur);
        if (suspendedKeycloakUser && !suspendedKeycloakUser.enabled) {
          console.log('✅ Utilisateur suspendu dans Keycloak');
        } else {
          console.log('❌ Utilisateur NON suspendu dans Keycloak');
        }
      }

      console.log('\n🎉 Test de synchronisation complète terminé!');

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
testCompleteSync();