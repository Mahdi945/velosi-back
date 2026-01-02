import {
  Injectable, Scope,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Client, EtatFiscal } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { ObjectifCom } from '../entities/objectif-com.entity';
import { ContactClient } from '../entities/contact-client.entity';
import { KeycloakService } from '../auth/keycloak.service';
import { EmailService } from '../services/email.service';
import { TenantRepositoryService } from '../common/tenant-repository.service';
import { DatabaseConnectionService } from '../common/database-connection.service';

export interface CreateClientDto {
  nom: string;
  interlocuteur?: string;
  mot_de_passe?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  code_postal?: string;
  type_client?: string;
  contact_tel1?: string;
  contact_tel2?: string;
  contact_tel3?: string;
  contact_fax?: string;
  contact_mail1?: string;
  contact_mail2?: string;
  contact_fonction?: string;
  is_permanent?: boolean;
  send_email?: boolean; // Flag pour l'envoi d'email
}

export interface UpdateClientDto {
  nom?: string;
  interlocuteur?: string;
  email?: string;
  tel1?: string;
  tel2?: string;
  tel3?: string;
  fax?: string;
  mail1?: string;
  mail2?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  pays?: string;
  categorie?: string;
  type_client?: string;
  id_fiscal?: string;
  nature?: string;
  c_douane?: string;
  nbr_jour_ech?: number;
  etat_fiscal?: EtatFiscal;
  n_auto?: string;
  date_auto?: string;
  franchise_sur?: number;
  date_fin?: string;
  blocage?: boolean;
  devise?: string;
  timbre?: boolean;
  compte_cpt?: string;
  sec_activite?: string;
  charge_com?: string;
  stop_envoie_solde?: boolean;
  maj_web?: boolean;
  d_initial?: number;
  c_initial?: number;
  solde?: number;
  statut?: string;
}

export interface CreatePersonnelDto {
  nom: string;
  prenom: string;
  nom_utilisateur: string;
  role: string;
  mot_de_passe: string;
  telephone?: string;
  email?: string;
  genre?: string;
  statut?: string;
  send_email?: boolean; // Flag pour l'envoi d'email
  is_superviseur?: boolean; // Flag pour le statut de superviseur
  // Champs pour les objectifs commerciaux
  objectif_titre?: string;
  objectif_ca?: number;
  objectif_clients?: number;
  objectif_date_fin?: string;
  objectif_description?: string;
}

@Injectable({ scope: Scope.REQUEST })
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(ObjectifCom)
    private objectifComRepository: Repository<ObjectifCom>,
    @InjectRepository(ContactClient)
    private contactClientRepository: Repository<ContactClient>,
    private dataSource: DataSource,
    private keycloakService: KeycloakService,
    private configService: ConfigService,
    private emailService: EmailService,
    private tenantRepositoryService: TenantRepositoryService,
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Créer un client
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async createClient(databaseName: string, organisationId: number, createClientDto: CreateClientDto): Promise<Client> {
    console.log(`🔍 [createClient] DB: ${databaseName}, Org: ${organisationId}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Vérifier si le client existe déjà
    const existingClients = await connection.query(
      `SELECT * FROM client WHERE nom = $1 LIMIT 1`,
      [createClientDto.nom]
    );

    if (existingClients && existingClients.length > 0) {
      throw new ConflictException('Un client avec ce nom existe déjà');
    }

    // Vérifier l'unicité des téléphones si fournis
    const phoneFields = ['contact_tel1', 'contact_tel2', 'contact_tel3'];
    for (const phoneField of phoneFields) {
      const phoneValue = createClientDto[phoneField];
      if (phoneValue && phoneValue.trim()) {
        const normalizedPhone = phoneValue.replace(/[\s\-()]/g, '');
        
        // Validation du format (minimum 8 chiffres)
        if (!/^\+?[0-9]{8,}$/.test(normalizedPhone)) {
          throw new ConflictException(
            `Le numéro de téléphone ${phoneField.replace('contact_', '')} doit contenir au minimum 8 chiffres`
          );
        }

        // Vérifier l'unicité dans la table des contacts clients
        const telFieldName = phoneField.replace('contact_', ''); // tel1, tel2, tel3
        const existingPhoneClientRows = await connection.query(
          `SELECT c.* FROM client c
           LEFT JOIN contact_client cc ON cc.id_client = c.id
           WHERE cc.${telFieldName} = $1
           LIMIT 1`,
          [phoneValue]
        );

        if (existingPhoneClientRows && existingPhoneClientRows.length > 0) {
          throw new ConflictException(
            `Ce numéro de téléphone est déjà utilisé par un autre client`
          );
        }

        // Vérifier aussi dans la table du personnel
        const existingPhonePersonnelRows = await connection.query(
          `SELECT * FROM personnel WHERE telephone = $1 LIMIT 1`,
          [phoneValue]
        );

        if (existingPhonePersonnelRows && existingPhonePersonnelRows.length > 0) {
          throw new ConflictException(
            `Ce numéro de téléphone est déjà utilisé par un personnel`
          );
        }
      }
    }

    // Gérer le mot de passe selon le type de client
    let hashedPassword: string | null = null;
    
    // Hasher le mot de passe seulement pour les clients permanents
    if (createClientDto.is_permanent && createClientDto.mot_de_passe) {
      hashedPassword = await bcrypt.hash(createClientDto.mot_de_passe, 12);
    }

    // Créer le client avec organisation_id
    const insertResult = await connection.query(
      `INSERT INTO client (
        organisation_id, nom, interlocuteur, mot_de_passe, adresse, ville, pays, code_postal,
        type_client, is_permanent, photo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        'uploads/profiles/default-avatar.png'
      ]
    );

    const savedClient = insertResult[0];
    
    console.log(`📝 Client créé: ${savedClient.nom} (ID: ${savedClient.id})`);
    console.log(`🔐 Type d'accès: ${savedClient.is_permanent ? 'PERMANENT' : 'TEMPORAIRE'}`);
    console.log(`✅ Données complètes du client créé:`, JSON.stringify(savedClient, null, 2));

    // 🆕 Créer automatiquement le contact principal basé sur l'interlocuteur
    if (savedClient.id) {
      try {
        await connection.query(
          `INSERT INTO contact_client (
            id_client, nom, prenom, tel1, tel2, tel3, fax, mail1, mail2, fonction, is_principal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            savedClient.id,
            '', // Nom vide pour le contact principal
            createClientDto.interlocuteur || 'Contact principal',
            createClientDto.contact_tel1 || '',
            createClientDto.contact_tel2 || '',
            createClientDto.contact_tel3 || '',
            createClientDto.contact_fax || '',
            createClientDto.contact_mail1 || '',
            createClientDto.contact_mail2 || '',
            createClientDto.contact_fonction || createClientDto.interlocuteur || 'Interlocuteur',
            true
          ]
        );
        console.log(`✅ Contact principal créé pour le client ${savedClient.id}`);
      } catch (error) {
        console.warn(`⚠️ Erreur lors de la création du contact principal pour le client ${savedClient.id}:`, error.message);
        // On continue même si la création du contact échoue
      }
    }

    // Créer l'utilisateur dans Keycloak SEULEMENT pour les clients permanents
    if (createClientDto.is_permanent === true) {
      console.log(`🔑 Client permanent détecté - Tentative de création compte Keycloak...`);
      
      try {
        if (this.configService.get('KEYCLOAK_ENABLED') === 'true') {
          // Keycloak est désactivé pour l'instant - décommentez si nécessaire
          // const keycloakId = await this.keycloakService?.createUser?.({
          //   username: savedClient.nom,
          //   email: createClientDto.contact_mail1 || `${savedClient.nom.toLowerCase()}@client.velosi.com`,
          //   firstName: savedClient.nom,
          //   lastName: '',
          //   enabled: true,
          // });
          // // Mettre à jour l'ID Keycloak
          // if (keycloakId) {
          //   await this.clientRepository.update(savedClient.id, {
          //     keycloak_id: keycloakId,
          //   });
          //   savedClient.keycloak_id = keycloakId;
          //   console.log(`✅ Utilisateur Keycloak créé pour client permanent ${savedClient.id}: ${keycloakId}`);
          // }
        } else {
          console.log(`⚠️ Keycloak désactivé - pas de création de compte pour le client permanent`);
        }
      } catch (error) {
        console.warn('Erreur lors de la création dans Keycloak:', error.message);
      }

      // Envoyer l'email avec les identifiants (seulement si demandé)
      if (createClientDto.contact_mail1 && createClientDto.send_email !== false && createClientDto.mot_de_passe) {
        try {
          await this.emailService.sendClientCredentialsEmail(
            createClientDto.contact_mail1,
            savedClient.nom,
            createClientDto.mot_de_passe, // Mot de passe original
            createClientDto.interlocuteur || savedClient.nom
          );
          this.logger.log(`Email de bienvenue envoyé au client ${savedClient.nom} à ${createClientDto.contact_mail1}`);
        } catch (error) {
          this.logger.warn(`Erreur lors de l'envoi de l'email au client: ${error.message}`);
          // On continue même si l'email échoue
        }
      } else if (createClientDto.contact_mail1 && createClientDto.send_email === false) {
        this.logger.log(`Email non envoyé au client ${savedClient.nom} (send_email = false)`);
      }
    } else {
      console.log(`🕘 Client temporaire - AUCUNE création Keycloak (comportement voulu)`);
    }

    return savedClient;
  }

  /**
   * Créer un personnel
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async createPersonnel(
    databaseName: string,
    organisationId: number,
    createPersonnelDto: CreatePersonnelDto,
  ): Promise<Personnel> {
    console.log('🔍 [createPersonnel] DB:', databaseName, 'Org:', organisationId, 'Personnel:', createPersonnelDto.nom_utilisateur);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Vérifier si le personnel existe déjà - insensible à la casse
    const existingPersonnelRows = await connection.query(
      `SELECT * FROM personnel WHERE LOWER(nom_utilisateur) = LOWER($1) LIMIT 1`,
      [createPersonnelDto.nom_utilisateur]
    );

    if (existingPersonnelRows && existingPersonnelRows.length > 0) {
      throw new ConflictException(
        `Un utilisateur avec le nom d'utilisateur "${createPersonnelDto.nom_utilisateur}" existe déjà`,
      );
    }

    // Vérifier l'unicité du téléphone si fourni
    if (createPersonnelDto.telephone && createPersonnelDto.telephone.trim()) {
      const normalizedPhone = createPersonnelDto.telephone.replace(/[\s\-()]/g, '');
      
      // Validation du format (minimum 8 chiffres)
      if (!/^\+?[0-9]{8,}$/.test(normalizedPhone)) {
        throw new ConflictException(
          'Le numéro de téléphone doit contenir au minimum 8 chiffres'
        );
      }

      const existingPhonePersonnelRows = await connection.query(
        `SELECT * FROM personnel WHERE telephone = $1 LIMIT 1`,
        [createPersonnelDto.telephone]
      );

      if (existingPhonePersonnelRows && existingPhonePersonnelRows.length > 0) {
        throw new ConflictException(
          'Ce numéro de téléphone est déjà utilisé par un autre personnel'
        );
      }

      // Vérifier aussi dans la table des contacts clients
      const existingPhoneClientRows = await connection.query(
        `SELECT * FROM contact_client WHERE tel1 = $1 OR tel2 = $1 OR tel3 = $1 LIMIT 1`,
        [createPersonnelDto.telephone]
      );

      if (existingPhoneClientRows && existingPhoneClientRows.length > 0) {
        throw new ConflictException(
          'Ce numéro de téléphone est déjà utilisé par un client'
        );
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(
      createPersonnelDto.mot_de_passe,
      12,
    );

    // Créer le personnel
    const insertResult = await connection.query(
      `INSERT INTO personnel (
        nom, prenom, nom_utilisateur, role, mot_de_passe, telephone, email,
        genre, statut, is_superviseur, photo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        createPersonnelDto.nom,
        createPersonnelDto.prenom,
        createPersonnelDto.nom_utilisateur,
        createPersonnelDto.role,
        hashedPassword,
        createPersonnelDto.telephone,
        createPersonnelDto.email,
        createPersonnelDto.genre,
        createPersonnelDto.statut || 'actif',
        createPersonnelDto.is_superviseur || false,
        'uploads/profiles/default-avatar.png'
      ]
    );

    const savedPersonnel = insertResult[0];
    console.log('✅ [createPersonnel] Personnel créé:', savedPersonnel.id, savedPersonnel.nom_utilisateur);

    // Créer l'utilisateur dans Keycloak
    try {
      const keycloakId = await this.keycloakService.createUser({
        username: savedPersonnel.nom_utilisateur,
        email: savedPersonnel.email || `${savedPersonnel.nom_utilisateur}@velosi.com`,
        firstName: savedPersonnel.prenom,
        lastName: savedPersonnel.nom,
        enabled: true,
        password: createPersonnelDto.mot_de_passe, // Mot de passe non hashé pour Keycloak
      });

      // Mettre à jour l'ID Keycloak
      if (keycloakId) {
        await connection.query(
          `UPDATE personnel SET keycloak_id = $1 WHERE id = $2`,
          [keycloakId, savedPersonnel.id]
        );
        savedPersonnel.keycloak_id = keycloakId;

        // Assigner le rôle dans Keycloak
        await this.keycloakService.assignRoleToUser(keycloakId, savedPersonnel.role);
        this.logger.log(`Utilisateur ${savedPersonnel.nom_utilisateur} créé et synchronisé avec Keycloak (ID: ${keycloakId})`);
      }
    } catch (error) {
      this.logger.warn('Erreur lors de la création dans Keycloak:', error.message);
      // L'utilisateur est créé en base mais pas dans Keycloak - on peut continuer
    }

    // Créer l'objectif commercial si les données sont fournies
    if (createPersonnelDto.objectif_titre && (savedPersonnel.role === 'Commercial' || savedPersonnel.role === 'Manager')) {
      try {
        await connection.query(
          `INSERT INTO objectif_com (
            personnel_id, titre, description, objectif_ca, objectif_clients,
            date_debut, date_fin, statut, progres
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            savedPersonnel.id,
            createPersonnelDto.objectif_titre,
            createPersonnelDto.objectif_description || '',
            createPersonnelDto.objectif_ca || 0,
            createPersonnelDto.objectif_clients || 0,
            new Date(),
            createPersonnelDto.objectif_date_fin ? new Date(createPersonnelDto.objectif_date_fin) : null,
            'en_cours',
            0
          ]
        );
        this.logger.log(`Objectif commercial créé pour ${savedPersonnel.nom_utilisateur}: ${createPersonnelDto.objectif_titre}`);
      } catch (error) {
        this.logger.warn(`Erreur lors de la création de l'objectif commercial: ${error.message}`);
        // On continue même si la création d'objectif échoue
      }
    }

    // Envoyer l'email de bienvenue avec les informations de connexion (seulement si demandé)
    if (savedPersonnel.email && createPersonnelDto.send_email !== false) {
      try {
        await this.emailService.sendPersonnelCredentialsEmail(
          savedPersonnel.email,
          savedPersonnel.nom_utilisateur,
          createPersonnelDto.mot_de_passe, // Mot de passe original
          `${savedPersonnel.prenom} ${savedPersonnel.nom}`,
          savedPersonnel.role
        );
        this.logger.log(`Email de bienvenue envoyé à ${savedPersonnel.email}`);
      } catch (error) {
        this.logger.warn(`Erreur lors de l'envoi de l'email de bienvenue: ${error.message}`);
        // On continue même si l'email échoue
      }
    } else if (savedPersonnel.email && createPersonnelDto.send_email === false) {
      this.logger.log(`Email non envoyé à ${savedPersonnel.email} (send_email = false)`);
    }

    return savedPersonnel;
  }

  async getAllClients(user?: any): Promise<any[]> {
    try {
      console.log('🔍 [getAllClients] Début de la récupération des clients...');
      console.log('👤 [getAllClients] Utilisateur connecté:', user?.username || user?.nom_utilisateur, 'Rôle:', user?.role);
      
      // 🏢 Utiliser le repository multi-tenant
      const clientRepository = await this.tenantRepositoryService.getClientRepository();
      
      let query = clientRepository
        .createQueryBuilder('client')
        .leftJoinAndSelect('client.contacts', 'contact')
        .select([
          'client.id',
          'client.nom',
          'client.interlocuteur',
          'client.adresse',
          'client.code_postal',
          'client.ville',
          'client.pays',
          'client.type_client',
          'client.categorie',
          'client.id_fiscal',
          'client.etat_fiscal',
          'client.devise',
          'client.solde',
          'client.statut',
          'client.photo',
          'client.created_at',
          'client.blocage',
          'client.timbre',
          'client.stop_envoie_solde',
          'client.maj_web',
          'client.d_initial',
          'client.c_initial',
          'client.nbr_jour_ech',
          'client.franchise_sur',
          'client.date_fin',
          'client.nature',
          'client.c_douane',
          'client.n_auto',
          'client.date_auto',
          'client.compte_cpt',
          'client.sec_activite',
          'client.charge_com',
          'client.charge_com_ids', // 🆕 Ajouter le champ multi-commerciaux
          'client.keycloak_id',
          'client.is_permanent',
          // � CORRECTION: Ajouter les champs fournisseur
          'client.is_fournisseur',
          'client.code_fournisseur',
          // ✅ Champs de session et statut en ligne
          'client.statut_en_ligne',
          'client.last_activity',
          // �🏦 Informations bancaires
          'client.banque',
          'client.iban',
          'client.rib',
          'client.swift',
          'client.bic',
          'contact.tel1',
          'contact.tel2',
          'contact.tel3',
          'contact.fax',
          'contact.mail1',
          'contact.mail2',
          'contact.fonction'
        ]);

      // 🆕 Si l'utilisateur est commercial, filtrer par charge_com_ids (tableau)
      if (user && user.role === 'commercial') {
        const userId = user.sub || user.id;
        console.log('🔒 [getAllClients] Filtrage commercial - ID utilisateur:', userId);
        
        // Vérifier si l'ID du commercial est dans le tableau charge_com_ids
        // Utilisation de l'opérateur PostgreSQL @> pour vérifier si le tableau contient l'élément
        query = query.where(':userId = ANY(client.charge_com_ids)', { 
          userId: userId 
        });
        
        console.log('🔍 [getAllClients] Requête SQL avec filtre charge_com_ids appliqué');
      }

      const clients = await query.getMany();

      console.log(`📊 [getAllClients] ${clients.length} clients trouvés dans la base`);

      // Mapper les clients avec les informations de contact
      const mappedClients = clients.map(client => {
        const contact = client.contacts && client.contacts[0];
        
        // Debug: afficher les informations de contact
        console.log(`🔍 [getAllClients] Client ${client.nom} (ID: ${client.id}):`);
        console.log(`   - Contacts trouvés: ${client.contacts ? client.contacts.length : 0}`);
        if (contact) {
          console.log(`   - Contact: tel1="${contact.tel1}", mail1="${contact.mail1}", fonction="${contact.fonction}"`);
        } else {
          console.log(`   - Aucun contact disponible pour ce client`);
        }
        
        const mappedClient = {
          ...client,
          // Mapper les champs de contact vers les champs attendus par le frontend
          email: contact?.mail1 || client.email || '', // Priorité au contact, puis getter email
          tel1: contact?.tel1 || '', 
          tel2: contact?.tel2 || '',
          tel3: contact?.tel3 || '',
          fax: contact?.fax || '',
          mail1: contact?.mail1 || client.email || '',
          mail2: contact?.mail2 || '',
          fonction: contact?.fonction || '', // Ne pas utiliser le nom du client par défaut
          charge_com: client.charge_com, // S'assurer que charge_com est présent (ancien champ)
          charge_com_ids: client.charge_com_ids || [] // 🆕 Ajouter le champ multi-commerciaux
        };
        
        // Debug spécifique pour charge_com
        console.log(`   - charge_com BRUT: "${client.charge_com}"`);
        console.log(`   - charge_com MAPPÉ: "${mappedClient.charge_com}"`);
        console.log(`   - charge_com_ids BRUT:`, client.charge_com_ids);
        console.log(`   - charge_com_ids MAPPÉ:`, mappedClient.charge_com_ids);
        console.log(`   - categorie BRUT: "${client.categorie}" (type: ${typeof client.categorie})`); // 🆕 Debug catégorie
        console.log(`   - categorie MAPPÉ: "${mappedClient.categorie}"`); // 🆕 Debug catégorie
        
        console.log(`✅ [getAllClients] Client mappé: ${client.nom} (ID: ${client.id}) - Email: "${mappedClient.email}" - Tel1: "${mappedClient.tel1}"`);
        return mappedClient;
      });

      console.log(`✅ [getAllClients] Retour de ${mappedClients.length} clients mappés`);
      return mappedClients;
      
    } catch (error) {
      console.error('❌ [getAllClients] Erreur lors de la récupération des clients:', error);
      throw new Error(`Impossible de récupérer la liste des clients: ${error.message}`);
    }
  }

  // ✅ Méthodes getAllPersonnel et getPersonnelByRole déplacées vers la fin du fichier
  // avec support optionnel de databaseName pour plus de flexibilité

  /**
   * Récupérer un client avec ses contacts
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getClientWithContactData(databaseName: string, organisationId: number, clientId: number): Promise<any> {
    console.log(`🔍 [getClientWithContactData] DB: ${databaseName}, Org: ${organisationId}, Client ID: ${clientId}`);
    
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      // Récupérer le client avec ses contacts
      const clientRows = await connection.query(
        `SELECT c.*, 
                (SELECT json_agg(json_build_object(
                  'id', cc.id,
                  'mail1', cc.mail1,
                  'mail2', cc.mail2,
                  'tel1', cc.tel1,
                  'tel2', cc.tel2,
                  'tel3', cc.tel3,
                  'fax', cc.fax,
                  'fonction', cc.fonction,
                  'is_principal', cc.is_principal
                ))
                FROM contact_client cc WHERE cc.id_client = c.id) as contacts
         FROM client c
         WHERE c.id = $1 LIMIT 1`,
        [clientId]
      );

      if (!clientRows || clientRows.length === 0) {
        throw new NotFoundException('Client non trouvé');
      }
      
      const client = clientRows[0];

      console.log(`📋 [getClientWithContactData] Client trouvé: ${client.nom}`);
      console.log(`📋 [getClientWithContactData] Charge commercial: ${client.charge_com}`);
      console.log(`📋 [getClientWithContactData] Charge commercial IDs:`, client.charge_com_ids);
      console.log(`📋 [getClientWithContactData] Contacts: ${client.contacts?.length || 0}`);

      // Mapper les données comme pour getAllClients
      const contact = client.contacts && client.contacts[0];
      
      const mappedClient = {
        ...client,
        // Mapper les champs de contact vers les champs attendus par le frontend
        email: contact?.mail1 || client.email || '',
        tel1: contact?.tel1 || '', 
        tel2: contact?.tel2 || '',
        tel3: contact?.tel3 || '',
        fax: contact?.fax || '',
        mail1: contact?.mail1 || '',
        mail2: contact?.mail2 || '',
        fonction: contact?.fonction || '',
        charge_com: client.charge_com,
        charge_com_ids: client.charge_com_ids || []
      };

      console.log(`✅ [getClientWithContactData] Client mappé - charge_com: "${mappedClient.charge_com}"`);
      console.log(`✅ [getClientWithContactData] Client mappé - charge_com_ids:`, mappedClient.charge_com_ids);
      return mappedClient;

    } catch (error) {
      console.error(`❌ [getClientWithContactData] Erreur pour client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer un client par ID
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getClientById(databaseName: string, organisationId: number, id: number): Promise<Client> {
    console.log(`🔍 [getClientById] DB: ${databaseName}, Org: ${organisationId}, Client ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // ✅ MULTI-TENANT: Vérifier l'organisation_id pour isoler les données
    const clientRows = await connection.query(
      `SELECT c.id, c.nom, c.interlocuteur, c.adresse, c.ville, c.pays, c.created_at, c.blocage, c.photo,
              cc.tel1, cc.tel2, cc.tel3, cc.fax, cc.mail1, cc.mail2
       FROM client c
       LEFT JOIN contact_client cc ON cc.id_client = c.id
       WHERE c.id = $1 AND c.organisation_id = $2 LIMIT 1`,
      [id, organisationId]
    );

    if (!clientRows || clientRows.length === 0) {
      console.error(`❌ [getClientById] Client ${id} non trouvé dans organisation ${organisationId}`);
      throw new NotFoundException('Client non trouvé');
    }

    const client = clientRows[0];
    console.log(`✅ [getClientById] Client récupéré: ${client.nom} (Org: ${organisationId})`);
    return client;
  }

  /**
   * Mettre à jour un client
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async updateClient(databaseName: string, organisationId: number, id: number, updateClientDto: UpdateClientDto): Promise<Client> {
    console.log(`🔄 [updateClient] DB: ${databaseName}, Org: ${organisationId}, Client ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Vérifier que le client existe
    const existingClientRows = await connection.query(
      `SELECT * FROM client WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!existingClientRows || existingClientRows.length === 0) {
      throw new NotFoundException('Client non trouvé');
    }

    const existingClient = existingClientRows[0];

    console.log('🔄 [updateClient] Données reçues:', updateClientDto);

    try {
      // Séparer les données client des données contact
      const {
        // Champs de contact (à traiter séparément)
        email, tel1, tel2, tel3, fax, mail1, mail2,
        // Champs client (à mettre à jour dans la table client)
        ...clientData
      } = updateClientDto;

      // Nettoyer les données client - convertir les chaînes vides en null pour les champs de date
      const cleanedClientData = {
        ...clientData,
        date_auto: clientData.date_auto === '' ? null : clientData.date_auto,
        date_fin: clientData.date_fin === '' ? null : clientData.date_fin,
      };

      console.log('🔄 [updateClient] Données client nettoyées:', cleanedClientData);

      // Construire la requête de mise à jour dynamiquement
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      Object.keys(cleanedClientData).forEach(key => {
        if (cleanedClientData[key] !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(cleanedClientData[key]);
          paramIndex++;
        }
      });

      if (updateFields.length > 0) {
        updateValues.push(id);
        await connection.query(
          `UPDATE client SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          updateValues
        );
        console.log('✅ [updateClient] Client mis à jour dans la base');
      }

      // Préparer les données de contact
      const contactData = {
        tel1: tel1 || null,
        tel2: tel2 || null,
        tel3: tel3 || null,
        fax: fax || null,
        mail1: email || mail1 || null,
        mail2: mail2 || null,
      };

      console.log('🔄 [updateClient] Données contact:', contactData);

      // Vérifier si un contact existe déjà
      const existingContactRows = await connection.query(
        `SELECT * FROM contact_client WHERE id_client = $1 LIMIT 1`,
        [id]
      );

      if (existingContactRows && existingContactRows.length > 0) {
        // Mettre à jour le contact existant
        const contactUpdateFields: string[] = [];
        const contactUpdateValues: any[] = [];
        let contactParamIndex = 1;

        Object.keys(contactData).forEach(key => {
          if (contactData[key] !== undefined) {
            contactUpdateFields.push(`${key} = $${contactParamIndex}`);
            contactUpdateValues.push(contactData[key]);
            contactParamIndex++;
          }
        });

        if (contactUpdateFields.length > 0) {
          contactUpdateValues.push(id);
          await connection.query(
            `UPDATE contact_client SET ${contactUpdateFields.join(', ')} WHERE id_client = $${contactParamIndex}`,
            contactUpdateValues
          );
          console.log('✅ [updateClient] Contact mis à jour');
        }
      } else {
        // Créer un nouveau contact
        await connection.query(
          `INSERT INTO contact_client (id_client, tel1, tel2, tel3, fax, mail1, mail2)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, contactData.tel1, contactData.tel2, contactData.tel3, contactData.fax, contactData.mail1, contactData.mail2]
        );
        console.log('✅ [updateClient] Contact créé');
      }

      // Récupérer le client mis à jour
      const updatedClientRows = await connection.query(
        `SELECT * FROM client WHERE id = $1 LIMIT 1`,
        [id]
      );

      const updatedClient = updatedClientRows[0];
      console.log('✅ [updateClient] Client mis à jour avec succès:', updatedClient?.nom);
      return updatedClient;

    } catch (error) {
      console.error('❌ [updateClient] Erreur:', error);
      throw new Error(`Impossible de mettre à jour le client: ${error.message}`);
    }
  }

  /**
   * Récupérer un personnel par ID
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getPersonnelById(databaseName: string, organisationId: number, id: number): Promise<Personnel> {
    console.log(`🔍 [getPersonnelById] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const personnelRows = await connection.query(
      `SELECT id, nom, prenom, nom_utilisateur, role, telephone, email, statut, created_at
       FROM personnel WHERE id = $1 AND organisation_id = $2 LIMIT 1`,
      [id, organisationId]
    );

    if (!personnelRows || personnelRows.length === 0) {
      console.error(`❌ [getPersonnelById] Personnel ${id} non trouvé dans organisation ${organisationId}`);
      throw new NotFoundException('Personnel non trouvé');
    }

    const personnel = personnelRows[0];
    console.log(`✅ [getPersonnelById] Personnel récupéré: ${personnel.nom_utilisateur} (Org: ${organisationId})`);
    return personnel;
  }

  /**
   * Mettre à jour un personnel
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async updatePersonnel(databaseName: string, organisationId: number, id: number, updateData: Partial<CreatePersonnelDto>): Promise<Personnel> {
    console.log('🔄 [updatePersonnel] DB:', databaseName, 'Org:', organisationId, 'Personnel ID:', id);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Vérifier que le personnel existe
    const existingPersonnelRows = await connection.query(
      `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!existingPersonnelRows || existingPersonnelRows.length === 0) {
      console.error('❌ [updatePersonnel] Personnel non trouvé');
      throw new NotFoundException('Personnel non trouvé');
    }

    const existingPersonnel = existingPersonnelRows[0];

    // Vérifier l'unicité du nom d'utilisateur si modifié - insensible à la casse
    if (updateData.nom_utilisateur && updateData.nom_utilisateur.toLowerCase() !== existingPersonnel.nom_utilisateur.toLowerCase()) {
      const existingUserRows = await connection.query(
        `SELECT * FROM personnel WHERE LOWER(nom_utilisateur) = LOWER($1) LIMIT 1`,
        [updateData.nom_utilisateur]
      );

      if (existingUserRows && existingUserRows.length > 0) {
        throw new ConflictException('Ce nom d\'utilisateur est déjà utilisé');
      }
    }

    // Vérifier l'unicité du téléphone si modifié
    if (updateData.telephone && updateData.telephone.trim() && updateData.telephone !== existingPersonnel.telephone) {
      const normalizedPhone = updateData.telephone.replace(/[\s\-()]/g, '');
      
      // Validation du format (minimum 8 chiffres)
      if (!/^\+?[0-9]{8,}$/.test(normalizedPhone)) {
        throw new ConflictException(
          'Le numéro de téléphone doit contenir au minimum 8 chiffres'
        );
      }

      const existingPhonePersonnelRows = await connection.query(
        `SELECT * FROM personnel WHERE telephone = $1 LIMIT 1`,
        [updateData.telephone]
      );

      if (existingPhonePersonnelRows && existingPhonePersonnelRows.length > 0 && existingPhonePersonnelRows[0].id !== id) {
        throw new ConflictException(
          'Ce numéro de téléphone est déjà utilisé par un autre personnel'
        );
      }

      // Vérifier aussi dans la table des contacts clients
      const existingPhoneClientRows = await connection.query(
        `SELECT * FROM contact_client WHERE tel1 = $1 OR tel2 = $1 OR tel3 = $1 LIMIT 1`,
        [updateData.telephone]
      );

      if (existingPhoneClientRows && existingPhoneClientRows.length > 0) {
        throw new ConflictException(
          'Ce numéro de téléphone est déjà utilisé par un client'
        );
      }
    }

    // Préparer les données de mise à jour
    const updateFieldsArray: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (updateData.nom) {
      updateFieldsArray.push(`nom = $${paramIndex}`);
      updateValues.push(updateData.nom);
      paramIndex++;
    }
    if (updateData.prenom) {
      updateFieldsArray.push(`prenom = $${paramIndex}`);
      updateValues.push(updateData.prenom);
      paramIndex++;
    }
    if (updateData.nom_utilisateur) {
      updateFieldsArray.push(`nom_utilisateur = $${paramIndex}`);
      updateValues.push(updateData.nom_utilisateur);
      paramIndex++;
    }
    if (updateData.role) {
      updateFieldsArray.push(`role = $${paramIndex}`);
      updateValues.push(updateData.role);
      paramIndex++;
    }
    if (updateData.telephone) {
      updateFieldsArray.push(`telephone = $${paramIndex}`);
      updateValues.push(updateData.telephone);
      paramIndex++;
    }
    if (updateData.email) {
      updateFieldsArray.push(`email = $${paramIndex}`);
      updateValues.push(updateData.email);
      paramIndex++;
    }
    if (updateData.genre) {
      updateFieldsArray.push(`genre = $${paramIndex}`);
      updateValues.push(updateData.genre);
      paramIndex++;
    }
    if (updateData.statut) {
      updateFieldsArray.push(`statut = $${paramIndex}`);
      updateValues.push(updateData.statut);
      paramIndex++;
    }
    if (updateData.is_superviseur !== undefined) {
      updateFieldsArray.push(`is_superviseur = $${paramIndex}`);
      updateValues.push(updateData.is_superviseur);
      paramIndex++;
    }

    // Effectuer la mise à jour
    if (updateFieldsArray.length > 0) {
      updateValues.push(id);
      await connection.query(
        `UPDATE personnel SET ${updateFieldsArray.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      );
      console.log('✅ [updatePersonnel] Personnel mis à jour dans la base');
    }

    // Récupérer le personnel mis à jour
    const updatedPersonnelRows = await connection.query(
      `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
      [id]
    );
    const updatedPersonnel = updatedPersonnelRows[0];

    // Synchroniser avec Keycloak - créer l'utilisateur s'il n'existe pas
    if (!updatedPersonnel.keycloak_id) {
      try {
        this.logger.log(`Création utilisateur Keycloak lors de mise à jour pour: ${updatedPersonnel.nom_utilisateur}`);
        
        const keycloakId = await this.keycloakService.createUser({
          username: updatedPersonnel.nom_utilisateur,
          email: updatedPersonnel.email || `${updatedPersonnel.nom_utilisateur}@velosi.com`,
          firstName: updatedPersonnel.prenom,
          lastName: updatedPersonnel.nom,
          enabled: updatedPersonnel.statut === 'actif',
        });
        
        if (keycloakId) {
          // Mettre à jour l'ID dans la base
          await connection.query(
            `UPDATE personnel SET keycloak_id = $1 WHERE id = $2`,
            [keycloakId, id]
          );
          // Assigner le rôle
          await this.keycloakService.updateUserRole(keycloakId, updatedPersonnel.role);
          this.logger.log(`Utilisateur créé dans Keycloak avec ID: ${keycloakId}`);
        }
      } catch (error) {
        this.logger.warn('Erreur création utilisateur Keycloak:', error.message);
      }
    } else {
      try {
        // Mettre à jour les informations de base dans Keycloak
        await this.keycloakService.updateUser(updatedPersonnel.keycloak_id, {
          username: updatedPersonnel.nom_utilisateur,
          email: updatedPersonnel.email || `${updatedPersonnel.nom_utilisateur}@velosi.com`,
          firstName: updatedPersonnel.prenom,
          lastName: updatedPersonnel.nom,
          enabled: updatedPersonnel.statut === 'actif',
        });

        // Si le rôle a changé, le mettre à jour dans Keycloak
        if (updateData.role && updateData.role !== existingPersonnel.role) {
          await this.keycloakService.updateUserRole(updatedPersonnel.keycloak_id, updatedPersonnel.role);
        }

        // Si le statut a changé vers inactif, désactiver dans Keycloak
        if (updateData.statut && updateData.statut === 'inactif' && existingPersonnel.statut === 'actif') {
          await this.keycloakService.disableUser(updatedPersonnel.keycloak_id);
          this.logger.log(`Utilisateur ${updatedPersonnel.nom_utilisateur} désactivé dans Keycloak`);
        }

        // Si le statut a changé vers actif, activer dans Keycloak
        if (updateData.statut && updateData.statut === 'actif' && existingPersonnel.statut === 'inactif') {
          await this.keycloakService.enableUser(updatedPersonnel.keycloak_id);
          this.logger.log(`Utilisateur ${updatedPersonnel.nom_utilisateur} activé dans Keycloak`);
        }

        this.logger.log(`Utilisateur ${updatedPersonnel.nom_utilisateur} synchronisé avec Keycloak`);
      } catch (error) {
        this.logger.warn('Erreur lors de la synchronisation avec Keycloak:', error.message);
        // La mise à jour en base a réussi, on continue même si Keycloak échoue
      }
    }

    return updatedPersonnel;
  }

  /**
   * Mettre à jour le mot de passe d'un client
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async updateClientPassword(databaseName: string, organisationId: number, id: number, newPassword: string): Promise<void> {
    console.log(`🔐 [updateClientPassword] DB: ${databaseName}, Org: ${organisationId}, Client ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer l'utilisateur pour obtenir le keycloak_id
    const clientRows = await connection.query(
      `SELECT * FROM client WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!clientRows || clientRows.length === 0) {
      throw new NotFoundException('Client non trouvé');
    }
    
    const client = clientRows[0];

    // Mettre à jour le mot de passe en base
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await connection.query(
      `UPDATE client SET mot_de_passe = $1 WHERE id = $2`,
      [hashedPassword, id]
    );

    console.log('✅ [updateClientPassword] Mot de passe mis à jour en base');

    // Synchroniser avec Keycloak si l'utilisateur a un keycloak_id
    if (client.keycloak_id) {
      try {
        await this.keycloakService.updateUserPassword(client.keycloak_id, newPassword);
        this.logger.log(`Mot de passe synchronisé avec Keycloak pour le client ${client.nom}`);
      } catch (error) {
        this.logger.warn(`Erreur lors de la synchronisation du mot de passe avec Keycloak: ${error.message}`);
        // On continue même si la synchronisation Keycloak échoue
      }
    }
  }

  /**
   * Mettre à jour le mot de passe d'un personnel
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async updatePersonnelPassword(
    databaseName: string,
    organisationId: number,
    id: number,
    newPassword: string,
  ): Promise<void> {
    console.log(`🔐 [updatePersonnelPassword] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer l'utilisateur pour obtenir le keycloak_id
    const personnelRows = await connection.query(
      `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!personnelRows || personnelRows.length === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }
    
    const personnel = personnelRows[0];

    // Mettre à jour le mot de passe en base
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await connection.query(
      `UPDATE personnel SET mot_de_passe = $1 WHERE id = $2`,
      [hashedPassword, id]
    );

    console.log('✅ [updatePersonnelPassword] Mot de passe mis à jour en base');

    // Synchroniser avec Keycloak si l'utilisateur a un keycloak_id
    if (personnel.keycloak_id) {
      try {
        await this.keycloakService.updateUserPassword(personnel.keycloak_id, newPassword);
        this.logger.log(`Mot de passe synchronisé avec Keycloak pour l'utilisateur ${personnel.nom_utilisateur}`);
      } catch (error) {
        this.logger.warn(`Erreur lors de la synchronisation du mot de passe avec Keycloak: ${error.message}`);
        // On continue même si la synchronisation Keycloak échoue
      }
    }
  }

  /**
   * Bloquer un client
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async blockClient(databaseName: string, organisationId: number, id: number): Promise<void> {
    console.log(`🚫 [blockClient] DB: ${databaseName}, Org: ${organisationId}, Client ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `UPDATE client SET blocage = true WHERE id = $1`,
      [id]
    );

    if (result[1] === 0) {
      throw new NotFoundException('Client non trouvé');
    }
    
    console.log('✅ [blockClient] Client bloqué');
  }

  /**
   * Débloquer un client
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async unblockClient(databaseName: string, organisationId: number, id: number): Promise<void> {
    console.log(`✅ [unblockClient] DB: ${databaseName}, Org: ${organisationId}, Client ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `UPDATE client SET blocage = false WHERE id = $1`,
      [id]
    );

    if (result[1] === 0) {
      throw new NotFoundException('Client non trouvé');
    }
    
    console.log('✅ [unblockClient] Client débloqué');
  }

  /**
   * Désactiver un personnel
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async deactivatePersonnel(databaseName: string, organisationId: number, id: number, reason?: string): Promise<void> {
    console.log(`🔴 [deactivatePersonnel] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer les informations du personnel avant désactivation
    const personnelRows = await connection.query(
      `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!personnelRows || personnelRows.length === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }
    
    const personnel = personnelRows[0];
    
    // Mettre à jour le statut
    await connection.query(
      `UPDATE personnel SET statut = 'inactif' WHERE id = $1`,
      [id]
    );

    this.logger.log(`Personnel ${personnel.nom_utilisateur} désactivé. Raison: ${reason || 'Non spécifiée'}`);
    
    // Synchroniser avec Keycloak - désactiver l'utilisateur
    if (personnel.keycloak_id) {
      try {
        await this.keycloakService.disableUser(personnel.keycloak_id);
        this.logger.log(`Utilisateur ${personnel.nom_utilisateur} désactivé dans Keycloak`);
      } catch (error) {
        this.logger.warn(`Erreur lors de la désactivation dans Keycloak: ${error.message}`);
        // On continue même si Keycloak échoue
      }
    }

    // Envoyer l'email de notification
    if (personnel.email && reason) {
      try {
        const fullName = `${personnel.prenom} ${personnel.nom}`;
        await this.emailService.sendPersonnelDeactivationEmail(
          personnel.email,
          fullName,
          'desactive',
          reason
        );
      } catch (error) {
        console.error('Erreur envoi email désactivation:', error);
        // Ne pas faire échouer la désactivation si l'email échoue
      }
    }
  }

  /**
   * Suspendre un personnel
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async suspendPersonnel(databaseName: string, organisationId: number, id: number, reason?: string): Promise<void> {
    console.log(`⏸️ [suspendPersonnel] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer les informations du personnel avant suspension
    const personnelRows = await connection.query(
      `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!personnelRows || personnelRows.length === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }
    
    const personnel = personnelRows[0];
    
    // Mettre à jour le statut
    await connection.query(
      `UPDATE personnel SET statut = 'suspendu' WHERE id = $1`,
      [id]
    );

    this.logger.log(`Personnel ${personnel.nom_utilisateur} suspendu. Raison: ${reason || 'Non spécifiée'}`);
    
    // Synchroniser avec Keycloak - désactiver l'utilisateur suspendu
    if (personnel.keycloak_id) {
      try {
        await this.keycloakService.disableUser(personnel.keycloak_id);
        this.logger.log(`Utilisateur ${personnel.nom_utilisateur} suspendu dans Keycloak`);
      } catch (error) {
        this.logger.warn(`Erreur lors de la suspension dans Keycloak: ${error.message}`);
        // On continue même si Keycloak échoue
      }
    }

    // Envoyer l'email de notification
    if (personnel.email && reason) {
      try {
        const fullName = `${personnel.prenom} ${personnel.nom}`;
        await this.emailService.sendPersonnelDeactivationEmail(
          personnel.email,
          fullName,
          'suspendu',
          reason
        );
      } catch (error) {
        console.error('Erreur envoi email suspension:', error);
        // Ne pas faire échouer la suspension si l'email échoue
      }
    }
  }

  /**
   * Activer un personnel
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async activatePersonnel(databaseName: string, organisationId: number, id: number): Promise<void> {
    console.log(`✅ [activatePersonnel] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer les informations du personnel
    const personnelRows = await connection.query(
      `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!personnelRows || personnelRows.length === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }
    
    const personnel = personnelRows[0];
    
    // Mettre à jour le statut
    await connection.query(
      `UPDATE personnel SET statut = 'actif' WHERE id = $1`,
      [id]
    );

    this.logger.log(`Personnel ${personnel.nom_utilisateur} activé`);
    
    // Synchroniser avec Keycloak - activer l'utilisateur
    if (personnel.keycloak_id) {
      try {
        await this.keycloakService.enableUser(personnel.keycloak_id);
        this.logger.log(`Utilisateur ${personnel.nom_utilisateur} activé dans Keycloak`);
      } catch (error) {
        this.logger.warn(`Erreur lors de l'activation dans Keycloak: ${error.message}`);
        // On continue même si Keycloak échoue
      }
    }
  }

  /**
   * Réactiver un personnel
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async reactivatePersonnel(databaseName: string, organisationId: number, id: number): Promise<void> {
    console.log(`♻️ [reactivatePersonnel] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer les informations du personnel avant réactivation
    const personnelRows = await connection.query(
      `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!personnelRows || personnelRows.length === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }
    
    const personnel = personnelRows[0];
    
    // Mettre à jour le statut
    await connection.query(
      `UPDATE personnel SET statut = 'actif' WHERE id = $1`,
      [id]
    );

    this.logger.log(`Personnel ${personnel.nom_utilisateur} réactivé`);
    
    // Synchroniser avec Keycloak - réactiver l'utilisateur
    if (personnel.keycloak_id) {
      try {
        await this.keycloakService.enableUser(personnel.keycloak_id);
        this.logger.log(`Utilisateur ${personnel.nom_utilisateur} réactivé dans Keycloak`);
      } catch (error) {
        this.logger.warn(`Erreur lors de la réactivation dans Keycloak: ${error.message}`);
        // On continue même si Keycloak échoue
      }
    }

    // Envoyer l'email de notification
    if (personnel.email) {
      try {
        const fullName = `${personnel.prenom} ${personnel.nom}`;
        await this.emailService.sendPersonnelReactivationEmail(
          personnel.email,
          fullName
        );
      } catch (error) {
        console.error('Erreur envoi email réactivation:', error);
        // Ne pas faire échouer la réactivation si l'email échoue
      }
    }
  }

  /**
   * Supprimer un personnel
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async deletePersonnel(databaseName: string, organisationId: number, id: number, reason?: string): Promise<void> {
    console.log(`🗑️ [deletePersonnel] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer les informations du personnel avant suppression
    const personnelRows = await connection.query(
      `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!personnelRows || personnelRows.length === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }
    
    const personnel = personnelRows[0];

    // Supprimer l'utilisateur de Keycloak d'abord
    if (personnel.keycloak_id) {
      try {
        await this.keycloakService.deleteUser(personnel.keycloak_id);
        this.logger.log(`Utilisateur ${personnel.nom_utilisateur} supprimé de Keycloak`);
      } catch (error) {
        this.logger.warn(`Erreur lors de la suppression dans Keycloak: ${error.message}`);
        // On continue même si Keycloak échoue
      }
    }

    // Envoyer l'email de notification avant suppression
    if (personnel.email && reason) {
      try {
        const fullName = `${personnel.prenom} ${personnel.nom}`;
        await this.emailService.sendPersonnelDeactivationEmail(
          personnel.email,
          fullName,
          'desactive',
          `Compte supprimé. Raison: ${reason}`
        );
      } catch (error) {
        console.error('Erreur envoi email suppression:', error);
        // Ne pas faire échouer la suppression si l'email échoue
      }
    }

    // Supprimer les objectifs commerciaux associés
    try {
      await connection.query(
        `DELETE FROM objectif_com WHERE id_personnel = $1`,
        [id]
      );
      this.logger.log(`Objectifs commerciaux supprimés pour le personnel ${id}`);
    } catch (error) {
      this.logger.warn(`Erreur suppression objectifs pour personnel ${id}:`, error.message);
    }

    // Soft delete du personnel
    await connection.query(
      `UPDATE personnel SET deleted_at = NOW(), statut = 'supprime' WHERE id = $1`,
      [id]
    );

    this.logger.log(`Personnel ${personnel.nom_utilisateur} supprimé. Raison: ${reason || 'Non spécifiée'}`);
  }

  /**
   * Obtenir l'activité d'un personnel depuis Keycloak
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getPersonnelActivity(databaseName: string, organisationId: number, id: number): Promise<any> {
    console.log(`📊 [getPersonnelActivity] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const personnelRows = await connection.query(
      `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!personnelRows || personnelRows.length === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }
    
    const personnel = personnelRows[0];

    if (!personnel.keycloak_id) {
      return {
        success: false,
        message: 'Aucun ID Keycloak associé à ce personnel',
        activity: null,
      };
    }

    try {
      const activity = await this.keycloakService.getUserActivity(personnel.keycloak_id);
      
      return {
        success: true,
        message: 'Activité récupérée avec succès',
        activity: {
          ...activity,
          personnelInfo: {
            id: personnel.id,
            nom: personnel.nom,
            prenom: personnel.prenom,
            nom_utilisateur: personnel.nom_utilisateur,
            statut: personnel.statut,
            keycloak_id: personnel.keycloak_id,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'activité: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors de la récupération de l\'activité depuis Keycloak',
        activity: null,
      };
    }
  }

  /**
   * Obtenir les sessions actives d'un personnel
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getPersonnelSessions(databaseName: string, organisationId: number, id: number): Promise<any> {
    console.log(`🔐 [getPersonnelSessions] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const personnelRows = await connection.query(
      `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!personnelRows || personnelRows.length === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }
    
    const personnel = personnelRows[0];

    if (!personnel.keycloak_id) {
      return {
        success: false,
        message: 'Aucun ID Keycloak associé à ce personnel',
        sessions: [],
      };
    }

    try {
      const sessions = await this.keycloakService.getUserSessions(personnel.keycloak_id);
      
      return {
        success: true,
        message: 'Sessions récupérées avec succès',
        sessions: sessions.map(session => ({
          id: session.id,
          start: session.start ? new Date(session.start) : null,
          lastAccess: session.lastAccess ? new Date(session.lastAccess) : null,
          clients: session.clients || {},
          userId: session.userId,
          username: session.username,
          ipAddress: session.ipAddress,
        })),
        personnelInfo: {
          id: personnel.id,
          nom: personnel.nom,
          prenom: personnel.prenom,
          nom_utilisateur: personnel.nom_utilisateur,
          statut: personnel.statut,
        },
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des sessions: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors de la récupération des sessions depuis Keycloak',
        sessions: [],
      };
    }
  }

  /**
   * Déconnecter toutes les sessions d'un personnel
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async logoutAllPersonnelSessions(databaseName: string, organisationId: number, id: number): Promise<any> {
    console.log(`🚪 [logoutAllPersonnelSessions] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const personnelRows = await connection.query(
      `SELECT * FROM personnel WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!personnelRows || personnelRows.length === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }
    
    const personnel = personnelRows[0];

    if (!personnel.keycloak_id) {
      return {
        success: false,
        message: 'Aucun ID Keycloak associé à ce personnel',
      };
    }

    try {
      const success = await this.keycloakService.logoutAllUserSessions(personnel.keycloak_id);
      
      return {
        success,
        message: success 
          ? 'Toutes les sessions ont été fermées avec succès'
          : 'Erreur lors de la fermeture des sessions',
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la fermeture des sessions: ${error.message}`);
      return {
        success: false,
        message: 'Erreur lors de la fermeture des sessions',
      };
    }
  }

  /**
   * Désactiver ou suspendre un client
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async deactivateClient(databaseName: string, organisationId: number, id: number, statut: string, motif: string, notifyByEmail: boolean): Promise<void> {
    console.log(`🔴 [deactivateClient] DB: ${databaseName}, Org: ${organisationId}, Client ID: ${id}, Statut: ${statut}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer les informations du client avec ses contacts
    const clientRows = await connection.query(
      `SELECT c.*, 
              (SELECT json_agg(json_build_object('mail1', cc.mail1, 'mail2', cc.mail2, 'is_principal', cc.is_principal))
               FROM contact_client cc WHERE cc.id_client = c.id) as contacts
       FROM client c
       WHERE c.id = $1 LIMIT 1`,
      [id]
    );
    
    if (!clientRows || clientRows.length === 0) {
      throw new NotFoundException('Client non trouvé');
    }
    
    const client = clientRows[0];
    
    // Log de débogage pour vérifier les contacts
    this.logger.log(`🔍 Client trouvé: ${client.nom}, Nombre de contacts: ${client.contacts?.length || 0}`);
    if (client.contacts && client.contacts.length > 0) {
      client.contacts.forEach((contact: any, index: number) => {
        this.logger.log(`📧 Contact ${index + 1}: mail1=${contact.mail1}, mail2=${contact.mail2}`);
      });
    }
    
    // Mettre à jour le statut
    await connection.query(
      `UPDATE client SET statut = $1 WHERE id = $2`,
      [statut, id]
    );
    
    this.logger.log(`Client ${client.nom} ${statut === 'desactive' ? 'désactivé' : 'suspendu'}. Motif: ${motif}`);
    
    // Envoyer email de notification si demandé
    if (notifyByEmail && client.contacts && client.contacts.length > 0) {
      try {
        const principalContact = client.contacts.find((c: any) => c.is_principal);
        const contactToUse = principalContact || client.contacts[0];
        const emailToUse = contactToUse.mail1 || contactToUse.mail2;
        
        if (emailToUse) {
          await this.emailService.sendClientDeactivationEmail(
            emailToUse,
            client.nom,
            statut as 'desactive' | 'suspendu',
            motif
          );
          this.logger.log(`✅ Email de notification envoyé à ${emailToUse}`);
        }
      } catch (error) {
        this.logger.error(`Erreur lors de l'envoi de l'email: ${error.message}`);
      }
    }
  }

  /**
   * Réactiver un client
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async reactivateClient(databaseName: string, organisationId: number, id: number, notifyByEmail: boolean): Promise<void> {
    console.log(`✅ [reactivateClient] DB: ${databaseName}, Org: ${organisationId}, Client ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer les informations du client avec ses contacts
    const clientRows = await connection.query(
      `SELECT c.*, 
              (SELECT json_agg(json_build_object('mail1', cc.mail1, 'mail2', cc.mail2, 'is_principal', cc.is_principal))
               FROM contact_client cc WHERE cc.id_client = c.id) as contacts
       FROM client c
       WHERE c.id = $1 LIMIT 1`,
      [id]
    );
    
    if (!clientRows || clientRows.length === 0) {
      throw new NotFoundException('Client non trouvé');
    }
    
    const client = clientRows[0];
    
    // Log de débogage pour vérifier les contacts
    this.logger.log(`🔍 Client trouvé: ${client.nom}, Nombre de contacts: ${client.contacts?.length || 0}`);
    if (client.contacts && client.contacts.length > 0) {
      client.contacts.forEach((contact: any, index: number) => {
        this.logger.log(`📧 Contact ${index + 1}: mail1=${contact.mail1}, mail2=${contact.mail2}`);
      });
    }
    
    // Mettre à jour le statut
    await connection.query(
      `UPDATE client SET statut = 'actif' WHERE id = $1`,
      [id]
    );
    
    this.logger.log(`Client ${client.nom} réactivé avec succès`);
    
    // Envoyer email de notification si demandé
    if (notifyByEmail && client.contacts && client.contacts.length > 0) {
      try {
        const principalContact = client.contacts.find((c: any) => c.is_principal);
        const contactToUse = principalContact || client.contacts[0];
        const emailToUse = contactToUse.mail1 || contactToUse.mail2;
        
        if (emailToUse) {
          await this.emailService.sendClientReactivationEmail(
            emailToUse,
            client.nom
          );
          this.logger.log(`✅ Email de réactivation envoyé à ${emailToUse}`);
        }
      } catch (error) {
        this.logger.error(`Erreur lors de l'envoi de l'email: ${error.message}`);
      }
    }
  }

  /**
   * 📋 Récupérer tout le personnel
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le contexte de la requête
   */
  async getAllPersonnel(databaseName?: string, organisationId?: number): Promise<Personnel[]> {
    try {
      // Si databaseName est fourni, utiliser la connexion multi-tenant
      if (databaseName) {
        console.log(`🏢 [getAllPersonnel] Utilisation connexion multi-tenant: ${databaseName}, Org: ${organisationId}`);
        const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
        
        // ✅ CORRECTION: Ajouter le filtre organisation_id
        let query = `SELECT * FROM personnel`;
        const params: any[] = [];
        
        if (organisationId) {
          query += ` WHERE organisation_id = $1`;
          params.push(organisationId);
          console.log(`🔍 [getAllPersonnel] Requête SQL: ${query} avec params: [${params.join(', ')}]`);
        } else {
          console.warn(`⚠️ [getAllPersonnel] ATTENTION: organisationId est undefined/null, pas de filtre multi-tenant appliqué!`);
        }
        
        query += ` ORDER BY id DESC`;
        
        const personnel = await connection.query(query, params);
        console.log(`✅ [getAllPersonnel] ${personnel.length} personnel(s) trouvé(s) depuis ${databaseName} (Org: ${organisationId})`);
        console.log(`📋 [getAllPersonnel] IDs retournés:`, personnel.map(p => p.id).join(', '));
        return personnel;
      }
      
      // Sinon, utiliser le repository multi-tenant (récupère le databaseName du contexte)
      console.log('🔍 [getAllPersonnel] Utilisation tenantRepositoryService (contexte requête)');
      const personnelRepository = await this.tenantRepositoryService.getPersonnelRepository();
      const personnel = await personnelRepository.find({
        select: [
          'id',
          'nom',
          'prenom',
          'nom_utilisateur',
          'role',
          'telephone',
          'email',
          'statut',
          'photo',
          'genre',
          'created_at',
          'is_superviseur',
          'latitude',
          'longitude',
          'last_location_update',
          'location_accuracy',
          'location_source',
          'is_location_active',
          'location_tracking_enabled',
          'statut_en_ligne',
          'last_activity',
        ],
        order: { id: 'DESC' }
      });
      console.log(`✅ [getAllPersonnel] ${personnel.length} personnel(s) trouvé(s)`);
      return personnel;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du personnel: ${error.message}`);
      throw error;
    }
  }

  /**
   * 👥 Récupérer le personnel par rôle
   * ✅ MULTI-TENANT: Utilise databaseName depuis le contexte de la requête
   */
  async getPersonnelByRole(roles: string[], databaseName?: string): Promise<Personnel[]> {
    try {
      // Si databaseName est fourni, utiliser la connexion multi-tenant
      if (databaseName) {
        console.log(`🏢 [getPersonnelByRole] Utilisation connexion multi-tenant: ${databaseName}`);
        const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
        const placeholders = roles.map((_, i) => `$${i + 1}`).join(', ');
        const personnel = await connection.query(
          `SELECT * FROM personnel 
           WHERE LOWER(role) IN (${placeholders}) 
           ORDER BY nom, prenom`,
          roles.map(r => r.toLowerCase())
        );
        console.log(`✅ [getPersonnelByRole] ${personnel.length} personnel(s) trouvé(s) depuis ${databaseName}`);
        return personnel;
      }
      
      // Sinon, utiliser le repository multi-tenant (récupère le databaseName du contexte)
      console.log('🔍 [getPersonnelByRole] Utilisation tenantRepositoryService (contexte requête)');
      const personnelRepository = await this.tenantRepositoryService.getPersonnelRepository();
      const normalizedRoles = roles.map(r => r.toLowerCase());
      const personnel = await personnelRepository
        .createQueryBuilder('personnel')
        .where('LOWER(personnel.role) IN (:...roles)', { roles: normalizedRoles })
        .orderBy('personnel.nom', 'ASC')
        .addOrderBy('personnel.prenom', 'ASC')
        .getMany();
      console.log(`✅ [getPersonnelByRole] ${personnel.length} personnel(s) trouvé(s)`);
      return personnel;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du personnel par rôle: ${error.message}`);
      throw error;
    }
  }
}
