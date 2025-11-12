import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactClient } from '../entities/contact-client.entity';
import { Client } from '../entities/client.entity';
import { CreateContactClientDto, UpdateContactClientDto } from '../dto/contact-client.dto';

@Injectable()
export class ContactClientService {
  constructor(
    @InjectRepository(ContactClient)
    private contactClientRepository: Repository<ContactClient>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  async create(createContactClientDto: CreateContactClientDto): Promise<ContactClient> {
    const client = await this.clientRepository.findOne({
      where: { id: createContactClientDto.clientId }
    });

    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${createContactClientDto.clientId} non trouvé`);
    }

    // Si ce contact doit être principal, retirer le statut principal des autres contacts
    if (createContactClientDto.is_principal) {
      await this.removePrincipalStatus(createContactClientDto.clientId);
    }

    const contactClient = this.contactClientRepository.create({
      id_client: createContactClientDto.clientId,
      nom: createContactClientDto.nom,
      prenom: createContactClientDto.prenom,
      tel1: createContactClientDto.tel1,
      tel2: createContactClientDto.tel2,
      tel3: createContactClientDto.tel3,
      fax: createContactClientDto.fax,
      mail1: createContactClientDto.mail1,
      mail2: createContactClientDto.mail2,
      fonction: createContactClientDto.fonction,
      is_principal: createContactClientDto.is_principal || false,
      client,
    });

    return this.contactClientRepository.save(contactClient);
  }

  async findAll(): Promise<ContactClient[]> {
    return this.contactClientRepository.find({
      relations: ['client'],
      order: { id_client: 'DESC', is_principal: 'DESC', id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ContactClient> {
    const contactClient = await this.contactClientRepository.findOne({
      where: { id },
      relations: ['client'],
    });

    if (!contactClient) {
      throw new NotFoundException(`Contact client avec l'ID ${id} non trouvé`);
    }

    return contactClient;
  }

  async findByClient(clientId: number): Promise<ContactClient[]> {
    return this.contactClientRepository.find({
      where: { id_client: clientId },
      relations: ['client'],
      order: { is_principal: 'DESC', id: 'DESC' },
    });
  }

  async findPrincipalByClient(clientId: number): Promise<ContactClient | null> {
    return this.contactClientRepository.findOne({
      where: { id_client: clientId, is_principal: true },
      relations: ['client'],
    });
  }

  async findByEmail(email: string): Promise<ContactClient | null> {
    const contactClient = await this.contactClientRepository.findOne({
      where: [
        { mail1: email },
        { mail2: email }
      ],
      relations: ['client'],
    });

    return contactClient;
  }

  async update(id: number, updateContactClientDto: UpdateContactClientDto): Promise<ContactClient> {
    const contactClient = await this.findOne(id);

    // Si ce contact doit devenir principal, retirer le statut principal des autres contacts
    if (updateContactClientDto.is_principal && !contactClient.is_principal) {
      await this.removePrincipalStatus(contactClient.id_client, id);
    }

    if (updateContactClientDto.clientId && updateContactClientDto.clientId !== contactClient.id_client) {
      const client = await this.clientRepository.findOne({
        where: { id: updateContactClientDto.clientId }
      });

      if (!client) {
        throw new NotFoundException(`Client avec l'ID ${updateContactClientDto.clientId} non trouvé`);
      }

      contactClient.client = client;
      contactClient.id_client = updateContactClientDto.clientId;
    }

    // Mettre à jour les champs
    if (updateContactClientDto.nom !== undefined) contactClient.nom = updateContactClientDto.nom;
    if (updateContactClientDto.prenom !== undefined) contactClient.prenom = updateContactClientDto.prenom;
    if (updateContactClientDto.tel1 !== undefined) contactClient.tel1 = updateContactClientDto.tel1;
    if (updateContactClientDto.tel2 !== undefined) contactClient.tel2 = updateContactClientDto.tel2;
    if (updateContactClientDto.tel3 !== undefined) contactClient.tel3 = updateContactClientDto.tel3;
    if (updateContactClientDto.fax !== undefined) contactClient.fax = updateContactClientDto.fax;
    if (updateContactClientDto.mail1 !== undefined) contactClient.mail1 = updateContactClientDto.mail1;
    if (updateContactClientDto.mail2 !== undefined) contactClient.mail2 = updateContactClientDto.mail2;
    if (updateContactClientDto.fonction !== undefined) contactClient.fonction = updateContactClientDto.fonction;
    if (updateContactClientDto.is_principal !== undefined) contactClient.is_principal = updateContactClientDto.is_principal;

    return this.contactClientRepository.save(contactClient);
  }

  async remove(id: number): Promise<void> {
    const contactClient = await this.findOne(id);
    
    // Empêcher la suppression du contact principal s'il n'y a qu'un seul contact
    if (contactClient.is_principal) {
      const allContacts = await this.findByClient(contactClient.id_client);
      if (allContacts.length === 1) {
        throw new BadRequestException('Impossible de supprimer le seul contact du client. Le client doit avoir au moins un contact.');
      }
      
      // Si on supprime le contact principal et qu'il y a d'autres contacts,
      // promouvoir automatiquement le premier contact restant comme principal
      if (allContacts.length > 1) {
        const nextContact = allContacts.find(c => c.id !== id);
        if (nextContact) {
          nextContact.is_principal = true;
          await this.contactClientRepository.save(nextContact);
        }
      }
    }
    
    await this.contactClientRepository.remove(contactClient);
  }

  /**
   * Retire le statut principal de tous les contacts d'un client
   * sauf celui spécifié par exceptId (optionnel)
   */
  private async removePrincipalStatus(clientId: number, exceptId?: number): Promise<void> {
    const contacts = await this.findByClient(clientId);
    
    for (const contact of contacts) {
      if (contact.is_principal && contact.id !== exceptId) {
        contact.is_principal = false;
        await this.contactClientRepository.save(contact);
      }
    }
  }
}
