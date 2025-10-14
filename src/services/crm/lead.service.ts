import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Lead, LeadStatus } from '../../entities/crm/lead.entity';
import { CreateLeadDto, UpdateLeadDto, LeadQueryDto, ConvertLeadDto } from '../../dto/crm/lead.dto';
import { Personnel } from '../../entities/personnel.entity';
import { OpportunityService } from './opportunity.service';
import { CreateOpportunityDto } from '../../dto/crm/opportunity.dto';
import { OpportunityStage } from '../../entities/crm/opportunity.entity';

@Injectable()
export class LeadService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @Inject(forwardRef(() => OpportunityService))
    private opportunityService: OpportunityService,
  ) {}

  /**
   * Créer un nouveau prospect
   */
  async create(createLeadDto: CreateLeadDto, userId: number): Promise<Lead> {
    // Vérifier si un lead avec cet email existe déjà
    const existingLead = await this.leadRepository.findOne({
      where: { email: createLeadDto.email },
    });

    if (existingLead) {
      throw new ConflictException('Un prospect avec cet email existe déjà');
    }

    // Récupérer les informations de l'utilisateur qui crée le prospect
    const currentUser = await this.personnelRepository.findOne({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('Utilisateur créateur introuvable');
    }

    // Déterminer l'assigné
    let assignedToId = createLeadDto.assignedToId;

    // Si c'est un commercial qui crée le prospect et qu'aucun assigné n'est spécifié,
    // l'assigner automatiquement à lui-même
    if (currentUser.role === 'commercial' && !assignedToId) {
      assignedToId = userId;
    }

    // Vérifier si l'assigné existe (si spécifié)
    if (assignedToId) {
      const personnel = await this.personnelRepository.findOne({
        where: { id: assignedToId },
      });
      if (!personnel) {
        throw new NotFoundException('Personnel assigné introuvable');
      }
    }

    const lead = this.leadRepository.create({
      ...createLeadDto,
      assignedToId,
      createdById: userId,
      updatedById: userId,
    });

    return await this.leadRepository.save(lead);
  }

  /**
   * Obtenir tous les prospects avec filtres
   */
  async findAll(query: LeadQueryDto): Promise<{ leads: Lead[]; total: number; pages: number }> {
    const {
      search,
      status,
      source,
      priority,
      assignedToId,
      industry,
      isLocal,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    const queryBuilder = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .leftJoinAndSelect('lead.createdBy', 'createdBy')
      .leftJoinAndSelect('lead.updatedBy', 'updatedBy');

    // Filtres de recherche
    if (search) {
      queryBuilder.andWhere(
        '(lead.fullName ILIKE :search OR lead.email ILIKE :search OR lead.company ILIKE :search OR lead.phone ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('lead.status = :status', { status });
    }

    if (source) {
      queryBuilder.andWhere('lead.source = :source', { source });
    }

    if (priority) {
      queryBuilder.andWhere('lead.priority = :priority', { priority });
    }

    if (assignedToId) {
      queryBuilder.andWhere('lead.assignedToId = :assignedToId', { assignedToId });
    }

    if (industry) {
      queryBuilder.andWhere('lead.industry ILIKE :industry', { industry: `%${industry}%` });
    }

    if (isLocal !== undefined) {
      queryBuilder.andWhere('lead.isLocal = :isLocal', { isLocal });
    }

    // Tri
    queryBuilder.orderBy(`lead.${sortBy || 'createdAt'}`, sortOrder || 'DESC');

    // Pagination
    const total = await queryBuilder.getCount();
    const leads = await queryBuilder
      .skip(((page || 1) - 1) * (limit || 25))
      .take(limit || 25)
      .getMany();

    console.log(`Service findAll: ${leads.length} prospects trouvés sur ${total} total`);

    return {
      leads: leads || [],
      total: total || 0,
      pages: Math.ceil((total || 0) / (limit || 25)),
    };
  }

  /**
   * Obtenir un prospect par ID
   */
  async findOne(id: number): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'createdBy', 'updatedBy'], // TODO: ajouter 'activities', 'opportunities' plus tard
    });

    if (!lead) {
      throw new NotFoundException('Prospect introuvable');
    }

    return lead;
  }

  /**
   * Mettre à jour un prospect
   */
  async update(id: number, updateLeadDto: UpdateLeadDto, userId: number): Promise<Lead> {
    console.log('🔍 Service update - ID:', id, 'userId:', userId);
    console.log('📝 Service update - Données:', updateLeadDto);
    console.log('🎯 [SERVICE UPDATE] AssignedToId reçu:', updateLeadDto.assignedToId, 'type:', typeof updateLeadDto.assignedToId);
    
    const lead = await this.findOne(id);
    console.log('✅ Lead trouvé:', lead);

    // Vérifier si l'email est déjà utilisé par un autre lead
    if (updateLeadDto.email && updateLeadDto.email !== lead.email) {
      const existingLead = await this.leadRepository.findOne({
        where: { email: updateLeadDto.email },
      });
      if (existingLead && existingLead.id !== id) {
        throw new ConflictException('Un prospect avec cet email existe déjà');
      }
    }

    // Vérifier si l'assigné existe
    if (updateLeadDto.assignedToId) {
      console.log('🔍 [SERVICE UPDATE] Vérification du personnel ID:', updateLeadDto.assignedToId);
      const personnel = await this.personnelRepository.findOne({
        where: { id: updateLeadDto.assignedToId },
      });
      if (!personnel) {
        console.error('❌ [SERVICE UPDATE] Personnel introuvable pour ID:', updateLeadDto.assignedToId);
        throw new NotFoundException('Personnel assigné introuvable');
      }
      console.log('✅ [SERVICE UPDATE] Personnel trouvé:', { id: personnel.id, nom: personnel.nom, prenom: personnel.prenom });
    }

    // Mettre à jour les dates automatiques selon le statut
    if (updateLeadDto.status) {
      if (updateLeadDto.status === LeadStatus.QUALIFIED && !lead.qualifiedDate) {
        lead.qualifiedDate = new Date();
      }
      if (updateLeadDto.status === LeadStatus.CONVERTED && !lead.convertedDate) {
        lead.convertedDate = new Date();
      }
    }

    const updatedData = {
      ...updateLeadDto,
      updatedById: userId,
      lastContactDate: new Date(),
    };
    
    console.log('🔄 Données à appliquer:', updatedData);
    console.log('🔍 [SERVICE UPDATE] AssignedToId AVANT mise à jour:', lead.assignedToId);
    console.log('🔍 [SERVICE UPDATE] AssignedToId dans updatedData:', updatedData.assignedToId);
    
    Object.assign(lead, updatedData);
    
    console.log('📋 Lead après assign:', lead);
    console.log('🔍 [SERVICE UPDATE] AssignedToId APRÈS assign:', lead.assignedToId);

    // Forcer la mise à jour avec une requête UPDATE directe
    console.log('🔧 [SERVICE UPDATE] Forcer la mise à jour avec requête directe...');
    const updateResult = await this.leadRepository.update(
      { id: lead.id },
      {
        fullName: updatedData.fullName,
        email: updatedData.email,
        phone: updatedData.phone,
        company: updatedData.company,
        position: updatedData.position,
        website: updatedData.website,
        industry: updatedData.industry,
        employeeCount: updatedData.employeeCount,
        source: updatedData.source,
        status: updatedData.status,
        priority: updatedData.priority,
        street: updatedData.street,
        city: updatedData.city,
        postalCode: updatedData.postalCode,
        country: updatedData.country,
        isLocal: updatedData.isLocal,
        assignedToId: updatedData.assignedToId, // IMPORTANT : forcer la mise à jour de assignedToId
        estimatedValue: updatedData.estimatedValue,
        tags: updatedData.tags,
        notes: updatedData.notes,
        traffic: updatedData.traffic, // AJOUT : champ traffic pour Import/Export
        updatedById: updatedData.updatedById,
        lastContactDate: updatedData.lastContactDate,
      }
    );
    
    console.log('✅ [SERVICE UPDATE] Résultat de la requête UPDATE:', updateResult);
    
    // Récupérer l'entité mise à jour
    const savedLead = await this.leadRepository.findOne({ where: { id: lead.id } });
    
    console.log('💾 Lead sauvegardé avec transaction:', savedLead);
    console.log('🔍 [SERVICE UPDATE] AssignedToId du lead sauvegardé:', savedLead.assignedToId);
    
    // Attendre un court délai pour s'assurer que les données sont persistées
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Recharger l'entité avec toutes ses relations pour avoir les données à jour
    // Utiliser cache: false pour forcer une requête fraîche
    const reloadedLead = await this.leadRepository.findOne({
      where: { id: savedLead.id },
      relations: ['assignedTo', 'createdBy', 'updatedBy'],
      cache: false
    });
    
    console.log('🔄 Lead rechargé avec relations:', {
      id: reloadedLead?.id,
      assignedToId: reloadedLead?.assignedToId,
      assignedToName: reloadedLead?.assignedTo ? `${reloadedLead.assignedTo.prenom} ${reloadedLead.assignedTo.nom}` : 'Aucun'
    });
    
    // Si le rechargement ne donne pas le bon assignedToId, utiliser le lead sauvegardé
    if (reloadedLead && reloadedLead.assignedToId !== savedLead.assignedToId) {
      console.warn('⚠️ [SERVICE UPDATE] Incohérence détectée après rechargement:');
      console.warn('   - Lead sauvegardé assignedToId:', savedLead.assignedToId);
      console.warn('   - Lead rechargé assignedToId:', reloadedLead.assignedToId);
      console.warn('   - Utilisation du lead sauvegardé pour corriger le problème');
      
      // Corriger l'assignedToId dans l'entité rechargée
      reloadedLead.assignedToId = savedLead.assignedToId;
      
      // Recharger la relation assignedTo avec le bon ID
      if (savedLead.assignedToId) {
        reloadedLead.assignedTo = await this.personnelRepository.findOne({
          where: { id: savedLead.assignedToId }
        });
      }
    }
    
    return reloadedLead || savedLead;
  }

  /**
   * Supprimer un prospect
   */
  async remove(id: number): Promise<void> {
    const lead = await this.findOne(id);

    // TODO: Vérifier si le lead a des opportunités associées quand les entités seront créées
    // if (lead.opportunities && lead.opportunities.length > 0) {
    //   throw new BadRequestException(
    //     'Impossible de supprimer un prospect ayant des opportunités associées'
    //   );
    // }

    await this.leadRepository.remove(lead);
  }

  /**
   * Convertir un prospect en opportunité
   */
  async convertToOpportunity(id: number, convertDto: ConvertLeadDto, userId: number): Promise<any> {
    const lead = await this.findOne(id);

    if (lead.status === LeadStatus.CONVERTED) {
      throw new BadRequestException('Ce prospect a déjà été converti');
    }

    try {
      // Créer l'opportunité en utilisant le service dédié
      const opportunityData: CreateOpportunityDto = {
        title: convertDto.opportunityTitle,
        description: convertDto.opportunityDescription,
        leadId: lead.id,
        value: convertDto.opportunityValue || 0,
        probability: convertDto.probability || 20,
        stage: OpportunityStage.PROSPECTING,
        expectedCloseDate: convertDto.expectedCloseDate,
        originAddress: convertDto.originAddress,
        destinationAddress: convertDto.destinationAddress,
        transportType: convertDto.transportType as any,
        traffic: convertDto.traffic,
        serviceFrequency: convertDto.serviceFrequency as any,
        specialRequirements: convertDto.specialRequirements,
        assignedToId: lead.assignedToId || userId,
        source: 'lead_conversion',
        priority: (convertDto.priority as any) || 'medium',
        tags: [],
        competitors: [],
      };

      const opportunity = await this.opportunityService.create(opportunityData, userId);

      // Mettre à jour le statut du lead
      lead.status = LeadStatus.CONVERTED;
      lead.convertedDate = new Date();
      lead.updatedById = userId;
      await this.leadRepository.save(lead);

      return {
        success: true,
        message: 'Prospect converti en opportunité avec succès',
        data: opportunity,
        lead: lead,
      };

    } catch (error) {
      console.error('Erreur lors de la conversion:', error);
      throw new BadRequestException(`Erreur lors de la conversion: ${error.message}`);
    }
  }

  /**
   * Assigner un prospect à un commercial
   */
  async assignLead(id: number, assignedToId: number, userId: number): Promise<Lead> {
    const lead = await this.findOne(id);

    const personnel = await this.personnelRepository.findOne({
      where: { id: assignedToId },
    });

    if (!personnel) {
      throw new NotFoundException('Personnel assigné introuvable');
    }

    lead.assignedToId = assignedToId;
    lead.updatedById = userId;

    return await this.leadRepository.save(lead);
  }

  /**
   * Obtenir les statistiques des prospects
   */
  async getStats(): Promise<any> {
    const totalLeads = await this.leadRepository.count();
    
    const statusStats = await this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('lead.status')
      .getRawMany();

    const sourceStats = await this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('lead.source')
      .getRawMany();

    const monthlyStats = await this.leadRepository
      .createQueryBuilder('lead')
      .select('EXTRACT(MONTH FROM lead.createdAt)', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('EXTRACT(YEAR FROM lead.createdAt) = EXTRACT(YEAR FROM CURRENT_DATE)')
      .groupBy('EXTRACT(MONTH FROM lead.createdAt)')
      .orderBy('month')
      .getRawMany();

    return {
      total: totalLeads,
      byStatus: statusStats,
      bySource: sourceStats,
      monthly: monthlyStats,
    };
  }

  /**
   * Obtenir les prospects nécessitant un suivi
   */
  async getLeadsRequiringFollowup(): Promise<Lead[]> {
    return await this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .where('lead.nextFollowupDate <= :today', { today: new Date() })
      .andWhere('lead.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [LeadStatus.CONVERTED, LeadStatus.LOST, LeadStatus.UNQUALIFIED],
      })
      .orderBy('lead.nextFollowupDate', 'ASC')
      .getMany();
  }

  /**
   * Recherche avancée de prospects
   */
  async advancedSearch(filters: any): Promise<Lead[]> {
    const queryBuilder = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo');

    if (filters.valueRange) {
      queryBuilder.andWhere(
        'lead.estimatedValue BETWEEN :minValue AND :maxValue',
        { minValue: filters.valueRange.min, maxValue: filters.valueRange.max }
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('lead.tags && :tags', { tags: filters.tags });
    }

    if (filters.transportNeeds && filters.transportNeeds.length > 0) {
      queryBuilder.andWhere('lead.transportNeeds && :needs', { needs: filters.transportNeeds });
    }

    if (filters.dateRange) {
      queryBuilder.andWhere(
        'lead.createdAt BETWEEN :startDate AND :endDate',
        { startDate: filters.dateRange.start, endDate: filters.dateRange.end }
      );
    }

    return await queryBuilder.getMany();
  }


}