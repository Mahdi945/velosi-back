import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Aeroport } from '../entities/aeroport.entity';
import { CreateAeroportDto, UpdateAeroportDto } from '../dto/aeroport.dto';

@Injectable()
export class AeroportsService {
  constructor(
    @InjectRepository(Aeroport)
    private readonly aeroportRepository: Repository<Aeroport>,
  ) {}

  /**
   * Créer un nouvel aéroport
   */
  async create(createAeroportDto: CreateAeroportDto): Promise<Aeroport> {
    // Vérifier si l'abréviation existe déjà (seulement si fournie)
    if (createAeroportDto.abbreviation) {
      const existing = await this.aeroportRepository.findOne({
        where: { abbreviation: createAeroportDto.abbreviation },
      });

      if (existing) {
        throw new ConflictException(
          `Un aéroport avec le code "${createAeroportDto.abbreviation}" existe déjà`
        );
      }
    }

    const aeroport = this.aeroportRepository.create(createAeroportDto);
    return await this.aeroportRepository.save(aeroport);
  }

  /**
   * Récupérer tous les aéroports avec filtres et pagination
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    ville?: string,
    pays?: string,
    isActive?: boolean,
  ): Promise<{ data: Aeroport[]; total: number; page: number; limit: number }> {
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      // Recherche avancée sur plusieurs champs
      const query = this.aeroportRepository.createQueryBuilder('aeroport');
      
      if (isActive !== undefined) {
        query.andWhere('aeroport.isActive = :isActive', { isActive });
      }

      if (ville) {
        query.andWhere('aeroport.ville ILIKE :ville', { ville: `%${ville}%` });
      }

      if (pays) {
        query.andWhere('aeroport.pays ILIKE :pays', { pays: `%${pays}%` });
      }

      query.andWhere(
        '(aeroport.libelle ILIKE :search OR aeroport.abbreviation ILIKE :search OR aeroport.ville ILIKE :search OR aeroport.pays ILIKE :search)',
        { search: `%${search}%` }
      );

      const [data, total] = await query
        .skip((page - 1) * limit)
        .take(limit)
        .orderBy('aeroport.libelle', 'ASC')
        .getManyAndCount();

      return { data, total, page, limit };
    }

    // Filtres simples
    if (ville) {
      where.ville = Like(`%${ville}%`);
    }

    if (pays) {
      where.pays = Like(`%${pays}%`);
    }

    const [data, total] = await this.aeroportRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { libelle: 'ASC' },
    });

    return { data, total, page, limit };
  }

  /**
   * Récupérer un aéroport par ID
   */
  async findOne(id: number): Promise<Aeroport> {
    const aeroport = await this.aeroportRepository.findOne({ where: { id } });
    
    if (!aeroport) {
      throw new NotFoundException(`Aéroport avec l'ID ${id} non trouvé`);
    }

    return aeroport;
  }

  /**
   * Mettre à jour un aéroport
   */
  async update(id: number, updateAeroportDto: UpdateAeroportDto): Promise<Aeroport> {
    const aeroport = await this.findOne(id);

    // Si l'abréviation change, vérifier qu'elle n'existe pas déjà
    if (updateAeroportDto.abbreviation && updateAeroportDto.abbreviation !== aeroport.abbreviation) {
      const existing = await this.aeroportRepository.findOne({
        where: { abbreviation: updateAeroportDto.abbreviation },
      });

      if (existing) {
        throw new ConflictException(
          `Un aéroport avec le code "${updateAeroportDto.abbreviation}" existe déjà`
        );
      }
    }

    Object.assign(aeroport, updateAeroportDto);
    return await this.aeroportRepository.save(aeroport);
  }

  /**
   * Basculer le statut actif/inactif d'un aéroport
   */
  async toggleActive(id: number): Promise<Aeroport> {
    const aeroport = await this.findOne(id);
    aeroport.isActive = !aeroport.isActive;
    return await this.aeroportRepository.save(aeroport);
  }

  /**
   * Supprimer un aéroport
   */
  async remove(id: number): Promise<void> {
    const aeroport = await this.findOne(id);
    await this.aeroportRepository.remove(aeroport);
  }

  /**
   * Récupérer tous les aéroports actifs (pour les listes déroulantes)
   */
  async findAllActive(): Promise<Aeroport[]> {
    return await this.aeroportRepository.find({
      where: { isActive: true },
      order: { libelle: 'ASC' },
    });
  }

  /**
   * Recherche rapide par code IATA/ICAO
   */
  async findByAbbreviation(abbreviation: string): Promise<Aeroport | null> {
    return await this.aeroportRepository.findOne({
      where: { abbreviation },
    });
  }
}
