import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KeycloakSyncService {
  private readonly logger = new Logger(KeycloakSyncService.name);
  private keycloakAdminToken: string;

  constructor(
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectDataSource()
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  private async getKeycloakAdminToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.configService.get('KEYCLOAK_URL')}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: this.configService.get('KEYCLOAK_ADMIN_CLIENT_ID') || 'admin-cli',
          username: this.configService.get('KEYCLOAK_ADMIN_USERNAME'),
          password: this.configService.get('KEYCLOAK_ADMIN_PASSWORD'),
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      this.keycloakAdminToken = response.data.access_token;
      return this.keycloakAdminToken;
    } catch (error) {
      this.logger.error('Erreur lors de l\'obtention du token admin Keycloak:', error.response?.data || error.message);
      throw error;
    }
  }

  private async createKeycloakUser(userData: any): Promise<string | null> {
    try {
      const token = await this.getKeycloakAdminToken();
      
      const keycloakUser = {
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        enabled: userData.enabled,
        emailVerified: true,
        credentials: [
          {
            type: 'password',
            value: userData.temporaryPassword || 'VelosiTemp2024!',
            temporary: true,
          },
        ],
        attributes: {
          userType: [userData.userType],
          originalId: [userData.id.toString()],
        },
        realmRoles: userData.roles,
      };

      const response = await axios.post(
        `${this.configService.get('KEYCLOAK_URL')}/admin/realms/${this.configService.get('KEYCLOAK_REALM')}/users`,
        keycloakUser,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Récupérer l'ID de l'utilisateur créé depuis l'en-tête Location
      const location = response.headers['location'];
      if (location) {
        const keycloakUserId = location.substring(location.lastIndexOf('/') + 1);
        this.logger.log(`Utilisateur créé dans Keycloak: ${userData.username} avec ID: ${keycloakUserId}`);
        return keycloakUserId;
      }

      this.logger.log(`Utilisateur créé dans Keycloak: ${userData.username}`);
      return null;
    } catch (error) {
      if (error.response?.status === 409) {
        this.logger.warn(`Utilisateur déjà existant dans Keycloak: ${userData.username}`);
        return null;
      }
      this.logger.error(`Erreur lors de la création de l'utilisateur ${userData.username}:`, error.response?.data || error.message);
      return null;
    }
  }

  async syncPersonnelToKeycloak(): Promise<void> {
    this.logger.log('🔄 Début de la synchronisation du personnel vers Keycloak...');
    
    const personnelList = await this.personnelRepository.find({
      where: { statut: 'actif' },
    });

    let successCount = 0;
    let errorCount = 0;

    for (const personnel of personnelList) {
      try {
        const userData = {
          id: personnel.id,
          username: personnel.nom_utilisateur || personnel.email,
          email: personnel.email,
          firstName: personnel.prenom,
          lastName: personnel.nom,
          enabled: personnel.statut === 'actif',
          userType: 'personnel',
          roles: ['personnel', personnel.role || 'user'],
        };

        const keycloakUserId = await this.createKeycloakUser(userData);
        if (keycloakUserId) {
          // Assigner le rôle spécifique dans Keycloak
          await this.assignRoleToUser(keycloakUserId, personnel.role);
          
          successCount++;
          
          // Mettre à jour l'ID Keycloak dans la base
          personnel.keycloak_id = keycloakUserId;
          await this.personnelRepository.save(personnel);
          
          this.logger.log(`✅ ${personnel.nom_utilisateur} synchronisé avec rôle ${personnel.role}`);
        }
      } catch (error) {
        errorCount++;
        this.logger.error(`❌ Erreur pour le personnel ${personnel.nom}:`, error);
      }
    }

    this.logger.log(`✅ Synchronisation personnel terminée: ${successCount} créés, ${errorCount} erreurs`);
  }

  /**
   * Assigner un rôle spécifique à un utilisateur dans Keycloak
   */
  private async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    try {
      const token = await this.getKeycloakAdminToken();
      const keycloakUrl = this.configService.get('KEYCLOAK_URL');
      const realm = this.configService.get('KEYCLOAK_REALM');
      
      // Mapping des rôles backend vers rôles Keycloak
      const roleMapping = {
        'administratif': 'Administratif',
        'admin': 'Administratif', 
        'commercial': 'Commercial',
        'exploitation': 'Exploitation',
        'finance': 'Finance',
        'comptabilite': 'Comptabilité',
        'chauffeur': 'Chauffeur',
      };

      const keycloakRoleName = roleMapping[roleName?.toLowerCase()] || roleName || 'User';
      
      // 1. Créer le rôle s'il n'existe pas
      await this.ensureRoleExists(keycloakRoleName);
      
      // 2. Obtenir le rôle
      const roleResponse = await axios.get(
        `${keycloakUrl}/admin/realms/${realm}/roles/${keycloakRoleName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const role = roleResponse.data;
      
      // 3. Supprimer tous les anciens rôles de l'utilisateur
      const currentRolesResponse = await axios.get(
        `${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (currentRolesResponse.data.length > 0) {
        await axios.delete(
          `${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            data: currentRolesResponse.data,
          }
        );
      }
      
      // 4. Assigner le nouveau rôle
      await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
        [role],
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      this.logger.log(`✅ Rôle ${keycloakRoleName} assigné à l'utilisateur ${userId}`);
      
    } catch (error) {
      this.logger.error(`❌ Erreur assignation rôle ${roleName} à ${userId}:`, error.response?.data || error.message);
    }
  }

  /**
   * S'assurer qu'un rôle existe dans Keycloak
   */
  private async ensureRoleExists(roleName: string): Promise<void> {
    try {
      const token = await this.getKeycloakAdminToken();
      const keycloakUrl = this.configService.get('KEYCLOAK_URL');
      const realm = this.configService.get('KEYCLOAK_REALM');
      
      // Vérifier si le rôle existe
      try {
        await axios.get(
          `${keycloakUrl}/admin/realms/${realm}/roles/${roleName}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // Le rôle existe déjà
        return;
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error;
        }
        // Le rôle n'existe pas, le créer
      }
      
      // Créer le rôle
      const roleData = {
        name: roleName,
        description: `Rôle ${roleName} pour le personnel Velosi ERP`,
        composite: false,
        clientRole: false,
      };
      
      await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/roles`,
        roleData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      this.logger.log(`✅ Rôle créé dans Keycloak: ${roleName}`);
      
    } catch (error) {
      this.logger.error(`❌ Erreur création/vérification rôle ${roleName}:`, error.response?.data || error.message);
    }
  }

  async syncClientsToKeycloak(): Promise<void> {
    this.logger.log('Début de la synchronisation des clients...');
    
    const clientsList = await this.clientRepository.find({
      where: { blocage: false },
    });

    let successCount = 0;
    let errorCount = 0;

    for (const client of clientsList) {
      try {
        const userData = {
          id: client.id,
          username: client.username,
          email: client.email,
          firstName: client.interlocuteur || client.nom, // Utiliser interlocuteur comme firstName
          lastName: '', // Laisser lastName vide selon la demande
          enabled: !client.blocage,
          userType: 'client',
          roles: ['client', 'user'],
        };

        const keycloakUserId = await this.createKeycloakUser(userData);
        if (keycloakUserId) {
          successCount++;
          
          // Mettre à jour l'ID Keycloak dans la base
          client.keycloak_id = keycloakUserId;
          await this.clientRepository.save(client);
        }
      } catch (error) {
        errorCount++;
        this.logger.error(`Erreur pour le client ${client.nom}:`, error);
      }
    }

        this.logger.log(`Synchronisation clients terminée: ${successCount} créés, ${errorCount} erreurs`);
  }

  /**
   * Nettoyer toutes les sessions actives dans Keycloak
   */
  async clearAllKeycloakSessions(): Promise<void> {
    try {
      const token = await this.getKeycloakAdminToken();
      const keycloakUrl = this.configService.get('KEYCLOAK_URL');
      const realm = this.configService.get('KEYCLOAK_REALM');
      
      this.logger.log('🧹 Nettoyage de toutes les sessions Keycloak...');
      
      // Obtenir toutes les sessions actives
      const sessionsResponse = await axios.get(
        `${keycloakUrl}/admin/realms/${realm}/client-session-stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      this.logger.log(`📊 ${sessionsResponse.data.length} sessions trouvées`);
      
      // Supprimer toutes les sessions du realm
      await axios.delete(
        `${keycloakUrl}/admin/realms/${realm}/sessions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      this.logger.log('✅ Toutes les sessions Keycloak ont été nettoyées');
      
    } catch (error) {
      this.logger.error('❌ Erreur lors du nettoyage des sessions Keycloak:', error.response?.data || error.message);
    }
  }

  /**
   * Nettoyer les sessions d'un utilisateur spécifique
   */
  async clearUserKeycloakSession(keycloakUserId: string): Promise<void> {
    try {
      const token = await this.getKeycloakAdminToken();
      const keycloakUrl = this.configService.get('KEYCLOAK_URL');
      const realm = this.configService.get('KEYCLOAK_REALM');
      
      this.logger.log(`🧹 Nettoyage session utilisateur: ${keycloakUserId}`);
      
      await axios.delete(
        `${keycloakUrl}/admin/realms/${realm}/users/${keycloakUserId}/logout`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      this.logger.log(`✅ Session utilisateur ${keycloakUserId} nettoyée`);
      
    } catch (error) {
      this.logger.error(`❌ Erreur nettoyage session ${keycloakUserId}:`, error.response?.data || error.message);
    }
  }

  /**
   * Synchronisation complète : personnel + clients + nettoyage sessions
   */
  async fullSync(): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      this.logger.log('🚀 DÉBUT SYNCHRONISATION COMPLÈTE KEYCLOAK');
      
      const startTime = Date.now();
      
      // 1. Nettoyer toutes les sessions existantes
      await this.clearAllKeycloakSessions();
      
      // 2. Synchroniser le personnel avec rôles
      await this.syncPersonnelToKeycloak();
      
      // 3. Synchroniser les clients
      await this.syncClientsToKeycloak();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const stats = {
        duration: `${(duration / 1000).toFixed(2)}s`,
        personnelCount: await this.personnelRepository.count({ where: { statut: 'actif' } }),
        clientsCount: await this.clientRepository.count({ where: { blocage: false } }),
        timestamp: new Date().toISOString(),
      };
      
      this.logger.log('✅ SYNCHRONISATION COMPLÈTE TERMINÉE', stats);
      
      return {
        success: true,
        message: 'Synchronisation complète réussie',
        stats,
      };
    } catch (error) {
      this.logger.error('❌ ERREUR SYNCHRONISATION COMPLÈTE:', error);
      return {
        success: false,
        message: error.message,
        stats: null,
      };
    }
  }

  /**
   * Obtenir les statistiques de synchronisation
   */
  async getSyncStats(): Promise<any> {
    try {
      const token = await this.getKeycloakAdminToken();
      const keycloakUrl = this.configService.get('KEYCLOAK_URL');
      const realm = this.configService.get('KEYCLOAK_REALM');
      
      // Compter les utilisateurs en base
      const personnelCount = await this.personnelRepository.count({ where: { statut: 'actif' } });
      const clientsCount = await this.clientRepository.count({ where: { blocage: false } });
      
      // Compter les utilisateurs dans Keycloak
      const keycloakUsersResponse = await axios.get(
        `${keycloakUrl}/admin/realms/${realm}/users/count`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Obtenir les rôles disponibles
      const rolesResponse = await axios.get(
        `${keycloakUrl}/admin/realms/${realm}/roles`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      return {
        database: {
          personnel: personnelCount,
          clients: clientsCount,
          total: personnelCount + clientsCount,
        },
        keycloak: {
          users: keycloakUsersResponse.data,
          roles: rolesResponse.data.map(r => r.name),
          rolesCount: rolesResponse.data.length,
        },
        sync: {
          lastSync: new Date().toISOString(),
          isConsistent: (personnelCount + clientsCount) === keycloakUsersResponse.data,
        },
      };
    } catch (error) {
      this.logger.error('❌ Erreur obtention stats:', error.response?.data || error.message);
      return { error: error.message };
    }
  }
}
