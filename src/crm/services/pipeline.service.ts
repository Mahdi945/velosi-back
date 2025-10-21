import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity } from '../../entities/crm/opportunity.entity';
import { Lead, LeadStatus } from '../../entities/crm/lead.entity';
import { Personnel } from '../../entities/personnel.entity';
import { Client } from '../../entities/client.entity';

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
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  /**
   * Récupérer les données du pipeline Kanban
   */
  async getKanbanData(filters: PipelineFilters = {}): Promise<KanbanData> {
    console.log('📊 PipelineService.getKanbanData - Filters:', filters);

    try {
      // 1. Définir les étapes du pipeline avec couleurs et probabilités
      const stages = this.getDefaultStages();
      
      // 2. Récupérer toutes les opportunités avec leurs relations
      let query = this.opportunityRepository
        .createQueryBuilder('opportunity')
        .leftJoinAndSelect('opportunity.assignedTo', 'assignedTo')
        .leftJoinAndSelect('opportunity.lead', 'lead')
        .leftJoinAndSelect('opportunity.client', 'client');

      // 3. Appliquer les filtres
      if (filters.search) {
        query = query.andWhere(
          '(opportunity.title ILIKE :search OR opportunity.description ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      if (filters.assignedToId) {
        query = query.andWhere('opportunity.assignedToId = :assignedToId', {
          assignedToId: filters.assignedToId
        });
      }

      if (filters.priority) {
        query = query.andWhere('opportunity.priority = :priority', {
          priority: filters.priority
        });
      }

      if (filters.minValue) {
        query = query.andWhere('opportunity.value >= :minValue', {
          minValue: filters.minValue
        });
      }

      if (filters.maxValue) {
        query = query.andWhere('opportunity.value <= :maxValue', {
          maxValue: filters.maxValue
        });
      }

      if (filters.dateFrom) {
        query = query.andWhere('opportunity.expectedCloseDate >= :dateFrom', {
          dateFrom: filters.dateFrom
        });
      }

      if (filters.dateTo) {
        query = query.andWhere('opportunity.expectedCloseDate <= :dateTo', {
          dateTo: filters.dateTo
        });
      }

      // 4. Ordonner par date de création
      query = query.orderBy('opportunity.createdAt', 'DESC');

      const opportunities = await query.getMany();

      console.log(`📈 Trouvé ${opportunities.length} opportunités`);

      // 5. Charger les leads/prospects pour la colonne "prospecting"
      // 🎯 Afficher TOUS les prospects SAUF converted, lost et client
      let leads: Lead[] = [];
      let leadQueryBuilder = this.leadRepository
        .createQueryBuilder('lead')
        .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
        .where('lead.status != :convertedStatus', { convertedStatus: LeadStatus.CONVERTED })
        .andWhere('lead.status != :lostStatus', { lostStatus: LeadStatus.LOST })
        .andWhere('lead.status != :clientStatus', { clientStatus: LeadStatus.CLIENT });

      // Appliquer les mêmes filtres aux prospects
      if (filters.search) {
        leadQueryBuilder = leadQueryBuilder.andWhere(
          '(lead.company ILIKE :search OR lead.fullName ILIKE :search OR lead.email ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      if (filters.assignedToId) {
        leadQueryBuilder = leadQueryBuilder.andWhere('lead.assignedToId = :assignedToId', {
          assignedToId: filters.assignedToId
        });
      }

      if (filters.priority) {
        leadQueryBuilder = leadQueryBuilder.andWhere('lead.priority = :priority', {
          priority: filters.priority
        });
      }

      leads = await leadQueryBuilder.orderBy('lead.createdAt', 'DESC').getMany();
      
      console.log(`📋 Trouvé ${leads.length} prospects (leads) actifs pour la colonne prospecting`);

      // 6. Grouper les opportunités par étape et ajouter les prospects
      const stagesWithOpportunities: KanbanStage[] = stages.map(stage => {
        let stageOpportunities = opportunities
          .filter(opp => opp.stage === stage.stageEnum)
          .map(opp => this.transformToKanbanOpportunity(opp));

        // 🎯 NOUVEAU: Ajouter les prospects (leads) à la colonne "prospecting"
        if (stage.stageEnum === 'prospecting') {
          const leadOpportunities = leads.map(lead => this.transformLeadToKanbanOpportunity(lead));
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
   */
  async moveOpportunity(opportunityId: number, toStage: string): Promise<KanbanOpportunity> {
    console.log(`🔄 Déplacement opportunité ${opportunityId} vers ${toStage}`);

    try {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: opportunityId },
        relations: ['assignedTo', 'lead', 'client']
      });

      if (!opportunity) {
        throw new NotFoundException(`Opportunité avec l'ID ${opportunityId} non trouvée`);
      }

      const fromStage = opportunity.stage;
      
      // Mettre à jour l'étape
      opportunity.stage = toStage as any;
      opportunity.updatedAt = new Date();

      const savedOpportunity = await this.opportunityRepository.save(opportunity);
      
      console.log(`✅ Opportunité déplacée de ${fromStage} vers ${toStage}`);

      return this.transformToKanbanOpportunity(savedOpportunity);

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
   */
  async getPipelineStats(filters: PipelineFilters = {}) {
    console.log('📊 Calcul des statistiques du pipeline');

    try {
      const kanbanData = await this.getKanbanData(filters);
      
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
  private transformToKanbanOpportunity(opportunity: Opportunity): KanbanOpportunity {
    const daysInStage = this.calculateDaysInStage(opportunity.updatedAt);
    
    return {
      id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description || null,
      value: Number(opportunity.value || 0),
      probability: opportunity.probability || 0,
      expectedCloseDate: opportunity.expectedCloseDate,
      assignedTo: opportunity.assignedTo?.id || 0,
      assignedToName: opportunity.assignedTo 
        ? `${opportunity.assignedTo.prenom} ${opportunity.assignedTo.nom}`.trim()
        : 'Non assigné',
      client: opportunity.client?.nom || null,
      priority: opportunity.priority || 'medium',
      stage: opportunity.stage,
      daysInStage,
      tags: opportunity.tags || [],
      leadId: opportunity.lead?.id || null,
      leadName: opportunity.lead?.fullName || null,
      email: opportunity.lead?.email || null,
      phone: opportunity.lead?.phone || null,
      // Ajouter l'objet lead complet pour accès aux détails de l'entreprise
      lead: opportunity.lead ? {
        id: opportunity.lead.id,
        company: opportunity.lead.company,
        fullName: opportunity.lead.fullName,
        email: opportunity.lead.email,
        phone: opportunity.lead.phone,
        position: opportunity.lead.position,
        website: opportunity.lead.website,
        industry: opportunity.lead.industry,
        employeeCount: opportunity.lead.employeeCount
      } : null,
      transportType: opportunity.transportType || null,
      traffic: opportunity.traffic || null,
      serviceFrequency: opportunity.serviceFrequency || null,
      originAddress: opportunity.originAddress || null,
      destinationAddress: opportunity.destinationAddress || null,
      specialRequirements: opportunity.specialRequirements || null,
      competitors: opportunity.competitors || null,
      source: opportunity.source || null,
      wonDescription: opportunity.wonDescription || null,
      lostReason: opportunity.lostReason || null,
      createdAt: opportunity.createdAt,
      updatedAt: opportunity.updatedAt
    };
  }

  /**
   * 🆕 Transformer un Lead (prospect) en KanbanOpportunity pour l'affichage dans le pipeline
   */
  private transformLeadToKanbanOpportunity(lead: Lead): KanbanOpportunity {
    const daysInStage = this.calculateDaysInStage(lead.updatedAt || lead.createdAt);
    
    return {
      id: lead.id,
      title: `${lead.company} - ${lead.fullName}`, // Titre combiné entreprise + nom
      description: lead.notes || null,
      value: Number(lead.estimatedValue || 0),
      probability: 10, // Probabilité par défaut pour les prospects
      expectedCloseDate: lead.nextFollowupDate || null,
      assignedTo: lead.assignedTo?.id || 0,
      assignedToName: lead.assignedTo 
        ? `${lead.assignedTo.prenom} ${lead.assignedTo.nom}`.trim()
        : 'Non assigné',
      client: null, // Les prospects ne sont pas encore des clients
      priority: lead.priority || 'medium',
      stage: 'prospecting', // Toujours prospecting pour les leads
      daysInStage,
      tags: lead.tags ? lead.tags : [],
      leadId: lead.id,
      leadName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      // Objet lead complet
      lead: {
        id: lead.id,
        company: lead.company,
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        position: lead.position,
        website: lead.website,
        industry: lead.industry,
        employeeCount: lead.employeeCount
      },
      transportType: lead.transportNeeds?.[0] || null, // Premier besoin de transport
      traffic: lead.traffic || null,
      serviceFrequency: null,
      originAddress: null,
      destinationAddress: null,
      specialRequirements: null,
      competitors: null,
      source: lead.source || null,
      wonDescription: null,
      lostReason: null,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt || lead.createdAt
    };
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
  async updateOpportunity(id: number, updateData: Partial<Opportunity>): Promise<Opportunity> {
    const opportunity = await this.opportunityRepository.findOne({ where: { id } });
    
    if (!opportunity) {
      throw new NotFoundException(`Opportunité avec l'ID ${id} non trouvée`);
    }

    // Mettre à jour les champs fournis
    Object.assign(opportunity, updateData);
    
    // Sauvegarder les modifications
    return await this.opportunityRepository.save(opportunity);
  }

  /**
   * Supprimer une opportunité
   */
  async deleteOpportunity(id: number): Promise<void> {
    const opportunity = await this.opportunityRepository.findOne({ where: { id } });
    
    if (!opportunity) {
      throw new NotFoundException(`Opportunité avec l'ID ${id} non trouvée`);
    }

    await this.opportunityRepository.remove(opportunity);
  }

  /**
   * Marquer une opportunité comme gagnée
   */
  async markAsWon(id: number, comment?: string): Promise<Opportunity> {
    const opportunity = await this.opportunityRepository.findOne({ where: { id } });
    
    if (!opportunity) {
      throw new NotFoundException(`Opportunité avec l'ID ${id} non trouvée`);
    }

    opportunity.stage = 'closed_won' as any;
    opportunity.actualCloseDate = new Date();
    
    if (comment) {
      // Utiliser specialRequirements pour stocker le commentaire de victoire
      opportunity.specialRequirements = comment;
    }

    return await this.opportunityRepository.save(opportunity);
  }

  /**
   * Marquer une opportunité comme perdue
   */
  async markAsLost(id: number, reason?: string): Promise<Opportunity> {
    const opportunity = await this.opportunityRepository.findOne({ where: { id } });
    
    if (!opportunity) {
      throw new NotFoundException(`Opportunité avec l'ID ${id} non trouvée`);
    }

    opportunity.stage = 'closed_lost' as any;
    opportunity.actualCloseDate = new Date();
    
    if (reason) {
      opportunity.lostReason = reason;
    }

    return await this.opportunityRepository.save(opportunity);
  }

  /**
   * R�cup�rer tous les prospects (leads)
   */
  async getAllLeads(): Promise<Lead[]> {
    return await this.leadRepository.find({
      order: {
        createdAt: 'DESC'
      },
      relations: ['assignedTo']
    });
  }

  /**
   * R�cup�rer toutes les opportunit�s
   */
  async getAllOpportunities(): Promise<Opportunity[]> {
    return await this.opportunityRepository.find({
      order: {
        createdAt: 'DESC'
      },
      relations: ['lead', 'assignedTo']
    });
  }
}
