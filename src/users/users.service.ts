import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { ObjectifCom } from '../entities/objectif-com.entity';
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
    // Vérifier si le personnel existe déjà
    const existingPersonnel = await this.personnelRepository.findOne({
      where: { nom_utilisateur: createPersonnelDto.nom_utilisateur },
    });

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

    return savedPersonnel;
  }

  async getAllClients(): Promise<Client[]> {
    return this.clientRepository.find({
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

    // Vérifier l'unicité du nom d'utilisateur si modifié
    if (updateData.nom_utilisateur && updateData.nom_utilisateur !== existingPersonnel.nom_utilisateur) {
      const existingUser = await this.personnelRepository.findOne({
        where: { nom_utilisateur: updateData.nom_utilisateur }
      });

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

    // Synchroniser avec Keycloak si l'utilisateur a un keycloak_id
    if (updatedPersonnel.keycloak_id) {
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

        this.logger.log(`Utilisateur ${updatedPersonnel.nom_utilisateur} synchronisé avec Keycloak`);
      } catch (error) {
        this.logger.warn('Erreur lors de la synchronisation avec Keycloak:', error.message);
        // La mise à jour en base a réussi, on continue même si Keycloak échoue
      }
    }

    return updatedPersonnel;
  }

  async updateClientPassword(id: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const result = await this.clientRepository.update(id, {
      mot_de_passe: hashedPassword,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Client non trouvé');
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
}
