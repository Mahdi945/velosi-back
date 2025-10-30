import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Correspondant } from './entities/correspondant.entity';
import { CreateCorrespondantDto } from './dto/create-correspondant.dto';
import { UpdateCorrespondantDto } from './dto/update-correspondant.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CorrespondantsService {
  constructor(
    @InjectRepository(Correspondant)
    private correspondantsRepository: Repository<Correspondant>,
  ) {}

  async create(createCorrespondantDto: CreateCorrespondantDto): Promise<Correspondant> {
    try {
      const correspondant = this.correspondantsRepository.create(createCorrespondantDto);
      return await this.correspondantsRepository.save(correspondant);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Un correspondant avec ce code existe déjà');
      }
      throw error;
    }
  }

  async findAll(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    nature?: string;
    statut?: string;
    ville?: string;
    pays?: string;
    competence?: string;
  }): Promise<{ data: Correspondant[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.correspondantsRepository.createQueryBuilder('correspondant');

    // Recherche globale
    if (filters?.search) {
      queryBuilder.andWhere(
        '(correspondant.libelle ILIKE :search OR correspondant.code ILIKE :search OR correspondant.email ILIKE :search OR correspondant.ville ILIKE :search OR correspondant.pays ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Filtre par nature
    if (filters?.nature) {
      queryBuilder.andWhere('correspondant.nature = :nature', { nature: filters.nature });
    }

    // Filtre par statut
    if (filters?.statut) {
      queryBuilder.andWhere('correspondant.statut = :statut', { statut: filters.statut });
    }

    // Filtre par ville
    if (filters?.ville) {
      queryBuilder.andWhere('correspondant.ville ILIKE :ville', { ville: `%${filters.ville}%` });
    }

    // Filtre par pays
    if (filters?.pays) {
      queryBuilder.andWhere('correspondant.pays ILIKE :pays', { pays: `%${filters.pays}%` });
    }

    // Filtre par compétence
    if (filters?.competence) {
      switch (filters.competence) {
        case 'maritime':
          queryBuilder.andWhere('correspondant.competence_maritime = :value', { value: true });
          break;
        case 'routier':
          queryBuilder.andWhere('correspondant.competence_routier = :value', { value: true });
          break;
        case 'aerien':
          queryBuilder.andWhere('correspondant.competence_aerien = :value', { value: true });
          break;
      }
    }

    // Ordre et pagination
    queryBuilder
      .orderBy('correspondant.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<Correspondant> {
    const correspondant = await this.correspondantsRepository.findOne({ where: { id } });
    if (!correspondant) {
      throw new NotFoundException(`Correspondant avec l'ID ${id} non trouvé`);
    }
    return correspondant;
  }

  async findByCode(code: string): Promise<Correspondant> {
    const correspondant = await this.correspondantsRepository.findOne({ where: { code } });
    if (!correspondant) {
      throw new NotFoundException(`Correspondant avec le code ${code} non trouvé`);
    }
    return correspondant;
  }

  async update(id: number, updateCorrespondantDto: UpdateCorrespondantDto): Promise<Correspondant> {
    const correspondant = await this.findOne(id);

    // Ne pas permettre la modification du code
    if (updateCorrespondantDto.code && updateCorrespondantDto.code !== correspondant.code) {
      throw new BadRequestException('Le code ne peut pas être modifié');
    }

    Object.assign(correspondant, updateCorrespondantDto);

    try {
      return await this.correspondantsRepository.save(correspondant);
    } catch (error) {
      throw new BadRequestException('Erreur lors de la mise à jour du correspondant');
    }
  }

  async remove(id: number): Promise<void> {
    const correspondant = await this.findOne(id);

    // Supprimer le logo s'il existe
    if (correspondant.logo) {
      const logoPath = path.join(process.cwd(), correspondant.logo);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    await this.correspondantsRepository.remove(correspondant);
  }

  async updateStatut(id: number, statut: 'actif' | 'inactif'): Promise<Correspondant> {
    const correspondant = await this.findOne(id);
    correspondant.statut = statut;
    return await this.correspondantsRepository.save(correspondant);
  }

  async uploadLogo(id: number, logoPath: string): Promise<Correspondant> {
    const correspondant = await this.findOne(id);

    // Supprimer l'ancien logo s'il existe
    if (correspondant.logo) {
      const oldLogoPath = path.join(process.cwd(), correspondant.logo);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    correspondant.logo = logoPath;
    return await this.correspondantsRepository.save(correspondant);
  }

  async removeLogo(id: number): Promise<Correspondant> {
    const correspondant = await this.findOne(id);

    if (correspondant.logo) {
      const logoPath = path.join(process.cwd(), correspondant.logo);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
      correspondant.logo = null;
    }

    return await this.correspondantsRepository.save(correspondant);
  }

  async getStatistiques(): Promise<any> {
    const total = await this.correspondantsRepository.count();
    const actifs = await this.correspondantsRepository.count({ where: { statut: 'actif' } });
    const inactifs = await this.correspondantsRepository.count({ where: { statut: 'inactif' } });
    
    const locaux = await this.correspondantsRepository.count({ where: { nature: 'LOCAL' } });
    const etrangers = await this.correspondantsRepository.count({ where: { nature: 'ETRANGER' } });

    const maritime = await this.correspondantsRepository.count({ where: { competenceMaritime: true } });
    const routier = await this.correspondantsRepository.count({ where: { competenceRoutier: true } });
    const aerien = await this.correspondantsRepository.count({ where: { competenceAerien: true } });

    return {
      total,
      actifs,
      inactifs,
      parNature: {
        locaux,
        etrangers,
      },
      parCompetence: {
        maritime,
        routier,
        aerien,
      },
    };
  }
}
