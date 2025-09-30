import { DataSource } from 'typeorm';
import { Client } from '../../src/entities/client.entity';
import { ContactClient } from '../../src/entities/contact-client.entity';
import axios from 'axios';

// Configuration Keycloak
const KEYCLOAK_CONFIG = {
  serverUrl: 'http://localhost:8080',
  realm: 'ERP_Velosi',
  adminUsername: 'admin',
  adminPassword: '87Eq8384',
  adminClientId: 'admin-cli'
};

// Configuration de la base de données
const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'msp',
  password: '87Eq8384',
  database: 'velosi',
  entities: [Client, ContactClient],
  synchronize: false,
  logging: false,
});

class ClientKeycloakSync {
  private adminToken: string | null = null;

  // Obtenir le token admin Keycloak
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

  // S'assurer que le rôle "client" existe dans Keycloak
  async ensureClientRoleExists(): Promise<void> {
    try {
      const token = await this.getAdminToken();
      
      // Vérifier si le rôle existe
      try {
        await axios.get(
          `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles/client`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          }
        );
        console.log('✅ Rôle "client" existe déjà');
      } catch (error) {
        if (error.response?.status === 404) {
          // Créer le rôle "client"
          await axios.post(
            `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles`,
            {
              name: 'client',
              description: 'Rôle client pour l\'application Velosi'
            },
            {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
            }
          );
          console.log('✅ Rôle "client" créé');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la gestion du rôle client:', error.response?.data || error.message);
    }
  }

  // Créer un utilisateur client dans Keycloak
  async createClientInKeycloak(client: Client, contact: ContactClient | null): Promise<string | null> {
    try {
      const token = await this.getAdminToken();
      
      // Créer un nom d'utilisateur unique basé sur le nom de la société
      const username = client.nom.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 30) + '_' + client.id;

      // Email principal (depuis contact ou généré)
      const email = contact?.mail1 || `${username}@client.velosi.com`;

      const keycloakUser = {
        username: username,
        email: email,
        firstName: client.interlocuteur || client.nom.split(' ')[0],
        lastName: client.interlocuteur ? client.interlocuteur.split(' ').slice(1).join(' ') : '',
        enabled: !client.blocage,
        emailVerified: true,
        credentials: [
          {
            type: 'password',
            value: 'VelosiClient2024!',
            temporary: true,
          },
        ],
        attributes: {
          userType: ['client'],
          clientId: [client.id.toString()],
          categorie: [client.categorie],
          type_client: [client.type_client],
          pays: [client.pays]
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

      // Récupérer l'ID de l'utilisateur créé
      const locationHeader = response.headers.location;
      if (!locationHeader) {
        throw new Error('Impossible de récupérer l\'ID utilisateur');
      }

      const userId = locationHeader.split('/').pop();
      console.log(`✅ Utilisateur Keycloak créé: ${username} (ID: ${userId})`);

      // Assigner le rôle "client"
      await this.assignClientRole(userId);

      return userId;

    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`⚠️ Utilisateur pour "${client.nom}" existe déjà dans Keycloak`);
        return await this.getUserIdByEmail(contact?.mail1 || `${client.nom.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.velosi.com`);
      }
      console.error(`❌ Erreur création utilisateur "${client.nom}":`, error.response?.data || error.message);
      return null;
    }
  }

  // Assigner le rôle "client" à un utilisateur
  async assignClientRole(userId: string): Promise<void> {
    try {
      const token = await this.getAdminToken();
      
      // Récupérer les détails du rôle "client"
      const roleResponse = await axios.get(
        `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles/client`,
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

      console.log(`✅ Rôle "client" assigné à l'utilisateur ${userId}`);
    } catch (error) {
      console.error(`❌ Erreur assignation rôle client à ${userId}:`, error.response?.data || error.message);
    }
  }

  // Récupérer l'ID d'un utilisateur par email
  async getUserIdByEmail(email: string): Promise<string | null> {
    try {
      const token = await this.getAdminToken();
      
      const response = await axios.get(
        `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users?email=${encodeURIComponent(email)}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.data.length > 0) {
        return response.data[0].id;
      }
      return null;
    } catch (error) {
      console.error(`❌ Erreur recherche utilisateur par email ${email}:`, error.message);
      return null;
    }
  }

  // Synchroniser tous les clients de la base avec Keycloak
  async syncAllClientsToKeycloak(): Promise<void> {
    console.log('🔄 Synchronisation des clients vers Keycloak');
    console.log('===========================================');

    try {
      // S'assurer que le rôle "client" existe
      await this.ensureClientRoleExists();

      // Récupérer tous les clients actifs de la base
      const clientRepository = AppDataSource.getRepository(Client);
      const contactRepository = AppDataSource.getRepository(ContactClient);

      const clients = await clientRepository.find({
        where: { blocage: false },
        order: { id: 'ASC' }
      });

      console.log(`📊 ${clients.length} clients trouvés dans la base de données`);

      let successCount = 0;
      let errorCount = 0;

      for (const client of clients) {
        try {
          // Récupérer le contact du client
          const contact = await contactRepository.findOne({
            where: { id_client: client.id }
          });

          // Créer l'utilisateur dans Keycloak
          const keycloakUserId = await this.createClientInKeycloak(client, contact);

          if (keycloakUserId) {
            // Mettre à jour le keycloak_id dans la base
            await clientRepository.update(client.id, { keycloak_id: keycloakUserId });
            successCount++;
            
            console.log(`✅ Client "${client.nom}" synchronisé - Email: ${contact?.mail1 || 'N/A'} - Pays: ${client.pays}`);
          } else {
            errorCount++;
          }

        } catch (error) {
          errorCount++;
          console.error(`❌ Erreur pour le client "${client.nom}":`, error.message);
        }
      }

      console.log('\n📈 Résumé de la synchronisation:');
      console.log(`✅ Clients synchronisés avec succès: ${successCount}`);
      console.log(`❌ Erreurs: ${errorCount}`);
      console.log(`📊 Total traité: ${clients.length}`);

      if (successCount > 0) {
        console.log('\n🔐 Informations de connexion:');
        console.log('   - Mot de passe par défaut: VelosiClient2024!');
        console.log('   - Les utilisateurs devront changer leur mot de passe lors de la première connexion');
        console.log('   - Tous les utilisateurs ont le rôle "client" dans Keycloak');
      }

    } catch (error) {
      console.error('💥 Erreur fatale lors de la synchronisation:', error);
      throw error;
    }
  }
}

// Script principal
async function main() {
  console.log('🎬 Initialisation de la synchronisation clients vers Keycloak...');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Connexion à la base de données établie');

    const syncManager = new ClientKeycloakSync();
    await syncManager.syncAllClientsToKeycloak();

    console.log('\n✅ Synchronisation terminée avec succès!');
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Connexion à la base de données fermée');
  }

  console.log('🏁 Script terminé');
}

// Exécution si appelé directement
if (require.main === module) {
  main();
}