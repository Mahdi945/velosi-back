import {
  Injectable,
  UnauthorizedException,
  Logger,
  ConflictException,
  NotFoundException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Client, EtatFiscal } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { ContactClient } from '../entities/contact-client.entity';
import { KeycloakService } from './keycloak.service';
import { CreatePersonnelDto, CreateClientDto } from '../dto/register.dto';
import { ContactClientService } from '../services/contact-client.service';
import { EmailService } from '../services/email.service';
import { OtpService } from '../services/otp.service';
import { LoginHistoryService } from '../services/login-history.service';
import { UserType, LoginMethod, LoginStatus } from '../entities/login-history.entity';
import { DatabaseConnectionService } from '../common/database-connection.service';

export interface LoginDto {
  usernameOrEmail: string;
  password: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  role: string;
  userType: 'client' | 'personnel';
  is_superviseur?: boolean; // Ajouter le champ superviseur
  sessionId?: number; // ID de la session login_history pour logout spécifique
  // 🏢 Champs multi-tenant
  organisationId?: number;
  databaseName?: string;
  organisationName?: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    userType: 'client' | 'personnel';
    fullName?: string;
    photo?: string; // Ajouter le champ photo
    first_login?: boolean; // Indiquer si c'est le premier login
    // 🏢 Champs multi-tenant
    organisationId?: number;
    databaseName?: string;
    organisationName?: string;
  };
  organisation?: any; // 🏢 Informations complètes de l'organisation (logo, slug, etc.)
  client?: {
    id: number;
    nom: string;
    email: string;
  } | any; // Permettre tout type de client pour la compatibilité
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Exposer les repositories publiquement pour les endpoints heartbeat/set-offline
  public clientRepository: Repository<Client>;
  public personnelRepository: Repository<Personnel>;

  constructor(
    @InjectRepository(Client)
    clientRepository: Repository<Client>,
    @InjectRepository(Personnel)
    personnelRepository: Repository<Personnel>,
    @InjectRepository(ContactClient)
    private contactClientRepository: Repository<ContactClient>,
    private jwtService: JwtService,
    @Optional() private keycloakService: KeycloakService,
    private configService: ConfigService,
    private contactClientService: ContactClientService,
    private emailService: EmailService,
    private otpService: OtpService,
    @Optional() private loginHistoryService: LoginHistoryService,
    private databaseConnectionService: DatabaseConnectionService,
  ) {
    this.clientRepository = clientRepository;
    this.personnelRepository = personnelRepository;
  }

  async validateUser(username: string, password: string): Promise<any> {
    this.logger.log(`🔍 MULTI-TENANT LOGIN: Recherche utilisateur "${username}" dans TOUTES les organisations`);
    
    try {
      // 🏢 ÉTAPE 1: Récupérer TOUTES les organisations depuis shipnology
      const mainConnection = await this.databaseConnectionService.getMainConnection();
      const organisations = await mainConnection.query(
        'SELECT id, nom, database_name FROM organisations WHERE database_name IS NOT NULL ORDER BY id'
      );
      
      this.logger.log(`📊 ${organisations.length} organisation(s) trouvée(s) à scanner`);
      
      // 🚨 Stocker l'erreur d'organisation inactive pour la relancer après la boucle
      let organisationInactiveError: Error | null = null;
      
      // 🏢 ÉTAPE 2: Chercher dans chaque base de données d'organisation
      for (const org of organisations) {
        const { id: orgId, nom: orgName, database_name: dbName } = org;
        this.logger.log(`🔎 Recherche dans organisation: ${orgName} (ID: ${orgId}, DB: ${dbName})`);
        
        try {
          const connection = await this.databaseConnectionService.getOrganisationConnection(dbName);
          
          // Rechercher dans le personnel
          const personnelResult = await connection.query(
            `SELECT * FROM personnel 
             WHERE (LOWER(nom_utilisateur) = LOWER($1) OR LOWER(email) = LOWER($1))
             AND organisation_id = $2
             LIMIT 1`,
            [username, orgId]
          );
          
          if (personnelResult && personnelResult.length > 0) {
            const personnel = personnelResult[0];
            this.logger.log(`✅ Personnel trouvé dans ${orgName}: ${personnel.nom_utilisateur} (ID: ${personnel.id})`);
            
            // Vérifier le mot de passe
            if (await bcrypt.compare(password, personnel.mot_de_passe)) {
              // 🏢 VÉRIFIER LE STATUT DE L'ORGANISATION AVANT TOUT
              const orgStatusResult = await mainConnection.query(
                'SELECT statut FROM organisations WHERE id = $1',
                [orgId]
              );
              
              if (orgStatusResult && orgStatusResult.length > 0) {
                const organisationStatut = orgStatusResult[0].statut;
                if (organisationStatut === 'inactif') {
                  this.logger.warn(`❌ Organisation ${orgName} est inactive`);
                  // Stocker l'erreur au lieu de la lancer immédiatement
                  organisationInactiveError = new UnauthorizedException('Votre organisation est désactivée. Veuillez contacter l\'administration.');
                  continue; // Continuer pour éviter le catch
                }
              }
              
              // Vérifier le statut de l'utilisateur
              if (personnel.statut !== 'actif') {
                const statusMessages = {
                  'inactif': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
                  'suspendu': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
                  'desactive': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus'
                };
                const message = statusMessages[personnel.statut] || 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus';
                throw new UnauthorizedException(message);
              }
              
              this.logger.log(`🎉 CONNEXION RÉUSSIE: Personnel ${personnel.nom_utilisateur} de l'organisation ${orgName}`);
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { mot_de_passe, ...result } = personnel;
              return { ...result, userType: 'personnel' };
            } else {
              this.logger.warn(`❌ Mot de passe incorrect pour ${personnel.nom_utilisateur} dans ${orgName}`);
            }
          }
          
          // Rechercher dans les clients
          const clientResult = await connection.query(
            `SELECT * FROM client 
             WHERE (LOWER(nom) = LOWER($1) OR LOWER(interlocuteur) = LOWER($1))
             AND organisation_id = $2
             LIMIT 1`,
            [username, orgId]
          );
          
          if (clientResult && clientResult.length > 0) {
            const client = clientResult[0];
            this.logger.log(`✅ Client trouvé dans ${orgName}: ${client.nom} (ID: ${client.id})`);
            
            // Vérifier le mot de passe
            if (await bcrypt.compare(password, client.mot_de_passe)) {
              // 🏢 VÉRIFIER LE STATUT DE L'ORGANISATION AVANT TOUT
              const orgStatusResult = await mainConnection.query(
                'SELECT statut FROM organisations WHERE id = $1',
                [orgId]
              );
              
              if (orgStatusResult && orgStatusResult.length > 0) {
                const organisationStatut = orgStatusResult[0].statut;
                if (organisationStatut === 'inactif') {
                  this.logger.warn(`❌ Organisation ${orgName} est inactive`);
                  // Stocker l'erreur au lieu de la lancer immédiatement
                  organisationInactiveError = new UnauthorizedException('Votre organisation est désactivée. Veuillez contacter l\'administration.');
                  continue; // Continuer pour éviter le catch
                }
              }
              
              // Vérifier le statut de l'utilisateur
              if (client.statut !== 'actif') {
                const statusMessages = {
                  'inactif': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
                  'suspendu': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
                  'desactive': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus'
                };
                const message = statusMessages[client.statut] || 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus';
                throw new UnauthorizedException(message);
              }
              
              // Vérifier le blocage
              if (client.blocage) {
                throw new UnauthorizedException('Compte bloqué');
              }
              
              this.logger.log(`🎉 CONNEXION RÉUSSIE: Client ${client.nom} de l'organisation ${orgName}`);
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { mot_de_passe, ...result } = client;
              return { ...result, userType: 'client' };
            } else {
              this.logger.warn(`❌ Mot de passe incorrect pour ${client.nom} dans ${orgName}`);
            }
          }
          
          // Rechercher par email dans contact_client
          try {
            const contactResult = await connection.query(
              `SELECT cc.*, c.* FROM contact_client cc 
               INNER JOIN client c ON cc.id_client = c.id 
               WHERE LOWER(cc.mail1) = LOWER($1) AND c.organisation_id = $2
               LIMIT 1`,
              [username, orgId]
            );
            
            if (contactResult && contactResult.length > 0) {
              const clientByEmail = contactResult[0];
              this.logger.log(`✅ Client trouvé par email dans ${orgName}: ${clientByEmail.nom} (ID: ${clientByEmail.id})`);
              
              if (await bcrypt.compare(password, clientByEmail.mot_de_passe)) {
                // 🏢 VÉRIFIER LE STATUT DE L'ORGANISATION AVANT TOUT
                const orgStatusResult = await mainConnection.query(
                  'SELECT statut FROM organisations WHERE id = $1',
                  [orgId]
                );
                
                if (orgStatusResult && orgStatusResult.length > 0) {
                  const organisationStatut = orgStatusResult[0].statut;
                  if (organisationStatut === 'inactif') {
                    this.logger.warn(`❌ Organisation ${orgName} est inactive`);
                    // Stocker l'erreur au lieu de la lancer immédiatement
                    organisationInactiveError = new UnauthorizedException('Votre organisation est désactivée. Veuillez contacter l\'administration.');
                    continue; // Continuer pour éviter le catch
                  }
                }
                
                // Vérifier le statut de l'utilisateur
                if (clientByEmail.statut !== 'actif') {
                  const statusMessages = {
                    'inactif': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
                    'suspendu': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
                    'desactive': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus'
                  };
                  const message = statusMessages[clientByEmail.statut] || 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus';
                  throw new UnauthorizedException(message);
                }
                
                if (clientByEmail.blocage) {
                  throw new UnauthorizedException('Compte bloqué');
                }
                
                this.logger.log(`🎉 CONNEXION RÉUSSIE: Client ${clientByEmail.nom} (par email) de l'organisation ${orgName}`);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { mot_de_passe, ...result } = clientByEmail;
                return { ...result, userType: 'client' };
              } else {
                this.logger.warn(`❌ Mot de passe incorrect pour ${clientByEmail.nom} (email) dans ${orgName}`);
              }
            }
          } catch (contactError) {
            this.logger.debug(`Aucun contact trouvé pour ${username} dans ${orgName}`);
          }
          
        } catch (orgError) {
          this.logger.error(`❌ Erreur lors de la recherche dans ${orgName}:`, orgError.message);
          continue; // Continuer avec l'organisation suivante
        }
      }
      
      // 🚨 Si on a détecté une organisation inactive, relancer l'erreur maintenant
      if (organisationInactiveError) {
        this.logger.error(`🚫 Organisation inactive détectée - rejet de la connexion`);
        throw organisationInactiveError;
      }
      
      // Si aucun utilisateur trouvé dans aucune organisation
      this.logger.warn(`❌ ÉCHEC: Utilisateur "${username}" non trouvé dans aucune organisation`);
      return null;
      
    } catch (error) {
      this.logger.error(`❌ Erreur critique lors de la validation multi-tenant:`, error);
      throw error;
    }
  }

  async login(loginDto: LoginDto, req?: any): Promise<AuthResult> {
    const user = await this.validateUser(
      loginDto.usernameOrEmail,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    this.logger.log(
      `Connexion réussie pour l'utilisateur: ${user.username || user.nom}`,
    );

    // Synchroniser avec Keycloak si nécessaire
    await this.syncWithKeycloak(user);

    // Pour les clients, récupérer l'email depuis contact_client
    let userEmail = user.email || '';
    if (user.userType === 'client') {
      try {
        const contactClient = await this.contactClientService.findByClient('velosi', user.id);
        if (contactClient && contactClient.length > 0) {
          userEmail = contactClient[0].mail1 || contactClient[0].mail2 || '';
          this.logger.log(`Email récupéré depuis contact_client pour ${user.nom}: ${userEmail}`);
        }
      } catch (error) {
        this.logger.warn(`Erreur récupération email pour client ${user.nom}:`, error.message);
      }
    }

    // ✅ Mettre à jour le statut en ligne et l'activité lors du login
    // 🏢 MULTI-TENANT: Utiliser la connexion de l'organisation de l'utilisateur
    const userOrgId = user.organisation_id;
    
    if (userOrgId) {
      try {
        // Récupérer la base de données de l'organisation
        const mainConnection = await this.databaseConnectionService.getMainConnection();
        const orgResult = await mainConnection.query(
          'SELECT database_name FROM organisations WHERE id = $1',
          [userOrgId]
        );
        
        if (orgResult && orgResult.length > 0 && orgResult[0].database_name) {
          const userDbConnection = await this.databaseConnectionService.getOrganisationConnection(orgResult[0].database_name);
          
          if (user.userType === 'personnel') {
            await userDbConnection.query(
              `UPDATE personnel SET statut_en_ligne = $1, last_activity = $2 WHERE id = $3 AND organisation_id = $4`,
              [true, new Date(), user.id, userOrgId]
            );
            this.logger.log(`Personnel ${user.nom_utilisateur} marqué comme en ligne dans ${orgResult[0].database_name}`);
          } else if (user.userType === 'client') {
            await userDbConnection.query(
              `UPDATE client SET statut_en_ligne = $1, last_activity = $2 WHERE id = $3 AND organisation_id = $4`,
              [true, new Date(), user.id, userOrgId]
            );
            this.logger.log(`Client ${user.nom} marqué comme en ligne dans ${orgResult[0].database_name}`);
          }
        }
      } catch (error) {
        this.logger.warn(`⚠️ Erreur mise à jour statut en ligne:`, error.message);
        // Ne pas bloquer la connexion si la mise à jour échoue
      }
    }

    // 🏢 RÉCUPÉRER L'ORGANISATION DE L'UTILISATEUR (MULTI-TENANT)
    const organisationId = user.organisation_id;
    let databaseName: string;
    let organisationName: string;
    
    // ✅ SÉCURITÉ CRITIQUE : Récupérer les infos depuis shipnology SANS FALLBACK
    const mainConnection = await this.databaseConnectionService.getMainConnection();
    const orgResult = await mainConnection.query(
      'SELECT id, nom, database_name FROM organisations WHERE id = $1',
      [organisationId]
    );
    
    if (!orgResult || orgResult.length === 0) {
      this.logger.error(`🚨 ERREUR CRITIQUE : Organisation ${organisationId} INTROUVABLE dans la base shipnology`);
      throw new UnauthorizedException(
        `Organisation ${organisationId} non configurée. Contactez l'administrateur système.`
      );
    }
    
    databaseName = orgResult[0].database_name;
    organisationName = orgResult[0].nom;
    
    if (!databaseName) {
      this.logger.error(`🚨 ERREUR CRITIQUE : Organisation ${organisationName} (ID: ${organisationId}) n'a pas de database_name configuré`);
      throw new UnauthorizedException(
        `La base de données pour l'organisation ${organisationName} n'est pas configurée. Contactez l'administrateur.`
      );
    }
    
    this.logger.log(`✅ Organisation trouvée: ${organisationName} (ID: ${organisationId}) → Base de données: ${databaseName}`);

    // 🔥 ENREGISTRER LA CONNEXION DANS L'HISTORIQUE
    let sessionId: number | undefined;
    if (this.loginHistoryService && req) {
      try {
        const userType = user.userType === 'personnel' ? UserType.PERSONNEL : UserType.CLIENT;
        const username = user.userType === 'personnel' ? user.nom_utilisateur : user.nom;
        const fullName = user.userType === 'personnel' ? `${user.prenom} ${user.nom}` : user.nom;
        
        const loginEntry = await this.loginHistoryService.createLoginFromRequest(
          req,
          user.id,
          userType,
          username,
          fullName,
          LoginMethod.PASSWORD,
          LoginStatus.SUCCESS,
          undefined, // failureReason
          databaseName,
          organisationId,
        );
        
        sessionId = loginEntry.id; // 🔑 STOCKER L'ID DE SESSION
        this.logger.log(`✅ Connexion enregistrée dans l'historique pour ${username} (Session #${sessionId})`);
      } catch (error) {
        this.logger.warn(`⚠️ Erreur lors de l'enregistrement de la connexion dans l'historique:`, error);
        // Ne pas bloquer la connexion si l'historique échoue
      }
    }

    const payload: JwtPayload = {
      sub: user.id.toString(),
      username: user.userType === 'personnel' ? user.nom_utilisateur : user.nom,
      email: userEmail,
      role: user.userType === 'personnel' ? user.role : 'client',
      userType: user.userType,
      is_superviseur: user.userType === 'personnel' ? (user.is_superviseur || false) : false,
      sessionId: sessionId, // 🔑 INCLURE L'ID DE SESSION DANS LE JWT
      // 🏢 MULTI-TENANT (CRUCIAL pour router vers la bonne base)
      organisationId: organisationId,
      databaseName: databaseName,
      organisationName: organisationName,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    // 🔍 LOG IMPORTANT pour déboguer le multi-tenant
    this.logger.log(`🎫 JWT créé avec: organisation=${organisationName}, database=${databaseName}, user=${payload.username}`);

    // 🏢 Récupérer les informations complètes de l'organisation
    const mainOrgConnection = await this.databaseConnectionService.getMainConnection();
    const orgDetailsResult = await mainOrgConnection.query(
      `SELECT nom, nom_affichage, logo_url, slug, telephone, adresse, email_contact FROM organisations WHERE id = $1`,
      [organisationId]
    );
    const organisationDetails = orgDetailsResult && orgDetailsResult.length > 0 ? orgDetailsResult[0] : null;

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id.toString(),
        username: payload.username,
        email: payload.email,
        role: payload.role,
        userType: user.userType,
        fullName: user.userType === 'personnel' ? user.fullName : user.nom,
        photo: user.photo || null, // Inclure le champ photo pour les deux types d'utilisateurs
        first_login: user.first_login || false, // Inclure l'information du premier login
      },
      organisation: organisationDetails, // 🏢 Ajouter les informations de l'organisation
    };
  }

  async refreshToken(refresh_token: string): Promise<AuthResult> {
    try {
      const payload = this.jwtService.verify(refresh_token);

      // Vérifier que l'utilisateur existe toujours
      // 🏢 MULTI-TENANT: Utiliser la connexion de l'organisation depuis le JWT
      let user;
      
      if (payload.databaseName && payload.organisationId) {
        const connection = await this.databaseConnectionService.getOrganisationConnection(payload.databaseName);
        
        if (payload.userType === 'personnel') {
          const result = await connection.query(
            `SELECT * FROM personnel WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
            [parseInt(payload.sub), payload.organisationId]
          );
          user = result && result.length > 0 ? result[0] : null;
        } else {
          const result = await connection.query(
            `SELECT * FROM client WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
            [parseInt(payload.sub), payload.organisationId]
          );
          user = result && result.length > 0 ? result[0] : null;
        }
      } else {
        // Fallback si pas d'infos multi-tenant dans le token (ancien token)
        if (payload.userType === 'personnel') {
          user = await this.personnelRepository.findOne({
            where: { id: parseInt(payload.sub) },
          });
        } else {
          user = await this.clientRepository.findOne({
            where: { id: parseInt(payload.sub) },
          });
        }
      }

      if (!user) {
        throw new UnauthorizedException('Utilisateur non trouvé');
      }

      const newPayload: JwtPayload = {
        sub: payload.sub,
        username: payload.username,
        email: payload.email,
        role: payload.role,
        userType: payload.userType,
        is_superviseur: payload.userType === 'personnel' ? (user.is_superviseur || false) : false,
        // 🏢 MULTI-TENANT: Conserver les infos d'organisation
        organisationId: payload.organisationId,
        databaseName: payload.databaseName,
        organisationName: payload.organisationName,
      };

      const access_token = this.jwtService.sign(newPayload);
      const new_refresh_token = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      });

      return {
        access_token,
        refresh_token: new_refresh_token,
        user: {
          id: payload.sub,
          username: payload.username,
          email: payload.email,
          role: payload.role,
          userType: payload.userType,
          fullName:
            payload.userType === 'personnel'
              ? `${user.prenom} ${user.nom}`
              : user.nom,
          photo: user.photo || null, // Inclure le champ photo
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException('Token de rafraîchissement invalide');
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async syncWithKeycloak(user: any): Promise<void> {
    // Vérifier si Keycloak est activé
    const keycloakEnabledValue = this.configService.get(
      'KEYCLOAK_ENABLED',
      'true',
    );
    const keycloakEnabled = keycloakEnabledValue.toLowerCase() === 'true';

    if (!keycloakEnabled) {
      // Keycloak désactivé - ne rien faire, pas de logs d'erreur
      return;
    }

    // Si Keycloak est activé mais le service n'est pas disponible, ignorer silencieusement
    if (!this.keycloakService) {
      return;
    }

    try {
      // 1. Créer l'utilisateur dans Keycloak s'il n'existe pas
      if (!user.keycloak_id) {
        this.logger.log(`Création utilisateur Keycloak pour: ${user.nom_utilisateur || user.nom}`);
        
        const keycloakId = await this.keycloakService.createUser({
          username: user.userType === 'personnel' ? user.nom_utilisateur : user.nom,
          email: user.email || `${user.nom_utilisateur || user.nom}@velosi.com`,
          firstName: user.userType === 'personnel' ? user.prenom : user.nom,
          lastName: user.userType === 'personnel' ? user.nom : '',
          enabled: true,
        });
        
        // Mettre à jour l'ID Keycloak dans la base de données
        if (keycloakId) {
          if (user.userType === 'personnel') {
            // 🏢 MULTI-TENANT: Mettre à jour dans la bonne base
            if (user.organisation_id && user.databaseName) {
              const connection = await this.databaseConnectionService.getOrganisationConnection(user.databaseName);
              await connection.query(
                `UPDATE personnel SET keycloak_id = $1 WHERE id = $2 AND organisation_id = $3`,
                [keycloakId, user.id, user.organisation_id]
              );
            } else {
              await this.personnelRepository.update(user.id, { keycloak_id: keycloakId });
            }
            // Assigner le rôle dans Keycloak
            await this.keycloakService.updateUserRole(keycloakId, user.role);
          } else {
            // 🏢 MULTI-TENANT: Mettre à jour dans la bonne base
            if (user.organisation_id && user.databaseName) {
              const connection = await this.databaseConnectionService.getOrganisationConnection(user.databaseName);
              await connection.query(
                `UPDATE client SET keycloak_id = $1 WHERE id = $2 AND organisation_id = $3`,
                [keycloakId, user.id, user.organisation_id]
              );
            } else {
              await this.clientRepository.update(user.id, { keycloak_id: keycloakId });
            }
            // Assigner le rôle client dans Keycloak
            await this.keycloakService.updateUserRole(keycloakId, 'client');
          }
          user.keycloak_id = keycloakId;
          this.logger.log(`Utilisateur créé dans Keycloak avec ID: ${keycloakId}`);
        }
      }

      // 2. Enregistrer l'activité de connexion dans Keycloak
      if (user.keycloak_id) {
        try {
          // Enregistrer l'activité de connexion
          await this.keycloakService.recordUserActivity(user.keycloak_id, 'login');
          
          // Créer une session utilisateur avec des détails
          const userAgent = 'ERP-Velosi-Backend';
          const ipAddress = 'backend-login';
          await this.keycloakService.createUserSession(user.keycloak_id, userAgent, ipAddress);
          
          // Mettre à jour les attributs utilisateur avec les dernières informations
          await this.keycloakService.updateUser(user.keycloak_id, {
            email: user.email,
            firstName: user.prenom || user.firstName,
            lastName: user.nom || user.lastName,
            enabled: user.statut === 'actif' || user.statut === undefined
          });
          
          this.logger.log(`Session et activité Keycloak enregistrées pour: ${user.nom_utilisateur || user.nom}`);
        } catch (sessionError) {
          this.logger.warn(`Erreur enregistrement session Keycloak: ${sessionError.message}`);
        }
      }
      
    } catch (error) {
      this.logger.warn(
        `Erreur lors de la synchronisation Keycloak: ${error.message}`,
      );
      // Ne pas bloquer la connexion si Keycloak n'est pas disponible
    }
  }

  async validateJwtPayload(payload: JwtPayload): Promise<any> {
    console.log('validateJwtPayload - Payload:', payload);
    
    // 🏢 Récupérer le nom de la base de données depuis le payload JWT
    const databaseName = payload.databaseName || 'velosi'; // Fallback à 'velosi' si pas spécifié
    const organisationId = payload.organisationId || 1;
    
    console.log(`🏢 Validation JWT multi-tenant: database=${databaseName}, organisationId=${organisationId}`);
    
    let user;
    
    try {
      // 🏢 Utiliser DatabaseConnectionService pour se connecter à la bonne base
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      if (payload.userType === 'personnel') {
        console.log('validateJwtPayload - Recherche personnel avec ID:', payload.sub, 'dans', databaseName);
        
        // Requête SQL directe dans la bonne base de données avec organisation_id
        const personnel = await connection.query(
          `SELECT * FROM personnel 
           WHERE id = $1 AND statut = 'actif' AND organisation_id = $2
           LIMIT 1`,
          [parseInt(payload.sub), organisationId]
        );
        
        user = personnel && personnel.length > 0 ? personnel[0] : null;
        console.log('validateJwtPayload - Personnel trouvé:', user ? `${user.nom} (statut: ${user.statut})` : 'null');
        
        // Si l'utilisateur n'est pas trouvé, vérifier s'il existe mais avec un autre statut
        if (!user) {
          const userAnyStatus = await connection.query(
            `SELECT * FROM personnel WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
            [parseInt(payload.sub), organisationId]
          );
          
          if (userAnyStatus && userAnyStatus.length > 0) {
            const foundUser = userAnyStatus[0];
            console.error(`validateJwtPayload - Personnel trouvé mais statut invalide: ${foundUser.statut}`);
            throw new UnauthorizedException(`Compte ${foundUser.statut} - contactez l'administration`);
          }
        }

        // ✅ Vérifier l'expiration de session (24h max)
        if (user && user.last_activity) {
          const now = new Date();
          const lastActivity = new Date(user.last_activity);
          const sessionDuration = now.getTime() - lastActivity.getTime();
          const maxSessionDuration = 24 * 60 * 60 * 1000; // 24 heures
          
          // 🔒 SÉCURITÉ: Vérifier aussi l'âge du token JWT (iat = issued at)
          const tokenAge = payload.iat ? (Math.floor(Date.now() / 1000) - payload.iat) : 0;
          const tokenIsRecent = tokenAge < 60; // Token créé il y a moins de 60 secondes
          
          if (sessionDuration > maxSessionDuration && !tokenIsRecent) {
            // Session expirée - marquer comme hors ligne
            await connection.query(
              `UPDATE personnel SET statut_en_ligne = false WHERE id = $1`,
              [user.id]
            );
            this.logger.warn(`Session expirée pour personnel ${user.nom_utilisateur} (durée: ${Math.floor(sessionDuration / 1000 / 60)} minutes)`);
            throw new UnauthorizedException('Session expirée. Veuillez vous reconnecter.');
          }
          
          if (tokenIsRecent) {
            this.logger.debug(`✅ Token récent détecté (${tokenAge}s), validation bypass pour ${user.nom_utilisateur}`);
          }
        }

        // ✅ Mettre à jour last_activity à chaque validation
        if (user) {
          await connection.query(
            `UPDATE personnel SET last_activity = NOW() WHERE id = $1`,
            [user.id]
          );
        }
        
      } else {
        console.log('validateJwtPayload - Recherche client avec ID:', payload.sub, 'dans', databaseName);
        
        // Requête SQL directe pour les clients avec organisation_id
        const client = await connection.query(
          `SELECT * FROM client WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
          [parseInt(payload.sub), organisationId]
        );
        
        user = client && client.length > 0 ? client[0] : null;

        // ✅ Vérifier l'expiration de session pour les clients aussi
        if (user && user.last_activity) {
          const now = new Date();
          const lastActivity = new Date(user.last_activity);
          const sessionDuration = now.getTime() - lastActivity.getTime();
          const maxSessionDuration = 24 * 60 * 60 * 1000; // 24 heures
          
          // 🔒 SÉCURITÉ: Vérifier aussi l'âge du token JWT
          const tokenAge = payload.iat ? (Math.floor(Date.now() / 1000) - payload.iat) : 0;
          const tokenIsRecent = tokenAge < 60; // Token créé il y a moins de 60 secondes
          
          if (sessionDuration > maxSessionDuration && !tokenIsRecent) {
            await connection.query(
              `UPDATE client SET statut_en_ligne = false WHERE id = $1`,
              [user.id]
            );
            this.logger.warn(`Session expirée pour client ${user.nom} (durée: ${Math.floor(sessionDuration / 1000 / 60)} minutes)`);
            throw new UnauthorizedException('Session expirée. Veuillez vous reconnecter.');
          }
          
          if (tokenIsRecent) {
            this.logger.debug(`✅ Token récent détecté (${tokenAge}s), validation bypass pour client ${user.nom}`);
          }
        }

        // ✅ Mettre à jour last_activity
        if (user) {
          await connection.query(
            `UPDATE client SET last_activity = NOW() WHERE id = $1`,
            [user.id]
          );
        }
        
        // Pour les clients, récupérer l'email depuis contact_client si pas dans le payload
        if (user && (!payload.email || payload.email === '')) {
          try {
            const contactClient = await connection.query(
              `SELECT mail1 FROM contact_client WHERE id_client = $1 LIMIT 1`,
              [user.id]
            );
            if (contactClient && contactClient.length > 0) {
              payload.email = contactClient[0].mail1;
            }
          } catch (error) {
            console.warn('validateJwtPayload - Erreur récupération email contact:', error.message);
          }
        }
      }
      
    } catch (error) {
      this.logger.error(`Erreur validation JWT multi-tenant: ${error.message}`);
      throw error;
    }

    if (!user) {
      console.error('validateJwtPayload - Utilisateur non trouvé dans', databaseName);
      return null;
    }

    // Ajouter les informations multi-tenant au user retourné
    return {
      ...user,
      username: payload.username, // ✅ CORRECTION: Ajouter username depuis payload
      email: payload.email,
      userType: payload.userType,
      role: payload.role,
      roles: [payload.role], // ✅ CORRECTION CRITIQUE: Transformer role en array pour les contrôleurs
      is_superviseur: payload.is_superviseur || false,
      sessionId: payload.sessionId || null,
      // 🏢 MULTI-TENANT - Informations cruciales pour router vers la bonne base
      organisationId: payload.organisationId,
      databaseName: payload.databaseName,
      organisationName: payload.organisationName,
    };
  }

  async registerPersonnel(
    createPersonnelDto: CreatePersonnelDto,
  ): Promise<AuthResult> {
    // Vérifier si l'utilisateur existe déjà - insensible à la casse
    const existingPersonnel = await this.personnelRepository
      .createQueryBuilder('personnel')
      .where('LOWER(personnel.nom_utilisateur) = LOWER(:username)', { 
        username: createPersonnelDto.nom_utilisateur 
      })
      .getOne();

    if (existingPersonnel) {
      throw new ConflictException("Ce nom d'utilisateur existe déjà");
    }

    // Vérifier l'email s'il est fourni
    if (createPersonnelDto.email) {
      const existingEmail = await this.personnelRepository.findOne({
        where: { email: createPersonnelDto.email },
      });

      if (existingEmail) {
        throw new ConflictException('Cet email existe déjà');
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await this.hashPassword(
      createPersonnelDto.mot_de_passe,
    );

    // Créer le personnel
    const personnel = this.personnelRepository.create({
      ...createPersonnelDto,
      mot_de_passe: hashedPassword,
      statut: 'actif',
      photo: 'uploads/profiles/default-avatar.png', // Assigner l'avatar par défaut
    });

    const savedPersonnel = await this.personnelRepository.save(personnel);

    this.logger.log(
      `Nouveau personnel créé: ${savedPersonnel.nom_utilisateur}`,
    );

    // Synchroniser avec Keycloak et sauvegarder l'ID
    try {
      if (this.keycloakService) {
        // Créer l'utilisateur Keycloak directement (sans délai)
        const keycloakUser = {
          username: savedPersonnel.nom_utilisateur,
          email: savedPersonnel.email || '',
          firstName: savedPersonnel.prenom,
          lastName: savedPersonnel.nom,
          enabled: true,
        };
        
        const keycloakUserId = await this.keycloakService.createUser(keycloakUser);
        if (keycloakUserId) {
          // ✅ Assigner le rôle dans Keycloak
          await this.keycloakService.assignRoleToUser(keycloakUserId, savedPersonnel.role);
          
          // Sauvegarder l'ID Keycloak dans la base
          savedPersonnel.keycloak_id = keycloakUserId;
          await this.personnelRepository.save(savedPersonnel);
          this.logger.log(`✅ Personnel ${savedPersonnel.nom_utilisateur} synchronisé avec Keycloak (ID: ${keycloakUserId}, Rôle: ${savedPersonnel.role})`);
        }
      }
    } catch (keycloakError) {
      this.logger.warn('Synchronisation Keycloak échouée pour personnel:', keycloakError);
      // Ne pas faire échouer l'inscription si la synchronisation Keycloak échoue
    }

    // Générer les tokens
    const payload: JwtPayload = {
      sub: savedPersonnel.id.toString(),
      username: savedPersonnel.nom_utilisateur,
      email: savedPersonnel.email || '',
      role: savedPersonnel.role,
      userType: 'personnel',
      is_superviseur: savedPersonnel.is_superviseur || false,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    // Envoyer l'email avec les informations de connexion
    try {
      if (savedPersonnel.email && this.emailService) {
        const fullName = `${savedPersonnel.prenom} ${savedPersonnel.nom}`;
        await this.emailService.sendPersonnelCredentialsEmail(
          savedPersonnel.email,
          savedPersonnel.nom_utilisateur,
          createPersonnelDto.mot_de_passe, // Mot de passe original non hashé
          fullName,
          savedPersonnel.role
        );
        this.logger.log(`Email d'informations envoyé à ${savedPersonnel.email}`);
      }
    } catch (emailError) {
      this.logger.warn('Erreur envoi email informations personnel:', emailError);
      // Ne pas faire échouer l'inscription si l'envoi d'email échoue
    }

    return {
      access_token,
      refresh_token,
      user: {
        id: savedPersonnel.id.toString(),
        username: savedPersonnel.nom_utilisateur,
        email: savedPersonnel.email || '',
        role: savedPersonnel.role,
        userType: 'personnel',
        fullName: savedPersonnel.fullName,
      },
    };
  }

  async registerClient(createClientDto: CreateClientDto, databaseName: string = 'velosi', organisationId: number = 1): Promise<AuthResult> {
    this.logger.log(`📥 [registerClient] Création client - DB: ${databaseName}, Org: ${organisationId}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Vérifier l'unicité du nom
    const existingClients = await connection.query(
      `SELECT * FROM client WHERE nom = $1 LIMIT 1`,
      [createClientDto.nom]
    );
    
    if (existingClients && existingClients.length > 0) {
      throw new ConflictException('Ce nom de client existe déjà');
    }
    
    // Hasher le mot de passe seulement pour les clients permanents
    let hashedPassword: string | null = null;
    if (createClientDto.is_permanent && createClientDto.mot_de_passe) {
      hashedPassword = await this.hashPassword(createClientDto.mot_de_passe);
    }
    
    // Créer le client avec organisation_id
    const insertResult = await connection.query(
      `INSERT INTO client (
        organisation_id, nom, interlocuteur, mot_de_passe, adresse, ville, pays, code_postal,
        type_client, is_permanent, photo, blocage, maj_web
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        organisationId, // 🆕 Ajouter l'organisation_id
        createClientDto.nom,
        createClientDto.interlocuteur,
        hashedPassword,
        createClientDto.adresse,
        createClientDto.ville,
        createClientDto.pays,
        createClientDto.code_postal,
        createClientDto.type_client,
        createClientDto.is_permanent || false,
        'uploads/profiles/default-avatar.png',
        false,
        true
      ]
    );
    
    const savedClient = insertResult[0];
    this.logger.log(`✅ Client créé avec ID: ${savedClient.id} - ${savedClient.nom}`);
    
    // Créer le contact principal
    let contactEmail = '';
    if (savedClient.id) {
      try {
        await connection.query(
          `INSERT INTO contact_client (
            id_client, nom, prenom, tel1, tel2, tel3, fax, mail1, mail2, fonction, is_principal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            savedClient.id,
            createClientDto.nom,
            createClientDto.interlocuteur || '',
            createClientDto.contact_tel1 || null,
            createClientDto.contact_tel2 || null,
            createClientDto.contact_tel3 || null,
            createClientDto.contact_fax || null,
            createClientDto.contact_mail1 || null,
            createClientDto.contact_mail2 || null,
            createClientDto.contact_fonction || 'Contact principal',
            true
          ]
        );
        contactEmail = createClientDto.contact_mail1 || '';
        this.logger.log(`✅ Contact principal créé pour client ${savedClient.id}`);
      } catch (error) {
        this.logger.warn(`Erreur création contact: ${error.message}`);
      }
    }
    
    // Synchroniser avec Keycloak pour les clients permanents
    if (createClientDto.is_permanent === true && this.keycloakService) {
      try {
        const keycloakUser = {
          username: savedClient.nom,
          email: contactEmail || '',
          firstName: savedClient.interlocuteur || savedClient.nom,
          lastName: '',
          enabled: true,
        };
        
        const keycloakUserId = await this.keycloakService.createUser(keycloakUser);
        if (keycloakUserId) {
          await this.keycloakService.assignRoleToUser(keycloakUserId, 'client');
          await connection.query(
            `UPDATE client SET keycloak_id = $1 WHERE id = $2`,
            [keycloakUserId, savedClient.id]
          );
          savedClient.keycloak_id = keycloakUserId;
          this.logger.log(`✅ Client permanent synchronisé avec Keycloak`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Erreur Keycloak: ${error.message}`);
      }
    }
    
    // Envoyer l'email si demandé
    if (createClientDto.is_permanent === true && createClientDto.send_email === true && contactEmail && this.emailService) {
      try {
        await this.emailService.sendClientCredentialsEmail(
          contactEmail,
          savedClient.nom,
          createClientDto.mot_de_passe,
          savedClient.nom,
          savedClient.interlocuteur
        );
        this.logger.log(`📧 Email envoyé à ${contactEmail}`);
      } catch (error) {
        this.logger.warn(`Erreur envoi email: ${error.message}`);
      }
    }
    
    // Générer les tokens JWT avec les informations multi-tenant
    const payload: JwtPayload = {
      sub: savedClient.id.toString(),
      username: savedClient.nom,
      email: contactEmail || '',
      role: 'client',
      userType: 'client',
      is_superviseur: false,
      organisationId: organisationId,
      databaseName: databaseName,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    return {
      access_token,
      refresh_token,
      user: {
        id: savedClient.id.toString(),
        username: savedClient.nom,
        email: contactEmail || '',
        role: 'client',
        userType: 'client',
        fullName: savedClient.nom,
        organisationId: organisationId,
        databaseName: databaseName,
      },
      client: savedClient,
    };
  }

  // Méthode utilitaire pour synchroniser avec Keycloak après inscription
  private async syncUserToKeycloak(
    userType: 'personnel' | 'client',
    userId: number,
  ): Promise<void> {
    try {
      // Utilisation d'axios pour appeler notre API interne de synchronisation (sans auth)
      const axios = require('axios');
      const baseUrl = this.configService.get('API_BASE_URL', 'http://localhost:3000');
      
      const response = await axios.post(`${baseUrl}/api/sync/internal/keycloak/${userType}/${userId}`, {}, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.data?.success) {
        this.logger.log(`Utilisateur ${userType}:${userId} synchronisé avec Keycloak avec succès`);
      } else {
        this.logger.warn(`Synchronisation Keycloak partiellement échouée pour ${userType}:${userId}:`, response.data?.message);
      }
    } catch (error) {
      this.logger.warn(`Échec de la synchronisation Keycloak pour ${userType}:${userId}:`, error.message);
      // Ne pas faire échouer l'inscription si la synchronisation Keycloak échoue
    }
  }

  /**
   * Initier la récupération de mot de passe avec vérification réelle et Keycloak
   */
  async initiatePasswordReset(email: string): Promise<{ success: boolean; message: string; userFound?: boolean }> {
    try {
      // Rechercher l'utilisateur par email dans la base de données
      const user = await this.findUserByEmail(email);
      
      if (!user) {
        // Retourner une erreur explicite si l'email n'existe pas
        this.logger.warn(`Tentative de récupération pour email inexistant: ${email}`);
        return {
          success: false,
          message: 'Cette adresse email n\'est pas enregistrée dans notre système.',
          userFound: false
        };
      }

      this.logger.log(`Utilisateur trouvé pour ${email}: ${user.userType}`);

      // Vérifier et mettre à jour l'utilisateur dans Keycloak si nécessaire
      try {
        if (this.keycloakService) {
          await this.syncUserWithKeycloak(user);
        }
      } catch (keycloakError) {
        this.logger.warn(`Erreur Keycloak pour ${email}, continuons avec l'OTP:`, keycloakError);
      }

      // Générer et envoyer l'OTP
      const otpCode = this.otpService.generateOtp(email, 'password-reset');
      const userName = user.userType === 'personnel' ? user.nom_utilisateur : user.nom;
      
      // 🏢 MULTI-TENANT: Passer l'organisationId pour récupérer logo et nom de l'organisation
      const emailSent = await this.emailService.sendOtpEmail(
        email,
        otpCode,
        userName,
        user.organisationId  // Utiliser l'organisation_id du personnel/client
      );

      if (!emailSent) {
        this.logger.error(`Échec envoi email OTP pour ${email}`);
        return {
          success: false,
          message: 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.',
          userFound: true
        };
      }

      this.logger.log(`Code OTP envoyé avec succès pour ${email} (${user.userType})`);
      return {
        success: true,
        message: `Code OTP envoyé à ${email}`,
        userFound: true
      };

    } catch (error) {
      this.logger.error(`Erreur lors de l'initiation de récupération pour ${email}:`, error);
      return {
        success: false,
        message: 'Erreur interne. Veuillez réessayer plus tard.',
        userFound: false
      };
    }
  }

  /**
   * Synchroniser l'utilisateur avec Keycloak
   */
  private async syncUserWithKeycloak(user: any): Promise<void> {
    if (!this.keycloakService) {
      return;
    }

    try {
      // Vérifier si l'utilisateur existe dans Keycloak
      const keycloakUser = await this.keycloakService.getUserByEmail(user.email);
      
      if (!keycloakUser) {
        // Créer l'utilisateur dans Keycloak s'il n'existe pas
        const userData = {
          email: user.email,
          username: user.userType === 'personnel' ? user.nom_utilisateur : user.email,
          firstName: user.userType === 'personnel' ? user.nom_utilisateur : user.nom,
          lastName: user.userType === 'personnel' ? 'Personnel' : 'Client',
          enabled: true,
          emailVerified: true
        };

        await this.keycloakService.createUser(userData);
        this.logger.log(`Utilisateur créé dans Keycloak: ${user.email}`);
      } else {
        this.logger.log(`Utilisateur déjà présent dans Keycloak: ${user.email}`);
      }
    } catch (error) {
      this.logger.error(`Erreur synchronisation Keycloak pour ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Vérifier le code OTP pour la récupération de mot de passe
   */
  async verifyPasswordResetOtp(email: string, otpCode: string): Promise<{ success: boolean; message: string }> {
    try {
      const isValid = this.otpService.verifyOtp(email, otpCode, 'password-reset');
      
      if (!isValid) {
        return {
          success: false,
          message: 'Code OTP invalide ou expiré',
        };
      }

      this.logger.log(`Code OTP vérifié avec succès pour ${email}`);
      return {
        success: true,
        message: 'Code OTP vérifié avec succès',
      };

    } catch (error) {
      this.logger.error(`Erreur lors de la vérification OTP pour ${email}:`, error);
      return {
        success: false,
        message: 'Erreur lors de la vérification. Veuillez réessayer.',
      };
    }
  }

  /**
   * Réinitialiser le mot de passe
   */
  async resetPassword(email: string, newPassword: string, otpToken?: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔐 AuthService resetPassword called:', {
        email,
        hasOtpToken: !!otpToken,
        otpToken: otpToken ? '***' + otpToken.slice(-4) : 'none'
      });

      // Vérifier que l'OTP a été vérifié récemment
      // Si on a un token OTP, on l'utilise pour la validation
      if (otpToken) {
        // Le token OTP est en fait le code OTP vérifié - on vérifie juste qu'il est validé
        if (!this.otpService.isOtpVerified(email, 'password-reset')) {
          return {
            success: false,
            message: 'Token OTP invalide ou expiré',
          };
        }
      } else {
        // Fallback: vérifier avec l'ancienne méthode
        if (!this.otpService.isOtpVerified(email, 'password-reset')) {
          return {
            success: false,
            message: 'Vous devez d\'abord vérifier le code OTP',
          };
        }
      }

      // Rechercher l'utilisateur dans toutes les organisations
      const user = await this.findUserByEmail(email);
      
      if (!user) {
        return {
          success: false,
          message: 'Utilisateur non trouvé',
        };
      }

      this.logger.log(`🔐 Reset password pour ${user.userType} dans organisation: ${user.organisationName} (DB: ${user.databaseName})`);

      // Hasher le nouveau mot de passe
      const hashedPassword = await this.hashPassword(newPassword);

      // 🏢 MULTI-TENANT: Mettre à jour dans la bonne base de données
      const connection = await this.databaseConnectionService.getOrganisationConnection(user.databaseName);
      
      if (user.userType === 'personnel') {
        await connection.query(
          `UPDATE personnel SET mot_de_passe = $1 WHERE id = $2 AND organisation_id = $3`,
          [hashedPassword, user.id, user.organisationId]
        );
        this.logger.log(`✅ Mot de passe personnel mis à jour dans ${user.databaseName}`);
      } else {
        await connection.query(
          `UPDATE client SET mot_de_passe = $1 WHERE id = $2 AND organisation_id = $3`,
          [hashedPassword, user.id, user.organisationId]
        );
        this.logger.log(`✅ Mot de passe client mis à jour dans ${user.databaseName}`);
      }

      // Mettre à jour dans Keycloak si disponible
      if (this.keycloakService && user.keycloak_id) {
        try {
          await this.keycloakService.resetUserPassword(user.keycloak_id, newPassword);
          this.logger.log(`Mot de passe mis à jour dans Keycloak pour ${email}`);
        } catch (keycloakError) {
          this.logger.warn(`Erreur mise à jour Keycloak pour ${email}:`, keycloakError);
          // Ne pas faire échouer le reset si Keycloak échoue
        }
      }

      // Invalider l'OTP
      this.otpService.invalidateOtp(email);

      // Envoyer email de confirmation
      try {
        await this.emailService.sendPasswordResetSuccessEmail(
          email,
          user.userType === 'personnel' ? user.nom_utilisateur : user.nom
        );
      } catch (emailError) {
        this.logger.warn(`Erreur envoi email confirmation pour ${email}:`, emailError);
        // Ne pas faire échouer le reset si l'email de confirmation échoue
      }

      this.logger.log(`Mot de passe réinitialisé avec succès pour ${email}`);
      return {
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
      };

    } catch (error) {
      this.logger.error(`Erreur lors de la réinitialisation pour ${email}:`, error);
      return {
        success: false,
        message: 'Erreur lors de la réinitialisation. Veuillez réessayer.',
      };
    }
  }

  /**
   * Rechercher un utilisateur par email dans toutes les organisations (MULTI-TENANT)
   */
  private async findUserByEmail(email: string): Promise<any> {
    this.logger.log(`🔍 MULTI-TENANT: Recherche email "${email}" dans TOUTES les organisations`);
    
    try {
      // 🏢 ÉTAPE 1: Récupérer TOUTES les organisations depuis shipnology
      const mainConnection = await this.databaseConnectionService.getMainConnection();
      const organisations = await mainConnection.query(
        'SELECT id, nom, database_name FROM organisations WHERE database_name IS NOT NULL ORDER BY id'
      );
      
      this.logger.log(`📊 ${organisations.length} organisation(s) à scanner pour l'email ${email}`);
      
      // 🏢 ÉTAPE 2: Chercher dans chaque base de données d'organisation
      for (const org of organisations) {
        const { id: orgId, nom: orgName, database_name: dbName } = org;
        this.logger.log(`🔎 Recherche email "${email}" dans organisation: ${orgName} (ID: ${orgId}, DB: ${dbName})`);
        
        try {
          const connection = await this.databaseConnectionService.getOrganisationConnection(dbName);
          
          // Rechercher dans le personnel
          const personnelResult = await connection.query(
            `SELECT * FROM personnel 
             WHERE LOWER(email) = LOWER($1) AND organisation_id = $2
             LIMIT 1`,
            [email, orgId]
          );
          
          this.logger.log(`   📋 Personnel trouvés: ${personnelResult?.length || 0}`);
          
          if (personnelResult && personnelResult.length > 0) {
            const personnel = personnelResult[0];
            this.logger.log(`✅ Personnel trouvé dans ${orgName}: ${personnel.nom_utilisateur} (ID: ${personnel.id}, OrgID: ${personnel.organisation_id})`);
            return { 
              ...personnel, 
              userType: 'personnel',
              // 🏢 IMPORTANT: Ajouter les infos multi-tenant pour le reset password
              organisationId: orgId,
              databaseName: dbName,
              organisationName: orgName
            };
          }
          
          // Rechercher dans les clients via contact_client
          const contactResult = await connection.query(
            `SELECT cc.*, c.* FROM contact_client cc 
             INNER JOIN client c ON cc.id_client = c.id 
             WHERE (LOWER(cc.mail1) = LOWER($1) OR LOWER(cc.mail2) = LOWER($1)) 
             AND c.organisation_id = $2
             LIMIT 1`,
            [email, orgId]
          );
          
          this.logger.log(`   📋 Clients trouvés: ${contactResult?.length || 0}`);
          
          if (contactResult && contactResult.length > 0) {
            const client = contactResult[0];
            this.logger.log(`✅ Client trouvé dans ${orgName}: ${client.nom} (ID: ${client.id}, OrgID: ${client.organisation_id})`);
            return { 
              ...client, 
              userType: 'client',
              // 🏢 IMPORTANT: Ajouter les infos multi-tenant pour le reset password
              organisationId: orgId,
              databaseName: dbName,
              organisationName: orgName
            };
          }
          
        } catch (orgError) {
          this.logger.error(`❌ Erreur recherche dans ${orgName}:`, orgError.message);
          continue; // Continuer avec l'organisation suivante
        }
      }
      
      // Si aucun utilisateur trouvé dans aucune organisation
      this.logger.warn(`❌ Email "${email}" non trouvé dans aucune organisation`);
      return null;
      
    } catch (error) {
      this.logger.error(`❌ Erreur critique lors de la recherche multi-tenant de l'email:`, error);
      return null;
    }
  }

  /**
   * Méthodes de test pour les différentes approches d'affichage du logo
   */
  async sendTestEmailCID(email: string): Promise<boolean> {
    try {
      return await this.emailService.sendOtpEmail(email, '123456', 'Test Utilisateur CID');
    } catch (error) {
      this.logger.error('Erreur test email CID:', error);
      return false;
    }
  }

  async sendTestEmailURL(email: string): Promise<boolean> {
    try {
      return await this.emailService.sendOtpEmailWithPublicLogo(email, '123456', 'Test Utilisateur URL');
    } catch (error) {
      this.logger.error('Erreur test email URL:', error);
      return false;
    }
  }

  async sendTestEmailBase64(email: string): Promise<boolean> {
    try {
      // Utiliser l'ancienne méthode si on en a une
      // Pour l'instant, on peut créer une méthode simple dans EmailService
      const htmlTemplate = `
        <html>
          <body style="text-align: center; padding: 20px;">
            <h1>Test Logo Base64</h1>
            <p>Test de la méthode base64 pour ${email}</p>
            <div style="font-size: 24px; color: #5e72e4; padding: 20px; background: #f0f0f0; border-radius: 8px; margin: 20px 0;">
              CODE: 123456
            </div>
          </body>
        </html>
      `;
      
      // Directement utiliser nodemailer pour ce test
      return true; // Pour l'instant, on retourne true
    } catch (error) {
      this.logger.error('Erreur test email Base64:', error);
      return false;
    }
  }

  /**
   * Met à jour l'image de profil d'un utilisateur
   * ✅ MULTI-TENANT: Utilise la base de données de l'organisation de l'utilisateur
   */
  async updateUserProfileImage(
    userId: string,
    userType: 'personnel' | 'client',
    imagePath: string,
    databaseName?: string,
    organisationId?: number
  ): Promise<boolean> {
    try {
      const numericUserId = parseInt(userId);
      
      // 🏢 MULTI-TENANT: Si databaseName fourni, utiliser la connexion spécifique
      if (databaseName && organisationId) {
        const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
        
        if (userType === 'personnel') {
          await connection.query(
            `UPDATE personnel SET photo = $1 WHERE id = $2 AND organisation_id = $3`,
            [imagePath, numericUserId, organisationId]
          );
          this.logger.log(`✅ Image de profil personnel ${userId} mise à jour dans ${databaseName}`);
        } else {
          await connection.query(
            `UPDATE client SET photo = $1 WHERE id = $2 AND organisation_id = $3`,
            [imagePath, numericUserId, organisationId]
          );
          this.logger.log(`✅ Image de profil client ${userId} mise à jour dans ${databaseName}`);
        }
      } else {
        // Fallback: utiliser les repositories par défaut
        if (userType === 'personnel') {
          await this.personnelRepository.update(numericUserId, {
            photo: imagePath,
          });
        } else {
          await this.clientRepository.update(numericUserId, {
            photo: imagePath,
          });
        }
        this.logger.log(`Image de profil mise à jour pour ${userType} ID: ${userId} (default DB)`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Erreur mise à jour image profil pour ${userType} ${userId}:`, error);
      throw new Error('Impossible de mettre à jour l\'image de profil');
    }
  }

  /**
   * Supprime l'image de profil d'un utilisateur
   */
  async deleteUserProfileImage(
    userId: string,
    userType: 'personnel' | 'client',
    databaseName?: string,
    organisationId?: number
  ): Promise<boolean> {
    try {
      const numericUserId = parseInt(userId);
      let oldImage: string | null = null;
      
      // 🏢 MULTI-TENANT: Si databaseName fourni, utiliser la connexion spécifique
      if (databaseName && organisationId) {
        const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
        
        // Récupérer l'ancienne image
        if (userType === 'personnel') {
          const result = await connection.query(
            `SELECT photo FROM personnel WHERE id = $1 AND organisation_id = $2`,
            [numericUserId, organisationId]
          );
          oldImage = result[0]?.photo || null;
          
          // Supprimer l'image
          await connection.query(
            `UPDATE personnel SET photo = NULL WHERE id = $1 AND organisation_id = $2`,
            [numericUserId, organisationId]
          );
          this.logger.log(`✅ Image de profil personnel ${userId} supprimée dans ${databaseName}`);
        } else {
          const result = await connection.query(
            `SELECT photo FROM client WHERE id = $1 AND organisation_id = $2`,
            [numericUserId, organisationId]
          );
          oldImage = result[0]?.photo || null;
          
          // Supprimer l'image
          await connection.query(
            `UPDATE client SET photo = NULL WHERE id = $1 AND organisation_id = $2`,
            [numericUserId, organisationId]
          );
          this.logger.log(`✅ Image de profil client ${userId} supprimée dans ${databaseName}`);
        }
      } else {
        // Fallback: utiliser les repositories par défaut
        if (userType === 'personnel') {
          const user = await this.personnelRepository.findOne({
            where: { id: numericUserId },
          });
          oldImage = user?.photo || null;
          
          await this.personnelRepository.update(numericUserId, {
            photo: null,
          });
        } else {
          const user = await this.clientRepository.findOne({
            where: { id: numericUserId },
          });
          oldImage = user?.photo || null;
          
          await this.clientRepository.update(numericUserId, {
            photo: null,
          });
        }
      }

      // Supprimer le fichier physique si il existe (uniquement pour les fichiers locaux, pas Cloudinary)
      if (oldImage && !oldImage.startsWith('http')) {
        try {
          const fs = require('fs');
          const path = require('path');
          const filePath = path.join(process.cwd(), oldImage);
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            this.logger.log(`Fichier image supprimé: ${filePath}`);
          }
        } catch (fileError) {
          this.logger.warn(`Impossible de supprimer le fichier image: ${oldImage}`, fileError);
          // Ne pas faire échouer la suppression si le fichier ne peut pas être supprimé
        }
      }

      this.logger.log(`Image de profil supprimée pour ${userType} ID: ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur suppression image profil pour ${userType} ${userId}:`, error);
      throw new Error('Impossible de supprimer l\'image de profil');
    }
  }

  /**
   * Méthode temporaire pour migrer tous les avatars vers PNG
   * ATTENTION: Cette méthode doit être supprimée après la migration
   */
  async migrateAvatarsToPng(): Promise<{ personnelUpdated: number; clientsUpdated: number }> {
    try {
      this.logger.log('Début de la migration des avatars vers PNG...');

      // Mettre à jour tous les utilisateurs Personnel qui n'ont pas d'avatar ou qui ont l'ancien avatar SVG
      const personnelUpdateResult = await this.personnelRepository
        .createQueryBuilder()
        .update(Personnel)
        .set({ photo: 'uploads/profiles/default-avatar.png' })
        .where('photo IS NULL OR photo = :emptyString OR photo = :oldSvg', {
          emptyString: '',
          oldSvg: 'uploads/profiles/default-avatar.svg'
        })
        .execute();

      // Mettre à jour tous les clients qui n'ont pas d'avatar ou qui ont l'ancien avatar SVG
      const clientsUpdateResult = await this.clientRepository
        .createQueryBuilder()
        .update(Client)
        .set({ photo: 'uploads/profiles/default-avatar.png' })
        .where('photo IS NULL OR photo = :emptyString OR photo = :oldSvg', {
          emptyString: '',
          oldSvg: 'uploads/profiles/default-avatar.svg'
        })
        .execute();

      const personnelUpdated = personnelUpdateResult.affected || 0;
      const clientsUpdated = clientsUpdateResult.affected || 0;

      this.logger.log(`Migration terminée: ${personnelUpdated} personnel et ${clientsUpdated} clients mis à jour`);

      return {
        personnelUpdated,
        clientsUpdated
      };
    } catch (error) {
      this.logger.error('Erreur lors de la migration des avatars:', error);
      throw new Error('Impossible de migrer les avatars');
    }
  }

  /**
   * Récupère le profil complet d'un utilisateur avec toutes les informations
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getFullUserProfile(userId: string, userType: 'personnel' | 'client', databaseName: string, organisationId: number): Promise<any> {
    try {
      // 🏢 Validation des paramètres multi-tenant (OBLIGATOIRES)
      if (!databaseName || !organisationId) {
        throw new UnauthorizedException('Informations multi-tenant manquantes pour récupérer le profil');
      }
      
      console.log(`🏢 [getFullUserProfile] Récupération profil ${userType} ID:${userId} depuis DB:${databaseName} Org:${organisationId}`);
      
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      if (userType === 'personnel') {
        const personnelResult = await connection.query(
          `SELECT * FROM personnel WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
          [parseInt(userId), organisationId]
        );

        if (!personnelResult || personnelResult.length === 0) {
          throw new UnauthorizedException('Personnel non trouvé');
        }

        const personnel = personnelResult[0];

        // ✅ Construire le profil avec TOUS les champs attendus par le frontend
        const role = personnel.role || 'personnel';
        return {
          id: personnel.id,
          nom: personnel.nom,
          prenom: personnel.prenom,
          // Alias pour compatibilité frontend
          firstName: personnel.prenom,
          lastName: personnel.nom,
          nom_utilisateur: personnel.nom_utilisateur,
          email: personnel.email,
          telephone: personnel.telephone,
          genre: personnel.genre,
          statut: personnel.statut,
          photo: personnel.photo || null,
          role: role,
          roles: [role], // ✅ IMPORTANT: Array de rôles pour les permissions
          userType: 'personnel',
          fullName: `${personnel.prenom} ${personnel.nom}`,
          username: personnel.nom_utilisateur,
          isActive: personnel.isactive,
          // ✅ IMPORTANT: Flags pour les permissions dans la sidebar
          isPersonnel: true,
          isClient: false,
          isAdmin: role === 'admin',
          created_at: personnel.created_at,
          // ✅ Multi-tenant info
          organisationId: organisationId,
          databaseName: databaseName
        };
      } else {
        const clientResult = await connection.query(
          `SELECT * FROM client WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
          [parseInt(userId), organisationId]
        );

        if (!clientResult || clientResult.length === 0) {
          throw new UnauthorizedException('Client non trouvé');
        }

        const client = clientResult[0];

        // Récupérer l'email depuis contact_client
        let email = '';
        try {
          const contactClient = await this.contactClientService.findByClient(databaseName, client.id);
          if (contactClient && contactClient.length > 0) {
            email = contactClient[0].mail1 || contactClient[0].mail2 || '';
          }
        } catch (error) {
          this.logger.warn(`Erreur récupération email pour client ${client.nom}:`, error.message);
        }

        // ✅ Construire le profil avec TOUS les champs attendus par le frontend
        return {
          id: client.id,
          nom: client.nom,
          // Alias pour compatibilité frontend
          firstName: client.interlocuteur || client.nom,
          lastName: '',
          interlocuteur: client.interlocuteur,
          categorie: client.categorie,
          type_client: client.type_client,
          adresse: client.adresse,
          code_postal: client.code_postal,
          ville: client.ville,
          pays: client.pays,
          id_fiscal: client.id_fiscal,
          nature: client.nature,
          photo: client.photo || null,
          role: 'client',
          roles: ['client'], // ✅ IMPORTANT: Array de rôles pour les permissions
          userType: 'client',
          username: client.nom,
          email: email,
          // ✅ IMPORTANT: Flags pour les permissions dans la sidebar
          isPersonnel: false,
          isClient: true,
          isAdmin: false,
          created_at: client.created_at,
          blocage: client.blocage,
          devise: client.devise,
          timbre: client.timbre,
          solde: client.solde,
          // ✅ Multi-tenant info
          organisationId: organisationId,
          databaseName: databaseName
        };
      }
    } catch (error) {
      this.logger.error(`Erreur récupération profil complet pour ${userType} ${userId}:`, error);
      throw new UnauthorizedException('Impossible de récupérer le profil');
    }
  }

  /**
   * Met à jour le profil d'un utilisateur
   * ✅ MULTI-TENANT: Utilise la base de données de l'organisation
   */
  async updateUserProfile(
    userId: string, 
    userType: 'personnel' | 'client', 
    updateData: any,
    databaseName?: string,
    organisationId?: number
  ): Promise<any> {
    try {
      const numericUserId = parseInt(userId);
      
      if (userType === 'personnel') {
        // 🏢 MULTI-TENANT: Si databaseName fourni, utiliser la connexion spécifique
        if (databaseName && organisationId) {
          const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
          
          // Vérifier que le personnel existe
          const checkResult = await connection.query(
            `SELECT * FROM personnel WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
            [numericUserId, organisationId]
          );
          
          if (!checkResult || checkResult.length === 0) {
            throw new UnauthorizedException('Personnel non trouvé dans cette organisation');
          }
          
          const personnel = checkResult[0];
          
          // Valider les champs modifiables
          const allowedFields = ['nom', 'prenom', 'telephone', 'email', 'genre', 'photo'];
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;
          
          for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
              // Vérifier l'unicité de l'email si modifié
              if (field === 'email' && updateData[field] !== personnel.email) {
                const emailCheck = await connection.query(
                  `SELECT id FROM personnel WHERE email = $1 AND organisation_id = $2 AND id != $3 LIMIT 1`,
                  [updateData[field], organisationId, numericUserId]
                );
                if (emailCheck && emailCheck.length > 0) {
                  throw new ConflictException('Cet email est déjà utilisé');
                }
              }
              
              updateFields.push(`${field} = $${paramIndex++}`);
              updateValues.push(updateData[field]);
            }
          }
          
          if (updateFields.length > 0) {
            // Ajouter les conditions WHERE
            updateValues.push(numericUserId);
            updateValues.push(organisationId);
            
            const updateQuery = `
              UPDATE personnel 
              SET ${updateFields.join(', ')}
              WHERE id = $${paramIndex++} AND organisation_id = $${paramIndex++}
              RETURNING *
            `;
            
            await connection.query(updateQuery, updateValues);
            this.logger.log(`✅ Profil personnel ${userId} mis à jour dans ${databaseName}`);
          }
          
          // Retourner le profil mis à jour
          return await this.getFullUserProfile(userId, userType, databaseName, organisationId);
          
        } else {
          // Fallback: utiliser le repository par défaut
          const personnel = await this.personnelRepository.findOne({
            where: { id: numericUserId },
          });

          if (!personnel) {
            throw new UnauthorizedException('Personnel non trouvé');
          }

          // Valider les champs modifiables pour le personnel
          const allowedFields = ['nom', 'prenom', 'telephone', 'email', 'genre', 'photo'];
          const filteredData = {};
          
          allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
              filteredData[field] = updateData[field];
            }
          });

          // Vérifier l'unicité de l'email si modifié
          if (filteredData['email'] && filteredData['email'] !== personnel.email) {
            const existingEmail = await this.personnelRepository.findOne({
              where: { email: filteredData['email'] },
            });
            if (existingEmail && existingEmail.id !== personnel.id) {
              throw new ConflictException('Cet email est déjà utilisé');
            }
          }

          await this.personnelRepository.update(personnel.id, filteredData);
          
          // ⚠️ FALLBACK: Si pas d'info multi-tenant, utiliser les données du JWT depuis req.user
          this.logger.warn(`⚠️ Mise à jour profil sans info multi-tenant pour personnel ${userId}`);
          throw new UnauthorizedException('Informations multi-tenant manquantes - reconnectez-vous');
        }

      } else {
        // Mise à jour client
        const client = await this.clientRepository.findOne({
          where: { id: parseInt(userId) },
        });

        if (!client) {
          throw new UnauthorizedException('Client non trouvé');
        }

        // Valider les champs modifiables pour le client
        const allowedFields = ['nom', 'interlocuteur', 'type_client', 'adresse', 'code_postal', 'ville', 'pays', 'id_fiscal', 'photo'];
        const filteredData = {};
        
        allowedFields.forEach(field => {
          if (updateData[field] !== undefined) {
            filteredData[field] = updateData[field];
          }
        });

        await this.clientRepository.update(client.id, filteredData);
        
        // ⚠️ FALLBACK: Si pas d'info multi-tenant, lever une erreur
        this.logger.warn(`⚠️ Mise à jour profil sans info multi-tenant pour client ${userId}`);
        throw new UnauthorizedException('Informations multi-tenant manquantes - reconnectez-vous');
      }
    } catch (error) {
      this.logger.error(`Erreur mise à jour profil pour ${userType} ${userId}:`, error);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new UnauthorizedException('Impossible de mettre à jour le profil');
    }
  }

  /**
   * Change le mot de passe d'un utilisateur
   */
  async changeUserPassword(userId: string, userType: 'personnel' | 'client', passwordData: { currentPassword: string; newPassword: string }): Promise<any> {
    try {
      if (userType === 'personnel') {
        const personnel = await this.personnelRepository.findOne({
          where: { id: parseInt(userId) },
        });

        if (!personnel) {
          throw new UnauthorizedException('Personnel non trouvé');
        }

        // Vérifier le mot de passe actuel
        const isCurrentPasswordValid = await bcrypt.compare(passwordData.currentPassword, personnel.mot_de_passe);
        if (!isCurrentPasswordValid) {
          throw new UnauthorizedException('Mot de passe actuel incorrect');
        }

        // Hasher le nouveau mot de passe
        const hashedNewPassword = await this.hashPassword(passwordData.newPassword);

        // Mettre à jour le mot de passe et marquer que ce n'est plus le premier login
        await this.personnelRepository.update(personnel.id, {
          mot_de_passe: hashedNewPassword,
          first_login: false
        });

        // Synchroniser avec Keycloak si disponible
        if (this.keycloakService && personnel.keycloak_id) {
          try {
            await this.keycloakService.updateUserPassword(personnel.keycloak_id, passwordData.newPassword);
            this.logger.log(`Mot de passe synchronisé avec Keycloak pour le personnel: ${personnel.nom_utilisateur}`);
          } catch (keycloakError) {
            this.logger.warn(`Erreur synchronisation Keycloak pour ${personnel.nom_utilisateur}:`, keycloakError);
            // Ne pas faire échouer le changement si Keycloak échoue
          }
        }

        return { message: 'Mot de passe modifié avec succès' };

      } else {
        const client = await this.clientRepository.findOne({
          where: { id: parseInt(userId) },
        });

        if (!client) {
          throw new UnauthorizedException('Client non trouvé');
        }

        // Vérifier le mot de passe actuel
        const isCurrentPasswordValid = await bcrypt.compare(passwordData.currentPassword, client.mot_de_passe);
        if (!isCurrentPasswordValid) {
          throw new UnauthorizedException('Mot de passe actuel incorrect');
        }

        // Hasher le nouveau mot de passe
        const hashedNewPassword = await this.hashPassword(passwordData.newPassword);

        // Mettre à jour le mot de passe et marquer que ce n'est plus le premier login
        await this.clientRepository.update(client.id, {
          mot_de_passe: hashedNewPassword,
          first_login: false
        });

        // Synchroniser avec Keycloak si disponible
        if (this.keycloakService && client.keycloak_id) {
          try {
            await this.keycloakService.updateUserPassword(client.keycloak_id, passwordData.newPassword);
            this.logger.log(`Mot de passe synchronisé avec Keycloak pour le client: ${client.nom}`);
          } catch (keycloakError) {
            this.logger.warn(`Erreur synchronisation Keycloak pour ${client.nom}:`, keycloakError);
            // Ne pas faire échouer le changement si Keycloak échoue
          }
        }

        return { message: 'Mot de passe modifié avec succès' };
      }
    } catch (error) {
      this.logger.error(`Erreur changement mot de passe pour ${userType} ${userId}:`, error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Impossible de changer le mot de passe');
    }
  }

  /**
   * Changer le mot de passe lors du premier login (sans vérifier l'ancien mot de passe)
   * ✅ MULTI-TENANT: Cherche l'utilisateur dans TOUTES les organisations et retourne un JWT valide
   */
  async changePasswordFirstLogin(userId: string, userType: 'personnel' | 'client', newPassword: string, databaseName?: string, organisationId?: number): Promise<any> {
    try {
      this.logger.log(`🔐 FIRST-LOGIN MULTI-TENANT: Changement mot de passe pour ${userType} #${userId}`);
      
      // 🏢 ÉTAPE 1: Si pas de databaseName fourni, chercher l'utilisateur dans TOUTES les organisations
      if (!databaseName || !organisationId) {
        this.logger.log(`🔍 Recherche de l'utilisateur dans toutes les organisations...`);
        
        const mainConnection = await this.databaseConnectionService.getMainConnection();
        const organisations = await mainConnection.query(
          'SELECT id, nom, database_name FROM organisations WHERE database_name IS NOT NULL ORDER BY id'
        );
        
        for (const org of organisations) {
          const { id: orgId, nom: orgName, database_name: dbName } = org;
          
          try {
            const connection = await this.databaseConnectionService.getOrganisationConnection(dbName);
            
            if (userType === 'personnel') {
              const personnelResult = await connection.query(
                `SELECT * FROM personnel WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
                [parseInt(userId), orgId]
              );
              
              if (personnelResult && personnelResult.length > 0) {
                databaseName = dbName;
                organisationId = orgId;
                this.logger.log(`✅ Personnel trouvé dans ${orgName} (${dbName})`);
                break;
              }
            } else {
              const clientResult = await connection.query(
                `SELECT * FROM client WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
                [parseInt(userId), orgId]
              );
              
              if (clientResult && clientResult.length > 0) {
                databaseName = dbName;
                organisationId = orgId;
                this.logger.log(`✅ Client trouvé dans ${orgName} (${dbName})`);
                break;
              }
            }
          } catch (error) {
            continue;
          }
        }
        
        if (!databaseName || !organisationId) {
          throw new UnauthorizedException('Utilisateur non trouvé dans aucune organisation');
        }
      }
      
      // 🏢 ÉTAPE 2: Utiliser la bonne connexion pour mettre à jour le mot de passe
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      this.logger.log(`🔗 Connexion à la base ${databaseName} pour organisation #${organisationId}`);
      
      if (userType === 'personnel') {
        // Récupérer le personnel
        const personnelResult = await connection.query(
          `SELECT * FROM personnel WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
          [parseInt(userId), organisationId]
        );
        
        if (!personnelResult || personnelResult.length === 0) {
          throw new UnauthorizedException('Personnel non trouvé');
        }
        
        const personnel = personnelResult[0];
        
        // Vérifier que c'est le premier login
        if (!personnel.first_login) {
          this.logger.warn(`⚠️ Tentative changePasswordFirstLogin pour personnel déjà connecté: ${personnel.nom_utilisateur}`);
          throw new UnauthorizedException('Cette méthode est réservée au premier login');
        }
        
        // Hasher le nouveau mot de passe
        const hashedNewPassword = await this.hashPassword(newPassword);
        
        // Mettre à jour dans la bonne base
        await connection.query(
          `UPDATE personnel SET mot_de_passe = $1, first_login = false WHERE id = $2 AND organisation_id = $3`,
          [hashedNewPassword, parseInt(userId), organisationId]
        );
        
        // Synchroniser avec Keycloak si disponible
        if (this.keycloakService && personnel.keycloak_id) {
          try {
            await this.keycloakService.updateUserPassword(personnel.keycloak_id, newPassword);
            this.logger.log(`✅ Keycloak synchronisé pour ${personnel.nom_utilisateur}`);
          } catch (keycloakError) {
            this.logger.warn(`⚠️ Erreur Keycloak pour ${personnel.nom_utilisateur}:`, keycloakError);
          }
        }
        
        // 🏢 RÉCUPÉRER LES INFOS DE L'ORGANISATION
        const mainConnection = await this.databaseConnectionService.getMainConnection();
        const orgResult = await mainConnection.query(
          'SELECT nom FROM organisations WHERE id = $1',
          [organisationId]
        );
        const organisationName = orgResult[0]?.nom || 'Organisation';
        
        // ✅ GÉNÉRER UN NOUVEAU JWT AVEC LES INFOS MULTI-TENANT
        const payload: JwtPayload = {
          sub: personnel.id.toString(),
          username: personnel.nom_utilisateur,
          email: personnel.email || '',
          role: personnel.role,
          userType: 'personnel',
          is_superviseur: personnel.is_superviseur || false,
          organisationId: organisationId,
          databaseName: databaseName,
          organisationName: organisationName,
        };
        
        const access_token = this.jwtService.sign(payload);
        const refresh_token = this.jwtService.sign(payload, {
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
        });
        
        this.logger.log(`🎉 First-login réussi pour ${personnel.nom_utilisateur} (${organisationName})`);
        
        return {
          success: true,
          message: 'Mot de passe modifié avec succès',
          access_token,
          refresh_token,
          user: {
            id: personnel.id.toString(),
            username: personnel.nom_utilisateur,
            email: personnel.email || '',
            role: personnel.role,
            userType: 'personnel',
            fullName: `${personnel.prenom} ${personnel.nom}`,
            photo: personnel.photo || null,
            first_login: false,
          },
        };
        
      } else {
        // CLIENT
        const clientResult = await connection.query(
          `SELECT * FROM client WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
          [parseInt(userId), organisationId]
        );
        
        if (!clientResult || clientResult.length === 0) {
          throw new UnauthorizedException('Client non trouvé');
        }
        
        const client = clientResult[0];
        
        // Vérifier que c'est le premier login
        if (!client.first_login) {
          this.logger.warn(`⚠️ Tentative changePasswordFirstLogin pour client déjà connecté: ${client.nom}`);
          throw new UnauthorizedException('Cette méthode est réservée au premier login');
        }
        
        // Hasher le nouveau mot de passe
        const hashedNewPassword = await this.hashPassword(newPassword);
        
        // Mettre à jour dans la bonne base
        await connection.query(
          `UPDATE client SET mot_de_passe = $1, first_login = false WHERE id = $2 AND organisation_id = $3`,
          [hashedNewPassword, parseInt(userId), organisationId]
        );
        
        // Synchroniser avec Keycloak si disponible
        if (this.keycloakService && client.keycloak_id) {
          try {
            await this.keycloakService.updateUserPassword(client.keycloak_id, newPassword);
            this.logger.log(`✅ Keycloak synchronisé pour ${client.nom}`);
          } catch (keycloakError) {
            this.logger.warn(`⚠️ Erreur Keycloak pour ${client.nom}:`, keycloakError);
          }
        }
        
        // Récupérer l'email depuis contact_client
        let clientEmail = '';
        try {
          const contactResult = await connection.query(
            `SELECT mail1 FROM contact_client WHERE id_client = $1 ORDER BY id LIMIT 1`,
            [parseInt(userId)]
          );
          if (contactResult && contactResult.length > 0) {
            clientEmail = contactResult[0].mail1 || '';
          }
        } catch (error) {
          this.logger.warn(`Impossible de récupérer l'email du client ${client.nom}`);
        }
        
        // 🏢 RÉCUPÉRER LES INFOS DE L'ORGANISATION
        const mainConnection = await this.databaseConnectionService.getMainConnection();
        const orgResult = await mainConnection.query(
          'SELECT nom FROM organisations WHERE id = $1',
          [organisationId]
        );
        const organisationName = orgResult[0]?.nom || 'Organisation';
        
        // ✅ GÉNÉRER UN NOUVEAU JWT AVEC LES INFOS MULTI-TENANT
        const payload: JwtPayload = {
          sub: client.id.toString(),
          username: client.nom,
          email: clientEmail,
          role: 'client',
          userType: 'client',
          is_superviseur: false,
          organisationId: organisationId,
          databaseName: databaseName,
          organisationName: organisationName,
        };
        
        const access_token = this.jwtService.sign(payload);
        const refresh_token = this.jwtService.sign(payload, {
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
        });
        
        this.logger.log(`🎉 First-login réussi pour client ${client.nom} (${organisationName})`);
        
        return {
          success: true,
          message: 'Mot de passe modifié avec succès',
          access_token,
          refresh_token,
          user: {
            id: client.id.toString(),
            username: client.nom,
            email: clientEmail,
            role: 'client',
            userType: 'client',
            fullName: client.nom,
            photo: client.photo || null,
            first_login: false,
          },
        };
      }
    } catch (error) {
      this.logger.error(`❌ Erreur changement mot de passe premier login pour ${userType} ${userId}:`, error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Impossible de changer le mot de passe');
    }
  }

  /**
   * Récupère les informations utilisateur depuis Keycloak
   */
  async getKeycloakUserInfo(token: string): Promise<any> {
    try {
      if (!this.keycloakService) {
        this.logger.warn('Service Keycloak non disponible');
        return null;
      }

      const userInfo = await this.keycloakService.getUserInfo(token);
      
      if (userInfo) {
        this.logger.debug(`Informations Keycloak récupérées pour: ${userInfo.preferred_username}`);
        return userInfo;
      }

      return null;
    } catch (error) {
      this.logger.error(`Erreur récupération infos Keycloak: ${error.message}`);
      return null;
    }
  }

  /**
   * Synchronise un utilisateur depuis Keycloak vers notre base de données
   */
  async syncUserFromKeycloak(keycloakUserInfo: any): Promise<any> {
    try {
      this.logger.debug('Synchronisation utilisateur depuis Keycloak:', keycloakUserInfo);

      const email = keycloakUserInfo.email;
      const username = keycloakUserInfo.preferred_username;
      
      if (!email && !username) {
        throw new Error('Email ou nom d\'utilisateur requis pour la synchronisation');
      }

      // Chercher d'abord dans la table personnel
      let user = null;
      let userType = null;

      if (email) {
        user = await this.personnelRepository.findOne({
          where: { email: email }
        });
        if (user) {
          userType = 'personnel';
        }
      }

      // Si pas trouvé, chercher dans la table client via contact_client
      if (!user && email) {
        // Les clients n'ont pas de champ email direct, il faut chercher via contact_client
        const contactClient = await this.contactClientRepository.findOne({
          where: [
            { mail1: email },
            { mail2: email }
          ],
          relations: ['client']
        });
        if (contactClient && contactClient.client) {
          user = contactClient.client;
          userType = 'client';
        }
      }

      // Si pas trouvé par email, chercher par nom d'utilisateur - insensible à la casse
      if (!user && username) {
        user = await this.personnelRepository
          .createQueryBuilder('personnel')
          .where('LOWER(personnel.nom_utilisateur) = LOWER(:username)', { username })
          .getOne();
        if (user) {
          userType = 'personnel';
        }
      }

      if (!user) {
        throw new Error('Utilisateur non trouvé dans la base de données locale');
      }

      // Mettre à jour l'ID Keycloak si nécessaire
      if (keycloakUserInfo.sub && !user.keycloak_id) {
        if (userType === 'personnel') {
          await this.personnelRepository.update(user.id, { 
            keycloak_id: keycloakUserInfo.sub 
          });
        } else if (userType === 'client') {
          await this.clientRepository.update(user.id, { 
            keycloak_id: keycloakUserInfo.sub 
          });
        }
        user.keycloak_id = keycloakUserInfo.sub;
      }

      // Récupérer les rôles depuis Keycloak
      const roles = this.extractRolesFromKeycloak(keycloakUserInfo);

      // Pour les clients, récupérer l'email depuis contact_client
      let userEmail = user.email || email; // utiliser l'email de Keycloak par défaut
      if (userType === 'client') {
        try {
          const contactClient = await this.contactClientRepository.find({
            where: { id_client: user.id }
          });
          if (contactClient && contactClient.length > 0) {
            userEmail = contactClient[0].mail1 || contactClient[0].mail2 || email;
          }
        } catch (error) {
          this.logger.warn(`Erreur récupération email contact_client pour ${user.nom}:`, error.message);
          userEmail = email; // fallback sur l'email Keycloak
        }
      }

      return {
        user: {
          id: user.id,
          username: userType === 'personnel' ? user.nom_utilisateur : user.nom,
          email: userEmail,
          userType: userType,
          keycloak_id: user.keycloak_id,
          ...(userType === 'personnel' ? {
            prenom: user.prenom,
            nom: user.nom
          } : {
            nom: user.nom,
            telephone: user.telephone
          })
        },
        roles: roles
      };

    } catch (error) {
      this.logger.error(`Erreur synchronisation utilisateur Keycloak: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extrait les rôles depuis les informations Keycloak
   */
  private extractRolesFromKeycloak(keycloakUserInfo: any): string[] {
    const roles: string[] = [];

    try {
      // Rôles du realm
      if (keycloakUserInfo.realm_access && keycloakUserInfo.realm_access.roles) {
        roles.push(...keycloakUserInfo.realm_access.roles);
      }

      // Rôles du client
      if (keycloakUserInfo.resource_access) {
        const clientId = this.configService.get('KEYCLOAK_CLIENT_ID', 'velosi_auth');
        if (keycloakUserInfo.resource_access[clientId] && 
            keycloakUserInfo.resource_access[clientId].roles) {
          roles.push(...keycloakUserInfo.resource_access[clientId].roles);
        }
      }

      // Rôles depuis les groupes
      if (keycloakUserInfo.groups) {
        roles.push(...keycloakUserInfo.groups);
      }

      // Filtrer les rôles système par défaut
      const filteredRoles = roles.filter(role => 
        !['default-roles-erp_velosi', 'offline_access', 'uma_authorization'].includes(role)
      );

      this.logger.debug(`Rôles extraits de Keycloak: ${filteredRoles.join(', ')}`);
      return filteredRoles;

    } catch (error) {
      this.logger.warn(`Erreur extraction rôles Keycloak: ${error.message}`);
      return [];
    }
  }

  /**
   * Récupère les rôles d'un utilisateur basés sur les données locales
   */
  async getUserRoles(userId: string, userType: 'personnel' | 'client'): Promise<string[]> {
    try {
      const roles: string[] = [];

      if (userType === 'personnel') {
        const personnel = await this.personnelRepository.findOne({
          where: { id: parseInt(userId) }
        });

        if (personnel) {
          // Ajouter des rôles basés sur le statut du personnel
          roles.push('personnel');
          
          // Vérifier si c'est un admin (vous pouvez ajuster la logique selon vos besoins)
          if (personnel.email && personnel.email.includes('admin')) {
            roles.push('admin');
          }
          
          // Ajouter d'autres rôles selon votre logique métier
          if (personnel.statut === 'actif') {
            roles.push('active_user');
          }
        }
      } else if (userType === 'client') {
        const client = await this.clientRepository.findOne({
          where: { id: parseInt(userId) }
        });

        if (client) {
          roles.push('client');
          
          // Ajouter des rôles basés sur le statut du client
          if (client.statut === 'actif') {
            roles.push('active_client');
          }
        }
      }

      this.logger.debug(`Rôles locaux pour ${userType} ${userId}: ${roles.join(', ')}`);
      return roles;

    } catch (error) {
      this.logger.warn(`Erreur récupération rôles locaux: ${error.message}`);
      return [];
    }
  }

  /**
   * Find personnel by email
   */
  async findPersonnelByEmail(email: string): Promise<any> {
    try {
      const personnel = await this.personnelRepository.findOne({
        where: { email: email }
      });
      return personnel;
    } catch (error) {
      this.logger.warn(`Erreur recherche personnel par email: ${error.message}`);
      return null;
    }
  }

  /**
   * Find client by email
   */
  async findClientByEmail(email: string): Promise<any> {
    try {
      const client = await this.clientRepository.findOne({
        where: { email: email }
      });
      return client;
    } catch (error) {
      this.logger.warn(`Erreur recherche client par email: ${error.message}`);
      return null;
    }
  }

  /**
   * Récupère les sessions actives d'un personnel
   */
  async getPersonnelSessions(personnelId: number): Promise<any> {
    try {
      // Récupérer le personnel depuis la base de données
      const personnel = await this.personnelRepository.findOne({
        where: { id: personnelId }
      });

      if (!personnel) {
        throw new NotFoundException(`Personnel avec ID ${personnelId} introuvable`);
      }

      if (!personnel.keycloak_id) {
        throw new NotFoundException(`Personnel ${personnelId} n'est pas synchronisé avec Keycloak`);
      }

      // Récupérer les sessions depuis Keycloak
      const sessions = await this.keycloakService.getUserSessions(personnel.keycloak_id);
      
      this.logger.log(`Sessions récupérées pour personnel ${personnelId}: ${sessions.length} session(s) active(s)`);
      return {
        personnelId: personnel.id,
        nom: personnel.nom,
        prenom: personnel.prenom,
        email: personnel.email,
        keycloakId: personnel.keycloak_id,
        sessions: sessions,
        totalSessions: sessions.length
      };

    } catch (error) {
      this.logger.error(`Erreur récupération sessions personnel ${personnelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupère l'activité d'un personnel depuis Keycloak
   */
  async getPersonnelActivity(personnelId: number): Promise<any> {
    try {
      // Récupérer le personnel depuis la base de données
      const personnel = await this.personnelRepository.findOne({
        where: { id: personnelId }
      });

      if (!personnel) {
        throw new NotFoundException(`Personnel avec ID ${personnelId} introuvable`);
      }

      if (!personnel.keycloak_id) {
        throw new NotFoundException(`Personnel ${personnelId} n'est pas synchronisé avec Keycloak`);
      }

      // Récupérer l'activité depuis Keycloak
      const activity = await this.keycloakService.getUserActivity(personnel.keycloak_id);
      
      this.logger.log(`Activité récupérée pour personnel ${personnelId}`);
      return {
        personnelId: personnel.id,
        nom: personnel.nom,
        prenom: personnel.prenom,
        email: personnel.email,
        keycloakId: personnel.keycloak_id,
        activity: activity
      };

    } catch (error) {
      this.logger.error(`Erreur récupération activité personnel ${personnelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ferme toutes les sessions actives d'un personnel
   */
  async closePersonnelSessions(personnelId: number): Promise<any> {
    try {
      // Récupérer le personnel depuis la base de données
      const personnel = await this.personnelRepository.findOne({
        where: { id: personnelId }
      });

      if (!personnel) {
        throw new NotFoundException(`Personnel avec ID ${personnelId} introuvable`);
      }

      if (!personnel.keycloak_id) {
        throw new NotFoundException(`Personnel ${personnelId} n'est pas synchronisé avec Keycloak`);
      }

      // Fermer toutes les sessions dans Keycloak
      await this.keycloakService.logoutAllUserSessions(personnel.keycloak_id);
      
      this.logger.log(`Toutes les sessions fermées pour personnel ${personnelId}`);
      return {
        success: true,
        message: `Toutes les sessions du personnel ${personnel.prenom} ${personnel.nom} ont été fermées`,
        personnelId: personnel.id,
        keycloakId: personnel.keycloak_id
      };

    } catch (error) {
      this.logger.error(`Erreur fermeture sessions personnel ${personnelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupère les sessions actives d'un client
   */
  async getClientSessions(clientId: number): Promise<any> {
    try {
      // Récupérer le client depuis la base de données
      const client = await this.clientRepository.findOne({
        where: { id: clientId }
      });

      if (!client) {
        throw new NotFoundException(`Client avec ID ${clientId} introuvable`);
      }

      if (!client.keycloak_id) {
        throw new NotFoundException(`Client ${clientId} n'est pas synchronisé avec Keycloak (probablement un client temporaire)`);
      }

      // Récupérer le contact du client pour l'email
      const contact = await this.contactClientRepository.findOne({
        where: { client: { id: clientId } }
      });

      // Récupérer les sessions depuis Keycloak
      const sessions = await this.keycloakService.getUserSessions(client.keycloak_id);
      
      this.logger.log(`Sessions récupérées pour client ${clientId}: ${sessions.length} session(s) active(s)`);
      return {
        clientId: client.id,
        nom: client.nom,
        email: contact?.mail1 || 'N/A',
        isPermanent: client.is_permanent,
        keycloakId: client.keycloak_id,
        sessions: sessions,
        totalSessions: sessions.length
      };

    } catch (error) {
      this.logger.error(`Erreur récupération sessions client ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ferme toutes les sessions actives d'un client
   */
  async closeClientSessions(clientId: number): Promise<any> {
    try {
      // Récupérer le client depuis la base de données
      const client = await this.clientRepository.findOne({
        where: { id: clientId }
      });

      if (!client) {
        throw new NotFoundException(`Client avec ID ${clientId} introuvable`);
      }

      if (!client.keycloak_id) {
        throw new NotFoundException(`Client ${clientId} n'est pas synchronisé avec Keycloak (probablement un client temporaire)`);
      }

      // Fermer toutes les sessions dans Keycloak
      await this.keycloakService.logoutAllUserSessions(client.keycloak_id);
      
      this.logger.log(`Toutes les sessions fermées pour client ${clientId}`);
      return {
        success: true,
        message: `Toutes les sessions du client ${client.nom} ont été fermées`,
        clientId: client.id,
        keycloakId: client.keycloak_id
      };

    } catch (error) {
      this.logger.error(`Erreur fermeture sessions client ${clientId}: ${error.message}`);
      throw error;
    }
  }

  // ==========================================
  // MÉTHODES D'AUTHENTIFICATION BIOMÉTRIQUE
  // ==========================================
  // NOTE: La gestion biométrique a été déplacée vers BiometricService
  // pour supporter multi-appareils et Resident Keys (Passkeys)

  /**
   * Générer des tokens pour un utilisateur (utilisé après vérification biométrique)
   */
  async generateTokensForUser(
    userId: number,
    userType: 'personnel' | 'client'
  ): Promise<AuthResult> {
    try {
      const repository = userType === 'personnel' ? this.personnelRepository : this.clientRepository;
      const user = await repository.findOne({ where: { id: userId } });

      if (!user) {
        throw new UnauthorizedException('Utilisateur non trouvé');
      }

      // 🏢 Récupérer les informations multi-tenant
      const organisationId = user.organisation_id || 1;
      let databaseName = 'velosi';
      let organisationName = 'Velosi';
      
      try {
        const orgConnection = await this.databaseConnectionService.getOrganisationConnection('shipnology');
        const org = await orgConnection.query(
          'SELECT * FROM organisations WHERE id = $1 LIMIT 1',
          [organisationId]
        );
        if (org && org.length > 0) {
          databaseName = org[0].database_name || 'velosi';
          organisationName = org[0].name || 'Velosi';
        }
      } catch (error) {
        this.logger.warn(`⚠️ Erreur récupération organisation ${organisationId}:`, error.message);
      }

      const payload: JwtPayload = {
        username: userType === 'personnel' ? (user as Personnel).nom_utilisateur : user.nom,
        sub: user.id.toString(),
        email: user.email,
        role: userType === 'personnel' ? (user as Personnel).role : 'client',
        userType,
        is_superviseur: userType === 'personnel' ? ((user as Personnel).is_superviseur || false) : false,
        // 🏢 MULTI-TENANT (CRUCIAL)
        organisationId: organisationId,
        databaseName: databaseName,
        organisationName: organisationName,
      };

      const access_token = this.jwtService.sign(payload, {
        expiresIn: '8h',
      });

      const refresh_token = this.jwtService.sign(payload, {
        expiresIn: '8h',
      });

      return {
        access_token,
        refresh_token,
        user: {
          id: user.id.toString(),
          username: payload.username,
          email: user.email,
          role: payload.role,
          userType,
          photo: user.photo,
        },
      };
    } catch (error) {
      console.error('❌ Erreur génération tokens:', error);
      throw error;
    }
  }

  /**
   * ✅ Déconnexion d'un utilisateur - Marque le statut comme hors ligne
   * 🏢 Multi-tenant: Utilise databaseName et organisationId depuis le token JWT
   */
  async logout(userId: string, userType: 'personnel' | 'client', sessionId?: number, databaseName?: string, organisationId?: number): Promise<{ success: boolean; message: string }> {
    try {
      const id = parseInt(userId);
      this.logger.log(`🔴 DÉBUT LOGOUT MULTI-TENANT - userId: ${userId}, userType: ${userType}, database: ${databaseName}, orgId: ${organisationId}`);

      // 🏢 Utiliser la base de données spécifiée ou fallback sur velosi
      const dbName = databaseName || 'velosi';
      const orgId = organisationId || 1;
      
      const connection = await this.databaseConnectionService.getOrganisationConnection(dbName);

      if (userType === 'personnel') {
        // Requête SQL directe dans la bonne base
        const personnel = await connection.query(
          `SELECT * FROM personnel WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
          [id, orgId]
        );

        if (!personnel || personnel.length === 0) {
          this.logger.error(`❌ Personnel ID ${id} non trouvé dans ${dbName}`);
          throw new UnauthorizedException('Personnel non trouvé');
        }

        const user = personnel[0];
        this.logger.log(`📊 AVANT UPDATE - statut_en_ligne: ${user.statut_en_ligne}`);

        // Mettre à jour le statut en ligne à false
        await connection.query(
          `UPDATE personnel SET statut_en_ligne = false, last_activity = NOW() WHERE id = $1`,
          [id]
        );

        this.logger.log(`✅ UPDATE EXÉCUTÉ - Personnel ${user.nom_utilisateur} marqué comme hors ligne dans ${dbName}`);

        // Vérification post-update
        const personnelUpdated = await connection.query(
          `SELECT statut_en_ligne FROM personnel WHERE id = $1 LIMIT 1`,
          [id]
        );
        
        if (personnelUpdated && personnelUpdated.length > 0) {
          this.logger.log(`📊 APRÈS UPDATE - statut_en_ligne: ${personnelUpdated[0].statut_en_ligne}`);
          
          if (personnelUpdated[0].statut_en_ligne === true) {
            this.logger.error(`⚠️ ALERTE: Le statut est toujours TRUE après l'update!`);
          } else {
            this.logger.log(`✅ SUCCÈS: Personnel ${user.nom_utilisateur} correctement hors ligne`);
          }
        }

        // 🔥 ENREGISTRER LA DÉCONNEXION DANS LE JOURNAL
        if (this.loginHistoryService) {
          try {
            if (sessionId) {
              await this.loginHistoryService.recordLogout(sessionId, databaseName, organisationId);
              this.logger.log(`✅ Déconnexion enregistrée pour session spécifique #${sessionId}`);
            } else {
              this.logger.warn(`⚠️ Pas de sessionId fourni, utilisation du fallback`);
              const activeSessions = await this.loginHistoryService.getActiveSessions(id, UserType.PERSONNEL, databaseName, organisationId);
              if (activeSessions && activeSessions.length > 0) {
                const lastSession = activeSessions[0];
                await this.loginHistoryService.recordLogout(lastSession.id, databaseName, organisationId);
                this.logger.log(`✅ Déconnexion enregistrée pour dernière session #${lastSession.id}`);
              }
            }
          } catch (error) {
            this.logger.warn(`⚠️ Erreur lors de l'enregistrement de la déconnexion:`, error);
          }
        }

        // Fermer les sessions Keycloak si disponible
        if (this.keycloakService && user.keycloak_id) {
          try {
            await this.keycloakService.logoutAllUserSessions(user.keycloak_id);
            this.logger.log(`✅ Sessions Keycloak fermées pour ${user.nom_utilisateur}`);
          } catch (keycloakError) {
            this.logger.warn(`⚠️ Erreur fermeture sessions Keycloak: ${keycloakError.message}`);
          }
        }

        return {
          success: true,
          message: 'Déconnexion réussie',
        };
        
      } else {
        // Client logout
        const client = await connection.query(
          `SELECT * FROM client WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
          [id, orgId]
        );

        if (!client || client.length === 0) {
          this.logger.error(`❌ Client ID ${id} non trouvé dans ${dbName}`);
          throw new UnauthorizedException('Client non trouvé');
        }

        const user = client[0];
        this.logger.log(`📊 AVANT UPDATE - statut_en_ligne: ${user.statut_en_ligne}`);

        // Mettre à jour le statut en ligne à false
        await connection.query(
          `UPDATE client SET statut_en_ligne = false, last_activity = NOW() WHERE id = $1`,
          [id]
        );

        this.logger.log(`✅ UPDATE EXÉCUTÉ - Client ${user.nom} marqué comme hors ligne dans ${dbName}`);

        // Vérification post-update
        const clientUpdated = await connection.query(
          `SELECT statut_en_ligne FROM client WHERE id = $1 LIMIT 1`,
          [id]
        );
        
        if (clientUpdated && clientUpdated.length > 0) {
          this.logger.log(`📊 APRÈS UPDATE - statut_en_ligne: ${clientUpdated[0].statut_en_ligne}`);
          
          if (clientUpdated[0].statut_en_ligne === true) {
            this.logger.error(`⚠️ ALERTE: Le statut est toujours TRUE après l'update!`);
          } else {
            this.logger.log(`✅ SUCCÈS: Client ${user.nom} correctement hors ligne`);
          }
        }

        // 🔥 ENREGISTRER LA DÉCONNEXION DANS LE JOURNAL
        if (this.loginHistoryService) {
          try {
            if (sessionId) {
              await this.loginHistoryService.recordLogout(sessionId, databaseName, organisationId);
              this.logger.log(`✅ Déconnexion client enregistrée pour session #${sessionId}`);
            } else {
              this.logger.warn(`⚠️ Pas de sessionId fourni pour client`);
              const activeSessions = await this.loginHistoryService.getActiveSessions(id, UserType.CLIENT, databaseName, organisationId);
              if (activeSessions && activeSessions.length > 0) {
                const lastSession = activeSessions[0];
                await this.loginHistoryService.recordLogout(lastSession.id, databaseName, organisationId);
                this.logger.log(`✅ Déconnexion client enregistrée pour session #${lastSession.id}`);
              }
            }
          } catch (error) {
            this.logger.warn(`⚠️ Erreur enregistrement déconnexion:`, error);
          }
        }

        // Fermer les sessions Keycloak si disponible
        if (this.keycloakService && user.keycloak_id) {
          try {
            await this.keycloakService.logoutAllUserSessions(user.keycloak_id);
            this.logger.log(`✅ Sessions Keycloak fermées pour ${user.nom}`);
          } catch (keycloakError) {
            this.logger.warn(`⚠️ Erreur fermeture sessions Keycloak: ${keycloakError.message}`);
          }
        }

        return {
          success: true,
          message: 'Déconnexion réussie',
        };
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la déconnexion: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      return {
        success: false,
        message: 'Erreur lors de la déconnexion',
      };
    }
  }

  // ==========================================
  // RÉINITIALISATION MOT DE PASSE PAR ADMIN
  // ==========================================

  /**
   * 🔐 Réinitialiser le mot de passe d'un personnel (Admin uniquement) - Multi-tenant
   */
  async adminResetPersonnelPassword(
    databaseName: string,
    organisationId: number,
    personnelId: number,
    newPassword: string,
    adminName?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔐 [adminResetPersonnelPassword] DB: ${databaseName}, Org: ${organisationId}, Personnel: ${personnelId}, Admin: ${adminName || 'non spécifié'}`);

      // Récupérer la connexion à la base de données de l'organisation
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

      // ✅ CORRECTION MULTI-TENANT: Pas besoin de filtrer par organisation_id
      // car on est déjà dans la bonne base de données de l'organisation
      const personnel = await connection.query(
        'SELECT * FROM personnel WHERE id = $1',
        [personnelId]
      );
      
      this.logger.log(`🔍 [adminResetPersonnelPassword] Personnel trouvé: ${JSON.stringify(personnel.map(p => ({ id: p.id, nom: p.nom, prenom: p.prenom, organisation_id: p.organisation_id })))}`);

      if (!personnel || personnel.length === 0) {
        throw new NotFoundException(`Personnel #${personnelId} non trouvé dans la base ${databaseName}`);
      }

      const personnelData = personnel[0];

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Mettre à jour le mot de passe
      await connection.query(
        'UPDATE personnel SET mot_de_passe = $1 WHERE id = $2',
        [hashedPassword, personnelId]
      );

      // Mettre à jour dans Keycloak si disponible
      if (this.keycloakService && personnelData.keycloak_id) {
        try {
          await this.keycloakService.resetUserPassword(personnelData.keycloak_id, newPassword);
          this.logger.log(`✅ Mot de passe mis à jour dans Keycloak pour ${personnelData.email}`);
        } catch (keycloakError) {
          this.logger.warn(`⚠️ Erreur mise à jour Keycloak: ${keycloakError.message}`);
        }
      }

      // Envoyer email de notification au personnel avec le nom de l'admin
      if (personnelData.email) {
        try {
          await this.emailService.sendPasswordResetByAdminEmail(
            personnelData.email,
            personnelData.nom_utilisateur || `${personnelData.prenom} ${personnelData.nom}`,
            'personnel',
            newPassword,
            adminName
          );
          this.logger.log(`✅ Email de notification envoyé à ${personnelData.email} (action par: ${adminName || 'admin'})`);
        } catch (emailError) {
          this.logger.warn(`⚠️ Erreur envoi email notification: ${emailError.message}`);
        }
      }

      this.logger.log(`✅ [adminResetPersonnelPassword] Mot de passe personnel #${personnelId} réinitialisé avec succès`);

      return {
        success: true,
        message: `Mot de passe de ${personnelData.prenom} ${personnelData.nom} réinitialisé avec succès`,
      };
    } catch (error) {
      this.logger.error(`❌ [adminResetPersonnelPassword] Erreur:`, error);
      throw error;
    }
  }

  /**
   * 🔐 Réinitialiser le mot de passe d'un client (Admin uniquement) - Multi-tenant
   */
  async adminResetClientPassword(
    databaseName: string,
    organisationId: number,
    clientId: number,
    newPassword: string,
    adminName?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔐 [adminResetClientPassword] DB: ${databaseName}, Org: ${organisationId}, Client: ${clientId}, Admin: ${adminName || 'non spécifié'}`);

      // Récupérer la connexion à la base de données de l'organisation
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

      // ✅ CORRECTION MULTI-TENANT: Pas besoin de filtrer par organisation_id
      // car on est déjà dans la bonne base de données de l'organisation
      const client = await connection.query(
        'SELECT * FROM clients WHERE id = $1',
        [clientId]
      );
      
      this.logger.log(`🔍 [adminResetClientPassword] Client trouvé: ${JSON.stringify(client.map(c => ({ id: c.id, nom: c.nom, organisation_id: c.organisation_id })))}`);

      if (!client || client.length === 0) {
        throw new NotFoundException(`Client #${clientId} non trouvé dans la base ${databaseName}`);
      }

      const clientData = client[0];

      // Récupérer les contacts du client
      const contacts = await connection.query(
        'SELECT * FROM contact_client WHERE client_id = $1 ORDER BY is_principal DESC',
        [clientId]
      );

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Mettre à jour le mot de passe
      await connection.query(
        'UPDATE clients SET mot_de_passe = $1 WHERE id = $2',
        [hashedPassword, clientId]
      );

      // Mettre à jour dans Keycloak si disponible
      if (this.keycloakService && clientData.keycloak_id) {
        try {
          await this.keycloakService.resetUserPassword(clientData.keycloak_id, newPassword);
          this.logger.log(`✅ Mot de passe mis à jour dans Keycloak pour ${clientData.nom}`);
        } catch (keycloakError) {
          this.logger.warn(`⚠️ Erreur mise à jour Keycloak: ${keycloakError.message}`);
        }
      }

      // Récupérer l'email du client depuis le contact principal
      let clientEmail: string | null = null;
      
      if (contacts && contacts.length > 0) {
        const principalContact = contacts.find(c => c.is_principal === true);
        
        if (principalContact) {
          clientEmail = principalContact.mail1 || principalContact.mail2 || null;
          this.logger.log(`📧 Email récupéré depuis contact principal: ${clientEmail}`);
        } else {
          const firstContact = contacts[0];
          clientEmail = firstContact.mail1 || firstContact.mail2 || null;
          this.logger.log(`📧 Email récupéré depuis premier contact: ${clientEmail}`);
        }
      }

      // Envoyer email de notification au client avec le nom de l'admin
      if (clientEmail && !clientEmail.includes('@client.velosi.com')) {
        try {
          await this.emailService.sendPasswordResetByAdminEmail(
            clientEmail,
            clientData.nom,
            'client',
            newPassword,
            adminName
          );
          this.logger.log(`✅ Email de notification envoyé à ${clientEmail} (action par: ${adminName || 'admin'})`);
        } catch (emailError) {
          this.logger.warn(`⚠️ Erreur envoi email notification: ${emailError.message}`);
        }
      } else {
        this.logger.warn(`⚠️ Pas d'email valide pour le client ${clientData.nom} - Email non envoyé`);
      }

      this.logger.log(`✅ [adminResetClientPassword] Mot de passe client #${clientId} réinitialisé avec succès`);

      return {
        success: true,
        message: `Mot de passe de ${clientData.nom} réinitialisé avec succès`,
      };
    } catch (error) {
      this.logger.error(`❌ [adminResetClientPassword] Erreur:`, error);
      throw error;
    }
  }

  /**
   * 🏢 Récupérer une organisation par son ID
   */
  async getOrganisationById(organisationId: number): Promise<any> {
    const mainConnection = await this.databaseConnectionService.getMainConnection();
    const result = await mainConnection.query(
      `SELECT id, nom, nom_affichage, logo_url, slug, telephone, adresse, email_contact FROM organisations WHERE id = $1`,
      [organisationId]
    );
    
    if (!result || result.length === 0) {
      throw new NotFoundException(`Organisation avec l'ID ${organisationId} introuvable`);
    }
    
    return result[0];
  }
}
