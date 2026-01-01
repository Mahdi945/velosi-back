import { Injectable, Scope, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Engin } from '../entities/engin.entity';
import { CreateEnginDto, UpdateEnginDto, EnginFiltersDto } from './dto/engin.dto';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable({ scope: Scope.REQUEST })
export class EnginsService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Récupérer tous les engins avec filtres et pagination
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async findAll(databaseName: string, filters?: EnginFiltersDto): Promise<any> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const enginRepository = connection.getRepository(Engin);
    
    // Gérer is_active
    const isActiveValue = filters?.is_active;

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 10; // Par défaut 10 éléments par page
    const skip = (page - 1) * limit;

    // Construire la requête avec QueryBuilder pour gérer tous les filtres
    const queryBuilder = enginRepository.createQueryBuilder('engin');

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
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async findOne(databaseName: string, id: number): Promise<Engin> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const enginRepository = connection.getRepository(Engin);
    const engin = await enginRepository.findOne({ where: { id } });
    
    if (!engin) {
      throw new NotFoundException(`Engin avec l'ID ${id} introuvable`);
    }
    
    return engin;
  }

  /**
   * Créer un nouvel engin
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async create(databaseName: string, createEnginDto: CreateEnginDto): Promise<Engin> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const enginRepository = connection.getRepository(Engin);
    
    // Vérifier si un engin avec le même libellé existe déjà
    const existingEngin = await enginRepository.findOne({
      where: { libelle: createEnginDto.libelle },
    });

    if (existingEngin) {
      throw new BadRequestException(`Un engin avec le libellé "${createEnginDto.libelle}" existe déjà`);
    }

    try {
      const engin = enginRepository.create(createEnginDto);
      return await enginRepository.save(engin);
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
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async update(databaseName: string, id: number, updateEnginDto: UpdateEnginDto): Promise<Engin> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const enginRepository = connection.getRepository(Engin);
    
    const engin = await this.findOne(databaseName, id);

    // Vérifier si le libellé est unique (si modifié)
    if (updateEnginDto.libelle && updateEnginDto.libelle !== engin.libelle) {
      const existingEngin = await enginRepository.findOne({
        where: { libelle: updateEnginDto.libelle },
      });

      if (existingEngin && existingEngin.id !== id) {
        throw new BadRequestException(`Un engin avec le libellé "${updateEnginDto.libelle}" existe déjà`);
      }
    }

    Object.assign(engin, updateEnginDto);
    return enginRepository.save(engin);
  }

  /**
   * Supprimer un engin
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async remove(databaseName: string, id: number): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const enginRepository = connection.getRepository(Engin);
    
    const engin = await this.findOne(databaseName, id);
    await enginRepository.remove(engin);
  }

  /**
   * Activer/Désactiver un engin
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async toggleActive(databaseName: string, id: number): Promise<Engin> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const enginRepository = connection.getRepository(Engin);
    
    const engin = await this.findOne(databaseName, id);
    engin.isActive = !engin.isActive;
    return enginRepository.save(engin);
  }

  /**
   * Récupérer uniquement les engins actifs
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async findAllActive(databaseName: string): Promise<Engin[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const enginRepository = connection.getRepository(Engin);
    
    return enginRepository.find({
      where: { isActive: true },
      order: { libelle: 'ASC' },
    });
  }

  /**
   * Récupérer les statistiques
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async getStats(databaseName: string): Promise<any> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const enginRepository = connection.getRepository(Engin);
    
    const [total, actifs, inactifs] = await Promise.all([
      enginRepository.count(),
      enginRepository.count({ where: { isActive: true } }),
      enginRepository.count({ where: { isActive: false } }),
    ]);

    // Grouper par taille (pied)
    const parPied = await enginRepository
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
