import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Opportunity, OpportunityStage } from '../../entities/crm/opportunity.entity';
import { Lead, LeadStatus } from '../../entities/crm/lead.entity';
import { Personnel } from '../../entities/personnel.entity';
import { Client } from '../../entities/client.entity';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  OpportunityQueryDto,
  ConvertLeadToOpportunityDto,
} from '../../dto/crm/opportunity.dto';

@Injectable()
export class OpportunityService {
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
   * Créer une nouvelle opportunité
   */
  async create(createOpportunityDto: CreateOpportunityDto, userId: number): Promise<Opportunity> {
    console.log('📝 Service create - Données:', createOpportunityDto);

    // Vérifier que le commercial assigné existe
    if (createOpportunityDto.assignedToId) {
      const personnel = await this.personnelRepository.findOne({
        where: { id: createOpportunityDto.assignedToId },
      });
      if (!personnel) {
        throw new NotFoundException('Personnel assigné introuvable');
      }
    }

    // Vérifier si lead_id existe
    if (createOpportunityDto.leadId) {
      const lead = await this.leadRepository.findOne({
        where: { id: createOpportunityDto.leadId },
      });
      if (!lead) {
        throw new NotFoundException('Prospect source introuvable');
      }
    }

    // Vérifier si client_id existe
    if (createOpportunityDto.clientId) {
      const client = await this.clientRepository.findOne({
        where: { id: createOpportunityDto.clientId },
      });
      if (!client) {
        throw new NotFoundException('Client introuvable');
      }
    }

    const opportunity = this.opportunityRepository.create({
      ...createOpportunityDto,
      createdById: userId,
      updatedById: userId,
    });

    const savedOpportunity = await this.opportunityRepository.save(opportunity);
    console.log('💾 Opportunité créée:', savedOpportunity.id);

    return this.findOne(savedOpportunity.id);
  }

  /**
   * Obtenir toutes les opportunités avec filtres et pagination
   */
  async findAll(query: OpportunityQueryDto): Promise<{ data: Opportunity[]; total: number; totalPages: number }> {
    console.log('🔍 Service findAll - Query:', query);

    const queryBuilder = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.assignedTo', 'assignedTo')
      .leftJoinAndSelect('opportunity.lead', 'lead')
      .leftJoinAndSelect('opportunity.client', 'client')
      .leftJoinAndSelect('client.contacts', 'contacts')
      .leftJoinAndSelect('opportunity.createdBy', 'createdBy');

    // Appliquer les filtres
    this.applyFilters(queryBuilder, query);

    // Pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 25, 100);
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    // Tri
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(`opportunity.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    const [opportunities, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    console.log('✅ Service findAll - Résultats:', opportunities.length, 'total:', total);

    return {
      data: opportunities,
      total,
      totalPages,
    };
  }

  /**
   * Obtenir une opportunité par ID
   */
  async findOne(id: number): Promise<Opportunity> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'lead', 'client', 'client.contacts', 'createdBy', 'updatedBy'],
    });

    if (!opportunity) {
      throw new NotFoundException(`Opportunité avec l'ID ${id} introuvable`);
    }

    return opportunity;
  }

  /**
   * Mettre à jour une opportunité
   */
  async update(id: number, updateOpportunityDto: UpdateOpportunityDto, userId: number): Promise<Opportunity> {
    console.log('🔍 Service update - ID:', id, 'userId:', userId);
    console.log('📝 Service update - Données:', updateOpportunityDto);
    console.log('🎯 [OPPORTUNITY SERVICE UPDATE] AssignedToId reçu:', updateOpportunityDto.assignedToId, 'type:', typeof updateOpportunityDto.assignedToId);

    const opportunity = await this.findOne(id);
    console.log('✅ Opportunité trouvée:', opportunity.id);

    // Vérifier si le commercial assigné existe
    if (updateOpportunityDto.assignedToId) {
      console.log('🔍 [OPPORTUNITY SERVICE UPDATE] Vérification du personnel ID:', updateOpportunityDto.assignedToId);
      const personnel = await this.personnelRepository.findOne({
        where: { id: updateOpportunityDto.assignedToId },
      });
      if (!personnel) {
        console.error('❌ [OPPORTUNITY SERVICE UPDATE] Personnel introuvable pour ID:', updateOpportunityDto.assignedToId);
        throw new NotFoundException('Personnel assigné introuvable');
      }
      console.log('✅ [OPPORTUNITY SERVICE UPDATE] Personnel trouvé:', { id: personnel.id, nom: personnel.nom, prenom: personnel.prenom });
    }

    // Gestion des changements de stage
    if (updateOpportunityDto.stage) {
      if (updateOpportunityDto.stage === OpportunityStage.CLOSED_WON && !opportunity.actualCloseDate) {
        opportunity.actualCloseDate = new Date();
      }
      if (updateOpportunityDto.stage === OpportunityStage.CLOSED_LOST && !opportunity.actualCloseDate) {
        opportunity.actualCloseDate = new Date();
      }
    }

    const updatedData = {
      ...updateOpportunityDto,
      updatedById: userId,
    };

    console.log('🔄 Données à appliquer:', updatedData);
    console.log('🔍 [OPPORTUNITY SERVICE UPDATE] AssignedToId AVANT mise à jour:', opportunity.assignedToId);
    console.log('🔍 [OPPORTUNITY SERVICE UPDATE] AssignedToId dans updatedData:', updatedData.assignedToId);

    // Forcer la mise à jour avec une requête UPDATE directe comme pour les prospects
    console.log('🔧 [OPPORTUNITY SERVICE UPDATE] Forcer la mise à jour avec requête directe...');
    
    // Préparer les données de mise à jour en ne incluant que les champs qui existent dans l'entité
    const updateFields: any = {};
    if (updatedData.title !== undefined) updateFields.title = updatedData.title;
    if (updatedData.description !== undefined) updateFields.description = updatedData.description;
    if (updatedData.value !== undefined) updateFields.value = updatedData.value;
    if (updatedData.probability !== undefined) updateFields.probability = updatedData.probability;
    if (updatedData.stage !== undefined) updateFields.stage = updatedData.stage;
    if (updatedData.expectedCloseDate !== undefined) updateFields.expectedCloseDate = updatedData.expectedCloseDate;
    if (updatedData.assignedToId !== undefined) updateFields.assignedToId = updatedData.assignedToId; // IMPORTANT
    if (updatedData.source !== undefined) updateFields.source = updatedData.source;
    if (updatedData.priority !== undefined) updateFields.priority = updatedData.priority;
    if (updatedData.tags !== undefined) updateFields.tags = updatedData.tags;
    if (updatedData.originAddress !== undefined) updateFields.originAddress = updatedData.originAddress;
    if (updatedData.destinationAddress !== undefined) updateFields.destinationAddress = updatedData.destinationAddress;
    if (updatedData.transportType !== undefined) updateFields.transportType = updatedData.transportType;
    if (updatedData.serviceFrequency !== undefined) updateFields.serviceFrequency = updatedData.serviceFrequency;
    if (updatedData.vehicleTypes !== undefined) updateFields.vehicleTypes = updatedData.vehicleTypes;
    if (updatedData.specialRequirements !== undefined) updateFields.specialRequirements = updatedData.specialRequirements;
    if (updatedData.competitors !== undefined) updateFields.competitors = updatedData.competitors;
    if (updatedData.lostReason !== undefined) updateFields.lostReason = updatedData.lostReason;
    if (updatedData.lostToCompetitor !== undefined) updateFields.lostToCompetitor = updatedData.lostToCompetitor;
    if (updatedData.updatedById !== undefined) updateFields.updatedById = updatedData.updatedById;
    
    const updateResult = await this.opportunityRepository.update(
      { id: opportunity.id },
      updateFields
    );

    console.log('✅ [OPPORTUNITY SERVICE UPDATE] Résultat de la requête UPDATE:', updateResult);

    // Récupérer l'entité mise à jour avec les relations
    const savedOpportunity = await this.opportunityRepository.findOne({ 
      where: { id: opportunity.id },
      relations: ['assignedTo', 'createdBy', 'updatedBy', 'lead', 'client']
    });

    console.log('💾 Opportunité sauvegardée:', savedOpportunity?.id);
    console.log('🔍 [OPPORTUNITY SERVICE UPDATE] AssignedToId final:', savedOpportunity?.assignedToId);

    return savedOpportunity || opportunity;
  }

  /**
   * Supprimer une opportunité
   */
  async remove(id: number): Promise<void> {
    const opportunity = await this.findOne(id);
    await this.opportunityRepository.remove(opportunity);
    console.log('🗑️ Opportunité supprimée:', id);
  }

  /**
   * Convertir un prospect en opportunité
   */
  async convertFromLead(leadId: number, convertDto: ConvertLeadToOpportunityDto, userId: number): Promise<Opportunity> {
    console.log('🔄 Conversion prospect vers opportunité - Lead ID:', leadId);
    console.log('📝 Données de conversion:', convertDto);

    const lead = await this.leadRepository.findOne({
      where: { id: leadId },
      relations: ['assignedTo'],
    });

    if (!lead) {
      throw new NotFoundException('Prospect introuvable');
    }

    if (lead.status === LeadStatus.CONVERTED) {
      throw new BadRequestException('Ce prospect a déjà été converti');
    }

    // Créer l'opportunité
    const opportunityData: CreateOpportunityDto = {
      title: convertDto.opportunityTitle,
      description: convertDto.opportunityDescription,
      leadId: leadId,
      value: convertDto.opportunityValue || 0,
      probability: convertDto.probability || 25,
      stage: OpportunityStage.QUALIFICATION,
      expectedCloseDate: convertDto.expectedCloseDate,
      originAddress: convertDto.originAddress,
      destinationAddress: convertDto.destinationAddress,
      transportType: convertDto.transportType,
      serviceFrequency: convertDto.serviceFrequency,
      vehicleTypes: convertDto.vehicleTypes || [],
      specialRequirements: convertDto.specialRequirements,
      assignedToId: lead.assignedToId || null, // Utiliser seulement le commercial assigné au prospect, sinon null
      source: 'lead_conversion',
      priority: convertDto.priority || lead.priority,
      tags: lead.tags || [],
    };

    console.log('📋 Assignation lors de la conversion:', {
      prospectAssignedTo: lead.assignedToId,
      opportunityWillBeAssignedTo: opportunityData.assignedToId
    });

    const opportunity = await this.create(opportunityData, userId);

    // Mettre à jour le statut du lead
    lead.status = LeadStatus.CONVERTED;
    lead.convertedDate = new Date();
    lead.updatedById = userId;
    await this.leadRepository.save(lead);

    console.log('✅ Conversion réussie - Opportunité créée:', opportunity.id);
    return opportunity;
  }

  /**
   * Obtenir les statistiques des opportunités
   */
  async getStats(userId?: number): Promise<any> {
    const queryBuilder = this.opportunityRepository.createQueryBuilder('opportunity');

    // Filtrer par commercial si spécifié
    if (userId) {
      queryBuilder.where('opportunity.assignedToId = :userId', { userId });
    }

    const [
      total,
      prospecting,
      qualification,
      proposal,
      negotiation,
      closedWon,
      closedLost,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('opportunity.stage = :stage', { stage: OpportunityStage.PROSPECTING }).getCount(),
      queryBuilder.clone().andWhere('opportunity.stage = :stage', { stage: OpportunityStage.QUALIFICATION }).getCount(),
      queryBuilder.clone().andWhere('opportunity.stage = :stage', { stage: OpportunityStage.PROPOSAL }).getCount(),
      queryBuilder.clone().andWhere('opportunity.stage = :stage', { stage: OpportunityStage.NEGOTIATION }).getCount(),
      queryBuilder.clone().andWhere('opportunity.stage = :stage', { stage: OpportunityStage.CLOSED_WON }).getCount(),
      queryBuilder.clone().andWhere('opportunity.stage = :stage', { stage: OpportunityStage.CLOSED_LOST }).getCount(),
    ]);

    // Valeur totale du pipeline
    const pipelineValue = await queryBuilder
      .select('SUM(opportunity.value)', 'total')
      .andWhere('opportunity.stage NOT IN (:...closedStages)', {
        closedStages: [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST],
      })
      .getRawOne();

    // Valeur fermée gagnée
    const wonValue = await queryBuilder
      .clone()
      .select('SUM(opportunity.value)', 'total')
      .andWhere('opportunity.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
      .getRawOne();

    return {
      total,
      byStage: {
        prospecting,
        qualification,
        proposal,
        negotiation,
        closedWon,
        closedLost,
      },
      values: {
        pipeline: parseFloat(pipelineValue?.total) || 0,
        won: parseFloat(wonValue?.total) || 0,
      },
      conversionRate: total > 0 ? Math.round((closedWon / total) * 100) : 0,
    };
  }

  /**
   * Appliquer les filtres à la requête
   */
  private applyFilters(queryBuilder: SelectQueryBuilder<Opportunity>, query: OpportunityQueryDto): void {
    if (query.search) {
      queryBuilder.andWhere(
        '(opportunity.title ILIKE :search OR opportunity.description ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    if (query.stage) {
      queryBuilder.andWhere('opportunity.stage = :stage', { stage: query.stage });
    }

    if (query.priority) {
      queryBuilder.andWhere('opportunity.priority = :priority', { priority: query.priority });
    }

    if (query.assignedToId) {
      queryBuilder.andWhere('opportunity.assignedToId = :assignedToId', { assignedToId: query.assignedToId });
    }

    if (query.source) {
      queryBuilder.andWhere('opportunity.source = :source', { source: query.source });
    }

    if (query.transportType) {
      queryBuilder.andWhere('opportunity.transportType = :transportType', { transportType: query.transportType });
    }

    if (query.minValue) {
      queryBuilder.andWhere('opportunity.value >= :minValue', { minValue: query.minValue });
    }

    if (query.maxValue) {
      queryBuilder.andWhere('opportunity.value <= :maxValue', { maxValue: query.maxValue });
    }

    if (query.expectedCloseDateFrom) {
      queryBuilder.andWhere('opportunity.expectedCloseDate >= :from', { from: query.expectedCloseDateFrom });
    }

    if (query.expectedCloseDateTo) {
      queryBuilder.andWhere('opportunity.expectedCloseDate <= :to', { to: query.expectedCloseDateTo });
    }
  }
}