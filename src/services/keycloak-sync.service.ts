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
    this.logger.log('Début de la synchronisation du personnel...');
    
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
          successCount++;
          
          // Mettre à jour l'ID Keycloak dans la base
          personnel.keycloak_id = keycloakUserId;
          await this.personnelRepository.save(personnel);
        }
      } catch (error) {
        errorCount++;
        this.logger.error(`Erreur pour le personnel ${personnel.nom}:`, error);
      }
    }

    this.logger.log(`Synchronisation personnel terminée: ${successCount} créés, ${errorCount} erreurs`);
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

  async syncAllUsersToKeycloak(): Promise<void> {
    this.logger.log('Début de la synchronisation complète...');
    
    try {
      await this.syncPersonnelToKeycloak();
      await this.syncClientsToKeycloak();
      
      this.logger.log('Synchronisation complète terminée avec succès');
    } catch (error) {
      this.logger.error('Erreur lors de la synchronisation complète:', error);
      throw error;
    }
  }

  // Méthode pour synchroniser un utilisateur spécifique lors de la création
  async syncSingleUserToKeycloak(userType: 'personnel' | 'client', userId: number): Promise<string | null> {
    try {
      let userData;
      
      if (userType === 'personnel') {
        const personnel = await this.personnelRepository.findOne({ where: { id: userId } });
        if (!personnel) {
          throw new Error('Personnel non trouvé');
        }
        
        // Validation de l'email personnel
        if (!personnel.email || !this.isValidEmail(personnel.email)) {
          throw new Error(`Email invalide pour le personnel ${personnel.nom_utilisateur}: ${personnel.email}`);
        }
        
        userData = {
          id: personnel.id,
          username: personnel.nom_utilisateur || personnel.email,
          email: personnel.email,
          firstName: personnel.prenom,
          lastName: personnel.nom,
          enabled: personnel.statut === 'actif',
          userType: 'personnel',
          roles: ['personnel', personnel.role || 'user'],
        };
      } else {
        const client = await this.clientRepository.findOne({ where: { id: userId } });
        if (!client) {
          throw new Error('Client non trouvé');
        }

        // Récupérer l'email depuis les contacts du client (UNIQUEMENT depuis contact_client)
        let clientEmail = null;
        
        try {
          const contact = await this.dataSource.query(
            'SELECT mail1, mail2, tel1 FROM contact_client WHERE id_client = $1 LIMIT 1',
            [client.id]
          );
          
          if (contact && contact.length > 0) {
            clientEmail = contact[0].mail1 || contact[0].mail2;
            this.logger.log(`Email trouvé dans contact_client pour ${client.nom}: ${clientEmail}`);
          } else {
            this.logger.warn(`Aucun contact trouvé pour le client ${client.nom}`);
          }
        } catch (contactError) {
          this.logger.warn(`Erreur récupération contact pour ${client.nom}:`, contactError.message);
        }
        
        // Si toujours pas d'email valide, créer un email temporaire basé sur le nom
        if (!clientEmail || !this.isValidEmail(clientEmail)) {
          const nomSanitized = client.nom.toLowerCase().replace(/[^a-z0-9]/g, '_');
          clientEmail = `${nomSanitized}@temp.local`;
          this.logger.warn(`Email temporaire généré pour le client ${client.nom}: ${clientEmail}`);
        } else {
          this.logger.log(`Email valide trouvé pour le client ${client.nom}: ${clientEmail}`);
        }
        
        userData = {
          id: client.id,
          username: client.nom, // Utiliser le nom du client comme username (identifiant)
          email: clientEmail,
          firstName: client.interlocuteur || client.nom, // Utiliser interlocuteur comme firstName
          lastName: '', // Laisser lastName vide selon la demande
          enabled: !client.blocage,
          userType: 'client',
          roles: ['client', 'user'],
        };
      }

      const keycloakUserId = await this.createKeycloakUser(userData);
      
      // Sauvegarder l'ID Keycloak dans la base de données
      if (keycloakUserId) {
        if (userType === 'personnel') {
          await this.personnelRepository.update(userId, { keycloak_id: keycloakUserId });
        } else {
          await this.clientRepository.update(userId, { keycloak_id: keycloakUserId });
        }
        this.logger.log(`ID Keycloak sauvegardé pour ${userType} ${userId}: ${keycloakUserId}`);
      }
      
      return keycloakUserId;
    } catch (error) {
      this.logger.error(`Erreur lors de la synchronisation de l'utilisateur ${userType}:${userId}:`, error);
      return null;
    }
  }

  // Validation de l'email
  private isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
