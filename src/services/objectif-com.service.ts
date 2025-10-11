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
    console.log('=== SERVICE CREATE OBJECTIF ===');
    console.log('Données reçues pour création:', JSON.stringify(createObjectifComDto, null, 2));
    
    const personnel = await this.personnelRepository.findOne({
      where: { id: createObjectifComDto.id_personnel },
    });

    if (!personnel) {
      console.error('Personnel non trouvé avec ID:', createObjectifComDto.id_personnel);
      throw new NotFoundException(
        `Personnel avec l'ID ${createObjectifComDto.id_personnel} non trouvé`,
      );
    }

    console.log('Personnel trouvé pour création d\'objectif:', {
      id: personnel.id,
      nom: personnel.nom,
      prenom: personnel.prenom,
      role: personnel.role
    });

    try {
      // Nettoyer et valider les données avant création
      const cleanedData = {
        id_personnel: createObjectifComDto.id_personnel,
        titre: createObjectifComDto.titre || 'Objectif Commercial',
        description: createObjectifComDto.description || null,
        objectif_ca: createObjectifComDto.objectif_ca || null,
        objectif_clients: createObjectifComDto.objectif_clients || null,
        date_debut: createObjectifComDto.date_debut ? new Date(createObjectifComDto.date_debut) : new Date(),
        date_fin: createObjectifComDto.date_fin ? new Date(createObjectifComDto.date_fin) : null,
        statut: createObjectifComDto.statut || 'en_cours',
        progression: createObjectifComDto.progression || 0,
        is_active: createObjectifComDto.is_active !== undefined ? createObjectifComDto.is_active : true, // Par défaut actif
      };

      console.log('Données nettoyées pour création:', cleanedData);

      const objectifCom = this.objectifComRepository.create({
        ...cleanedData,
        personnel,
      });
      
      console.log('Entité objectif créée (avant save):', objectifCom);
      
      const savedObjectif = await this.objectifComRepository.save(objectifCom);
      
      console.log('Objectif sauvegardé avec succès:', savedObjectif);
      return savedObjectif;
      
    } catch (error) {
      console.error('Erreur lors de la création/sauvegarde de l\'objectif:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
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
    console.log('Recherche des objectifs pour le personnel ID:', personnelId);
    
    try {
      // Essayons avec les deux façons de récupérer
      const objectifs = await this.objectifComRepository.find({
        where: { id_personnel: personnelId },
        order: { created_at: 'DESC' },
      });
      
      console.log('Objectifs trouvés avec id_personnel:', objectifs);
      
      // Si pas de résultats avec id_personnel, essayons avec la relation
      if (objectifs.length === 0) {
        const objectifsViaRelation = await this.objectifComRepository.find({
          where: { personnel: { id: personnelId } },
          relations: ['personnel'],
          order: { created_at: 'DESC' },
        });
        console.log('Objectifs trouvés via relation:', objectifsViaRelation);
        return objectifsViaRelation;
      }
      
      return objectifs;
    } catch (error) {
      console.error('Erreur lors de la recherche des objectifs:', error);
      return [];
    }
  }

  // Nouvelle méthode pour récupérer seulement les objectifs actifs d'un personnel
  async findActiveByPersonnel(personnelId: number): Promise<ObjectifCom[]> {
    console.log('Recherche des objectifs ACTIFS pour le personnel ID:', personnelId);
    
    try {
      const objectifs = await this.objectifComRepository.find({
        where: { 
          id_personnel: personnelId,
          is_active: true 
        },
        order: { created_at: 'DESC' },
      });
      
      console.log('Objectifs actifs trouvés:', objectifs.length);
      return objectifs;
    } catch (error) {
      console.error('Erreur lors de la recherche des objectifs actifs:', error);
      return [];
    }
  }

  // Méthode pour activer/désactiver un objectif
  async toggleActiveStatus(id: number, isActive: boolean): Promise<ObjectifCom> {
    console.log(`=== TOGGLE OBJECTIF STATUS ===`);
    console.log(`Objectif ID: ${id}, Nouveau statut actif: ${isActive}`);
    
    const objectif = await this.findOne(id);
    objectif.is_active = isActive;
    objectif.updated_at = new Date();
    
    const updatedObjectif = await this.objectifComRepository.save(objectif);
    console.log('Statut mis à jour avec succès');
    
    return updatedObjectif;
  }

  async findActiveCommercialObjectives(): Promise<ObjectifCom[]> {
    const currentDate = new Date();
    return this.objectifComRepository
      .createQueryBuilder('objectif')
      .leftJoinAndSelect('objectif.personnel', 'personnel')
      .where('personnel.role = :role', { role: 'COMMERCIAL' })
      .andWhere('objectif.is_active = :isActive', { isActive: true })
      .andWhere('objectif.date_debut <= :currentDate', { currentDate })
      .andWhere('objectif.date_fin >= :currentDate', { currentDate })
      .orderBy('objectif.date_debut', 'DESC')
      .getMany();
  }

  async update(
    id: number,
    updateObjectifComDto: UpdateObjectifComDto,
  ): Promise<ObjectifCom> {
    console.log('=== SERVICE UPDATE OBJECTIF ===');
    console.log('Mise à jour de l\'objectif ID:', id, 'avec les données:', updateObjectifComDto);
    
    const objectifCom = await this.findOne(id);

    if (
      updateObjectifComDto.id_personnel &&
      updateObjectifComDto.id_personnel !== objectifCom.personnel.id
    ) {
      const personnel = await this.personnelRepository.findOne({
        where: { id: updateObjectifComDto.id_personnel },
      });

      if (!personnel) {
        throw new NotFoundException(
          `Personnel avec l'ID ${updateObjectifComDto.id_personnel} non trouvé`,
        );
      }

      // Suppression de la vérification du rôle car elle est gérée côté frontend
      objectifCom.personnel = personnel;
      objectifCom.id_personnel = updateObjectifComDto.id_personnel;
    }

    // Mise à jour des champs avec gestion des valeurs nulles/vides
    if (updateObjectifComDto.titre !== undefined) {
      objectifCom.titre = updateObjectifComDto.titre || 'Objectif Commercial';
    }
    if (updateObjectifComDto.description !== undefined) {
      objectifCom.description = updateObjectifComDto.description || null;
    }
    if (updateObjectifComDto.objectif_ca !== undefined) {
      objectifCom.objectif_ca = updateObjectifComDto.objectif_ca || null;
    }
    if (updateObjectifComDto.objectif_clients !== undefined) {
      objectifCom.objectif_clients = updateObjectifComDto.objectif_clients || null;
    }
    if (updateObjectifComDto.date_debut !== undefined) {
      objectifCom.date_debut = updateObjectifComDto.date_debut ? new Date(updateObjectifComDto.date_debut) : null;
    }
    if (updateObjectifComDto.date_fin !== undefined) {
      objectifCom.date_fin = updateObjectifComDto.date_fin ? new Date(updateObjectifComDto.date_fin) : null;
    }
    if (updateObjectifComDto.statut !== undefined) {
      objectifCom.statut = updateObjectifComDto.statut || 'en_cours';
    }
    if (updateObjectifComDto.progression !== undefined) {
      objectifCom.progression = updateObjectifComDto.progression || 0;
    }
    
    // Mise à jour du timestamp
    objectifCom.updated_at = new Date();
    
    console.log('Objectif avant sauvegarde:', objectifCom);
    
    try {
      const savedObjectif = await this.objectifComRepository.save(objectifCom);
      console.log('Objectif mis à jour avec succès:', savedObjectif);
      return savedObjectif;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'objectif:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  // Nouvelle méthode upsert pour créer ou mettre à jour
  async upsertByPersonnel(
    personnelId: number,
    objectifData: any,
  ): Promise<ObjectifCom> {
    console.log('=== SERVICE UPSERT OBJECTIF ===');
    console.log('Personnel ID:', personnelId);
    console.log('Données objectif reçues:', JSON.stringify(objectifData, null, 2));
    
    try {
      // Vérifier d'abord que le personnel existe
      const personnel = await this.personnelRepository.findOne({
        where: { id: personnelId },
      });

      if (!personnel) {
        console.error('Personnel non trouvé avec ID:', personnelId);
        throw new NotFoundException(
          `Personnel avec l'ID ${personnelId} non trouvé`,
        );
      }

      console.log('Personnel trouvé:', {
        id: personnel.id,
        nom: personnel.nom,
        prenom: personnel.prenom,
        role: personnel.role
      });

      // Vérifier si un objectif existe déjà pour ce personnel
      console.log('Recherche d\'objectifs existants...');
      const existingObjectifs = await this.findByPersonnel(personnelId);
      console.log('Objectifs existants trouvés:', existingObjectifs.length);
      
      if (existingObjectifs.length > 0) {
        // Mettre à jour l'objectif existant
        console.log('Objectif existant trouvé, mise à jour de l\'ID:', existingObjectifs[0].id);
        const updatedObjectif = await this.update(existingObjectifs[0].id, objectifData);
        console.log('Objectif mis à jour avec succès dans upsert:', updatedObjectif);
        return updatedObjectif;
      } else {
        // Créer un nouvel objectif
        console.log('Aucun objectif existant, création d\'un nouveau...');
        const createData = {
          ...objectifData,
          id_personnel: personnelId
        };
        console.log('Données pour création dans upsert:', JSON.stringify(createData, null, 2));
        const newObjectif = await this.create(createData);
        console.log('Nouvel objectif créé avec succès dans upsert:', newObjectif);
        return newObjectif;
      }
    } catch (error) {
      console.error('Erreur détaillée dans upsertByPersonnel:', {
        message: error.message,
        stack: error.stack,
        personnelId,
        objectifData
      });
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const objectifCom = await this.findOne(id);
    await this.objectifComRepository.remove(objectifCom);
  }
}
