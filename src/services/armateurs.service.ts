import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Armateur } from '../entities/armateur.entity';
import { CreateArmateurDto } from '../dto/create-armateur.dto';
import { UpdateArmateurDto } from '../dto/update-armateur.dto';

@Injectable()
export class ArmateursService {
  constructor(
    @InjectRepository(Armateur)
    private readonly armateurRepository: Repository<Armateur>,
  ) {}

  async create(createArmateurDto: CreateArmateurDto): Promise<Armateur> {
    try {
      // Générer automatiquement le code si non fourni
      let code = createArmateurDto.code;
      if (!code) {
        code = await this.generateArmateurCode();
      }

      // Vérifier si le code existe déjà
      const existingArmateur = await this.armateurRepository.findOne({
        where: { code },
      });

      if (existingArmateur) {
        throw new ConflictException(`Un armateur avec le code "${code}" existe déjà`);
      }

      const armateur = this.armateurRepository.create({
        ...createArmateurDto,
        code,
      });
      return await this.armateurRepository.save(armateur);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la création de l\'armateur');
    }
  }

  /**
   * Génère un code armateur unique au format ARM001, ARM002, etc.
   */
  private async generateArmateurCode(): Promise<string> {
    // Récupérer le dernier armateur créé
    const lastArmateur = await this.armateurRepository
      .createQueryBuilder('armateur')
      .where("armateur.code LIKE 'ARM%'")
      .orderBy('armateur.id', 'DESC')
      .getOne();

    if (!lastArmateur) {
      return 'ARM001';
    }

    // Extraire le numéro du dernier code
    const lastCode = lastArmateur.code;
    const match = lastCode.match(/ARM(\d+)/);
    
    if (match) {
      const lastNumber = parseInt(match[1], 10);
      const newNumber = lastNumber + 1;
      return `ARM${newNumber.toString().padStart(3, '0')}`;
    }

    // Si le format ne correspond pas, chercher le plus grand ID
    const count = await this.armateurRepository.count();
    return `ARM${(count + 1).toString().padStart(3, '0')}`;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    ville?: string,
    pays?: string,
    isActive?: boolean,
  ): Promise<{ data: Armateur[]; total: number; page: number; limit: number }> {
    const where: FindOptionsWhere<Armateur> = {};

    // Filtre par statut uniquement (recherche côté client)
    if (isActive !== undefined && isActive !== null) {
      where.isActive = isActive;
    }

    const [data, total] = await this.armateurRepository.findAndCount({
      where,
      order: { id: 'DESC' }, // Ordre décroissant (les plus récents en premier)
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<Armateur> {
    const armateur = await this.armateurRepository.findOne({ where: { id } });
    if (!armateur) {
      throw new NotFoundException(`Armateur avec l'ID ${id} non trouvé`);
    }
    return armateur;
  }

  async findByCode(code: string): Promise<Armateur> {
    const armateur = await this.armateurRepository.findOne({ where: { code } });
    if (!armateur) {
      throw new NotFoundException(`Armateur avec le code ${code} non trouvé`);
    }
    return armateur;
  }

  async update(id: number, updateArmateurDto: UpdateArmateurDto): Promise<Armateur> {
    const armateur = await this.findOne(id);

    // Si le code est modifié, vérifier qu'il n'existe pas déjà
    if (updateArmateurDto.code && updateArmateurDto.code !== armateur.code) {
      const existingArmateur = await this.armateurRepository.findOne({
        where: { code: updateArmateurDto.code },
      });

      if (existingArmateur) {
        throw new ConflictException(`Un armateur avec le code "${updateArmateurDto.code}" existe déjà`);
      }
    }

    // Nettoyer les champs auto-générés qui ne doivent pas être mis à jour
    const { ...cleanData } = updateArmateurDto;
    delete (cleanData as any).id;
    delete (cleanData as any).createdAt;
    delete (cleanData as any).updatedAt;

    Object.assign(armateur, cleanData);
    return await this.armateurRepository.save(armateur);
  }

  async toggleActive(id: number): Promise<Armateur> {
    const armateur = await this.findOne(id);
    armateur.isActive = !armateur.isActive;
    return await this.armateurRepository.save(armateur);
  }

  async remove(id: number): Promise<void> {
    const armateur = await this.findOne(id);
    await this.armateurRepository.remove(armateur);
  }

  async updateLogo(id: number, logoUrl: string): Promise<Armateur> {
    const armateur = await this.findOne(id);
    armateur.logo = logoUrl;
    return await this.armateurRepository.save(armateur);
  }

  async getStats(): Promise<{
    total: number;
    actifs: number;
    inactifs: number;
    parPays: { pays: string; count: number }[];
  }> {
    const total = await this.armateurRepository.count();
    const actifs = await this.armateurRepository.count({ where: { isActive: true } });
    const inactifs = await this.armateurRepository.count({ where: { isActive: false } });

    // Statistiques par pays
    const parPaysRaw = await this.armateurRepository
      .createQueryBuilder('armateur')
      .select('armateur.pays', 'pays')
      .addSelect('COUNT(*)', 'count')
      .where('armateur.pays IS NOT NULL')
      .groupBy('armateur.pays')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const parPays = parPaysRaw.map(item => ({
      pays: item.pays,
      count: parseInt(item.count, 10),
    }));

    return { total, actifs, inactifs, parPays };
  }

  async getVilles(): Promise<string[]> {
    const result = await this.armateurRepository
      .createQueryBuilder('armateur')
      .select('DISTINCT armateur.ville', 'ville')
      .where('armateur.ville IS NOT NULL')
      .orderBy('armateur.ville', 'ASC')
      .getRawMany();

    return result.map(item => item.ville);
  }

  async getPays(): Promise<string[]> {
    const result = await this.armateurRepository
      .createQueryBuilder('armateur')
      .select('DISTINCT armateur.pays', 'pays')
      .where('armateur.pays IS NOT NULL')
      .orderBy('armateur.pays', 'ASC')
      .getRawMany();

    return result.map(item => item.pays);
  }
}
