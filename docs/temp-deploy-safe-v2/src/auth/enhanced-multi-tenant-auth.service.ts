import { 
  Injectable, Scope, 
  UnauthorizedException, 
  ConflictException,
  Logger 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Organisation } from '../entities/organisation.entity';
import { DatabaseConnectionService } from '../common/database-connection.service';

interface OrganisationMatch {
  organisation: Organisation;
  userId: number;
  userType: 'personnel' | 'client';
}

/**
 * Service d'authentification multi-tenant ROBUSTE
 * 
 * Fonctionnalités:
 * - Détection de conflits de nom d'utilisateur entre organisations
 * - Priorité à l'email (identifiant unique)
 * - Gestion intelligente des doublons
 */
@Injectable({ scope: Scope.REQUEST })
export class EnhancedMultiTenantAuthService {
  private readonly logger = new Logger(EnhancedMultiTenantAuthService.name);

  constructor(
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>,
    private databaseConnectionService: DatabaseConnectionService,
    private jwtService: JwtService,
  ) {}

  /**
   * LOGIN PRINCIPAL - Intelligent et robuste
   * 
   * Stratégie:
   * 1. Si identifier contient '@' → recherche par EMAIL (unique)
   * 2. Sinon → recherche par USERNAME (avec détection de conflits)
   */
  async login(identifier: string, password: string) {
    const isEmail = identifier.includes('@');

    if (isEmail) {
      this.logger.log(`Connexion par EMAIL: ${identifier}`);
      return await this.loginByEmail(identifier, password);
    } else {
      this.logger.log(`Connexion par USERNAME: ${identifier}`);
      return await this.loginByUsername(identifier, password);
    }
  }

  /**
   * LOGIN PAR EMAIL (RECOMMANDÉ - Unique et sûr)
   * 
   * L'email est unique par nature professionnelle
   * Pas de risque de conflit entre organisations
   */
  private async loginByEmail(email: string, password: string) {
    const organisations = await this.getActiveOrganisations();

    for (const org of organisations) {
      try {
        const connection = await this.databaseConnectionService.getOrganisationConnection(
          org.database_name
        );

        // Rechercher dans personnel
        const personnel = await connection.query(
          `SELECT * FROM personnel 
           WHERE LOWER(email) = LOWER($1) 
           AND statut = 'actif'
           LIMIT 1`,
          [email]
        );

        if (personnel && personnel.length > 0) {
          const user = personnel[0];
          
          if (await bcrypt.compare(password, user.mot_de_passe)) {
            this.logger.log(`✅ Utilisateur trouvé par EMAIL dans: ${org.nom}`);
            return await this.generateAuthResponse(user, org, 'personnel');
          }
        }

        // Rechercher dans clients (si applicable)
        const client = await connection.query(
          `SELECT * FROM clients 
           WHERE LOWER(email) = LOWER($1)
           LIMIT 1`,
          [email]
        );

        if (client && client.length > 0) {
          const clientUser = client[0];
          
          if (await bcrypt.compare(password, clientUser.mot_de_passe)) {
            this.logger.log(`✅ Client trouvé par EMAIL dans: ${org.nom}`);
            return await this.generateAuthResponse(clientUser, org, 'client');
          }
        }

      } catch (error) {
        this.logger.error(`Erreur dans ${org.database_name}: ${error.message}`);
        continue;
      }
    }

    throw new UnauthorizedException('Email ou mot de passe incorrect');
  }

  /**
   * LOGIN PAR USERNAME (avec détection de conflits)
   * 
   * ⚠️ ATTENTION: Si le même username existe dans plusieurs organisations,
   * une exception ConflictException est levée
   */
  private async loginByUsername(username: string, password: string) {
    const organisations = await this.getActiveOrganisations();
    const matches: OrganisationMatch[] = [];

    // Phase 1: Trouver toutes les organisations avec ce username
    for (const org of organisations) {
      try {
        const connection = await this.databaseConnectionService.getOrganisationConnection(
          org.database_name
        );

        // Vérifier personnel
        const personnel = await connection.query(
          `SELECT id FROM personnel 
           WHERE LOWER(nom_utilisateur) = LOWER($1) 
           AND statut = 'actif'
           LIMIT 1`,
          [username]
        );

        if (personnel && personnel.length > 0) {
          matches.push({
            organisation: org,
            userId: personnel[0].id,
            userType: 'personnel',
          });
        }

        // Vérifier clients
        const client = await connection.query(
          `SELECT id FROM clients 
           WHERE LOWER(nom_utilisateur) = LOWER($1)
           LIMIT 1`,
          [username]
        );

        if (client && client.length > 0) {
          matches.push({
            organisation: org,
            userId: client[0].id,
            userType: 'client',
          });
        }

      } catch (error) {
        this.logger.error(`Erreur dans ${org.database_name}: ${error.message}`);
        continue;
      }
    }

    // Phase 2: Gérer les résultats
    if (matches.length === 0) {
      throw new UnauthorizedException('Nom d\'utilisateur ou mot de passe incorrect');
    }

    if (matches.length > 1) {
      // 🚨 CONFLIT DÉTECTÉ !
      this.logger.warn(`⚠️ CONFLIT: Username "${username}" existe dans ${matches.length} organisations`);
      
      throw new ConflictException({
        code: 'MULTIPLE_ORGANISATIONS_FOUND',
        message: 'Ce nom d\'utilisateur existe dans plusieurs organisations. Veuillez utiliser votre email pour vous connecter.',
        organisations: matches.map(m => ({
          id: m.organisation.id,
          nom: m.organisation.nom_affichage || m.organisation.nom,
          slug: m.organisation.slug,
        })),
        hint: `Utilisez votre email au lieu de "${username}" pour vous connecter`
      });
    }

    // Phase 3: Une seule correspondance → Authentifier
    const match = matches[0];
    const connection = await this.databaseConnectionService.getOrganisationConnection(
      match.organisation.database_name
    );

    const table = match.userType === 'personnel' ? 'personnel' : 'clients';
    const users = await connection.query(
      `SELECT * FROM ${table} WHERE id = $1`,
      [match.userId]
    );

    if (!users || users.length === 0) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const user = users[0];

    // Vérifier le mot de passe
    if (!(await bcrypt.compare(password, user.mot_de_passe))) {
      throw new UnauthorizedException('Nom d\'utilisateur ou mot de passe incorrect');
    }

    this.logger.log(`✅ Utilisateur unique trouvé dans: ${match.organisation.nom}`);
    return await this.generateAuthResponse(user, match.organisation, match.userType);
  }

  /**
   * LOGIN AVEC SÉLECTION D'ORGANISATION EXPLICITE
   * 
   * Utilisé quand l'utilisateur choisit son organisation (via slug ou ID)
   * C'est l'approche la plus sûre pour éviter les ambiguïtés
   */
  async loginWithOrganisation(
    organisationSlug: string,
    username: string,
    password: string
  ) {
    // Trouver l'organisation par son slug
    const organisation = await this.organisationRepository.findOne({
      where: { slug: organisationSlug, statut: 'actif' },
    });

    if (!organisation) {
      throw new UnauthorizedException('Organisation non trouvée ou inactive');
    }

    // Se connecter directement à cette base
    const connection = await this.databaseConnectionService.getOrganisationConnection(
      organisation.database_name
    );

    // Chercher l'utilisateur (par username OU email)
    const personnel = await connection.query(
      `SELECT * FROM personnel 
       WHERE (LOWER(nom_utilisateur) = LOWER($1) OR LOWER(email) = LOWER($1))
       AND statut = 'actif'
       LIMIT 1`,
      [username]
    );

    if (!personnel || personnel.length === 0) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const user = personnel[0];

    if (!(await bcrypt.compare(password, user.mot_de_passe))) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    this.logger.log(`✅ Connexion avec organisation explicite: ${organisation.nom}`);
    return await this.generateAuthResponse(user, organisation, 'personnel');
  }

  /**
   * Générer la réponse d'authentification complète
   */
  private async generateAuthResponse(
    user: any,
    organisation: Organisation,
    userType: 'personnel' | 'client'
  ) {
    // Mettre à jour la date de dernière connexion
    await this.organisationRepository.update(organisation.id, {
      date_derniere_connexion: new Date(),
    });

    // Payload JWT avec informations multi-tenant
    const payload = {
      sub: user.id.toString(),
      userId: user.id,
      username: user.nom_utilisateur || user.email,
      email: user.email,
      role: user.role || (userType === 'client' ? 'client' : 'user'),
      is_superviseur: user.is_superviseur || false,
      userType,

      // ✅ CRITIQUE: Informations multi-tenant
      organisationId: organisation.id,
      databaseName: organisation.database_name,
      organisationName: organisation.nom_affichage || organisation.nom,
      organisationSlug: organisation.slug,
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '8h',
    });

    const refresh_token = this.jwtService.sign(
      { sub: user.id, organisationId: organisation.id },
      { expiresIn: '7d' }
    );

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        username: user.nom_utilisateur || user.email,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: payload.role,
        is_superviseur: payload.is_superviseur,
        userType,
        photo: user.photo,
      },
      organisation: {
        id: organisation.id,
        nom: organisation.nom,
        nom_affichage: organisation.nom_affichage,
        slug: organisation.slug,
        logo_url: organisation.logo_url,
        database_name: organisation.database_name,
      },
    };
  }

  /**
   * Récupérer toutes les organisations actives
   */
  private async getActiveOrganisations(): Promise<Organisation[]> {
    const organisations = await this.organisationRepository.find({
      where: { statut: 'actif' },
      order: { id: 'ASC' },
    });

    if (organisations.length === 0) {
      throw new UnauthorizedException('Aucune organisation active');
    }

    return organisations;
  }

  /**
   * Rafraîchir un access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      const org = await this.organisationRepository.findOne({
        where: { id: payload.organisationId },
      });

      if (!org || org.statut !== 'actif') {
        throw new UnauthorizedException('Organisation inactive');
      }

      const connection = await this.databaseConnectionService.getOrganisationConnection(
        org.database_name
      );

      const personnel = await connection.query(
        `SELECT * FROM personnel WHERE id = $1 AND statut = 'actif'`,
        [payload.sub]
      );

      if (!personnel || personnel.length === 0) {
        throw new UnauthorizedException('Utilisateur introuvable');
      }

      const user = personnel[0];

      const newPayload = {
        sub: user.id.toString(),
        userId: user.id,
        username: user.nom_utilisateur,
        email: user.email,
        role: user.role || 'user',
        is_superviseur: user.is_superviseur || false,
        userType: 'personnel',
        organisationId: org.id,
        databaseName: org.database_name,
        organisationName: org.nom_affichage || org.nom,
        organisationSlug: org.slug,
      };

      const access_token = this.jwtService.sign(newPayload, {
        expiresIn: '8h',
      });

      return { access_token };
    } catch (error) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }
}
