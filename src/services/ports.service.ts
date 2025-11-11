import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Port } from '../entities/port.entity';
import { CreatePortDto, UpdatePortDto } from '../dto/port.dto';

@Injectable()
export class PortsService {
  constructor(
    @InjectRepository(Port)
    private readonly portRepository: Repository<Port>,
  ) {}

  /**
   * Créer un nouveau port
   */
  async create(createPortDto: CreatePortDto): Promise<Port> {
    // Vérifier si l'abréviation existe déjà (seulement si fournie)
    if (createPortDto.abbreviation) {
      const existing = await this.portRepository.findOne({
        where: { abbreviation: createPortDto.abbreviation },
      });

      if (existing) {
        throw new ConflictException(
          `Un port avec l'abréviation "${createPortDto.abbreviation}" existe déjà`
        );
      }
    }

    const port = this.portRepository.create(createPortDto);
    return await this.portRepository.save(port);
  }

  /**
   * Récupérer tous les ports avec filtres et pagination
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    ville?: string,
    pays?: string,
    isActive?: boolean,
  ): Promise<{ data: Port[]; total: number; page: number; limit: number }> {
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      // Recherche sur plusieurs champs n'est pas directement supportée par TypeORM
      // On va récupérer tous les résultats filtrés et faire la recherche en mémoire
      const query = this.portRepository.createQueryBuilder('port');
      
      if (isActive !== undefined) {
        query.andWhere('port.isActive = :isActive', { isActive });
      }

      if (ville) {
        query.andWhere('port.ville ILIKE :ville', { ville: `%${ville}%` });
      }

      if (pays) {
        query.andWhere('port.pays ILIKE :pays', { pays: `%${pays}%` });
      }

      query.andWhere(
        '(port.libelle ILIKE :search OR port.abbreviation ILIKE :search OR port.ville ILIKE :search OR port.pays ILIKE :search)',
        { search: `%${search}%` }
      );

      const [data, total] = await query
        .skip((page - 1) * limit)
        .take(limit)
        .orderBy('port.libelle', 'ASC')
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

    const [data, total] = await this.portRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { libelle: 'ASC' },
    });

    return { data, total, page, limit };
  }

  /**
   * Récupérer un port par ID
   */
  async findOne(id: number): Promise<Port> {
    const port = await this.portRepository.findOne({ where: { id } });
    
    if (!port) {
      throw new NotFoundException(`Port avec l'ID ${id} non trouvé`);
    }

    return port;
  }

  /**
   * Mettre à jour un port
   */
  async update(id: number, updatePortDto: UpdatePortDto): Promise<Port> {
    const port = await this.findOne(id);

    // Si l'abréviation change, vérifier qu'elle n'existe pas déjà
    if (updatePortDto.abbreviation && updatePortDto.abbreviation !== port.abbreviation) {
      const existing = await this.portRepository.findOne({
        where: { abbreviation: updatePortDto.abbreviation },
      });

      if (existing) {
        throw new ConflictException(
          `Un port avec l'abréviation "${updatePortDto.abbreviation}" existe déjà`
        );
      }
    }

    Object.assign(port, updatePortDto);
    return await this.portRepository.save(port);
  }

  /**
   * Basculer le statut actif/inactif d'un port
   */
  async toggleActive(id: number): Promise<Port> {
    const port = await this.findOne(id);
    port.isActive = !port.isActive;
    return await this.portRepository.save(port);
  }

  /**
   * Supprimer un port
   */
  async remove(id: number): Promise<void> {
    const port = await this.findOne(id);
    await this.portRepository.remove(port);
  }

  /**
   * Récupérer tous les ports actifs (pour les listes déroulantes)
   */
  async findAllActive(): Promise<Port[]> {
    return await this.portRepository.find({
      where: { isActive: true },
      order: { libelle: 'ASC' },
    });
  }

  /**
   * Récupérer tous les ports (actifs et inactifs) pour les listes déroulantes complètes
   */
  async findAllPorts(): Promise<Port[]> {
    return await this.portRepository.find({
      order: { libelle: 'ASC' },
    });
  }

  /**
   * Recherche rapide par abréviation
   */
  async findByAbbreviation(abbreviation: string): Promise<Port | null> {
    return await this.portRepository.findOne({
      where: { abbreviation },
    });
  }
}
