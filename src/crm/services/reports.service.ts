import { Injectable } from '@nestjs/common';
import { DatabaseConnectionService } from '../../common/database-connection.service';
import { EmailService } from '../../services/email.service';
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
    private databaseConnectionService: DatabaseConnectionService,
    private emailService: EmailService,
  ) {}

  /**
   * 🎯 Helper: Crée une plage de dates inclusive (début à 00:00:00, fin à 23:59:59)
   */
  private createDateRange(startDateStr: string, endDateStr: string) {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0); // Début de la journée
    
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999); // Fin de la journée
    
    return { start: startDate, end: endDate };
  }

  /**
   * Générer un rapport global CRM
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async generateGlobalReport(databaseName: string, organisationId: number, filters: ReportFilterDto): Promise<GlobalReport> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer tous les commerciaux ou filtrer
    let commercialsQuery = `SELECT * FROM personnel WHERE role = 'commercial'`;
    const params: any[] = [];
    
    if (filters.commercialId) {
      commercialsQuery = `SELECT * FROM personnel WHERE id = $1`;
      params.push(filters.commercialId);
    } else if (filters.commercialIds && filters.commercialIds.length > 0) {
      commercialsQuery = `SELECT * FROM personnel WHERE id = ANY($1)`;
      params.push(filters.commercialIds);
    }
    
    const commercials = await connection.query(commercialsQuery, params);

    // Générer les rapports par commercial
    const commercialReports: CommercialReport[] = [];
    for (const commercial of commercials) {
      const report = await this.generateCommercialReport(databaseName, organisationId, commercial.id, filters);
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
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async generateCommercialReport(databaseName: string, organisationId: number, commercialId: number, filters: ReportFilterDto): Promise<CommercialReport> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const commercial = await connection.query(
      `SELECT * FROM personnel WHERE id = $1`,
      [commercialId]
    );

    if (!commercial || commercial.length === 0) {
      throw new Error(`Commercial avec ID ${commercialId} introuvable`);
    }

    const commercialData = commercial[0];
    
    // Construction des conditions de filtrage
    let dateCondition = '';
    const params: any[] = [commercialId];
    let paramIndex = 2;
    
    if (filters.startDate && filters.endDate) {
      const dateRange = this.createDateRange(filters.startDate, filters.endDate);
      dateCondition = ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(dateRange.start, dateRange.end);
      paramIndex += 2;
    }

    // Prospects - utiliser assigned_to_ids (array) au lieu de assignedToId
    const leads = await connection.query(
      `SELECT * FROM crm_leads 
       WHERE is_archived = false 
         AND $1 = ANY(assigned_to_ids)
         ${dateCondition}`,
      params
    );

    const totalLeads = leads.length;
    const newLeads = leads.filter(l => l.status === 'new').length;
    const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
    const convertedLeads = leads.filter(l => l.status === 'converted').length;
    const lostLeads = leads.filter(l => l.status === 'lost').length;

    // Opportunités - utiliser assigned_to_ids (array)
    const opportunities = await connection.query(
      `SELECT * FROM crm_opportunities 
       WHERE deleted_at IS NULL 
         AND is_archived = false
         AND $1 = ANY(assigned_to_ids)
         ${dateCondition}`,
      params
    );

    const totalOpportunities = opportunities.length;
    const openOpportunities = opportunities.filter(o => 
      !['closed_won', 'closed_lost'].includes(o.stage)
    ).length;
    const wonOpportunities = opportunities.filter(o => o.stage === 'closed_won').length;
    const lostOpportunities = opportunities.filter(o => o.stage === 'closed_lost').length;
    const totalOpportunityValue = opportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
    const wonOpportunityValue = opportunities
      .filter(o => o.stage === 'closed_won')
      .reduce((sum, o) => sum + (Number(o.value) || 0), 0);

    // Cotations - utiliser commercial_ids (array) au lieu de commercialId
    const quotesParams = [...params];
    const quotes = await connection.query(
      `SELECT * FROM crm_quotes 
       WHERE $1 = ANY(commercial_ids)
         ${dateCondition}`,
      quotesParams
    );

    const totalQuotes = quotes.length;
    const draftQuotes = quotes.filter(q => q.status === 'draft').length;
    const sentQuotes = quotes.filter(q => q.status === 'sent').length;
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
    const rejectedQuotes = quotes.filter(q => q.status === 'rejected').length;

    // Financier
    const totalQuotesValue = quotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
    const acceptedQuotesValue = quotes
      .filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + (Number(q.total) || 0), 0);
    const totalMargin = quotes.reduce((sum, q) => sum + (Number(q.total_margin) || 0), 0);
    const acceptedMargin = quotes
      .filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + (Number(q.total_margin) || 0), 0);
    const averageQuoteValue = totalQuotes > 0 ? totalQuotesValue / totalQuotes : 0;

    // Taux de conversion
    const leadToOpportunityRate = totalLeads > 0 ? (totalOpportunities / totalLeads) * 100 : 0;
    const opportunityToQuoteRate = totalOpportunities > 0 ? (totalQuotes / totalOpportunities) * 100 : 0;
    const quoteAcceptanceRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;
    const overallConversionRate = totalLeads > 0 ? (acceptedQuotes / totalLeads) * 100 : 0;

    // Activités
    const activities = await connection.query(
      `SELECT * FROM crm_activities 
       WHERE assigned_to = $1
         ${dateCondition}`,
      params
    );

    return {
      commercialId,
      commercialName: `${commercialData.prenom} ${commercialData.nom}`,
      commercialEmail: commercialData.email,
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
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async generateDetailedReport(databaseName: string, organisationId: number, filters: ReportFilterDto): Promise<DetailedReport> {
    const globalStats = await this.generateGlobalReport(databaseName, organisationId, filters);
    
    // Rapports par prospect
    const prospectReports = await this.generateProspectReports(databaseName, organisationId, filters);
    
    // Rapports par opportunité
    const opportunityReports = await this.generateOpportunityReports(databaseName, organisationId, filters);
    
    // Rapports par cotation
    const quoteReports = await this.generateQuoteReports(databaseName, organisationId, filters);

    return {
      globalStats,
      prospectReports,
      opportunityReports,
      quoteReports,
    };
  }

  /**
   * Générer des rapports par prospect
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async generateProspectReports(databaseName: string, organisationId: number, filters: ReportFilterDto): Promise<ProspectReport[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    let query = `
      SELECT l.*, 
             p.nom as assigned_to_name, p.prenom as assigned_to_prenom
      FROM crm_leads l
      LEFT JOIN personnel p ON l.assigned_to = p.id
      WHERE l.is_archived = false
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filters.commercialId) {
      query += ` AND $${paramIndex} = ANY(l.assigned_to_ids)`;
      params.push(filters.commercialId);
      paramIndex++;
    } else if (filters.commercialIds && filters.commercialIds.length > 0) {
      query += ` AND l.assigned_to_ids && $${paramIndex}`;
      params.push(filters.commercialIds);
      paramIndex++;
    }
    
    if (filters.startDate && filters.endDate) {
      const dateRange = this.createDateRange(filters.startDate, filters.endDate);
      query += ` AND l.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(dateRange.start, dateRange.end);
      paramIndex += 2;
    }
    
    if (filters.status) {
      query += ` AND l.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }
    
    query += ` ORDER BY l.created_at DESC`;
    
    const leads = await connection.query(query, params);

    const prospectReports: ProspectReport[] = [];

    for (const lead of leads) {
      // Opportunités liées
      const opportunities = await connection.query(
        `SELECT * FROM crm_opportunities WHERE lead_id = $1 AND deleted_at IS NULL`,
        [lead.id]
      );

      const opportunitiesCount = opportunities.length;
      const totalOpportunityValue = opportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0);

      // Cotations liées (via lead ou opportunités)
      const opportunityIds = opportunities.map(o => o.id);
      let quotesQuery = `SELECT * FROM crm_quotes WHERE lead_id = $1`;
      const quotesParams = [lead.id];
      
      if (opportunityIds.length > 0) {
        quotesQuery += ` OR opportunity_id = ANY($2)`;
        quotesParams.push(opportunityIds);
      }
      
      const quotes = await connection.query(quotesQuery, quotesParams);

      const quotesCount = quotes.length;
      const totalQuotesValue = quotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
      const acceptedQuotesValue = quotes
        .filter(q => q.status === 'accepted')
        .reduce((sum, q) => sum + (Number(q.total) || 0), 0);

      // Dernière activité
      const lastActivityResult = await connection.query(
        `SELECT * FROM crm_activities WHERE lead_id = $1 ORDER BY scheduled_at DESC LIMIT 1`,
        [lead.id]
      );
      const lastActivity = lastActivityResult[0];

      prospectReports.push({
        leadId: lead.id,
        leadName: lead.full_name,
        leadEmail: lead.email,
        leadPhone: lead.phone,
        company: lead.company,
        source: lead.source,
        status: lead.status,
        createdAt: lead.created_at,
        assignedTo: lead.assigned_to_name ? `${lead.assigned_to_prenom} ${lead.assigned_to_name}` : 'Non assigné',
        opportunitiesCount,
        totalOpportunityValue,
        quotesCount,
        totalQuotesValue,
        acceptedQuotesValue,
        lastActivityDate: lastActivity?.scheduled_at,
        lastActivityType: lastActivity?.type,
      });
    }

    return prospectReports;
  }

  /**
   * Générer des rapports par opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async generateOpportunityReports(databaseName: string, organisationId: number, filters: ReportFilterDto): Promise<OpportunityReport[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    let query = `
      SELECT o.*, 
             p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
             l.full_name as lead_name, l.company as lead_company
      FROM crm_opportunities o
      LEFT JOIN personnel p ON o.assigned_to = p.id
      LEFT JOIN crm_leads l ON o.lead_id = l.id
      WHERE o.deleted_at IS NULL AND o.is_archived = false
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filters.commercialId) {
      query += ` AND $${paramIndex} = ANY(o.assigned_to_ids)`;
      params.push(filters.commercialId);
      paramIndex++;
    } else if (filters.commercialIds && filters.commercialIds.length > 0) {
      query += ` AND o.assigned_to_ids && $${paramIndex}`;
      params.push(filters.commercialIds);
      paramIndex++;
    }
    
    if (filters.startDate && filters.endDate) {
      const dateRange = this.createDateRange(filters.startDate, filters.endDate);
      query += ` AND o.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(dateRange.start, dateRange.end);
      paramIndex += 2;
    }
    
    if (filters.opportunityStage) {
      query += ` AND o.stage = $${paramIndex}`;
      params.push(filters.opportunityStage);
      paramIndex++;
    }
    
    query += ` ORDER BY o.created_at DESC`;
    
    const opportunities = await connection.query(query, params);

    const opportunityReports: OpportunityReport[] = [];

    for (const opportunity of opportunities) {
      // Cotations liées
      const quotes = await connection.query(
        `SELECT * FROM crm_quotes WHERE opportunity_id = $1`,
        [opportunity.id]
      );

      const quotesCount = quotes.length;
      const totalQuotesValue = quotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
      const acceptedQuotesValue = quotes
        .filter(q => q.status === 'accepted')
        .reduce((sum, q) => sum + (Number(q.total) || 0), 0);

      opportunityReports.push({
        opportunityId: opportunity.id,
        title: opportunity.title,
        stage: opportunity.stage,
        value: Number(opportunity.value) || 0,
        probability: opportunity.probability,
        expectedCloseDate: opportunity.expected_close_date,
        assignedTo: opportunity.assigned_to_name 
          ? `${opportunity.assigned_to_prenom} ${opportunity.assigned_to_name}` 
          : 'Non assigné',
        quotesCount,
        totalQuotesValue,
        acceptedQuotesValue,
        leadName: opportunity.lead_name || 'N/A',
        leadCompany: opportunity.lead_company || 'N/A',
        createdAt: opportunity.created_at,
      });
    }

    return opportunityReports;
  }

  /**
   * Générer des rapports par cotation
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async generateQuoteReports(databaseName: string, organisationId: number, filters: ReportFilterDto): Promise<QuoteReport[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    let query = `
      SELECT q.*
      FROM crm_quotes q
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filters.commercialId) {
      query += ` AND $${paramIndex} = ANY(q.commercial_ids)`;
      params.push(filters.commercialId);
      paramIndex++;
    } else if (filters.commercialIds && filters.commercialIds.length > 0) {
      query += ` AND q.commercial_ids && $${paramIndex}`;
      params.push(filters.commercialIds);
      paramIndex++;
    }
    
    if (filters.startDate && filters.endDate) {
      const dateRange = this.createDateRange(filters.startDate, filters.endDate);
      query += ` AND q.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(dateRange.start, dateRange.end);
      paramIndex += 2;
    }
    
    if (filters.quoteStatus) {
      query += ` AND q.status = $${paramIndex}`;
      params.push(filters.quoteStatus);
      paramIndex++;
    }
    
    query += ` ORDER BY q.created_at DESC`;
    
    const quotes = await connection.query(query, params);

    const quoteReports: QuoteReport[] = [];

    for (const quote of quotes) {
      const marginPercentage = quote.total_offers > 0 
        ? ((quote.total_margin / quote.total_offers) * 100) 
        : 0;

      // Commercial principal assigné
      let assignedCommercial = 'N/A';
      if (quote.commercial_id) {
        const commercial = await connection.query(
          `SELECT * FROM personnel WHERE id = $1`,
          [quote.commercial_id]
        );
        if (commercial && commercial.length > 0) {
          assignedCommercial = `${commercial[0].prenom} ${commercial[0].nom}`;
        }
      }

      // ✅ Charger les commerciaux multiples assignés avec leurs noms complets
      let commercialIds = [];
      if (quote.commercial_ids && Array.isArray(quote.commercial_ids)) {
        const commercials = await connection.query(
          `SELECT id, nom, prenom FROM personnel WHERE id = ANY($1)`,
          [quote.commercial_ids]
        );
        
        // Créer un tableau d'objets avec nom complet
        commercialIds = commercials.map(c => ({
          id: c.id,
          nom: c.nom,
          prenom: c.prenom,
          nomComplet: `${c.prenom} ${c.nom}`,
        }));
      }
      
      // Charger les items de la cotation
      const items = await connection.query(
        `SELECT * FROM crm_quote_items WHERE quote_id = $1`,
        [quote.id]
      );

      quoteReports.push({
        quoteId: quote.id,
        quoteNumber: quote.quote_number,
        status: quote.status,
        title: quote.title,
        clientName: quote.client_name,
        clientCompany: quote.client_company,
        clientEmail: quote.client_email,
        subtotal: Number(quote.subtotal) || 0,
        taxAmount: Number(quote.tax_amount) || 0,
        total: Number(quote.total) || 0,
        freightPurchased: Number(quote.freight_purchased) || 0,
        freightOffered: Number(quote.freight_offered) || 0,
        freightMargin: Number(quote.freight_margin) || 0,
        additionalCostsPurchased: Number(quote.additional_costs_purchased) || 0,
        additionalCostsOffered: Number(quote.additional_costs_offered) || 0,
        totalMargin: Number(quote.total_margin) || 0,
        marginPercentage,
        leadId: quote.lead_id,
        opportunityId: quote.opportunity_id,
        assignedCommercial,
        commercialIds, // ✅ Ajouter les commerciaux multiples avec leurs noms complets
        items: items || [], // ✅ Ajouter les items pour le calcul de TVA par ligne côté frontend
        createdAt: quote.created_at,
        sentAt: quote.sent_at,
        acceptedAt: quote.accepted_at,
        rejectedAt: quote.rejected_at,
        validUntil: quote.valid_until,
      });
    }

    return quoteReports;
  }

  /**
   * Obtenir les statistiques financières globales
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getFinancialStats(databaseName: string, organisationId: number, filters: ReportFilterDto) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    let query = `SELECT * FROM crm_quotes WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filters.startDate && filters.endDate) {
      const dateRange = this.createDateRange(filters.startDate, filters.endDate);
      query += ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(dateRange.start, dateRange.end);
      paramIndex += 2;
    }

    if (filters.commercialId) {
      query += ` AND $${paramIndex} = ANY(commercial_ids)`;
      params.push(filters.commercialId);
      paramIndex++;
    } else if (filters.commercialIds && filters.commercialIds.length > 0) {
      query += ` AND commercial_ids && $${paramIndex}`;
      params.push(filters.commercialIds);
      paramIndex++;
    }

    const quotes = await connection.query(query, params);

    const totalRevenue = quotes
      .filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + (Number(q.total) || 0), 0);

    const totalMargin = quotes
      .filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + (Number(q.total_margin) || 0), 0);

    const averageMarginRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalMargin,
      averageMarginRate,
      quotesCount: quotes.length,
      acceptedQuotesCount: quotes.filter(q => q.status === 'accepted').length,
    };
  }

  /**
   * Générer les rapports d'activités par commercial
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async generateActivityReports(databaseName: string, organisationId: number, filters: ReportFilterDto): Promise<ActivityReport[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer tous les commerciaux actifs ou filtrer par commercialId
    let commercialsQuery = `SELECT * FROM personnel WHERE statut = 'actif' AND role = 'commercial'`;
    const commercialsParams: any[] = [];
    
    // ✨ Filtrer par commercial si spécifié
    if (filters.commercialId) {
      commercialsQuery = `SELECT * FROM personnel WHERE id = $1`;
      commercialsParams.push(filters.commercialId);
    }
    
    const commercials = await connection.query(commercialsQuery, commercialsParams);

    const activityReports: ActivityReport[] = [];

    for (const commercial of commercials) {
      // Filtrer les activités par commercial et période
      let activityQuery = `SELECT * FROM crm_activities WHERE assigned_to = $1`;
      const activityParams: any[] = [commercial.id];
      let paramIndex = 2;

      if (filters.startDate && filters.endDate) {
        const dateRange = this.createDateRange(filters.startDate, filters.endDate);
        activityQuery += ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        activityParams.push(dateRange.start, dateRange.end);
        paramIndex += 2;
      }
      
      activityQuery += ` ORDER BY created_at DESC`;

      // Récupérer toutes les activités du commercial
      const activities = await connection.query(activityQuery, activityParams);

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
      const lastActivityDate = lastActivity?.created_at;
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
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async generateClientReports(databaseName: string, organisationId: number, filters: ReportFilterDto): Promise<ClientReport[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer tous les clients avec leurs contacts
    const clients = await connection.query(
      `SELECT c.*, 
              cc.mail1, cc.mail2, cc.tel1, cc.tel2
       FROM client c
       LEFT JOIN contact_client cc ON c.id = cc.id_client
       ORDER BY c.created_at DESC`
    );

    // Récupérer tous les commerciaux pour optimiser les requêtes
    const allCommercials = await connection.query(
      `SELECT * FROM personnel WHERE role = 'commercial' AND statut = 'actif'`
    );
    
    // Créer un map username -> commercial pour accès rapide
    const commercialMap = new Map(
      allCommercials.map(c => [c.nom_utilisateur, c])
    );

    // Récupérer toutes les cotations en une seule requête
    let quoteQuery = `SELECT * FROM crm_quotes`;
    const quoteParams: any[] = [];
    let paramIndex = 1;
    
    if (filters.startDate && filters.endDate) {
      const dateRange = this.createDateRange(filters.startDate, filters.endDate);
      quoteQuery += ` WHERE created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      quoteParams.push(dateRange.start, dateRange.end);
      paramIndex += 2;
    }
    
    quoteQuery += ` ORDER BY created_at DESC`;

    const allQuotes = await connection.query(quoteQuery, quoteParams);

    // Grouper les cotations par clientId
    const quotesByClient = new Map<number, any[]>();
    allQuotes.forEach(quote => {
      if (!quotesByClient.has(quote.client_id)) {
        quotesByClient.set(quote.client_id, []);
      }
      quotesByClient.get(quote.client_id)!.push(quote);
    });

    const clientReports: ClientReport[] = [];

    for (const client of clients) {
      // Récupérer les cotations du client depuis le map
      const quotes = quotesByClient.get(client.id) || [];

      const quotesCount = quotes.length;
      const totalQuotesValue = quotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
      const acceptedQuotesValue = quotes
        .filter(q => q.status === 'accepted')
        .reduce((sum, q) => sum + (Number(q.total) || 0), 0);
      
      const acceptedQuotesCount = quotes.filter(q => q.status === 'accepted').length;
      const rejectedQuotesCount = quotes.filter(q => q.status === 'rejected').length;
      const pendingQuotesCount = quotes.filter(q => 
        q.status === 'sent' || q.status === 'draft'
      ).length;

      const totalMargin = quotes
        .filter(q => q.status === 'accepted')
        .reduce((sum, q) => sum + (Number(q.total_margin) || 0), 0);

      const averageQuoteValue = quotesCount > 0 ? totalQuotesValue / quotesCount : 0;
      const acceptanceRate = quotesCount > 0 ? (acceptedQuotesCount / quotesCount) * 100 : 0;

      // Dernière cotation
      const lastQuote = quotes[0];

      // Récupérer le commercial via charge_com (username du commercial)
      let assignedCommercial = 'Non assigné';
      let commercialId = 0;
      
      if (client.charge_com) {
        const commercial: any = commercialMap.get(client.charge_com);
        
        if (commercial) {
          assignedCommercial = `${commercial.prenom} ${commercial.nom}`;
          commercialId = commercial.id;
        }
      }

      // Filtrer si commercial spécifié
      if (filters.commercialId && commercialId !== filters.commercialId) {
        continue;
      }

      // Récupérer les informations de contact
      const clientEmail = client.mail1 || client.mail2 || '';
      const clientPhone = client.tel1 || client.tel2 || '';

      clientReports.push({
        clientId: client.id,
        clientName: client.interlocuteur || client.nom || `Client ${client.id}`,
        clientEmail,
        clientPhone,
        company: client.nom || '',
        clientType: client.type_client || 'particulier',
        category: client.categorie || 'local', // Ajout de la catégorie (local/etranger)
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
        lastQuoteDate: lastQuote?.created_at,
        lastQuoteNumber: lastQuote?.quote_number,
        lastQuoteStatus: lastQuote?.status,
      });
    }

    // Trier par CA accepté décroissant
    return clientReports.sort((a, b) => b.acceptedQuotesValue - a.acceptedQuotesValue);
  }

  /**
   * Envoyer un rapport CRM par email
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async sendReportByEmail(
    databaseName: string,
    organisationId: number,
    userId: number,
    emailData: {
      recipientEmail: string;
      ccEmails?: string[];
      subject: string;
      message?: string;
      filters: ReportFilterDto;
      reportType: string;
      format: string;
      reportData?: any;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { recipientEmail, ccEmails, subject, message, filters, reportType, format, reportData } = emailData;

      // Récupérer les données du rapport si non fournies ou régénérer côté backend
      let finalReportData = reportData;
      
      if (!finalReportData || format === 'html' || format === 'link') {
        // Générer les données du rapport côté backend pour s'assurer d'avoir des données fraîches
        finalReportData = await this.generateReportDataForEmail(databaseName, organisationId, filters, reportType);
      }

      let htmlContent: string;

      if (format === 'link') {
        // ✅ SANS TABLE : Encoder les paramètres directement dans l'URL
        const reportParams = {
          startDate: filters.startDate,
          endDate: filters.endDate,
          commercialId: filters.commercialId || null,
          reportType,
          db: databaseName,
          org: organisationId
        };
        
        // Encoder les paramètres en base64url (safe pour URL)
        const encodedParams = Buffer.from(JSON.stringify(reportParams)).toString('base64url');
        
        // Générer l'URL du rapport avec les paramètres encodés (route publique)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const reportUrl = `${frontendUrl}/public/crm/report/${encodedParams}`;
        
        // Date d'expiration informative (le lien est toujours valide tant que les données existent)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Info: 30 jours

        // Générer l'email avec le bouton vers le rapport
        htmlContent = this.generateReportLinkEmailHTML(
          reportType,
          filters,
          reportUrl,
          message,
          expiresAt
        );
      } else {
        // Format HTML intégré ou autres formats
        htmlContent = this.generateReportEmailHTML(
          finalReportData,
          reportType,
          filters,
          message
        );
      }

      // Envoyer l'email via le service email multi-tenant
      await this.emailService.sendEmailMultiTenant(
        organisationId,
        recipientEmail,
        subject,
        htmlContent,
        ccEmails
      );

      return {
        success: true,
        message: `Rapport CRM envoyé avec succès à ${recipientEmail}`
      };
    } catch (error) {
      console.error('Erreur lors de l\'envoi du rapport par email:', error);
      throw error;
    }
  }

  /**
   * Générer les données du rapport pour l'email
   */
  private async generateReportDataForEmail(
    databaseName: string,
    organisationId: number,
    filters: ReportFilterDto,
    reportType: string
  ): Promise<any> {
    const data: any = {
      periodStart: filters.startDate,
      periodEnd: filters.endDate,
      generatedAt: new Date().toISOString()
    };

    switch (reportType) {
      case 'global':
        data.globalReport = await this.generateGlobalReport(databaseName, organisationId, filters);
        break;
      case 'prospects':
        data.prospectReports = await this.generateProspectReports(databaseName, organisationId, filters);
        data.totalProspects = data.prospectReports.length;
        break;
      case 'opportunities':
        data.opportunityReports = await this.generateOpportunityReports(databaseName, organisationId, filters);
        data.totalOpportunities = data.opportunityReports.length;
        data.totalValue = data.opportunityReports.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
        break;
      case 'quotes':
        data.quoteReports = await this.generateQuoteReports(databaseName, organisationId, filters);
        data.totalQuotes = data.quoteReports.length;
        data.totalAmount = data.quoteReports.reduce((sum: number, q: any) => sum + (q.total || 0), 0);
        data.totalMargin = data.quoteReports.reduce((sum: number, q: any) => sum + (q.totalMargin || 0), 0);
        break;
      case 'activities':
        data.activityReports = await this.generateActivityReports(databaseName, organisationId, filters);
        break;
      case 'clients':
        data.clientReports = await this.generateClientReports(databaseName, organisationId, filters);
        data.totalClients = data.clientReports.length;
        break;
      case 'all':
        // Rapport complet
        data.globalReport = await this.generateGlobalReport(databaseName, organisationId, filters);
        data.prospectReports = await this.generateProspectReports(databaseName, organisationId, filters);
        data.opportunityReports = await this.generateOpportunityReports(databaseName, organisationId, filters);
        data.quoteReports = await this.generateQuoteReports(databaseName, organisationId, filters);
        data.activityReports = await this.generateActivityReports(databaseName, organisationId, filters);
        data.clientReports = await this.generateClientReports(databaseName, organisationId, filters);
        break;
    }

    return data;
  }

  /**
   * Générer le HTML du rapport pour l'email
   */
  private generateReportEmailHTML(
    reportData: any,
    reportType: string,
    filters: ReportFilterDto,
    customMessage?: string
  ): string {
    const periodStart = this.formatDate(filters.startDate);
    const periodEnd = this.formatDate(filters.endDate);
    const generatedAt = this.formatDateTime(new Date());

    // En-tête du rapport
    let html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rapport CRM</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
          color: #333;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header .period {
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 30px;
        }
        .message {
          background-color: #E3F2FD;
          border-left: 4px solid #2196F3;
          padding: 15px 20px;
          margin-bottom: 25px;
          border-radius: 0 4px 4px 0;
          font-style: italic;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          border: 1px solid #dee2e6;
        }
        .stat-card.primary {
          background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
          border-color: #90CAF9;
        }
        .stat-card.success {
          background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
          border-color: #A5D6A7;
        }
        .stat-card.warning {
          background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
          border-color: #FFCC80;
        }
        .stat-card.info {
          background: linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 100%);
          border-color: #80DEEA;
        }
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #1565C0;
          margin-bottom: 5px;
        }
        .stat-card.success .stat-value { color: #2E7D32; }
        .stat-card.warning .stat-value { color: #F57C00; }
        .stat-card.info .stat-value { color: #00838F; }
        .stat-label {
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          font-size: 14px;
        }
        th, td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }
        th {
          background-color: #f5f5f5;
          font-weight: 600;
          color: #333;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.5px;
        }
        tr:hover {
          background-color: #f9f9f9;
        }
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #1565C0;
          margin: 30px 0 20px 0;
          padding-bottom: 10px;
          border-bottom: 2px solid #E3F2FD;
        }
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .badge-success { background: #C8E6C9; color: #2E7D32; }
        .badge-warning { background: #FFE0B2; color: #E65100; }
        .badge-info { background: #B3E5FC; color: #0277BD; }
        .badge-danger { background: #FFCDD2; color: #C62828; }
        .badge-secondary { background: #E0E0E0; color: #616161; }
        .amount {
          font-weight: 600;
          color: #2E7D32;
        }
        .amount-negative {
          color: #C62828;
        }
        .footer {
          background-color: #f5f5f5;
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #e0e0e0;
        }
        .percentage {
          font-weight: 600;
        }
        .percentage.high { color: #2E7D32; }
        .percentage.medium { color: #F57C00; }
        .percentage.low { color: #C62828; }
        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }
          th, td {
            padding: 8px 10px;
            font-size: 12px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Rapport CRM</h1>
          <div class="period">
            Période: ${periodStart} - ${periodEnd}
          </div>
        </div>
        <div class="content">
    `;

    // Message personnalisé
    if (customMessage) {
      html += `
        <div class="message">
          ${customMessage}
        </div>
      `;
    }

    // Générer le contenu selon le type de rapport
    switch (reportType) {
      case 'global':
        html += this.generateGlobalReportHTML(reportData.globalReport);
        break;
      case 'prospects':
        html += this.generateProspectReportsHTML(reportData.prospectReports);
        break;
      case 'opportunities':
        html += this.generateOpportunityReportsHTML(reportData.opportunityReports);
        break;
      case 'quotes':
        html += this.generateQuoteReportsHTML(reportData.quoteReports);
        break;
      case 'activities':
        html += this.generateActivityReportsHTML(reportData.activityReports);
        break;
      case 'clients':
        html += this.generateClientReportsHTML(reportData.clientReports);
        break;
      case 'all':
        html += this.generateGlobalReportHTML(reportData.globalReport);
        html += this.generateProspectReportsHTML(reportData.prospectReports);
        html += this.generateOpportunityReportsHTML(reportData.opportunityReports);
        html += this.generateQuoteReportsHTML(reportData.quoteReports);
        html += this.generateClientReportsHTML(reportData.clientReports);
        break;
    }

    // Pied de page
    html += `
        </div>
        <div class="footer">
          <p>Rapport généré automatiquement le ${generatedAt}</p>
          <p>© ${new Date().getFullYear()} - Système CRM</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return html;
  }

  /**
   * Générer le HTML pour le rapport global
   */
  private generateGlobalReportHTML(globalReport: any): string {
    if (!globalReport) return '<p>Aucune donnée disponible</p>';

    return `
      <h2 class="section-title">📈 Vue d'ensemble</h2>
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-value">${globalReport.totalLeads || 0}</div>
          <div class="stat-label">Prospects</div>
        </div>
        <div class="stat-card info">
          <div class="stat-value">${globalReport.totalOpportunities || 0}</div>
          <div class="stat-label">Opportunités</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-value">${globalReport.totalQuotes || 0}</div>
          <div class="stat-label">Cotations</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">${this.formatAmount(globalReport.totalAcceptedQuotesValue || 0)}</div>
          <div class="stat-label">CA Accepté (TND)</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value percentage ${this.getPercentageClass(globalReport.globalLeadToOpportunityRate)}">${this.formatPercentage(globalReport.globalLeadToOpportunityRate)}%</div>
          <div class="stat-label">Taux Prospect → Opportunité</div>
        </div>
        <div class="stat-card">
          <div class="stat-value percentage ${this.getPercentageClass(globalReport.globalOpportunityToQuoteRate)}">${this.formatPercentage(globalReport.globalOpportunityToQuoteRate)}%</div>
          <div class="stat-label">Taux Opportunité → Cotation</div>
        </div>
        <div class="stat-card">
          <div class="stat-value percentage ${this.getPercentageClass(globalReport.globalQuoteAcceptanceRate)}">${this.formatPercentage(globalReport.globalQuoteAcceptanceRate)}%</div>
          <div class="stat-label">Taux d'acceptation</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">${this.formatAmount(globalReport.totalMargin || 0)}</div>
          <div class="stat-label">Marge Totale (TND)</div>
        </div>
      </div>

      ${globalReport.commercialReports && globalReport.commercialReports.length > 0 ? `
        <h2 class="section-title">👥 Performance par Commercial</h2>
        <table>
          <thead>
            <tr>
              <th>Commercial</th>
              <th>Prospects</th>
              <th>Opportunités</th>
              <th>Cotations</th>
              <th>CA Accepté</th>
              <th>Taux Conv.</th>
            </tr>
          </thead>
          <tbody>
            ${globalReport.commercialReports.map((c: any) => `
              <tr>
                <td><strong>${c.commercialName || 'N/A'}</strong></td>
                <td>${c.totalLeads || 0}</td>
                <td>${c.totalOpportunities || 0}</td>
                <td>${c.totalQuotes || 0}</td>
                <td class="amount">${this.formatAmount(c.acceptedQuotesValue || 0)} TND</td>
                <td><span class="percentage ${this.getPercentageClass(c.overallConversionRate)}">${this.formatPercentage(c.overallConversionRate)}%</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    `;
  }

  /**
   * Générer le HTML pour les rapports prospects
   */
  private generateProspectReportsHTML(prospects: any[]): string {
    if (!prospects || prospects.length === 0) {
      return '<p>Aucun prospect trouvé pour cette période</p>';
    }

    return `
      <h2 class="section-title">🎯 Prospects (${prospects.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Prospect</th>
            <th>Entreprise</th>
            <th>Statut</th>
            <th>Commercial</th>
            <th>Créé le</th>
          </tr>
        </thead>
        <tbody>
          ${prospects.slice(0, 50).map((p: any) => `
            <tr>
              <td><strong>${p.leadName || 'N/A'}</strong></td>
              <td>${p.company || '-'}</td>
              <td><span class="badge ${this.getStatusBadgeClass(p.status)}">${this.getStatusLabel(p.status)}</span></td>
              <td>${p.assignedCommercial || '-'}</td>
              <td>${this.formatDate(p.createdAt)}</td>
            </tr>
          `).join('')}
          ${prospects.length > 50 ? `<tr><td colspan="5" style="text-align:center;color:#666;">... et ${prospects.length - 50} autres prospects</td></tr>` : ''}
        </tbody>
      </table>
    `;
  }

  /**
   * Générer le HTML pour les rapports opportunités
   */
  private generateOpportunityReportsHTML(opportunities: any[]): string {
    if (!opportunities || opportunities.length === 0) {
      return '<p>Aucune opportunité trouvée pour cette période</p>';
    }

    const totalValue = opportunities.reduce((sum, o) => sum + (o.value || 0), 0);

    return `
      <h2 class="section-title">💼 Opportunités (${opportunities.length})</h2>
      <div class="stats-grid">
        <div class="stat-card success">
          <div class="stat-value">${this.formatAmount(totalValue)}</div>
          <div class="stat-label">Valeur Totale (TND)</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Opportunité</th>
            <th>Entreprise</th>
            <th>Étape</th>
            <th>Valeur</th>
            <th>Commercial</th>
          </tr>
        </thead>
        <tbody>
          ${opportunities.slice(0, 50).map((o: any) => `
            <tr>
              <td><strong>${o.title || 'N/A'}</strong></td>
              <td>${o.leadCompany || '-'}</td>
              <td><span class="badge ${this.getStageBadgeClass(o.stage)}">${o.stage || '-'}</span></td>
              <td class="amount">${this.formatAmount(o.value || 0)} TND</td>
              <td>${o.assignedCommercial || '-'}</td>
            </tr>
          `).join('')}
          ${opportunities.length > 50 ? `<tr><td colspan="5" style="text-align:center;color:#666;">... et ${opportunities.length - 50} autres opportunités</td></tr>` : ''}
        </tbody>
      </table>
    `;
  }

  /**
   * Générer le HTML pour les rapports cotations
   */
  private generateQuoteReportsHTML(quotes: any[]): string {
    if (!quotes || quotes.length === 0) {
      return '<p>Aucune cotation trouvée pour cette période</p>';
    }

    const totalAmount = quotes.reduce((sum, q) => sum + (q.total || 0), 0);
    const totalMargin = quotes.reduce((sum, q) => sum + (q.totalMargin || 0), 0);
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
    const acceptedValue = acceptedQuotes.reduce((sum, q) => sum + (q.total || 0), 0);

    return `
      <h2 class="section-title">📄 Cotations (${quotes.length})</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${this.formatAmount(totalAmount)}</div>
          <div class="stat-label">Total HT (TND)</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">${this.formatAmount(acceptedValue)}</div>
          <div class="stat-label">CA Accepté (TND)</div>
        </div>
        <div class="stat-card info">
          <div class="stat-value">${this.formatAmount(totalMargin)}</div>
          <div class="stat-label">Marge Totale (TND)</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-value">${acceptedQuotes.length}/${quotes.length}</div>
          <div class="stat-label">Acceptées</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>N° Cotation</th>
            <th>Client</th>
            <th>Statut</th>
            <th>Total HT</th>
            <th>Marge</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${quotes.slice(0, 50).map((q: any) => `
            <tr>
              <td><strong>${q.quoteNumber || 'N/A'}</strong></td>
              <td>${q.clientCompany || q.clientName || '-'}</td>
              <td><span class="badge ${this.getQuoteStatusBadgeClass(q.status)}">${this.getQuoteStatusLabel(q.status)}</span></td>
              <td class="amount">${this.formatAmount(q.subtotal || 0)} TND</td>
              <td class="amount">${this.formatAmount(q.totalMargin || 0)} TND</td>
              <td>${this.formatDate(q.createdAt)}</td>
            </tr>
          `).join('')}
          ${quotes.length > 50 ? `<tr><td colspan="6" style="text-align:center;color:#666;">... et ${quotes.length - 50} autres cotations</td></tr>` : ''}
        </tbody>
      </table>
    `;
  }

  /**
   * Générer le HTML pour les rapports activités
   */
  private generateActivityReportsHTML(activities: any[]): string {
    if (!activities || activities.length === 0) {
      return '<p>Aucune activité trouvée pour cette période</p>';
    }

    return `
      <h2 class="section-title">📅 Activités par Commercial</h2>
      <table>
        <thead>
          <tr>
            <th>Commercial</th>
            <th>Appels</th>
            <th>Emails</th>
            <th>RDV</th>
            <th>Tâches</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${activities.map((a: any) => `
            <tr>
              <td><strong>${a.commercialName || 'N/A'}</strong></td>
              <td>${a.callsCount || 0}</td>
              <td>${a.emailsCount || 0}</td>
              <td>${a.meetingsCount || 0}</td>
              <td>${a.tasksCount || 0}</td>
              <td><strong>${a.totalActivities || 0}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Générer le HTML pour les rapports clients
   */
  private generateClientReportsHTML(clients: any[]): string {
    if (!clients || clients.length === 0) {
      return '<p>Aucun client trouvé pour cette période</p>';
    }

    const totalValue = clients.reduce((sum, c) => sum + (c.acceptedQuotesValue || 0), 0);

    return `
      <h2 class="section-title">🏢 Clients (${clients.length})</h2>
      <div class="stats-grid">
        <div class="stat-card success">
          <div class="stat-value">${this.formatAmount(totalValue)}</div>
          <div class="stat-label">CA Total Clients (TND)</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Entreprise</th>
            <th>Cotations</th>
            <th>CA Accepté</th>
            <th>Taux Accept.</th>
          </tr>
        </thead>
        <tbody>
          ${clients.slice(0, 50).map((c: any) => `
            <tr>
              <td><strong>${c.clientName || 'N/A'}</strong></td>
              <td>${c.company || '-'}</td>
              <td>${c.quotesCount || 0}</td>
              <td class="amount">${this.formatAmount(c.acceptedQuotesValue || 0)} TND</td>
              <td><span class="percentage ${this.getPercentageClass(c.acceptanceRate)}">${this.formatPercentage(c.acceptanceRate)}%</span></td>
            </tr>
          `).join('')}
          ${clients.length > 50 ? `<tr><td colspan="5" style="text-align:center;color:#666;">... et ${clients.length - 50} autres clients</td></tr>` : ''}
        </tbody>
      </table>
    `;
  }

  // ===== HELPERS DE FORMATAGE =====

  private formatDate(date: string | Date): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  }

  private formatPercentage(value: number): string {
    return (value || 0).toFixed(1);
  }

  private getPercentageClass(value: number): string {
    if (value >= 50) return 'high';
    if (value >= 25) return 'medium';
    return 'low';
  }

  private getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'new': 'Nouveau',
      'contacted': 'Contacté',
      'qualified': 'Qualifié',
      'converted': 'Converti',
      'lost': 'Perdu'
    };
    return labels[status] || status || '-';
  }

  private getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      'new': 'badge-info',
      'contacted': 'badge-warning',
      'qualified': 'badge-success',
      'converted': 'badge-success',
      'lost': 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
  }

  private getStageBadgeClass(stage: string): string {
    const classes: { [key: string]: string } = {
      'discovery': 'badge-info',
      'proposal': 'badge-warning',
      'negotiation': 'badge-warning',
      'closed_won': 'badge-success',
      'closed_lost': 'badge-danger'
    };
    return classes[stage] || 'badge-secondary';
  }

  private getQuoteStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'Brouillon',
      'sent': 'Envoyée',
      'accepted': 'Acceptée',
      'rejected': 'Rejetée'
    };
    return labels[status] || status || '-';
  }

  private getQuoteStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      'draft': 'badge-secondary',
      'sent': 'badge-info',
      'accepted': 'badge-success',
      'rejected': 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
  }

  // ===== MÉTHODES POUR LE FORMAT LINK =====

  /**
   * Récupérer un rapport partagé par ses paramètres encodés
   * ✅ SANS TABLE : Décode les paramètres et génère les données à la volée
   */
  async getSharedReport(databaseName: string, encodedParams: string): Promise<any> {
    try {
      // Décoder les paramètres depuis base64url
      const paramsJson = Buffer.from(encodedParams, 'base64url').toString('utf-8');
      const params = JSON.parse(paramsJson);
      
      const { startDate, endDate, commercialId, reportType, db, org } = params;
      
      // Utiliser la base de données des paramètres si disponible
      const dbName = db || databaseName;
      const organisationId = org || 1;
      
      // Construire les filtres
      const filters: ReportFilterDto = {
        startDate,
        endDate,
        commercialId: commercialId || undefined
      };
      
      // Générer les données du rapport à la volée
      const reportData = await this.generateReportDataForEmail(dbName, organisationId, filters, reportType);
      
      return {
        reportData,
        reportType,
        filters,
        createdAt: new Date(),
        expiresAt: null, // Pas d'expiration avec cette méthode
        viewCount: 1
      };
    } catch (error) {
      console.error('Erreur lors du décodage des paramètres du rapport:', error);
      throw new Error('Lien de rapport invalide ou corrompu');
    }
  }

  /**
   * Générer le HTML de l'email avec bouton vers le rapport
   */
  private generateReportLinkEmailHTML(
    reportType: string,
    filters: ReportFilterDto,
    reportUrl: string,
    customMessage?: string,
    expiresAt?: Date
  ): string {
    const periodStart = this.formatDate(filters.startDate);
    const periodEnd = this.formatDate(filters.endDate);
    const expiryDate = expiresAt ? this.formatDate(expiresAt) : '';

    const reportTypeLabels: { [key: string]: string } = {
      'global': 'Vue Globale',
      'commercials': 'Par Commercial',
      'prospects': 'Par Prospect',
      'opportunities': 'Par Opportunité',
      'quotes': 'Par Cotation',
      'activities': 'Par Activité',
      'clients': 'Par Client',
      'all': 'Rapport Complet'
    };
    const reportTypeLabel = reportTypeLabels[reportType] || reportType;

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rapport CRM Disponible</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    📊 Rapport CRM
                  </h1>
                  <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                    ${reportTypeLabel}
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  ${customMessage ? `
                    <div style="background-color: #E3F2FD; border-left: 4px solid #2196F3; padding: 15px 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                      <p style="margin: 0; color: #1565C0; font-style: italic;">
                        "${customMessage}"
                      </p>
                    </div>
                  ` : ''}

                  <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                    Votre rapport CRM <strong>${reportTypeLabel}</strong> pour la période 
                    du <strong>${periodStart}</strong> au <strong>${periodEnd}</strong> 
                    est prêt à être consulté.
                  </p>

                  <!-- Button -->
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${reportUrl}" 
                       target="_blank"
                       style="display: inline-block; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 30px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);">
                      🔗 Consulter le rapport complet
                    </a>
                  </div>

                  <!-- Info Box -->
                  <div style="background-color: #FFF3E0; border-radius: 8px; padding: 20px; margin-top: 30px;">
                    <p style="margin: 0 0 10px 0; color: #E65100; font-weight: 600;">
                      ⏰ Informations importantes
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #666;">
                      <li style="margin-bottom: 8px;">Ce lien est valide jusqu'au <strong>${expiryDate}</strong></li>
                      <li style="margin-bottom: 8px;">Le rapport peut être consulté plusieurs fois</li>
                      <li>Vous pouvez partager ce lien avec d'autres personnes autorisées</li>
                    </ul>
                  </div>

                  <!-- Alternative Link -->
                  <p style="margin: 30px 0 0 0; color: #999; font-size: 12px; text-align: center;">
                    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                    <a href="${reportUrl}" style="color: #2196F3; word-break: break-all;">${reportUrl}</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0; color: #6c757d; font-size: 13px;">
                    Cet email a été envoyé automatiquement par le système CRM Velosi.<br>
                    Généré le ${this.formatDateTime(new Date())}
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }
}
