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
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { KeycloakService } from './keycloak.service';
import { CreatePersonnelDto, CreateClientDto } from '../dto/register.dto';
import { ContactClientService } from '../services/contact-client.service';

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
    private jwtService: JwtService,
    @Optional() private keycloakService: KeycloakService,
    private configService: ConfigService,
    private contactClientService: ContactClientService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    // Rechercher d'abord dans le personnel (par nom_utilisateur OU email)
    const personnel = await this.personnelRepository.findOne({
      where: [{ nom_utilisateur: username }, { email: username }],
    });

    if (personnel && (await bcrypt.compare(password, personnel.mot_de_passe))) {
      if (!personnel.isActive) {
        throw new UnauthorizedException('Compte désactivé');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mot_de_passe, ...result } = personnel;
      return { ...result, userType: 'personnel' };
    }

    // Rechercher ensuite dans les clients (par nom OU interlocuteur)
    const client = await this.clientRepository.findOne({
      where: [{ nom: username }, { interlocuteur: username }],
    });

    if (client && (await bcrypt.compare(password, client.mot_de_passe))) {
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
      // Synchroniser l'utilisateur avec Keycloak seulement si activé et nécessaire
      if (
        this.configService.get('KEYCLOAK_ENABLED') === 'true' &&
        !user.keycloak_id
      ) {
        // Keycloak est désactivé pour l'instant
        // const keycloakId = await this.keycloakService?.createUser?.({
        //   username: user.userType === 'personnel' ? user.nom_utilisateur : user.nom,
        //   email: user.email || '',
        //   firstName: user.userType === 'personnel' ? user.prenom : user.nom,
        //   lastName: user.userType === 'personnel' ? user.nom : '',
        //   enabled: true,
        // });
        // // Mettre à jour l'ID Keycloak dans la base de données
        // if (keycloakId) {
        //   if (user.userType === 'personnel') {
        //     await this.personnelRepository.update(user.id, { keycloak_id: keycloakId });
        //   } else {
        //     await this.clientRepository.update(user.id, { keycloak_id: keycloakId });
        //   }
        // }
      }
    } catch (error) {
      const keycloakEnabled =
        this.configService.get('KEYCLOAK_ENABLED', 'true').toLowerCase() ===
        'true';
      if (keycloakEnabled) {
        this.logger.warn(
          `Erreur lors de la synchronisation Keycloak: ${error.message}`,
        );
      }
      // Ne pas bloquer la connexion si Keycloak n'est pas disponible
    }
  }

  async validateJwtPayload(payload: JwtPayload): Promise<any> {
    let user;
    if (payload.userType === 'personnel') {
      user = await this.personnelRepository.findOne({
        where: { id: parseInt(payload.sub) },
      });
    } else {
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
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    return { ...payload, user };
  }

  async registerPersonnel(
    createPersonnelDto: CreatePersonnelDto,
  ): Promise<AuthResult> {
    // Vérifier si l'utilisateur existe déjà
    const existingPersonnel = await this.personnelRepository.findOne({
      where: { nom_utilisateur: createPersonnelDto.nom_utilisateur },
    });

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
    });

    const savedPersonnel = await this.personnelRepository.save(personnel);

    this.logger.log(
      `Nouveau personnel créé: ${savedPersonnel.nom_utilisateur}`,
    );

    // Synchroniser avec Keycloak en arrière-plan
    this.syncUserToKeycloak('personnel', savedPersonnel.id).catch(error => {
      this.logger.warn('Synchronisation Keycloak échouée pour personnel:', error);
    });

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

    // Synchroniser avec Keycloak en arrière-plan (avec délai pour laisser le contact se créer)
    setTimeout(() => {
      this.syncUserToKeycloak('client', savedClient.id).catch(error => {
        this.logger.warn('Synchronisation Keycloak échouée pour client:', error);
      });
    }, 2000); // Délai de 2 secondes

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
}
