import { Injectable, Scope, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organisation } from '../entities/organisation.entity';
import { SetupToken } from '../entities/setup-token.entity';
import { DatabaseConnectionService } from '../common/database-connection.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service pour la création et gestion des organisations
 */
@Injectable({ scope: Scope.REQUEST })
export class SetupService {
  private readonly logger = new Logger(SetupService.name);

  constructor(
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>,
    @InjectRepository(SetupToken)
    private setupTokenRepository: Repository<SetupToken>,
    private databaseConnectionService: DatabaseConnectionService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  /**
   * Génère un token de setup et l'envoie par email
   */
  async generateSetupToken(
    email: string,
    nomContact: string,
    notes?: string,
    validiteHeures: number = 48,
    generatedBy?: number
  ): Promise<SetupToken> {
    // Générer un token aléatoire sécurisé
    const token = crypto.randomBytes(32).toString('hex');

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + validiteHeures);

    // Créer le token
    const setupToken = this.setupTokenRepository.create({
      token,
      email_destinataire: email,
      nom_contact: nomContact,
      expires_at: expiresAt,
      notes,
      generated_by: generatedBy,
    });

    await this.setupTokenRepository.save(setupToken);

    // Envoyer l'email
    const setupUrl = `${process.env.FRONTEND_URL}/setup?token=${token}`;
    
    try {
      const htmlContent = `
          <h2>Bonjour ${nomContact},</h2>
          <p>Votre ERP est prêt ! Cliquez sur le lien ci-dessous pour configurer votre organisation :</p>
          <p><a href="${setupUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">Configurer mon organisation</a></p>
          <p>Ou copiez ce lien dans votre navigateur :<br/>${setupUrl}</p>
          <p>⏱️ Ce lien expire dans ${validiteHeures} heures</p>
          <p>Cordialement,<br/>L'équipe MSP - Management System Productivity</p>
        `;
      
      await this.emailService.sendEmail(email, 'Bienvenue sur votre ERP Shipnology by MSP', htmlContent);

      this.logger.log(`Token de setup envoyé à ${email}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email: ${error.message}`);
    }

    return setupToken;
  }

  /**
   * Vérifie la validité d'un token
   */
  async verifyToken(token: string): Promise<{ valid: boolean; token?: SetupToken }> {
    const setupToken = await this.setupTokenRepository.findOne({
      where: { token },
    });

    if (!setupToken) {
      return { valid: false };
    }

    // Vérifier si le token n'est pas expiré
    if (new Date() > setupToken.expires_at) {
      return { valid: false };
    }

    // Vérifier si le token n'a pas déjà été utilisé
    if (setupToken.used) {
      return { valid: false };
    }

    return { valid: true, token: setupToken };
  }

  /**
   * Crée une nouvelle organisation avec sa base de données
   */
  async createOrganisation(createDto: any): Promise<any> {
    // 1. Vérifier le token
    const { valid, token: setupToken } = await this.verifyToken(createDto.token);
    if (!valid) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    // 2. Nettoyer et valider le nom de la base de données
    let dbName = createDto.database_name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');

    dbName = `shipnology_${dbName}`;

    // Vérifier l'unicité
    const exists = await this.organisationRepository.findOne({
      where: { database_name: dbName },
    });

    if (exists) {
      throw new BadRequestException('Ce nom de base de données est déjà utilisé');
    }

    // 3. Créer la base de données
    try {
      await this.databaseConnectionService.createOrganisationDatabase(dbName);
    } catch (error) {
      this.logger.error(`Erreur création BDD: ${error.message}`);
      throw new BadRequestException(`Impossible de créer la base de données: ${error.message}`);
    }

    // 4. Créer les tables dans la nouvelle base
    try {
      const structureScript = fs.readFileSync(
        path.join(process.cwd(), 'shipnology-structure.sql'),
        'utf8'
      );

      await this.databaseConnectionService.executeSqlScript(dbName, structureScript);
      this.logger.log(`Tables créées dans ${dbName}`);
    } catch (error) {
      this.logger.error(`Erreur création tables: ${error.message}`);
      throw new BadRequestException(`Impossible de créer les tables: ${error.message}`);
    }

    // 5. Enregistrer l'organisation
    const organisation = this.organisationRepository.create({
      nom: createDto.nom_entreprise,
      nom_affichage: createDto.nom_affichage || createDto.nom_entreprise,
      database_name: dbName,
      email_contact: createDto.email_contact,
      telephone: createDto.telephone,
      statut: 'actif',
      plan: 'standard',
    });

    await this.organisationRepository.save(organisation);
    this.logger.log(`Organisation créée: ${organisation.nom} (ID: ${organisation.id})`);

    // 6. Créer le compte superviseur dans la base de l'organisation
    const hashedPassword = await bcrypt.hash(createDto.superviseur.mot_de_passe, 12);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(dbName);
    
    const result = await connection.query(`
      INSERT INTO personnel (
        nom, prenom, email, nom_utilisateur,
        mot_de_passe, role, is_superviseur, statut
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      createDto.superviseur.nom,
      createDto.superviseur.prenom,
      createDto.superviseur.email,
      createDto.superviseur.nom_utilisateur,
      hashedPassword,
      'admin',
      true,
      'actif'
    ]);

    const superviseurId = result[0].id;
    this.logger.log(`Superviseur créé dans ${dbName} (ID: ${superviseurId})`);

    // 7. Marquer le token comme utilisé
    await this.setupTokenRepository.update(setupToken.id, {
      used: true,
      used_at: new Date(),
      organisation_id: organisation.id,
    });

    // 8. Générer un JWT pour connexion automatique
    const jwtPayload = {
      sub: superviseurId.toString(),
      userId: superviseurId,
      username: createDto.superviseur.nom_utilisateur,
      email: createDto.superviseur.email,
      role: 'admin',
      is_superviseur: true,
      userType: 'personnel',
      organisationId: organisation.id,
      databaseName: dbName,
      organisationName: organisation.nom_affichage,
    };

    const access_token = this.jwtService.sign(jwtPayload, {
      expiresIn: '8h',
    });

    // 9. Envoyer email de confirmation
    try {
      const htmlContent = `
          <h2>Bonjour ${createDto.superviseur.prenom},</h2>
          <p>Votre ERP "${organisation.nom_affichage}" est configuré ✅</p>
          <p>Vous pouvez vous connecter à tout moment sur :<br/>
          <a href="${process.env.FRONTEND_URL}/login">${process.env.FRONTEND_URL}/login</a></p>
          <p>Nom d'utilisateur : <strong>${createDto.superviseur.nom_utilisateur}</strong></p>
          <p>Cordialement,<br/>L'équipe MSP</p>
        `;
      
      await this.emailService.sendEmail(createDto.superviseur.email, 'Votre ERP est prêt !', htmlContent);
    } catch (error) {
      this.logger.error(`Erreur envoi email confirmation: ${error.message}`);
    }

    return {
      success: true,
      access_token,
      organisation: {
        id: organisation.id,
        nom: organisation.nom,
        nom_affichage: organisation.nom_affichage,
        database_name: organisation.database_name,
      },
      user: {
        id: superviseurId,
        nom: createDto.superviseur.nom,
        prenom: createDto.superviseur.prenom,
        email: createDto.superviseur.email,
        username: createDto.superviseur.nom_utilisateur,
        role: 'admin',
        is_superviseur: true,
      },
      redirectUrl: '/dashboard?welcome=true',
    };
  }
}
