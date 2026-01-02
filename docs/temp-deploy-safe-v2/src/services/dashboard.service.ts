import { Injectable } from '@nestjs/common';
import { LeadStatus } from '../entities/crm/lead.entity';
import { OpportunityStage, TransportType } from '../entities/crm/opportunity.entity';
import { DatabaseConnectionService } from '../common/database-connection.service';

export interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  transportType?: TransportType;
  trafficType?: 'import' | 'export';
}

export interface DashboardStatsResponse {
  // Statistiques globales
  totalPersonnel: number;
  totalClients: number;
  totalLeads: number;
  totalOpportunities: number;
  
  // Statistiques d�taill�es
  personnelByRole: { role: string; count: number }[];
  clientsByStatus: { statut: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
  opportunitiesByStage: { stage: string; count: number; totalValue: number }[];
  
  // M�triques de performance
  conversionRate: number;
  avgOpportunityValue: number;
  totalPipelineValue: number;
  wonOpportunitiesValue: number;
  monthlyGrowth: number;
  
  // P�riode
  periodStart: Date;
  periodEnd: Date;
}

export interface SalesEvolutionResponse {
  monthly: {
    month: string;
    year: number;
    opportunities: number;
    wonDeals: number;
    totalValue: number;
    wonValue: number;
    totalMargin: number;
  }[];
  yearlyComparison: {
    currentYear: {
      total: number;
      won: number;
      value: number;
      growth: number;
    };
    previousYear: {
      total: number;
      won: number;
      value: number;
    };
  };
}

export interface CRMStatsResponse {
  leads: {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    lost: number;
  };
  opportunities: {
    total: number;
    byStage: { stage: string; count: number; value: number }[];
    totalValue: number;
    avgValue: number;
    wonValue: number;
    wonCount: number;
    lostCount: number;
    winRate: number;
  };
  performance: {
    conversionRate: number;
    avgSalesCycle: number;
    winRate: number;
  };
}

export interface RecentActivityResponse {
  id: number;
  type: string;
  description: string;
  entityType: 'lead' | 'opportunity' | 'client' | 'personnel' | 'quote';
  entityId: number;
  entityName: string;
  userId: number;
  userName: string;
  createdAt: Date;
  metadata?: any;
}

@Injectable()
export class DashboardService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Obtenir les statistiques globales du dashboard avec filtres
   * ? MULTI-TENANT: Utilise databaseName
   */
  async getDashboardStats(databaseName: string, filters?: DashboardFilters): Promise<DashboardStatsResponse> {
    console.log('?? [getDashboardStats] D�but avec databaseName:', databaseName, 'filtres:', filters);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    console.log('?? [getDashboardStats] Connexion �tablie � la base:', connection.options.database);
    
    const periodStart = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
    const periodEnd = filters?.endDate || new Date();
    
    console.log('?? [getDashboardStats] P�riode:', { periodStart, periodEnd });
    
    // Compter le personnel actif (pas affect� par les filtres de p�riode)
    const totalPersonnelResult = await connection.query(
      `SELECT COUNT(*) as count FROM personnel WHERE statut = $1`,
      ['actif']
    );
    const totalPersonnel = parseInt(totalPersonnelResult[0]?.count || '0');
    console.log('?? [getDashboardStats] Personnel actif:', totalPersonnel);

    // Compter les clients actifs (pas affect� par les filtres de p�riode)
    const totalClientsResult = await connection.query(
      `SELECT COUNT(*) as count FROM client WHERE statut = $1`,
      ['actif']
    );
    const totalClients = parseInt(totalClientsResult[0]?.count || '0');
    console.log('?? [getDashboardStats] Clients actifs:', totalClients);

    // Leads avec filtres
    let leadParams: any[] = [];
    let leadWhere = '';
    
    if (filters?.startDate && filters?.endDate) {
      leadWhere = ` WHERE "created_at" BETWEEN $1 AND $2`;
      leadParams = [filters.startDate, filters.endDate];
    }
    
    const totalLeadsResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_leads${leadWhere}`,
      leadParams
    );
    const totalLeads = parseInt(totalLeadsResult[0]?.count || '0');
    console.log('?? [getDashboardStats] Total Leads:', totalLeads);

    // Opportunit�s avec filtres (TOUTES les opportunités actives, incluant fermées)
    let oppParams: any[] = [];
    let oppWhere = '';
    let paramIndex = 1;
    
    if (filters?.startDate && filters?.endDate) {
      oppWhere += (oppWhere ? ' AND' : ' WHERE') + ` "created_at" BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      oppParams.push(filters.startDate, filters.endDate);
      paramIndex += 2;
    }
    
    if (filters?.transportType) {
      oppWhere += (oppWhere ? ' AND' : ' WHERE') + ` "transport_type" = $${paramIndex}`;
      oppParams.push(filters.transportType);
      paramIndex++;
    }
    
    const totalOpportunitiesResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_opportunities${oppWhere}`,
      oppParams
    );
    const totalOpportunities = parseInt(totalOpportunitiesResult[0]?.count || '0');
    console.log('?? [getDashboardStats] Total Opportunit�s:', totalOpportunities);

    // Personnel par r�le
    const personnelByRole = await connection.query(
      `SELECT role, COUNT(*) as count FROM personnel WHERE statut = $1 GROUP BY role`,
      ['actif']
    );

    // Clients par statut
    const clientsByStatus = await connection.query(
      `SELECT statut, COUNT(*) as count FROM client GROUP BY statut`
    );

    // Leads par statut (avec filtres)
    const leadsByStatus = await connection.query(
      `SELECT status, COUNT(*) as count FROM crm_leads${leadWhere} GROUP BY status`,
      leadParams
    );

    // Opportunit�s par stage avec valeur totale (avec filtres)
    const opportunitiesByStage = await connection.query(
      `SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as "totalValue" 
       FROM crm_opportunities${oppWhere} 
       GROUP BY stage`,
      oppParams
    );

    // Calcul du taux de conversion (avec filtres)
    const convertedLeadsResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_leads WHERE status = $1${leadWhere ? ' AND ' + leadWhere.replace(' WHERE ', '') : ''}`,
      [LeadStatus.CONVERTED, ...leadParams]
    );
    const convertedLeads = parseInt(convertedLeadsResult[0]?.count || '0');
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    console.log('?? [getDashboardStats] Taux de conversion:', {
      convertedLeads,
      totalLeads,
      conversionRate: `${conversionRate.toFixed(2)}%`
    });

    // Valeur moyenne des opportunit�s (avec filtres)
    const avgResult = await connection.query(
      `SELECT AVG(value) as avg FROM crm_opportunities${oppWhere}`,
      oppParams
    );
    const avgOpportunityValue = parseFloat(avgResult[0]?.avg || '0');
    console.log('?? [getDashboardStats] Valeur moyenne opportunit�:', avgOpportunityValue);

    // Valeur totale du pipeline (avec filtres)
    let pipelineParams: any[] = [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST];
    let pipelineWhere = ' WHERE stage NOT IN ($1, $2)';
    paramIndex = 3;
    
    if (filters?.startDate && filters?.endDate) {
      pipelineWhere += ` AND "created_at" BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      pipelineParams.push(filters.startDate, filters.endDate);
      paramIndex += 2;
    }
    
    if (filters?.transportType) {
      pipelineWhere += ` AND "transport_type" = $${paramIndex}`;
      pipelineParams.push(filters.transportType);
    }
    
    const pipelineResult = await connection.query(
      `SELECT COALESCE(SUM(value), 0) as total FROM crm_opportunities${pipelineWhere}`,
      pipelineParams
    );
    const totalPipelineValue = parseFloat(pipelineResult[0]?.total || '0');
    console.log('?? [getDashboardStats] Valeur pipeline:', totalPipelineValue);

    // CA bas� sur le montant total TTC des cotations accept�es
    let wonParams: any[] = ['accepted'];
    let wonWhere = ' WHERE status = $1';
    paramIndex = 2;
    
    if (filters?.startDate && filters?.endDate) {
      wonWhere += ` AND "accepted_at" BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      wonParams.push(filters.startDate, filters.endDate);
    }
    
    const wonResult = await connection.query(
      `SELECT COALESCE(SUM(total), 0) as total FROM crm_quotes${wonWhere}`,
      wonParams
    );
    const wonOpportunitiesValue = parseFloat(wonResult[0]?.total || '0');
    console.log('?? [getDashboardStats] CA R�alis� (cotations accept�es):', wonOpportunitiesValue);

    // Croissance mensuelle
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let currentMonthParams: any[] = [OpportunityStage.CLOSED_WON, currentMonth, now];
    let currentMonthWhere = ' WHERE stage = $1 AND "actual_close_date" BETWEEN $2 AND $3';
    
    if (filters?.transportType) {
      currentMonthWhere += ' AND "transport_type" = $4';
      currentMonthParams.push(filters.transportType);
    }
    
    const currentMonthResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_opportunities${currentMonthWhere}`,
      currentMonthParams
    );
    const currentMonthOpps = parseInt(currentMonthResult[0]?.count || '0');

    let lastMonthParams: any[] = [OpportunityStage.CLOSED_WON, lastMonth, currentMonth];
    if (filters?.transportType) {
      lastMonthParams.push(filters.transportType);
    }
    
    const lastMonthResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_opportunities${currentMonthWhere}`,
      lastMonthParams
    );
    const lastMonthOpps = parseInt(lastMonthResult[0]?.count || '0');

    const monthlyGrowth = lastMonthOpps > 0 
      ? ((currentMonthOpps - lastMonthOpps) / lastMonthOpps) * 100 
      : 0;

    const response = {
      totalPersonnel,
      totalClients,
      totalLeads,
      totalOpportunities,
      personnelByRole,
      clientsByStatus,
      leadsByStatus,
      opportunitiesByStage,
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgOpportunityValue: Math.round(avgOpportunityValue * 100) / 100,
      totalPipelineValue: Math.round(totalPipelineValue * 100) / 100,
      wonOpportunitiesValue: Math.round(wonOpportunitiesValue * 100) / 100,
      monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
      periodStart,
      periodEnd
    };
    
    console.log('? [getDashboardStats] R�ponse finale:', {
      totalPersonnel: response.totalPersonnel,
      totalClients: response.totalClients,
      totalLeads: response.totalLeads,
      totalOpportunities: response.totalOpportunities,
      conversionRate: response.conversionRate,
      wonOpportunitiesValue: response.wonOpportunitiesValue
    });
    
    return response;
  }

  /**
   * Obtenir l'�volution des ventes sur 12 mois avec filtres
   * ? MULTI-TENANT: Utilise databaseName
   */
  async getSalesEvolution(databaseName: string, filters?: DashboardFilters): Promise<SalesEvolutionResponse> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const now = filters?.endDate || new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    const monthlyData = [];

    // R�cup�rer les donn�es pour les 12 derniers mois
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthName = monthDate.toLocaleDateString('fr-FR', { month: 'short' });
      const year = monthDate.getFullYear();

      // Opportunit�s cr��es ce mois (avec filtres)
      let oppsParams: any[] = [monthDate, nextMonth];
      let oppsWhere = '';
      let oppsParamIndex = 3;
      
      if (filters?.transportType) {
        oppsWhere = ` AND "transport_type" = $${oppsParamIndex}`;
        oppsParams.push(filters.transportType);
        oppsParamIndex++;
      }
      
      const opportunitiesResult = await connection.query(
        `SELECT COUNT(*) as count FROM crm_opportunities 
         WHERE "created_at" BETWEEN $1 AND $2${oppsWhere}`,
        oppsParams
      );
      const opportunities = parseInt(opportunitiesResult[0]?.count || '0');

      // Opportunit�s gagn�es ce mois (avec filtres)
      let wonParams: any[] = ['CLOSED_WON', monthDate, nextMonth];
      let wonWhere = '';
      let wonParamIndex = 4;
      
      if (filters?.transportType) {
        wonWhere = ` AND "transport_type" = $${wonParamIndex}`;
        wonParams.push(filters.transportType);
        wonParamIndex++;
      }
      
      const wonDealsResult = await connection.query(
        `SELECT COUNT(*) as count FROM crm_opportunities 
         WHERE stage = $1 AND "actual_close_date" BETWEEN $2 AND $3${wonWhere}`,
        wonParams
      );
      const wonDeals = parseInt(wonDealsResult[0]?.count || '0');

      // Valeur totale des opportunit�s cr��es (avec filtres)
      const totalValueResult = await connection.query(
        `SELECT COALESCE(SUM(value), 0) as total FROM crm_opportunities 
         WHERE "created_at" BETWEEN $1 AND $2${oppsWhere}`,
        oppsParams
      );

      // CA bas� sur le montant total des cotations accept�es
      const wonValueResult = await connection.query(
        `SELECT COALESCE(SUM(total), 0) as total FROM crm_quotes 
         WHERE status = $1 AND "accepted_at" BETWEEN $2 AND $3`,
        ['accepted', monthDate, nextMonth]
      );

      // Marge r�elle des cotations accept�es ce mois
      const marginResult = await connection.query(
        `SELECT COALESCE(SUM("total_margin"), 0) as total FROM crm_quotes 
         WHERE status = $1 AND "accepted_at" BETWEEN $2 AND $3`,
        ['accepted', monthDate, nextMonth]
      );
      
      const wonValue = parseFloat(wonValueResult[0]?.total || '0');
      const totalMargin = parseFloat(marginResult[0]?.total || '0');
      
      // Debug: Logger les valeurs pour ce mois
      if (wonValue > 0 || totalMargin > 0) {
        console.log(`?? ${monthName} ${year}:`, {
          wonValue,
          totalMargin,
          wonValueRaw: wonValueResult[0]?.total,
          marginRaw: marginResult[0]?.total,
          dateRange: {
            start: monthDate.toISOString(),
            end: nextMonth.toISOString()
          }
        });
        
        // Requ�te de debug pour voir les cotations accept�es ce mois
        const debugQuotes = await connection.query(
          `SELECT id, "quote_number", total, "total_margin", "accepted_at" 
           FROM crm_quotes 
           WHERE status = $1 AND "accepted_at" BETWEEN $2 AND $3`,
          ['accepted', monthDate, nextMonth]
        );
        
        if (debugQuotes.length > 0) {
          console.log(`  ? ${debugQuotes.length} cotations accept�es:`, debugQuotes.map(q => ({
            number: q.quoteNumber,
            total: q.total,
            margin: q.totalMargin,
            acceptedAt: q.acceptedAt
          })));
        }
      }

      monthlyData.push({
        month: monthName,
        year,
        opportunities,
        wonDeals,
        totalValue: parseFloat(totalValueResult[0]?.total || '0'),
        wonValue,
        totalMargin
      });
    }

    // Comparaison annuelle (avec filtres)
    const currentYearStart = new Date(currentYear, 0, 1);
    const lastYearStart = new Date(lastYear, 0, 1);
    const lastYearEnd = new Date(currentYear, 0, 1);

    // Ann�e en cours - opportunit�s cr��es
    let currentYearParams: any[] = [currentYearStart, now];
    let currentYearWhere = '';
    let currentYearParamIndex = 3;
    
    if (filters?.transportType) {
      currentYearWhere = ` AND "transport_type" = $${currentYearParamIndex}`;
      currentYearParams.push(filters.transportType);
      currentYearParamIndex++;
    }
    
    const currentYearTotalResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_opportunities 
       WHERE "created_at" BETWEEN $1 AND $2${currentYearWhere}`,
      currentYearParams
    );
    const currentYearTotal = parseInt(currentYearTotalResult[0]?.count || '0');

    // Ann�e en cours - opportunit�s gagn�es
    let currentYearWonParams: any[] = ['CLOSED_WON', currentYearStart, now];
    let currentYearWonWhere = '';
    let currentYearWonParamIndex = 4;
    
    if (filters?.transportType) {
      currentYearWonWhere = ` AND "transport_type" = $${currentYearWonParamIndex}`;
      currentYearWonParams.push(filters.transportType);
      currentYearWonParamIndex++;
    }
    
    const currentYearWonResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_opportunities 
       WHERE stage = $1 AND "actual_close_date" BETWEEN $2 AND $3${currentYearWonWhere}`,
      currentYearWonParams
    );
    const currentYearWon = parseInt(currentYearWonResult[0]?.count || '0');

    // CA annuel bas� sur le montant total TTC des cotations accept�es
    const currentYearValueResult = await connection.query(
      `SELECT COALESCE(SUM(total), 0) as total FROM crm_quotes 
       WHERE status = $1 AND "accepted_at" BETWEEN $2 AND $3`,
      ['accepted', currentYearStart, now]
    );

    // Ann�e pr�c�dente - opportunit�s cr��es
    let lastYearParams: any[] = [lastYearStart, lastYearEnd];
    let lastYearWhere = '';
    let lastYearParamIndex = 3;
    
    if (filters?.transportType) {
      lastYearWhere = ` AND "transport_type" = $${lastYearParamIndex}`;
      lastYearParams.push(filters.transportType);
      lastYearParamIndex++;
    }
    
    const lastYearTotalResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_opportunities 
       WHERE "created_at" BETWEEN $1 AND $2${lastYearWhere}`,
      lastYearParams
    );
    const lastYearTotal = parseInt(lastYearTotalResult[0]?.count || '0');

    // Ann�e pr�c�dente - opportunit�s gagn�es
    let lastYearWonParams: any[] = ['CLOSED_WON', lastYearStart, lastYearEnd];
    let lastYearWonWhere = '';
    let lastYearWonParamIndex = 4;
    
    if (filters?.transportType) {
      lastYearWonWhere = ` AND "transport_type" = $${lastYearWonParamIndex}`;
      lastYearWonParams.push(filters.transportType);
      lastYearWonParamIndex++;
    }
    
    const lastYearWonResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_opportunities 
       WHERE stage = $1 AND "actual_close_date" BETWEEN $2 AND $3${lastYearWonWhere}`,
      lastYearWonParams
    );
    const lastYearWon = parseInt(lastYearWonResult[0]?.count || '0');

    // CA ann�e pr�c�dente bas� sur le montant total TTC des cotations accept�es
    const lastYearValueResult = await connection.query(
      `SELECT COALESCE(SUM(total), 0) as total FROM crm_quotes 
       WHERE status = $1 AND "accepted_at" BETWEEN $2 AND $3`,
      ['accepted', lastYearStart, lastYearEnd]
    );

    const currentYearValue = parseFloat(currentYearValueResult[0]?.total || '0');
    const lastYearValue = parseFloat(lastYearValueResult[0]?.total || '0');
    const growth = lastYearValue > 0 
      ? ((currentYearValue - lastYearValue) / lastYearValue) * 100 
      : 0;

    return {
      monthly: monthlyData,
      yearlyComparison: {
        currentYear: {
          total: currentYearTotal,
          won: currentYearWon,
          value: Math.round(currentYearValue * 100) / 100,
          growth: Math.round(growth * 100) / 100
        },
        previousYear: {
          total: lastYearTotal,
          won: lastYearWon,
          value: Math.round(lastYearValue * 100) / 100
        }
      }
    };
  }

  /**
   * Obtenir les statistiques CRM d�taill�es avec filtres
   * ? MULTI-TENANT: Utilise databaseName
   */
  async getCRMStats(databaseName: string, filters?: DashboardFilters): Promise<CRMStatsResponse> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Statistiques des leads (avec filtres)
    let leadParams: any[] = [];
    let leadWhere = '';
    
    if (filters?.startDate && filters?.endDate) {
      leadWhere = ' WHERE "created_at" BETWEEN $1 AND $2';
      leadParams = [filters.startDate, filters.endDate];
    }
    
    const totalLeadsResult = await connection.query(`SELECT COUNT(*) as count FROM crm_leads${leadWhere}`, leadParams);
    const totalLeads = parseInt(totalLeadsResult[0]?.count || '0');
    
    const newLeadsResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_leads WHERE status = $${leadParams.length + 1}${leadWhere ? ' AND ' + leadWhere.replace(' WHERE ', '') : ''}`,
      [...leadParams, LeadStatus.NEW]
    );
    const newLeads = parseInt(newLeadsResult[0]?.count || '0');
    
    const contactedLeadsResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_leads WHERE status = $${leadParams.length + 1}${leadWhere ? ' AND ' + leadWhere.replace(' WHERE ', '') : ''}`,
      [...leadParams, LeadStatus.CONTACTED]
    );
    const contactedLeads = parseInt(contactedLeadsResult[0]?.count || '0');
    
    const qualifiedLeadsResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_leads WHERE status = $${leadParams.length + 1}${leadWhere ? ' AND ' + leadWhere.replace(' WHERE ', '') : ''}`,
      [...leadParams, LeadStatus.QUALIFIED]
    );
    const qualifiedLeads = parseInt(qualifiedLeadsResult[0]?.count || '0');
    
    const convertedLeadsResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_leads WHERE status = $${leadParams.length + 1}${leadWhere ? ' AND ' + leadWhere.replace(' WHERE ', '') : ''}`,
      [...leadParams, LeadStatus.CONVERTED]
    );
    const convertedLeads = parseInt(convertedLeadsResult[0]?.count || '0');
    
    const lostLeadsResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_leads WHERE status = $${leadParams.length + 1}${leadWhere ? ' AND ' + leadWhere.replace(' WHERE ', '') : ''}`,
      [...leadParams, LeadStatus.LOST]
    );
    const lostLeads = parseInt(lostLeadsResult[0]?.count || '0');

    // Statistiques des opportunit�s (avec filtres)
    let oppParams: any[] = [];
    let oppWhere = '';
    let paramIndex = 1;
    
    if (filters?.startDate && filters?.endDate) {
      oppWhere = ` WHERE "created_at" BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      oppParams = [filters.startDate, filters.endDate];
      paramIndex += 2;
    }
    
    if (filters?.transportType) {
      oppWhere += `${oppWhere ? ' AND' : ' WHERE'} "transport_type" = $${paramIndex}`;
      oppParams.push(filters.transportType);
      paramIndex++;
    }
    
    const totalOppsResult = await connection.query(`SELECT COUNT(*) as count FROM crm_opportunities${oppWhere}`, oppParams);
    const totalOpps = parseInt(totalOppsResult[0]?.count || '0');
    
    // Opportunit�s par stage (avec filtres)
    const oppsByStage = await connection.query(
      `SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as value 
       FROM crm_opportunities${oppWhere} GROUP BY stage`,
      oppParams
    );
    
    // Valeur totale et moyenne des opportunit�s
    const valueStatsResult = await connection.query(
      `SELECT 
        COALESCE(SUM(value), 0) as total,
        COALESCE(AVG(value), 0) as avg
       FROM crm_opportunities${oppWhere}`,
      oppParams
    );
    const totalValue = parseFloat(valueStatsResult[0]?.total || '0');
    const avgValue = parseFloat(valueStatsResult[0]?.avg || '0');

    // Opportunit�s gagn�es (avec filtres)
    let wonParams: any[] = [];
    let wonWhere = ' WHERE stage = $1';
    wonParams.push('CLOSED_WON');
    let wonParamIndex = 2;
    
    if (filters?.startDate && filters?.endDate) {
      wonWhere += ` AND "actual_close_date" BETWEEN $${wonParamIndex} AND $${wonParamIndex + 1}`;
      wonParams.push(filters.startDate, filters.endDate);
      wonParamIndex += 2;
    }
    
    if (filters?.transportType) {
      wonWhere += ` AND "transport_type" = $${wonParamIndex}`;
      wonParams.push(filters.transportType);
      wonParamIndex++;
    }
    
    const wonResult = await connection.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total FROM crm_opportunities${wonWhere}`,
      wonParams
    );
    const wonCount = parseInt(wonResult[0]?.count || '0');
    const wonValue = parseFloat(wonResult[0]?.total || '0');

    // Opportunit�s perdues (avec filtres)
    let lostParams: any[] = [];
    let lostWhere = ' WHERE stage = $1';
    lostParams.push('CLOSED_LOST');
    let lostParamIndex = 2;
    
    if (filters?.startDate && filters?.endDate) {
      lostWhere += ` AND "created_at" BETWEEN $${lostParamIndex} AND $${lostParamIndex + 1}`;
      lostParams.push(filters.startDate, filters.endDate);
      lostParamIndex += 2;
    }
    
    if (filters?.transportType) {
      lostWhere += ` AND "transport_type" = $${lostParamIndex}`;
      lostParams.push(filters.transportType);
      lostParamIndex++;
    }
    
    const lostResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_opportunities${lostWhere}`,
      lostParams
    );
    const lostCount = parseInt(lostResult[0]?.count || '0');

    // Taux de conversion Prospect ? Opportunit� (m�me logique que la page Reports)
    const conversionRate = totalLeads > 0 ? (totalOpps / totalLeads) * 100 : 0;

    // Taux de victoire
    const closedTotal = wonCount + lostCount;
    const winRate = closedTotal > 0 ? (wonCount / closedTotal) * 100 : 0;

    // Dur�e moyenne du cycle de vente (avec filtres)
    let cycleParams: any[] = [];
    let cycleWhere = ' WHERE stage = $1 AND "actual_close_date" IS NOT NULL';
    cycleParams.push('CLOSED_WON');
    let cycleParamIndex = 2;
    
    if (filters?.startDate && filters?.endDate) {
      cycleWhere += ` AND "actual_close_date" BETWEEN $${cycleParamIndex} AND $${cycleParamIndex + 1}`;
      cycleParams.push(filters.startDate, filters.endDate);
      cycleParamIndex += 2;
    }
    
    if (filters?.transportType) {
      cycleWhere += ` AND "transport_type" = $${cycleParamIndex}`;
      cycleParams.push(filters.transportType);
      cycleParamIndex++;
    }
    
    const cycleResult = await connection.query(
      `SELECT AVG(EXTRACT(day FROM "actual_close_date" - "created_at")) as avgdays FROM crm_opportunities${cycleWhere}`,
      cycleParams
    );
    const avgSalesCycle = parseFloat(cycleResult[0]?.avgdays || '0');

    return {
      leads: {
        total: totalLeads,
        new: newLeads,
        contacted: contactedLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        lost: lostLeads
      },
      opportunities: {
        total: totalOpps,
        byStage: oppsByStage.map(s => ({
          stage: s.stage,
          count: parseInt(s.count),
          value: parseFloat(s.value)
        })),
        totalValue: Math.round(totalValue * 100) / 100,
        avgValue: Math.round(avgValue * 100) / 100,
        wonValue: Math.round(wonValue * 100) / 100,
        wonCount,
        lostCount,
        winRate: Math.round(winRate * 100) / 100
      },
      performance: {
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgSalesCycle: Math.round(avgSalesCycle * 10) / 10,
        winRate: Math.round(winRate * 100) / 100
      }
    };
  }

  /**
   * Obtenir les activit�s r�centes avec filtres
   * ? MULTI-TENANT: Utilise databaseName
   */
  async getRecentActivities(databaseName: string, limit: number = 10, filters?: DashboardFilters): Promise<RecentActivityResponse[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const activities: RecentActivityResponse[] = [];

    // R�cup�rer les derniers leads cr��s (avec filtres)
    let leadsParams: any[] = [];
    let leadsWhere = '';
    let leadsParamIndex = 1;
    
    if (filters?.startDate && filters?.endDate) {
      leadsWhere = ` WHERE l.created_at BETWEEN $${leadsParamIndex} AND $${leadsParamIndex + 1}`;
      leadsParams = [filters.startDate, filters.endDate];
      leadsParamIndex += 2;
    }
    
    const recentLeads = await connection.query(
      `SELECT l.id, l.full_name, l.company, l.source, l.created_at, l.created_by,
              p.nom as created_by_name
       FROM crm_leads l
       LEFT JOIN personnel p ON l.created_by = p.id
       ${leadsWhere}
       ORDER BY l.created_at DESC
       LIMIT $${leadsParamIndex}`,
      [...leadsParams, Math.ceil(limit / 3)]
    );

    for (const lead of recentLeads) {
      activities.push({
        id: lead.id,
        type: 'lead_created',
        description: `Nouveau prospect: ${lead.full_name} - ${lead.company}`,
        entityType: 'lead',
        entityId: lead.id,
        entityName: lead.full_name,
        userId: lead.created_by || 0,
        userName: lead.created_by_name || 'Système',
        createdAt: lead.created_at,
        metadata: { company: lead.company, source: lead.source }
      });
    }

    // Récupérer les dernières opportunités créées (avec filtres)
    let oppsParams: any[] = [];
    let oppsWhere = '';
    let oppsParamIndex = 1;
    
    if (filters?.startDate && filters?.endDate) {
      oppsWhere = ` WHERE o.created_at BETWEEN $${oppsParamIndex} AND $${oppsParamIndex + 1}`;
      oppsParams = [filters.startDate, filters.endDate];
      oppsParamIndex += 2;
    }
    
    if (filters?.transportType) {
      oppsWhere += (oppsWhere ? ' AND' : ' WHERE') + ` o.transport_type = $${oppsParamIndex}`;
      oppsParams.push(filters.transportType);
      oppsParamIndex++;
    }
    
    const recentOpps = await connection.query(
      `SELECT o.id, o.title, o.value, o.stage, o.transport_type, o.created_at, o.created_by,
              p.nom as created_by_name
       FROM crm_opportunities o
       LEFT JOIN personnel p ON o.created_by = p.id
       ${oppsWhere}
       ORDER BY o.created_at DESC
       LIMIT $${oppsParamIndex}`,
      [...oppsParams, Math.ceil(limit / 3)]
    );

    for (const opp of recentOpps) {
      activities.push({
        id: opp.id,
        type: 'opportunity_created',
        description: `Nouvelle opportunité: ${opp.title}`,
        entityType: 'opportunity',
        entityId: opp.id,
        entityName: opp.title,
        userId: opp.created_by || 0,
        userName: opp.created_by_name || 'Système',
        createdAt: opp.created_at,
        metadata: { value: opp.value, stage: opp.stage, transportType: opp.transport_type }
      });
    }

    // Récupérer les derniers clients créés (avec filtres)
    let clientsParams: any[] = [];
    let clientsWhere = '';
    let clientsParamIndex = 1;
    
    if (filters?.startDate && filters?.endDate) {
      clientsWhere = ` WHERE created_at BETWEEN $${clientsParamIndex} AND $${clientsParamIndex + 1}`;
      clientsParams = [filters.startDate, filters.endDate];
      clientsParamIndex += 2;
    }
    
    const recentClients = await connection.query(
      `SELECT id, nom, type_client, categorie, created_at
       FROM client
       ${clientsWhere}
       ORDER BY created_at DESC
       LIMIT $${clientsParamIndex}`,
      [...clientsParams, Math.ceil(limit / 3)]
    );

    for (const client of recentClients) {
      activities.push({
        id: client.id,
        type: 'client_created',
        description: `Nouveau client: ${client.nom}`,
        entityType: 'client',
        entityId: client.id,
        entityName: client.nom,
        userId: 0,
        userName: 'Système',
        createdAt: client.created_at,
        metadata: { type: client.type_client, categorie: client.categorie }
      });
    }

    // Récupérer les dernières cotations créées (avec filtres)
    let quotesParams: any[] = [];
    let quotesWhere = '';
    let quotesParamIndex = 1;
    
    if (filters?.startDate && filters?.endDate) {
      quotesWhere = ` WHERE q.created_at BETWEEN $${quotesParamIndex} AND $${quotesParamIndex + 1}`;
      quotesParams = [filters.startDate, filters.endDate];
      quotesParamIndex += 2;
    }
    
    const recentQuotes = await connection.query(
      `SELECT q.id, q.title, q.quote_number, q.status, q.total, q.created_at, q.created_by,
              p.nom as creator_name
       FROM crm_quotes q
       LEFT JOIN personnel p ON q.created_by = p.id
       ${quotesWhere}
       ORDER BY q.created_at DESC
       LIMIT $${quotesParamIndex}`,
      [...quotesParams, Math.ceil(limit / 4)]
    );

    for (const quote of recentQuotes) {
      activities.push({
        id: quote.id,
        type: 'quote_created',
        description: `Nouvelle cotation: ${quote.title || quote.quote_number}`,
        entityType: 'quote',
        entityId: quote.id,
        entityName: quote.title || quote.quote_number,
        userId: quote.created_by || 0,
        userName: quote.creator_name || 'Système',
        createdAt: quote.created_at,
        metadata: { 
          quoteNumber: quote.quote_number, 
          status: quote.status,
          total: quote.total 
        }
      });
    }

    // Trier par date d�croissante et limiter
    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Obtenir la r�partition des ventes par type de transport avec filtres
   * ? MULTI-TENANT: Utilise databaseName
   */
  async getTransportDistribution(databaseName: string, filters?: DashboardFilters): Promise<{
    byTransportType: { type: string; count: number; value: number; percentage: number }[];
    byTrafficType: { type: string; count: number; value: number }[];
    totalValue: number;
  }> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    console.log('?? [getTransportDistribution] D�but avec filtres:', filters);
    
    // R�partition par type de transport (avec filtres)
    let transportParams: any[] = [];
    let transportWhere = ' WHERE "transport_type" IS NOT NULL';
    let transportParamIndex = 1;
    
    if (filters?.startDate && filters?.endDate) {
      transportWhere += ` AND "actual_close_date" BETWEEN $${transportParamIndex} AND $${transportParamIndex + 1}`;
      transportParams = [filters.startDate, filters.endDate];
      transportParamIndex += 2;
    }
    
    const transportStats = await connection.query(
      `SELECT 
        "transport_type" as type,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN stage = 'CLOSED_WON' THEN value ELSE 0 END), 0) as value
       FROM crm_opportunities
       ${transportWhere}
       GROUP BY "transport_type"`,
      transportParams
    );
    console.log('?? [getTransportDistribution] Stats brutes:', transportStats);

    const totalValue = transportStats.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    console.log('?? [getTransportDistribution] Valeur totale:', totalValue);

    const byTransportType = transportStats.map(item => ({
      type: item.type,
      count: parseInt(item.count),
      value: parseFloat(item.value || 0),
      percentage: totalValue > 0 ? (parseFloat(item.value || 0) / totalValue) * 100 : 0
    }));

    console.log('? [getTransportDistribution] Par type transport:', byTransportType);

    // R�partition par type de trafic (Import/Export) avec filtres
    let trafficParams: any[] = [];
    let trafficWhere = ' WHERE traffic IS NOT NULL';
    let trafficParamIndex = 1;
    
    if (filters?.startDate && filters?.endDate) {
      trafficWhere += ` AND "actual_close_date" BETWEEN $${trafficParamIndex} AND $${trafficParamIndex + 1}`;
      trafficParams = [filters.startDate, filters.endDate];
      trafficParamIndex += 2;
    }
    
    if (filters?.transportType) {
      trafficWhere += ` AND "transport_type" = $${trafficParamIndex}`;
      trafficParams.push(filters.transportType);
      trafficParamIndex++;
    }
    
    const trafficStats = await connection.query(
      `SELECT 
        traffic as type,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN stage = 'CLOSED_WON' THEN value ELSE 0 END), 0) as value
       FROM crm_opportunities
       ${trafficWhere}
       GROUP BY traffic`,
      trafficParams
    );

    const byTrafficType = trafficStats.map(item => ({
      type: item.type,
      count: parseInt(item.count),
      value: parseFloat(item.value || 0)
    }));

    return {
      byTransportType: byTransportType.sort((a, b) => b.value - a.value),
      byTrafficType,
      totalValue
    };
  }

  /**
   * Obtenir les statistiques personnalis�es du commercial connect�
   * ? MULTI-TENANT: Utilise databaseName
   */
  async getCommercialStats(databaseName: string, userId: number): Promise<any> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi

    console.log('?? [getCommercialStats] userId:', userId);

    // Compter TOUS mes prospects NON ARCHIV�S (tous les statuts)
    const myProspectsResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_leads 
       WHERE "assigned_to" = $1 
         AND "is_archived" = false 
         AND "deleted_at" IS NULL`,
      [userId]
    );
    const myProspectsCount = parseInt(myProspectsResult[0]?.count || '0');

    console.log('? [getCommercialStats] myProspectsCount:', myProspectsCount);

    // Compter TOUTES mes opportunit�s NON ARCHIV�ES (tous les stages actifs + closed_won)
    const allActiveStages = [
      'PROSPECTING',
      'QUALIFICATION',
      'NEEDS_ANALYSIS',
      'PROPOSAL',
      'NEGOTIATION',
      'CLOSED_WON'
    ];
    
    const myOpportunitiesResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_opportunities 
       WHERE "assigned_to" = $1 
         AND stage = ANY($2::text[])
         AND "is_archived" = false 
         AND "deleted_at" IS NULL`,
      [userId, allActiveStages]
    );
    const myOpportunitiesCount = parseInt(myOpportunitiesResult[0]?.count || '0');

    console.log('? [getCommercialStats] myOpportunitiesCount:', myOpportunitiesCount);

    // Compter les opportunit�s gagn�es (pour taux de conversion)
    const myWonOpportunitiesResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_opportunities 
       WHERE "assigned_to" = $1 
         AND stage = $2
         AND "is_archived" = false 
         AND "deleted_at" IS NULL`,
      [userId, 'CLOSED_WON']
    );
    const myWonOpportunitiesCount = parseInt(myWonOpportunitiesResult[0]?.count || '0');

    console.log('? [getCommercialStats] myWonOpportunitiesCount:', myWonOpportunitiesCount);

    // Valeur totale de mes opportunit�s actives NON ARCHIV�ES
    const myActiveOpportunities = await connection.query(
      `SELECT COALESCE(SUM(value), 0) as "totalValue" FROM crm_opportunities
       WHERE "assigned_to" = $1
         AND stage = ANY($2::text[])
         AND "is_archived" = false
         AND "deleted_at" IS NULL`,
      [userId, allActiveStages]
    );
    const myActiveOpportunitiesValue = parseFloat(myActiveOpportunities[0]?.totalValue || '0');

    // Compter TOUTES mes cotations NON ARCHIV�ES (tous les statuts)
    const myQuotesResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_quotes 
       WHERE ("commercial_id" = $1 OR $1 = ANY(commercial_ids))
         AND ("is_archived" = false OR "is_archived" IS NULL)
         AND "deleted_at" IS NULL`,
      [userId]
    );
    const myQuotesCount = parseInt(myQuotesResult[0]?.count || '0');

    console.log('? [getCommercialStats] myQuotesCount:', myQuotesCount);

    // Compter cotations accept�es
    const myAcceptedQuotesResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_quotes 
       WHERE ("commercial_id" = $1 OR $1 = ANY(commercial_ids))
         AND status = $2
         AND ("is_archived" = false OR "is_archived" IS NULL)
         AND "deleted_at" IS NULL`,
      [userId, 'accepted']
    );
    const myAcceptedQuotesCount = parseInt(myAcceptedQuotesResult[0]?.count || '0');

    console.log('? [getCommercialStats] myAcceptedQuotesCount:', myAcceptedQuotesCount);

    // CA accept� (mes cotations accept�es NON ARCHIV�ES)
    const myAcceptedQuotes = await connection.query(
      `SELECT 
        COALESCE(SUM(total), 0) as "totalAccepted",
        COALESCE(SUM("total_margin"), 0) as "total_margin"
       FROM crm_quotes 
       WHERE ("commercial_id" = $1 OR $1 = ANY(commercial_ids))
         AND status = $2
         AND ("is_archived" = false OR "is_archived" IS NULL)
         AND "deleted_at" IS NULL`,
      [userId, 'accepted']
    );

    const myAcceptedQuotesValue = parseFloat(myAcceptedQuotes[0]?.totalAccepted || '0');
    const myTotalMargin = parseFloat(myAcceptedQuotes[0]?.totalMargin || '0');

    // Taux de conversion bas� sur opportunit�s gagn�es / prospects
    const myConversionRate = myProspectsCount > 0 
      ? (myWonOpportunitiesCount / myProspectsCount) * 100 
      : 0;

    console.log('? [getCommercialStats] myConversionRate:', myConversionRate, '%');

    // Activit�s cette semaine (opportunit�s cr��es) - NON ARCHIV�ES
    const myActivitiesThisWeekResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_opportunities 
       WHERE "assigned_to" = $1 
         AND "created_at" >= $2
         AND "is_archived" = false 
         AND "deleted_at" IS NULL`,
      [userId, firstDayOfWeek]
    );
    const myActivitiesThisWeek = parseInt(myActivitiesThisWeekResult[0]?.count || '0');

    // Cotations ce mois - NON ARCHIV�ES
    const myQuotesThisMonthResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_quotes 
       WHERE ("commercial_id" = $1 OR $1 = ANY(commercial_ids))
         AND "created_at" >= $2
         AND ("is_archived" = false OR "is_archived" IS NULL)
         AND "deleted_at" IS NULL`,
      [userId, firstDayOfMonth]
    );
    const myQuotesThisMonth = parseInt(myQuotesThisMonthResult[0]?.count || '0');

    // Valeur moyenne des cotations accept�es - NON ARCHIV�ES
    const avgQuoteValue = myAcceptedQuotesCount > 0 ? myAcceptedQuotesValue / myAcceptedQuotesCount : 0;

    const result = {
      myProspectsCount,
      myOpportunitiesCount,
      myWonOpportunitiesCount, // ? NOUVEAU: Opportunit�s gagn�es
      myQuotesCount,
      myAcceptedQuotesCount, // ? NOUVEAU: Cotations accept�es
      myActiveOpportunitiesValue,
      myAcceptedQuotesValue,
      myConversionRate,
      myActivitiesThisWeek,
      myQuotesThisMonth,
      myTotalMargin,
      avgQuoteValue,
      customerSatisfaction: 75, // TODO: Calculer selon les feedbacks clients
      monthlyGoalProgress: 60, // TODO: Calculer selon objectifs d�finis
      teamPerformance: 70, // TODO: Calculer la moyenne de l'�quipe
      growth: 0 // Sera calcul� dans la performance mensuelle
    };

    console.log('?? [getCommercialStats] Result:', result);

    return result;
  }

  /**
   * Obtenir la performance mensuelle du commercial
   * ? MULTI-TENANT: Utilise databaseName
   */
  async getCommercialPerformance(databaseName: string, userId: number, filters?: DashboardFilters): Promise<any> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const endDate = filters?.endDate || new Date();
    const startDate = filters?.startDate || new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1);

    // Performance mensuelle
    const monthlyData = await connection.query(
      `SELECT 
        EXTRACT(MONTH FROM "created_at") as month,
        EXTRACT(YEAR FROM "created_at") as year,
        COUNT(*) as opportunities,
        COUNT(CASE WHEN stage = $1 THEN 1 END) as "wonDeals",
        COALESCE(SUM(value), 0) as "totalValue",
        COALESCE(SUM(CASE WHEN stage = $1 THEN value ELSE 0 END), 0) as "wonValue"
       FROM crm_opportunities
       WHERE "assigned_to" = $2
         AND "created_at" BETWEEN $3 AND $4
       GROUP BY EXTRACT(YEAR FROM "created_at"), EXTRACT(MONTH FROM "created_at")
       ORDER BY year, month`,
      ['CLOSED_WON', userId, startDate, endDate]
    );

    const monthNames = ['Jan', 'F�v', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Ao�t', 'Sep', 'Oct', 'Nov', 'D�c'];
    
    const monthly = monthlyData.map(item => ({
      month: monthNames[parseInt(item.month) - 1],
      year: parseInt(item.year),
      opportunities: parseInt(item.opportunities),
      wonDeals: parseInt(item.wonDeals),
      totalValue: parseFloat(item.totalValue || 0),
      wonValue: parseFloat(item.wonValue || 0),
      totalMargin: parseFloat(item.wonValue || 0) * 0.15, // Estimation 15% de marge
      quotes: 0, // TODO: Ajouter les cotations
      acceptedQuotes: 0 // TODO: Ajouter les cotations accept�es
    }));

    // Calculer la croissance
    const currentMonth = monthly[monthly.length - 1];
    const previousMonth = monthly[monthly.length - 2];
    const growth = previousMonth && previousMonth.wonValue > 0
      ? ((currentMonth.wonValue - previousMonth.wonValue) / previousMonth.wonValue) * 100
      : 0;

    // R�partition par type de transport (pour ce commercial)
    let transportParams: any[] = ['CLOSED_WON', userId];
    let transportWhere = '';
    let transportParamIndex = 3;
    
    if (filters?.startDate && filters?.endDate) {
      transportWhere = ` AND "created_at" BETWEEN $${transportParamIndex} AND $${transportParamIndex + 1}`;
      transportParams.push(filters.startDate, filters.endDate);
      transportParamIndex += 2;
    }
    
    const transportStats = await connection.query(
      `SELECT 
        "transport_type" as type,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN stage = $1 THEN value ELSE 0 END), 0) as value
       FROM crm_opportunities
       WHERE "assigned_to" = $2
         AND "transport_type" IS NOT NULL
         ${transportWhere}
       GROUP BY "transport_type"`,
      transportParams
    );

    const byTransportType = transportStats.map(item => ({
      type: item.type,
      count: parseInt(item.count),
      value: parseFloat(item.value || 0)
    }));

    return {
      monthly,
      growth,
      byTransportType
    };
  }

  /**
   * Obtenir les statistiques Import/Export bas�es sur les cotations
   * ? MULTI-TENANT: Utilise databaseName
   */
  async getImportExportStats(databaseName: string, filters?: DashboardFilters): Promise<any> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    console.log('?? [getImportExportStats] R�cup�ration des statistiques Import/Export');
    console.log('?? [getImportExportStats] Filtres re�us:', filters);
    
    // Compter d'abord toutes les cotations NON ARCHIV�ES pour debug
    const totalQuotesResult = await connection.query(
      `SELECT COUNT(*) as count FROM crm_quotes 
       WHERE "deleted_at" IS NULL 
         AND ("is_archived" = false OR "is_archived" IS NULL)`
    );
    const totalQuotes = parseInt(totalQuotesResult[0]?.count || '0');
    console.log('?? [getImportExportStats] Total cotations NON ARCHIV�ES:', totalQuotes);
    
    // Construire la requ�te de base - utiliser le nom SQL de la colonne: import_export
    let statsParams: any[] = [];
    let statsWhere = ` WHERE "deleted_at" IS NULL 
                       AND ("is_archived" = false OR "is_archived" IS NULL)
                       AND import_export IS NOT NULL 
                       AND import_export != ''`;
    let statsParamIndex = 1;
    
    // Appliquer les filtres de date si fournis
    if (filters?.startDate && filters?.endDate) {
      statsWhere += ` AND "created_at" BETWEEN $${statsParamIndex} AND $${statsParamIndex + 1}`;
      statsParams = [filters.startDate, filters.endDate];
      statsParamIndex += 2;
    }
    
    const stats = await connection.query(
      `SELECT 
        import_export as type,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as "totalValue",
        COALESCE(SUM(total_margin), 0) as "total_margin"
       FROM crm_quotes
       ${statsWhere}
       GROUP BY import_export`,
      statsParams
    );
    
    console.log('? [getImportExportStats] Stats brutes:', stats);
    console.log('? [getImportExportStats] Nombre de lignes:', stats.length);
    
    // Si aucune donn�e, retourner des valeurs par d�faut
    if (!stats || stats.length === 0) {
      console.warn('?? [getImportExportStats] Aucune cotation avec import_export trouv�e');
      return {
        stats: [
          { type: 'Import', count: 0, totalValue: 0, totalMargin: 0, percentage: '0' },
          { type: 'Export', count: 0, totalValue: 0, totalMargin: 0, percentage: '0' }
        ],
        totals: {
          count: 0,
          value: 0,
          margin: 0
        }
      };
    }
    
    // Calculer le total pour les pourcentages
    const totalValue = stats.reduce((sum, item) => sum + parseFloat(item.totalValue || 0), 0);
    const totalCount = stats.reduce((sum, item) => sum + parseInt(item.count || 0), 0);
    
    console.log('?? [getImportExportStats] Total Value:', totalValue);
    console.log('?? [getImportExportStats] Total Count:', totalCount);
    
    // Normaliser les types (Import/Imp -> Import, Export/Exp -> Export)
    const formattedStats = stats.map(item => {
      let normalizedType = item.type || 'Non d�fini';
      
      // Normaliser les variations
      if (normalizedType.toLowerCase().includes('imp')) {
        normalizedType = 'Import';
      } else if (normalizedType.toLowerCase().includes('exp')) {
        normalizedType = 'Export';
      }
      
      return {
        type: normalizedType,
        count: parseInt(item.count || 0),
        totalValue: parseFloat(item.totalValue || 0),
        totalMargin: parseFloat(item.totalMargin || 0),
        percentage: totalValue > 0 ? parseFloat(((parseFloat(item.totalValue || 0) / totalValue) * 100).toFixed(1)) : 0
      };
    });
    
    console.log('? [getImportExportStats] Stats format�es:', formattedStats);
    
    return {
      stats: formattedStats,
      totals: {
        count: totalCount,
        value: totalValue,
        margin: stats.reduce((sum, item) => sum + parseFloat(item.totalMargin || 0), 0)
      }
    };
  }
}
