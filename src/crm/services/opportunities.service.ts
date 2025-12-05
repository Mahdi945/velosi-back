import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Opportunity } from '../../entities/crm/opportunity.entity';

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
  ) {}

  /**
   * 🔍 Récupérer toutes les opportunités actives (non archivées)
   */
  async findAll(): Promise<Opportunity[]> {
    return this.opportunityRepository.find({
      where: { deletedAt: IsNull(), isArchived: false },
      relations: ['lead', 'client', 'assignedTo', 'createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 🔍 Récupérer les opportunités assignées à un commercial spécifique
   * ✅ MULTI-COMMERCIAUX: Utilise assignedToIds (array) au lieu de assignedToId (single)
   */
  async findByAssignedTo(userId: number): Promise<Opportunity[]> {
    console.log('🔍 [OpportunitiesService.findByAssignedTo] Filtrage pour userId:', userId);
    
    // Utiliser createQueryBuilder pour les requêtes complexes avec tableaux PostgreSQL
    const results = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.lead', 'lead')
      .leftJoinAndSelect('opportunity.client', 'client')
      .leftJoinAndSelect('opportunity.assignedTo', 'assignedTo')
      .leftJoinAndSelect('opportunity.createdBy', 'createdBy')
      .leftJoinAndSelect('opportunity.updatedBy', 'updatedBy')
      .where('opportunity.deletedAt IS NULL')
      .andWhere('opportunity.isArchived = false')
      .andWhere(':userId = ANY(opportunity.assignedToIds)', { userId })
      .orderBy('opportunity.createdAt', 'DESC')
      .getMany();
    
    console.log('✅ [OpportunitiesService.findByAssignedTo] Résultats filtrés:', results.length);
    if (results.length > 0) {
      console.log('📋 [OpportunitiesService.findByAssignedTo] Première opportunité:', {
        id: results[0].id,
        title: results[0].title,
        assignedToIds: results[0].assignedToIds
      });
    }
    
    return results;
  }

  /**
   * 🔍 Récupérer une opportunité par ID
   */
  async findOne(id: number): Promise<Opportunity> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id, deletedAt: IsNull(), isArchived: false },
      relations: ['lead', 'client', 'assignedTo', 'createdBy', 'updatedBy'],
    });

    if (!opportunity) {
      throw new NotFoundException(`Opportunité #${id} introuvable`);
    }

    return opportunity;
  }

  /**
   * ✏️ Créer une nouvelle opportunité
   */
  async create(opportunityData: Partial<Opportunity>): Promise<Opportunity> {
    const opportunity = this.opportunityRepository.create(opportunityData);
    return this.opportunityRepository.save(opportunity);
  }

  /**
   * 🔄 Mettre à jour une opportunité
   */
  async update(id: number, opportunityData: Partial<Opportunity>): Promise<Opportunity> {
    const opportunity = await this.findOne(id);
    
    Object.assign(opportunity, opportunityData);
    return this.opportunityRepository.save(opportunity);
  }

  /**
   * 🗑️ SOFT DELETE - Archiver une opportunité
   * Ne supprime jamais physiquement - crucial pour analyse des performances commerciales
   */
  async archiveOpportunity(id: number, reason: string, userId: number): Promise<Opportunity> {
    const opportunity = await this.findOne(id);

    if (!opportunity) {
      throw new NotFoundException(`Opportunité #${id} introuvable`);
    }

    // Vérifier si déjà archivée
    if (opportunity.deletedAt || opportunity.isArchived) {
      throw new BadRequestException('Cette opportunité est déjà archivée');
    }

    // Mettre à jour avec soft delete
    await this.opportunityRepository.update(id, {
      deletedAt: new Date(),
      isArchived: true,
      archivedReason: reason,
      archivedBy: userId,
    });

    return this.opportunityRepository.findOne({
      where: { id },
      withDeleted: true,
      relations: ['lead', 'client', 'assignedTo', 'createdBy', 'updatedBy'],
    });
  }

  /**
   * ♻️ Restaurer une opportunité archivée
   */
  async restoreOpportunity(id: number): Promise<Opportunity> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id },
      withDeleted: true,
      relations: ['lead', 'client', 'assignedTo', 'createdBy', 'updatedBy'],
    });

    if (!opportunity) {
      throw new NotFoundException(`Opportunité #${id} introuvable`);
    }

    if (!opportunity.deletedAt && !opportunity.isArchived) {
      throw new BadRequestException('Cette opportunité n\'est pas archivée');
    }

    // Restaurer
    await this.opportunityRepository.update(id, {
      deletedAt: null,
      isArchived: false,
      archivedReason: null,
      archivedBy: null,
    });

    return this.findOne(id);
  }

  /**
   * ✅ CORRECTION: Récupérer TOUTES les opportunités (archivées + non-archivées)
   * Le filtrage se fera côté FRONTEND
   */
  async findAllArchived(): Promise<Opportunity[]> {
    console.log('🔍 Backend: Récupération de TOUTES les opportunités (archivées + non-archivées)');
    const allOpportunities = await this.opportunityRepository.find({
      relations: ['lead', 'client', 'assignedTo', 'createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
      withDeleted: true, // ✅ Inclure les soft-deleted
    });
    console.log(`✅ ${allOpportunities.length} opportunités retournées (filtrage côté frontend)`);
    return allOpportunities;
  }

  /**
   * 📊 Statistiques des opportunités
   */
  async getStatistics() {
    const allOpportunities = await this.opportunityRepository.find({
      where: { deletedAt: IsNull() },
    });

    const totalValue = allOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0);
    const wonOpportunities = allOpportunities.filter((opp) => opp.stage === 'closed_won');
    const lostOpportunities = allOpportunities.filter((opp) => opp.stage === 'closed_lost');

    return {
      total: allOpportunities.length,
      byStage: {
        prospecting: allOpportunities.filter((o) => o.stage === 'prospecting').length,
        qualification: allOpportunities.filter((o) => o.stage === 'qualification').length,
        needs_analysis: allOpportunities.filter((o) => o.stage === 'needs_analysis').length,
        proposal: allOpportunities.filter((o) => o.stage === 'proposal').length,
        negotiation: allOpportunities.filter((o) => o.stage === 'negotiation').length,
        closed_won: wonOpportunities.length,
        closed_lost: lostOpportunities.length,
      },
      totalValue,
      wonValue: wonOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0),
      lostValue: lostOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0),
      averageValue: allOpportunities.length > 0 ? totalValue / allOpportunities.length : 0,
      winRate: allOpportunities.length > 0
        ? (wonOpportunities.length / allOpportunities.length) * 100
        : 0,
    };
  }

  /**
   * 📊 Statistiques des opportunités pour un commercial spécifique
   * ✅ MULTI-COMMERCIAUX: Utilise assignedToIds (array)
   */
  async getStatisticsByCommercial(userId: number) {
    const allOpportunities = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .where('opportunity.deletedAt IS NULL')
      .andWhere(':userId = ANY(opportunity.assignedToIds)', { userId })
      .getMany();

    const totalValue = allOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0);
    const wonOpportunities = allOpportunities.filter((opp) => opp.stage === 'closed_won');
    const lostOpportunities = allOpportunities.filter((opp) => opp.stage === 'closed_lost');

    return {
      total: allOpportunities.length,
      byStage: {
        prospecting: allOpportunities.filter((o) => o.stage === 'prospecting').length,
        qualification: allOpportunities.filter((o) => o.stage === 'qualification').length,
        needs_analysis: allOpportunities.filter((o) => o.stage === 'needs_analysis').length,
        proposal: allOpportunities.filter((o) => o.stage === 'proposal').length,
        negotiation: allOpportunities.filter((o) => o.stage === 'negotiation').length,
        closed_won: wonOpportunities.length,
        closed_lost: lostOpportunities.length,
      },
      totalValue,
      wonValue: wonOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0),
      lostValue: lostOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0),
      averageValue: allOpportunities.length > 0 ? totalValue / allOpportunities.length : 0,
      winRate: allOpportunities.length > 0
        ? (wonOpportunities.length / allOpportunities.length) * 100
        : 0,
    };
  }
}
