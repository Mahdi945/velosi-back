import {
  Injectable,
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

export interface CreateClientDto {
  nom: string;
  interlocuteur?: string;
  mot_de_passe: string;
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
  // Champs pour les objectifs commerciaux
  objectif_titre?: string;
  objectif_ca?: number;
  objectif_clients?: number;
  objectif_date_fin?: string;
  objectif_description?: string;
}

@Injectable()
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
  ) {}

  async createClient(createClientDto: CreateClientDto): Promise<Client> {
    // Vérifier si le client existe déjà
    const existingClient = await this.clientRepository.findOne({
      where: { nom: createClientDto.nom },
    });

    if (existingClient) {
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
        const existingPhoneClient = await this.clientRepository.createQueryBuilder('client')
          .leftJoin('client.contacts', 'contact')
          .where(`contact.${telFieldName} = :phone`, { phone: phoneValue })
          .getOne();

        if (existingPhoneClient) {
          throw new ConflictException(
            `Ce numéro de téléphone est déjà utilisé par un autre client`
          );
        }

        // Vérifier aussi dans la table du personnel
        const existingPhonePersonnel = await this.personnelRepository.findOne({
          where: { telephone: phoneValue },
        });

        if (existingPhonePersonnel) {
          throw new ConflictException(
            `Ce numéro de téléphone est déjà utilisé par un personnel`
          );
        }
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(createClientDto.mot_de_passe, 12);

    // Créer le client
    const client = this.clientRepository.create({
      ...createClientDto,
      mot_de_passe: hashedPassword,
      photo: 'uploads/profiles/default-avatar.png', // Assigner l'avatar par défaut
    });

    const savedClient = await this.clientRepository.save(client);

    // Créer l'utilisateur dans Keycloak seulement si activé
    try {
      if (this.configService.get('KEYCLOAK_ENABLED') === 'true') {
        // Keycloak est désactivé pour l'instant
        // const keycloakId = await this.keycloakService?.createUser?.({
        //   username: savedClient.nom,
        //   email:
        //     savedClient.email ||
        //     `${savedClient.nom.toLowerCase()}@client.velosi.com`,
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
        // }
      }
    } catch (error) {
      console.warn('Erreur lors de la création dans Keycloak:', error.message);
    }

    return savedClient;
  }

  async createPersonnel(
    createPersonnelDto: CreatePersonnelDto,
  ): Promise<Personnel> {
    // Vérifier si le personnel existe déjà - insensible à la casse
    const existingPersonnel = await this.personnelRepository
      .createQueryBuilder('personnel')
      .where('LOWER(personnel.nom_utilisateur) = LOWER(:username)', { 
        username: createPersonnelDto.nom_utilisateur 
      })
      .getOne();

    if (existingPersonnel) {
      throw new ConflictException(
        "Un utilisateur avec ce nom d'utilisateur existe déjà",
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

      const existingPhonePersonnel = await this.personnelRepository.findOne({
        where: { telephone: createPersonnelDto.telephone },
      });

      if (existingPhonePersonnel) {
        throw new ConflictException(
          'Ce numéro de téléphone est déjà utilisé par un autre personnel'
        );
      }

      // Vérifier aussi dans la table des contacts clients
      const existingPhoneClient = await this.clientRepository.createQueryBuilder('client')
        .leftJoin('client.contacts', 'contact')
        .where('contact.tel1 = :phone', { phone: createPersonnelDto.telephone })
        .orWhere('contact.tel2 = :phone', { phone: createPersonnelDto.telephone })
        .orWhere('contact.tel3 = :phone', { phone: createPersonnelDto.telephone })
        .getOne();

      if (existingPhoneClient) {
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
    const personnel = this.personnelRepository.create({
      ...createPersonnelDto,
      mot_de_passe: hashedPassword,
      photo: 'uploads/profiles/default-avatar.png', // Assigner l'avatar par défaut
    });

    const savedPersonnel = await this.personnelRepository.save(personnel);

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
        await this.personnelRepository.update(savedPersonnel.id, {
          keycloak_id: keycloakId,
        });
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
        const objectifCom = this.objectifComRepository.create({
          id_personnel: savedPersonnel.id,
          titre: createPersonnelDto.objectif_titre,
          description: createPersonnelDto.objectif_description || '',
          objectif_ca: createPersonnelDto.objectif_ca || 0,
          objectif_clients: createPersonnelDto.objectif_clients || 0,
          date_debut: new Date(),
          date_fin: createPersonnelDto.objectif_date_fin ? new Date(createPersonnelDto.objectif_date_fin) : null,
          statut: 'en_cours',
          progression: 0,
        });

        await this.objectifComRepository.save(objectifCom);
        this.logger.log(`Objectif commercial créé pour ${savedPersonnel.nom_utilisateur}: ${createPersonnelDto.objectif_titre}`);
      } catch (error) {
        this.logger.warn(`Erreur lors de la création de l'objectif commercial: ${error.message}`);
        // On continue même si la création d'objectif échoue
      }
    }

    // Envoyer l'email de bienvenue avec les informations de connexion
    if (savedPersonnel.email) {
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
    }

    return savedPersonnel;
  }

  async getAllClients(user?: any): Promise<any[]> {
    try {
      console.log('🔍 [getAllClients] Début de la récupération des clients...');
      console.log('👤 [getAllClients] Utilisateur connecté:', user?.username || user?.nom_utilisateur, 'Rôle:', user?.role);
      
      let query = this.clientRepository
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
          'client.keycloak_id',
          'contact.tel1',
          'contact.tel2',
          'contact.tel3',
          'contact.fax',
          'contact.mail1',
          'contact.mail2',
          'contact.fonction'
        ]);

      // Si l'utilisateur est commercial, filtrer par charge_com
      if (user && user.role === 'commercial') {
        const username = user.username || user.nom_utilisateur;
        console.log('🔒 [getAllClients] Filtrage commercial - charge_com:', username);
        query = query.where('client.charge_com = :chargecom', { 
          chargecom: username 
        });
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
          charge_com: client.charge_com // S'assurer que charge_com est présent
        };
        
        // Debug spécifique pour charge_com
        console.log(`   - charge_com BRUT: "${client.charge_com}"`);
        console.log(`   - charge_com MAPPÉ: "${mappedClient.charge_com}"`);
        
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

  async getAllPersonnel(): Promise<Personnel[]> {
    return this.personnelRepository.find({
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
      ],
    });
  }

  async getPersonnelByRole(roles: string[]): Promise<Personnel[]> {
    return this.personnelRepository.find({
      where: roles.map(role => ({ role })),
      select: [
        'id',
        'nom',
        'prenom',
        'nom_utilisateur',
        'role',
        'telephone',
        'email',
        'statut',
      ],
    });
  }

  async getClientWithContactData(clientId: number): Promise<any> {
    console.log(`🔍 [getClientWithContactData] Récupération client ID: ${clientId}`);
    
    try {
      const client = await this.clientRepository
        .createQueryBuilder('client')
        .leftJoinAndSelect('client.contacts', 'contact')
        .where('client.id = :id', { id: clientId })
        .getOne();

      if (!client) {
        throw new NotFoundException('Client non trouvé');
      }

      console.log(`📋 [getClientWithContactData] Client trouvé: ${client.nom}`);
      console.log(`📋 [getClientWithContactData] Charge commercial: ${client.charge_com}`);
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
        charge_com: client.charge_com // S'assurer que charge_com est bien inclus
      };

      console.log(`✅ [getClientWithContactData] Client mappé - charge_com: "${mappedClient.charge_com}"`);
      return mappedClient;

    } catch (error) {
      console.error(`❌ [getClientWithContactData] Erreur pour client ${clientId}:`, error);
      throw error;
    }
  }

  async getClientById(id: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      select: [
        'id',
        'nom',
        'interlocuteur',
        'adresse',
        'ville',
        'pays',
        'created_at',
        'blocage',
      ],
    });

    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }

    return client;
  }

  async updateClient(id: number, updateClientDto: UpdateClientDto): Promise<Client> {
    // Vérifier que le client existe
    const existingClient = await this.clientRepository.findOne({
      where: { id }
    });

    if (!existingClient) {
      throw new NotFoundException('Client non trouvé');
    }

    console.log('🔄 [updateClient] Mise à jour du client ID:', id);
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

      console.log('🔄 [updateClient] Données client nettoyées à mettre à jour:', cleanedClientData);

      // Mettre à jour le client
      await this.clientRepository.update(id, cleanedClientData);

      // Préparer les données de contact
      const contactData = {
        tel1: tel1 || null,
        tel2: tel2 || null,
        tel3: tel3 || null,
        fax: fax || null,
        mail1: email || mail1 || null, // Utiliser email ou mail1
        mail2: mail2 || null,
      };

      console.log('🔄 [updateClient] Données contact à mettre à jour:', contactData);

      // Mettre à jour ou créer le contact
      // Vérifier si un contact existe déjà
      const existingContact = await this.contactClientRepository.findOne({
        where: { id_client: id }
      });

      if (existingContact) {
        // Mettre à jour le contact existant
        await this.contactClientRepository.update({ id_client: id }, contactData);
        console.log('✅ [updateClient] Contact mis à jour');
      } else {
        // Créer un nouveau contact
        await this.contactClientRepository.save({
          id_client: id,
          ...contactData
        });
        console.log('✅ [updateClient] Contact créé');
      }

      // Récupérer le client mis à jour
      const updatedClient = await this.clientRepository.findOne({
        where: { id }
      });

      console.log('✅ [updateClient] Client mis à jour avec succès:', updatedClient?.nom);
      return updatedClient!;

    } catch (error) {
      console.error('❌ [updateClient] Erreur lors de la mise à jour:', error);
      throw new Error(`Impossible de mettre à jour le client: ${error.message}`);
    }
  }

  async getPersonnelById(id: number): Promise<Personnel> {
    const personnel = await this.personnelRepository.findOne({
      where: { id },
      select: [
        'id',
        'nom',
        'prenom',
        'nom_utilisateur',
        'role',
        'telephone',
        'email',
        'statut',
        'created_at',
      ],
    });

    if (!personnel) {
      throw new NotFoundException('Personnel non trouvé');
    }

    return personnel;
  }

  async updatePersonnel(id: number, updateData: Partial<CreatePersonnelDto>): Promise<Personnel> {
    // Vérifier que le personnel existe
    const existingPersonnel = await this.personnelRepository.findOne({
      where: { id }
    });

    if (!existingPersonnel) {
      throw new NotFoundException('Personnel non trouvé');
    }

    // Vérifier l'unicité du nom d'utilisateur si modifié - insensible à la casse
    if (updateData.nom_utilisateur && updateData.nom_utilisateur.toLowerCase() !== existingPersonnel.nom_utilisateur.toLowerCase()) {
      const existingUser = await this.personnelRepository
        .createQueryBuilder('personnel')
        .where('LOWER(personnel.nom_utilisateur) = LOWER(:username)', { 
          username: updateData.nom_utilisateur 
        })
        .getOne();

      if (existingUser) {
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

      const existingPhonePersonnel = await this.personnelRepository.findOne({
        where: { telephone: updateData.telephone },
      });

      if (existingPhonePersonnel && existingPhonePersonnel.id !== id) {
        throw new ConflictException(
          'Ce numéro de téléphone est déjà utilisé par un autre personnel'
        );
      }

      // Vérifier aussi dans la table des contacts clients
      const existingPhoneClient = await this.clientRepository.createQueryBuilder('client')
        .leftJoin('client.contacts', 'contact')
        .where('contact.tel1 = :phone', { phone: updateData.telephone })
        .orWhere('contact.tel2 = :phone', { phone: updateData.telephone })
        .orWhere('contact.tel3 = :phone', { phone: updateData.telephone })
        .getOne();

      if (existingPhoneClient) {
        throw new ConflictException(
          'Ce numéro de téléphone est déjà utilisé par un client'
        );
      }
    }

    // Préparer les données de mise à jour
    const updateFields: Partial<Personnel> = {};
    
    if (updateData.nom) updateFields.nom = updateData.nom;
    if (updateData.prenom) updateFields.prenom = updateData.prenom;
    if (updateData.nom_utilisateur) updateFields.nom_utilisateur = updateData.nom_utilisateur;
    if (updateData.role) updateFields.role = updateData.role;
    if (updateData.telephone) updateFields.telephone = updateData.telephone;
    if (updateData.email) updateFields.email = updateData.email;
    if (updateData.genre) updateFields.genre = updateData.genre;
    if (updateData.statut) updateFields.statut = updateData.statut;

    // Effectuer la mise à jour
    await this.personnelRepository.update(id, updateFields);

    // Récupérer le personnel mis à jour
    const updatedPersonnel = await this.getPersonnelById(id);

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
          await this.personnelRepository.update(id, { keycloak_id: keycloakId });
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

        // Vérifier immédiatement que les changements ont été appliqués
        await new Promise(resolve => setTimeout(resolve, 500)); // Attendre 500ms
        
        // TODO: Implémenter getUserById dans KeycloakService
        // const verificationUser = await this.keycloakService.getUserById(updatedPersonnel.keycloak_id);
        // if (verificationUser) {
        //   this.logger.log(`✅ Vérification Keycloak réussie pour ${updatedPersonnel.nom_utilisateur}:`);
        //   this.logger.log(`   - Email: ${verificationUser.email}`);
        //   this.logger.log(`   - FirstName: ${verificationUser.firstName}`);
        //   this.logger.log(`   - LastName: ${verificationUser.lastName}`);
        //   this.logger.log(`   - Enabled: ${verificationUser.enabled}`);
        // }
        
        this.logger.log(`Utilisateur ${updatedPersonnel.nom_utilisateur} synchronisé avec Keycloak`);
      } catch (error) {
        this.logger.warn('Erreur lors de la synchronisation avec Keycloak:', error.message);
        // La mise à jour en base a réussi, on continue même si Keycloak échoue
      }
    }

    return updatedPersonnel;
  }

  async updateClientPassword(id: number, newPassword: string): Promise<void> {
    // Récupérer l'utilisateur pour obtenir le keycloak_id
    const client = await this.clientRepository.findOne({ where: { id } });
    
    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }

    // Mettre à jour le mot de passe en base
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const result = await this.clientRepository.update(id, {
      mot_de_passe: hashedPassword,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Client non trouvé');
    }

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

  async updatePersonnelPassword(
    id: number,
    newPassword: string,
  ): Promise<void> {
    // Récupérer l'utilisateur pour obtenir le keycloak_id
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    
    if (!personnel) {
      throw new NotFoundException('Personnel non trouvé');
    }

    // Mettre à jour le mot de passe en base
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const result = await this.personnelRepository.update(id, {
      mot_de_passe: hashedPassword,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }

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

  async blockClient(id: number): Promise<void> {
    const result = await this.clientRepository.update(id, { blocage: true });

    if (result.affected === 0) {
      throw new NotFoundException('Client non trouvé');
    }
  }

  async unblockClient(id: number): Promise<void> {
    const result = await this.clientRepository.update(id, { blocage: false });

    if (result.affected === 0) {
      throw new NotFoundException('Client non trouvé');
    }
  }

  async deactivatePersonnel(id: number, reason?: string): Promise<void> {
    // Récupérer les informations du personnel avant désactivation
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    if (!personnel) {
      throw new NotFoundException('Personnel non trouvé');
    }

    // Mettre à jour le statut
    const result = await this.personnelRepository.update(id, {
      statut: 'inactif',
    });

    if (result.affected === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }

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

  async suspendPersonnel(id: number, reason?: string): Promise<void> {
    // Récupérer les informations du personnel avant suspension
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    if (!personnel) {
      throw new NotFoundException('Personnel non trouvé');
    }

    // Mettre à jour le statut
    const result = await this.personnelRepository.update(id, {
      statut: 'suspendu',
    });

    if (result.affected === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }

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

  async activatePersonnel(id: number): Promise<void> {
    // Récupérer les informations du personnel
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    if (!personnel) {
      throw new NotFoundException('Personnel non trouvé');
    }

    const result = await this.personnelRepository.update(id, {
      statut: 'actif',
    });

    if (result.affected === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }

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

  async reactivatePersonnel(id: number): Promise<void> {
    // Récupérer les informations du personnel avant réactivation
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    if (!personnel) {
      throw new NotFoundException('Personnel non trouvé');
    }

    // Mettre à jour le statut
    const result = await this.personnelRepository.update(id, {
      statut: 'actif',
    });

    if (result.affected === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }

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

  async deletePersonnel(id: number, reason?: string): Promise<void> {
    // Récupérer les informations du personnel avant suppression
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    if (!personnel) {
      throw new NotFoundException('Personnel non trouvé');
    }

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
      await this.objectifComRepository.delete({ id_personnel: id });
      this.logger.log(`Objectifs commerciaux supprimés pour le personnel ${id}`);
    } catch (error) {
      this.logger.warn(`Erreur suppression objectifs pour personnel ${id}:`, error.message);
    }

    // Supprimer le personnel de la base de données
    const result = await this.personnelRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Personnel non trouvé pour suppression');
    }

    this.logger.log(`Personnel ${personnel.nom_utilisateur} supprimé avec succès`);
  }

  // Obtenir l'activité d'un personnel depuis Keycloak
  async getPersonnelActivity(id: number): Promise<any> {
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    if (!personnel) {
      throw new NotFoundException('Personnel non trouvé');
    }

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

  // Obtenir les sessions actives d'un personnel
  async getPersonnelSessions(id: number): Promise<any> {
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    if (!personnel) {
      throw new NotFoundException('Personnel non trouvé');
    }

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

  // Déconnecter toutes les sessions d'un personnel
  async logoutAllPersonnelSessions(id: number): Promise<any> {
    const personnel = await this.personnelRepository.findOne({ where: { id } });
    if (!personnel) {
      throw new NotFoundException('Personnel non trouvé');
    }

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

  async deactivateClient(id: number, statut: string, motif: string, notifyByEmail: boolean): Promise<void> {
    // Récupérer les informations du client avec ses contacts
    const client = await this.clientRepository.findOne({ 
      where: { id },
      relations: ['contacts']
    });
    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }

    // Log de débogage pour vérifier les contacts
    this.logger.log(`🔍 Client trouvé: ${client.nom}, Nombre de contacts: ${client.contacts?.length || 0}`);
    if (client.contacts && client.contacts.length > 0) {
      client.contacts.forEach((contact, index) => {
        this.logger.log(`📧 Contact ${index + 1}: mail1=${contact.mail1}, mail2=${contact.mail2}`);
      });
    }

    // Mettre à jour le statut
    const result = await this.clientRepository.update(id, {
      statut: statut, // 'desactive' ou 'suspendu'
    });

    if (result.affected === 0) {
      throw new NotFoundException('Client non trouvé');
    }

    // Envoyer un email de notification (toujours activé)
    try {
      // Priorité à mail1 de la table contact_client
      let emailToUse = null;
      
      // 1. Chercher d'abord dans les contacts (priorité)
      if (client.contacts && client.contacts.length > 0) {
        const contact = client.contacts[0]; // Prendre le premier contact
        emailToUse = contact.mail1 || contact.mail2;
        this.logger.log(`Email trouvé dans contact_client: ${emailToUse} pour client ${client.nom}`);
      }
      
      // 2. Fallback sur client.email si pas d'email dans les contacts
      if (!emailToUse && client.email) {
        emailToUse = client.email;
        this.logger.log(`Email trouvé dans client: ${emailToUse} pour client ${client.nom}`);
      }

      if (emailToUse) {
        this.logger.log(`Tentative d'envoi d'email de ${statut} à ${emailToUse} pour client ${client.nom}`);
        
        const emailSent = await this.emailService.sendClientDeactivationEmail(
          emailToUse,
          client.nom,
          statut as 'desactive' | 'suspendu',
          motif
        );
        
        if (emailSent) {
          this.logger.log(`✅ Email de notification envoyé avec succès à ${emailToUse} pour ${statut} du client ${client.nom}`);
        } else {
          this.logger.error(`❌ Échec de l'envoi de l'email de notification à ${emailToUse}`);
        }
      } else {
        this.logger.error(`❌ Aucun email trouvé pour le client ${client.nom} (ID: ${id}) - Vérifiez la table contact_client`);
      }
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email de notification: ${error.message}`, error.stack);
    }

    this.logger.log(`Client ${client.nom} ${statut === 'desactive' ? 'désactivé' : 'suspendu'}. Motif: ${motif}`);
  }

  async reactivateClient(id: number, notifyByEmail: boolean): Promise<void> {
    // Récupérer les informations du client avec ses contacts
    const client = await this.clientRepository.findOne({ 
      where: { id },
      relations: ['contacts']
    });
    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }

    // Log de débogage pour vérifier les contacts
    this.logger.log(`🔍 Client trouvé: ${client.nom}, Nombre de contacts: ${client.contacts?.length || 0}`);
    if (client.contacts && client.contacts.length > 0) {
      client.contacts.forEach((contact, index) => {
        this.logger.log(`📧 Contact ${index + 1}: mail1=${contact.mail1}, mail2=${contact.mail2}`);
      });
    }

    // Mettre à jour le statut
    const result = await this.clientRepository.update(id, {
      statut: 'actif',
    });

    if (result.affected === 0) {
      throw new NotFoundException('Client non trouvé');
    }

    // Envoyer un email de notification (toujours activé)
    try {
      // Priorité à mail1 de la table contact_client
      let emailToUse = null;
      
      // 1. Chercher d'abord dans les contacts (priorité)
      if (client.contacts && client.contacts.length > 0) {
        const contact = client.contacts[0]; // Prendre le premier contact
        emailToUse = contact.mail1 || contact.mail2;
        this.logger.log(`Email trouvé dans contact_client: ${emailToUse} pour client ${client.nom}`);
      }
      
      // 2. Fallback sur client.email si pas d'email dans les contacts
      if (!emailToUse && client.email) {
        emailToUse = client.email;
        this.logger.log(`Email trouvé dans client: ${emailToUse} pour client ${client.nom}`);
      }

      if (emailToUse) {
        this.logger.log(`Tentative d'envoi d'email de réactivation à ${emailToUse} pour client ${client.nom}`);
        
        const emailSent = await this.emailService.sendClientReactivationEmail(
          emailToUse,
          client.nom
        );
        
        if (emailSent) {
          this.logger.log(`✅ Email de réactivation envoyé avec succès à ${emailToUse} pour le client ${client.nom}`);
        } else {
          this.logger.error(`❌ Échec de l'envoi de l'email de réactivation à ${emailToUse}`);
        }
      } else {
        this.logger.error(`❌ Aucun email trouvé pour le client ${client.nom} (ID: ${id}) - Vérifiez la table contact_client`);
      }
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email de réactivation: ${error.message}`, error.stack);
    }

    this.logger.log(`Client ${client.nom} réactivé avec succès`);
  }
}
