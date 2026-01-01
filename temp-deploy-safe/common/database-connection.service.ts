import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { ContactClient } from '../entities/contact-client.entity';
import { Lead } from '../entities/crm/lead.entity';
import { Opportunity } from '../entities/crm/opportunity.entity';
import { Quote } from '../crm/entities/quote.entity';
import { QuoteItem } from '../crm/entities/quote-item.entity';
import { Activity } from '../crm/entities/activity.entity';
import { ActivityParticipant } from '../crm/entities/activity-participant.entity';
import { TypeFraisAnnexe } from '../crm/entities/type-frais-annexe.entity';
import { Industry } from '../crm/entities/industry.entity';
import { ObjectifCom } from '../entities/objectif-com.entity';
import { Engin } from '../entities/engin.entity';
import { Navire } from '../entities/navire.entity';
import { Armateur } from '../entities/armateur.entity';
import { Fournisseur } from '../entities/fournisseur.entity';
import { Correspondant } from '../correspondants/entities/correspondant.entity';
import { Port } from '../entities/port.entity';
import { Aeroport } from '../entities/aeroport.entity';
import { AutorisationTVA } from '../entities/autorisation-tva.entity';
import { BCsusTVA } from '../entities/bcsus-tva.entity';
import { BiometricCredential } from '../entities/biometric-credential.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { VechatMessage } from '../vechat/entities/vechat-message.entity';
import { VechatConversation } from '../vechat/entities/vechat-conversation.entity';
import { VechatPresence } from '../vechat/entities/vechat-presence.entity';
import { VechatUserSettings } from '../vechat/entities/vechat-user-settings.entity';

/**
 * Service de gestion des connexions dynamiques aux bases de données multi-tenant
 * 
 * Chaque organisation a sa propre base de données (ex: shipnology_velosi, shipnology_transport_rapide)
 * Ce service crée et gère les connexions à ces bases de manière dynamique
 */
@Injectable()
export class DatabaseConnectionService {
  private connections: Map<string, DataSource> = new Map();
  private mainDataSource: DataSource;

  // 🏢 Liste de toutes les entités à enregistrer dans chaque connexion
  private readonly entities = [
    Client,
    Personnel,
    ContactClient,
    Lead,
    Opportunity,
    Quote,
    QuoteItem,
    Activity,
    ActivityParticipant,
    TypeFraisAnnexe,
    Industry,
    ObjectifCom,
    Engin,
    Navire,
    Armateur,
    Fournisseur,
    Correspondant,
    Port,
    Aeroport,
    AutorisationTVA,
    BCsusTVA,
    BiometricCredential,
    LoginHistory,
    VechatMessage,
    VechatConversation,
    VechatPresence,
    VechatUserSettings,
  ];

  constructor(private configService: ConfigService) {}

  /**
   * Initialise la connexion à la base principale 'shipnology'
   * Cette base contient la table 'organisations' avec la liste de tous les clients
   */
  async getMainConnection(): Promise<DataSource> {
    if (this.mainDataSource && this.mainDataSource.isInitialized) {
      return this.mainDataSource;
    }

    const options: DataSourceOptions = {
      type: 'postgres',
      host: this.configService.get('DB_ADDR'),
      port: parseInt(this.configService.get('DB_PORT')),
      username: this.configService.get('DB_USER'),
      password: this.configService.get('DB_PASSWORD'),
      database: 'shipnology', // Base principale
      synchronize: false,
      logging: this.configService.get('NODE_ENV') !== 'production',
    };

    this.mainDataSource = new DataSource(options);
    await this.mainDataSource.initialize();
    
    console.log('[DB] Connexion à la base principale: shipnology');
    return this.mainDataSource;
  }

  /**
   * Obtient ou crée une connexion à une base de données d'organisation
   * 
   * @param databaseName - Nom de la base (ex: 'shipnology_velosi')
   * @returns DataSource pour cette base
   */
  async getOrganisationConnection(databaseName: string): Promise<DataSource> {
    // Vérifier si la connexion existe déjà
    if (this.connections.has(databaseName)) {
      const existingConnection = this.connections.get(databaseName);
      if (existingConnection.isInitialized) {
        return existingConnection;
      }
    }

    // Créer une nouvelle connexion avec toutes les entités
    const options: DataSourceOptions = {
      type: 'postgres',
      host: this.configService.get('DB_ADDR'),
      port: parseInt(this.configService.get('DB_PORT')),
      username: this.configService.get('DB_USER'),
      password: this.configService.get('DB_PASSWORD'),
      database: databaseName,
      entities: this.entities, // 🏢 Ajouter toutes les entités
      synchronize: false,
      logging: this.configService.get('NODE_ENV') !== 'production',
    };

    const dataSource = new DataSource(options);
    await dataSource.initialize();
    
    this.connections.set(databaseName, dataSource);
    console.log(`[DB] Nouvelle connexion créée: ${databaseName} avec ${this.entities.length} entités`);
    
    return dataSource;
  }

  /**
   * Crée une nouvelle base de données pour une organisation
   * 
   * @param databaseName - Nom de la base à créer (ex: 'shipnology_transport_rapide')
   */
  async createOrganisationDatabase(databaseName: string): Promise<void> {
    const mainConnection = await this.getMainConnection();
    
    // Vérifier si la base existe déjà
    const result = await mainConnection.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [databaseName]
    );

    if (result.length > 0) {
      throw new Error(`La base de données '${databaseName}' existe déjà`);
    }

    // Créer la base de données
    await mainConnection.query(`CREATE DATABASE ${databaseName}`);
    console.log(`[DB] Base de données créée: ${databaseName}`);
  }

  /**
   * Exécute un script SQL dans une base de données d'organisation
   * Utilisé pour créer les tables lors de la création d'une nouvelle organisation
   * 
   * @param databaseName - Nom de la base
   * @param sqlScript - Script SQL à exécuter
   */
  async executeSqlScript(databaseName: string, sqlScript: string): Promise<void> {
    const connection = await this.getOrganisationConnection(databaseName);
    
    // Découper le script en statements individuels et les exécuter
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (error) {
        console.error(`[DB] Erreur lors de l'exécution du statement:`, statement.substring(0, 100));
        throw error;
      }
    }

    console.log(`[DB] Script SQL exécuté dans ${databaseName}`);
  }

  /**
   * Ferme une connexion spécifique (utile pour libérer les ressources)
   * 
   * @param databaseName - Nom de la base dont on veut fermer la connexion
   */
  async closeConnection(databaseName: string): Promise<void> {
    const connection = this.connections.get(databaseName);
    if (connection && connection.isInitialized) {
      await connection.destroy();
      this.connections.delete(databaseName);
      console.log(`[DB] Connexion fermée: ${databaseName}`);
    }
  }

  /**
   * Ferme toutes les connexions (appelé lors de l'arrêt de l'application)
   */
  async closeAllConnections(): Promise<void> {
    for (const [name, connection] of this.connections.entries()) {
      if (connection.isInitialized) {
        await connection.destroy();
        console.log(`[DB] Connexion fermée: ${name}`);
      }
    }
    this.connections.clear();

    if (this.mainDataSource && this.mainDataSource.isInitialized) {
      await this.mainDataSource.destroy();
      console.log('[DB] Connexion principale fermée');
    }
  }

  /**
   * Liste toutes les bases de données d'organisations existantes
   * 
   * @returns Liste des noms de bases commençant par 'shipnology_'
   */
  async listOrganisationDatabases(): Promise<string[]> {
    const mainConnection = await this.getMainConnection();
    const result = await mainConnection.query(
      `SELECT datname FROM pg_database WHERE datname LIKE 'shipnology_%' ORDER BY datname`
    );
    return result.map((row: any) => row.datname);
  }

  /**
   * Récupère toutes les organisations depuis la base principale
   * 
   * @returns Liste des organisations avec id, nom et database_name
   */
  async getAllOrganisations(): Promise<Array<{ id: number; nom: string; database_name: string }>> {
    const mainConnection = await this.getMainConnection();
    const result = await mainConnection.query(
      `SELECT id, nom, database_name FROM organisations WHERE database_name IS NOT NULL ORDER BY nom`
    );
    return result;
  }
}
