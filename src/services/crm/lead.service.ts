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

    // ✅ NOUVEAU SYSTÈME - Gérer le tableau de commerciaux
    let assignedToIds = createLeadDto.assignedToIds || [];
    let assignedToId = createLeadDto.assignedToId; // Ancien système (compatibilité)

    // Si c'est un commercial qui crée le prospect et qu'aucun commercial n'est assigné
    if (currentUser.role === 'commercial' && assignedToIds.length === 0 && !assignedToId) {
      assignedToIds = [userId];
      assignedToId = userId; // Compatibilité
    }

    // Vérifier que tous les commerciaux assignés existent
    if (assignedToIds.length > 0) {
      const commerciaux = await this.personnelRepository.findBy({
        id: In(assignedToIds),
      });
      if (commerciaux.length !== assignedToIds.length) {
        throw new NotFoundException('Un ou plusieurs commerciaux assignés sont introuvables');
      }
    }

    // Si assignedToId est fourni mais pas dans assignedToIds, l'ajouter
    if (assignedToId && !assignedToIds.includes(assignedToId)) {
      const personnel = await this.personnelRepository.findOne({
        where: { id: assignedToId },
      });
      if (!personnel) {
        throw new NotFoundException('Personnel assigné introuvable');
      }
      assignedToIds.push(assignedToId);
    }

    const lead = this.leadRepository.create({
      ...createLeadDto,
      assignedToId, // Ancien système
      assignedToIds, // Nouveau système
      createdById: userId,
      updatedById: userId,
    });

    const savedLead = await this.leadRepository.save(lead);
    
    // Charger les commerciaux assignés
    return await this.loadAssignedCommercials(savedLead);
  }

  /**
   * 🔧 Méthode utilitaire pour charger les commerciaux assignés
   */
  private async loadAssignedCommercials(lead: Lead): Promise<Lead> {
    if (lead.assignedToIds && lead.assignedToIds.length > 0) {
      lead.assignedCommercials = await this.personnelRepository.findBy({
        id: In(lead.assignedToIds),
      });
    } else {
      lead.assignedCommercials = [];
    }
    return lead;
  }

  /**
   * Obtenir tous les prospects NON-ARCHIVÉS avec filtres
   * ✅ CORRECTION: Retourne uniquement les NON-archivés (sans .withDeleted())
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

    console.log('🔍 LEAD Service findAll (NON-ARCHIVÉS) - Query:', query);

    // ✅ Ne PAS utiliser .withDeleted() = retourne uniquement les NON-archivés
    const queryBuilder = this.leadRepository.createQueryBuilder('lead')
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

    console.log(`✅ LEAD Service findAll NON-ARCHIVÉS: ${leads.length} prospects trouvés sur ${total} total`);

    // ✅ Charger les commerciaux assignés pour chaque prospect
    const leadsWithCommercials = await Promise.all(
      leads.map(lead => this.loadAssignedCommercials(lead))
    );

    return {
      leads: leadsWithCommercials || [],
      total: total || 0,
      pages: Math.ceil((total || 0) / (limit || 25)),
    };
  }

  /**
   * 📋 Obtenir tous les prospects ARCHIVÉS avec filtres
   * ✅ NOUVELLE MÉTHODE: Retourne uniquement les archivés
   */
  async findAllArchived(query: LeadQueryDto): Promise<{ leads: Lead[]; total: number; pages: number }> {
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

    console.log('�️ LEAD Service findAllArchived (ARCHIVÉS) - Query:', query);

    // ✅ Utiliser .withDeleted() pour inclure les soft-deleted
    const queryBuilder = this.leadRepository.createQueryBuilder('lead')
      .withDeleted()
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .leftJoinAndSelect('lead.createdBy', 'createdBy')
      .leftJoinAndSelect('lead.updatedBy', 'updatedBy')
      .where('lead.deleted_at IS NOT NULL'); // ✅ Filtrer uniquement les archivés

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

    // Tri par date d'archivage
    queryBuilder.orderBy(`lead.${sortBy || 'deletedAt'}`, sortOrder || 'DESC');

    // Pagination
    const total = await queryBuilder.getCount();
    const leads = await queryBuilder
      .skip(((page || 1) - 1) * (limit || 25))
      .take(limit || 25)
      .getMany();

    console.log(`✅ LEAD Service findAllArchived ARCHIVÉS: ${leads.length} prospects trouvés sur ${total} total`);

    // ✅ Charger les commerciaux assignés pour chaque prospect
    const leadsWithCommercials = await Promise.all(
      leads.map(lead => this.loadAssignedCommercials(lead))
    );

    return {
      leads: leadsWithCommercials || [],
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

    // ✅ Charger les commerciaux assignés
    return await this.loadAssignedCommercials(lead);
  }

  /**
   * Mettre à jour un prospect
   */
  async update(id: number, updateLeadDto: UpdateLeadDto, userId: number): Promise<Lead> {
    console.log('🔍 Service update - ID:', id, 'userId:', userId);
    console.log('📝 Service update - Données:', updateLeadDto);
    
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

    // ✅ NOUVEAU SYSTÈME - Gérer le tableau de commerciaux
    let assignedToIds = updateLeadDto.assignedToIds || lead.assignedToIds || [];
    let assignedToId = updateLeadDto.assignedToId; // Ancien système (compatibilité)

    // Vérifier que tous les commerciaux assignés existent
    if (assignedToIds.length > 0) {
      const commerciaux = await this.personnelRepository.findBy({
        id: In(assignedToIds),
      });
      if (commerciaux.length !== assignedToIds.length) {
        throw new NotFoundException('Un ou plusieurs commerciaux assignés sont introuvables');
      }
    }

    // Si assignedToId est fourni, gérer la compatibilité
    if (assignedToId) {
      const personnel = await this.personnelRepository.findOne({
        where: { id: assignedToId },
      });
      if (!personnel) {
        throw new NotFoundException('Personnel assigné introuvable');
      }
      // Ajouter à assignedToIds si pas déjà présent
      if (!assignedToIds.includes(assignedToId)) {
        assignedToIds.push(assignedToId);
      }
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
      assignedToId, // Ancien système
      assignedToIds, // Nouveau système
      updatedById: userId,
      lastContactDate: new Date(),
    };
    
    console.log('🔄 Données à appliquer:', updatedData);
    
    Object.assign(lead, updatedData);
    
    console.log('📋 Lead après assign:', lead);

    // Sauvegarder
    const savedLead = await this.leadRepository.save(lead);
    
    console.log('� Lead sauvegardé:', savedLead);
    
    // Recharger avec les relations et commerciaux
    const reloadedLead = await this.leadRepository.findOne({
      where: { id: savedLead.id },
      relations: ['assignedTo', 'createdBy', 'updatedBy'],
      cache: false
    });
    
    return await this.loadAssignedCommercials(reloadedLead);
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
        currency: convertDto.currency, // 💱 Transmettre la devise du prospect
        probability: convertDto.probability || 20,
        stage: OpportunityStage.PROSPECTING,
        expectedCloseDate: convertDto.expectedCloseDate,
        originAddress: convertDto.originAddress,
        destinationAddress: convertDto.destinationAddress,
        transportType: convertDto.transportType as any,
        traffic: convertDto.traffic,
        serviceFrequency: convertDto.serviceFrequency as any,
        specialRequirements: convertDto.specialRequirements,
        // ✅ CORRECTION: Utiliser tous les commerciaux assignés au prospect
        assignedToIds: lead.assignedToIds && lead.assignedToIds.length > 0 
          ? lead.assignedToIds 
          : (lead.assignedToId ? [lead.assignedToId] : [userId]),
        assignedToId: lead.assignedToId || (lead.assignedToIds && lead.assignedToIds.length > 0 ? lead.assignedToIds[0] : userId),
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

  /**
   * 🗄️ Archiver un prospect
   */
  async archiveLead(id: number, reason: string, userId: number): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
    });

    if (!lead) {
      throw new NotFoundException(`Prospect #${id} introuvable`);
    }

    if (lead.isArchived) {
      throw new BadRequestException('Ce prospect est déjà archivé');
    }

    // Archiver avec soft delete
    await this.leadRepository.update(id, {
      deletedAt: new Date(),
      isArchived: true,
      archivedReason: reason,
      archivedBy: userId,
    });

    return this.findOne(id);
  }

  /**
   * ♻️ Restaurer un prospect archivé
   */
  async restoreLead(id: number): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!lead) {
      throw new NotFoundException(`Prospect #${id} introuvable`);
    }

    if (!lead.deletedAt && !lead.isArchived) {
      throw new BadRequestException('Ce prospect n\'est pas archivé');
    }

    // Restaurer
    await this.leadRepository.update(id, {
      deletedAt: null,
      isArchived: false,
      archivedReason: null,
      archivedBy: null,
    });

    return this.findOne(id);
  }

}