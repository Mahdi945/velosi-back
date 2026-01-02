import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Opportunity } from '../../entities/crm/opportunity.entity';
import { Lead, LeadStatus } from '../../entities/crm/lead.entity';
import { DatabaseConnectionService } from '../../common/database-connection.service';

export interface KanbanData {
  pipeline: {
    id: number;
    name: string;
    description: string;
    isDefault: boolean;
    isActive: boolean;
  };
  stages: KanbanStage[];
  totalValue: number;
  totalOpportunities: number;
  weightedValue: number;
}

export interface KanbanStage {
  id: number;
  name: string;
  description: string;
  color: string;
  stageOrder: number;
  probability: number;
  stageEnum: string;
  opportunities: KanbanOpportunity[];
  stageValue: number;
  stageCount: number;
  isActive: boolean;
}

export interface KanbanOpportunity {
  id: number;
  title: string;
  description?: string | null;
  value: number;
  probability: number;
  expectedCloseDate: Date | null;
  assignedTo: number;
  assignedToName: string;
  assignedToIds?: number[]; // ✅ NOUVEAU: Array de commerciaux assignés
  assignedCommercials?: Array<{id: number; prenom: string; nom: string}>; // ✅ NOUVEAU: Commerciaux assignés chargés
  client: string | null;
  priority: string;
  stage: string;
  daysInStage: number;
  tags: string[];
  leadId: number | null;
  leadName: string | null;
  email?: string | null;
  phone?: string | null;
  // Objet lead complet pour accès aux détails
  lead?: {
    id: number;
    company: string;
    fullName: string;
    email: string;
    phone?: string;
    position?: string;
    website?: string;
    industry?: string;
    employeeCount?: number;
  } | null;
  transportType: string | null;
  traffic?: string | null;
  serviceFrequency: string | null;
  originAddress?: string | null;
  destinationAddress?: string | null;
  specialRequirements?: string | null;
  competitors?: string[] | null;
  source?: string | null;
  wonDescription?: string | null; // Description du succès pour les opportunités gagnées
  lostReason?: string | null; // Raison de la perte pour les opportunités perdues
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineFilters {
  search?: string;
  assignedToId?: number;
  priority?: string;
  minValue?: number;
  maxValue?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

@Injectable()
export class PipelineService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Récupérer les données du pipeline Kanban
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   * @param filters Filtres de recherche
   * @param databaseName Nom de la base de données
   */
  async getKanbanData(filters: PipelineFilters = {}, databaseName: string): Promise<KanbanData> {
    console.log('📊 PipelineService.getKanbanData - Filters:', filters);
    console.log('🏛️ Database:', databaseName);

    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      // 1. Définir les étapes du pipeline avec couleurs et probabilités
      const stages = this.getDefaultStages();
      
      // 2. Construire la requête SQL pour les opportunités avec relations
      let whereConditions = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // 3. Appliquer les filtres
      if (filters.search) {
        whereConditions.push(`(o.title ILIKE $${paramIndex} OR o.description ILIKE $${paramIndex})`);
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters.assignedToId) {
        // ✅ Filtrer sur assigned_to_ids (array) avec l'opérateur = ANY
        whereConditions.push(`$${paramIndex} = ANY(o.assigned_to_ids)`);
        queryParams.push(filters.assignedToId);
        paramIndex++;
      }

      if (filters.priority) {
        whereConditions.push(`o.priority = $${paramIndex}`);
        queryParams.push(filters.priority);
        paramIndex++;
      }

      if (filters.minValue) {
        whereConditions.push(`o.value >= $${paramIndex}`);
        queryParams.push(filters.minValue);
        paramIndex++;
      }

      if (filters.maxValue) {
        whereConditions.push(`o.value <= $${paramIndex}`);
        queryParams.push(filters.maxValue);
        paramIndex++;
      }

      if (filters.dateFrom) {
        whereConditions.push(`o.expected_close_date >= $${paramIndex}`);
        queryParams.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        whereConditions.push(`o.expected_close_date <= $${paramIndex}`);
        queryParams.push(filters.dateTo);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const opportunitiesQuery = `
        SELECT 
          o.*,
          l.id as "lead_id", l.company as "lead_company", l.full_name as "lead_fullName",
          l.email as "lead_email", l.phone as "lead_phone", l.position as "lead_position",
          l.website as "lead_website", l.industry as "lead_industry", l.employee_count as "lead_employeeCount",
          c.id as "client_id", c.nom as "client_nom"
        FROM crm_opportunities o
        LEFT JOIN crm_leads l ON o.lead_id = l.id
        LEFT JOIN client c ON o.client_id = c.id
        ${whereClause}
        ORDER BY o.created_at DESC
      `;

      const opportunities = await connection.query(opportunitiesQuery, queryParams);

      console.log(`📈 Trouvé ${opportunities.length} opportunités`);

      // 5. Charger les leads/prospects pour la colonne "prospecting"
      // 🎯 Afficher TOUS les prospects SAUF converted, lost et client
      let leadWhereConditions = [
        "l.status != 'converted'",
        "l.status != 'lost'",
        "l.status != 'client'"
      ];
      let leadQueryParams: any[] = [];
      let leadParamIndex = 1;

      // Appliquer les mêmes filtres aux prospects
      if (filters.search) {
        leadWhereConditions.push(`(l.company ILIKE $${leadParamIndex} OR l.full_name ILIKE $${leadParamIndex} OR l.email ILIKE $${leadParamIndex})`);
        leadQueryParams.push(`%${filters.search}%`);
        leadParamIndex++;
      }

      if (filters.assignedToId) {
        // ✅ Filtrer sur assigned_to_ids (array) avec l'opérateur = ANY
        leadWhereConditions.push(`$${leadParamIndex} = ANY(l.assigned_to_ids)`);
        leadQueryParams.push(filters.assignedToId);
        leadParamIndex++;
      }

      if (filters.priority) {
        leadWhereConditions.push(`l.priority = $${leadParamIndex}`);
        leadQueryParams.push(filters.priority);
        leadParamIndex++;
      }

      const leadWhereClause = `WHERE ${leadWhereConditions.join(' AND ')}`;

      const leadsQuery = `
        SELECT l.*
        FROM crm_leads l
        ${leadWhereClause}
        ORDER BY l.created_at DESC
      `;

      const leads = await connection.query(leadsQuery, leadQueryParams);
      
      console.log(`📋 Trouvé ${leads.length} prospects (leads) actifs pour la colonne prospecting`);

      // ✅ Charger les commerciaux assignés pour toutes les opportunités
      const opportunitiesWithCommercials = await Promise.all(
        opportunities.map(opp => this.loadAssignedCommercialsForOpportunity(opp, databaseName))
      );

      // ✅ Charger les commerciaux assignés pour tous les leads
      const leadsWithCommercials = await Promise.all(
        leads.map(lead => this.loadAssignedCommercialsForLead(lead, databaseName))
      );

      // 6. Grouper les opportunités par étape et ajouter les prospects
      const stagesWithOpportunities: KanbanStage[] = stages.map(stage => {
        let stageOpportunities = opportunitiesWithCommercials
          .filter(opp => opp.stage === stage.stageEnum)
          .map(opp => this.transformToKanbanOpportunity(opp));

        // 🎯 NOUVEAU: Ajouter les prospects (leads) à la colonne "prospecting"
        if (stage.stageEnum === 'prospecting') {
          const leadOpportunities = leadsWithCommercials.map(lead => this.transformLeadToKanbanOpportunity(lead));
          stageOpportunities = [...leadOpportunities, ...stageOpportunities];
          console.log(`✨ Ajout de ${leadOpportunities.length} prospects actifs à la colonne prospecting`);
        }

        const stageValue = stageOpportunities.reduce((sum, opp) => sum + opp.value, 0);
        const stageCount = stageOpportunities.length;

        return {
          ...stage,
          opportunities: stageOpportunities,
          stageValue,
          stageCount
        };
      });

      // 6. Calculer les totaux
      const totalOpportunities = opportunities.length;
      const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.value || 0), 0);
      const weightedValue = opportunities.reduce((sum, opp) => {
        return sum + (Number(opp.value || 0) * Number(opp.probability || 0) / 100);
      }, 0);

      const kanbanData: KanbanData = {
        pipeline: {
          id: 1,
          name: 'Pipeline Standard Transport',
          description: 'Pipeline par défaut pour les opportunités de transport',
          isDefault: true,
          isActive: true
        },
        stages: stagesWithOpportunities,
        totalOpportunities,
        totalValue,
        weightedValue
      };

      console.log('✅ KanbanData généré:', {
        totalOpportunities: kanbanData.totalOpportunities,
        totalValue: kanbanData.totalValue,
        weightedValue: kanbanData.weightedValue,
        stagesCount: kanbanData.stages.length
      });

      return kanbanData;

    } catch (error) {
      console.error('❌ Erreur dans getKanbanData:', error);
      throw new BadRequestException('Erreur lors de la récupération des données du pipeline');
    }
  }

  /**
   * Déplacer une opportunité vers une autre étape
   * ✅ MULTI-TENANT: Utilise SQL pur avec placeholders PostgreSQL ($1, $2...)
   */
  async moveOpportunity(opportunityId: number, toStage: string, databaseName: string): Promise<KanbanOpportunity> {
    console.log(`🔄 Déplacement opportunité ${opportunityId} vers ${toStage}`);

    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

      // Récupérer l'opportunité (sans JOIN sur personnel, on charge les commerciaux séparément)
      const opportunities = await connection.query(`
        SELECT 
          o.*,
          l.company as lead_company, l.full_name as lead_fullName,
          c.nom as client_nom
        FROM crm_opportunities o
        LEFT JOIN crm_leads l ON o.lead_id = l.id
        LEFT JOIN client c ON o.client_id = c.id
        WHERE o.id = $1
      `, [opportunityId]);

      if (!opportunities || opportunities.length === 0) {
        throw new NotFoundException(`Opportunité avec l'ID ${opportunityId} non trouvée`);
      }

      const opportunity = opportunities[0];
      const fromStage = opportunity.stage;
      
      // Mettre à jour l'étape
      await connection.query(
        'UPDATE crm_opportunities SET stage = $1, updated_at = NOW() WHERE id = $2',
        [toStage, opportunityId]
      );
      
      console.log(`✅ Opportunité déplacée de ${fromStage} vers ${toStage}`);

      // Charger les commerciaux assignés
      await this.loadAssignedCommercialsForOpportunity(opportunity, databaseName);

      // Recharger pour retourner
      opportunity.stage = toStage;
      opportunity.updated_at = new Date();
      return this.transformToKanbanOpportunity(opportunity);

    } catch (error) {
      console.error('❌ Erreur lors du déplacement:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors du déplacement de l\'opportunité');
    }
  }

  /**
   * Récupérer les statistiques du pipeline
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   * @param filters Filtres de recherche
   * @param databaseName Nom de la base de données
   */
  async getPipelineStats(filters: PipelineFilters = {}, databaseName: string) {
    console.log('📊 Calcul des statistiques du pipeline');

    try {
      const kanbanData = await this.getKanbanData(filters, databaseName);
      
      const stageStats = kanbanData.stages.map(stage => ({
        stage: stage.stageEnum,
        stageName: stage.name,
        count: stage.stageCount,
        value: stage.stageValue,
        weightedValue: stage.opportunities.reduce((sum, opp) => 
          sum + (opp.value * opp.probability / 100), 0),
        averageProbability: stage.opportunities.length > 0 
          ? stage.opportunities.reduce((sum, opp) => sum + opp.probability, 0) / stage.opportunities.length
          : 0,
        averageDaysInStage: stage.opportunities.length > 0
          ? stage.opportunities.reduce((sum, opp) => sum + opp.daysInStage, 0) / stage.opportunities.length
          : 0
      }));

      return {
        totalOpportunities: kanbanData.totalOpportunities,
        totalValue: kanbanData.totalValue,
        weightedValue: kanbanData.weightedValue,
        averageProbability: kanbanData.totalOpportunities > 0 
          ? stageStats.reduce((sum, stage) => sum + (stage.averageProbability * stage.count), 0) / kanbanData.totalOpportunities
          : 0,
        conversionRate: this.calculateConversionRate(stageStats),
        stageStats
      };

    } catch (error) {
      console.error('❌ Erreur calcul statistiques:', error);
      throw new BadRequestException('Erreur lors du calcul des statistiques');
    }
  }

  /**
   * Transformer une opportunité en KanbanOpportunity
   */
  private transformToKanbanOpportunity(opportunity: any): KanbanOpportunity {
    const daysInStage = this.calculateDaysInStage(opportunity.updated_at || opportunity.updatedAt);
    
    // ✅ Préparer les commerciaux assignés
    const assignedCommercials = opportunity.assignedCommercials || [];
    const assignedToIds = opportunity.assigned_to_ids || [];
    
    // Déterminer le commercial principal (premier de la liste ou 0)
    const primaryCommercialId = assignedToIds.length > 0 ? assignedToIds[0] : 0;
    const primaryCommercial = assignedCommercials.find(c => c.id === primaryCommercialId);
    
    return {
      id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description || null,
      value: Number(opportunity.value || 0),
      probability: opportunity.probability || 0,
      expectedCloseDate: opportunity.expected_close_date || opportunity.expectedCloseDate,
      assignedTo: primaryCommercialId,
      assignedToName: primaryCommercial
        ? `${primaryCommercial.prenom} ${primaryCommercial.nom}`.trim()
        : (assignedCommercials.length > 0 ? `${assignedCommercials[0].prenom} ${assignedCommercials[0].nom}`.trim() : 'Non assigné'),
      // ✅ NOUVEAU: Ajout des commerciaux assignés
      assignedToIds: assignedToIds,
      assignedCommercials: assignedCommercials.map(c => ({
        id: c.id,
        prenom: c.prenom,
        nom: c.nom
      })),
      client: opportunity.client_nom || null,
      priority: opportunity.priority || 'medium',
      stage: opportunity.stage,
      daysInStage,
      tags: opportunity.tags || [],
      leadId: opportunity.lead_id || null,
      leadName: opportunity.lead_fullName || null,
      email: opportunity.lead_email || null,
      phone: opportunity.lead_phone || null,
      // Ajouter l'objet lead complet pour accès aux détails de l'entreprise
      lead: opportunity.lead_id ? {
        id: opportunity.lead_id,
        company: opportunity.lead_company,
        fullName: opportunity.lead_fullName,
        email: opportunity.lead_email,
        phone: opportunity.lead_phone,
        position: opportunity.lead_position,
        website: opportunity.lead_website,
        industry: opportunity.lead_industry,
        employeeCount: opportunity.lead_employeeCount
      } : null,
      transportType: opportunity.transport_type || opportunity.transportType || null,
      traffic: opportunity.traffic || null,
      serviceFrequency: opportunity.service_frequency || opportunity.serviceFrequency || null,
      originAddress: opportunity.origin_address || opportunity.originAddress || null,
      destinationAddress: opportunity.destination_address || opportunity.destinationAddress || null,
      specialRequirements: opportunity.special_requirements || opportunity.specialRequirements || null,
      competitors: opportunity.competitors || null,
      source: opportunity.source || null,
      wonDescription: opportunity.won_description || opportunity.wonDescription || null,
      lostReason: opportunity.lost_reason || opportunity.lostReason || null,
      createdAt: opportunity.created_at || opportunity.createdAt,
      updatedAt: opportunity.updated_at || opportunity.updatedAt
    };
  }

  /**
   * 🆕 Transformer un Lead (prospect) en KanbanOpportunity pour l'affichage dans le pipeline
   */
  private transformLeadToKanbanOpportunity(lead: any): KanbanOpportunity {
    const daysInStage = this.calculateDaysInStage(lead.updated_at || lead.updatedAt || lead.created_at || lead.createdAt);
    
    // ✅ Préparer les commerciaux assignés pour les prospects
    const assignedCommercials = lead.assignedCommercials || [];
    const assignedToIds = lead.assigned_to_ids || [];
    
    // Déterminer le commercial principal (premier de la liste ou 0)
    const primaryCommercialId = assignedToIds.length > 0 ? assignedToIds[0] : 0;
    const primaryCommercial = assignedCommercials.find(c => c.id === primaryCommercialId);
    
    return {
      id: lead.id,
      title: `${lead.company} - ${lead.full_name || lead.fullName}`, // Titre combiné entreprise + nom
      description: lead.notes || null,
      value: Number(lead.estimated_value || lead.estimatedValue || 0),
      probability: 10, // Probabilité par défaut pour les prospects
      expectedCloseDate: lead.next_followup_date || lead.nextFollowupDate || null,
      assignedTo: primaryCommercialId,
      assignedToName: primaryCommercial
        ? `${primaryCommercial.prenom} ${primaryCommercial.nom}`.trim()
        : (assignedCommercials.length > 0 ? `${assignedCommercials[0].prenom} ${assignedCommercials[0].nom}`.trim() : 'Non assigné'),
      // ✅ NOUVEAU: Ajout des commerciaux assignés
      assignedToIds: assignedToIds,
      assignedCommercials: assignedCommercials.map(c => ({
        id: c.id,
        prenom: c.prenom,
        nom: c.nom
      })),
      client: null, // Les prospects ne sont pas encore des clients
      priority: lead.priority || 'medium',
      stage: 'prospecting', // Toujours prospecting pour les leads
      daysInStage,
      tags: lead.tags ? lead.tags : [],
      leadId: lead.id,
      leadName: lead.full_name || lead.fullName,
      email: lead.email,
      phone: lead.phone,
      // Objet lead complet
      lead: {
        id: lead.id,
        company: lead.company,
        fullName: lead.full_name || lead.fullName,
        email: lead.email,
        phone: lead.phone,
        position: lead.position,
        website: lead.website,
        industry: lead.industry,
        employeeCount: lead.employee_count || lead.employeeCount
      },
      transportType: (lead.transport_needs || lead.transportNeeds)?.[0] || null, // Premier besoin de transport
      traffic: lead.traffic || null,
      serviceFrequency: null,
      originAddress: null,
      destinationAddress: null,
      specialRequirements: null,
      competitors: null,
      source: lead.source || null,
      wonDescription: null,
      lostReason: null,
      createdAt: lead.created_at || lead.createdAt,
      updatedAt: lead.updated_at || lead.updatedAt || lead.created_at || lead.createdAt
    };
  }

  /**
   * ✅ Charger les commerciaux assignés pour une opportunité
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   */
  private async loadAssignedCommercialsForOpportunity(opportunity: any, databaseName: string): Promise<any> {
    if (opportunity.assigned_to_ids && opportunity.assigned_to_ids.length > 0) {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      const placeholders = opportunity.assigned_to_ids.map((_, i) => `$${i + 1}`).join(',');
      
      opportunity.assignedCommercials = await connection.query(
        `SELECT id, prenom, nom FROM personnel 
         WHERE id IN (${placeholders}) AND statut = 'actif'
         ORDER BY prenom, nom`,
        opportunity.assigned_to_ids
      );
    } else {
      opportunity.assignedCommercials = [];
    }
    return opportunity;
  }

  /**
   * ✅ Charger les commerciaux assignés pour un lead (prospect)
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   */
  private async loadAssignedCommercialsForLead(lead: any, databaseName: string): Promise<any> {
    if (lead.assigned_to_ids && lead.assigned_to_ids.length > 0) {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      const placeholders = lead.assigned_to_ids.map((_, i) => `$${i + 1}`).join(',');
      
      lead.assignedCommercials = await connection.query(
        `SELECT id, prenom, nom FROM personnel 
         WHERE id IN (${placeholders}) AND statut = 'actif'
         ORDER BY prenom, nom`,
        lead.assigned_to_ids
      );
    } else {
      lead.assignedCommercials = [];
    }
    return lead;
  }

  /**
   * Calculer le nombre de jours dans l'étape actuelle
   */
  private calculateDaysInStage(updatedAt: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculer le taux de conversion global
   */
  private calculateConversionRate(stageStats: any[]): number {
    const totalStart = stageStats.find(s => s.stage === 'prospecting')?.count || 0;
    const totalWon = stageStats.find(s => s.stage === 'closed_won')?.count || 0;
    
    return totalStart > 0 ? (totalWon / totalStart) * 100 : 0;
  }

  /**
   * Définir les étapes par défaut du pipeline
   */
  private getDefaultStages(): Omit<KanbanStage, 'opportunities' | 'stageValue' | 'stageCount'>[] {
    return [
      {
        id: 1,
        name: 'Prospection',
        description: 'Identification et premier contact',
        color: '#17a2b8',
        stageOrder: 1,
        probability: 10,
        stageEnum: 'prospecting',
        isActive: true
      },
      {
        id: 2,
        name: 'Qualification',
        description: 'Validation du besoin et du budget',
        color: '#ffc107',
        stageOrder: 2,
        probability: 25,
        stageEnum: 'qualification',
        isActive: true
      },
      {
        id: 3,
        name: 'Analyse des besoins',
        description: 'Étude détaillée des besoins transport',
        color: '#fd7e14',
        stageOrder: 3,
        probability: 50,
        stageEnum: 'needs_analysis',
        isActive: true
      },
      {
        id: 4,
        name: 'Proposition/Devis',
        description: 'Envoi de la proposition commerciale',
        color: '#6f42c1',
        stageOrder: 4,
        probability: 75,
        stageEnum: 'proposal',
        isActive: true
      },
      {
        id: 5,
        name: 'Négociation',
        description: 'Négociation des conditions',
        color: '#e83e8c',
        stageOrder: 5,
        probability: 90,
        stageEnum: 'negotiation',
        isActive: true
      },
      {
        id: 6,
        name: 'Gagné',
        description: 'Opportunité convertie en client',
        color: '#28a745',
        stageOrder: 6,
        probability: 100,
        stageEnum: 'closed_won',
        isActive: true
      },
      {
        id: 7,
        name: 'Perdu',
        description: 'Opportunité non convertie',
        color: '#dc3545',
        stageOrder: 7,
        probability: 0,
        stageEnum: 'closed_lost',
        isActive: true
      }
    ];
  }

  /**
   * Mettre à jour une opportunité
   */
  async updateOpportunity(id: number, updateData: Partial<Opportunity>, databaseName: string): Promise<Opportunity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    const opportunities = await connection.query(
      'SELECT * FROM crm_opportunities WHERE id = $1',
      [id]
    );
    
    if (!opportunities || opportunities.length === 0) {
      throw new NotFoundException(`Opportunité avec l'ID ${id} non trouvée`);
    }

    // Construire la requête UPDATE dynamiquement
    const fields: string[] = [];
    const values: any[] = [];

    Object.keys(updateData).forEach((key, index) => {
      if (updateData[key] !== undefined) {
        // Convertir camelCase en snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = $${index + 1}`);
        values.push(updateData[key]);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await connection.query(
        `UPDATE crm_opportunities SET ${fields.join(', ')} WHERE id = $${values.length}`,
        values
      );
    }
    
    // Retourner l'opportunité mise à jour
    const updated = await connection.query(
      'SELECT * FROM crm_opportunities WHERE id = $1',
      [id]
    );
    
    return updated[0];
  }

  /**
   * Supprimer une opportunité
   */
  async deleteOpportunity(id: number, databaseName: string): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    const opportunities = await connection.query(
      'SELECT id FROM crm_opportunities WHERE id = $1',
      [id]
    );
    
    if (!opportunities || opportunities.length === 0) {
      throw new NotFoundException(`Opportunité avec l'ID ${id} non trouvée`);
    }

    await connection.query('DELETE FROM crm_opportunities WHERE id = $1', [id]);
  }

  /**
   * Marquer une opportunité comme gagnée
   */
  async markAsWon(id: number, comment: string | undefined, databaseName: string): Promise<Opportunity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    const opportunities = await connection.query(
      'SELECT * FROM crm_opportunities WHERE id = $1',
      [id]
    );
    
    if (!opportunities || opportunities.length === 0) {
      throw new NotFoundException(`Opportunité avec l'ID ${id} non trouvée`);
    }

    await connection.query(`
      UPDATE crm_opportunities 
      SET stage = 'closed_won', 
          actual_close_date = NOW(),
          special_requirements = $1
      WHERE id = $2
    `, [comment || null, id]);

    const updated = await connection.query(
      'SELECT * FROM crm_opportunities WHERE id = $1',
      [id]
    );

    return updated[0];
  }

  /**
   * Marquer une opportunité comme perdue
   */
  async markAsLost(id: number, reason: string | undefined, databaseName: string): Promise<Opportunity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    const opportunities = await connection.query(
      'SELECT * FROM crm_opportunities WHERE id = $1',
      [id]
    );
    
    if (!opportunities || opportunities.length === 0) {
      throw new NotFoundException(`Opportunité avec l'ID ${id} non trouvée`);
    }

    await connection.query(`
      UPDATE crm_opportunities 
      SET stage = 'closed_lost', 
          actual_close_date = NOW(),
          lost_reason = $1
      WHERE id = $2
    `, [reason || null, id]);

    const updated = await connection.query(
      'SELECT * FROM crm_opportunities WHERE id = $1',
      [id]
    );

    return updated[0];
  }

  /**
   * R�cup�rer tous les prospects (leads)
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   */
  async getAllLeads(databaseName: string): Promise<Lead[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    return await connection.query(
      `SELECT 
        l.*,
        p.id as "assignedTo_id", p.prenom as "assignedTo_prenom", p.nom as "assignedTo_nom"
       FROM crm_leads l
       LEFT JOIN personnel p ON l.assigned_to_id = p.id
       ORDER BY l.created_at DESC`
    );
  }

  /**
   * R�cup�rer toutes les opportunit�s
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   */
  async getAllOpportunities(databaseName: string): Promise<Opportunity[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    return await connection.query(
      `SELECT 
        o.*,
        l.id as "lead_id", l.company as "lead_company", l.full_name as "lead_fullName",
        p.id as "assignedTo_id", p.prenom as "assignedTo_prenom", p.nom as "assignedTo_nom"
       FROM crm_opportunities o
       LEFT JOIN crm_leads l ON o.lead_id = l.id
       LEFT JOIN personnel p ON o.assigned_to_id = p.id
       ORDER BY o.created_at DESC`
    );
  }
}

