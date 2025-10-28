import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
      where: { deletedAt: IsNull() },
      relations: ['lead', 'client', 'assignedTo', 'createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 🔍 Récupérer une opportunité par ID
   */
  async findOne(id: number): Promise<Opportunity> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id, deletedAt: IsNull() },
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
   * 📋 Récupérer toutes les opportunités archivées
   */
  async findAllArchived(): Promise<Opportunity[]> {
    return this.opportunityRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['lead', 'client', 'assignedTo', 'createdBy', 'updatedBy'],
      order: { deletedAt: 'DESC' },
      withDeleted: true,
    });
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
}
