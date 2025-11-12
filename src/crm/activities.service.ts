import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { ActivityParticipant } from './entities/activity-participant.entity';
import { Personnel } from '../entities/personnel.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { FilterActivityDto } from './dto/filter-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    @InjectRepository(ActivityParticipant)
    private participantRepository: Repository<ActivityParticipant>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
  ) {}

  async create(createActivityDto: CreateActivityDto): Promise<Activity> {
    const { participants, ...activityData } = createActivityDto;

    // Créer l'activité
    const activity = this.activityRepository.create(activityData);
    const savedActivity = await this.activityRepository.save(activity);

    // Créer les participants si fournis
    if (participants && participants.length > 0) {
      const participantEntities = participants.map((p) =>
        this.participantRepository.create({
          ...p,
          activityId: savedActivity.id,
        }),
      );
      await this.participantRepository.save(participantEntities);
    }

    return this.findOne(savedActivity.id);
  }

  async findAll(filters?: FilterActivityDto): Promise<Activity[]> {
    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.assignedToPersonnel', 'assignedToPersonnel')
      .leftJoinAndSelect('activity.creator', 'creator')
      .leftJoinAndSelect('activity.lead', 'lead')
      .leftJoinAndSelect('activity.opportunity', 'opportunity')
      .leftJoinAndSelect('activity.quote', 'quote') // ✅ Charger la relation quote
      .leftJoinAndSelect('activity.client', 'client')
      .leftJoinAndSelect('activity.participants', 'participants')
      .leftJoinAndSelect('participants.personnel', 'participantPersonnel');

    if (filters) {
      // Filtres de type
      if (filters.type) {
        queryBuilder.andWhere('activity.type = :type', { type: filters.type });
      }

      if (filters.status) {
        queryBuilder.andWhere('activity.status = :status', {
          status: filters.status,
        });
      }

      if (filters.priority) {
        queryBuilder.andWhere('activity.priority = :priority', {
          priority: filters.priority,
        });
      }

      // Filtres de relations
      if (filters.leadId) {
        queryBuilder.andWhere('activity.leadId = :leadId', {
          leadId: filters.leadId,
        });
      }

      if (filters.opportunityId) {
        queryBuilder.andWhere('activity.opportunityId = :opportunityId', {
          opportunityId: filters.opportunityId,
        });
      }

      if (filters.quoteId) {
        queryBuilder.andWhere('activity.quoteId = :quoteId', {
          quoteId: filters.quoteId,
        });
      }

      if (filters.clientId) {
        queryBuilder.andWhere('activity.clientId = :clientId', {
          clientId: filters.clientId,
        });
      }

      // ✅ NOUVEAU: Filtre par type de liaison
      if (filters.linkedTo) {
        switch (filters.linkedTo) {
          case 'prospect':
            queryBuilder.andWhere('activity.leadId IS NOT NULL');
            break;
          case 'opportunity':
            queryBuilder.andWhere('activity.opportunityId IS NOT NULL');
            break;
          case 'client':
            queryBuilder.andWhere('activity.clientId IS NOT NULL');
            break;
          case 'quote':
            queryBuilder.andWhere('activity.quoteId IS NOT NULL');
            break;
        }
      }

      // Filtres de personnel
      if (filters.assignedTo) {
        queryBuilder.andWhere('activity.assignedTo = :assignedTo', {
          assignedTo: filters.assignedTo,
        });
      }

      if (filters.createdBy) {
        queryBuilder.andWhere('activity.createdBy = :createdBy', {
          createdBy: filters.createdBy,
        });
      }

      // Filtres de dates
      if (filters.scheduledFrom && filters.scheduledTo) {
        queryBuilder.andWhere(
          'activity.scheduledAt BETWEEN :scheduledFrom AND :scheduledTo',
          {
            scheduledFrom: filters.scheduledFrom,
            scheduledTo: filters.scheduledTo,
          },
        );
      } else if (filters.scheduledFrom) {
        queryBuilder.andWhere('activity.scheduledAt >= :scheduledFrom', {
          scheduledFrom: filters.scheduledFrom,
        });
      } else if (filters.scheduledTo) {
        queryBuilder.andWhere('activity.scheduledAt <= :scheduledTo', {
          scheduledTo: filters.scheduledTo,
        });
      }

      if (filters.dueFrom && filters.dueTo) {
        queryBuilder.andWhere('activity.dueDate BETWEEN :dueFrom AND :dueTo', {
          dueFrom: filters.dueFrom,
          dueTo: filters.dueTo,
        });
      } else if (filters.dueFrom) {
        queryBuilder.andWhere('activity.dueDate >= :dueFrom', {
          dueFrom: filters.dueFrom,
        });
      } else if (filters.dueTo) {
        queryBuilder.andWhere('activity.dueDate <= :dueTo', {
          dueTo: filters.dueTo,
        });
      }

      // Recherche textuelle
      if (filters.search) {
        queryBuilder.andWhere(
          '(activity.title ILIKE :search OR activity.description ILIKE :search)',
          { search: `%${filters.search}%` },
        );
      }

      // Filtres de tags
      if (filters.tags && filters.tags.length > 0) {
        queryBuilder.andWhere('activity.tags && :tags', {
          tags: filters.tags,
        });
      }
    }

    // Tri par date de planification décroissante
    queryBuilder.orderBy('activity.scheduledAt', 'DESC');

    const activities = await queryBuilder.getMany();

    // Charger les commerciaux assignés pour chaque activité
    await Promise.all(
      activities.map((activity) => this.loadAssignedCommercials(activity)),
    );

    return activities;
  }

  async findOne(id: number): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: [
        'assignedToPersonnel',
        'creator',
        'lead',
        'opportunity',
        'quote', // ✅ Charger la relation quote
        'client',
        'participants',
        'participants.personnel',
      ],
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    // Charger les commerciaux assignés si assignedToIds existe
    await this.loadAssignedCommercials(activity);

    return activity;
  }

  /**
   * Charge les commerciaux assignés à partir des IDs
   */
  private async loadAssignedCommercials(activity: Activity): Promise<void> {
    if (activity.assignedToIds && activity.assignedToIds.length > 0) {
      activity.assignedCommercials = await this.personnelRepository.find({
        where: { id: In(activity.assignedToIds) },
        select: ['id', 'prenom', 'nom', 'email', 'role'],
      });
    } else {
      activity.assignedCommercials = [];
    }
  }

  async update(
    id: number,
    updateActivityDto: UpdateActivityDto,
  ): Promise<Activity> {
    // Vérifier que l'activité existe
    const activity = await this.activityRepository.findOne({ where: { id } });
    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }
    
    console.log('📝 [SERVICE_UPDATE] Activité AVANT mise à jour:', {
      id: activity.id,
      assignedTo: activity.assignedTo,
      title: activity.title
    });

    const { participants, ...activityData } = updateActivityDto as any;
    
    console.log('📝 [SERVICE_UPDATE] Données à appliquer:', activityData);

    // Utiliser update() de TypeORM au lieu de save() pour éviter les conflits avec les relations
    await this.activityRepository.update(id, activityData);
    
    console.log('✅ [SERVICE_UPDATE] Mise à jour effectuée avec update()');

    // Mettre à jour les participants si fournis
    if (participants !== undefined) {
      console.log('📝 [SERVICE_UPDATE] Mise à jour des participants...');
      // Supprimer les anciens participants
      await this.participantRepository.delete({ activityId: id });

      // Créer les nouveaux participants
      if (participants.length > 0) {
        const participantEntities = participants.map((p: any) =>
          this.participantRepository.create({
            ...p,
            activityId: id,
          }),
        );
        await this.participantRepository.save(participantEntities);
      }
      console.log('✅ [SERVICE_UPDATE] Participants mis à jour');
    }

    // Recharger l'activité avec toutes les relations
    const updatedActivity = await this.findOne(id);
    
    console.log('📝 [SERVICE_UPDATE] Activité APRÈS rechargement:', {
      id: updatedActivity.id,
      assignedTo: updatedActivity.assignedTo,
      title: updatedActivity.title
    });

    return updatedActivity;
  }

  async remove(id: number): Promise<void> {
    const activity = await this.findOne(id);
    await this.activityRepository.remove(activity);
  }

  // Méthodes spécifiques

  async getUpcomingActivities(userId: number): Promise<Activity[]> {
    const now = new Date();
    return this.activityRepository.find({
      where: {
        assignedTo: userId,
        scheduledAt: Between(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)), // 7 jours
      },
      relations: [
        'assignedToPersonnel',
        'lead',
        'opportunity',
        // 'quote', // Décommenter quand Quote sera implémenté
        'client',
      ],
      order: {
        scheduledAt: 'ASC',
      },
    });
  }

  async getOverdueActivities(userId: number): Promise<Activity[]> {
    const now = new Date();
    return this.activityRepository.find({
      where: {
        assignedTo: userId,
        dueDate: Between(new Date(0), now),
        status: In(['scheduled', 'in_progress']),
      },
      relations: [
        'assignedToPersonnel',
        'lead',
        'opportunity',
        // 'quote', // Décommenter quand Quote sera implémenté
        'client',
      ],
      order: {
        dueDate: 'ASC',
      },
    });
  }

  async markAsCompleted(id: number, outcome?: string): Promise<Activity> {
    const activity = await this.findOne(id);
    activity.status = 'completed' as any;
    activity.completedAt = new Date();
    if (outcome) {
      activity.outcome = outcome;
    }
    return this.activityRepository.save(activity);
  }

  async getActivitiesStats(userId?: number) {
    const queryBuilder = this.activityRepository.createQueryBuilder('activity');

    if (userId) {
      queryBuilder.where('activity.assignedTo = :userId', { userId });
    }

    const total = await queryBuilder.getCount();

    const scheduled = await queryBuilder
      .clone()
      .andWhere("activity.status = 'scheduled'")
      .getCount();

    const inProgress = await queryBuilder
      .clone()
      .andWhere("activity.status = 'in_progress'")
      .getCount();

    const completed = await queryBuilder
      .clone()
      .andWhere("activity.status = 'completed'")
      .getCount();

    const now = new Date();
    const overdue = await queryBuilder
      .clone()
      .andWhere("activity.status IN ('scheduled', 'in_progress')")
      .andWhere('activity.dueDate < :now', { now })
      .getCount();

    return {
      total,
      scheduled,
      inProgress,
      completed,
      overdue,
    };
  }

  async getCommercials(): Promise<any[]> {
    return this.personnelRepository.find({
      where: { role: 'commercial' }, // ✅ Ne retourner que les commerciaux
      select: ['id', 'prenom', 'nom', 'email', 'role', 'nom_utilisateur'],
      order: { prenom: 'ASC' }
    });
  }

  /**
   * Trouve un personnel par son UUID Keycloak
   */
  async findPersonnelByKeycloakId(keycloakId: string): Promise<Personnel | null> {
    try {
      const personnel = await this.personnelRepository.findOne({
        where: { keycloak_id: keycloakId }
      });
      return personnel || null;
    } catch (error) {
      console.error('Erreur lors de la recherche du personnel par Keycloak ID:', error);
      return null;
    }
  }
}
