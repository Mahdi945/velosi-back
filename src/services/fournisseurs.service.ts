import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Fournisseur } from '../entities/fournisseur.entity';
import { CreateFournisseurDto } from '../dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from '../dto/update-fournisseur.dto';

@Injectable()
export class FournisseursService {
  constructor(
    @InjectRepository(Fournisseur)
    private fournisseurRepository: Repository<Fournisseur>,
  ) {}

  async create(createFournisseurDto: CreateFournisseurDto): Promise<Fournisseur> {
    try {
      // Générer le code si non fourni
      const code = createFournisseurDto.code || await this.generateFournisseurCode();

      // Vérifier si le code existe déjà
      const existingFournisseur = await this.fournisseurRepository.findOne({
        where: { code },
      });

      if (existingFournisseur) {
        throw new ConflictException(`Un fournisseur avec le code "${code}" existe déjà`);
      }

      const fournisseur = this.fournisseurRepository.create({
        ...createFournisseurDto,
        code,
      });
      return await this.fournisseurRepository.save(fournisseur);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la création du fournisseur');
    }
  }

  /**
   * Génère un code fournisseur unique au format FRN001, FRN002, etc.
   */
  private async generateFournisseurCode(): Promise<string> {
    const lastFournisseur = await this.fournisseurRepository
      .createQueryBuilder('fournisseur')
      .where("fournisseur.code LIKE 'FRN%'")
      .orderBy('fournisseur.id', 'DESC')
      .getOne();

    if (!lastFournisseur) {
      return 'FRN001';
    }

    // Extraire le numéro du dernier code
    const match = lastFournisseur.code.match(/FRN(\d+)/);
    if (match) {
      const lastNumber = parseInt(match[1], 10);
      const newNumber = lastNumber + 1;
      return `FRN${newNumber.toString().padStart(3, '0')}`;
    }

    const count = await this.fournisseurRepository.count();
    return `FRN${(count + 1).toString().padStart(3, '0')}`;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    ville?: string,
    pays?: string,
    isActive?: boolean,
  ): Promise<{ data: Fournisseur[]; total: number; page: number; limit: number }> {
    const where: FindOptionsWhere<Fournisseur> = {};

    // Filtre par statut uniquement (recherche côté client)
    if (isActive !== undefined && isActive !== null) {
      where.isActive = isActive;
    }

    const [data, total] = await this.fournisseurRepository.findAndCount({
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

  async findOne(id: number): Promise<Fournisseur> {
    const fournisseur = await this.fournisseurRepository.findOne({
      where: { id },
    });

    if (!fournisseur) {
      throw new NotFoundException(`Fournisseur avec l'ID ${id} non trouvé`);
    }

    return fournisseur;
  }

  async findByCode(code: string): Promise<Fournisseur> {
    const fournisseur = await this.fournisseurRepository.findOne({
      where: { code },
    });

    if (!fournisseur) {
      throw new NotFoundException(`Fournisseur avec le code "${code}" non trouvé`);
    }

    return fournisseur;
  }

  async update(id: number, updateFournisseurDto: UpdateFournisseurDto): Promise<Fournisseur> {
    const fournisseur = await this.findOne(id);

    // Si le code est modifié, vérifier qu'il n'existe pas déjà
    if (updateFournisseurDto.code && updateFournisseurDto.code !== fournisseur.code) {
      const existingFournisseur = await this.fournisseurRepository.findOne({
        where: { code: updateFournisseurDto.code },
      });

      if (existingFournisseur) {
        throw new ConflictException(`Un fournisseur avec le code "${updateFournisseurDto.code}" existe déjà`);
      }
    }

    // Nettoyer les champs auto-générés
    const { ...cleanData } = updateFournisseurDto;
    delete (cleanData as any).id;
    delete (cleanData as any).createdAt;
    delete (cleanData as any).updatedAt;

    Object.assign(fournisseur, cleanData);
    return await this.fournisseurRepository.save(fournisseur);
  }

  async toggleActive(id: number): Promise<Fournisseur> {
    const fournisseur = await this.findOne(id);
    fournisseur.isActive = !fournisseur.isActive;
    return await this.fournisseurRepository.save(fournisseur);
  }

  async remove(id: number): Promise<void> {
    const fournisseur = await this.findOne(id);
    await this.fournisseurRepository.remove(fournisseur);
  }

  async updateLogo(id: number, logoUrl: string): Promise<Fournisseur> {
    const fournisseur = await this.findOne(id);
    fournisseur.logo = logoUrl;
    return await this.fournisseurRepository.save(fournisseur);
  }

  async getStats(): Promise<any> {
    const total = await this.fournisseurRepository.count();
    const actifs = await this.fournisseurRepository.count({ where: { isActive: true } });
    const inactifs = total - actifs;
    const locaux = await this.fournisseurRepository.count({ where: { typeFournisseur: 'local' } });
    const etrangers = await this.fournisseurRepository.count({ where: { typeFournisseur: 'etranger' } });

    return {
      total,
      actifs,
      inactifs,
      locaux,
      etrangers,
    };
  }

  async getVilles(): Promise<string[]> {
    const fournisseurs = await this.fournisseurRepository
      .createQueryBuilder('fournisseur')
      .select('DISTINCT fournisseur.ville', 'ville')
      .where('fournisseur.ville IS NOT NULL')
      .andWhere("fournisseur.ville != ''")
      .orderBy('fournisseur.ville', 'ASC')
      .getRawMany();

    return fournisseurs.map(f => f.ville);
  }

  async getPays(): Promise<string[]> {
    const fournisseurs = await this.fournisseurRepository
      .createQueryBuilder('fournisseur')
      .select('DISTINCT fournisseur.pays', 'pays')
      .where('fournisseur.pays IS NOT NULL')
      .andWhere("fournisseur.pays != ''")
      .orderBy('fournisseur.pays', 'ASC')
      .getRawMany();

    return fournisseurs.map(f => f.pays);
  }
}
