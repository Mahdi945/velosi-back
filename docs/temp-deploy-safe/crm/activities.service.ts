import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Activity } from './entities/activity.entity';
import { ActivityParticipant } from './entities/activity-participant.entity';
import { Personnel } from '../entities/personnel.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { FilterActivityDto } from './dto/filter-activity.dto';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable()
export class ActivitiesService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * ✏️ Créer une nouvelle activité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async create(databaseName: string, organisationId: number, createActivityDto: CreateActivityDto): Promise<Activity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const { participants, ...activityData } = createActivityDto;

    // Créer l'activité
    const result = await connection.query(
      `INSERT INTO crm_activities (
        type, title, description, status, priority,
        lead_id, opportunity_id, quote_id, client_id,
        scheduled_at, due_date, location, assigned_to, assigned_to_ids,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *`,
      [
        activityData.type,
        activityData.title,
        activityData.description,
        activityData.status || 'scheduled',
        activityData.priority || 'medium',
        activityData.leadId,
        activityData.opportunityId,
        activityData.quoteId,
        activityData.clientId,
        activityData.scheduledAt,
        activityData.dueDate,
        activityData.location,
        activityData.assignedTo,
        activityData.assignedToIds || [],
        activityData.createdBy
      ]
    );

    const savedActivity = result[0];

    // Créer les participants si fournis
    if (participants && participants.length > 0) {
      for (const participant of participants) {
        await connection.query(
          `INSERT INTO crm_activity_participants (activity_id, personnel_id)
           VALUES ($1, $2)`,
          [savedActivity.id, participant.personnelId]
        );
      }
    }

    return this.findOne(databaseName, organisationId, savedActivity.id);
  }

  /**
   * 🔍 Récupérer toutes les activités avec filtres
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findAll(databaseName: string, organisationId: number, filters?: FilterActivityDto): Promise<Activity[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    let query = `
      SELECT a.*, 
             p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
             creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
             l.company as lead_company,
             o.title as opportunity_title,
             c.nom as client_name
      FROM crm_activities a
      LEFT JOIN personnel p ON a.assigned_to = p.id
      LEFT JOIN personnel creator ON a.created_by = creator.id
      LEFT JOIN crm_leads l ON a.lead_id = l.id
      LEFT JOIN crm_opportunities o ON a.opportunity_id = o.id
      LEFT JOIN client c ON a.client_id = c.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      if (filters.type) {
        query += ` AND a.type = $${paramIndex++}`;
        params.push(filters.type);
      }
      if (filters.status) {
        query += ` AND a.status = $${paramIndex++}`;
        params.push(filters.status);
      }
      if (filters.priority) {
        query += ` AND a.priority = $${paramIndex++}`;
        params.push(filters.priority);
      }
      if (filters.leadId) {
        query += ` AND a.lead_id = $${paramIndex++}`;
        params.push(filters.leadId);
      }
      if (filters.opportunityId) {
        query += ` AND a.opportunity_id = $${paramIndex++}`;
        params.push(filters.opportunityId);
      }
      if (filters.quoteId) {
        query += ` AND a.quote_id = $${paramIndex++}`;
        params.push(filters.quoteId);
      }
      if (filters.clientId) {
        query += ` AND a.client_id = $${paramIndex++}`;
        params.push(filters.clientId);
      }
      if (filters.assignedToIds && filters.assignedToIds.length > 0) {
        const conditions = filters.assignedToIds.map((id, idx) => `$${paramIndex + idx}`).join(',');
        query += ` AND (${filters.assignedToIds.map((_, idx) => `$${paramIndex + idx} = ANY(a.assigned_to_ids)`).join(' OR ')} OR a.assigned_to_ids IS NULL OR a.assigned_to_ids = '{}')`;
        params.push(...filters.assignedToIds);
        paramIndex += filters.assignedToIds.length;
      } else if (filters.assignedTo) {
        query += ` AND (a.assigned_to = $${paramIndex} OR a.assigned_to IS NULL)`;
        params.push(filters.assignedTo);
        paramIndex++;
      }
      if (filters.search) {
        query += ` AND (a.title ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }
    }

    query += ` ORDER BY a.scheduled_at DESC`;

    const activities = await connection.query(query, params);
    return activities;
  }

  /**
   * 🔍 Récupérer une activité par ID
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findOne(databaseName: string, organisationId: number, id: number): Promise<Activity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const activities = await connection.query(
      `SELECT a.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              l.company as lead_company,
              o.title as opportunity_title,
              c.nom as client_name
       FROM crm_activities a
       LEFT JOIN personnel p ON a.assigned_to = p.id
       LEFT JOIN personnel creator ON a.created_by = creator.id
       LEFT JOIN crm_leads l ON a.lead_id = l.id
       LEFT JOIN crm_opportunities o ON a.opportunity_id = o.id
       LEFT JOIN client c ON a.client_id = c.id
       WHERE a.id = $1`,
      [id]
    );

    if (!activities || activities.length === 0) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return activities[0];
  }

  /**
   * 🔄 Mettre à jour une activité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async update(
    databaseName: string,
    organisationId: number,
    id: number,
    updateActivityDto: UpdateActivityDto,
  ): Promise<Activity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    console.log('📝 [SERVICE_UPDATE] Mise à jour activité #', id);

    const { participants, ...activityData } = updateActivityDto as any;
    
    // Construire la requête UPDATE dynamiquement
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (activityData.type !== undefined) { fields.push(`type = $${paramIndex++}`); values.push(activityData.type); }
    if (activityData.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(activityData.title); }
    if (activityData.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(activityData.description); }
    if (activityData.status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(activityData.status); }
    if (activityData.priority !== undefined) { fields.push(`priority = $${paramIndex++}`); values.push(activityData.priority); }
    if (activityData.scheduledAt !== undefined) { fields.push(`scheduled_at = $${paramIndex++}`); values.push(activityData.scheduledAt); }
    if (activityData.dueDate !== undefined) { fields.push(`due_date = $${paramIndex++}`); values.push(activityData.dueDate); }
    if (activityData.assignedTo !== undefined) { fields.push(`assigned_to = $${paramIndex++}`); values.push(activityData.assignedTo); }
    if (activityData.assignedToIds !== undefined) { fields.push(`assigned_to_ids = $${paramIndex++}`); values.push(activityData.assignedToIds); }
    if (activityData.outcome !== undefined) { fields.push(`outcome = $${paramIndex++}`); values.push(activityData.outcome); }
    
    fields.push(`updated_at = NOW()`);
    values.push(id);
    
    if (fields.length > 1) { // Plus que juste updated_at
      await connection.query(
        `UPDATE crm_activities SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
    }

    // Mettre à jour les participants si fournis
    if (participants !== undefined) {
      await connection.query(`DELETE FROM crm_activity_participants WHERE activity_id = $1`, [id]);
      
      if (participants.length > 0) {
        for (const participant of participants) {
          await connection.query(
            `INSERT INTO crm_activity_participants (activity_id, personnel_id)
             VALUES ($1, $2)`,
            [id, participant.personnelId]
          );
        }
      }
    }

    return this.findOne(databaseName, organisationId, id);
  }

  /**
   * 🗑️ Supprimer une activité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async remove(databaseName: string, organisationId: number, id: number): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `DELETE FROM crm_activities WHERE id = $1`,
      [id]
    );

    if (result[1] === 0) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }
  }

  // Méthodes spécifiques

  /**
   * 📅 Récupérer les activités à venir (7 prochains jours)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getUpcomingActivities(databaseName: string, organisationId: number, userId: number): Promise<Activity[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return connection.query(
      `SELECT a.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              l.company as lead_company,
              o.title as opportunity_title,
              c.nom as client_name
       FROM crm_activities a
       LEFT JOIN personnel p ON a.assigned_to = p.id
       LEFT JOIN crm_leads l ON a.lead_id = l.id
       LEFT JOIN crm_opportunities o ON a.opportunity_id = o.id
       LEFT JOIN client c ON a.client_id = c.id
       WHERE a.assigned_to = $1
         AND a.scheduled_at BETWEEN $2 AND $3
       ORDER BY a.scheduled_at ASC`,
      [userId, now, nextWeek]
    );
  }

  /**
   * ⏰ Récupérer les activités en retard
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getOverdueActivities(databaseName: string, organisationId: number, userId: number): Promise<Activity[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const now = new Date();
    
    return connection.query(
      `SELECT a.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              l.company as lead_company,
              o.title as opportunity_title,
              c.nom as client_name
       FROM crm_activities a
       LEFT JOIN personnel p ON a.assigned_to = p.id
       LEFT JOIN crm_leads l ON a.lead_id = l.id
       LEFT JOIN crm_opportunities o ON a.opportunity_id = o.id
       LEFT JOIN client c ON a.client_id = c.id
       WHERE a.assigned_to = $1
         AND a.due_date < $2
         AND a.status IN ('scheduled', 'in_progress')
       ORDER BY a.due_date ASC`,
      [userId, now]
    );
  }

  /**
   * ✅ Marquer une activité comme terminée
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async markAsCompleted(databaseName: string, organisationId: number, id: number, outcome?: string): Promise<Activity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    await connection.query(
      `UPDATE crm_activities 
       SET status = 'completed', 
           completed_at = NOW(),
           outcome = $1
       WHERE id = $2`,
      [outcome, id]
    );
    
    return this.findOne(databaseName, organisationId, id);
  }

  /**
   * 📊 Statistiques des activités
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getActivitiesStats(databaseName: string, organisationId: number, userId: number) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
         COUNT(*) FILTER (WHERE scheduled_at > NOW()) as upcoming,
         COUNT(*) FILTER (WHERE scheduled_at < NOW() AND status != 'completed') as overdue
       FROM crm_activities
       WHERE assigned_to = $1`,
      [userId]
    );
    
    return results[0];
  }

  /**
   *  Trouve un personnel par son UUID Keycloak
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findPersonnelByKeycloakId(databaseName: string, organisationId: number, keycloakId: string): Promise<Personnel | null> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      const result = await connection.query(
        `SELECT * FROM personnel 
         WHERE organisation_id = $1 AND keycloak_id = $2`,
        [organisationId, keycloakId]
      );
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erreur lors de la recherche du personnel par Keycloak ID:', error);
      return null;
    }
  }

  /**
   * � Trouver l'organisation d'une activité (pour fallback quand JWT incomplet)
   * ✅ MULTI-TENANT: Cherche dans toutes les organisations
   */
  async findActivityOrganisation(activityId: number, username: string): Promise<{ databaseName: string; organisationId: number } | null> {
    try {
      // Récupérer la connexion principale pour lister les organisations
      const mainConnection = await this.databaseConnectionService.getOrganisationConnection('velosi');
      
      // Récupérer toutes les organisations actives
      const organisations = await mainConnection.query(
        `SELECT id, database_name FROM organisation WHERE active = true ORDER BY id`
      );

      console.log(`🔍 [FIND_ACTIVITY_ORG] Recherche activité ${activityId} pour user ${username} dans ${organisations.length} organisations`);

      // Chercher l'activité dans chaque organisation
      for (const org of organisations) {
        try {
          const orgConnection = await this.databaseConnectionService.getOrganisationConnection(org.database_name);
          const activities = await orgConnection.query(
            'SELECT id FROM crm_activities WHERE id = $1 LIMIT 1',
            [activityId]
          );
          
          if (activities && activities.length > 0) {
            console.log(`✅ [ACTIVITY_ORG_FOUND] Activité ${activityId} trouvée dans ${org.database_name} (org: ${org.id})`);
            return { 
              databaseName: org.database_name, 
              organisationId: org.id 
            };
          }
        } catch (error) {
          console.warn(`⚠️ Impossible de chercher dans ${org.database_name}:`, error.message);
        }
      }
      
      console.warn(`⚠️ [ACTIVITY_ORG_NOT_FOUND] Activité ${activityId} non trouvée pour utilisateur ${username}`);
      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche de l\'organisation:', error);
      return null;
    }
  }

  /**
   * �👥 Liste des commerciaux (personnel)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getCommercials(databaseName: string, organisationId: number): Promise<any[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    return connection.query(
      `SELECT id, prenom, nom, email, role, nom_utilisateur
       FROM personnel
       WHERE organisation_id = $1
       ORDER BY prenom ASC`,
      [organisationId]
    );
  }
}
