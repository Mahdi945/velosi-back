import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { KeycloakService } from '../auth/keycloak.service';

export interface CreateClientDto {
  nom: string;
  interlocuteur?: string;
  mot_de_passe: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  code_postal?: string;
  type_client?: string;
}

export interface CreatePersonnelDto {
  nom: string;
  prenom: string;
  nom_utilisateur: string;
  role: string;
  mot_de_passe: string;
  telephone?: string;
  email?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    private keycloakService: KeycloakService,
    private configService: ConfigService,
  ) {}

  async createClient(createClientDto: CreateClientDto): Promise<Client> {
    // Vérifier si le client existe déjà
    const existingClient = await this.clientRepository.findOne({
      where: { nom: createClientDto.nom },
    });

    if (existingClient) {
      throw new ConflictException('Un client avec ce nom existe déjà');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(createClientDto.mot_de_passe, 12);

    // Créer le client
    const client = this.clientRepository.create({
      ...createClientDto,
      mot_de_passe: hashedPassword,
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

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(
      createPersonnelDto.mot_de_passe,
      12,
    );

    // Créer le personnel
    const personnel = this.personnelRepository.create({
      ...createPersonnelDto,
      mot_de_passe: hashedPassword,
    });

    const savedPersonnel = await this.personnelRepository.save(personnel);

    // Créer l'utilisateur dans Keycloak seulement si activé
    try {
      if (this.configService.get('KEYCLOAK_ENABLED') === 'true') {
        // Keycloak est désactivé pour l'instant
        // const keycloakId = await this.keycloakService?.createUser?.({
        //   username: savedPersonnel.nom_utilisateur,
        //   email:
        //     savedPersonnel.email ||
        //     `${savedPersonnel.nom_utilisateur}@velosi.com`,
        //   firstName: savedPersonnel.prenom,
        //   lastName: savedPersonnel.nom,
        //   enabled: true,
        // });
        // // Mettre à jour l'ID Keycloak
        // if (keycloakId) {
        //   await this.personnelRepository.update(savedPersonnel.id, {
        //     keycloak_id: keycloakId,
        //   });
        //   savedPersonnel.keycloak_id = keycloakId;
        // }
      }
    } catch (error) {
      console.warn('Erreur lors de la création dans Keycloak:', error.message);
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
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const result = await this.personnelRepository.update(id, {
      mot_de_passe: hashedPassword,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Personnel non trouvé');
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

  async deactivatePersonnel(id: number): Promise<void> {
    const result = await this.personnelRepository.update(id, {
      statut: 'inactif',
    });

    if (result.affected === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }
  }

  async activatePersonnel(id: number): Promise<void> {
    const result = await this.personnelRepository.update(id, {
      statut: 'actif',
    });

    if (result.affected === 0) {
      throw new NotFoundException('Personnel non trouvé');
    }
  }
}
