import axios from 'axios';
import { Pool } from 'pg';

// Configuration Keycloak et base de données
const KEYCLOAK_CONFIG = {
  serverUrl: 'http://localhost:8080',
  realm: 'ERP_Velosi',
  adminUsername: 'admin',
  adminPassword: '87Eq8384',
  adminClientId: 'admin-cli'
};

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'msp',
  password: '87Eq8384',
  database: 'velosi'
};

// Rôles autorisés pour le personnel
const PERSONNEL_ROLES = ['commercial', 'administratif', 'chauffeur', 'finance', 'exploitation'];

class SimpleKeycloakSync {
  private adminToken: string | null = null;
  private dbPool: Pool;

  constructor() {
    this.dbPool = new Pool(DB_CONFIG);
  }

  // Obtenir le token admin
  async getAdminToken(): Promise<string> {
    if (this.adminToken) {
      return this.adminToken;
    }

    try {
      const response = await axios.post(
        `${KEYCLOAK_CONFIG.serverUrl}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: KEYCLOAK_CONFIG.adminClientId,
          username: KEYCLOAK_CONFIG.adminUsername,
          password: KEYCLOAK_CONFIG.adminPassword,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.adminToken = response.data.access_token;
      console.log('✅ Token admin Keycloak obtenu');
      return this.adminToken;
    } catch (error) {
      console.error('❌ Erreur token admin:', error.response?.data || error.message);
      throw error;
    }
  }

  // Créer ou vérifier qu'un rôle existe
  async ensureRoleExists(roleName: string): Promise<void> {
    try {
      const token = await this.getAdminToken();
      
      // Vérifier si le rôle existe
      await axios.get(
        `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles/${roleName}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      
      console.log(`✅ Rôle '${roleName}' existe déjà`);
    } catch (error) {
      if (error.response?.status === 404) {
        // Le rôle n'existe pas, le créer
        try {
          const token = await this.getAdminToken();
          await axios.post(
            `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles`,
            {
              name: roleName,
              description: `Rôle ${roleName} pour l'application Velosi`
            },
            {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
            }
          );
          console.log(`✅ Rôle '${roleName}' créé`);
        } catch (createError) {
          console.error(`❌ Erreur création rôle ${roleName}:`, createError.response?.data || createError.message);
        }
      } else {
        console.error(`❌ Erreur vérification rôle ${roleName}:`, error.response?.data || error.message);
      }
    }
  }

  // Créer un utilisateur dans Keycloak
  async createKeycloakUser(userData: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: 'personnel' | 'client';
    role?: string;
    enabled?: boolean;
  }): Promise<string | null> {
    try {
      const token = await this.getAdminToken();
      
      const keycloakUser = {
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        enabled: userData.enabled ?? true,
        emailVerified: true,
        credentials: [
          {
            type: 'password',
            value: userData.userType === 'personnel' ? 'VelosiPersonnel2024!' : 'VelosiClient2024!',
            temporary: true,
          },
        ],
        attributes: {
          userType: [userData.userType],
          ...(userData.role && { role: [userData.role] })
        },
      };

      // Créer l'utilisateur
      const response = await axios.post(
        `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users`,
        keycloakUser,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Récupérer l'ID de l'utilisateur créé depuis l'en-tête Location
      const locationHeader = response.headers.location;
      if (!locationHeader) {
        throw new Error('Impossible de récupérer l\'ID utilisateur');
      }

      const userId = locationHeader.split('/').pop();
      console.log(`✅ Utilisateur créé dans Keycloak: ${userData.username} (ID: ${userId})`);

      // Assigner les rôles appropriés
      await this.assignUserRoles(userId, userData.userType, userData.role);

      return userId;
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`⚠️ Utilisateur '${userData.username}' existe déjà dans Keycloak`);
        return await this.getUserId(userData.username);
      }
      console.error(`❌ Erreur création utilisateur ${userData.username}:`, error.response?.data || error.message);
      return null;
    }
  }

  // Récupérer l'ID d'un utilisateur existant
  async getUserId(username: string): Promise<string | null> {
    try {
      const token = await this.getAdminToken();
      
      const response = await axios.get(
        `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users?username=${username}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.data.length > 0) {
        return response.data[0].id;
      }
      return null;
    } catch (error) {
      console.error(`❌ Erreur recherche utilisateur ${username}:`, error.message);
      return null;
    }
  }

  // Assigner les rôles à un utilisateur
  async assignUserRoles(userId: string, userType: 'personnel' | 'client', specificRole?: string): Promise<void> {
    try {
      // Rôles à assigner
      const rolesToAssign = [];
      
      if (userType === 'personnel') {
        // Assigner le rôle 'personnel' de base
        rolesToAssign.push('personnel');
        
        // Assigner le rôle spécifique si fourni et valide
        if (specificRole && PERSONNEL_ROLES.includes(specificRole)) {
          rolesToAssign.push(specificRole);
        }
      } else if (userType === 'client') {
        // Assigner le rôle 'client'
        rolesToAssign.push('client');
      }

      // Assigner chaque rôle
      for (const roleName of rolesToAssign) {
        await this.assignSingleRole(userId, roleName);
      }
      
    } catch (error) {
      console.error(`❌ Erreur assignation rôles utilisateur ${userId}:`, error.message);
    }
  }

  // Assigner un rôle spécifique à un utilisateur
  async assignSingleRole(userId: string, roleName: string): Promise<void> {
    try {
      const token = await this.getAdminToken();
      
      // S'assurer que le rôle existe
      await this.ensureRoleExists(roleName);
      
      // Récupérer les détails du rôle
      const roleResponse = await axios.get(
        `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles/${roleName}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      // Assigner le rôle à l'utilisateur
      await axios.post(
        `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users/${userId}/role-mappings/realm`,
        [roleResponse.data],
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ Rôle '${roleName}' assigné à l'utilisateur ${userId}`);
    } catch (error) {
      console.error(`❌ Erreur assignation rôle ${roleName} à ${userId}:`, error.response?.data || error.message);
    }
  }

  // Initialiser tous les rôles nécessaires
  async initializeRoles(): Promise<void> {
    console.log('🔧 Initialisation des rôles Keycloak...');
    
    // Rôles de base
    await this.ensureRoleExists('personnel');
    await this.ensureRoleExists('client');
    
    // Rôles spécifiques du personnel
    for (const role of PERSONNEL_ROLES) {
      await this.ensureRoleExists(role);
    }
    
    console.log('✅ Tous les rôles sont initialisés');
  }

  // Synchroniser tous les utilisateurs depuis la base de données
  async syncAllUsers(): Promise<void> {
    try {
      // Initialiser les rôles
      await this.initializeRoles();

      // Synchroniser le personnel
      console.log('👥 Synchronisation du personnel...');
      const personnelQuery = `
        SELECT id, nom, prenom, nom_utilisateur, email, role, statut 
        FROM personnel 
        WHERE statut = 'actif'
      `;
      const personnelResult = await this.dbPool.query(personnelQuery);
      const personnelList = personnelResult.rows;

      let personnelSynced = 0;
      for (const person of personnelList) {
        const userData = {
          username: person.nom_utilisateur,
          email: person.email,
          firstName: person.prenom,
          lastName: person.nom,
          userType: 'personnel' as const,
          role: person.role,
          enabled: person.statut === 'actif'
        };

        const keycloakId = await this.createKeycloakUser(userData);
        if (keycloakId) {
          // Mettre à jour le keycloak_id dans la base
          await this.dbPool.query(
            'UPDATE personnel SET keycloak_id = $1 WHERE id = $2',
            [keycloakId, person.id]
          );
          personnelSynced++;
        }
      }

      // Synchroniser les clients
      console.log('🏢 Synchronisation des clients...');
      const clientsQuery = `
        SELECT id, nom, interlocuteur, statut, blocage 
        FROM client 
        WHERE blocage = false OR blocage IS NULL
      `;
      const clientsResult = await this.dbPool.query(clientsQuery);
      const clientsList = clientsResult.rows;

      let clientsSynced = 0;
      for (const client of clientsList) {
        const userData = {
          username: `${client.nom.toLowerCase().replace(/\s+/g, '.')}.${client.id}`, // Ajouter l'ID pour unicité
          email: `${client.nom.toLowerCase().replace(/\s+/g, '.')}.${client.id}@client.velosi.com`,
          firstName: client.interlocuteur || client.nom,
          lastName: '',
          userType: 'client' as const,
          enabled: !client.blocage
        };

        const keycloakId = await this.createKeycloakUser(userData);
        if (keycloakId) {
          // Mettre à jour le keycloak_id dans la base
          try {
            await this.dbPool.query(
              'UPDATE client SET keycloak_id = $1 WHERE id = $2',
              [keycloakId, client.id]
            );
            clientsSynced++;
          } catch (updateError) {
            if (updateError.code === '23505') {
              console.log(`⚠️ Keycloak ID déjà utilisé pour le client: ${client.nom}`);
            } else {
              console.error(`❌ Erreur mise à jour client ${client.nom}:`, updateError.message);
            }
          }
        }
      }

      console.log('\n📊 Résumé de synchronisation:');
      console.log(`👥 Personnel synchronisé: ${personnelSynced}/${personnelList.length}`);
      console.log(`🏢 Clients synchronisés: ${clientsSynced}/${clientsList.length}`);

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      throw error;
    }
  }

  // Fermer la connexion à la base de données
  async close(): Promise<void> {
    await this.dbPool.end();
  }
}

// Script principal
async function main() {
  console.log('🔄 Synchronisation Keycloak pour Velosi Transport');
  console.log('============================================');
  
  const syncManager = new SimpleKeycloakSync();
  
  try {
    await syncManager.syncAllUsers();
    console.log('✅ Synchronisation terminée avec succès!');
  } catch (error) {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  } finally {
    await syncManager.close();
  }
}

// Exécution si appelé directement
if (require.main === module) {
  main();
}