import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { ActivityParticipant } from './entities/activity-participant.entity';
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
      // .leftJoinAndSelect('activity.quote', 'quote') // Décommenter quand Quote sera implémenté
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

    return queryBuilder.getMany();
  }

  async findOne(id: number): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: [
        'assignedToPersonnel',
        'creator',
        'lead',
        'opportunity',
        // 'quote', // Décommenter quand Quote sera implémenté
        'client',
        'participants',
        'participants.personnel',
      ],
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return activity;
  }

  async update(
    id: number,
    updateActivityDto: UpdateActivityDto,
  ): Promise<Activity> {
    const activity = await this.findOne(id);

    const { participants, ...activityData } = updateActivityDto as any;

    // Mettre à jour l'activité
    Object.assign(activity, activityData);
    await this.activityRepository.save(activity);

    // Mettre à jour les participants si fournis
    if (participants !== undefined) {
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
    }

    return this.findOne(id);
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
}
