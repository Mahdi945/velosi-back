import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Engin } from '../entities/engin.entity';

export interface CreateEnginDto {
  libelle: string;
  conteneurRemorque?: string;
  poidsVide?: number;
  pied?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateEnginDto {
  libelle?: string;
  conteneurRemorque?: string;
  poidsVide?: number;
  pied?: string;
  description?: string;
  isActive?: boolean;
}

export interface EnginQuery {
  search?: string;
  isActive?: boolean;
  pied?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class EnginService {
  constructor(
    @InjectRepository(Engin)
    private readonly enginRepository: Repository<Engin>,
  ) {}

  /**
   * Récupérer tous les engins avec pagination et filtres
   */
  async findAll(query: EnginQuery = {}) {
    const {
      search,
      isActive,
      pied,
      page = 1,
      limit = 50,
      sortBy = 'libelle',
      sortOrder = 'ASC'
    } = query;

    const queryBuilder = this.enginRepository.createQueryBuilder('engin');

    // Filtres
    if (search) {
      queryBuilder.andWhere(
        '(engin.libelle ILIKE :search OR engin.conteneurRemorque ILIKE :search OR engin.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('engin.isActive = :isActive', { isActive });
    }

    if (pied) {
      queryBuilder.andWhere('engin.pied = :pied', { pied });
    }

    // Tri
    const validSortFields = ['libelle', 'conteneurRemorque', 'poidsVide', 'pied', 'id'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'libelle';
    queryBuilder.orderBy(`engin.${sortField}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer un engin par ID
   */
  async findOne(id: number): Promise<Engin> {
    const engin = await this.enginRepository.findOne({
      where: { id }
    });

    if (!engin) {
      throw new NotFoundException(`Engin avec l'ID ${id} non trouvé`);
    }

    return engin;
  }

  /**
   * Récupérer tous les engins actifs (pour les selects)
   */
  async findActive(): Promise<Engin[]> {
    return this.enginRepository.find({
      where: { isActive: true },
      order: { libelle: 'ASC' }
    });
  }

  /**
   * Créer un nouvel engin
   */
  async create(createEnginDto: CreateEnginDto): Promise<Engin> {
    const engin = this.enginRepository.create({
      ...createEnginDto,
      isActive: createEnginDto.isActive ?? true
    });

    return this.enginRepository.save(engin);
  }

  /**
   * Mettre à jour un engin
   */
  async update(id: number, updateEnginDto: UpdateEnginDto): Promise<Engin> {
    const engin = await this.findOne(id);

    Object.assign(engin, updateEnginDto);

    return this.enginRepository.save(engin);
  }

  /**
   * Supprimer un engin (soft delete en désactivant)
   */
  async remove(id: number): Promise<Engin> {
    const engin = await this.findOne(id);
    engin.isActive = false;
    return this.enginRepository.save(engin);
  }

  /**
   * Supprimer définitivement un engin
   */
  async delete(id: number): Promise<void> {
    const result = await this.enginRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Engin avec l'ID ${id} non trouvé`);
    }
  }

  /**
   * Récupérer les engins par IDs
   */
  async findByIds(ids: number[]): Promise<Engin[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    return this.enginRepository.findByIds(ids);
  }

  /**
   * Statistiques des engins
   */
  async getStats() {
    const total = await this.enginRepository.count();
    const active = await this.enginRepository.count({ where: { isActive: true } });
    const inactive = total - active;

    // Grouper par pied
    const byPied = await this.enginRepository
      .createQueryBuilder('engin')
      .select('engin.pied', 'pied')
      .addSelect('COUNT(*)', 'count')
      .where('engin.isActive = :active', { active: true })
      .groupBy('engin.pied')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      total,
      active,
      inactive,
      byPied: byPied.map(item => ({
        pied: item.pied || 'Non défini',
        count: parseInt(item.count)
      }))
    };
  }
}