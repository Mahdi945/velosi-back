import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organisation } from './entities/organisation.entity';
import { SetupToken } from './entities/setup-token.entity';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { EmailSetupService } from './email-setup.service';
import { DatabaseConnectionService } from '../common/database-connection.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class OrganisationsService {
  constructor(
    @InjectRepository(Organisation, 'shipnology')
    private organisationRepository: Repository<Organisation>,
    @InjectRepository(SetupToken, 'shipnology')
    private setupTokenRepository: Repository<SetupToken>,
    @InjectDataSource('shipnology')
    private shipnologyDataSource: DataSource,
    private emailSetupService: EmailSetupService,
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  async findAll() {
    console.log('🔍 [Service] Récupération de toutes les organisations...');
    const organisations = await this.organisationRepository.find({
      order: { created_at: 'DESC' },
    });
    console.log('✅ [Service] Trouvé', organisations.length, 'organisation(s)');
    if (organisations.length > 0) {
      console.log('📊 [Service] Première organisation:', JSON.stringify(organisations[0], null, 2));
    }
    return organisations;
  }

  async findOne(id: number) {
    const organisation = await this.organisationRepository.findOne({
      where: { id },
    });

    if (!organisation) {
      throw new NotFoundException(`Organisation #${id} non trouvée`);
    }

    return organisation;
  }

  async create(createDto: CreateOrganisationDto, adminId: number) {
    // Extraire les options de création
    const sendEmail = createDto.send_email !== false; // Par défaut true
    const fullCreation = createDto.full_creation === true; // Par défaut false
    
    // Extraire les données du superviseur si présentes
    const superviseurData = fullCreation ? {
      prenom: createDto['superviseur_prenom'],
      nom: createDto['superviseur_nom'],
      nom_utilisateur: createDto['superviseur_username'],
      genre: createDto['superviseur_genre'],
      email: createDto['superviseur_email'],
      telephone: createDto['superviseur_telephone'],
      mot_de_passe: createDto['superviseur_mot_de_passe'],
    } : null;
    
    // Nettoyer le DTO des données du superviseur et options
    delete createDto.send_email;
    delete createDto.full_creation;
    delete createDto['superviseur_prenom'];
    delete createDto['superviseur_nom'];
    delete createDto['superviseur_username'];
    delete createDto['superviseur_genre'];
    delete createDto['superviseur_email'];
    delete createDto['superviseur_telephone'];
    delete createDto['superviseur_mot_de_passe'];
    delete createDto['superviseur_mot_de_passe_confirm'];
    
    // Générer un nom de base de données si non fourni
    let databaseName = createDto.database_name;
    
    if (!databaseName) {
      // Générer un nom basé exactement sur le nom de l'organisation
      databaseName = createDto.nom
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Retirer les accents
        .replace(/[^a-z0-9]+/g, '_') // Remplacer les caractères spéciaux par _
        .replace(/^_+|_+$/g, '') // Retirer les _ au début et fin
        .replace(/_+/g, '_'); // Remplacer les _ multiples par un seul
      
      // S'assurer que le nom commence par une lettre
      if (!/^[a-z]/.test(databaseName)) {
        databaseName = 'org_' + databaseName;
      }
      
      console.log(`📋 Nom de base généré automatiquement: ${databaseName}`);
    }

    // Vérifier si le nom de la base existe déjà
    const existing = await this.organisationRepository.findOne({
      where: { database_name: databaseName },
    });

    if (existing) {
      throw new ConflictException('Ce nom de base de données existe déjà');
    }

    // Valider le format du nom de la base
    const dbNameRegex = /^[a-z][a-z0-9_]*$/;
    if (!dbNameRegex.test(databaseName)) {
      throw new BadRequestException(
        'Le nom de la base doit commencer par une lettre et ne contenir que des lettres minuscules, chiffres et underscores'
      );
    }

    // Déterminer le statut initial
    let initialStatus: 'actif' | 'en_attente' = 'en_attente';
    let databaseCreated = false;
    let setupCompleted = false;
    
    if (fullCreation) {
      // En mode création complète, créer la base immédiatement
      console.log('🚀 Mode création complète activé - Création de la base de données...');
      await this.createOrganisationDatabaseWithStructure(databaseName);
      initialStatus = 'actif';
      databaseCreated = true;
      setupCompleted = true;
      console.log('✅ Base de données créée et organisation activée');
    }

    // Créer l'organisation
    const organisation = this.organisationRepository.create({
      ...createDto,
      database_name: databaseName,
      statut: initialStatus,
      date_creation: new Date(),
      database_created: databaseCreated,
      setup_completed: setupCompleted,
      has_users: false,
    });

    const saved = await this.organisationRepository.save(organisation);
    
    // Si mode création complète, créer le superviseur
    if (fullCreation && superviseurData) {
      console.log('👤 Création du compte superviseur...');
      try {
        await this.createSuperviseur(saved.id, databaseName, superviseurData);
        console.log('✅ Superviseur créé avec succès');
        
        // Mettre à jour le flag has_users
        await this.organisationRepository.update(saved.id, { has_users: true });
        saved.has_users = true;
      } catch (error) {
        console.error('❌ Erreur lors de la création du superviseur:', error);
        throw new Error(`Erreur lors de la création du superviseur: ${error.message}`);
      }
    }

    // Si ce n'est pas une création complète, générer un token et potentiellement envoyer un email
    if (!fullCreation) {
      console.log('📋 Organisation créée en attente - La BD sera créée lors du setup par le client');

      // Générer un token de setup
      let setupToken: string;
      let setupUrl: string;
      
      try {
        console.log('🔄 Génération du token de setup...');
        setupToken = await this.generateSetupToken(saved.id, saved.email_contact);
        setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/setup?token=${setupToken}`;
        console.log('✅ Token généré:', setupToken);
        
        // Ajouter le token et l'URL à la réponse
        (saved as any).setup_token = setupToken;
        (saved as any).setup_url = setupUrl;
        
        // Envoyer l'email d'invitation si demandé
        if (sendEmail) {
          console.log('📧 Tentative d\'envoi de l\'email d\'invitation à', saved.email_contact);
          try {
            await this.emailSetupService.sendSetupInvitation(saved, setupToken);
            console.log('✅ Email d\'invitation envoyé avec succès à', saved.email_contact);
            (saved as any).emailSent = true;
            (saved as any).emailSkipped = false;
          } catch (emailError) {
            console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError.message);
            (saved as any).emailSent = false;
            (saved as any).emailError = emailError.message;
            (saved as any).emailSkipped = false;
          }
        } else {
          console.log('📧 Envoi d\'email désactivé - Le token doit être partagé manuellement');
          (saved as any).emailSent = false;
          (saved as any).emailSkipped = true;
          (saved as any).emailError = null;
        }
      } catch (error) {
        console.error('❌ ERREUR lors de la génération du token:', error);
        console.error('❌ Message d\'erreur:', error.message);
        console.error('❌ Stack:', error.stack);
        
        // Erreur critique lors de la génération du token
        (saved as any).emailSent = false;
        (saved as any).emailError = `Erreur génération token: ${error.message}`;
        (saved as any).emailSkipped = false;
        
        // Ne pas bloquer la création de l'organisation
        console.warn('⚠️ Organisation créée mais erreur lors de la génération du token');
      }
    }

    return saved;
  }

  async update(id: number, updateDto: UpdateOrganisationDto) {
    const organisation = await this.findOne(id);

    // Ne pas permettre de changer le nom de la base après création
    if (updateDto.database_name && updateDto.database_name !== organisation.database_name) {
      throw new BadRequestException('Le nom de la base de données ne peut pas être modifié');
    }

    await this.organisationRepository.update(id, updateDto);
    return await this.findOne(id);
  }

  async remove(id: number) {
    const organisation = await this.findOne(id);
    
    // Avertissement: cette méthode ne supprime PAS la base de données physique
    // Pour des raisons de sécurité, la suppression de la BD doit être manuelle
    await this.organisationRepository.delete(id);

    return {
      message: `Organisation "${organisation.nom}" supprimée du registre. IMPORTANT: La base de données "${organisation.database_name}" n'a PAS été supprimée et doit être supprimée manuellement si nécessaire.`,
    };
  }

  async activate(id: number) {
    await this.findOne(id);
    await this.organisationRepository.update(id, { statut: 'actif' });
    return await this.findOne(id);
  }

  async deactivate(id: number) {
    await this.findOne(id);
    await this.organisationRepository.update(id, { statut: 'inactif' });
    return await this.findOne(id);
  }

  private async createOrganisationDatabase(databaseName: string) {
    // Créer la base de données
    await this.shipnologyDataSource.query(
      `CREATE DATABASE ${databaseName} WITH ENCODING 'UTF8'`
    );

    console.log(`✅ Base de données créée: ${databaseName}`);
  }

  /**
   * Créer la base de données et exécuter le script de structure
   */
  private async createOrganisationDatabaseWithStructure(databaseName: string) {
    // 1. Vérifier si la base existe déjà et la supprimer si nécessaire
    try {
      const checkDb = await this.shipnologyDataSource.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [databaseName]
      );
      
      if (checkDb.length > 0) {
        console.log(`⚠️ La base ${databaseName} existe déjà, suppression en cours...`);
        
        // Fermer toutes les connexions à cette base
        await this.shipnologyDataSource.query(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid()
        `, [databaseName]);
        
        // Attendre un peu pour que les connexions se ferment
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Supprimer la base
        await this.shipnologyDataSource.query(`DROP DATABASE IF EXISTS ${databaseName}`);
        console.log(`🗑️ Base de données ${databaseName} supprimée`);
      }
    } catch (error) {
      console.error(`⚠️ Erreur lors de la vérification/suppression de la base:`, error);
    }

    // 2. Créer la base de données vide
    await this.createOrganisationDatabase(databaseName);

    // 3. Lire le script de structure
    const scriptPath = path.join(__dirname, '../../shipnology-structure.sql');
    console.log(`📄 Lecture du script de structure: ${scriptPath}`);
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script de structure non trouvé: ${scriptPath}`);
    }
    
    const sqlScript = fs.readFileSync(scriptPath, 'utf8');

    // 4. Se connecter à la nouvelle base et exécuter le script
    console.log(`🔧 Exécution du script de structure sur ${databaseName}...`);
    
    let connection;
    try {
      connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      // Activer les extensions nécessaires
      console.log(`🔌 Activation des extensions PostgreSQL...`);
      try {
        await connection.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        await connection.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm";');
        console.log(`✅ Extensions activées`);
      } catch (extError) {
        console.warn(`⚠️ Erreur lors de l'activation des extensions (peut-être déjà activées):`, extError.message);
      }
      
      // Nettoyer le script : enlever les commentaires et lignes vides
      const lines = sqlScript.split('\n');
      const cleanedLines: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        // Ignorer les commentaires et lignes vides
        if (trimmed && !trimmed.startsWith('--')) {
          cleanedLines.push(line);
        }
      }
      
      const cleanedScript = cleanedLines.join('\n');
      
      // Fonction pour diviser intelligemment en statements SQL
      // en tenant compte des blocs de fonctions délimités par $$ ou $tag$
      const parseStatements = (script: string): string[] => {
        const statements: string[] = [];
        let currentStatement = '';
        let inDollarQuote = false;
        let dollarQuoteTag = '';
        
        const chars = script.split('');
        for (let i = 0; i < chars.length; i++) {
          const char = chars[i];
          currentStatement += char;
          
          // Détection des délimiteurs dollar
          if (char === '$') {
            // Chercher la fin du tag (par exemple $$ ou $_$ ou $body$)
            let tag = '$';
            let j = i + 1;
            while (j < chars.length && chars[j] !== '$') {
              tag += chars[j];
              j++;
            }
            if (j < chars.length) {
              tag += '$';
              
              if (!inDollarQuote) {
                // On entre dans un bloc dollar-quoted
                inDollarQuote = true;
                dollarQuoteTag = tag;
                // Ajouter le reste du tag au statement
                for (let k = i + 1; k <= j; k++) {
                  currentStatement += chars[k];
                }
                i = j;
              } else if (tag === dollarQuoteTag) {
                // On sort du bloc dollar-quoted
                inDollarQuote = false;
                dollarQuoteTag = '';
                // Ajouter le reste du tag au statement
                for (let k = i + 1; k <= j; k++) {
                  currentStatement += chars[k];
                }
                i = j;
              }
            }
          }
          
          // Diviser sur ; uniquement si on n'est pas dans un bloc dollar-quoted
          if (char === ';' && !inDollarQuote) {
            const stmt = currentStatement.trim();
            if (stmt) {
              statements.push(stmt);
            }
            currentStatement = '';
          }
        }
        
        // Ajouter le dernier statement s'il existe
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
        }
        
        return statements;
      };
      
      // Diviser en statements SQL individuels
      const allStatements = parseStatements(cleanedScript);
      
      const statements = allStatements.filter(stmt => {
          if (!stmt || stmt.length === 0) return false;
          
          // Ignorer les commandes psql
          if (stmt.startsWith('\\')) return false;
          
          // Ignorer les commandes de configuration qui ne sont pas nécessaires
          if (stmt.match(/^(SET|SELECT pg_catalog\.set_config)/i)) return false;
          
          // Ignorer CREATE SCHEMA public (existe déjà par défaut)
          if (stmt.match(/^CREATE\s+SCHEMA\s+public/i)) return false;
          
          // Ignorer COMMENT ON SCHEMA public (pas nécessaire)
          if (stmt.match(/^COMMENT\s+ON\s+SCHEMA\s+public/i)) return false;
          
          // Garder uniquement les vraies commandes SQL (CREATE, ALTER, INSERT, etc.)
          const firstWord = stmt.split(/\s+/)[0]?.toUpperCase();
          return ['CREATE', 'ALTER', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'GRANT', 'REVOKE', 'COMMENT', 'COPY'].includes(firstWord);
        });
      
      console.log(`📊 ${statements.length} commandes SQL à exécuter`);
      
      // Exécuter chaque commande
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await connection.query(stmt + ';');
          if ((i + 1) % 10 === 0) {
            console.log(`✅ ${i + 1}/${statements.length} commandes exécutées`);
          }
        } catch (error) {
          console.error(`❌ Erreur sur la commande ${i + 1}:`, stmt.substring(0, 100));
          console.error('Erreur complète:', error.message);
          throw error;
        }
      }
      
      console.log(`✅ Structure de base créée avec succès pour ${databaseName}`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'exécution du script:`, error);
      
      // Fermer la connexion avant de supprimer la base
      if (connection) {
        try {
          await connection.close();
        } catch (closeError) {
          console.error(`⚠️ Erreur lors de la fermeture de la connexion:`, closeError);
        }
      }
      
      // Attendre que la connexion soit complètement fermée
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Tenter de supprimer la base en cas d'erreur
      try {
        // Forcer la fermeture de toutes les connexions
        await this.shipnologyDataSource.query(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid()
        `, [databaseName]);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await this.shipnologyDataSource.query(`DROP DATABASE IF EXISTS ${databaseName}`);
        console.log(`🗑️ Base de données ${databaseName} supprimée après échec`);
      } catch (dropError) {
        console.error(`❌ Impossible de supprimer la base:`, dropError);
      }
      throw error;
    }
  }

  async getStats() {
    const total = await this.organisationRepository.count();
    const actives = await this.organisationRepository.count({ where: { statut: 'actif' } });
    const inactives = await this.organisationRepository.count({ where: { statut: 'inactif' } });
    const enAttente = await this.organisationRepository.count({ where: { statut: 'en_attente' } });

    return {
      total,
      actives,
      inactives,
      en_attente: enAttente,
    };
  }

  async updateLogoPath(id: number, logoPath: string) {
    const organisation = await this.findOne(id);
    await this.organisationRepository.update(id, { logo_url: logoPath });
    console.log(`✅ [Service] Logo mis à jour pour l'organisation #${id}: ${logoPath}`);
    return await this.findOne(id);
  }

  /**
   * Générer un token de setup unique pour une organisation
   * Le token expire dans 7 jours
   */
  private async generateSetupToken(organisationId: number, emailDestinataire: string): Promise<string> {
    const token = uuidv4(); // Génère un UUID v4 unique
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expire dans 24 heures

    const setupToken = this.setupTokenRepository.create({
      token,
      email_destinataire: emailDestinataire,
      organisation_id: organisationId,
      expires_at: expiresAt,
      used: false,
    });

    await this.setupTokenRepository.save(setupToken);
    console.log(`✅ Token de setup généré pour organisation #${organisationId}: ${token}`);
    
    return token;
  }

  /**
   * Vérifier et valider un token de setup
   */
  async validateSetupToken(token: string): Promise<Organisation> {
    const setupToken = await this.setupTokenRepository.findOne({
      where: { token },
      relations: ['organisation'],
    });

    if (!setupToken) {
      throw new NotFoundException('Token invalide');
    }

    if (setupToken.used) {
      throw new BadRequestException('Ce token a déjà été utilisé');
    }

    if (new Date() > setupToken.expires_at) {
      throw new BadRequestException('Ce token a expiré');
    }

    return setupToken.organisation;
  }

  /**
   * Marquer un token comme utilisé
   */
  async markTokenAsUsed(token: string): Promise<void> {
    await this.setupTokenRepository.update(
      { token },
      { used: true, used_at: new Date() }
    );
    console.log(`✅ Token marqué comme utilisé: ${token}`);
  }

  /**
   * Compléter le setup d'une organisation avec création du superviseur
   */
  async completeSetup(token: string, setupData: any): Promise<Organisation> {
    // 1. Valider le token
    const organisation = await this.validateSetupToken(token);

    // 2. Extraire les données du superviseur et de la configuration
    const {
      superviseur_prenom,
      superviseur_nom,
      superviseur_username,
      superviseur_genre,
      superviseur_email,
      superviseur_telephone,
      superviseur_mot_de_passe,
      superviseur_mot_de_passe_confirm,
      database_name,
      smtp_enabled,
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_password,
      smtp_from_email,
      smtp_from_name,
      smtp_use_tls,
      ...organisationData
    } = setupData;

    // Définir le plan par défaut si non fourni
    if (!organisationData.plan) {
      organisationData.plan = 'premium';
    }

    // 2.5. Si le client a fourni un nouveau nom de BD, le mettre à jour
    if (database_name && database_name !== organisation.database_name) {
      // Valider le format
      const dbNameRegex = /^[a-z][a-z0-9_]*$/;
      if (!dbNameRegex.test(database_name)) {
        throw new BadRequestException(
          'Le nom de la base doit commencer par une lettre et ne contenir que des lettres minuscules, chiffres et underscores'
        );
      }
      
      // Vérifier l'unicité
      const existing = await this.organisationRepository.findOne({
        where: { database_name },
      });
      if (existing && existing.id !== organisation.id) {
        throw new ConflictException('Ce nom de base de données existe déjà');
      }
      
      organisationData.database_name = database_name;
      organisation.database_name = database_name;
    }

    // Ajouter la configuration SMTP si activée
    if (smtp_enabled && smtp_host && smtp_user && smtp_password) {
      organisationData.smtp_enabled = smtp_enabled;
      organisationData.smtp_host = smtp_host;
      organisationData.smtp_port = smtp_port || 587;
      organisationData.smtp_user = smtp_user;
      organisationData.smtp_password = smtp_password;
      organisationData.smtp_from_email = smtp_from_email || smtp_user;
      organisationData.smtp_from_name = smtp_from_name || organisation.nom;
      organisationData.smtp_use_tls = smtp_use_tls !== false;
    }

    // 3. CRÉER LA BASE DE DONNÉES ET EXÉCUTER LE SCRIPT DE STRUCTURE
    console.log(`🗄️ Création de la base de données: ${organisation.database_name}`);
    try {
      await this.createOrganisationDatabaseWithStructure(organisation.database_name);
      console.log('✅ Base de données créée avec succès avec toutes les tables');
    } catch (error) {
      console.error('❌ Erreur lors de la création de la base:', error);
      throw new BadRequestException(
        `Impossible de créer la base de données: ${error.message}`
      );
    }

    // 4. Mettre à jour l'organisation
    await this.update(organisation.id, organisationData);

    // 5. Créer le superviseur dans la base de données de l'organisation
    if (superviseur_prenom && superviseur_nom && superviseur_email && superviseur_mot_de_passe) {
      await this.createSuperviseur(organisation.id, organisation.database_name, {
        prenom: superviseur_prenom,
        nom: superviseur_nom,
        nom_utilisateur: superviseur_username,
        genre: superviseur_genre,
        email: superviseur_email,
        telephone: superviseur_telephone,
        mot_de_passe: superviseur_mot_de_passe,
      });
      console.log('✅ Compte superviseur créé avec succès');
    }

    // 6. Mettre le statut de l'organisation à 'actif'
    await this.organisationRepository.update(organisation.id, { statut: 'actif' });
    console.log('✅ Organisation activée');

    // 7. Marquer le token comme utilisé
    await this.markTokenAsUsed(token);

    // 8. Retourner l'organisation mise à jour
    return await this.findOne(organisation.id);
  }

  /**
   * Créer le superviseur (premier utilisateur) dans la base de données de l'organisation
   */
  private async createSuperviseur(
    organisationId: number,
    databaseName: string,
    superviseurData: {
      prenom: string;
      nom: string;
      nom_utilisateur?: string;
      genre?: string;
      email: string;
      telephone: string;
      mot_de_passe: string;
    },
  ): Promise<void> {
    console.log(`👤 [Superviseur] Création du superviseur pour la base: ${databaseName} (organisation_id: ${organisationId})`);

    try {
      // Se connecter à la base de données de l'organisation
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(superviseurData.mot_de_passe, 10);

      // Utiliser le nom d'utilisateur fourni ou générer un basé sur l'email
      const nomUtilisateur = superviseurData.nom_utilisateur || superviseurData.email.split('@')[0];

      // Créer le superviseur dans la table personnel
      const query = `
        INSERT INTO personnel (
          organisation_id,
          prenom,
          nom,
          nom_utilisateur,
          genre,
          email,
          mot_de_passe,
          telephone,
          role,
          is_superviseur,
          statut,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
        ) RETURNING id, prenom, nom, nom_utilisateur, email, role, is_superviseur
      `;

      const result = await connection.query(query, [
        organisationId, // organisation_id
        superviseurData.prenom,
        superviseurData.nom,
        nomUtilisateur,
        superviseurData.genre || 'Homme', // Genre par défaut si non fourni
        superviseurData.email,
        hashedPassword,
        superviseurData.telephone,
        'administratif', // Rôle administratif
        true, // is_superviseur = true
        'actif',
      ]);

      console.log(`✅ [Superviseur] Créé avec succès - Role: administratif, is_superviseur: true`);
      console.log(`   ID: ${result[0].id}, Username: ${result[0].nom_utilisateur}, Email: ${result[0].email}`);
      console.log(`   Genre: ${superviseurData.genre || 'Homme'}`);

      console.log(`✅ [Superviseur] Créé avec succès:`, result[0]);
    } catch (error) {
      console.error(`❌ [Superviseur] Erreur lors de la création:`, error);
      throw new BadRequestException(
        `Impossible de créer le compte superviseur: ${error.message}`,
      );
    }
  }

  /**
   * Récupérer tous les tokens de setup d'une organisation
   */
  async getOrganisationTokens(organisationId: number) {
    await this.findOne(organisationId); // Vérifier que l'organisation existe

    const tokens = await this.setupTokenRepository.find({
      where: { organisation_id: organisationId },
      order: { created_at: 'DESC' },
    });

    return tokens.map(token => {
      const now = new Date();
      const isExpired = token.expires_at < now;
      
      return {
        id: token.id,
        token: token.token,
        email: token.email_destinataire,
        expires_at: token.expires_at,
        used_at: token.used_at,
        is_expired: isExpired,
        is_used: token.used,
        created_at: token.created_at,
      };
    });
  }

  /**
   * Récupérer le statut détaillé d'une organisation
   */
  async getOrganisationStatus(organisationId: number) {
    const organisation = await this.findOne(organisationId);

    // Vérifier si la base de données existe physiquement
    let databaseExists = false;
    let hasUsers = false;

    try {
      const dbCheck = await this.shipnologyDataSource.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [organisation.database_name]
      );
      databaseExists = dbCheck.length > 0;

      // Si la BD existe, vérifier s'il y a des utilisateurs
      if (databaseExists) {
        try {
          const connection = await this.databaseConnectionService.getOrganisationConnection(organisation.database_name);
          const userCount = await connection.query('SELECT COUNT(*) as count FROM personnel');
          hasUsers = parseInt(userCount[0].count) > 0;
        } catch (error) {
          console.error('Erreur lors de la vérification des utilisateurs:', error);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la base:', error);
    }

    return {
      database_created: databaseExists,
      has_users: hasUsers,
      setup_completed: organisation.setup_completed || false,
      statut: organisation.statut,
      date_creation: organisation.date_creation,
      date_derniere_connexion: organisation.date_derniere_connexion,
    };
  }

  /**
   * Générer un nouveau token de configuration pour une organisation
   * Uniquement si l'organisation est en attente et que le premier token est expiré
   */
  async generateNewSetupToken(organisationId: number) {
    const organisation = await this.findOne(organisationId);

    // Vérifier que l'organisation est en attente
    if (organisation.statut !== 'en_attente') {
      throw new BadRequestException('Impossible de générer un nouveau token. L\'organisation n\'est pas en attente de configuration.');
    }

    // Générer un nouveau token (pas besoin de vérifier les tokens existants)
    const newToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Expire dans 1 jour

    const setupToken = this.setupTokenRepository.create({
      token: newToken,
      organisation_id: organisationId,
      email_destinataire: organisation.email_contact,
      expires_at: expiresAt,
      used: false,
      created_at: new Date(),
    });

    await this.setupTokenRepository.save(setupToken);

    console.log(`✅ [Setup Token] Nouveau token généré pour organisation #${organisationId}`);

    return {
      success: true,
      message: 'Nouveau token de configuration généré',
      token: newToken,
      expires_at: expiresAt,
      setup_url: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/setup?token=${newToken}`,
    };
  }

  /**
   * Supprimer un token de configuration
   */
  async deleteSetupToken(tokenId: number) {
    const token = await this.setupTokenRepository.findOne({
      where: { id: tokenId },
    });

    if (!token) {
      throw new NotFoundException(`Token #${tokenId} non trouvé`);
    }

    // Empêcher la suppression si le token a déjà été utilisé
    if (token.used) {
      throw new BadRequestException('Impossible de supprimer un token déjà utilisé.');
    }

    await this.setupTokenRepository.delete(tokenId);

    console.log(`✅ [Setup Token] Token #${tokenId} supprimé`);

    return {
      success: true,
      message: 'Token supprimé avec succès',
    };
  }
}
