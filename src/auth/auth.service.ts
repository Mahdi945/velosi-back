import {
  Injectable,
  UnauthorizedException,
  Logger,
  ConflictException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { ContactClient } from '../entities/contact-client.entity';
import { KeycloakService } from './keycloak.service';
import { CreatePersonnelDto, CreateClientDto } from '../dto/register.dto';
import { ContactClientService } from '../services/contact-client.service';
import { EmailService } from '../services/email.service';
import { OtpService } from '../services/otp.service';

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
  };
  client?: {
    id: number;
    nom: string;
    email: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(ContactClient)
    private contactClientRepository: Repository<ContactClient>,
    private jwtService: JwtService,
    @Optional() private keycloakService: KeycloakService,
    private configService: ConfigService,
    private contactClientService: ContactClientService,
    private emailService: EmailService,
    private otpService: OtpService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    // Rechercher d'abord dans le personnel (par nom_utilisateur OU email) - insensible à la casse
    const personnel = await this.personnelRepository
      .createQueryBuilder('personnel')
      .where('LOWER(personnel.nom_utilisateur) = LOWER(:username)', { username })
      .orWhere('LOWER(personnel.email) = LOWER(:username)', { username })
      .getOne();

    if (personnel && (await bcrypt.compare(password, personnel.mot_de_passe))) {
      // Vérifier le statut du personnel
      if (personnel.statut !== 'actif') {
        const statusMessages = {
          'inactif': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
          'suspendu': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
          'desactive': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus'
        };
        const message = statusMessages[personnel.statut] || 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus';
        throw new UnauthorizedException(message);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mot_de_passe, ...result } = personnel;
      return { ...result, userType: 'personnel' };
    }

    // Rechercher ensuite dans les clients (par nom OU interlocuteur) - insensible à la casse
    const client = await this.clientRepository
      .createQueryBuilder('client')
      .where('LOWER(client.nom) = LOWER(:username)', { username })
      .orWhere('LOWER(client.interlocuteur) = LOWER(:username)', { username })
      .getOne();

    if (client && (await bcrypt.compare(password, client.mot_de_passe))) {
      // Vérifier le statut du client
      if (client.statut !== 'actif') {
        const statusMessages = {
          'inactif': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
          'suspendu': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
          'desactive': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus'
        };
        const message = statusMessages[client.statut] || 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus';
        throw new UnauthorizedException(message);
      }
      // Vérifier également l'ancien champ blocage pour la compatibilité
      if (client.blocage) {
        throw new UnauthorizedException('Compte bloqué');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mot_de_passe, ...result } = client;
      return { ...result, userType: 'client' };
    }

    // Si pas trouvé par nom/interlocuteur, rechercher client par email dans contact_client
    try {
      const contactResult = await this.contactClientService.findByEmail(username);
      if (contactResult && contactResult.client) {
        const clientByEmail = contactResult.client;
        if (await bcrypt.compare(password, clientByEmail.mot_de_passe)) {
          // Vérifier le statut du client
          if (clientByEmail.statut !== 'actif') {
            const statusMessages = {
              'inactif': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
              'suspendu': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus',
              'desactive': 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus'
            };
            const message = statusMessages[clientByEmail.statut] || 'Vous êtes suspendu ou désactivé, contactez l\'administration de Velosi pour en savoir plus';
            throw new UnauthorizedException(message);
          }
          // Vérifier également l'ancien champ blocage pour la compatibilité
          if (clientByEmail.blocage) {
            throw new UnauthorizedException('Compte bloqué');
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { mot_de_passe, ...result } = clientByEmail;
          return { ...result, userType: 'client' };
        }
      }
    } catch (error) {
      // Si l'email n'est pas trouvé dans contact_client, on continue sans erreur
      this.logger.debug(`Email ${username} not found in contact_client`);
    }

    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
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
        const contactClient = await this.contactClientService.findByClient(user.id);
        if (contactClient && contactClient.length > 0) {
          userEmail = contactClient[0].mail1 || contactClient[0].mail2 || '';
          this.logger.log(`Email récupéré depuis contact_client pour ${user.nom}: ${userEmail}`);
        }
      } catch (error) {
        this.logger.warn(`Erreur récupération email pour client ${user.nom}:`, error.message);
      }
    }

    const payload: JwtPayload = {
      sub: user.id.toString(),
      username: user.userType === 'personnel' ? user.nom_utilisateur : user.nom,
      email: userEmail,
      role: user.userType === 'personnel' ? user.role : 'client',
      userType: user.userType,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

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
    };
  }

  async refreshToken(refresh_token: string): Promise<AuthResult> {
    try {
      const payload = this.jwtService.verify(refresh_token);

      // Vérifier que l'utilisateur existe toujours
      let user;
      if (payload.userType === 'personnel') {
        user = await this.personnelRepository.findOne({
          where: { id: parseInt(payload.sub) },
        });
      } else {
        user = await this.clientRepository.findOne({
          where: { id: parseInt(payload.sub) },
        });
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
            await this.personnelRepository.update(user.id, { keycloak_id: keycloakId });
            // Assigner le rôle dans Keycloak
            await this.keycloakService.updateUserRole(keycloakId, user.role);
          } else {
            await this.clientRepository.update(user.id, { keycloak_id: keycloakId });
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
    
    let user;
    if (payload.userType === 'personnel') {
      console.log('validateJwtPayload - Recherche personnel avec ID:', payload.sub);
      user = await this.personnelRepository.findOne({
        where: { id: parseInt(payload.sub) },
      });
      console.log('validateJwtPayload - Personnel trouvé:', user ? user.nom : 'null');
    } else {
      console.log('validateJwtPayload - Recherche client avec ID:', payload.sub);
      user = await this.clientRepository.findOne({
        where: { id: parseInt(payload.sub) },
      });
      
      // Pour les clients, récupérer l'email depuis contact_client si pas dans le payload
      if (user && (!payload.email || payload.email === '')) {
        try {
          const contactClient = await this.contactClientService.findByClient(user.id);
          if (contactClient && contactClient.length > 0) {
            const email = contactClient[0].mail1 || contactClient[0].mail2 || '';
            payload.email = email;
            this.logger.debug(`Email mis à jour pour le client ${user.nom}: ${email}`);
          }
        } catch (error) {
          this.logger.warn(`Erreur récupération email pour validation JWT du client ${user.nom}:`, error.message);
        }
      }
    }

    if (!user) {
      console.log('validateJwtPayload - Aucun utilisateur trouvé, throwing UnauthorizedException');
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    console.log('validateJwtPayload - Utilisateur trouvé, construction de la réponse');

    // Construire l'objet utilisateur avec le champ photo
    const userResponse = {
      id: user.id,
      username: payload.userType === 'personnel' ? user.nom_utilisateur : user.nom,
      email: payload.email || user.email || '',
      role: payload.role,
      userType: payload.userType,
      fullName: payload.userType === 'personnel' 
        ? `${user.prenom} ${user.nom}`
        : user.nom,
      photo: user.photo || null, // Inclure le champ photo
      // Informations spécifiques au type d'utilisateur
      ...(payload.userType === 'personnel' && {
        prenom: user.prenom,
        nom: user.nom,
        telephone: user.telephone,
        genre: user.genre,
        statut: user.statut
      }),
      ...(payload.userType === 'client' && {
        interlocuteur: user.interlocuteur,
        adresse: user.adresse,
        ville: user.ville,
        pays: user.pays
      })
    };

    console.log('validateJwtPayload - Réponse construite:', userResponse);
    return userResponse;
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
          // Sauvegarder l'ID Keycloak dans la base
          savedPersonnel.keycloak_id = keycloakUserId;
          await this.personnelRepository.save(savedPersonnel);
          this.logger.log(`Personnel ${savedPersonnel.nom_utilisateur} synchronisé avec Keycloak: ${keycloakUserId}`);
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

  async registerClient(createClientDto: CreateClientDto): Promise<AuthResult> {
    // Vérifier si le client existe déjà
    const existingClient = await this.clientRepository.findOne({
      where: { nom: createClientDto.nom },
    });

    if (existingClient) {
      throw new ConflictException('Ce nom de client existe déjà');
    }

    // Hasher le mot de passe
    const hashedPassword = await this.hashPassword(
      createClientDto.mot_de_passe,
    );

    // Créer le client (sans email - l'email sera dans contact_client)
    const client = this.clientRepository.create({
      ...createClientDto,
      mot_de_passe: hashedPassword,
      blocage: false,
      maj_web: true,
      photo: 'uploads/profiles/default-avatar.png', // Assigner l'avatar par défaut
    });

    const savedClients = await this.clientRepository.save(client);
    const savedClient = Array.isArray(savedClients) ? savedClients[0] : savedClients;

    this.logger.log(`Nouveau client créé: ${savedClient.nom}`);
    // Log des données reçues pour le debug
    this.logger.log(`Données reçues - Tel1: ${createClientDto.contact_tel1}, Mail1: ${createClientDto.contact_mail1}`);
    this.logger.log(`Contact tel2: ${createClientDto.contact_tel2}, Mail2: ${createClientDto.contact_mail2}`);

    // Créer le contact client (toujours créer si on a au moins un email ou téléphone)
    let contactEmail = '';
    if (createClientDto.contact_tel1 || createClientDto.contact_tel2 || 
        createClientDto.contact_tel3 || createClientDto.contact_fax || 
        createClientDto.contact_mail1 || createClientDto.contact_mail2 || 
        createClientDto.contact_fonction) {
      
      try {
        const contactData = {
          clientId: savedClient.id,
          tel1: createClientDto.contact_tel1,
          tel2: createClientDto.contact_tel2,
          tel3: createClientDto.contact_tel3,
          fax: createClientDto.contact_fax,
          mail1: createClientDto.contact_mail1, // Utiliser l'email de contact comme mail1
          mail2: createClientDto.contact_mail2,
          fonction: createClientDto.contact_fonction,
        };

        this.logger.log(`Tentative de création de contact avec données:`, JSON.stringify(contactData));
        const createdContact = await this.contactClientService.create(contactData);
        contactEmail = createdContact.mail1 || '';
        this.logger.log(`Contact créé avec succès pour le client: ${savedClient.nom} - ID contact: ${createdContact.id_client} - Email: ${createdContact.mail1}`);
      } catch (error) {
        this.logger.error(`Erreur lors de la création du contact pour le client ${savedClient.nom}:`, error);
        // Ne pas faire échouer l'inscription si la création du contact échoue
      }
    } else {
      this.logger.warn(`Aucune donnée de contact fournie pour le client ${savedClient.nom}`);
    }

    // Synchroniser avec Keycloak et sauvegarder l'ID  
    try {
      if (this.keycloakService) {
        // Créer l'utilisateur Keycloak directement (sans délai)
        const keycloakUser = {
          username: savedClient.nom,
          email: contactEmail || '',
          firstName: savedClient.interlocuteur || savedClient.nom,
          lastName: '',
          enabled: true,
        };
        
        const keycloakUserId = await this.keycloakService.createUser(keycloakUser);
        if (keycloakUserId) {
          // Sauvegarder l'ID Keycloak dans la base
          savedClient.keycloak_id = keycloakUserId;
          await this.clientRepository.save(savedClient);
          this.logger.log(`Client ${savedClient.nom} synchronisé avec Keycloak: ${keycloakUserId}`);
        }
      }
    } catch (keycloakError) {
      this.logger.warn('Synchronisation Keycloak échouée pour client:', keycloakError);
      // Ne pas faire échouer l'inscription si la synchronisation Keycloak échoue
    }

    // Envoyer l'email avec les informations de connexion
    try {
      if (contactEmail && this.emailService) {
        await this.emailService.sendClientCredentialsEmail(
          contactEmail,
          savedClient.nom,
          createClientDto.mot_de_passe, // Mot de passe original non hashé
          savedClient.nom,
          savedClient.interlocuteur
        );
        this.logger.log(`Email d'informations client envoyé à ${contactEmail}`);
      }
    } catch (emailError) {
      this.logger.warn('Erreur envoi email informations client:', emailError);
      // Ne pas faire échouer l'inscription si l'envoi d'email échoue
    }

    // Générer les tokens
    const payload: JwtPayload = {
      sub: savedClient.id.toString(),
      username: savedClient.nom,
      email: contactEmail || '',
      role: 'client',
      userType: 'client',
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
      },
      client: {
        id: savedClient.id,
        nom: savedClient.nom,
        email: contactEmail || '',
      },
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
      
      const emailSent = await this.emailService.sendOtpEmail(
        email,
        otpCode,
        userName
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

      // Rechercher l'utilisateur
      const user = await this.findUserByEmail(email);
      
      if (!user) {
        return {
          success: false,
          message: 'Utilisateur non trouvé',
        };
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await this.hashPassword(newPassword);

      // Mettre à jour le mot de passe dans la base de données
      if (user.userType === 'personnel') {
        await this.personnelRepository.update(user.id, {
          mot_de_passe: hashedPassword,
        });
      } else {
        await this.clientRepository.update(user.id, {
          mot_de_passe: hashedPassword,
        });
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
   * Rechercher un utilisateur par email dans toutes les tables
   */
  private async findUserByEmail(email: string): Promise<any> {
    // Rechercher dans le personnel
    const personnel = await this.personnelRepository.findOne({
      where: { email: email },
    });

    if (personnel) {
      return { ...personnel, userType: 'personnel' };
    }

    // Rechercher dans les clients via contact_client
    try {
      const contactResult = await this.contactClientService.findByEmail(email);
      if (contactResult && contactResult.client) {
        return { ...contactResult.client, userType: 'client' };
      }
    } catch (error) {
      this.logger.debug(`Email ${email} non trouvé dans contact_client`);
    }

    return null;
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
   */
  async updateUserProfileImage(
    userId: string,
    userType: 'personnel' | 'client',
    imagePath: string,
  ): Promise<boolean> {
    try {
      if (userType === 'personnel') {
        await this.personnelRepository.update(parseInt(userId), {
          photo: imagePath,
        });
      } else {
        await this.clientRepository.update(parseInt(userId), {
          photo: imagePath,
        });
      }

      this.logger.log(`Image de profil mise à jour pour ${userType} ID: ${userId}`);
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
  ): Promise<boolean> {
    try {
      // Récupérer l'ancienne image pour la supprimer du système de fichiers
      let oldImage: string | null = null;
      
      if (userType === 'personnel') {
        const user = await this.personnelRepository.findOne({
          where: { id: parseInt(userId) },
        });
        oldImage = user?.photo || null;
        
        await this.personnelRepository.update(parseInt(userId), {
          photo: null,
        });
      } else {
        const user = await this.clientRepository.findOne({
          where: { id: parseInt(userId) },
        });
        oldImage = user?.photo || null;
        
        await this.clientRepository.update(parseInt(userId), {
          photo: null,
        });
      }

      // Supprimer le fichier physique si il existe
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
   */
  async getFullUserProfile(userId: string, userType: 'personnel' | 'client'): Promise<any> {
    try {
      if (userType === 'personnel') {
        const personnel = await this.personnelRepository.findOne({
          where: { id: parseInt(userId) },
        });

        if (!personnel) {
          throw new UnauthorizedException('Personnel non trouvé');
        }

        return {
          id: personnel.id,
          nom: personnel.nom,
          prenom: personnel.prenom,
          nom_utilisateur: personnel.nom_utilisateur,
          email: personnel.email,
          telephone: personnel.telephone,
          genre: personnel.genre,
          statut: personnel.statut,
          photo: personnel.photo || 'uploads/profiles/default-avatar.png',
          role: personnel.role || 'personnel',
          userType: 'personnel',
          fullName: `${personnel.prenom} ${personnel.nom}`,
          username: personnel.nom_utilisateur,
          isActive: personnel.isActive,
          created_at: personnel.created_at
        };
      } else {
        const client = await this.clientRepository.findOne({
          where: { id: parseInt(userId) },
        });

        if (!client) {
          throw new UnauthorizedException('Client non trouvé');
        }

        // Récupérer l'email depuis contact_client
        let email = '';
        try {
          const contactClient = await this.contactClientService.findByClient(client.id);
          if (contactClient && contactClient.length > 0) {
            email = contactClient[0].mail1 || contactClient[0].mail2 || '';
          }
        } catch (error) {
          this.logger.warn(`Erreur récupération email pour client ${client.nom}:`, error.message);
        }

        return {
          id: client.id,
          nom: client.nom,
          interlocuteur: client.interlocuteur,
          categorie: client.categorie,
          type_client: client.type_client,
          adresse: client.adresse,
          code_postal: client.code_postal,
          ville: client.ville,
          pays: client.pays,
          id_fiscal: client.id_fiscal,
          nature: client.nature,
          photo: client.photo || 'uploads/profiles/default-avatar.png',
          role: 'client',
          userType: 'client',
          username: client.nom,
          email: email,
          created_at: client.created_at,
          blocage: client.blocage,
          devise: client.devise,
          timbre: client.timbre,
          solde: client.solde
        };
      }
    } catch (error) {
      this.logger.error(`Erreur récupération profil complet pour ${userType} ${userId}:`, error);
      throw new UnauthorizedException('Impossible de récupérer le profil');
    }
  }

  /**
   * Met à jour le profil d'un utilisateur
   */
  async updateUserProfile(userId: string, userType: 'personnel' | 'client', updateData: any): Promise<any> {
    try {
      if (userType === 'personnel') {
        // Mise à jour personnel
        const personnel = await this.personnelRepository.findOne({
          where: { id: parseInt(userId) },
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
        
        // Retourner le profil mis à jour
        return await this.getFullUserProfile(userId, userType);

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
        
        // Retourner le profil mis à jour
        return await this.getFullUserProfile(userId, userType);
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
   */
  async changePasswordFirstLogin(userId: string, userType: 'personnel' | 'client', newPassword: string): Promise<any> {
    try {
      if (userType === 'personnel') {
        const personnel = await this.personnelRepository.findOne({
          where: { id: parseInt(userId) },
        });

        if (!personnel) {
          this.logger.error(`Personnel non trouvé avec l'ID: ${userId}`);
          throw new UnauthorizedException('Personnel non trouvé');
        }

        // LOG DETAILLÉ pour debugging
        this.logger.debug(`Tentative de changement de mot de passe first-login pour personnel:`, {
          id: personnel.id,
          nom_utilisateur: personnel.nom_utilisateur,
          first_login: personnel.first_login,
          userType
        });

        // Vérifier que c'est vraiment le premier login
        if (!personnel.first_login) {
          this.logger.warn(`Tentative d'utilisation de changePasswordFirstLogin pour personnel non first-login:`, {
            id: personnel.id,
            nom_utilisateur: personnel.nom_utilisateur,
            first_login: personnel.first_login
          });
          throw new UnauthorizedException('Cette méthode est réservée au premier login');
        }

        // Hasher le nouveau mot de passe
        const hashedNewPassword = await this.hashPassword(newPassword);

        // Mettre à jour le mot de passe et marquer que ce n'est plus le premier login
        await this.personnelRepository.update(personnel.id, {
          mot_de_passe: hashedNewPassword,
          first_login: false
        });

        // Synchroniser avec Keycloak si disponible
        if (this.keycloakService && personnel.keycloak_id) {
          try {
            await this.keycloakService.updateUserPassword(personnel.keycloak_id, newPassword);
            this.logger.log(`Mot de passe first-login synchronisé avec Keycloak pour le personnel: ${personnel.nom_utilisateur}`);
          } catch (keycloakError) {
            this.logger.warn(`Erreur synchronisation Keycloak first-login pour ${personnel.nom_utilisateur}:`, keycloakError);
            // Ne pas faire échouer le changement si Keycloak échoue
          }
        }

        this.logger.log(`Mot de passe changé lors du premier login pour le personnel: ${personnel.nom_utilisateur}`);
        return { message: 'Mot de passe modifié avec succès lors du premier login' };

      } else {
        const client = await this.clientRepository.findOne({
          where: { id: parseInt(userId) },
        });

        if (!client) {
          this.logger.error(`Client non trouvé avec l'ID: ${userId}`);
          throw new UnauthorizedException('Client non trouvé');
        }

        // LOG DETAILLÉ pour debugging
        this.logger.debug(`Tentative de changement de mot de passe first-login pour client:`, {
          id: client.id,
          nom: client.nom,
          first_login: client.first_login,
          userType
        });

        // Vérifier que c'est vraiment le premier login
        if (!client.first_login) {
          this.logger.warn(`Tentative d'utilisation de changePasswordFirstLogin pour client non first-login:`, {
            id: client.id,
            nom: client.nom,
            first_login: client.first_login
          });
          throw new UnauthorizedException('Cette méthode est réservée au premier login');
        }

        // Hasher le nouveau mot de passe
        const hashedNewPassword = await this.hashPassword(newPassword);

        // Mettre à jour le mot de passe et marquer que ce n'est plus le premier login
        await this.clientRepository.update(client.id, {
          mot_de_passe: hashedNewPassword,
          first_login: false
        });

        // Synchroniser avec Keycloak si disponible
        if (this.keycloakService && client.keycloak_id) {
          try {
            await this.keycloakService.updateUserPassword(client.keycloak_id, newPassword);
            this.logger.log(`Mot de passe first-login synchronisé avec Keycloak pour le client: ${client.nom}`);
          } catch (keycloakError) {
            this.logger.warn(`Erreur synchronisation Keycloak first-login pour ${client.nom}:`, keycloakError);
            // Ne pas faire échouer le changement si Keycloak échoue
          }
        }

        this.logger.log(`Mot de passe changé lors du premier login pour le client: ${client.nom}`);
        return { message: 'Mot de passe modifié avec succès lors du premier login' };
      }
    } catch (error) {
      this.logger.error(`Erreur changement mot de passe premier login pour ${userType} ${userId}:`, error);
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
}
