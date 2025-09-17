import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectifCom } from '../entities/objectif-com.entity';
import { Personnel } from '../entities/personnel.entity';
import {
  CreateObjectifComDto,
  UpdateObjectifComDto,
} from '../dto/objectif-com.dto';

@Injectable()
export class ObjectifComService {
  constructor(
    @InjectRepository(ObjectifCom)
    private objectifComRepository: Repository<ObjectifCom>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
  ) {}

  async create(
    createObjectifComDto: CreateObjectifComDto,
  ): Promise<ObjectifCom> {
    const personnel = await this.personnelRepository.findOne({
      where: { id: createObjectifComDto.personnelId },
    });

    if (!personnel) {
      throw new NotFoundException(
        `Personnel avec l'ID ${createObjectifComDto.personnelId} non trouvé`,
      );
    }

    // Vérifier que le personnel est bien un commercial
    if (personnel.role !== 'COMMERCIAL') {
      throw new NotFoundException(
        `Le personnel doit avoir le rôle COMMERCIAL pour avoir des objectifs`,
      );
    }

    const objectifCom = this.objectifComRepository.create({
      ...createObjectifComDto,
      personnel,
    });

    return this.objectifComRepository.save(objectifCom);
  }

  async findAll(): Promise<ObjectifCom[]> {
    return this.objectifComRepository.find({
      relations: ['personnel'],
      order: { date_debut: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ObjectifCom> {
    const objectifCom = await this.objectifComRepository.findOne({
      where: { id },
      relations: ['personnel'],
    });

    if (!objectifCom) {
      throw new NotFoundException(
        `Objectif commercial avec l'ID ${id} non trouvé`,
      );
    }

    return objectifCom;
  }

  async findByPersonnel(personnelId: number): Promise<ObjectifCom[]> {
    return this.objectifComRepository.find({
      where: { personnel: { id: personnelId } },
      relations: ['personnel'],
      order: { date_debut: 'DESC' },
    });
  }

  async findActiveCommercialObjectives(): Promise<ObjectifCom[]> {
    const currentDate = new Date();
    return this.objectifComRepository
      .createQueryBuilder('objectif')
      .leftJoinAndSelect('objectif.personnel', 'personnel')
      .where('personnel.role = :role', { role: 'COMMERCIAL' })
      .andWhere('objectif.date_debut <= :currentDate', { currentDate })
      .andWhere('objectif.date_fin >= :currentDate', { currentDate })
      .orderBy('objectif.date_debut', 'DESC')
      .getMany();
  }

  async update(
    id: number,
    updateObjectifComDto: UpdateObjectifComDto,
  ): Promise<ObjectifCom> {
    const objectifCom = await this.findOne(id);

    if (
      updateObjectifComDto.personnelId &&
      updateObjectifComDto.personnelId !== objectifCom.personnel.id
    ) {
      const personnel = await this.personnelRepository.findOne({
        where: { id: updateObjectifComDto.personnelId },
      });

      if (!personnel) {
        throw new NotFoundException(
          `Personnel avec l'ID ${updateObjectifComDto.personnelId} non trouvé`,
        );
      }

      if (personnel.role !== 'COMMERCIAL') {
        throw new NotFoundException(
          `Le personnel doit avoir le rôle COMMERCIAL pour avoir des objectifs`,
        );
      }

      objectifCom.personnel = personnel;
    }

    Object.assign(objectifCom, updateObjectifComDto);
    return this.objectifComRepository.save(objectifCom);
  }

  async remove(id: number): Promise<void> {
    const objectifCom = await this.findOne(id);
    await this.objectifComRepository.remove(objectifCom);
  }
}
