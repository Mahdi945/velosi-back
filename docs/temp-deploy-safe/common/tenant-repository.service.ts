import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { DatabaseConnectionService } from '../common/database-connection.service';

// Importer toutes les entités
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { ContactClient } from '../entities/contact-client.entity';
import { Lead } from '../entities/crm/lead.entity';
import { Opportunity } from '../entities/crm/opportunity.entity';
import { Quote } from '../crm/entities/quote.entity';
import { QuoteItem } from '../crm/entities/quote-item.entity';
import { Activity } from '../crm/entities/activity.entity';
import { ActivityParticipant } from '../crm/entities/activity-participant.entity';
import { TypeFraisAnnexe } from '../crm/entities/type-frais-annexe.entity';
import { Industry } from '../crm/entities/industry.entity';
import { ObjectifCom } from '../entities/objectif-com.entity';
import { Engin } from '../entities/engin.entity';
import { Navire } from '../entities/navire.entity';
import { Armateur } from '../entities/armateur.entity';
import { Fournisseur } from '../entities/fournisseur.entity';
import { Correspondant } from '../correspondants/entities/correspondant.entity';
import { Port } from '../entities/port.entity';
import { Aeroport } from '../entities/aeroport.entity';
import { AutorisationTVA } from '../entities/autorisation-tva.entity';
import { BCsusTVA } from '../entities/bcsus-tva.entity';
import { BiometricCredential } from '../entities/biometric-credential.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { VechatMessage } from '../vechat/entities/vechat-message.entity';
import { VechatConversation } from '../vechat/entities/vechat-conversation.entity';
import { VechatPresence } from '../vechat/entities/vechat-presence.entity';
import { VechatUserSettings } from '../vechat/entities/vechat-user-settings.entity';

/**
 * Service helper REQUEST-SCOPED qui fournit automatiquement les repositories
 * de la bonne base de données selon l'organisation de l'utilisateur
 * 
 * Usage dans un service:
 * ```typescript
 * constructor(private tenantRepos: TenantRepositoryService) {}
 * 
 * async myMethod() {
 *   const personnelRepo = await this.tenantRepos.getPersonnelRepository();
 *   const clients = await personnelRepo.find();
 * }
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantRepositoryService {
  private databaseName: string;

  constructor(
    @Inject(REQUEST) private readonly request: Request & { organisationDatabase?: string; user?: any },
    private readonly dbConnectionService: DatabaseConnectionService,
  ) {
    // Ne pas extraire maintenant, attendre que l'interceptor enrichisse la requête
    console.log('🔌 [TENANT-REPOS] Service initialisé, attente de l\'organisation...');
  }

  /**
   * Extraire le nom de la base de données (lazy loading)
   * Appelé lors de la première utilisation
   */
  private getDatabaseName(): string {
    if (this.databaseName) {
      return this.databaseName;
    }

    // Extraire le nom de la base de données depuis la requête
    this.databaseName = this.request.organisationDatabase;
    
    if (!this.databaseName && this.request.user) {
      this.databaseName = (this.request.user as any).databaseName;
    }
    
    if (!this.databaseName) {
      console.error('🚨 [TENANT-REPOS] ERREUR CRITIQUE: Aucune base de données fournie');
      console.error('🚨 [TENANT-REPOS] Request URL:', this.request.url);
      console.error('🚨 [TENANT-REPOS] organisationDatabase:', this.request.organisationDatabase);
      console.error('🚨 [TENANT-REPOS] user:', this.request.user);
      throw new Error('Organisation database name is required for multi-tenant operations');
    }
    
    console.log(`🔌 [TENANT-REPOS] Base de données extraite: "${this.databaseName}"`);
    return this.databaseName;
  }

  private async getConnection() {
    const dbName = this.getDatabaseName();
    return this.dbConnectionService.getOrganisationConnection(dbName);
  }

  async getClientRepository(): Promise<Repository<Client>> {
    const conn = await this.getConnection();
    return conn.getRepository(Client);
  }

  async getPersonnelRepository(): Promise<Repository<Personnel>> {
    const conn = await this.getConnection();
    return conn.getRepository(Personnel);
  }

  async getLeadRepository(): Promise<Repository<Lead>> {
    const conn = await this.getConnection();
    return conn.getRepository(Lead);
  }

  async getOpportunityRepository(): Promise<Repository<Opportunity>> {
    const conn = await this.getConnection();
    return conn.getRepository(Opportunity);
  }

  async getQuoteRepository(): Promise<Repository<Quote>> {
    const conn = await this.getConnection();
    return conn.getRepository(Quote);
  }

  async getObjectifComRepository(): Promise<Repository<ObjectifCom>> {
    const conn = await this.getConnection();
    return conn.getRepository(ObjectifCom);
  }

  async getEnginRepository(): Promise<Repository<Engin>> {
    const conn = await this.getConnection();
    return conn.getRepository(Engin);
  }

  async getNavireRepository(): Promise<Repository<Navire>> {
    const conn = await this.getConnection();
    return conn.getRepository(Navire);
  }

  async getContactClientRepository(): Promise<Repository<ContactClient>> {
    const conn = await this.getConnection();
    return conn.getRepository(ContactClient);
  }

  async getAutorisationTVARepository(): Promise<Repository<AutorisationTVA>> {
    const conn = await this.getConnection();
    return conn.getRepository(AutorisationTVA);
  }

  async getBCsusTVARepository(): Promise<Repository<BCsusTVA>> {
    const conn = await this.getConnection();
    return conn.getRepository(BCsusTVA);
  }

  async getArmateurRepository(): Promise<Repository<Armateur>> {
    const conn = await this.getConnection();
    return conn.getRepository(Armateur);
  }

  async getFournisseurRepository(): Promise<Repository<Fournisseur>> {
    const conn = await this.getConnection();
    return conn.getRepository(Fournisseur);
  }

  async getCorrespondantRepository(): Promise<Repository<Correspondant>> {
    const conn = await this.getConnection();
    return conn.getRepository(Correspondant);
  }

  async getPortRepository(): Promise<Repository<Port>> {
    const conn = await this.getConnection();
    return conn.getRepository(Port);
  }

  async getAeroportRepository(): Promise<Repository<Aeroport>> {
    const conn = await this.getConnection();
    return conn.getRepository(Aeroport);
  }

  async getActivityRepository(): Promise<Repository<Activity>> {
    const conn = await this.getConnection();
    return conn.getRepository(Activity);
  }

  async getActivityParticipantRepository(): Promise<Repository<ActivityParticipant>> {
    const conn = await this.getConnection();
    return conn.getRepository(ActivityParticipant);
  }

  async getQuoteItemRepository(): Promise<Repository<QuoteItem>> {
    const conn = await this.getConnection();
    return conn.getRepository(QuoteItem);
  }

  async getTypeFraisAnnexeRepository(): Promise<Repository<TypeFraisAnnexe>> {
    const conn = await this.getConnection();
    return conn.getRepository(TypeFraisAnnexe);
  }

  async getIndustryRepository(): Promise<Repository<Industry>> {
    const conn = await this.getConnection();
    return conn.getRepository(Industry);
  }

  async getBiometricCredentialRepository(): Promise<Repository<BiometricCredential>> {
    const conn = await this.getConnection();
    return conn.getRepository(BiometricCredential);
  }

  async getLoginHistoryRepository(): Promise<Repository<LoginHistory>> {
    const conn = await this.getConnection();
    return conn.getRepository(LoginHistory);
  }

  async getVechatMessageRepository(): Promise<Repository<VechatMessage>> {
    const conn = await this.getConnection();
    return conn.getRepository(VechatMessage);
  }

  async getVechatConversationRepository(): Promise<Repository<VechatConversation>> {
    const conn = await this.getConnection();
    return conn.getRepository(VechatConversation);
  }

  async getVechatPresenceRepository(): Promise<Repository<VechatPresence>> {
    const conn = await this.getConnection();
    return conn.getRepository(VechatPresence);
  }

  async getVechatUserSettingsRepository(): Promise<Repository<VechatUserSettings>> {
    const conn = await this.getConnection();
    return conn.getRepository(VechatUserSettings);
  }
}
