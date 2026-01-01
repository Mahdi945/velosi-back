import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Organisation } from '../admin-msp/entities/organisation.entity';
import { DatabaseConnectionService } from '../common/database-connection.service';

/**
 * Service d'authentification multi-tenant
 * 
 * Recherche les utilisateurs dans toutes les bases de données d'organisations
 * et génère un JWT contenant l'information de l'organisation
 */
@Injectable()
export class MultiTenantAuthService {
  private readonly logger = new Logger(MultiTenantAuthService.name);

  constructor(
    @InjectRepository(Organisation, 'shipnology')
    private organisationRepository: Repository<Organisation>,
    private databaseConnectionService: DatabaseConnectionService,
    private jwtService: JwtService,
  ) {}

  /**
   * Authentification multi-tenant
   * Recherche l'utilisateur dans toutes les bases d'organisations actives
   * 
   * @param usernameOrEmail - Nom d'utilisateur ou email
   * @param password - Mot de passe
   * @returns JWT + informations utilisateur et organisation
   */
  async login(usernameOrEmail: string, password: string) {
    this.logger.log(`Tentative de connexion multi-tenant: ${usernameOrEmail}`);

    // 1. Récupérer toutes les organisations actives
    const organisations = await this.organisationRepository.find({
      where: { statut: 'actif' },
      order: { id: 'ASC' },
    });

    if (organisations.length === 0) {
      throw new UnauthorizedException('Aucune organisation active trouvée');
    }

    this.logger.log(`Recherche dans ${organisations.length} organisation(s)`);

    // 2. Chercher l'utilisateur dans chaque base
    for (const org of organisations) {
      try {
        const connection = await this.databaseConnectionService.getOrganisationConnection(
          org.database_name
        );

        // Rechercher dans la table personnel (insensible à la casse)
        let personnel = [];
        try {
          personnel = await connection.query(
            `SELECT * FROM personnel 
             WHERE (LOWER(nom_utilisateur) = LOWER($1) OR LOWER(email) = LOWER($1)) 
             AND statut = 'actif'
             AND organisation_id = $2
             LIMIT 1`,
            [usernameOrEmail, org.id]
          );
        } catch (error) {
          this.logger.warn(`Table personnel non trouvée dans ${org.database_name}: ${error.message}`);
        }

        if (personnel && personnel.length > 0) {
          const user = personnel[0];

          // 3. Vérifier le mot de passe
          const isPasswordValid = await bcrypt.compare(password, user.mot_de_passe);

          if (isPasswordValid) {
            this.logger.log(`Utilisateur trouvé dans: ${org.database_name}`);

            // 4. Mettre à jour la date de dernière connexion de l'organisation
            await this.organisationRepository.update(org.id, {
              date_derniere_connexion: new Date(),
            });

            // 4.5. ✅ IMPORTANT: Mettre à jour last_activity pour éviter l'erreur "Session expirée"
            await connection.query(
              `UPDATE personnel SET last_activity = NOW(), statut_en_ligne = true WHERE id = $1`,
              [user.id]
            );
            this.logger.log(`✅ Last activity mise à jour pour ${user.nom_utilisateur}`);

            // 5. Générer le JWT avec les informations de l'organisation
            const payload = {
              sub: user.id.toString(),
              userId: user.id,
              username: user.nom_utilisateur,
              email: user.email,
              role: user.role || 'user',
              is_superviseur: user.is_superviseur || false,
              userType: 'personnel',
              
              // Informations multi-tenant (IMPORTANT)
              organisationId: org.id,
              databaseName: org.database_name,
              organisationName: org.nom_affichage || org.nom,
            };

            const access_token = this.jwtService.sign(payload, {
              expiresIn: '8h',
            });

            const refresh_token = this.jwtService.sign(
              { sub: user.id, organisationId: org.id },
              { expiresIn: '7d' }
            );

            return {
              access_token,
              refresh_token,
              user: {
                id: user.id,
                username: user.nom_utilisateur,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role: user.role || 'user',
                is_superviseur: user.is_superviseur || false,
                userType: 'personnel',
                photo: user.photo,
              },
              organisation: {
                id: org.id,
                nom: org.nom,
                nom_affichage: org.nom_affichage,
                logo_url: org.logo_url,
                database_name: org.database_name,
              },
            };
          }
        }

        // Aussi chercher dans la table client (si vous avez des clients qui se connectent)
        let client = [];
        try {
          client = await connection.query(
            `SELECT * FROM client 
             WHERE (LOWER(nom_utilisateur) = LOWER($1) OR LOWER(email) = LOWER($1))
             AND organisation_id = $2
             LIMIT 1`,
            [usernameOrEmail, org.id]
          );
        } catch (error) {
          this.logger.warn(`Table client non trouvée dans ${org.database_name}: ${error.message}`);
        }

        if (client && client.length > 0) {
          const clientUser = client[0];

          // Vérifier le mot de passe
          const isPasswordValid = await bcrypt.compare(password, clientUser.mot_de_passe);

          if (isPasswordValid) {
            this.logger.log(`Client trouvé dans: ${org.database_name}`);

            // ✅ Mettre à jour last_activity pour le client
            await connection.query(
              `UPDATE client SET last_activity = NOW(), statut_en_ligne = true WHERE id = $1`,
              [clientUser.id]
            );
            this.logger.log(`✅ Last activity mise à jour pour client ${clientUser.nom}`);

            // Générer le JWT pour un client
            const payload = {
              sub: clientUser.id.toString(),
              userId: clientUser.id,
              username: clientUser.nom_utilisateur || clientUser.email,
              email: clientUser.email,
              role: 'client',
              userType: 'client',
              
              organisationId: org.id,
              databaseName: org.database_name,
              organisationName: org.nom_affichage || org.nom,
            };

            const access_token = this.jwtService.sign(payload, {
              expiresIn: '8h',
            });

            const refresh_token = this.jwtService.sign(
              { sub: clientUser.id, organisationId: org.id },
              { expiresIn: '7d' }
            );

            return {
              access_token,
              refresh_token,
              user: {
                id: clientUser.id,
                username: clientUser.nom_utilisateur || clientUser.email,
                email: clientUser.email,
                nom: clientUser.nom,
                role: 'client',
                userType: 'client',
              },
              organisation: {
                id: org.id,
                nom: org.nom,
                nom_affichage: org.nom_affichage,
                logo_url: org.logo_url,
                database_name: org.database_name,
              },
            };
          }
        }

      } catch (error) {
        this.logger.error(
          `Erreur lors de la recherche dans ${org.database_name}: ${error.message}`
        );
        // Continuer avec l'organisation suivante
        continue;
      }
    }

    // Aucun utilisateur trouvé dans aucune organisation
    throw new UnauthorizedException('Identifiants incorrects');
  }

  /**
   * Valide un token JWT et retourne les informations
   * 
   * @param token - Token JWT à valider
   * @returns Payload du token décodé
   */
  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  /**
   * Rafraîchit un access token à partir d'un refresh token
   * 
   * @param refreshToken - Refresh token
   * @returns Nouveau access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      // Récupérer l'organisation
      const org = await this.organisationRepository.findOne({
        where: { id: payload.organisationId },
      });

      if (!org || org.statut !== 'actif') {
        throw new UnauthorizedException('Organisation inactive');
      }

      // Récupérer les infos utilisateur depuis la base de l'organisation
      const connection = await this.databaseConnectionService.getOrganisationConnection(
        org.database_name
      );

      const personnel = await connection.query(
        `SELECT * FROM personnel WHERE id = $1 AND statut = 'actif' AND organisation_id = $2`,
        [payload.sub, org.id]
      );

      if (!personnel || personnel.length === 0) {
        throw new UnauthorizedException('Utilisateur introuvable');
      }

      const user = personnel[0];

      // Générer un nouveau access token
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
