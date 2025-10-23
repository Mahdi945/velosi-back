import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, IsNull, Not } from 'typeorm';
import { Lead, LeadStatus } from '../../entities/crm/lead.entity';
import { Opportunity, OpportunityStage } from '../../entities/crm/opportunity.entity';
import { Quote, QuoteStatus } from '../entities/quote.entity';
import { Activity } from '../entities/activity.entity';
import { Personnel } from '../../entities/personnel.entity';
import { Client } from '../../entities/client.entity';
import {
  ReportFilterDto,
  CommercialReport,
  ProspectReport,
  OpportunityReport,
  QuoteReport,
  GlobalReport,
  DetailedReport,
  ActivityReport,
  ClientReport,
} from '../dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  /**
   * Générer un rapport global CRM
   */
  async generateGlobalReport(filters: ReportFilterDto): Promise<GlobalReport> {
    const whereClause: any = {};
    
    // Filtres de période
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }

    // Récupérer tous les commerciaux ou filtrer
    let commercials: Personnel[];
    if (filters.commercialId) {
      commercials = await this.personnelRepository.find({
        where: { id: filters.commercialId },
      });
    } else if (filters.commercialIds && filters.commercialIds.length > 0) {
      commercials = await this.personnelRepository.find({
        where: { id: In(filters.commercialIds) },
      });
    } else {
      commercials = await this.personnelRepository.find({
        where: { role: 'commercial' },
      });
    }

    // Générer les rapports par commercial
    const commercialReports: CommercialReport[] = [];
    for (const commercial of commercials) {
      const report = await this.generateCommercialReport(commercial.id, filters);
      commercialReports.push(report);
    }

    // Calculer les statistiques globales
    const totalLeads = commercialReports.reduce((sum, r) => sum + r.totalLeads, 0);
    const totalOpportunities = commercialReports.reduce((sum, r) => sum + r.totalOpportunities, 0);
    const totalQuotes = commercialReports.reduce((sum, r) => sum + r.totalQuotes, 0);
    const totalOpportunityValue = commercialReports.reduce((sum, r) => sum + r.totalOpportunityValue, 0);
    const totalQuotesValue = commercialReports.reduce((sum, r) => sum + r.totalQuotesValue, 0);
    const totalAcceptedQuotesValue = commercialReports.reduce((sum, r) => sum + r.acceptedQuotesValue, 0);
    const totalMargin = commercialReports.reduce((sum, r) => sum + r.totalMargin, 0);

    // Top performers
    const topCommercialByQuotes = commercialReports.reduce((max, r) => 
      r.acceptedQuotes > max.acceptedQuotes ? r : max, commercialReports[0] || {} as CommercialReport
    );
    
    const topCommercialByRevenue = commercialReports.reduce((max, r) => 
      r.acceptedQuotesValue > max.acceptedQuotesValue ? r : max, commercialReports[0] || {} as CommercialReport
    );
    
    const topCommercialByConversion = commercialReports.reduce((max, r) => 
      r.overallConversionRate > max.overallConversionRate ? r : max, commercialReports[0] || {} as CommercialReport
    );

    return {
      periodStart: filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), 0, 1),
      periodEnd: filters.endDate ? new Date(filters.endDate) : new Date(),
      totalLeads,
      totalOpportunities,
      totalQuotes,
      totalOpportunityValue,
      totalQuotesValue,
      totalAcceptedQuotesValue,
      totalMargin,
      globalLeadToOpportunityRate: totalLeads > 0 ? (totalOpportunities / totalLeads) * 100 : 0,
      globalOpportunityToQuoteRate: totalOpportunities > 0 ? (totalQuotes / totalOpportunities) * 100 : 0,
      globalQuoteAcceptanceRate: totalQuotes > 0 
        ? (commercialReports.reduce((sum, r) => sum + r.acceptedQuotes, 0) / totalQuotes) * 100 
        : 0,
      commercialReports,
      topCommercialByQuotes,
      topCommercialByRevenue,
      topCommercialByConversion,
    };
  }

  /**
   * Générer un rapport par commercial
   */
  async generateCommercialReport(commercialId: number, filters: ReportFilterDto): Promise<CommercialReport> {
    const commercial = await this.personnelRepository.findOne({
      where: { id: commercialId },
    });

    if (!commercial) {
      throw new Error(`Commercial avec ID ${commercialId} introuvable`);
    }

    const whereClause: any = { assignedToId: commercialId };
    
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }

    // Prospects
    const leads = await this.leadRepository.find({
      where: whereClause,
      relations: ['assignedTo'],
    });

    const totalLeads = leads.length;
    const newLeads = leads.filter(l => l.status === LeadStatus.NEW).length;
    const qualifiedLeads = leads.filter(l => l.status === LeadStatus.QUALIFIED).length;
    const convertedLeads = leads.filter(l => l.status === LeadStatus.CONVERTED).length;
    const lostLeads = leads.filter(l => l.status === LeadStatus.LOST).length;

    // Opportunités
    const opportunities = await this.opportunityRepository.find({
      where: whereClause,
      relations: ['assignedTo'],
    });

    const totalOpportunities = opportunities.length;
    const openOpportunities = opportunities.filter(o => 
      o.stage !== OpportunityStage.CLOSED_WON && o.stage !== OpportunityStage.CLOSED_LOST
    ).length;
    const wonOpportunities = opportunities.filter(o => o.stage === OpportunityStage.CLOSED_WON).length;
    const lostOpportunities = opportunities.filter(o => o.stage === OpportunityStage.CLOSED_LOST).length;
    const totalOpportunityValue = opportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
    const wonOpportunityValue = opportunities
      .filter(o => o.stage === OpportunityStage.CLOSED_WON)
      .reduce((sum, o) => sum + (Number(o.value) || 0), 0);

    // Cotations (par commercial assigné - pas créateur car peut être créé par administratif)
    const quoteWhereClause: any = {
      commercialId: commercialId,
    };
    
    if (filters.startDate && filters.endDate) {
      quoteWhereClause.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }

    const quotes = await this.quoteRepository.find({
      where: quoteWhereClause,
      relations: ['commercial', 'creator'],
    });

    const totalQuotes = quotes.length;
    const draftQuotes = quotes.filter(q => q.status === QuoteStatus.DRAFT).length;
    const sentQuotes = quotes.filter(q => q.status === QuoteStatus.SENT).length;
    const acceptedQuotes = quotes.filter(q => q.status === QuoteStatus.ACCEPTED).length;
    const rejectedQuotes = quotes.filter(q => q.status === QuoteStatus.REJECTED).length;

    // Financier
    const totalQuotesValue = quotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
    const acceptedQuotesValue = quotes
      .filter(q => q.status === QuoteStatus.ACCEPTED)
      .reduce((sum, q) => sum + (Number(q.total) || 0), 0);
    const totalMargin = quotes.reduce((sum, q) => sum + (Number(q.totalMargin) || 0), 0);
    const acceptedMargin = quotes
      .filter(q => q.status === QuoteStatus.ACCEPTED)
      .reduce((sum, q) => sum + (Number(q.totalMargin) || 0), 0);
    const averageQuoteValue = totalQuotes > 0 ? totalQuotesValue / totalQuotes : 0;

    // Taux de conversion
    const leadToOpportunityRate = totalLeads > 0 ? (totalOpportunities / totalLeads) * 100 : 0;
    const opportunityToQuoteRate = totalOpportunities > 0 ? (totalQuotes / totalOpportunities) * 100 : 0;
    const quoteAcceptanceRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;
    const overallConversionRate = totalLeads > 0 ? (acceptedQuotes / totalLeads) * 100 : 0;

    // Activités
    const activities = await this.activityRepository.find({
      where: {
        assignedTo: commercialId,
        ...(filters.startDate && filters.endDate && {
          scheduledAt: Between(new Date(filters.startDate), new Date(filters.endDate)),
        }),
      },
    });

    return {
      commercialId,
      commercialName: `${commercial.prenom} ${commercial.nom}`,
      commercialEmail: commercial.email,
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      lostLeads,
      totalOpportunities,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      totalOpportunityValue,
      wonOpportunityValue,
      totalQuotes,
      draftQuotes,
      sentQuotes,
      acceptedQuotes,
      rejectedQuotes,
      totalQuotesValue,
      acceptedQuotesValue,
      totalMargin,
      acceptedMargin,
      averageQuoteValue,
      leadToOpportunityRate,
      opportunityToQuoteRate,
      quoteAcceptanceRate,
      overallConversionRate,
      averageResponseTime: 0, // À calculer avec les activités
      activitiesCount: activities.length,
    };
  }

  /**
   * Générer un rapport détaillé avec tous les prospects, opportunités et cotations
   */
  async generateDetailedReport(filters: ReportFilterDto): Promise<DetailedReport> {
    const globalStats = await this.generateGlobalReport(filters);
    
    // Rapports par prospect
    const prospectReports = await this.generateProspectReports(filters);
    
    // Rapports par opportunité
    const opportunityReports = await this.generateOpportunityReports(filters);
    
    // Rapports par cotation
    const quoteReports = await this.generateQuoteReports(filters);

    return {
      globalStats,
      prospectReports,
      opportunityReports,
      quoteReports,
    };
  }

  /**
   * Générer des rapports par prospect
   */
  async generateProspectReports(filters: ReportFilterDto): Promise<ProspectReport[]> {
    const whereClause: any = {};
    
    if (filters.commercialId) {
      whereClause.assignedToId = filters.commercialId;
    } else if (filters.commercialIds && filters.commercialIds.length > 0) {
      whereClause.assignedToId = In(filters.commercialIds);
    }
    
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }
    
    if (filters.status) {
      whereClause.status = filters.status;
    }

    const leads = await this.leadRepository.find({
      where: whereClause,
      relations: ['assignedTo'],
      order: { createdAt: 'DESC' },
    });

    const prospectReports: ProspectReport[] = [];

    for (const lead of leads) {
      // Opportunités liées
      const opportunities = await this.opportunityRepository.find({
        where: { leadId: lead.id },
      });

      const opportunitiesCount = opportunities.length;
      const totalOpportunityValue = opportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0);

      // Cotations liées (via lead ou opportunités)
      const quotes = await this.quoteRepository.find({
        where: [
          { leadId: lead.id },
          { opportunityId: In(opportunities.map(o => o.id)) },
        ],
      });

      const quotesCount = quotes.length;
      const totalQuotesValue = quotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
      const acceptedQuotesValue = quotes
        .filter(q => q.status === QuoteStatus.ACCEPTED)
        .reduce((sum, q) => sum + (Number(q.total) || 0), 0);

      // Dernière activité
      const lastActivity = await this.activityRepository.findOne({
        where: { leadId: lead.id },
        order: { scheduledAt: 'DESC' },
      });

      prospectReports.push({
        leadId: lead.id,
        leadName: lead.fullName,
        leadEmail: lead.email,
        leadPhone: lead.phone,
        company: lead.company,
        source: lead.source,
        status: lead.status,
        createdAt: lead.createdAt,
        assignedTo: lead.assignedTo ? `${lead.assignedTo.prenom} ${lead.assignedTo.nom}` : 'Non assigné',
        opportunitiesCount,
        totalOpportunityValue,
        quotesCount,
        totalQuotesValue,
        acceptedQuotesValue,
        lastActivityDate: lastActivity?.scheduledAt,
        lastActivityType: lastActivity?.type,
      });
    }

    return prospectReports;
  }

  /**
   * Générer des rapports par opportunité
   */
  async generateOpportunityReports(filters: ReportFilterDto): Promise<OpportunityReport[]> {
    const whereClause: any = {};
    
    if (filters.commercialId) {
      whereClause.assignedToId = filters.commercialId;
    } else if (filters.commercialIds && filters.commercialIds.length > 0) {
      whereClause.assignedToId = In(filters.commercialIds);
    }
    
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }
    
    if (filters.opportunityStage) {
      whereClause.stage = filters.opportunityStage;
    }

    const opportunities = await this.opportunityRepository.find({
      where: whereClause,
      relations: ['assignedTo', 'lead'],
      order: { createdAt: 'DESC' },
    });

    const opportunityReports: OpportunityReport[] = [];

    for (const opportunity of opportunities) {
      // Cotations liées
      const quotes = await this.quoteRepository.find({
        where: { opportunityId: opportunity.id },
      });

      const quotesCount = quotes.length;
      const totalQuotesValue = quotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
      const acceptedQuotesValue = quotes
        .filter(q => q.status === QuoteStatus.ACCEPTED)
        .reduce((sum, q) => sum + (Number(q.total) || 0), 0);

      opportunityReports.push({
        opportunityId: opportunity.id,
        title: opportunity.title,
        stage: opportunity.stage,
        value: Number(opportunity.value) || 0,
        probability: opportunity.probability,
        expectedCloseDate: opportunity.expectedCloseDate,
        assignedTo: opportunity.assignedTo 
          ? `${opportunity.assignedTo.prenom} ${opportunity.assignedTo.nom}` 
          : 'Non assigné',
        quotesCount,
        totalQuotesValue,
        acceptedQuotesValue,
        leadName: opportunity.lead?.fullName || 'N/A',
        leadCompany: opportunity.lead?.company || 'N/A',
        createdAt: opportunity.createdAt,
      });
    }

    return opportunityReports;
  }

  /**
   * Générer des rapports par cotation
   */
  async generateQuoteReports(filters: ReportFilterDto): Promise<QuoteReport[]> {
    const whereClause: any = {};
    
    if (filters.commercialId) {
      whereClause.commercialId = filters.commercialId;
    } else if (filters.commercialIds && filters.commercialIds.length > 0) {
      whereClause.commercialId = In(filters.commercialIds);
    }
    
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }
    
    if (filters.quoteStatus) {
      whereClause.status = filters.quoteStatus;
    }

    const quotes = await this.quoteRepository.find({
      where: whereClause,
      relations: ['commercial', 'creator', 'opportunity', 'lead'],
      order: { createdAt: 'DESC' },
    });

    const quoteReports: QuoteReport[] = [];

    for (const quote of quotes) {
      const marginPercentage = quote.totalOffers > 0 
        ? ((quote.totalMargin / quote.totalOffers) * 100) 
        : 0;

      // Commercial assigné (pas créateur car peut être administratif)
      let assignedCommercial = 'N/A';
      if (quote.commercial) {
        assignedCommercial = `${quote.commercial.prenom} ${quote.commercial.nom}`;
      }

      quoteReports.push({
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        title: quote.title,
        clientName: quote.clientName,
        clientCompany: quote.clientCompany,
        clientEmail: quote.clientEmail,
        subtotal: Number(quote.subtotal) || 0,
        taxAmount: Number(quote.taxAmount) || 0,
        total: Number(quote.total) || 0,
        freightPurchased: Number(quote.freightPurchased) || 0,
        freightOffered: Number(quote.freightOffered) || 0,
        freightMargin: Number(quote.freightMargin) || 0,
        additionalCostsPurchased: Number(quote.additionalCostsPurchased) || 0,
        additionalCostsOffered: Number(quote.additionalCostsOffered) || 0,
        totalMargin: Number(quote.totalMargin) || 0,
        marginPercentage,
        leadId: quote.leadId,
        opportunityId: quote.opportunityId,
        assignedCommercial,
        createdAt: quote.createdAt,
        sentAt: quote.sentAt,
        acceptedAt: quote.acceptedAt,
        rejectedAt: quote.rejectedAt,
        validUntil: quote.validUntil,
      });
    }

    return quoteReports;
  }

  /**
   * Obtenir les statistiques financières globales
   */
  async getFinancialStats(filters: ReportFilterDto) {
    const whereClause: any = {};
    
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }

    if (filters.commercialId) {
      whereClause.createdBy = filters.commercialId;
    } else if (filters.commercialIds && filters.commercialIds.length > 0) {
      whereClause.createdBy = In(filters.commercialIds);
    }

    const quotes = await this.quoteRepository.find({ where: whereClause });

    const totalRevenue = quotes
      .filter(q => q.status === QuoteStatus.ACCEPTED)
      .reduce((sum, q) => sum + (Number(q.total) || 0), 0);

    const totalMargin = quotes
      .filter(q => q.status === QuoteStatus.ACCEPTED)
      .reduce((sum, q) => sum + (Number(q.totalMargin) || 0), 0);

    const averageMarginRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalMargin,
      averageMarginRate,
      quotesCount: quotes.length,
      acceptedQuotesCount: quotes.filter(q => q.status === QuoteStatus.ACCEPTED).length,
    };
  }

  /**
   * Générer les rapports d'activités par commercial
   */
  async generateActivityReports(filters: ReportFilterDto): Promise<ActivityReport[]> {
    // Récupérer tous les commerciaux actifs
    const commercialsQuery: any = { statut: 'actif', role: 'commercial' };
    const commercials = await this.personnelRepository.find({
      where: commercialsQuery,
    });

    const activityReports: ActivityReport[] = [];

    for (const commercial of commercials) {
      // Filtrer les activités par commercial et période
      const activityWhereClause: any = {
        assignedTo: commercial.id,
      };

      if (filters.startDate && filters.endDate) {
        activityWhereClause.createdAt = Between(
          new Date(filters.startDate),
          new Date(filters.endDate),
        );
      }

      // Récupérer toutes les activités du commercial
      const activities = await this.activityRepository.find({
        where: activityWhereClause,
        order: { createdAt: 'DESC' },
      });

      const totalActivities = activities.length;

      // Compter par type
      const callsCount = activities.filter(a => a.type === 'call').length;
      const emailsCount = activities.filter(a => a.type === 'email').length;
      const meetingsCount = activities.filter(a => a.type === 'meeting').length;
      const tasksCount = activities.filter(a => a.type === 'task').length;
      const otherActivitiesCount = activities.filter(
        a => !['call', 'email', 'meeting', 'task'].includes(a.type),
      ).length;

      // Compter par statut
      const completedActivities = activities.filter(a => a.status === 'completed').length;
      const pendingActivities = activities.filter(a => a.status === 'scheduled' || a.status === 'in_progress').length;
      const cancelledActivities = activities.filter(a => a.status === 'cancelled').length;

      // Dernière activité
      const lastActivity = activities[0];
      const lastActivityDate = lastActivity?.createdAt;
      const lastActivityType = lastActivity?.type;
      const lastActivityDescription = lastActivity?.description;

      // Calculer la moyenne d'activités par semaine
      let averageActivitiesPerWeek = 0;
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
        averageActivitiesPerWeek = diffWeeks > 0 ? totalActivities / diffWeeks : 0;
      }

      // Déterminer le taux d'activité
      let activityRate: 'high' | 'medium' | 'low' | 'inactive' = 'inactive';
      if (averageActivitiesPerWeek >= 10) {
        activityRate = 'high';
      } else if (averageActivitiesPerWeek >= 5) {
        activityRate = 'medium';
      } else if (averageActivitiesPerWeek >= 1) {
        activityRate = 'low';
      }

      activityReports.push({
        commercialId: commercial.id,
        commercialName: `${commercial.prenom} ${commercial.nom}`,
        commercialEmail: commercial.email,
        totalActivities,
        callsCount,
        emailsCount,
        meetingsCount,
        tasksCount,
        otherActivitiesCount,
        lastActivityDate,
        lastActivityType,
        lastActivityDescription,
        averageActivitiesPerWeek: Math.round(averageActivitiesPerWeek * 10) / 10,
        activityRate,
        completedActivities,
        pendingActivities,
        cancelledActivities,
      });
    }

    // Trier par nombre d'activités décroissant
    return activityReports.sort((a, b) => b.totalActivities - a.totalActivities);
  }

  /**
   * Générer les rapports par client
   */
  async generateClientReports(filters: ReportFilterDto): Promise<ClientReport[]> {
    // Récupérer tous les clients
    const clients = await this.clientRepository.find({
      relations: ['contacts'],
      order: { created_at: 'DESC' },
    });

    // Récupérer tous les commerciaux pour optimiser les requêtes
    const allCommercials = await this.personnelRepository.find({
      where: { role: 'commercial', statut: 'actif' },
    });
    
    // Créer un map username -> commercial pour accès rapide
    const commercialMap = new Map(
      allCommercials.map(c => [c.username, c])
    );

    // Récupérer toutes les cotations en une seule requête
    const quoteWhereClause: any = {};
    if (filters.startDate && filters.endDate) {
      quoteWhereClause.createdAt = Between(
        new Date(filters.startDate),
        new Date(filters.endDate),
      );
    }

    const allQuotes = await this.quoteRepository.find({
      where: quoteWhereClause,
      order: { createdAt: 'DESC' },
    });

    // Grouper les cotations par clientId
    const quotesByClient = new Map<number, any[]>();
    allQuotes.forEach(quote => {
      if (!quotesByClient.has(quote.clientId)) {
        quotesByClient.set(quote.clientId, []);
      }
      quotesByClient.get(quote.clientId)!.push(quote);
    });

    const clientReports: ClientReport[] = [];

    for (const client of clients) {
      // Récupérer les cotations du client depuis le map
      const quotes = quotesByClient.get(client.id) || [];

      const quotesCount = quotes.length;
      const totalQuotesValue = quotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
      const acceptedQuotesValue = quotes
        .filter(q => q.status === QuoteStatus.ACCEPTED)
        .reduce((sum, q) => sum + (Number(q.total) || 0), 0);
      
      const acceptedQuotesCount = quotes.filter(q => q.status === QuoteStatus.ACCEPTED).length;
      const rejectedQuotesCount = quotes.filter(q => q.status === QuoteStatus.REJECTED).length;
      const pendingQuotesCount = quotes.filter(q => 
        q.status === QuoteStatus.SENT || q.status === QuoteStatus.DRAFT
      ).length;

      const totalMargin = quotes
        .filter(q => q.status === QuoteStatus.ACCEPTED)
        .reduce((sum, q) => sum + (Number(q.totalMargin) || 0), 0);

      const averageQuoteValue = quotesCount > 0 ? totalQuotesValue / quotesCount : 0;
      const acceptanceRate = quotesCount > 0 ? (acceptedQuotesCount / quotesCount) * 100 : 0;

      // Dernière cotation
      const lastQuote = quotes[0];

      // Récupérer le commercial via charge_com (username du commercial)
      let assignedCommercial = 'Non assigné';
      let commercialId = 0;
      
      if (client.charge_com) {
        const commercial = commercialMap.get(client.charge_com);
        
        if (commercial) {
          assignedCommercial = `${commercial.prenom} ${commercial.nom}`;
          commercialId = commercial.id;
        }
      }

      // Filtrer si commercial spécifié
      if (filters.commercialId && commercialId !== filters.commercialId) {
        continue;
      }

      // Récupérer les informations de contact depuis contact_client
      const contact = client.contacts && client.contacts.length > 0 ? client.contacts[0] : null;
      const clientEmail = contact?.mail1 || contact?.mail2 || '';
      const clientPhone = contact?.tel1 || contact?.tel2 || '';

      clientReports.push({
        clientId: client.id,
        clientName: client.interlocuteur || client.nom || `Client ${client.id}`,
        clientEmail,
        clientPhone,
        company: client.nom || '',
        clientType: client.type_client || 'particulier',
        createdAt: client.created_at,
        assignedCommercial,
        commercialId,
        quotesCount,
        totalQuotesValue,
        acceptedQuotesValue,
        acceptedQuotesCount,
        rejectedQuotesCount,
        pendingQuotesCount,
        totalMargin,
        averageQuoteValue,
        acceptanceRate,
        lastQuoteDate: lastQuote?.createdAt,
        lastQuoteNumber: lastQuote?.quoteNumber,
        lastQuoteStatus: lastQuote?.status,
      });
    }

    // Trier par CA accepté décroissant
    return clientReports.sort((a, b) => b.acceptedQuotesValue - a.acceptedQuotesValue);
  }
}
