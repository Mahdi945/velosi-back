import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Industry } from '../entities/industry.entity';

@Injectable()
export class IndustryService {
  constructor(
    @InjectRepository(Industry)
    private industryRepository: Repository<Industry>,
  ) {}

  /**
   * Récupérer tous les secteurs d'activité
   */
  async findAll(): Promise<Industry[]> {
    return this.industryRepository.find({
      order: { libelle: 'ASC' },
    });
  }

  /**
   * Créer un nouveau secteur d'activité
   */
  async create(libelle: string): Promise<Industry> {
    // Vérifier si le secteur existe déjà (case-insensitive)
    const existing = await this.industryRepository
      .createQueryBuilder('industry')
      .where('LOWER(industry.libelle) = LOWER(:libelle)', { libelle: libelle.trim() })
      .getOne();

    if (existing) {
      throw new Error(`Le secteur d'activité "${libelle.trim()}" existe déjà`);
    }

    const industry = this.industryRepository.create({ libelle: libelle.trim() });
    return this.industryRepository.save(industry);
  }

  /**
   * Rechercher un secteur par ID
   */
  async findById(id: number): Promise<Industry> {
    return this.industryRepository.findOne({ where: { id } });
  }

  /**
   * Supprimer un secteur d'activité
   */
  async delete(id: number): Promise<void> {
    await this.industryRepository.delete(id);
  }
}
