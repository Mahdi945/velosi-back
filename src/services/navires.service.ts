import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Navire } from '../entities/navire.entity';
import { CreateNavireDto } from '../dto/create-navire.dto';
import { UpdateNavireDto } from '../dto/update-navire.dto';

@Injectable()
export class NaviresService {
  private readonly logger = new Logger(NaviresService.name);

  constructor(
    @InjectRepository(Navire)
    private readonly navireRepository: Repository<Navire>,
  ) {}

  /**
   * Générer un code unique pour un navire
   */
  private async generateCode(): Promise<string> {
    try {
      const lastNavire = await this.navireRepository
        .createQueryBuilder('navire')
        .orderBy('navire.id', 'DESC')
        .getOne();

      let newNumber = 1;
      if (lastNavire && lastNavire.code) {
        const match = lastNavire.code.match(/NAV(\d+)/);
        if (match) {
          newNumber = parseInt(match[1], 10) + 1;
        }
      }

      return `NAV${newNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      this.logger.error('Erreur lors de la génération du code navire', error.stack);
      throw new InternalServerErrorException('Erreur lors de la génération du code');
    }
  }

  /**
   * Créer un nouveau navire
   */
  async create(createNavireDto: CreateNavireDto, userId?: number): Promise<Navire> {
    try {
      const code = await this.generateCode();

      const navire = this.navireRepository.create({
        ...createNavireDto,
        code,
        statut: createNavireDto.statut || 'actif',
        createdBy: userId,
        updatedBy: userId,
      });

      const savedNavire = await this.navireRepository.save(navire);
      this.logger.log(`Navire créé avec succès: ${savedNavire.code}`);

      // Recharger avec la relation armateur
      return this.findOne(savedNavire.id);
    } catch (error) {
      this.logger.error('Erreur lors de la création du navire', error.stack);
      if (error.code === '23505') {
        throw new BadRequestException('Un navire avec ce code existe déjà');
      }
      throw new InternalServerErrorException('Erreur lors de la création du navire');
    }
  }

  /**
   * Récupérer tous les navires avec pagination et filtres
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    statut?: string,
    armateurId?: number,
  ): Promise<{ data: Navire[]; total: number; page: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;

      const where: FindOptionsWhere<Navire> | FindOptionsWhere<Navire>[] = [];

      if (search && statut) {
        where.push(
          { libelle: Like(`%${search}%`), statut },
          { code: Like(`%${search}%`), statut },
          { nationalite: Like(`%${search}%`), statut },
          { conducteur: Like(`%${search}%`), statut },
          { codeOmi: Like(`%${search}%`), statut },
        );
      } else if (search) {
        where.push(
          { libelle: Like(`%${search}%`) },
          { code: Like(`%${search}%`) },
          { nationalite: Like(`%${search}%`) },
          { conducteur: Like(`%${search}%`) },
          { codeOmi: Like(`%${search}%`) },
        );
      } else if (statut) {
        where.push({ statut });
      }

      if (armateurId) {
        if (Array.isArray(where) && where.length > 0) {
          where.forEach((condition) => {
            condition.armateurId = armateurId;
          });
        } else {
          where.push({ armateurId });
        }
      }

      const [data, total] = await this.navireRepository.findAndCount({
        where: where.length > 0 ? where : {},
        relations: ['armateur'],
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Récupération de ${data.length} navires (page ${page}/${totalPages})`);

      return {
        data,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des navires', error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des navires');
    }
  }

  /**
   * Récupérer un navire par son ID
   */
  async findOne(id: number): Promise<Navire> {
    try {
      const navire = await this.navireRepository.findOne({
        where: { id },
        relations: ['armateur'],
      });

      if (!navire) {
        throw new NotFoundException(`Navire avec l'ID ${id} non trouvé`);
      }

      return navire;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la récupération du navire ${id}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération du navire');
    }
  }

  /**
   * Mettre à jour un navire
   */
  async update(id: number, updateNavireDto: UpdateNavireDto, userId?: number): Promise<Navire> {
    try {
      const navire = await this.findOne(id);

      Object.assign(navire, {
        ...updateNavireDto,
        updatedBy: userId,
      });

      await this.navireRepository.save(navire);
      this.logger.log(`Navire ${id} mis à jour avec succès`);

      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la mise à jour du navire ${id}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la mise à jour du navire');
    }
  }

  /**
   * Supprimer un navire
   */
  async remove(id: number): Promise<void> {
    try {
      const navire = await this.findOne(id);
      await this.navireRepository.remove(navire);
      this.logger.log(`Navire ${id} supprimé avec succès`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la suppression du navire ${id}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la suppression du navire');
    }
  }

  /**
   * Activer un navire
   */
  async activate(id: number, userId?: number): Promise<Navire> {
    try {
      const navire = await this.findOne(id);
      navire.statut = 'actif';
      navire.updatedBy = userId;
      await this.navireRepository.save(navire);
      this.logger.log(`Navire ${id} activé avec succès`);
      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de l'activation du navire ${id}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de l\'activation du navire');
    }
  }

  /**
   * Désactiver un navire
   */
  async deactivate(id: number, userId?: number): Promise<Navire> {
    try {
      const navire = await this.findOne(id);
      navire.statut = 'inactif';
      navire.updatedBy = userId;
      await this.navireRepository.save(navire);
      this.logger.log(`Navire ${id} désactivé avec succès`);
      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la désactivation du navire ${id}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la désactivation du navire');
    }
  }

  /**
   * Récupérer tous les navires actifs (pour les dropdowns)
   */
  async findAllActive(): Promise<Navire[]> {
    try {
      return await this.navireRepository.find({
        where: { statut: 'actif' },
        relations: ['armateur'],
        order: { libelle: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des navires actifs', error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des navires actifs');
    }
  }

  /**
   * Récupérer les navires par armateur
   */
  async findByArmateur(armateurId: number): Promise<Navire[]> {
    try {
      return await this.navireRepository.find({
        where: { armateurId },
        relations: ['armateur'],
        order: { libelle: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des navires de l'armateur ${armateurId}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des navires');
    }
  }
}
