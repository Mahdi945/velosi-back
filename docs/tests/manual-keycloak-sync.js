// Script simple pour tester la synchronisation Keycloak
import axios from 'axios';

const KEYCLOAK_CONFIG = {
  serverUrl: 'http://localhost:8080',
  realm: 'ERP_Velosi',
  clientId: 'velosi_auth',
  clientSecret: 'your-client-secret', // Remplacer par le vrai secret
  adminUsername: 'admin',
  adminPassword: 'admin'
};

async function getAdminToken() {
  try {
    const tokenUrl = `${KEYCLOAK_CONFIG.serverUrl}/realms/master/protocol/openid-connect/token`;
    
    const response = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: KEYCLOAK_CONFIG.adminUsername,
      password: KEYCLOAK_CONFIG.adminPassword,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    console.log('✅ Token admin obtenu');
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Erreur token admin:', error.response?.data || error.message);
    throw error;
  }
}

async function createUserInKeycloak(token, userData) {
  try {
    const baseUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}`;
    
    // Créer l'utilisateur
    const createResponse = await axios.post(`${baseUrl}/users`, userData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`✅ Utilisateur ${userData.username} créé dans Keycloak`);
    
    // Récupérer l'ID utilisateur depuis l'en-tête Location
    const locationHeader = createResponse.headers.location;
    if (locationHeader) {
      const userId = locationHeader.split('/').pop();
      console.log(`📝 ID utilisateur: ${userId}`);
      return userId;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Erreur création ${userData.username}:`, error.response?.data || error.message);
    return null;
  }
}

async function createRole(token, roleName) {
  try {
    const baseUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}`;
    
    const roleData = {
      name: roleName,
      description: `Rôle ${roleName} pour Velosi ERP`,
      composite: false,
      clientRole: false,
    };

    await axios.post(`${baseUrl}/roles`, roleData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`✅ Rôle ${roleName} créé`);
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`ℹ️ Rôle ${roleName} existe déjà`);
    } else {
      console.error(`❌ Erreur création rôle ${roleName}:`, error.response?.data || error.message);
    }
  }
}

async function assignRoleToUser(token, userId, roleName) {
  try {
    const baseUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}`;
    
    // Obtenir le rôle
    const roleResponse = await axios.get(`${baseUrl}/roles/${roleName}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const role = roleResponse.data;
    
    // Assigner le rôle
    await axios.post(`${baseUrl}/users/${userId}/role-mappings/realm`, [role], {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`✅ Rôle ${roleName} assigné à l'utilisateur ${userId}`);
  } catch (error) {
    console.error(`❌ Erreur assignation rôle ${roleName}:`, error.response?.data || error.message);
  }
}

async function main() {
  try {
    console.log('🚀 DÉBUT SYNCHRONISATION MANUELLE KEYCLOAK');
    
    // 1. Obtenir le token admin
    const token = await getAdminToken();
    
    // 2. Créer les rôles nécessaires
    const roles = ['Administratif', 'Commercial', 'Exploitation', 'Finance', 'Chauffeur', 'Client'];
    for (const role of roles) {
      await createRole(token, role);
    }
    
    // 3. Créer l'utilisateur mahdi45
    const mahdiUserData = {
      username: 'mahdi45',
      email: 'mahdi@velosi.com', // Remplacer par le vrai email
      firstName: 'Mahdi',
      lastName: 'Admin',
      enabled: true,
      emailVerified: true,
      credentials: [{
        type: 'password',
        value: 'admin123', // Mot de passe temporaire
        temporary: false
      }],
      attributes: {
        role: ['administratif'],
        userType: ['personnel']
      }
    };
    
    const mahdiUserId = await createUserInKeycloak(token, mahdiUserData);
    
    // 4. Assigner le rôle Administratif à mahdi45
    if (mahdiUserId) {
      await assignRoleToUser(token, mahdiUserId, 'Administratif');
    }
    
    console.log('✅ Synchronisation manuelle terminée');
    console.log('📋 Prochaines étapes:');
    console.log('1. Tester la connexion avec mahdi45 dans Keycloak');
    console.log('2. Vérifier que le rôle Administratif est bien assigné');
    console.log('3. Tester l\'authentification via l\'application');
    
  } catch (error) {
    console.error('💥 Erreur globale:', error);
  }
}

main();