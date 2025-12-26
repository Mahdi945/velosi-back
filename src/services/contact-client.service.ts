import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ContactClient } from '../entities/contact-client.entity';
import { CreateContactClientDto, UpdateContactClientDto } from '../dto/contact-client.dto';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable()
export class ContactClientService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Créer un contact client
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async create(databaseName: string, createContactClientDto: CreateContactClientDto): Promise<ContactClient> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Vérifier que le client existe
    const client = await connection.query(
      `SELECT * FROM client WHERE id = $1 LIMIT 1`,
      [createContactClientDto.clientId]
    );

    if (!client || client.length === 0) {
      throw new NotFoundException(`Client avec l'ID ${createContactClientDto.clientId} non trouvé`);
    }

    // Si ce contact doit être principal, retirer le statut principal des autres contacts
    if (createContactClientDto.is_principal) {
      await this.removePrincipalStatus(databaseName, createContactClientDto.clientId);
    }

    const result = await connection.query(
      `INSERT INTO contact_client (id_client, nom, prenom, tel1, tel2, tel3, fax, mail1, mail2, fonction, is_principal, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`,
      [
        createContactClientDto.clientId,
        createContactClientDto.nom,
        createContactClientDto.prenom || null,
        createContactClientDto.tel1 || null,
        createContactClientDto.tel2 || null,
        createContactClientDto.tel3 || null,
        createContactClientDto.fax || null,
        createContactClientDto.mail1 || null,
        createContactClientDto.mail2 || null,
        createContactClientDto.fonction || null,
        createContactClientDto.is_principal || false,
      ]
    );

    return result[0];
  }

  /**
   * Récupérer tous les contacts clients
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAll(databaseName: string): Promise<ContactClient[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    return await connection.query(
      `SELECT cc.*, c.id as client_id, c.nom as client_nom
       FROM contact_client cc
       LEFT JOIN client c ON cc.id_client = c.id
       ORDER BY cc.id_client DESC, cc.is_principal DESC, cc.id DESC`
    );
  }

  /**
   * Récupérer un contact client par ID
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findOne(databaseName: string, id: number): Promise<ContactClient> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `SELECT cc.*, c.id as client_id, c.nom as client_nom
       FROM contact_client cc
       LEFT JOIN client c ON cc.id_client = c.id
       WHERE cc.id = $1`,
      [id]
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`Contact client avec l'ID ${id} non trouvé`);
    }

    return result[0];
  }

  /**
   * Récupérer les contacts d'un client
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findByClient(databaseName: string, clientId: number): Promise<ContactClient[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    return await connection.query(
      `SELECT cc.*, c.id as client_id, c.nom as client_nom
       FROM contact_client cc
       LEFT JOIN client c ON cc.id_client = c.id
       WHERE cc.id_client = $1
       ORDER BY cc.is_principal DESC, cc.id DESC`,
      [clientId]
    );
  }

  /**
   * Récupérer le contact principal d'un client
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findPrincipalByClient(databaseName: string, clientId: number): Promise<ContactClient | null> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `SELECT cc.*, c.id as client_id, c.nom as client_nom
       FROM contact_client cc
       LEFT JOIN client c ON cc.id_client = c.id
       WHERE cc.id_client = $1 AND cc.is_principal = true
       LIMIT 1`,
      [clientId]
    );

    return result && result.length > 0 ? result[0] : null;
  }

  /**
   * Rechercher un contact par email
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findByEmail(databaseName: string, email: string): Promise<ContactClient | null> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `SELECT cc.*, c.id as client_id, c.nom as client_nom
       FROM contact_client cc
       LEFT JOIN client c ON cc.id_client = c.id
       WHERE cc.mail1 = $1 OR cc.mail2 = $1
       LIMIT 1`,
      [email]
    );

    return result && result.length > 0 ? result[0] : null;
  }

  /**
   * Mettre à jour un contact client
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async update(databaseName: string, id: number, updateContactClientDto: UpdateContactClientDto): Promise<ContactClient> {
    const contactClient = await this.findOne(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Si ce contact doit devenir principal, retirer le statut principal des autres contacts
    if (updateContactClientDto.is_principal && !contactClient.is_principal) {
      await this.removePrincipalStatus(databaseName, contactClient.id_client, id);
    }

    // Si le client change, vérifier qu'il existe
    if (updateContactClientDto.clientId && updateContactClientDto.clientId !== contactClient.id_client) {
      const client = await connection.query(
        `SELECT * FROM client WHERE id = $1 LIMIT 1`,
        [updateContactClientDto.clientId]
      );

      if (!client || client.length === 0) {
        throw new NotFoundException(`Client avec l'ID ${updateContactClientDto.clientId} non trouvé`);
      }
    }

    await connection.query(
      `UPDATE contact_client 
       SET id_client = $1, nom = $2, prenom = $3, tel1 = $4, tel2 = $5, tel3 = $6, 
           fax = $7, mail1 = $8, mail2 = $9, fonction = $10, is_principal = $11, updated_at = NOW()
       WHERE id = $12`,
      [
        updateContactClientDto.clientId !== undefined ? updateContactClientDto.clientId : contactClient.id_client,
        updateContactClientDto.nom !== undefined ? updateContactClientDto.nom : contactClient.nom,
        updateContactClientDto.prenom !== undefined ? updateContactClientDto.prenom : contactClient.prenom,
        updateContactClientDto.tel1 !== undefined ? updateContactClientDto.tel1 : contactClient.tel1,
        updateContactClientDto.tel2 !== undefined ? updateContactClientDto.tel2 : contactClient.tel2,
        updateContactClientDto.tel3 !== undefined ? updateContactClientDto.tel3 : contactClient.tel3,
        updateContactClientDto.fax !== undefined ? updateContactClientDto.fax : contactClient.fax,
        updateContactClientDto.mail1 !== undefined ? updateContactClientDto.mail1 : contactClient.mail1,
        updateContactClientDto.mail2 !== undefined ? updateContactClientDto.mail2 : contactClient.mail2,
        updateContactClientDto.fonction !== undefined ? updateContactClientDto.fonction : contactClient.fonction,
        updateContactClientDto.is_principal !== undefined ? updateContactClientDto.is_principal : contactClient.is_principal,
        id,
      ]
    );

    return this.findOne(databaseName, id);
  }

  /**
   * Supprimer un contact client
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async remove(databaseName: string, id: number): Promise<void> {
    const contactClient = await this.findOne(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Empêcher la suppression du contact principal s'il n'y a qu'un seul contact
    if (contactClient.is_principal) {
      const allContacts = await this.findByClient(databaseName, contactClient.id_client);
      if (allContacts.length === 1) {
        throw new BadRequestException('Impossible de supprimer le seul contact du client. Le client doit avoir au moins un contact.');
      }
      
      // Si on supprime le contact principal et qu'il y a d'autres contacts,
      // promouvoir automatiquement le premier contact restant comme principal
      if (allContacts.length > 1) {
        const nextContact = allContacts.find(c => c.id !== id);
        if (nextContact) {
          await connection.query(
            `UPDATE contact_client SET is_principal = true, updated_at = NOW() WHERE id = $1`,
            [nextContact.id]
          );
        }
      }
    }
    
    await connection.query(`DELETE FROM contact_client WHERE id = $1`, [id]);
  }

  /**
   * Retire le statut principal de tous les contacts d'un client
   * sauf celui spécifié par exceptId (optionnel)
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  private async removePrincipalStatus(databaseName: string, clientId: number, exceptId?: number): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    if (exceptId) {
      await connection.query(
        `UPDATE contact_client SET is_principal = false, updated_at = NOW() 
         WHERE id_client = $1 AND is_principal = true AND id != $2`,
        [clientId, exceptId]
      );
    } else {
      await connection.query(
        `UPDATE contact_client SET is_principal = false, updated_at = NOW() 
         WHERE id_client = $1 AND is_principal = true`,
        [clientId]
      );
    }
  }
}
