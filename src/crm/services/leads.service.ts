import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Lead } from '../../entities/crm/lead.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) {}

  /**
   * 🔍 Récupérer tous les leads actifs (non archivés)
   */
  async findAll(): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['assignedTo', 'createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 🔍 Récupérer les leads assignés à un commercial spécifique
   */
  async findByAssignedTo(userId: number): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { 
        assignedToId: userId,
        deletedAt: IsNull()
      },
      relations: ['assignedTo', 'createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 🔍 Récupérer un lead par ID
   */
  async findOne(id: number): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['assignedTo', 'createdBy', 'updatedBy'],
    });

    if (!lead) {
      throw new NotFoundException(`Lead #${id} introuvable`);
    }

    return lead;
  }

  /**
   * ✏️ Créer un nouveau lead
   */
  async create(leadData: Partial<Lead>): Promise<Lead> {
    const lead = this.leadRepository.create(leadData);
    return this.leadRepository.save(lead);
  }

  /**
   * 🔄 Mettre à jour un lead
   */
  async update(id: number, leadData: Partial<Lead>): Promise<Lead> {
    const lead = await this.findOne(id);
    
    Object.assign(lead, leadData);
    return this.leadRepository.save(lead);
  }

  /**
   * 🗑️ SOFT DELETE - Archiver un lead
   * Ne supprime jamais physiquement - conservation historique du pipeline
   */
  async archiveLead(id: number, reason: string, userId: number): Promise<Lead> {
    const lead = await this.findOne(id);

    if (!lead) {
      throw new NotFoundException(`Lead #${id} introuvable`);
    }

    // Vérifier si déjà archivé
    if (lead.deletedAt || lead.isArchived) {
      throw new BadRequestException('Ce lead est déjà archivé');
    }

    // Mettre à jour avec soft delete
    await this.leadRepository.update(id, {
      deletedAt: new Date(),
      isArchived: true,
      archivedReason: reason,
      archivedBy: userId,
    });

    return this.leadRepository.findOne({
      where: { id },
      withDeleted: true,
      relations: ['assignedTo', 'createdBy', 'updatedBy'],
    });
  }

  /**
   * ♻️ Restaurer un lead archivé
   */
  async restoreLead(id: number): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      withDeleted: true,
      relations: ['assignedTo', 'createdBy', 'updatedBy'],
    });

    if (!lead) {
      throw new NotFoundException(`Lead #${id} introuvable`);
    }

    if (!lead.deletedAt && !lead.isArchived) {
      throw new BadRequestException('Ce lead n\'est pas archivé');
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

  /**
   * ✅ CORRECTION: Récupérer TOUS les prospects (archivés + non-archivés)
   * Le filtrage se fera côté FRONTEND
   */
  async findAllArchived(): Promise<Lead[]> {
    console.log('🔍 Backend: Récupération de TOUS les prospects (archivés + non-archivés)');
    const allLeads = await this.leadRepository.find({
      relations: ['assignedTo', 'createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
      withDeleted: true, // ✅ Inclure les soft-deleted
    });
    console.log(`✅ ${allLeads.length} prospects retournés (filtrage côté frontend)`);
    return allLeads;
  }

  /**
   * 📊 Statistiques des leads
   */
  async getStatistics() {
    const allLeads = await this.leadRepository.find({
      where: { deletedAt: IsNull() },
    });

    return {
      total: allLeads.length,
      byStatus: {
        new: allLeads.filter((l) => l.status === 'new').length,
        contacted: allLeads.filter((l) => l.status === 'contacted').length,
        qualified: allLeads.filter((l) => l.status === 'qualified').length,
        unqualified: allLeads.filter((l) => l.status === 'unqualified').length,
        nurturing: allLeads.filter((l) => l.status === 'nurturing').length,
        converted: allLeads.filter((l) => l.status === 'converted').length,
        client: allLeads.filter((l) => l.status === 'client').length,
        lost: allLeads.filter((l) => l.status === 'lost').length,
      },
      byPriority: {
        low: allLeads.filter((l) => l.priority === 'low').length,
        medium: allLeads.filter((l) => l.priority === 'medium').length,
        high: allLeads.filter((l) => l.priority === 'high').length,
        urgent: allLeads.filter((l) => l.priority === 'urgent').length,
      },
    };
  }

  /**
   * 📊 Statistiques des leads pour un commercial spécifique
   */
  async getStatisticsByCommercial(userId: number) {
    const allLeads = await this.leadRepository.find({
      where: { 
        assignedToId: userId,
        deletedAt: IsNull()
      },
    });

    return {
      total: allLeads.length,
      byStatus: {
        new: allLeads.filter((l) => l.status === 'new').length,
        contacted: allLeads.filter((l) => l.status === 'contacted').length,
        qualified: allLeads.filter((l) => l.status === 'qualified').length,
        unqualified: allLeads.filter((l) => l.status === 'unqualified').length,
        nurturing: allLeads.filter((l) => l.status === 'nurturing').length,
        converted: allLeads.filter((l) => l.status === 'converted').length,
        client: allLeads.filter((l) => l.status === 'client').length,
        lost: allLeads.filter((l) => l.status === 'lost').length,
      },
      byPriority: {
        low: allLeads.filter((l) => l.priority === 'low').length,
        medium: allLeads.filter((l) => l.priority === 'medium').length,
        high: allLeads.filter((l) => l.priority === 'high').length,
        urgent: allLeads.filter((l) => l.priority === 'urgent').length,
      },
    };
  }
}
