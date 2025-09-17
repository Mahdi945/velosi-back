import { Injectable, NotFoundException } from '@nestjs/common';
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

    const contactClient = this.contactClientRepository.create({
      id_client: createContactClientDto.clientId,
      tel1: createContactClientDto.tel1,
      tel2: createContactClientDto.tel2,
      tel3: createContactClientDto.tel3,
      fax: createContactClientDto.fax,
      mail1: createContactClientDto.mail1,
      mail2: createContactClientDto.mail2,
      fonction: createContactClientDto.fonction,
      client,
    });

    return this.contactClientRepository.save(contactClient);
  }

  async findAll(): Promise<ContactClient[]> {
    return this.contactClientRepository.find({
      relations: ['client'],
      order: { id_client: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ContactClient> {
    const contactClient = await this.contactClientRepository.findOne({
      where: { id_client: id },
      relations: ['client'],
    });

    if (!contactClient) {
      throw new NotFoundException(`Contact client avec l'ID ${id} non trouvé`);
    }

    return contactClient;
  }

  async findByClient(clientId: number): Promise<ContactClient[]> {
    return this.contactClientRepository.find({
      where: { client: { id: clientId } },
      relations: ['client'],
      order: { id_client: 'DESC' },
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

    if (updateContactClientDto.clientId && updateContactClientDto.clientId !== contactClient.client.id) {
      const client = await this.clientRepository.findOne({
        where: { id: updateContactClientDto.clientId }
      });

      if (!client) {
        throw new NotFoundException(`Client avec l'ID ${updateContactClientDto.clientId} non trouvé`);
      }

      contactClient.client = client;
    }

    Object.assign(contactClient, updateContactClientDto);
    return this.contactClientRepository.save(contactClient);
  }

  async remove(id: number): Promise<void> {
    const contactClient = await this.findOne(id);
    await this.contactClientRepository.remove(contactClient);
  }
}
