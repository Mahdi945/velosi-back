import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OpportunityStage } from '../../entities/crm/opportunity.entity';
import { LeadStatus } from '../../entities/crm/lead.entity';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  OpportunityQueryDto,
  ConvertLeadToOpportunityDto,
} from '../../dto/crm/opportunity.dto';
import { DatabaseConnectionService } from '../../common/database-connection.service';

@Injectable()
export class OpportunityService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * 🔄 Convertir les noms de colonnes de camelCase vers snake_case pour SQL
   */
  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * 🔄 Transformer les noms de colonnes snake_case en camelCase
   */
  private transformOpportunityToCamelCase(opportunity: any): any {
    if (!opportunity) {
      return null;
    }
    
    if (!opportunity.id) {
      return null;
    }
    
    return {
      id: opportunity.id,
      uuid: opportunity.uuid,
      title: opportunity.title,
      description: opportunity.description,
      value: opportunity.value,
      probability: opportunity.probability,
      stage: opportunity.stage,
      expectedCloseDate: opportunity.expected_close_date,
      actualCloseDate: opportunity.actual_close_date,
      leadId: opportunity.lead_id,
      clientId: opportunity.client_id,
      assignedTo: opportunity.assigned_to,
      assignedToIds: opportunity.assigned_to_ids || [],
      assignedToName: opportunity.assigned_to_name,
      assignedToPrenom: opportunity.assigned_to_prenom,
      assignedCommercials: opportunity.assigned_commercials || [],
      source: opportunity.source,
      priority: opportunity.priority,
      tags: opportunity.tags,
      originAddress: opportunity.origin_address,
      destinationAddress: opportunity.destination_address,
      transportType: opportunity.transport_type,
      traffic: opportunity.traffic,
      serviceFrequency: opportunity.service_frequency,
      engineType: opportunity.engine_type,
      specialRequirements: opportunity.special_requirements,
      competitors: opportunity.competitors,
      wonDescription: opportunity.won_description,
      lostReason: opportunity.lost_reason,
      lostToCompetitor: opportunity.lost_to_competitor,
      createdAt: opportunity.created_at,
      updatedAt: opportunity.updated_at,
      createdById: opportunity.created_by,
      updatedById: opportunity.updated_by,
      // ✅ Ajouter les objets complets pour created_by et updated_by
      createdBy: opportunity.created_by_nom ? {
        id: opportunity.created_by,
        nom: opportunity.created_by_nom,
        prenom: opportunity.created_by_prenom,
        nomUtilisateur: opportunity.created_by_username
      } : null,
      updatedBy: opportunity.updated_by_nom ? {
        id: opportunity.updated_by,
        nom: opportunity.updated_by_nom,
        prenom: opportunity.updated_by_prenom,
        nomUtilisateur: opportunity.updated_by_username
      } : null,
      deletedAt: opportunity.deleted_at,
      isArchived: opportunity.is_archived,
      archivedReason: opportunity.archived_reason,
      archivedBy: opportunity.archived_by,
    };
  }

  /**
   * Créer une nouvelle opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async create(databaseName: string, organisationId: number, createOpportunityDto: CreateOpportunityDto, userId: number): Promise<any> {
    console.log('📝 Service create - Données:', createOpportunityDto);

    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Vérifier que le commercial assigné existe (ancien système)
    if (createOpportunityDto.assignedToId) {
      const personnel = await connection.query(
        `SELECT id FROM personnel WHERE id = $1`,
        [createOpportunityDto.assignedToId]
      );
      if (!personnel || personnel.length === 0) {
        throw new NotFoundException('Personnel assigné introuvable');
      }
    }

    // ✅ Vérifier que les commerciaux assignés existent (nouveau système)
    if (createOpportunityDto.assignedToIds && createOpportunityDto.assignedToIds.length > 0) {
      const commerciaux = await connection.query(
        `SELECT id FROM personnel WHERE id = ANY($1)`,
        [createOpportunityDto.assignedToIds]
      );
      if (commerciaux.length !== createOpportunityDto.assignedToIds.length) {
        throw new NotFoundException('Un ou plusieurs commerciaux assignés sont introuvables');
      }
    }

    // Vérifier si lead_id existe
    if (createOpportunityDto.leadId) {
      const lead = await connection.query(
        `SELECT id FROM crm_leads WHERE id = $1`,
        [createOpportunityDto.leadId]
      );
      if (!lead || lead.length === 0) {
        throw new NotFoundException('Prospect introuvable');
      }
    }

    // Vérifier si client_id existe
    if (createOpportunityDto.clientId) {
      const client = await connection.query(
        `SELECT id FROM client WHERE id = $1`,
        [createOpportunityDto.clientId]
      );
      if (!client || client.length === 0) {
        throw new NotFoundException('Client introuvable');
      }
    }

    console.log('🔍 AVANT SAUVEGARDE - Opportunité à sauvegarder:', JSON.stringify(createOpportunityDto, null, 2));

    // 🔧 Synchroniser la séquence avant l'insertion pour éviter les conflits de clés
    try {
      const maxIdResult = await connection.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM crm_opportunities`);
      const maxId = maxIdResult[0].max_id;
      if (maxId > 0) {
        await connection.query(`SELECT setval('crm_opportunities_id_seq', $1, true)`, [maxId]);
      }
    } catch (error) {
      console.warn('⚠️ Impossible de synchroniser la séquence:', error.message);
    }

    const result = await connection.query(
      `INSERT INTO crm_opportunities (
        title, description, value, probability, stage, expected_close_date,
        lead_id, client_id, assigned_to, assigned_to_ids, source, priority, tags,
        origin_address, destination_address, transport_type, traffic,
        service_frequency, engine_type, special_requirements, competitors,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *`,
      [
        createOpportunityDto.title,
        createOpportunityDto.description,
        createOpportunityDto.value || 0,
        createOpportunityDto.probability || 25,
        createOpportunityDto.stage || OpportunityStage.QUALIFICATION,
        createOpportunityDto.expectedCloseDate,
        createOpportunityDto.leadId,
        createOpportunityDto.clientId,
        createOpportunityDto.assignedToId,
        createOpportunityDto.assignedToIds || [],
        createOpportunityDto.source,
        createOpportunityDto.priority,
        createOpportunityDto.tags || [],
        createOpportunityDto.originAddress,
        createOpportunityDto.destinationAddress,
        createOpportunityDto.transportType,
        createOpportunityDto.traffic,
        createOpportunityDto.serviceFrequency,
        createOpportunityDto.engineType,
        createOpportunityDto.specialRequirements,
        createOpportunityDto.competitors || [],
        userId,
        userId,
      ]
    );

    console.log('💾 APRÈS SAUVEGARDE - Opportunité créée:', JSON.stringify(result[0], null, 2));

    return this.findOne(databaseName, organisationId, result[0].id);
  }

  /**
   * Obtenir toutes les opportunités NON-ARCHIVÉES avec filtres et pagination
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findAll(databaseName: string, organisationId: number, query: OpportunityQueryDto): Promise<{ data: any[]; total: number; totalPages: number }> {
    console.log('🔍 Service findAll - Query (NON-ARCHIVÉES):', query);

    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Construire la requête SQL avec les filtres
    let sqlQuery = `
      SELECT o.*, 
             p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
             (
               SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
               FROM unnest(o.assigned_to_ids) AS commercial_id
               LEFT JOIN personnel p2 ON p2.id = commercial_id
               WHERE p2.id IS NOT NULL
             ) as assigned_commercials,
             l.full_name as lead_name,
             c.nom as client_name,
             creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
             updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username
      FROM crm_opportunities o
      LEFT JOIN personnel p ON o.assigned_to = p.id
      LEFT JOIN crm_leads l ON o.lead_id = l.id
      LEFT JOIN client c ON o.client_id = c.id
      LEFT JOIN personnel creator ON o.created_by = creator.id
      LEFT JOIN personnel updater ON o.updated_by = updater.id
      WHERE o.is_archived = false
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Appliquer les filtres
    if (query.search) {
      sqlQuery += ` AND (o.title ILIKE $${paramIndex} OR o.description ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    if (query.stage) {
      sqlQuery += ` AND o.stage = $${paramIndex}`;
      params.push(query.stage);
      paramIndex++;
    }

    if (query.priority) {
      sqlQuery += ` AND o.priority = $${paramIndex}`;
      params.push(query.priority);
      paramIndex++;
    }

    if (query.assignedToIds && query.assignedToIds.length > 0) {
      sqlQuery += ` AND o.assigned_to_ids && $${paramIndex}`;
      params.push(query.assignedToIds);
      paramIndex++;
    } else if (query.assignedToId) {
      sqlQuery += ` AND (o.assigned_to = $${paramIndex} OR $${paramIndex} = ANY(o.assigned_to_ids))`;
      params.push(query.assignedToId);
      paramIndex++;
    }

    if (query.leadId) {
      sqlQuery += ` AND o.lead_id = $${paramIndex}`;
      params.push(query.leadId);
      paramIndex++;
    }

    if (query.source) {
      sqlQuery += ` AND o.source = $${paramIndex}`;
      params.push(query.source);
      paramIndex++;
    }

    if (query.transportType) {
      sqlQuery += ` AND o.transport_type = $${paramIndex}`;
      params.push(query.transportType);
      paramIndex++;
    }

    if (query.minValue) {
      sqlQuery += ` AND o.value >= $${paramIndex}`;
      params.push(query.minValue);
      paramIndex++;
    }

    if (query.maxValue) {
      sqlQuery += ` AND o.value <= $${paramIndex}`;
      params.push(query.maxValue);
      paramIndex++;
    }

    if (query.expectedCloseDateFrom) {
      sqlQuery += ` AND o.expected_close_date >= $${paramIndex}`;
      params.push(query.expectedCloseDateFrom);
      paramIndex++;
    }

    if (query.expectedCloseDateTo) {
      sqlQuery += ` AND o.expected_close_date <= $${paramIndex}`;
      params.push(query.expectedCloseDateTo);
      paramIndex++;
    }

    // Tri
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'DESC';
    // ✅ Convertir camelCase vers snake_case pour SQL
    const sortBySnake = this.camelToSnakeCase(sortBy);
    sqlQuery += ` ORDER BY o.${sortBySnake} ${sortOrder}`;

    // Pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 25, 100);
    const offset = (page - 1) * limit;

    // Compter le total
    const countQuery = sqlQuery.replace(/SELECT o\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await connection.query(countQuery, params);
    const total = parseInt(countResult[0].total);

    // Ajouter la pagination
    sqlQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const opportunities = await connection.query(sqlQuery, params);
    const totalPages = Math.ceil(total / limit);

    console.log('✅ Service findAll NON-ARCHIVÉES - Résultats:', opportunities.length, 'total:', total);

    return {
      data: opportunities.map(opp => this.transformOpportunityToCamelCase(opp)),
      total,
      totalPages,
    };
  }

  /**
   * 📋 Obtenir toutes les opportunités ARCHIVÉES avec filtres et pagination
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findAllArchived(databaseName: string, organisationId: number, query: OpportunityQueryDto): Promise<{ data: any[]; total: number; totalPages: number }> {
    console.log('🗄️ Service findAllArchived - Query (ARCHIVÉES):', query);

    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    let sqlQuery = `
      SELECT o.*, 
             p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
             (
               SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
               FROM unnest(o.assigned_to_ids) AS commercial_id
               LEFT JOIN personnel p2 ON p2.id = commercial_id
               WHERE p2.id IS NOT NULL
             ) as assigned_commercials,
             l.full_name as lead_name,
             c.nom as client_name,
             creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
             updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username
      FROM crm_opportunities o
      LEFT JOIN personnel p ON o.assigned_to = p.id
      LEFT JOIN crm_leads l ON o.lead_id = l.id
      LEFT JOIN client c ON o.client_id = c.id
      LEFT JOIN personnel creator ON o.created_by = creator.id
      LEFT JOIN personnel updater ON o.updated_by = updater.id
      WHERE o.is_archived = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Tri par date d'archivage
    const sortBy = query.sortBy || 'deleted_at';
    const sortOrder = query.sortOrder || 'DESC';
    // ✅ Convertir camelCase vers snake_case pour SQL
    const sortBySnake = this.camelToSnakeCase(sortBy);
    sqlQuery += ` ORDER BY o.${sortBySnake} ${sortOrder}`;

    // Pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 25, 100);
    const offset = (page - 1) * limit;

    // Compter le total
    const countQuery = sqlQuery.replace(/SELECT o\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await connection.query(countQuery, params);
    const total = parseInt(countResult[0].total);

    // Ajouter la pagination
    sqlQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const opportunities = await connection.query(sqlQuery, params);
    const totalPages = Math.ceil(total / limit);

    console.log('✅ Service findAllArchived ARCHIVÉES - Résultats:', opportunities.length, 'total:', total);

    return {
      data: opportunities.map(opp => this.transformOpportunityToCamelCase(opp)),
      total,
      totalPages,
    };
  }

  /**
   * Obtenir une opportunité par ID
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findOne(databaseName: string, organisationId: number, id: number): Promise<any> {
    console.log(`🔍 [OpportunityService.findOne] DB: ${databaseName}, Org: ${organisationId}, Opportunity ID: ${id}`);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    const opportunities = await connection.query(
      `SELECT o.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              (
                SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
                FROM unnest(o.assigned_to_ids) AS commercial_id
                LEFT JOIN personnel p2 ON p2.id = commercial_id
                WHERE p2.id IS NOT NULL
              ) as assigned_commercials,
              l.full_name as lead_name,
              c.nom as client_name,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username
       FROM crm_opportunities o
       LEFT JOIN personnel p ON o.assigned_to = p.id
       LEFT JOIN crm_leads l ON o.lead_id = l.id
       LEFT JOIN client c ON o.client_id = c.id
       LEFT JOIN personnel creator ON o.created_by = creator.id
       LEFT JOIN personnel updater ON o.updated_by = updater.id
       WHERE o.id = $1`,
      [id]
    );

    if (!opportunities || opportunities.length === 0) {
      throw new NotFoundException(`Opportunité avec l'ID ${id} introuvable`);
    }

    console.log(`📦 [OpportunityService.findOne] Opportunité trouvée:`, JSON.stringify(opportunities[0], null, 2));

    return this.transformOpportunityToCamelCase(opportunities[0]);
  }

  /**
   * Mettre à jour une opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async update(databaseName: string, organisationId: number, id: number, updateOpportunityDto: UpdateOpportunityDto, userId: number): Promise<any> {
    console.log('🔍 Service update - ID:', id, 'userId:', userId);
    console.log('📝 Service update - Données:', updateOpportunityDto);

    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Vérifier que l'opportunité existe
    const opportunity = await this.findOne(databaseName, organisationId, id);
    console.log('✅ Opportunité trouvée:', opportunity.id);

    // Vérifier si le commercial assigné existe (ancien système)
    if (updateOpportunityDto.assignedToId) {
      const personnel = await connection.query(
        `SELECT id FROM personnel WHERE id = $1`,
        [updateOpportunityDto.assignedToId]
      );
      if (!personnel || personnel.length === 0) {
        throw new NotFoundException('Personnel assigné introuvable');
      }
    }

    // ✅ Vérifier que les commerciaux assignés existent (nouveau système)
    if (updateOpportunityDto.assignedToIds && updateOpportunityDto.assignedToIds.length > 0) {
      const commerciaux = await connection.query(
        `SELECT id FROM personnel WHERE id = ANY($1)`,
        [updateOpportunityDto.assignedToIds]
      );
      if (commerciaux.length !== updateOpportunityDto.assignedToIds.length) {
        throw new NotFoundException('Un ou plusieurs commerciaux assignés sont introuvables');
      }
    }

    // Gestion des changements de stage
    let actualCloseDate: Date | null = null;
    if (updateOpportunityDto.stage) {
      if (updateOpportunityDto.stage === OpportunityStage.CLOSED_WON && !opportunity.actualCloseDate) {
        actualCloseDate = new Date();
      }
      if (updateOpportunityDto.stage === OpportunityStage.CLOSED_LOST && !opportunity.actualCloseDate) {
        actualCloseDate = new Date();
      }
    }

    // Construire la requête de mise à jour dynamiquement
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updateOpportunityDto.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updateOpportunityDto.title);
    }
    if (updateOpportunityDto.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updateOpportunityDto.description);
    }
    if (updateOpportunityDto.value !== undefined) {
      fields.push(`value = $${paramIndex++}`);
      values.push(updateOpportunityDto.value);
    }
    if (updateOpportunityDto.probability !== undefined) {
      fields.push(`probability = $${paramIndex++}`);
      values.push(updateOpportunityDto.probability);
    }
    if (updateOpportunityDto.stage !== undefined) {
      fields.push(`stage = $${paramIndex++}`);
      values.push(updateOpportunityDto.stage);
    }
    if (updateOpportunityDto.expectedCloseDate !== undefined) {
      fields.push(`expected_close_date = $${paramIndex++}`);
      values.push(updateOpportunityDto.expectedCloseDate);
    }
    if (actualCloseDate !== null) {
      fields.push(`actual_close_date = $${paramIndex++}`);
      values.push(actualCloseDate);
    }
    if (updateOpportunityDto.assignedToId !== undefined) {
      fields.push(`assigned_to = $${paramIndex++}`);
      values.push(updateOpportunityDto.assignedToId);
    }
    if (updateOpportunityDto.assignedToIds !== undefined) {
      fields.push(`assigned_to_ids = $${paramIndex++}`);
      values.push(updateOpportunityDto.assignedToIds);
    }
    if (updateOpportunityDto.source !== undefined) {
      fields.push(`source = $${paramIndex++}`);
      values.push(updateOpportunityDto.source);
    }
    if (updateOpportunityDto.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`);
      values.push(updateOpportunityDto.priority);
    }
    if (updateOpportunityDto.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(updateOpportunityDto.tags);
    }
    if (updateOpportunityDto.originAddress !== undefined) {
      fields.push(`origin_address = $${paramIndex++}`);
      values.push(updateOpportunityDto.originAddress);
    }
    if (updateOpportunityDto.destinationAddress !== undefined) {
      fields.push(`destination_address = $${paramIndex++}`);
      values.push(updateOpportunityDto.destinationAddress);
    }
    if (updateOpportunityDto.transportType !== undefined) {
      fields.push(`transport_type = $${paramIndex++}`);
      values.push(updateOpportunityDto.transportType);
    }
    if (updateOpportunityDto.traffic !== undefined) {
      fields.push(`traffic = $${paramIndex++}`);
      values.push(updateOpportunityDto.traffic);
    }
    if (updateOpportunityDto.serviceFrequency !== undefined) {
      fields.push(`service_frequency = $${paramIndex++}`);
      values.push(updateOpportunityDto.serviceFrequency);
    }
    if (updateOpportunityDto.engineType !== undefined) {
      fields.push(`engine_type = $${paramIndex++}`);
      values.push(updateOpportunityDto.engineType);
    }
    if (updateOpportunityDto.specialRequirements !== undefined) {
      fields.push(`special_requirements = $${paramIndex++}`);
      values.push(updateOpportunityDto.specialRequirements);
    }
    if (updateOpportunityDto.competitors !== undefined) {
      fields.push(`competitors = $${paramIndex++}`);
      values.push(updateOpportunityDto.competitors);
    }
    if (updateOpportunityDto.wonDescription !== undefined) {
      fields.push(`won_description = $${paramIndex++}`);
      values.push(updateOpportunityDto.wonDescription);
    }
    if (updateOpportunityDto.lostReason !== undefined) {
      fields.push(`lost_reason = $${paramIndex++}`);
      values.push(updateOpportunityDto.lostReason);
    }
    if (updateOpportunityDto.lostToCompetitor !== undefined) {
      fields.push(`lost_to_competitor = $${paramIndex++}`);
      values.push(updateOpportunityDto.lostToCompetitor);
    }

    // Ajouter updated_by et updated_at
    if (userId) {
      fields.push(`updated_by = $${paramIndex++}`);
      values.push(userId);
    }
    fields.push(`updated_at = NOW()`);

    if (fields.length === (userId ? 2 : 1)) {
      console.log('⚠️ Aucune donnée à mettre à jour');
      return opportunity;
    }

    values.push(id);

    console.log(`🔍 [OpportunityService.update] Exécution UPDATE avec ${fields.length} champs`);

    const result = await connection.query(
      `UPDATE crm_opportunities 
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    console.log('✅ [OpportunityService.update] Résultat de la requête UPDATE:', result);

    // Récupérer l'opportunité mise à jour avec toutes les relations
    return this.findOne(databaseName, organisationId, id);
  }

  /**
   * Supprimer une opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async remove(databaseName: string, organisationId: number, id: number): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    const opportunity = await this.findOne(databaseName, organisationId, id);
    
    await connection.query(
      `DELETE FROM crm_opportunities WHERE id = $1`,
      [id]
    );
    
    console.log('🗑️ Opportunité supprimée:', id);
  }

  /**
   * 🔄 Convertir un prospect en opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   * Cette méthode est appelée par leads.service.ts lors de la conversion
   */
  async convertFromLead(
    databaseName: string,
    organisationId: number,
    leadId: number,
    convertDto: ConvertLeadToOpportunityDto,
    userId: number
  ): Promise<any> {
    console.log('🔄 Conversion prospect vers opportunité - Lead ID:', leadId);
    console.log('📝 Données de conversion:', convertDto);

    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Récupérer le prospect
    const leads = await connection.query(
      `SELECT * FROM crm_leads WHERE id = $1`,
      [leadId]
    );

    if (!leads || leads.length === 0) {
      throw new NotFoundException('Prospect introuvable');
    }

    const lead = leads[0];

    if (lead.status === LeadStatus.CONVERTED) {
      throw new BadRequestException('Ce prospect a déjà été converti');
    }

    // L'engineType a déjà été traité dans le contrôleur
    const finalEngineType = convertDto.engineType;
    
    if (finalEngineType) {
      console.log('🔍 Utilisation de l\'engin ID:', finalEngineType);
    } else {
      console.log('ℹ️ Aucun engin spécifié pour cette conversion');
    }

    // ✅ Déterminer les commerciaux assignés
    let assignedToIds: number[] = [];
    let assignedToId: number | null = null;
    
    // Priorité 1 : assignedToIds du DTO de conversion
    if (convertDto.assignedToIds && convertDto.assignedToIds.length > 0) {
      assignedToIds = convertDto.assignedToIds;
      assignedToId = assignedToIds[0]; // Premier commercial pour compatibilité
      console.log('👥 Commerciaux du DTO de conversion:', assignedToIds);
    }
    // Priorité 2 : assigned_to_ids du prospect
    else if (lead.assigned_to_ids && lead.assigned_to_ids.length > 0) {
      assignedToIds = lead.assigned_to_ids;
      assignedToId = assignedToIds[0];
      console.log('👥 Commerciaux du prospect (assigned_to_ids):', assignedToIds);
    }
    // Priorité 3 : assigned_to du prospect (ancien système)
    else if (lead.assigned_to) {
      assignedToIds = [lead.assigned_to];
      assignedToId = lead.assigned_to;
      console.log('👥 Commercial du prospect (assigned_to):', lead.assigned_to);
    }
    // ❌ PAS DE FALLBACK : Ne JAMAIS assigner au créateur (peut être un administratif)
    // L'opportunité sera créée sans commercial assigné
    else {
      assignedToIds = [];
      assignedToId = null;
      console.log('⚠️ Aucun commercial assigné - L\'opportunité sera créée sans assignation');
    }

    // Créer l'opportunité
    const opportunityData: CreateOpportunityDto = {
      title: convertDto.opportunityTitle,
      description: convertDto.opportunityDescription,
      leadId: leadId,
      value: convertDto.opportunityValue || 0,
      probability: convertDto.probability || 25,
      stage: OpportunityStage.QUALIFICATION,
      expectedCloseDate: convertDto.expectedCloseDate,
      originAddress: convertDto.originAddress,
      destinationAddress: convertDto.destinationAddress,
      transportType: convertDto.transportType,
      traffic: convertDto.traffic,
      serviceFrequency: convertDto.serviceFrequency,
      engineType: finalEngineType,
      specialRequirements: convertDto.specialRequirements,
      assignedToId: assignedToId, // ✅ Premier commercial (compatibilité ancien système)
      assignedToIds: assignedToIds, // ✅ Tous les commerciaux (nouveau système)
      source: 'lead_conversion',
      priority: convertDto.priority || lead.priority,
      tags: lead.tags || [],
    };

    console.log('📋 Données de l\'opportunité à créer:', JSON.stringify(opportunityData, null, 2));
    console.log('📋 Assignation lors de la conversion:', {
      prospectAssignedTo: lead.assigned_to,
      prospectAssignedToIds: lead.assigned_to_ids,
      convertDtoAssignedToIds: convertDto.assignedToIds,
      finalAssignedToId: assignedToId,
      finalAssignedToIds: assignedToIds,
      nbCommerciaux: assignedToIds.length
    });

    // Créer l'opportunité avec gestion d'erreur robuste
    let opportunity;
    try {
      opportunity = await this.create(databaseName, organisationId, opportunityData, userId);
      console.log('✅ Opportunité créée avec succès - ID:', opportunity.id);
    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'opportunité:', error.message);
      throw new BadRequestException(`Échec de la création de l'opportunité: ${error.message}`);
    }

    // Mettre à jour le statut du lead SEULEMENT si l'opportunité a été créée avec succès
    try {
      await connection.query(
        `UPDATE crm_leads 
         SET status = $1, converted_date = NOW(), updated_by = $2, updated_at = NOW()
         WHERE id = $3`,
        [LeadStatus.CONVERTED, userId, leadId]
      );
      console.log('✅ Statut du prospect mis à jour - maintenant CONVERTED');
    } catch (error) {
      console.error('⚠️ Erreur lors de la mise à jour du prospect:', error.message);
      // L'opportunité a été créée mais le prospect n'a pas été marqué comme converti
      // Ce n'est pas critique, on continue
    }

    console.log('🎉 Conversion terminée avec succès - Opportunité ID:', opportunity.id);
    return opportunity;
  }

  /**
   * Obtenir les statistiques des opportunités
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getStats(databaseName: string, organisationId: number, userId?: number): Promise<any> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    let baseQuery = `SELECT * FROM crm_opportunities WHERE is_archived = false`;
    const params: any[] = [];

    // Filtrer par commercial si spécifié
    if (userId) {
      baseQuery += ` AND (assigned_to = $1 OR $1 = ANY(assigned_to_ids))`;
      params.push(userId);
    }

    const allOpportunities = await connection.query(baseQuery, params);

    const total = allOpportunities.length;
    const prospecting = allOpportunities.filter((o) => o.stage === OpportunityStage.PROSPECTING).length;
    const qualification = allOpportunities.filter((o) => o.stage === OpportunityStage.QUALIFICATION).length;
    const proposal = allOpportunities.filter((o) => o.stage === OpportunityStage.PROPOSAL).length;
    const negotiation = allOpportunities.filter((o) => o.stage === OpportunityStage.NEGOTIATION).length;
    const closedWon = allOpportunities.filter((o) => o.stage === OpportunityStage.CLOSED_WON).length;
    const closedLost = allOpportunities.filter((o) => o.stage === OpportunityStage.CLOSED_LOST).length;

    // Valeur totale du pipeline (opportunités ouvertes)
    const pipelineValue = allOpportunities
      .filter((o) => o.stage !== OpportunityStage.CLOSED_WON && o.stage !== OpportunityStage.CLOSED_LOST)
      .reduce((sum, o) => sum + (parseFloat(o.value) || 0), 0);

    // Valeur fermée gagnée
    const wonValue = allOpportunities
      .filter((o) => o.stage === OpportunityStage.CLOSED_WON)
      .reduce((sum, o) => sum + (parseFloat(o.value) || 0), 0);

    return {
      total,
      byStage: {
        prospecting,
        qualification,
        proposal,
        negotiation,
        closedWon,
        closedLost,
      },
      values: {
        pipeline: pipelineValue,
        won: wonValue,
      },
      conversionRate: total > 0 ? Math.round((closedWon / total) * 100) : 0,
    };
  }

  /**
   * 🗄️ Archiver une opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async archiveOpportunity(databaseName: string, organisationId: number, id: number, reason: string, userId: number): Promise<any> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const opportunity = await this.findOne(databaseName, organisationId, id);

    if (opportunity.isArchived) {
      throw new BadRequestException('Cette opportunité est déjà archivée');
    }

    // Archiver avec soft delete
    await connection.query(
      `UPDATE crm_opportunities 
       SET deleted_at = NOW(), 
           is_archived = true, 
           archived_reason = $1, 
           archived_by = $2
       WHERE id = $3`,
      [reason, userId, id]
    );

    return this.findOne(databaseName, organisationId, id);
  }

  /**
   * ♻️ Restaurer une opportunité archivée
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async restoreOpportunity(databaseName: string, organisationId: number, id: number): Promise<any> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const opportunities = await connection.query(
      `SELECT * FROM crm_opportunities WHERE id = $1`,
      [id]
    );

    if (!opportunities || opportunities.length === 0) {
      throw new NotFoundException(`Opportunité #${id} introuvable`);
    }

    const opportunity = opportunities[0];

    if (!opportunity.deleted_at && !opportunity.is_archived) {
      throw new BadRequestException('Cette opportunité n\'est pas archivée');
    }

    // Restaurer
    await connection.query(
      `UPDATE crm_opportunities 
       SET deleted_at = NULL, 
           is_archived = false, 
           archived_reason = NULL, 
           archived_by = NULL
       WHERE id = $1`,
      [id]
    );

    return this.findOne(databaseName, organisationId, id);
  }
}
