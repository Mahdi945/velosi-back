import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client, EtatFiscal } from '../entities/client.entity';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';
import { AutorisationTVAService } from './autorisation-tva.service';
import { KeycloakService } from '../auth/keycloak.service';
import { EmailService } from './email.service';
import * as crypto from 'crypto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly autorisationTVAService: AutorisationTVAService,
    private readonly keycloakService: KeycloakService,
    private readonly emailService: EmailService,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    // Vérifier si un client existe déjà avec le même nom
    const existingClient = await this.clientRepository.findOne({
      where: { nom: createClientDto.nom },
    });

    if (existingClient) {
      throw new ConflictException(`Un client avec le nom "${createClientDto.nom}" existe déjà`);
    }

    // Gestion du mot de passe selon le type de client
    let hashedPassword: string | null = null;
    
    if (createClientDto.is_permanent && createClientDto.mot_de_passe) {
      // Client permanent : hacher le mot de passe pour Keycloak
      hashedPassword = crypto.createHash('sha256').update(createClientDto.mot_de_passe).digest('hex');
    } else if (!createClientDto.is_permanent) {
      // Client temporaire : mot de passe reste null
      hashedPassword = null;
    }

    // Debug: Analyser les valeurs booléennes reçues
    console.log('🔍 SERVICE - Valeurs booléennes reçues dans createClientDto:');
    console.log(`  - is_permanent: [${createClientDto.is_permanent}] (${typeof createClientDto.is_permanent})`);
    console.log(`  - maj_web: [${createClientDto.maj_web}] (${typeof createClientDto.maj_web})`);
    console.log(`  - stop_envoie_solde: [${createClientDto.stop_envoie_solde}] (${typeof createClientDto.stop_envoie_solde})`);
    console.log(`  - timbre: [${createClientDto.timbre}] (${typeof createClientDto.timbre})`);

    const client = this.clientRepository.create({
      ...createClientDto,
      mot_de_passe: hashedPassword,
      etat_fiscal: createClientDto.etat_fiscal || EtatFiscal.ASSUJETTI_TVA,
      date_auto: createClientDto.date_auto ? new Date(createClientDto.date_auto) : null,
      date_fin: createClientDto.date_fin ? new Date(createClientDto.date_fin) : null,
      // S'assurer explicitement que is_permanent est bien traité
      is_permanent: Boolean(createClientDto.is_permanent || false),
    });

    // Debug: Vérifier l'objet client créé
    console.log('🔍 SERVICE - Objet client créé:');
    console.log(`  - is_permanent: [${client.is_permanent}] (${typeof client.is_permanent})`);
    console.log(`  - maj_web: [${client.maj_web}] (${typeof client.maj_web})`);
    console.log(`  - stop_envoie_solde: [${client.stop_envoie_solde}] (${typeof client.stop_envoie_solde})`);

    const savedClient = await this.clientRepository.save(client);
    
    console.log(`📝 Client créé: ${savedClient.nom} (ID: ${savedClient.id})`);
    console.log(`🔐 Type d'accès: ${savedClient.is_permanent ? 'PERMANENT' : 'TEMPORAIRE'}`);

    // ✅ NOUVEAU: Créer automatiquement l'entrée contact_client si email ou téléphone fourni
    if (createClientDto.contact_mail1 || createClientDto.contact_tel1) {
      try {
        console.log(`\n🔄 INSERTION CONTACT_CLIENT pour client #${savedClient.id}`);
        console.log(`   - contact_mail1 (DTO): ${createClientDto.contact_mail1 || 'NON FOURNI'}`);
        console.log(`   - contact_tel1 (DTO): ${createClientDto.contact_tel1 || 'NON FOURNI'}`);
        console.log(`   - contact_fonction (DTO): ${createClientDto.contact_fonction || 'NON FOURNI'}`);
        
        const insertResult = await this.clientRepository.query(`
          INSERT INTO contact_client (id_client, mail1, tel1, fonction)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id_client) 
          DO UPDATE SET 
            mail1 = EXCLUDED.mail1,
            tel1 = EXCLUDED.tel1,
            fonction = EXCLUDED.fonction
          RETURNING id_client, mail1, tel1, fonction
        `, [
          savedClient.id,
          createClientDto.contact_mail1 || null,
          createClientDto.contact_tel1 || null,
          createClientDto.contact_fonction || null
        ]);
        
        console.log(`✅ CONTACT_CLIENT créé/mis à jour avec succès:`);
        console.log(`   Résultat:`, JSON.stringify(insertResult, null, 2));
        console.log(`   - id_client: ${insertResult[0]?.id_client}`);
        console.log(`   - mail1 (BD): ${insertResult[0]?.mail1 || 'NULL'}`);
        console.log(`   - tel1 (BD): ${insertResult[0]?.tel1 || 'NULL'}`);
        console.log(`   - fonction (BD): ${insertResult[0]?.fonction || 'NULL'}\n`);
      } catch (contactError) {
        console.error(`\n❌ ERREUR INSERTION CONTACT_CLIENT pour client #${savedClient.id}:`);
        console.error(`   Message: ${contactError.message}`);
        console.error(`   Code: ${contactError.code}`);
        console.error(`   Detail: ${contactError.detail}`);
        console.error(`   Stack:`, contactError.stack);
        // Ne pas bloquer la création du client
      }
    } else {
      console.log(`⚠️ AUCUN contact_mail1 ou contact_tel1 fourni - Pas d'insertion dans contact_client`);
    }

    // SEULEMENT si c'est un client permanent, créer automatiquement un utilisateur Keycloak
    if (createClientDto.is_permanent === true) {
      console.log(`🔑 Client permanent détecté - Création compte Keycloak...`);
      
      try {
        // Récupérer l'email depuis contact_mail1
        const clientEmail = createClientDto.contact_mail1;
        
        if (clientEmail) {
          console.log(`📧 Email trouvé: ${clientEmail}`);
          
          // Préparer les données utilisateur pour Keycloak
          const keycloakUserData = {
            username: `client_${savedClient.id}`,
            email: clientEmail,
            firstName: createClientDto.interlocuteur?.split(' ')[0] || 'Client',
            lastName: createClientDto.interlocuteur?.split(' ').slice(1).join(' ') || createClientDto.nom,
            enabled: true,
            password: createClientDto.mot_de_passe // Mot de passe pour client permanent
          };

          const keycloakUserId = await this.keycloakService.createUser(keycloakUserData);
          
          if (keycloakUserId) {
            console.log(`✅ Utilisateur Keycloak créé avec succès pour le client permanent ${savedClient.id}: ${keycloakUserId}`);
            
            // Mettre à jour le client avec l'ID Keycloak
            await this.clientRepository.update(savedClient.id, { keycloak_id: keycloakUserId });
          } else {
            console.warn(`⚠️ Échec de la création utilisateur Keycloak pour le client permanent ${savedClient.id}`);
          }
        } else {
          console.warn(`⚠️ Aucun email trouvé pour le client permanent ${savedClient.id}, pas de création Keycloak`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la création utilisateur Keycloak pour le client permanent ${savedClient.id}:`, error);
        // Ne pas empêcher la création du client en cas d'erreur Keycloak
      }
    } else {
      console.log(`🕘 Client temporaire - AUCUNE création Keycloak (comportement voulu)`);
    }

    // Si l'état fiscal est en suspension TVA, valider la cohérence
    if (savedClient.etat_fiscal === EtatFiscal.SUSPENSION_TVA) {
      await this.validateClientTVACoherence(savedClient.id);
    }

    return savedClient;
  }

  /**
   * Rendre un client permanent avec création d'utilisateur Keycloak
   */
  async makePermanent(clientId: number): Promise<{ success: boolean; message: string; keycloakUserId?: string }> {
    const client = await this.findOne(clientId);
    
    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${clientId} non trouvé`);
    }

    if (client.is_permanent) {
      return { success: false, message: 'Ce client est déjà permanent' };
    }

    try {
      // Récupérer l'email du client (depuis les contacts ou interlocuteur)
      let clientEmail = '';
      
      // Essayer d'abord les contacts
      if (client.contacts && client.contacts.length > 0) {
        const primaryContact = client.contacts.find(c => c.mail1) || client.contacts[0];
        clientEmail = primaryContact.mail1 || '';
      }
      
      // Si pas d'email dans les contacts, utiliser l'interlocuteur comme email si c'est un format valide
      if (!clientEmail && client.interlocuteur && client.interlocuteur.includes('@')) {
        clientEmail = client.interlocuteur;
      }

      if (!clientEmail) {
        return { success: false, message: 'Aucun email trouvé pour ce client. Ajoutez un email avant de le rendre permanent.' };
      }

      // Générer un mot de passe fort pour Keycloak
      const strongPassword = this.generateStrongPassword();

      // Préparer les données utilisateur pour Keycloak
      const keycloakUserData = {
        username: client.nom.toLowerCase().replace(/\s+/g, '_'),
        email: clientEmail,
        firstName: client.interlocuteur || client.nom,
        lastName: '',
        enabled: true,
        credentials: [{
          type: 'password',
          value: strongPassword,
          temporary: false
        }]
      };

      // Créer l'utilisateur dans Keycloak
      const keycloakUserId = await this.keycloakService.createUser(keycloakUserData);

      if (keycloakUserId) {
        // Hacher le mot de passe pour la BD locale
        const hashedPassword = crypto.createHash('sha256').update(strongPassword).digest('hex');
        
        // Mettre à jour le client comme permanent
        await this.clientRepository.update(clientId, { 
          is_permanent: true,
          mot_de_passe: hashedPassword, // Conserver le mot de passe hashé dans la BD
          keycloak_id: keycloakUserId,
        });

        console.log(`✅ Client ${clientId} rendu permanent avec utilisateur Keycloak: ${keycloakUserId}`);
        
        // Envoyer l'email avec les identifiants au client
        try {
          await this.emailService.sendClientCredentialsEmail(
            clientEmail,
            client.nom,
            strongPassword, // Mot de passe généré
            client.nom, // Username (nom du client)
            client.interlocuteur || 'Client'
          );
          console.log(`📧 Email d'identifiants envoyé à ${clientEmail} pour le client permanent ${clientId}`);
        } catch (emailError) {
          console.warn(`⚠️ Erreur envoi email pour client ${clientId}:`, emailError.message);
          // Ne pas faire échouer l'opération si l'email échoue
        }
        
        return { 
          success: true, 
          message: `Client rendu permanent avec succès. Les identifiants ont été envoyés à ${clientEmail}`,
          keycloakUserId 
        };
      } else {
        return { success: false, message: 'Échec de la création du compte utilisateur. Veuillez réessayer.' };
      }

    } catch (error) {
      console.error(`❌ Erreur lors de la conversion en client permanent ${clientId}:`, error);
      return { 
        success: false, 
        message: `Erreur lors de la création du compte: ${error.message}` 
      };
    }
  }

  /**
   * Générer un mot de passe fort
   */
  private generateStrongPassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Assurer au moins un caractère de chaque type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Compléter avec des caractères aléatoires
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Mélanger le mot de passe
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  async findAll(): Promise<Client[]> {
    console.log('🔍 SERVICE findAll() - Début de la récupération des clients...');
    
    try {
      // Étape 1: Récupérer les clients SANS les relations complexes d'abord
      console.log('📊 Étape 1: Récupération des clients de base...');
      const baseClients = await this.clientRepository.find({
        order: { created_at: 'DESC' },
      });
      
      console.log(`✅ ${baseClients.length} clients récupérés (sans relations)`);
      
      if (baseClients.length > 0) {
        console.log('🔍 Analyse des valeurs is_permanent DIRECTES:');
        baseClients.slice(0, 3).forEach((client, index) => {
          console.log(`  Client ${index + 1}: ${client.nom} (ID: ${client.id})`);
          console.log(`    - is_permanent: [${client.is_permanent}] (${typeof client.is_permanent})`);
        });
        
        const stats = {
          total: baseClients.length,
          permanent: baseClients.filter(c => c.is_permanent === true).length,
          temporary: baseClients.filter(c => c.is_permanent === false).length,
          null: baseClients.filter(c => c.is_permanent === null).length,
          undefined: baseClients.filter(c => c.is_permanent === undefined).length
        };
        
        console.log('📊 Statistiques directes:', stats);
        
        // Si tous sont false, il y a un problème de données ou de schéma
        if (stats.permanent === 0 && stats.temporary === baseClients.length) {
          console.log('⚠️ PROBLÈME DÉTECTÉ: Tous les clients sont temporaires !');
          console.log('🔧 Vérification avec requête SQL directe...');
          
          // Vérification avec requête SQL brute
          const sqlCheck = await this.clientRepository.query(`
            SELECT id, nom, is_permanent, 
                   CASE WHEN is_permanent = true THEN 'TRUE'
                        WHEN is_permanent = false THEN 'FALSE'
                        WHEN is_permanent IS NULL THEN 'NULL'
                        ELSE 'OTHER' END as status
            FROM client 
            ORDER BY id DESC 
            LIMIT 5
          `);
          
          console.log('🗄️ Vérification SQL directe:', sqlCheck);
        }
      }
      
      // Étape 2: Ajouter les relations si nécessaire
      console.log('📊 Étape 2: Ajout des relations contacts...');
      const clientsWithRelations = await this.clientRepository.find({
        relations: ['contacts'],
        order: { created_at: 'DESC' },
      });
      
      console.log(`✅ Relations contacts ajoutées`);
      
      return clientsWithRelations;
      
    } catch (error) {
      console.error('❌ Erreur dans findAll():', error);
      throw error;
    }
  }

  async findOne(id: number): Promise<Client> {
    // Essayer avec QueryBuilder pour forcer la sélection de is_permanent
    try {
      const client = await this.clientRepository
        .createQueryBuilder('client')
        .leftJoinAndSelect('client.contacts', 'contacts')
        .leftJoinAndSelect('client.autorisationsTVA', 'autorisationsTVA')
        .where('client.id = :id', { id })
        .getOne();

      if (!client) {
        throw new NotFoundException(`Client avec l'ID ${id} non trouvé`);
      }

      // Debug : vérifier le champ is_permanent
      console.log('🔍 findOne - client.is_permanent:', client.is_permanent, 'type:', typeof client.is_permanent);

      return client;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      console.error('❌ Erreur avec QueryBuilder dans findOne, fallback vers findOne():', error.message);
      
      // Fallback vers findOne() normal
      const client = await this.clientRepository.findOne({
        where: { id },
        relations: ['contacts', 'autorisationsTVA'],
      });

      if (!client) {
        throw new NotFoundException(`Client avec l'ID ${id} non trouvé`);
      }

      // Debug : vérifier le champ is_permanent
      console.log('🔍 findOne fallback - client.is_permanent:', client.is_permanent, 'type:', typeof client.is_permanent);

      return client;
    }
  }

  async forceUpdatePermanent(clientId: number): Promise<any> {
    try {
      // Mettre à jour directement avec requête SQL brute
      const updateResult = await this.clientRepository.query(
        `UPDATE client SET is_permanent = true WHERE id = $1 RETURNING id, nom, is_permanent`,
        [clientId]
      );
      
      // Vérifier le résultat
      if (updateResult.length > 0) {
        console.log(`✅ Client ${clientId} mis à jour: is_permanent =`, updateResult[0].is_permanent);
        return updateResult[0];
      } else {
        throw new NotFoundException(`Client ${clientId} non trouvé`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour forcée du client ${clientId}:`, error);
      throw error;
    }
  }

  async debugRawQuery(): Promise<any> {
    try {
      // Requête pour voir la structure de la table
      const tableInfo = await this.clientRepository.query(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'client' AND column_name = 'is_permanent'
      `);
      
      // Requête pour récupérer quelques clients avec is_permanent
      const rawClients = await this.clientRepository.query(`
        SELECT id, nom, is_permanent, 
               CASE WHEN is_permanent = true THEN 'VRAI'
                    WHEN is_permanent = false THEN 'FAUX'
                    WHEN is_permanent IS NULL THEN 'NULL'
                    ELSE 'AUTRE: ' || is_permanent::text END as interpretation
        FROM client 
        ORDER BY id DESC 
        LIMIT 10
      `);
      
      return {
        tableStructure: tableInfo,
        rawClients: rawClients
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
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