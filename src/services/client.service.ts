import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client, EtatFiscal } from '../entities/client.entity';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';
import { Fournisseur } from '../entities/fournisseur.entity';
import { AutorisationTVAService } from './autorisation-tva.service';
import { KeycloakService } from '../auth/keycloak.service';
import { EmailService } from './email.service';
import * as crypto from 'crypto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Fournisseur)
    private readonly fournisseurRepository: Repository<Fournisseur>,
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

    // 🆕 Gérer charge_com_ids (multi-commerciaux)
    const charge_com_ids = createClientDto.charge_com_ids && createClientDto.charge_com_ids.length > 0
      ? createClientDto.charge_com_ids
      : [];

    const client = this.clientRepository.create({
      ...createClientDto,
      mot_de_passe: hashedPassword,
      etat_fiscal: createClientDto.etat_fiscal || EtatFiscal.ASSUJETTI_TVA,
      date_auto: createClientDto.date_auto ? new Date(createClientDto.date_auto) : null,
      date_fin: createClientDto.date_fin ? new Date(createClientDto.date_fin) : null,
      // S'assurer explicitement que is_permanent est bien traité
      is_permanent: Boolean(createClientDto.is_permanent || false),
      // 🆕 Assigner les commerciaux
      charge_com_ids: charge_com_ids,
    });

    // Debug: Vérifier l'objet client créé
    console.log('🔍 SERVICE - Objet client créé:');
    console.log(`  - is_permanent: [${client.is_permanent}] (${typeof client.is_permanent})`);
    console.log(`  - maj_web: [${client.maj_web}] (${typeof client.maj_web})`);
    console.log(`  - stop_envoie_solde: [${client.stop_envoie_solde}] (${typeof client.stop_envoie_solde})`);

    const savedClient = await this.clientRepository.save(client);
    
    console.log(`📝 Client créé: ${savedClient.nom} (ID: ${savedClient.id})`);
    console.log(`🔐 Type d'accès: ${savedClient.is_permanent ? 'PERMANENT' : 'TEMPORAIRE'}`);

    // ✅ CORRECTION: Créer automatiquement le contact principal avec prenom = nom du client
    if (createClientDto.contact_mail1 || createClientDto.contact_tel1) {
      try {
        console.log(`\n🔄 INSERTION CONTACT_CLIENT pour client #${savedClient.id}`);
        console.log(`   - Nom du client: ${savedClient.nom}`);
        console.log(`   - contact_mail1 (DTO): ${createClientDto.contact_mail1 || 'NON FOURNI'}`);
        console.log(`   - contact_tel1 (DTO): ${createClientDto.contact_tel1 || 'NON FOURNI'}`);
        console.log(`   - contact_fonction (DTO): ${createClientDto.contact_fonction || 'interlocuteur'}`);
        
        // ✅ CORRECTION CRITIQUE: Insérer avec prenom = interlocuteur (nom de la personne) et is_principal = true
        const insertResult = await this.clientRepository.query(`
          INSERT INTO contact_client (
            id_client, 
            prenom, 
            mail1, 
            tel1, 
            fonction,
            is_principal
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, id_client, prenom, mail1, tel1, fonction, is_principal
        `, [
          savedClient.id,
          createClientDto.interlocuteur || savedClient.nom, // ✅ prenom = interlocuteur (nom de la personne), sinon nom de l'entreprise
          createClientDto.contact_mail1 || null,
          createClientDto.contact_tel1 || null,
          createClientDto.contact_fonction || 'interlocuteur', // ✅ Fallback vers "interlocuteur"
          true // ✅ is_principal = true pour le contact principal
        ]);
        
        console.log(`✅ CONTACT_CLIENT créé avec succès:`);
        console.log(`   Résultat:`, JSON.stringify(insertResult, null, 2));
        console.log(`   - id: ${insertResult[0]?.id}`);
        console.log(`   - id_client: ${insertResult[0]?.id_client}`);
        console.log(`   - prenom (BD): ${insertResult[0]?.prenom || 'NULL'}`);
        console.log(`   - mail1 (BD): ${insertResult[0]?.mail1 || 'NULL'}`);
        console.log(`   - tel1 (BD): ${insertResult[0]?.tel1 || 'NULL'}`);
        console.log(`   - fonction (BD): ${insertResult[0]?.fonction || 'NULL'}`);
        console.log(`   - is_principal (BD): ${insertResult[0]?.is_principal}\n`);
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

    // SEULEMENT si c'est un client permanent, tenter de créer un utilisateur Keycloak
    if (createClientDto.is_permanent === true) {
      console.log(`🔑 Client permanent détecté - Tentative création compte Keycloak...`);
      
      try {
        // Récupérer l'email depuis contact_mail1
        const clientEmail = createClientDto.contact_mail1;
        
        if (clientEmail) {
          console.log(`📧 Email trouvé: ${clientEmail}`);
          
          try {
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
              console.log(`✅ Utilisateur Keycloak créé avec succès: ${keycloakUserId}`);
              
              // Mettre à jour le client avec l'ID Keycloak
              await this.clientRepository.update(savedClient.id, { keycloak_id: keycloakUserId });

              // 📧 ENVOYER L'EMAIL UNIQUEMENT SI sendEmailWithPassword = true
              if (createClientDto.sendEmailWithPassword === true && createClientDto.mot_de_passe) {
                try {
                  await this.emailService.sendClientCredentialsEmail(
                    clientEmail,
                    savedClient.nom,
                    createClientDto.mot_de_passe,
                    savedClient.nom,
                    createClientDto.interlocuteur || 'Client'
                  );
                  console.log(`📧 Email avec identifiants envoyé à ${clientEmail}`);
                } catch (emailError) {
                  console.warn(`⚠️ Erreur envoi email:`, emailError.message);
                }
              } else {
                console.log(`🚫 Envoi d'email désactivé (sendEmailWithPassword = ${createClientDto.sendEmailWithPassword})`);
              }
            } else {
              console.warn(`⚠️ Keycloak n'a pas retourné d'ID utilisateur`);
            }
          } catch (keycloakError) {
            console.warn(`⚠️ Keycloak non disponible ou erreur:`, keycloakError.message);
            console.log(`✅ Client permanent créé sans Keycloak (connexion locale uniquement)`);
            // Le client reste permanent, mais sans keycloak_id
          }
        } else {
          console.warn(`⚠️ Aucun email trouvé, pas de création Keycloak`);
        }
      } catch (error) {
        console.warn(`⚠️ Erreur lors de la tentative Keycloak:`, error.message);
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

      // Générer un mot de passe fort
      const strongPassword = this.generateStrongPassword();
      const hashedPassword = crypto.createHash('sha256').update(strongPassword).digest('hex');

      // Tentative de création dans Keycloak (optionnel)
      let keycloakUserId: string | null = null;
      let keycloakError = false;

      try {
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
        keycloakUserId = await this.keycloakService.createUser(keycloakUserData);
        
        if (keycloakUserId) {
          console.log(`✅ Utilisateur Keycloak créé avec succès: ${keycloakUserId}`);
        } else {
          console.warn(`⚠️ Keycloak n'a pas retourné d'ID utilisateur`);
          keycloakError = true;
        }
      } catch (keycloakErr) {
        console.warn(`⚠️ Keycloak non disponible ou erreur lors de la création:`, keycloakErr.message);
        keycloakError = true;
        // Continuer sans Keycloak
      }

      // Mettre à jour le client comme permanent (avec ou sans Keycloak)
      await this.clientRepository.update(clientId, { 
        is_permanent: true,
        mot_de_passe: hashedPassword,
        keycloak_id: keycloakUserId || null, // NULL si Keycloak non disponible
      });

      console.log(`✅ Client ${clientId} rendu permanent ${keycloakUserId ? 'avec' : 'sans'} Keycloak`);
      
      // Envoyer l'email avec les identifiants au client
      try {
        await this.emailService.sendClientCredentialsEmail(
          clientEmail,
          client.nom,
          strongPassword,
          client.nom,
          client.interlocuteur || 'Client'
        );
        console.log(`📧 Email d'identifiants envoyé à ${clientEmail}`);
      } catch (emailError) {
        console.warn(`⚠️ Erreur envoi email:`, emailError.message);
        // Ne pas faire échouer l'opération si l'email échoue
      }
      
      let message = `Client rendu permanent avec succès. Les identifiants ont été envoyés à ${clientEmail}`;
      if (keycloakError) {
        message += ' (Note: Keycloak non disponible, connexion via base de données locale uniquement)';
      }
      
      return { 
        success: true, 
        message,
        keycloakUserId: keycloakUserId || undefined
      };

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
      // 🏦 CORRECTION: Utiliser find() au lieu de QueryBuilder pour garantir 
      // la récupération de TOUTES les colonnes de l'entité
      console.log('📊 Utilisation de repository.find() avec relations...');
      const clients = await this.clientRepository.find({
        relations: ['contacts'],
        order: {
          created_at: 'DESC'
        }
      });
      
      console.log(`✅ ${clients.length} clients récupérés`);
      
      if (clients.length > 0) {
        const firstClient = clients[0];
        console.log('🔍 Analyse premier client:');
        console.log(`  - ID: ${firstClient.id}, Nom: ${firstClient.nom}`);
        console.log(`  - is_permanent: [${firstClient.is_permanent}] (${typeof firstClient.is_permanent})`);
        console.log(`  - is_fournisseur: [${firstClient.is_fournisseur}] (${typeof firstClient.is_fournisseur})`);
        console.log(`  - code_fournisseur: ${firstClient.code_fournisseur || 'N/A'}`);
        console.log(`  - Infos bancaires:`, {
          banque: firstClient.banque,
          iban: firstClient.iban,
          rib: firstClient.rib,
          swift: firstClient.swift,
          bic: firstClient.bic,
          hasBanque: 'banque' in firstClient,
          hasIban: 'iban' in firstClient
        });
        
        const stats = {
          total: clients.length,
          permanent: clients.filter(c => c.is_permanent === true).length,
          temporary: clients.filter(c => c.is_permanent === false).length,
          fournisseurs: clients.filter(c => c.is_fournisseur === true).length,
          withBankInfo: clients.filter(c => c.banque || c.iban || c.rib).length
        };
        
        console.log('📊 Statistiques:', stats);
        
        // 🆕 Afficher les clients qui sont fournisseurs
        const clientsFournisseurs = clients.filter(c => c.is_fournisseur === true);
        if (clientsFournisseurs.length > 0) {
          console.log('🏪 Clients fournisseurs:');
          clientsFournisseurs.forEach(c => {
            console.log(`  - ${c.nom} (ID: ${c.id}) - Code: ${c.code_fournisseur}`);
          });
        }
      }
      
      return clients;
      
    } catch (error) {
      console.error('❌ Erreur dans findAll():', error);
      throw error;
    }
  }

  async findOne(id: number): Promise<Client> {
    // 🏦 CORRECTION: Utiliser findOne() au lieu de QueryBuilder pour garantir 
    // la récupération de TOUTES les colonnes de l'entité
    try {
      const client = await this.clientRepository.findOne({
        where: { id },
        relations: ['contacts', 'autorisationsTVA']
      });

      if (!client) {
        throw new NotFoundException(`Client avec l'ID ${id} non trouvé`);
      }

      // Debug : vérifier les champs is_permanent et infos bancaires
      console.log('🔍 findOne - Vérification client ID:', id);
      console.log('  - is_permanent:', client.is_permanent, 'type:', typeof client.is_permanent);
      console.log('  - Infos bancaires:', {
        banque: client.banque,
        iban: client.iban,
        rib: client.rib,
        swift: client.swift,
        bic: client.bic,
        hasBanque: 'banque' in client,
        hasIban: 'iban' in client,
        hasRib: 'rib' in client,
        hasSwift: 'swift' in client,
        hasBic: 'bic' in client
      });

      return client;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      console.error('❌ Erreur dans findOne:', error.message);
      throw error;
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

    // 🆕 Gérer charge_com_ids si fourni
    const charge_com_ids = updateClientDto.charge_com_ids !== undefined
      ? updateClientDto.charge_com_ids
      : client.charge_com_ids;

    const updateData = {
      ...updateClientDto,
      date_auto: updateClientDto.date_auto ? new Date(updateClientDto.date_auto) : client.date_auto,
      date_fin: updateClientDto.date_fin ? new Date(updateClientDto.date_fin) : client.date_fin,
      // 🆕 Mettre à jour les commerciaux assignés
      charge_com_ids: charge_com_ids,
    };

    await this.clientRepository.update(id, updateData);
    const updatedClient = await this.findOne(id);

    // Validation post-mise à jour si l'état fiscal a changé
    if (newEtatFiscal && newEtatFiscal !== oldEtatFiscal) {
      await this.validateClientTVACoherence(id);
    }

    // ✅ SYNCHRONISER AVEC KEYCLOAK si keycloak_id existe
    if (updatedClient.keycloak_id && this.keycloakService) {
      try {
        // Récupérer l'email du contact
        let clientEmail = '';
        if (updatedClient.contacts && updatedClient.contacts.length > 0) {
          const primaryContact = updatedClient.contacts.find(c => c.mail1) || updatedClient.contacts[0];
          clientEmail = primaryContact.mail1 || '';
        }

        // Mise à jour des informations dans Keycloak
        await this.keycloakService.updateUser(updatedClient.keycloak_id, {
          username: updatedClient.nom,
          email: clientEmail || '',
          firstName: updatedClient.interlocuteur || updatedClient.nom,
          lastName: '',
          enabled: updatedClient.statut === 'actif' && !updatedClient.blocage,
        });

        // Gestion du statut
        if (updateClientDto.statut) {
          if (updateClientDto.statut === 'actif' && !updatedClient.blocage) {
            await this.keycloakService.enableUser(updatedClient.keycloak_id);
            console.log(`✅ Client #${id} activé dans Keycloak`);
          } else {
            await this.keycloakService.disableUser(updatedClient.keycloak_id);
            // Fermer toutes les sessions si désactivé
            await this.keycloakService.logoutAllUserSessions(updatedClient.keycloak_id);
            console.log(`✅ Client #${id} désactivé dans Keycloak et sessions fermées`);
          }
        }

        // Gestion du blocage
        if (updateClientDto.blocage !== undefined) {
          if (updateClientDto.blocage) {
            await this.keycloakService.disableUser(updatedClient.keycloak_id);
            await this.keycloakService.logoutAllUserSessions(updatedClient.keycloak_id);
            console.log(`✅ Client #${id} bloqué dans Keycloak et sessions fermées`);
          } else if (updatedClient.statut === 'actif') {
            await this.keycloakService.enableUser(updatedClient.keycloak_id);
            console.log(`✅ Client #${id} débloqué dans Keycloak`);
          }
        }

        console.log(`✅ Client #${id} synchronisé avec Keycloak`);
      } catch (keycloakError) {
        console.warn(`⚠️ Erreur synchronisation Keycloak client #${id}:`, keycloakError.message);
      }
    }

    // ✅ CRÉER DANS KEYCLOAK si devient permanent et n'a pas encore de keycloak_id
    if (updateClientDto.is_permanent === true && !updatedClient.keycloak_id && this.keycloakService) {
      try {
        // Récupérer l'email du contact
        let clientEmail = '';
        if (updatedClient.contacts && updatedClient.contacts.length > 0) {
          const primaryContact = updatedClient.contacts.find(c => c.mail1) || updatedClient.contacts[0];
          clientEmail = primaryContact.mail1 || '';
        }

        if (!clientEmail) {
          console.warn(`⚠️ Client #${id} devient permanent mais aucun email trouvé - Pas de création Keycloak`);
          return updatedClient;
        }

        const keycloakUserId = await this.keycloakService.createUser({
          username: updatedClient.nom,
          email: clientEmail,
          firstName: updatedClient.interlocuteur || updatedClient.nom,
          lastName: '',
          enabled: updatedClient.statut === 'actif' && !updatedClient.blocage,
        });

        if (keycloakUserId) {
          // Assigner le rôle client
          await this.keycloakService.assignRoleToUser(keycloakUserId, 'client');
          
          // Mettre à jour le keycloak_id dans la base
          await this.clientRepository.update(id, { keycloak_id: keycloakUserId });
          updatedClient.keycloak_id = keycloakUserId;
          
          console.log(`✅ Client #${id} devenu permanent - Créé dans Keycloak: ${keycloakUserId}`);
        }
      } catch (keycloakError) {
        console.warn(`⚠️ Erreur création Keycloak pour client #${id}:`, keycloakError.message);
      }
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

  /**
   * 🆕 Récupère les clients assignés à un commercial spécifique
   * @param commercialId ID du commercial
   * @returns Liste des clients assignés
   */
  async findClientsByCommercial(commercialId: number): Promise<Client[]> {
    // 🏦 CORRECTION: Utiliser QueryBuilder mais avec select explicite de toutes les colonnes
    return await this.clientRepository
      .createQueryBuilder('client')
      .select('client') // Sélectionner TOUTES les colonnes de l'entité client
      .leftJoinAndSelect('client.contacts', 'contacts')
      .leftJoinAndSelect('client.autorisationsTVA', 'autorisationsTVA')
      .where(':commercialId = ANY(client.charge_com_ids)', { commercialId })
      .orderBy('client.created_at', 'DESC')
      .getMany();
  }

  /**
   * 🆕 Convertit un client en fournisseur
   * @param clientId ID du client à convertir
   * @returns Client mis à jour avec is_fournisseur = true et code_fournisseur
   */
  /**
   * Convertit un client en fournisseur
   * 1. Crée un enregistrement dans la table fournisseurs avec génération de code
   * 2. Met à jour le client avec is_fournisseur = true et code_fournisseur
   */
  async convertToFournisseur(clientId: number): Promise<{client: Client, codeFournisseur: string}> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId },
      relations: ['contacts']
    });

    // Vérifier que le client existe
    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${clientId} introuvable`);
    }

    // Vérifier si le client n'est pas déjà fournisseur
    if (client.is_fournisseur) {
      throw new ConflictException(`Le client "${client.nom}" est déjà fournisseur (Code: ${client.code_fournisseur})`);
    }

    // Récupérer le contact principal pour les informations de contact
    const contactPrincipal = client.contacts?.find(c => c.is_principal) || client.contacts?.[0];

    try {
      // 1. Générer le code fournisseur en vérifiant tous les fournisseurs existants
      const codeFournisseur = await this.generateCodeFournisseur();

      // 2. Créer l'enregistrement dans la table fournisseurs avec les infos du contact principal
      const fournisseur = this.fournisseurRepository.create({
        code: codeFournisseur,
        nom: client.nom,
        typeFournisseur: client.categorie === 'etranger' ? 'etranger' : 'local',
        categorie: client.type_client === 'entreprise' ? 'personne_morale' : 'personne_physique',
        natureIdentification: 'mf', // Par défaut MF pour les entreprises
        numeroIdentification: client.id_fiscal,
        adresse: client.adresse,
        ville: client.ville,
        codePostal: client.code_postal,
        pays: client.pays || 'Tunisie',
        // Utiliser les informations du contact principal
        telephone: contactPrincipal?.tel1 || null,
        fax: contactPrincipal?.fax || null,
        email: contactPrincipal?.mail1 || client.email || null,
        ribIban: client.rib || client.iban,
        swift: client.swift,
        notes: `Converti depuis le client ID: ${clientId} - ${new Date().toLocaleDateString('fr-FR')}${contactPrincipal ? `\nContact: ${contactPrincipal.prenom || ''} ${contactPrincipal.nom || ''}`.trim() : ''}`,
        isActive: client.statut === 'actif',
      });

      const savedFournisseur = await this.fournisseurRepository.save(fournisseur);
      console.log(`✅ Fournisseur créé avec le code ${codeFournisseur} (ID: ${savedFournisseur.id})`);

      // 3. Mettre à jour le client avec les informations du fournisseur
      await this.clientRepository.update(clientId, {
        is_fournisseur: true,
        code_fournisseur: codeFournisseur
      });

      const updatedClient = await this.findOne(clientId);

      console.log(`✅ Client ${client.nom} (ID: ${clientId}) marqué comme fournisseur avec le code ${codeFournisseur}`);

      return {
        client: updatedClient,
        codeFournisseur: codeFournisseur
      };
    } catch (error) {
      console.error(`❌ Erreur lors de la conversion du client ${clientId} en fournisseur:`, error);
      throw new BadRequestException(`Impossible de convertir le client en fournisseur: ${error.message}`);
    }
  }

  /**
   * Révoquer l'accès au portail d'un client
   * 1. Supprime l'utilisateur de Keycloak
   * 2. Met à jour is_permanent à false
   * 3. Supprime le mot de passe de la base de données
   */
  async revokePortalAccess(clientId: number): Promise<void> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId },
      relations: ['contacts']
    });

    // Vérifier que le client existe
    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${clientId} introuvable`);
    }

    // Vérifier si le client a un accès au portail
    if (!client.is_permanent) {
      throw new ConflictException(`Le client "${client.nom}" n'a pas d'accès au portail`);
    }

    try {
      // 1. Supprimer l'utilisateur de Keycloak si un keycloak_id existe
      if (client.keycloak_id) {
        console.log(`🔑 Suppression de l'utilisateur Keycloak ID: ${client.keycloak_id}`);
        try {
          await this.keycloakService.deleteUser(client.keycloak_id);
          console.log(`✅ Utilisateur Keycloak supprimé avec succès`);
        } catch (keycloakError) {
          console.warn(`⚠️ Erreur lors de la suppression Keycloak (l'utilisateur n'existe peut-être plus):`, keycloakError.message);
          // Continue même si Keycloak échoue
        }
      }

      // 2. Mettre à jour le client: is_permanent = false, mot_de_passe = null, keycloak_id = null
      await this.clientRepository.update(clientId, {
        is_permanent: false,
        mot_de_passe: null,
        keycloak_id: null
      });

      console.log(`✅ Accès au portail révoqué pour le client ${client.nom} (ID: ${clientId})`);

      // 3. Envoyer un email de notification (optionnel)
      try {
        const contactEmail = client.email || client.contacts?.[0]?.mail1;
        if (contactEmail) {
          await this.emailService.sendEmail(
            contactEmail,
            'Accès au portail révoqué',
            `Bonjour ${client.interlocuteur || client.nom},\n\n` +
            `Votre accès au portail client Velosi a été révoqué.\n\n` +
            `Si vous pensez qu'il s'agit d'une erreur, veuillez contacter notre support.\n\n` +
            `Cordialement,\n` +
            `L'équipe Velosi`
          );
          console.log(`📧 Email de notification envoyé à ${contactEmail}`);
        }
      } catch (emailError) {
        console.warn(`⚠️ Impossible d'envoyer l'email de notification:`, emailError.message);
        // Continue même si l'email échoue
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la révocation de l'accès au portail:`, error);
      throw new InternalServerErrorException(`Impossible de révoquer l'accès au portail: ${error.message}`);
    }
  }

  /**
   * Génère un code fournisseur unique au format FRN001, FRN002, etc.
   * Vérifie les codes existants dans TOUTES les sources (table clients ET table fournisseurs)
   */
  private async generateCodeFournisseur(): Promise<string> {
    // Récupérer tous les codes fournisseurs des clients
    const clientsWithCode = await this.clientRepository
      .createQueryBuilder('client')
      .where("client.code_fournisseur LIKE 'FRN%'")
      .andWhere('client.is_fournisseur = :isFournisseur', { isFournisseur: true })
      .select(['client.code_fournisseur'])
      .getMany();

    // Récupérer tous les codes de la table fournisseurs
    const fournisseurs = await this.fournisseurRepository
      .createQueryBuilder('fournisseur')
      .where("fournisseur.code LIKE 'FRN%'")
      .select(['fournisseur.code'])
      .getMany();

    // Extraire tous les numéros de code existants
    const existingNumbers: number[] = [];
    
    // Ajouter les numéros des clients
    for (const client of clientsWithCode) {
      const match = client.code_fournisseur?.match(/FRN(\d+)/);
      if (match) {
        existingNumbers.push(parseInt(match[1], 10));
      }
    }

    // Ajouter les numéros de la table fournisseurs
    for (const fournisseur of fournisseurs) {
      const match = fournisseur.code?.match(/FRN(\d+)/);
      if (match) {
        existingNumbers.push(parseInt(match[1], 10));
      }
    }

    // Si aucun code n'existe, commencer à FRN001
    if (existingNumbers.length === 0) {
      return 'FRN001';
    }

    // Trouver le plus grand numéro
    const maxNumber = Math.max(...existingNumbers);
    const newNumber = maxNumber + 1;
    
    console.log(`📊 Codes fournisseurs existants: ${existingNumbers.sort((a, b) => a - b).join(', ')}, nouveau: ${newNumber}`);
    
    return `FRN${newNumber.toString().padStart(3, '0')}`;
  }
}