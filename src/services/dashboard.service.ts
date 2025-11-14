import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, IsNull } from 'typeorm';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';
import { Lead, LeadStatus } from '../entities/crm/lead.entity';
import { Opportunity, OpportunityStage, TransportType } from '../entities/crm/opportunity.entity';
import { Quote } from '../crm/entities/quote.entity';
import { ObjectifCom } from '../entities/objectif-com.entity';

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
  
  // Statistiques détaillées
  personnelByRole: { role: string; count: number }[];
  clientsByStatus: { statut: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
  opportunitiesByStage: { stage: string; count: number; totalValue: number }[];
  
  // Métriques de performance
  conversionRate: number;
  avgOpportunityValue: number;
  totalPipelineValue: number;
  wonOpportunitiesValue: number;
  monthlyGrowth: number;
  
  // Période
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
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    @InjectRepository(ObjectifCom)
    private objectifRepository: Repository<ObjectifCom>,
  ) {}

  /**
   * Construire la clause WHERE avec les filtres de période et type de transport
   */
  private buildWhereClause(filters?: DashboardFilters): any {
    const where: any = {};
    
    if (filters?.startDate && filters?.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    }
    
    if (filters?.transportType) {
      where.transportType = filters.transportType;
    }
    
    if (filters?.trafficType) {
      where.traffic = filters.trafficType;
    }
    
    return where;
  }

  /**
   * Obtenir les statistiques globales du dashboard avec filtres
   */
  async getDashboardStats(filters?: DashboardFilters): Promise<DashboardStatsResponse> {
    console.log('📊 [getDashboardStats] Début avec filtres:', filters);
    
    const periodStart = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
    const periodEnd = filters?.endDate || new Date();
    
    console.log('📅 [getDashboardStats] Période:', { periodStart, periodEnd });
    
    // Compter le personnel actif (pas affecté par les filtres de période)
    const totalPersonnel = await this.personnelRepository.count({
      where: { statut: 'actif' }
    });
    console.log('👥 [getDashboardStats] Personnel actif:', totalPersonnel);

    // Compter les clients actifs (pas affecté par les filtres de période)
    const totalClients = await this.clientRepository.count({
      where: { statut: 'actif' }
    });
    console.log('🏢 [getDashboardStats] Clients actifs:', totalClients);

    // Leads avec filtres
    const leadWhere = this.buildWhereClause(filters);
    const totalLeads = await this.leadRepository.count({ where: leadWhere });
    console.log('👤 [getDashboardStats] Total Leads:', totalLeads, 'WHERE:', leadWhere);

    // Opportunités avec filtres
    const oppWhere = this.buildWhereClause(filters);
    const activeStages = [
      OpportunityStage.PROSPECTING,
      OpportunityStage.QUALIFICATION,
      OpportunityStage.NEEDS_ANALYSIS,
      OpportunityStage.PROPOSAL,
      OpportunityStage.NEGOTIATION
    ];
    
    const totalOpportunities = await this.opportunityRepository.count({
      where: {
        ...oppWhere,
        stage: In(activeStages)
      }
    });
    console.log('💼 [getDashboardStats] Total Opportunités:', totalOpportunities);

    // Personnel par rôle
    const personnelByRole = await this.personnelRepository
      .createQueryBuilder('personnel')
      .select('personnel.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('personnel.statut = :statut', { statut: 'actif' })
      .groupBy('personnel.role')
      .getRawMany();

    // Clients par statut
    const clientsByStatus = await this.clientRepository
      .createQueryBuilder('client')
      .select('client.statut', 'statut')
      .addSelect('COUNT(*)', 'count')
      .groupBy('client.statut')
      .getRawMany();

    // Leads par statut (avec filtres)
    let leadsByStatusQuery = this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count');
    
    if (filters?.startDate && filters?.endDate) {
      leadsByStatusQuery = leadsByStatusQuery.where(
        'lead.createdAt BETWEEN :start AND :end',
        { start: filters.startDate, end: filters.endDate }
      );
    }
    
    const leadsByStatus = await leadsByStatusQuery.groupBy('lead.status').getRawMany();

    // Opportunités par stage avec valeur totale (avec filtres)
    let oppsByStageQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .select('opp.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(opp.value)', 'totalValue');
    
    if (filters?.startDate && filters?.endDate) {
      oppsByStageQuery = oppsByStageQuery.where(
        'opp.createdAt BETWEEN :start AND :end',
        { start: filters.startDate, end: filters.endDate }
      );
    }
    
    if (filters?.transportType) {
      oppsByStageQuery = oppsByStageQuery.andWhere(
        'opp.transportType = :type',
        { type: filters.transportType }
      );
    }
    
    const opportunitiesByStage = await oppsByStageQuery.groupBy('opp.stage').getRawMany();

    // Calcul du taux de conversion (avec filtres)
    const convertedLeads = await this.leadRepository.count({
      where: {
        ...leadWhere,
        status: LeadStatus.CONVERTED
      }
    });
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    console.log('📈 [getDashboardStats] Taux de conversion:', {
      convertedLeads,
      totalLeads,
      conversionRate: `${conversionRate.toFixed(2)}%`
    });

    // Valeur moyenne des opportunités (avec filtres)
    let avgQuery = this.opportunityRepository.createQueryBuilder('opp');
    
    if (filters?.startDate && filters?.endDate) {
      avgQuery = avgQuery.where(
        'opp.createdAt BETWEEN :start AND :end',
        { start: filters.startDate, end: filters.endDate }
      );
    }
    
    if (filters?.transportType) {
      avgQuery = avgQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const avgResult = await avgQuery.select('AVG(opp.value)', 'avg').getRawOne();
    const avgOpportunityValue = parseFloat(avgResult?.avg || '0');
    console.log('💰 [getDashboardStats] Valeur moyenne opportunité:', avgOpportunityValue);

    // Valeur totale du pipeline (avec filtres)
    let pipelineQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .select('SUM(opp.value)', 'total')
      .where('opp.stage NOT IN (:...stages)', {
        stages: [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]
      });
    
    if (filters?.startDate && filters?.endDate) {
      pipelineQuery = pipelineQuery.andWhere(
        'opp.createdAt BETWEEN :start AND :end',
        { start: filters.startDate, end: filters.endDate }
      );
    }
    
    if (filters?.transportType) {
      pipelineQuery = pipelineQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const pipelineResult = await pipelineQuery.getRawOne();
    const totalPipelineValue = parseFloat(pipelineResult?.total || '0');
    console.log('🔢 [getDashboardStats] Valeur pipeline:', totalPipelineValue);

    // CA basé sur le montant total TTC des cotations acceptées (même logique que les rapports)
    let wonQuery = this.quoteRepository
      .createQueryBuilder('quote')
      .select('SUM(quote.total)', 'total')
      .where('quote.status = :status', { status: 'accepted' });
    
    if (filters?.startDate && filters?.endDate) {
      wonQuery = wonQuery.andWhere(
        'quote.acceptedAt BETWEEN :start AND :end',
        { start: filters.startDate, end: filters.endDate }
      );
    }
    
    const wonResult = await wonQuery.getRawOne();
    const wonOpportunitiesValue = parseFloat(wonResult?.total || '0');
    
    // Debug: Afficher les cotations acceptées
    console.log('💵 [getDashboardStats] CA Réalisé (cotations acceptées):', wonOpportunitiesValue);
    if (filters?.startDate && filters?.endDate) {
      const debugQuotes = await this.quoteRepository
        .createQueryBuilder('quote')
        .where('quote.status = :status', { status: 'accepted' })
        .andWhere('quote.acceptedAt BETWEEN :start AND :end', {
          start: filters.startDate,
          end: filters.endDate
        })
        .getMany();
      console.log('  → Nombre de cotations acceptées:', debugQuotes.length);
      if (debugQuotes.length > 0) {
        console.log('  → Exemples:', debugQuotes.slice(0, 3).map(q => ({
          number: q.quoteNumber,
          total: q.total,
          acceptedAt: q.acceptedAt
        })));
      }
    }

    // Croissance mensuelle
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let currentMonthQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .where('opp.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
      .andWhere('opp.actualCloseDate BETWEEN :start AND :end', {
        start: currentMonth,
        end: now
      });
    
    if (filters?.transportType) {
      currentMonthQuery = currentMonthQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const currentMonthOpps = await currentMonthQuery.getCount();

    let lastMonthQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .where('opp.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
      .andWhere('opp.actualCloseDate BETWEEN :start AND :end', {
        start: lastMonth,
        end: currentMonth
      });
    
    if (filters?.transportType) {
      lastMonthQuery = lastMonthQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const lastMonthOpps = await lastMonthQuery.getCount();

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
    
    console.log('✅ [getDashboardStats] Réponse finale:', {
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
   * Obtenir l'évolution des ventes sur 12 mois avec filtres
   */
  async getSalesEvolution(filters?: DashboardFilters): Promise<SalesEvolutionResponse> {
    const now = filters?.endDate || new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    const monthlyData = [];

    // Récupérer les données pour les 12 derniers mois
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthName = monthDate.toLocaleDateString('fr-FR', { month: 'short' });
      const year = monthDate.getFullYear();

      // Opportunités créées ce mois (avec filtres)
      let oppsQuery = this.opportunityRepository
        .createQueryBuilder('opp')
        .where('opp.createdAt BETWEEN :start AND :end', {
          start: monthDate,
          end: nextMonth
        });
      
      if (filters?.transportType) {
        oppsQuery = oppsQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
      }
      
      const opportunities = await oppsQuery.getCount();

      // Opportunités gagnées ce mois (avec filtres)
      let wonQuery = this.opportunityRepository
        .createQueryBuilder('opp')
        .where('opp.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
        .andWhere('opp.actualCloseDate BETWEEN :start AND :end', {
          start: monthDate,
          end: nextMonth
        });
      
      if (filters?.transportType) {
        wonQuery = wonQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
      }
      
      const wonDeals = await wonQuery.getCount();

      // Valeur totale des opportunités créées (avec filtres)
      let totalValueQuery = this.opportunityRepository
        .createQueryBuilder('opp')
        .select('SUM(opp.value)', 'total')
        .where('opp.createdAt BETWEEN :start AND :end', {
          start: monthDate,
          end: nextMonth
        });
      
      if (filters?.transportType) {
        totalValueQuery = totalValueQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
      }
      
      const totalValueResult = await totalValueQuery.getRawOne();

      // CA basé sur le montant total des cotations acceptées
      let wonValueQuery = this.quoteRepository
        .createQueryBuilder('quote')
        .select('SUM(quote.total)', 'total')
        .where('quote.status = :status', { status: 'accepted' })
        .andWhere('quote.acceptedAt BETWEEN :start AND :end', {
          start: monthDate,
          end: nextMonth
        });
      
      const wonValueResult = await wonValueQuery.getRawOne();

      // Marge réelle des cotations acceptées ce mois (avec filtres)
      let marginQuery = this.quoteRepository
        .createQueryBuilder('quote')
        .select('SUM(quote.totalMargin)', 'total')
        .where('quote.status = :status', { status: 'accepted' })
        .andWhere('quote.acceptedAt BETWEEN :start AND :end', {
          start: monthDate,
          end: nextMonth
        });
      
      const marginResult = await marginQuery.getRawOne();
      
      const wonValue = parseFloat(wonValueResult?.total || '0');
      const totalMargin = parseFloat(marginResult?.total || '0');
      
      // Debug: Logger les valeurs pour ce mois avec les requêtes SQL
      if (wonValue > 0 || totalMargin > 0) {
        console.log(`📊 ${monthName} ${year}:`, {
          wonValue,
          totalMargin,
          wonValueRaw: wonValueResult?.total,
          marginRaw: marginResult?.total,
          dateRange: {
            start: monthDate.toISOString(),
            end: nextMonth.toISOString()
          }
        });
        
        // Requête de debug pour voir les cotations acceptées ce mois
        const debugQuotes = await this.quoteRepository
          .createQueryBuilder('quote')
          .select(['quote.id', 'quote.quoteNumber', 'quote.total', 'quote.totalMargin', 'quote.acceptedAt'])
          .where('quote.status = :status', { status: 'accepted' })
          .andWhere('quote.acceptedAt BETWEEN :start AND :end', {
            start: monthDate,
            end: nextMonth
          })
          .getMany();
        
        if (debugQuotes.length > 0) {
          console.log(`  → ${debugQuotes.length} cotations acceptées:`, debugQuotes.map(q => ({
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
        totalValue: parseFloat(totalValueResult?.total || '0'),
        wonValue,
        totalMargin
      });
    }

    // Comparaison annuelle (avec filtres)
    const currentYearStart = new Date(currentYear, 0, 1);
    const lastYearStart = new Date(lastYear, 0, 1);
    const lastYearEnd = new Date(currentYear, 0, 1);

    // Année en cours
    let currentYearQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .where('opp.createdAt BETWEEN :start AND :end', {
        start: currentYearStart,
        end: now
      });
    
    if (filters?.transportType) {
      currentYearQuery = currentYearQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const currentYearTotal = await currentYearQuery.getCount();

    let currentYearWonQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .where('opp.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
      .andWhere('opp.actualCloseDate BETWEEN :start AND :end', {
        start: currentYearStart,
        end: now
      });
    
    if (filters?.transportType) {
      currentYearWonQuery = currentYearWonQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const currentYearWon = await currentYearWonQuery.getCount();

    // CA annuel basé sur le montant total TTC des cotations acceptées
    let currentYearValueQuery = this.quoteRepository
      .createQueryBuilder('quote')
      .select('SUM(quote.total)', 'total')
      .where('quote.status = :status', { status: 'accepted' })
      .andWhere('quote.acceptedAt BETWEEN :start AND :end', {
        start: currentYearStart,
        end: now
      });
    
    const currentYearValueResult = await currentYearValueQuery.getRawOne();

    // Année précédente (avec filtres)
    let lastYearQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .where('opp.createdAt BETWEEN :start AND :end', {
        start: lastYearStart,
        end: lastYearEnd
      });
    
    if (filters?.transportType) {
      lastYearQuery = lastYearQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const lastYearTotal = await lastYearQuery.getCount();

    let lastYearWonQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .where('opp.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
      .andWhere('opp.actualCloseDate BETWEEN :start AND :end', {
        start: lastYearStart,
        end: lastYearEnd
      });
    
    if (filters?.transportType) {
      lastYearWonQuery = lastYearWonQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const lastYearWon = await lastYearWonQuery.getCount();

    // CA année précédente basé sur le montant total TTC des cotations acceptées
    let lastYearValueQuery = this.quoteRepository
      .createQueryBuilder('quote')
      .select('SUM(quote.total)', 'total')
      .where('quote.status = :status', { status: 'accepted' })
      .andWhere('quote.acceptedAt BETWEEN :start AND :end', {
        start: lastYearStart,
        end: lastYearEnd
      });
    
    const lastYearValueResult = await lastYearValueQuery.getRawOne();

    const currentYearValue = parseFloat(currentYearValueResult?.total || '0');
    const lastYearValue = parseFloat(lastYearValueResult?.total || '0');
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
   * Obtenir les statistiques CRM détaillées avec filtres
   */
  async getCRMStats(filters?: DashboardFilters): Promise<CRMStatsResponse> {
    const leadWhere = this.buildWhereClause(filters);
    
    // Statistiques des leads (avec filtres)
    const totalLeads = await this.leadRepository.count({ where: leadWhere });
    const newLeads = await this.leadRepository.count({ 
      where: { ...leadWhere, status: LeadStatus.NEW } 
    });
    const contactedLeads = await this.leadRepository.count({ 
      where: { ...leadWhere, status: LeadStatus.CONTACTED } 
    });
    const qualifiedLeads = await this.leadRepository.count({ 
      where: { ...leadWhere, status: LeadStatus.QUALIFIED } 
    });
    const convertedLeads = await this.leadRepository.count({ 
      where: { ...leadWhere, status: LeadStatus.CONVERTED } 
    });
    const lostLeads = await this.leadRepository.count({ 
      where: { ...leadWhere, status: LeadStatus.LOST } 
    });

    // Statistiques des opportunités (avec filtres)
    let oppQuery = this.opportunityRepository.createQueryBuilder('opp');
    
    if (filters?.startDate && filters?.endDate) {
      oppQuery = oppQuery.where('opp.createdAt BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    if (filters?.transportType) {
      oppQuery = oppQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const totalOpps = await oppQuery.getCount();
    
    // Opportunités par stage (avec filtres)
    let oppsByStageQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .select('opp.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(opp.value), 0)', 'value');
    
    if (filters?.startDate && filters?.endDate) {
      oppsByStageQuery = oppsByStageQuery.where('opp.createdAt BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    if (filters?.transportType) {
      oppsByStageQuery = oppsByStageQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const oppsByStage = await oppsByStageQuery.groupBy('opp.stage').getRawMany();

    // Valeur totale, moyenne, etc. (avec filtres)
    let statsQuery = this.opportunityRepository.createQueryBuilder('opp');
    
    if (filters?.startDate && filters?.endDate) {
      statsQuery = statsQuery.where('opp.createdAt BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    if (filters?.transportType) {
      statsQuery = statsQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const totalValueResult = await statsQuery.select('SUM(opp.value)', 'total').getRawOne();
    const totalValue = parseFloat(totalValueResult?.total || '0');

    const avgValueResult = await statsQuery.select('AVG(opp.value)', 'avg').getRawOne();
    const avgValue = parseFloat(avgValueResult?.total || '0');

    let wonQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .where('opp.stage = :stage', { stage: OpportunityStage.CLOSED_WON });
    
    if (filters?.startDate && filters?.endDate) {
      wonQuery = wonQuery.andWhere('opp.actualCloseDate BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    if (filters?.transportType) {
      wonQuery = wonQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const wonValueResult = await wonQuery.select('SUM(opp.value)', 'total').getRawOne();
    const wonValue = parseFloat(wonValueResult?.total || '0');
    const wonCount = await wonQuery.getCount();

    let lostQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .where('opp.stage = :stage', { stage: OpportunityStage.CLOSED_LOST });
    
    if (filters?.startDate && filters?.endDate) {
      lostQuery = lostQuery.andWhere('opp.createdAt BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    if (filters?.transportType) {
      lostQuery = lostQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const lostCount = await lostQuery.getCount();

    // Taux de conversion Prospect → Opportunité (même logique que la page Reports)
    const conversionRate = totalLeads > 0 ? (totalOpps / totalLeads) * 100 : 0;

    // Taux de victoire
    const closedTotal = wonCount + lostCount;
    const winRate = closedTotal > 0 ? (wonCount / closedTotal) * 100 : 0;

    // Durée moyenne du cycle de vente (avec filtres)
    let cycleQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .select('AVG(DATE_PART(\'day\', opp.actualCloseDate - opp.createdAt))', 'avgDays')
      .where('opp.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
      .andWhere('opp.actualCloseDate IS NOT NULL');
    
    if (filters?.startDate && filters?.endDate) {
      cycleQuery = cycleQuery.andWhere('opp.actualCloseDate BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    if (filters?.transportType) {
      cycleQuery = cycleQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const cycleResult = await cycleQuery.getRawOne();
    const avgSalesCycle = parseFloat(cycleResult?.avgDays || '0');

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
   * Obtenir les activités récentes avec filtres
   */
  async getRecentActivities(limit: number = 10, filters?: DashboardFilters): Promise<RecentActivityResponse[]> {
    const activities: RecentActivityResponse[] = [];

    // Récupérer les derniers leads créés (avec filtres)
    let leadsQuery = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.createdBy', 'createdBy')
      .orderBy('lead.createdAt', 'DESC')
      .take(Math.ceil(limit / 3));
    
    if (filters?.startDate && filters?.endDate) {
      leadsQuery = leadsQuery.where('lead.createdAt BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    const recentLeads = await leadsQuery.getMany();

    for (const lead of recentLeads) {
      activities.push({
        id: lead.id,
        type: 'lead_created',
        description: `Nouveau prospect: ${lead.fullName} - ${lead.company}`,
        entityType: 'lead',
        entityId: lead.id,
        entityName: lead.fullName,
        userId: lead.createdById || 0,
        userName: lead.createdBy?.nom || 'Système',
        createdAt: lead.createdAt,
        metadata: { company: lead.company, source: lead.source }
      });
    }

    // Récupérer les dernières opportunités créées (avec filtres)
    let oppsQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .leftJoinAndSelect('opp.createdBy', 'createdBy')
      .orderBy('opp.createdAt', 'DESC')
      .take(Math.ceil(limit / 3));
    
    if (filters?.startDate && filters?.endDate) {
      oppsQuery = oppsQuery.where('opp.createdAt BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    if (filters?.transportType) {
      oppsQuery = oppsQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const recentOpps = await oppsQuery.getMany();

    for (const opp of recentOpps) {
      activities.push({
        id: opp.id,
        type: 'opportunity_created',
        description: `Nouvelle opportunité: ${opp.title}`,
        entityType: 'opportunity',
        entityId: opp.id,
        entityName: opp.title,
        userId: opp.createdById || 0,
        userName: opp.createdBy?.nom || 'Système',
        createdAt: opp.createdAt,
        metadata: { value: opp.value, stage: opp.stage, transportType: opp.transportType }
      });
    }

    // Récupérer les derniers clients créés (avec filtres)
    let clientsQuery = this.clientRepository
      .createQueryBuilder('client')
      .orderBy('client.created_at', 'DESC')
      .take(Math.ceil(limit / 3));
    
    if (filters?.startDate && filters?.endDate) {
      clientsQuery = clientsQuery.where('client.created_at BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    const recentClients = await clientsQuery.getMany();

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
    let quotesQuery = this.quoteRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.creator', 'creator')
      .orderBy('quote.createdAt', 'DESC')
      .take(Math.ceil(limit / 4));
    
    if (filters?.startDate && filters?.endDate) {
      quotesQuery = quotesQuery.where('quote.createdAt BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    const recentQuotes = await quotesQuery.getMany();

    for (const quote of recentQuotes) {
      activities.push({
        id: quote.id,
        type: 'quote_created',
        description: `Nouvelle cotation: ${quote.title || quote.quoteNumber}`,
        entityType: 'quote',
        entityId: quote.id,
        entityName: quote.title || quote.quoteNumber,
        userId: quote.createdBy || 0,
        userName: quote.creator?.nom || 'Système',
        createdAt: quote.createdAt,
        metadata: { 
          quoteNumber: quote.quoteNumber, 
          status: quote.status,
          total: quote.total 
        }
      });
    }

    // Trier par date décroissante et limiter
    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Obtenir la répartition des ventes par type de transport avec filtres
   */
  async getTransportDistribution(filters?: DashboardFilters): Promise<{
    byTransportType: { type: string; count: number; value: number; percentage: number }[];
    byTrafficType: { type: string; count: number; value: number }[];
    totalValue: number;
  }> {
    console.log('🚛 [getTransportDistribution] Début avec filtres:', filters);
    
    // Répartition par type de transport (avec filtres)
    let transportQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .select('opp.transportType', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(CASE WHEN opp.stage = :won THEN opp.value ELSE 0 END), 0)', 'value')
      .where('opp.transportType IS NOT NULL')
      .setParameter('won', OpportunityStage.CLOSED_WON);
    
    if (filters?.startDate && filters?.endDate) {
      transportQuery = transportQuery.andWhere('opp.actualCloseDate BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    const transportStats = await transportQuery.groupBy('opp.transportType').getRawMany();
    console.log('📊 [getTransportDistribution] Stats brutes:', transportStats);

    const totalValue = transportStats.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    console.log('💰 [getTransportDistribution] Valeur totale:', totalValue);

    const byTransportType = transportStats.map(item => ({
      type: item.type,
      count: parseInt(item.count),
      value: parseFloat(item.value || 0),
      percentage: totalValue > 0 ? (parseFloat(item.value || 0) / totalValue) * 100 : 0
    }));

    console.log('✅ [getTransportDistribution] Par type transport:', byTransportType);

    // Répartition par type de trafic (Import/Export) avec filtres
    let trafficQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .select('opp.traffic', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(CASE WHEN opp.stage = :won THEN opp.value ELSE 0 END), 0)', 'value')
      .where('opp.traffic IS NOT NULL')
      .setParameter('won', OpportunityStage.CLOSED_WON);
    
    if (filters?.startDate && filters?.endDate) {
      trafficQuery = trafficQuery.andWhere('opp.actualCloseDate BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    if (filters?.transportType) {
      trafficQuery = trafficQuery.andWhere('opp.transportType = :type', { type: filters.transportType });
    }
    
    const trafficStats = await trafficQuery.groupBy('opp.traffic').getRawMany();

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
   * Obtenir les statistiques personnalisées du commercial connecté
   */
  async getCommercialStats(userId: number): Promise<any> {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi

    console.log('📊 [getCommercialStats] userId:', userId);

    // Compter TOUS mes prospects NON ARCHIVÉS (tous les statuts)
    // ✅ CORRECTION: Gérer NULL comme FALSE
    const myProspectsCount = await this.leadRepository.count({
      where: { 
        assignedToId: userId,
        isArchived: false,
        deletedAt: IsNull() // ✅ Exclure soft-deleted
      }
    });

    console.log('✅ [getCommercialStats] myProspectsCount:', myProspectsCount);

    // Compter TOUTES mes opportunités NON ARCHIVÉES (tous les stages actifs + closed_won)
    const allActiveStages = [
      OpportunityStage.PROSPECTING,
      OpportunityStage.QUALIFICATION,
      OpportunityStage.NEEDS_ANALYSIS,
      OpportunityStage.PROPOSAL,
      OpportunityStage.NEGOTIATION,
      OpportunityStage.CLOSED_WON // ✅ INCLURE les opportunités gagnées dans le comptage
    ];
    
    // ✅ CORRECTION: Ajouter deletedAt: IsNull() pour exclure les soft-deleted
    const myOpportunitiesCount = await this.opportunityRepository.count({
      where: { 
        assignedToId: userId,
        stage: In(allActiveStages),
        isArchived: false,
        deletedAt: IsNull() // ✅ Exclure soft-deleted
      }
    });

    console.log('✅ [getCommercialStats] myOpportunitiesCount:', myOpportunitiesCount);

    // Compter les opportunités gagnées (pour taux de conversion)
    // ✅ CORRECTION: Ajouter deletedAt: IsNull()
    const myWonOpportunitiesCount = await this.opportunityRepository.count({
      where: { 
        assignedToId: userId,
        stage: OpportunityStage.CLOSED_WON,
        isArchived: false,
        deletedAt: IsNull() // ✅ Exclure soft-deleted
      }
    });

    console.log('✅ [getCommercialStats] myWonOpportunitiesCount:', myWonOpportunitiesCount);

    // Valeur totale de mes opportunités actives NON ARCHIVÉES
    // ✅ CORRECTION: Ajouter deletedAt IS NULL
    const myActiveOpportunities = await this.opportunityRepository
      .createQueryBuilder('opp')
      .select('COALESCE(SUM(opp.value), 0)', 'totalValue')
      .where('opp.assignedToId = :userId', { userId })
      .andWhere('opp.stage IN (:...stages)', { stages: allActiveStages })
      .andWhere('opp.isArchived = :isArchived', { isArchived: false })
      .andWhere('opp.deletedAt IS NULL') // ✅ Exclure soft-deleted
      .getRawOne();

    const myActiveOpportunitiesValue = parseFloat(myActiveOpportunities?.totalValue || 0);

    // Compter TOUTES mes cotations NON ARCHIVÉES (tous les statuts)
    // ✅ CORRECTION: Utiliser commercialId ET commercialIds (système multi-commerciaux)
    const myQuotesCount = await this.quoteRepository
      .createQueryBuilder('quote')
      .where('(quote.commercialId = :userId OR :userId = ANY(quote.commercial_ids))', { userId })
      .andWhere('(quote.isArchived = :isArchived OR quote.isArchived IS NULL)', { isArchived: false })
      .andWhere('quote.deletedAt IS NULL') // ✅ Exclure soft-deleted
      .getCount();

    console.log('✅ [getCommercialStats] myQuotesCount:', myQuotesCount);

    // Compter cotations acceptées
    // ✅ CORRECTION: Utiliser commercialId ET commercialIds (système multi-commerciaux)
    const myAcceptedQuotesCount = await this.quoteRepository
      .createQueryBuilder('quote')
      .where('(quote.commercialId = :userId OR :userId = ANY(quote.commercial_ids))', { userId })
      .andWhere('quote.status = :status', { status: 'accepted' })
      .andWhere('(quote.isArchived = :isArchived OR quote.isArchived IS NULL)', { isArchived: false })
      .andWhere('quote.deletedAt IS NULL') // ✅ Exclure soft-deleted
      .getCount();

    console.log('✅ [getCommercialStats] myAcceptedQuotesCount:', myAcceptedQuotesCount);

    // CA accepté (mes cotations acceptées NON ARCHIVÉES)
    // ✅ CORRECTION: Utiliser commercialId ET commercialIds (système multi-commerciaux)
    const myAcceptedQuotes = await this.quoteRepository
      .createQueryBuilder('quote')
      .select('COALESCE(SUM(quote.total), 0)', 'totalAccepted')
      .addSelect('COALESCE(SUM(quote.totalMargin), 0)', 'totalMargin')
      .where('(quote.commercialId = :userId OR :userId = ANY(quote.commercial_ids))', { userId })
      .andWhere('quote.status = :status', { status: 'accepted' })
      .andWhere('(quote.isArchived = :isArchived OR quote.isArchived IS NULL)', { isArchived: false })
      .andWhere('quote.deletedAt IS NULL') // ✅ Exclure soft-deleted
      .getRawOne();

    const myAcceptedQuotesValue = parseFloat(myAcceptedQuotes?.totalAccepted || 0);
    const myTotalMargin = parseFloat(myAcceptedQuotes?.totalMargin || 0);

    // Taux de conversion basé sur opportunités gagnées / prospects
    const myConversionRate = myProspectsCount > 0 
      ? (myWonOpportunitiesCount / myProspectsCount) * 100 
      : 0;

    console.log('✅ [getCommercialStats] myConversionRate:', myConversionRate, '%');

    // Activités cette semaine (opportunités créées) - NON ARCHIVÉES
    // ✅ CORRECTION: Ajouter deletedAt IS NULL
    const myActivitiesThisWeek = await this.opportunityRepository
      .createQueryBuilder('opp')
      .where('opp.assignedToId = :userId', { userId })
      .andWhere('opp.createdAt >= :weekStart', { weekStart: firstDayOfWeek })
      .andWhere('opp.isArchived = :isArchived', { isArchived: false })
      .andWhere('opp.deletedAt IS NULL') // ✅ Exclure soft-deleted
      .getCount();

    // Cotations ce mois - NON ARCHIVÉES
    // ✅ CORRECTION: Utiliser commercialId ET commercialIds (système multi-commerciaux)
    const myQuotesThisMonth = await this.quoteRepository
      .createQueryBuilder('quote')
      .where('(quote.commercialId = :userId OR :userId = ANY(quote.commercial_ids))', { userId })
      .andWhere('quote.createdAt >= :monthStart', { monthStart: firstDayOfMonth })
      .andWhere('(quote.isArchived = :isArchived OR quote.isArchived IS NULL)', { isArchived: false })
      .andWhere('quote.deletedAt IS NULL') // ✅ Exclure soft-deleted
      .getCount();

    // Valeur moyenne des cotations acceptées - NON ARCHIVÉES
    const avgQuoteValue = myAcceptedQuotesCount > 0 ? myAcceptedQuotesValue / myAcceptedQuotesCount : 0;

    const result = {
      myProspectsCount,
      myOpportunitiesCount,
      myWonOpportunitiesCount, // ✅ NOUVEAU: Opportunités gagnées
      myQuotesCount,
      myAcceptedQuotesCount, // ✅ NOUVEAU: Cotations acceptées
      myActiveOpportunitiesValue,
      myAcceptedQuotesValue,
      myConversionRate,
      myActivitiesThisWeek,
      myQuotesThisMonth,
      myTotalMargin,
      avgQuoteValue,
      customerSatisfaction: 75, // TODO: Calculer selon les feedbacks clients
      monthlyGoalProgress: 60, // TODO: Calculer selon objectifs définis
      teamPerformance: 70, // TODO: Calculer la moyenne de l'équipe
      growth: 0 // Sera calculé dans la performance mensuelle
    };

    console.log('📊 [getCommercialStats] Result:', result);

    return result;
  }

  /**
   * Obtenir la performance mensuelle du commercial
   */
  async getCommercialPerformance(userId: number, filters?: DashboardFilters): Promise<any> {
    const endDate = filters?.endDate || new Date();
    const startDate = filters?.startDate || new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1);

    // Performance mensuelle
    const monthlyQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .select('EXTRACT(MONTH FROM opp.createdAt)', 'month')
      .addSelect('EXTRACT(YEAR FROM opp.createdAt)', 'year')
      .addSelect('COUNT(*)', 'opportunities')
      .addSelect('COUNT(CASE WHEN opp.stage = :won THEN 1 END)', 'wonDeals')
      .addSelect('COALESCE(SUM(opp.value), 0)', 'totalValue')
      .addSelect('COALESCE(SUM(CASE WHEN opp.stage = :won THEN opp.value ELSE 0 END), 0)', 'wonValue')
      .where('opp.assignedToId = :userId', { userId })
      .andWhere('opp.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .setParameter('won', OpportunityStage.CLOSED_WON)
      .groupBy('EXTRACT(YEAR FROM opp.createdAt), EXTRACT(MONTH FROM opp.createdAt)')
      .orderBy('year, month');

    const monthlyData = await monthlyQuery.getRawMany();

    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    const monthly = monthlyData.map(item => ({
      month: monthNames[parseInt(item.month) - 1],
      year: parseInt(item.year),
      opportunities: parseInt(item.opportunities),
      wonDeals: parseInt(item.wonDeals),
      totalValue: parseFloat(item.totalValue || 0),
      wonValue: parseFloat(item.wonValue || 0),
      totalMargin: parseFloat(item.wonValue || 0) * 0.15, // Estimation 15% de marge
      quotes: 0, // TODO: Ajouter les cotations
      acceptedQuotes: 0 // TODO: Ajouter les cotations acceptées
    }));

    // Calculer la croissance
    const currentMonth = monthly[monthly.length - 1];
    const previousMonth = monthly[monthly.length - 2];
    const growth = previousMonth && previousMonth.wonValue > 0
      ? ((currentMonth.wonValue - previousMonth.wonValue) / previousMonth.wonValue) * 100
      : 0;

    // Répartition par type de transport (pour ce commercial)
    const transportQuery = this.opportunityRepository
      .createQueryBuilder('opp')
      .select('opp.transportType', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(CASE WHEN opp.stage = :won THEN opp.value ELSE 0 END), 0)', 'value')
      .where('opp.assignedToId = :userId', { userId })
      .andWhere('opp.transportType IS NOT NULL')
      .setParameter('won', OpportunityStage.CLOSED_WON);

    if (filters?.startDate && filters?.endDate) {
      transportQuery.andWhere('opp.createdAt BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }

    const transportStats = await transportQuery.groupBy('opp.transportType').getRawMany();

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
   * Obtenir les statistiques Import/Export basées sur les cotations
   */
  async getImportExportStats(filters?: DashboardFilters): Promise<any> {
    console.log('📊 [getImportExportStats] Récupération des statistiques Import/Export');
    console.log('📊 [getImportExportStats] Filtres reçus:', filters);
    
    // Compter d'abord toutes les cotations NON ARCHIVÉES pour debug
    // ✅ CORRECTION: Exclure les archivées (isArchived = true)
    const totalQuotes = await this.quoteRepository
      .createQueryBuilder('quote')
      .where('quote.deletedAt IS NULL')
      .andWhere('(quote.isArchived = :isArchived OR quote.isArchived IS NULL)', { isArchived: false })
      .getCount();
    console.log('📊 [getImportExportStats] Total cotations NON ARCHIVÉES:', totalQuotes);
    
    // Construire la requête de base - utiliser le nom SQL de la colonne: import_export
    // ✅ CORRECTION: Exclure les archivées (isArchived = true)
    let query = this.quoteRepository
      .createQueryBuilder('quote')
      .select('quote.import_export', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(quote.total), 0)', 'totalValue')
      .addSelect('COALESCE(SUM(quote.total_margin), 0)', 'totalMargin')
      .where('quote.deletedAt IS NULL')
      .andWhere('(quote.isArchived = :isArchived OR quote.isArchived IS NULL)', { isArchived: false })
      .andWhere('quote.import_export IS NOT NULL')
      .andWhere("quote.import_export != ''");
    
    // Appliquer les filtres de date si fournis
    if (filters?.startDate && filters?.endDate) {
      query = query.andWhere('quote.createdAt BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }
    
    // Grouper par type Import/Export
    const stats = await query.groupBy('quote.import_export').getRawMany();
    
    console.log('✅ [getImportExportStats] Stats brutes:', stats);
    console.log('✅ [getImportExportStats] Nombre de lignes:', stats.length);
    
    // Si aucune donnée, retourner des valeurs par défaut
    if (!stats || stats.length === 0) {
      console.warn('⚠️ [getImportExportStats] Aucune cotation avec import_export trouvée');
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
    
    console.log('📊 [getImportExportStats] Total Value:', totalValue);
    console.log('📊 [getImportExportStats] Total Count:', totalCount);
    
    // Normaliser les types (Import/Imp -> Import, Export/Exp -> Export)
    const formattedStats = stats.map(item => {
      let normalizedType = item.type || 'Non défini';
      
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
    
    console.log('✅ [getImportExportStats] Stats formatées:', formattedStats);
    
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
