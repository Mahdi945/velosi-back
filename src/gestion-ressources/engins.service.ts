import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Engin } from '../entities/engin.entity';
import { CreateEnginDto, UpdateEnginDto, EnginFiltersDto } from './dto/engin.dto';

@Injectable()
export class EnginsService {
  constructor(
    @InjectRepository(Engin)
    private enginRepository: Repository<Engin>,
  ) {}

  /**
   * Récupérer tous les engins avec filtres et pagination
   */
  async findAll(filters?: EnginFiltersDto): Promise<any> {
    // Gérer is_active ou isActive
    const isActiveValue = filters?.is_active !== undefined ? filters.is_active : filters?.isActive;

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 10; // Par défaut 10 éléments par page
    const skip = (page - 1) * limit;

    // Construire la requête avec QueryBuilder pour gérer tous les filtres
    const queryBuilder = this.enginRepository.createQueryBuilder('engin');

    // Filtre par recherche (libelle, conteneur_remorque, description)
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      queryBuilder.andWhere(
        '(engin.libelle ILIKE :search OR engin.conteneurRemorque ILIKE :search OR engin.description ILIKE :search OR engin.pied ILIKE :search)',
        { search: searchTerm }
      );
    }

    // Filtre par pied (taille)
    if (filters?.pied) {
      queryBuilder.andWhere('engin.pied = :pied', { pied: filters.pied });
    }

    // Filtre par type d'engin (conteneur/remorque) - insensible à la casse
    if (filters?.conteneurRemorque) {
      queryBuilder.andWhere('engin.conteneurRemorque ILIKE :conteneurRemorque', { 
        conteneurRemorque: filters.conteneurRemorque 
      });
    }

    // Filtre par statut actif/inactif
    if (isActiveValue !== undefined) {
      queryBuilder.andWhere('engin.isActive = :isActive', { isActive: isActiveValue });
    }

    // Tri descendant par ID (les plus récents en premier)
    queryBuilder.orderBy('engin.id', 'DESC');

    // Compter le total pour la pagination
    const total = await queryBuilder.getCount();

    // Appliquer la pagination
    queryBuilder.skip(skip).take(limit);

    // Récupérer les données
    const data = await queryBuilder.getMany();

    return {
      success: true,
      data: {
        data,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        pageSize: limit
      }
    };
  }

  /**
   * Récupérer un engin par ID
   */
  async findOne(id: number): Promise<Engin> {
    const engin = await this.enginRepository.findOne({ where: { id } });
    
    if (!engin) {
      throw new NotFoundException(`Engin avec l'ID ${id} introuvable`);
    }
    
    return engin;
  }

  /**
   * Créer un nouvel engin
   */
  async create(createEnginDto: CreateEnginDto): Promise<Engin> {
    // Vérifier si un engin avec le même libellé existe déjà
    const existingEngin = await this.enginRepository.findOne({
      where: { libelle: createEnginDto.libelle },
    });

    if (existingEngin) {
      throw new BadRequestException(`Un engin avec le libellé "${createEnginDto.libelle}" existe déjà`);
    }

    try {
      const engin = this.enginRepository.create(createEnginDto);
      return await this.enginRepository.save(engin);
    } catch (error) {
      // Gérer l'erreur de clé primaire dupliquée
      if (error.code === '23505' && error.constraint === 'engin_pkey') {
        throw new BadRequestException(
          'Erreur de séquence ID. Veuillez contacter l\'administrateur pour réinitialiser la séquence de la table engin.'
        );
      }
      throw error;
    }
  }

  /**
   * Mettre à jour un engin
   */
  async update(id: number, updateEnginDto: UpdateEnginDto): Promise<Engin> {
    const engin = await this.findOne(id);

    // Vérifier si le libellé est unique (si modifié)
    if (updateEnginDto.libelle && updateEnginDto.libelle !== engin.libelle) {
      const existingEngin = await this.enginRepository.findOne({
        where: { libelle: updateEnginDto.libelle },
      });

      if (existingEngin && existingEngin.id !== id) {
        throw new BadRequestException(`Un engin avec le libellé "${updateEnginDto.libelle}" existe déjà`);
      }
    }

    Object.assign(engin, updateEnginDto);
    return this.enginRepository.save(engin);
  }

  /**
   * Supprimer un engin
   */
  async remove(id: number): Promise<void> {
    const engin = await this.findOne(id);
    await this.enginRepository.remove(engin);
  }

  /**
   * Activer/Désactiver un engin
   */
  async toggleActive(id: number): Promise<Engin> {
    const engin = await this.findOne(id);
    engin.isActive = !engin.isActive;
    return this.enginRepository.save(engin);
  }

  /**
   * Récupérer uniquement les engins actifs
   */
  async findAllActive(): Promise<Engin[]> {
    return this.enginRepository.find({
      where: { isActive: true },
      order: { libelle: 'ASC' },
    });
  }

  /**
   * Récupérer les statistiques
   */
  async getStats(): Promise<any> {
    const [total, actifs, inactifs] = await Promise.all([
      this.enginRepository.count(),
      this.enginRepository.count({ where: { isActive: true } }),
      this.enginRepository.count({ where: { isActive: false } }),
    ]);

    // Grouper par taille (pied)
    const parPied = await this.enginRepository
      .createQueryBuilder('engin')
      .select('engin.pied', 'pied')
      .addSelect('COUNT(*)', 'count')
      .where('engin.isActive = :isActive', { isActive: true })
      .andWhere('engin.pied IS NOT NULL')
      .andWhere("engin.pied != ''")
      .groupBy('engin.pied')
      .orderBy('engin.pied', 'ASC')
      .getRawMany();

    return {
      total,
      actifs,
      inactifs,
      parPied: parPied.map(p => ({
        taille: p.pied,
        nombre: parseInt(p.count, 10),
      })),
    };
  }
}
