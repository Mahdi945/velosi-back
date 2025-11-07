import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeFraisAnnexe } from '../entities/type-frais-annexe.entity';
import { CreateTypeFraisAnnexeDto, UpdateTypeFraisAnnexeDto } from '../dto/type-frais-annexe.dto';

@Injectable()
export class TypeFraisAnnexeService {
  constructor(
    @InjectRepository(TypeFraisAnnexe)
    private readonly typeFraisAnnexeRepository: Repository<TypeFraisAnnexe>,
  ) {}

  /**
   * Récupérer tous les types de frais annexes actifs
   */
  async findAllActive(): Promise<TypeFraisAnnexe[]> {
    return this.typeFraisAnnexeRepository.find({
      where: { isActive: true },
      order: { description: 'ASC' },
    });
  }

  /**
   * Récupérer tous les types (actifs et inactifs) - pour l'admin
   */
  async findAll(): Promise<TypeFraisAnnexe[]> {
    return this.typeFraisAnnexeRepository.find({
      order: { description: 'ASC' },
    });
  }

  /**
   * Récupérer un type par ID
   */
  async findOne(id: number): Promise<TypeFraisAnnexe> {
    const type = await this.typeFraisAnnexeRepository.findOne({ where: { id } });
    if (!type) {
      throw new NotFoundException(`Type de frais annexe avec l'ID ${id} introuvable`);
    }
    return type;
  }

  /**
   * Créer un nouveau type de frais annexe
   */
  async create(createDto: CreateTypeFraisAnnexeDto): Promise<TypeFraisAnnexe> {
    // Vérifier si la description existe déjà
    const existing = await this.typeFraisAnnexeRepository.findOne({
      where: { description: createDto.description },
    });

    if (existing) {
      throw new ConflictException(
        `Un type de frais annexe avec la description "${createDto.description}" existe déjà`
      );
    }

    const newType = this.typeFraisAnnexeRepository.create({
      description: createDto.description,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
    });

    return this.typeFraisAnnexeRepository.save(newType);
  }

  /**
   * Mettre à jour un type de frais annexe
   */
  async update(id: number, updateDto: UpdateTypeFraisAnnexeDto): Promise<TypeFraisAnnexe> {
    const type = await this.findOne(id);

    // Si on change la description, vérifier qu'elle n'existe pas déjà
    if (updateDto.description && updateDto.description !== type.description) {
      const existing = await this.typeFraisAnnexeRepository.findOne({
        where: { description: updateDto.description },
      });

      if (existing) {
        throw new ConflictException(
          `Un type de frais annexe avec la description "${updateDto.description}" existe déjà`
        );
      }
    }

    Object.assign(type, updateDto);
    return this.typeFraisAnnexeRepository.save(type);
  }

  /**
   * Désactiver un type (soft delete)
   */
  async deactivate(id: number): Promise<TypeFraisAnnexe> {
    const type = await this.findOne(id);
    type.isActive = false;
    return this.typeFraisAnnexeRepository.save(type);
  }

  /**
   * Activer un type
   */
  async activate(id: number): Promise<TypeFraisAnnexe> {
    const type = await this.findOne(id);
    type.isActive = true;
    return this.typeFraisAnnexeRepository.save(type);
  }

  /**
   * Supprimer définitivement un type (hard delete)
   */
  async remove(id: number): Promise<void> {
    const type = await this.findOne(id);
    await this.typeFraisAnnexeRepository.remove(type);
  }
}
