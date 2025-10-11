import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BCsusTVA } from '../entities/bcsus-tva.entity';
import { AutorisationTVA } from '../entities/autorisation-tva.entity';
import { CreateBCsusTVADto, UpdateBCsusTVADto, BCsusTVAResponseDto } from '../dto/bcsus-tva.dto';

@Injectable()
export class BCsusTVAService {
  constructor(
    @InjectRepository(BCsusTVA)
    private readonly bcsusTVARepository: Repository<BCsusTVA>,
    @InjectRepository(AutorisationTVA)
    private readonly autorisationTVARepository: Repository<AutorisationTVA>,
  ) {}

  /**
   * Créer un nouveau bon de commande
   */
  async create(createBCsusTVADto: CreateBCsusTVADto): Promise<BCsusTVAResponseDto> {
    // Vérifier que l'autorisation existe
    const autorisation = await this.autorisationTVARepository.findOne({
      where: { id: createBCsusTVADto.autorisationId }
    });

    if (!autorisation) {
      throw new NotFoundException(`Autorisation avec l'ID ${createBCsusTVADto.autorisationId} non trouvée`);
    }

    // Vérifier l'unicité du numéro de bon de commande pour cette autorisation
    const existingBC = await this.bcsusTVARepository.findOne({
      where: {
        numeroBonCommande: createBCsusTVADto.numeroBonCommande,
        autorisation: { id: createBCsusTVADto.autorisationId }
      }
    });

    if (existingBC) {
      throw new BadRequestException(`Un bon de commande avec le numéro ${createBCsusTVADto.numeroBonCommande} existe déjà pour cette autorisation`);
    }

    const bonCommande = this.bcsusTVARepository.create({
      ...createBCsusTVADto,
      autorisation,
    });

    const savedBC = await this.bcsusTVARepository.save(bonCommande);
    return this.toResponseDto(savedBC);
  }

  /**
   * Récupérer tous les bons de commande avec filtres optionnels
   */
  async findAll(
    autorisationId?: number,
    statut?: string,
    isActive?: boolean
  ): Promise<BCsusTVAResponseDto[]> {
    const queryBuilder = this.bcsusTVARepository
      .createQueryBuilder('bc')
      .leftJoinAndSelect('bc.autorisation', 'autorisation')
      .leftJoinAndSelect('autorisation.client', 'client');

    if (autorisationId) {
      queryBuilder.andWhere('bc.autorisation.id = :autorisationId', { autorisationId });
    }

    if (statut) {
      queryBuilder.andWhere('bc.statut = :statut', { statut });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('bc.is_active = :isActive', { isActive });
    }

    queryBuilder.orderBy('bc.created_at', 'DESC');

    const bonsCommande = await queryBuilder.getMany();
    return bonsCommande.map(bc => this.toResponseDto(bc));
  }

  /**
   * Récupérer un bon de commande par ID
   */
  async findOne(id: number): Promise<BCsusTVAResponseDto> {
    const bonCommande = await this.bcsusTVARepository.findOne({
      where: { id },
      relations: ['autorisation', 'autorisation.client']
    });

    if (!bonCommande) {
      throw new NotFoundException(`Bon de commande avec l'ID ${id} non trouvé`);
    }

    return this.toResponseDto(bonCommande);
  }

  /**
   * Récupérer les bons de commande par client
   */
  async findByClient(clientId: number): Promise<BCsusTVAResponseDto[]> {
    const bonsCommande = await this.bcsusTVARepository
      .createQueryBuilder('bc')
      .leftJoinAndSelect('bc.autorisation', 'autorisation')
      .leftJoinAndSelect('autorisation.client', 'client')
      .where('client.id = :clientId', { clientId })
      .orderBy('bc.created_at', 'DESC')
      .getMany();

    return bonsCommande.map(bc => this.toResponseDto(bc));
  }

  /**
   * Mettre à jour un bon de commande
   */
  async update(id: number, updateBCsusTVADto: UpdateBCsusTVADto): Promise<BCsusTVAResponseDto> {
    const bonCommande = await this.bcsusTVARepository.findOne({
      where: { id },
      relations: ['autorisation']
    });

    if (!bonCommande) {
      throw new NotFoundException(`Bon de commande avec l'ID ${id} non trouvé`);
    }

    // Vérifier l'unicité du numéro si modifié
    if (updateBCsusTVADto.numeroBonCommande && updateBCsusTVADto.numeroBonCommande !== bonCommande.numeroBonCommande) {
      const existingBC = await this.bcsusTVARepository.findOne({
        where: {
          numeroBonCommande: updateBCsusTVADto.numeroBonCommande,
          autorisation: { id: bonCommande.autorisation.id }
        }
      });

      if (existingBC && existingBC.id !== id) {
        throw new BadRequestException(`Un bon de commande avec le numéro ${updateBCsusTVADto.numeroBonCommande} existe déjà pour cette autorisation`);
      }
    }

    Object.assign(bonCommande, updateBCsusTVADto);
    const updatedBC = await this.bcsusTVARepository.save(bonCommande);
    return this.toResponseDto(updatedBC);
  }

  /**
   * Supprimer un bon de commande (soft delete)
   */
  async remove(id: number): Promise<void> {
    const bonCommande = await this.bcsusTVARepository.findOne({ where: { id } });

    if (!bonCommande) {
      throw new NotFoundException(`Bon de commande avec l'ID ${id} non trouvé`);
    }

    bonCommande.is_active = false;
    await this.bcsusTVARepository.save(bonCommande);
  }

  /**
   * Supprimer définitivement un bon de commande
   */
  async hardDelete(id: number): Promise<void> {
    const result = await this.bcsusTVARepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Bon de commande avec l'ID ${id} non trouvé`);
    }
  }

  /**
   * Obtenir les statistiques des bons de commande pour une autorisation
   */
  async getStatsByAutorisation(autorisationId: number) {
    const stats = await this.bcsusTVARepository
      .createQueryBuilder('bc')
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN bc.statut = \'ACTIF\' THEN 1 END) as actifs',
        'COUNT(CASE WHEN bc.statut = \'EXPIRE\' THEN 1 END) as expires',
        'COUNT(CASE WHEN bc.statut = \'SUSPENDU\' THEN 1 END) as suspendus',
        'COUNT(CASE WHEN bc.statut = \'ANNULE\' THEN 1 END) as annules',
        'SUM(CASE WHEN bc.statut = \'ACTIF\' THEN bc.montantBonCommande ELSE 0 END) as montantTotal'
      ])
      .where('bc.autorisation.id = :autorisationId', { autorisationId })
      .andWhere('bc.is_active = true')
      .getRawOne();

    return {
      total: parseInt(stats.total) || 0,
      actifs: parseInt(stats.actifs) || 0,
      expires: parseInt(stats.expires) || 0,
      suspendus: parseInt(stats.suspendus) || 0,
      annules: parseInt(stats.annules) || 0,
      montantTotal: parseFloat(stats.montantTotal) || 0
    };
  }

  /**
   * Convertir une entité en DTO de réponse
   */
  private toResponseDto(bonCommande: BCsusTVA): BCsusTVAResponseDto {
    return {
      id: bonCommande.id,
      autorisationId: bonCommande.autorisation?.id,
      numeroBonCommande: bonCommande.numeroBonCommande,
      dateBonCommande: bonCommande.dateBonCommande,
      montantBonCommande: bonCommande.montantBonCommande,
      description: bonCommande.description,
      imagePath: bonCommande.imagePath,
      statut: bonCommande.statut,
      is_active: bonCommande.is_active,
      created_at: bonCommande.created_at,
      updated_at: bonCommande.updated_at,
      statusText: bonCommande.statusText,
      isValid: bonCommande.isValid,
      isExpired: bonCommande.isExpired,
      numeroAutorisationFromRelation: bonCommande.numeroAutorisationFromRelation
    };
  }
}