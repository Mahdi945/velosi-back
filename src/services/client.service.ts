import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client, EtatFiscal } from '../entities/client.entity';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';
import { AutorisationTVAService } from './autorisation-tva.service';
import * as crypto from 'crypto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly autorisationTVAService: AutorisationTVAService,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    // Vérifier si un client existe déjà avec le même nom
    const existingClient = await this.clientRepository.findOne({
      where: { nom: createClientDto.nom },
    });

    if (existingClient) {
      throw new ConflictException(`Un client avec le nom "${createClientDto.nom}" existe déjà`);
    }

    // Hash du mot de passe
    const hashedPassword = crypto.createHash('sha256').update(createClientDto.mot_de_passe).digest('hex');

    const client = this.clientRepository.create({
      ...createClientDto,
      mot_de_passe: hashedPassword,
      etat_fiscal: createClientDto.etat_fiscal || EtatFiscal.ASSUJETTI_TVA,
      date_auto: createClientDto.date_auto ? new Date(createClientDto.date_auto) : null,
      date_fin: createClientDto.date_fin ? new Date(createClientDto.date_fin) : null,
    });

    const savedClient = await this.clientRepository.save(client);

    // Si l'état fiscal est en suspension TVA, valider la cohérence
    if (savedClient.etat_fiscal === EtatFiscal.SUSPENSION_TVA) {
      await this.validateClientTVACoherence(savedClient.id);
    }

    return savedClient;
  }

  async findAll(): Promise<Client[]> {
    return await this.clientRepository.find({
      relations: ['contacts', 'autorisationsTVA', 'suspensionsTVA'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['contacts', 'autorisationsTVA', 'suspensionsTVA'],
    });

    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${id} non trouvé`);
    }

    return client;
  }

  async update(id: number, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);

    // Si l'état fiscal change, valider la cohérence
    const oldEtatFiscal = client.etat_fiscal;
    const newEtatFiscal = updateClientDto.etat_fiscal;

    const updateData = {
      ...updateClientDto,
      date_auto: updateClientDto.date_auto ? new Date(updateClientDto.date_auto) : client.date_auto,
      date_fin: updateClientDto.date_fin ? new Date(updateClientDto.date_fin) : client.date_fin,
    };

    await this.clientRepository.update(id, updateData);
    const updatedClient = await this.findOne(id);

    // Validation post-mise à jour si l'état fiscal a changé
    if (newEtatFiscal && newEtatFiscal !== oldEtatFiscal) {
      await this.validateClientTVACoherence(id);
    }

    return updatedClient;
  }

  async remove(id: number): Promise<void> {
    const client = await this.findOne(id);
    
    // Soft delete en désactivant le client
    await this.clientRepository.update(id, { 
      statut: 'inactif',
      auto_delete: true 
    });
  }

  async updateEtatFiscal(id: number, nouvelEtat: EtatFiscal): Promise<Client> {
    const client = await this.findOne(id);

    // Validation avant changement d'état
    if (nouvelEtat === EtatFiscal.SUSPENSION_TVA) {
      const tvaStatus = await this.autorisationTVAService.getClientTVAStatus(client.id);
      if (!tvaStatus.hasValidAutorisations) {
        throw new BadRequestException(
          'Impossible de passer en suspension TVA sans autorisation TVA valide'
        );
      }
    }

    await this.clientRepository.update(id, { etat_fiscal: nouvelEtat });
    return await this.findOne(id);
  }

  async getClientsTVAStatus(): Promise<{
    total: number;
    assujettis: number;
    suspensions: number;
    exoneres: number;
    clientsAvecProblemes: Client[];
  }> {
    const clients = await this.findAll();
    
    const stats = {
      total: clients.length,
      assujettis: clients.filter(c => c.etat_fiscal === EtatFiscal.ASSUJETTI_TVA).length,
      suspensions: clients.filter(c => c.etat_fiscal === EtatFiscal.SUSPENSION_TVA).length,
      exoneres: clients.filter(c => c.etat_fiscal === EtatFiscal.EXONERE).length,
      clientsAvecProblemes: [] as Client[],
    };

    // Identifier les clients avec des problèmes de cohérence
    for (const client of clients) {
      const validation = client.validateEtatFiscal();
      if (!validation.isValid) {
        stats.clientsAvecProblemes.push(client);
      }
    }

    return stats;
  }

  async validateClientTVACoherence(clientId: number): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const client = await this.findOne(clientId);
    
    if (!client.id) {
      return {
        isValid: false,
        errors: ['Client invalide'],
        warnings: [],
      };
    }

    return await this.autorisationTVAService.validateClientTVACoherence(client.id);
  }

  async findClientsByAutorisationStatus(hasValidAutorisations: boolean): Promise<Client[]> {
    const clients = await this.findAll();
    const filteredClients: Client[] = [];

    for (const client of clients) {
      if (client.id) {
        try {
          const tvaStatus = await this.autorisationTVAService.getClientTVAStatus(client.id);
          if (tvaStatus.hasValidAutorisations === hasValidAutorisations) {
            filteredClients.push(client);
          }
        } catch (error) {
          // Ignorer les erreurs de clients non trouvés
        }
      }
    }

    return filteredClients;
  }

  async findClientsWithExpiredDocuments(): Promise<{
    clientsWithExpiredAutorisations: Client[];
    clientsWithExpiredSuspensions: Client[];
  }> {
    const clients = await this.findAll();
    const result = {
      clientsWithExpiredAutorisations: [] as Client[],
      clientsWithExpiredSuspensions: [] as Client[],
    };

    for (const client of clients) {
      if (client.id) {
        try {
          const tvaStatus = await this.autorisationTVAService.getClientTVAStatus(client.id);
          
          // Vérifier les autorisations expirées
          const hasExpiredAutorisations = tvaStatus.autorisations.some(auth => auth.isExpired);
          if (hasExpiredAutorisations) {
            result.clientsWithExpiredAutorisations.push(client);
          }

          // Vérifier les bons de commande expirés
          const hasExpiredBonsCommande = tvaStatus.bonsCommande.some(bc => 
            bc.statut === 'EXPIRE' || !bc.is_active
          );
          if (hasExpiredBonsCommande) {
            result.clientsWithExpiredSuspensions.push(client);
          }
        } catch (error) {
          // Ignorer les erreurs de clients non trouvés
        }
      }
    }

    return result;
  }

  async updatePhoto(id: number, photoPath: string): Promise<Client> {
    const client = await this.findOne(id);
    await this.clientRepository.update(id, { photo: photoPath });
    return await this.findOne(id);
  }

  async changePassword(id: number, newPassword: string): Promise<Client> {
    const client = await this.findOne(id);
    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
    
    await this.clientRepository.update(id, { 
      mot_de_passe: hashedPassword,
      first_login: false 
    });
    
    return await this.findOne(id);
  }

  // Méthode supprimée - plus besoin de générer un code client
}