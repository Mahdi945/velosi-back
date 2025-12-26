import { Injectable } from '@nestjs/common';
import { DatabaseConnectionService } from '../../common/database-connection.service';
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
}
