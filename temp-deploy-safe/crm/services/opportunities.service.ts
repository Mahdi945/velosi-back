import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Opportunity } from '../../entities/crm/opportunity.entity';
import { DatabaseConnectionService } from '../../common/database-connection.service';

@Injectable()
export class OpportunitiesService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * 🔄 Transformer les données brutes en objet Opportunity avec relations structurées
   */
  private transformOpportunity(raw: any): Opportunity {
    return {
      ...raw,
      createdBy: raw.created_by ? {
        id: raw.created_by,
        nom: raw.created_by_nom,
        prenom: raw.created_by_prenom,
        nom_utilisateur: raw.created_by_username
      } : null,
      updatedBy: raw.updated_by ? {
        id: raw.updated_by,
        nom: raw.updated_by_nom,
        prenom: raw.updated_by_prenom,
        nom_utilisateur: raw.updated_by_username
      } : null
    };
  }

  /**
   * 🔍 Récupérer toutes les opportunités actives (non archivées)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findAll(databaseName: string, organisationId: number): Promise<Opportunity[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const opportunities = await connection.query(
      `SELECT o.*, 
              l.company as lead_company, l.full_name as lead_name,
              c.nom as client_name,
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username
       FROM crm_opportunities o
       LEFT JOIN crm_leads l ON o.lead_id = l.id
       LEFT JOIN client c ON o.client_id = c.id
       LEFT JOIN personnel p ON o.assigned_to = p.id
       LEFT JOIN personnel creator ON o.created_by = creator.id
       LEFT JOIN personnel updater ON o.updated_by = updater.id
       WHERE o.deleted_at IS NULL 
         AND o.is_archived = false
       ORDER BY o.created_at DESC`
    );
    
    return opportunities.map(opp => this.transformOpportunity(opp));
  }

  /**
   * 🔍 Récupérer les opportunités assignées à un commercial spécifique
   * ✅ MULTI-COMMERCIAUX: Utilise assignedToIds (array) au lieu de assignedToId (single)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findByAssignedTo(databaseName: string, organisationId: number, userId: number): Promise<Opportunity[]> {
    console.log('🔍 [OpportunitiesService.findByAssignedTo] Filtrage pour userId:', userId, 'db:', databaseName);
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT o.*, 
              l.company as lead_company, l.full_name as lead_name,
              c.nom as client_name,
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username
       FROM crm_opportunities o
       LEFT JOIN crm_leads l ON o.lead_id = l.id
       LEFT JOIN client c ON o.client_id = c.id
       LEFT JOIN personnel p ON o.assigned_to = p.id
       LEFT JOIN personnel creator ON o.created_by = creator.id
       LEFT JOIN personnel updater ON o.updated_by = updater.id
       WHERE o.deleted_at IS NULL 
         AND o.is_archived = false
         AND ($1 = ANY(o.assigned_to_ids) OR o.assigned_to_ids IS NULL OR o.assigned_to_ids = '{}')
       ORDER BY o.created_at DESC`,
      [userId]
    );
    
    console.log('✅ [OpportunitiesService.findByAssignedTo] Résultats filtrés:', results.length);
    return results.map(opp => this.transformOpportunity(opp));
  }

  /**
   * 🔍 Récupérer une opportunité par ID
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findOne(databaseName: string, organisationId: number, id: number): Promise<Opportunity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const opportunities = await connection.query(
      `SELECT o.*, 
              l.company as lead_company, l.full_name as lead_name,
              c.nom as client_name,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username
       FROM crm_opportunities o
       LEFT JOIN crm_leads l ON o.lead_id = l.id
       LEFT JOIN client c ON o.client_id = c.id
       LEFT JOIN personnel creator ON o.created_by = creator.id
       LEFT JOIN personnel updater ON o.updated_by = updater.id
       WHERE o.id = $1
         AND o.deleted_at IS NULL 
         AND o.is_archived = false`,
      [id]
    );

    if (!opportunities || opportunities.length === 0) {
      throw new NotFoundException(`Opportunité #${id} introuvable`);
    }

    return this.transformOpportunity(opportunities[0]);
  }

  /**
   * ✏️ Créer une nouvelle opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async create(databaseName: string, organisationId: number, opportunityData: Partial<Opportunity>): Promise<Opportunity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `INSERT INTO crm_opportunities (
        title, description, lead_id, client_id, value, currency, probability,
        stage, expected_close_date, transport_type, traffic, assigned_to,
        assigned_to_ids, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        opportunityData.title,
        opportunityData.description,
        opportunityData.leadId,
        opportunityData.clientId,
        opportunityData.value || 0,
        opportunityData.currency || 'TND',
        opportunityData.probability || 0,
        opportunityData.stage || 'prospecting',
        opportunityData.expectedCloseDate,
        opportunityData.transportType,
        opportunityData.traffic,
        opportunityData.assignedToId,
        opportunityData.assignedToIds || [],
        opportunityData.createdById
      ]
    );
    
    // Recharger l'opportunité avec toutes les relations
    return this.findOne(databaseName, organisationId, result[0].id);
  }

  /**
   * 🔄 Mettre à jour une opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async update(databaseName: string, organisationId: number, id: number, opportunityData: Partial<Opportunity>): Promise<Opportunity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Construire dynamiquement la requête UPDATE
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (opportunityData.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(opportunityData.title); }
    if (opportunityData.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(opportunityData.description); }
    if (opportunityData.value !== undefined) { fields.push(`value = $${paramIndex++}`); values.push(opportunityData.value); }
    if (opportunityData.probability !== undefined) { fields.push(`probability = $${paramIndex++}`); values.push(opportunityData.probability); }
    if (opportunityData.stage !== undefined) { fields.push(`stage = $${paramIndex++}`); values.push(opportunityData.stage); }
    if (opportunityData.assignedToIds !== undefined) { fields.push(`assigned_to_ids = $${paramIndex++}`); values.push(opportunityData.assignedToIds); }
    if (opportunityData.updatedById !== undefined) { fields.push(`updated_by = $${paramIndex++}`); values.push(opportunityData.updatedById); }
    
    fields.push(`updated_at = NOW()`);
    values.push(id);
    
    await connection.query(
      `UPDATE crm_opportunities SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    
    return this.findOne(databaseName, organisationId, id);
  }

  /**
   * 🗑️ SOFT DELETE - Archiver une opportunité
   * Ne supprime jamais physiquement - crucial pour analyse des performances commerciales
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async archiveOpportunity(databaseName: string, organisationId: number, id: number, reason: string, userId: number): Promise<Opportunity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `UPDATE crm_opportunities 
       SET deleted_at = NOW(), 
           is_archived = true, 
           archived_reason = $1, 
           archived_by = $2
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [reason, userId, id]
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`Opportunité #${id} introuvable ou déjà archivée`);
    }

    return result[0];
  }

  /**
   * ♻️ Restaurer une opportunité archivée
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async restoreOpportunity(databaseName: string, organisationId: number, id: number): Promise<Opportunity> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `UPDATE crm_opportunities 
       SET deleted_at = NULL, 
           is_archived = false, 
           archived_reason = NULL, 
           archived_by = NULL
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`Opportunité #${id} introuvable`);
    }

    return this.findOne(databaseName, organisationId, id);
  }

  /**
   * ✅ CORRECTION: Récupérer TOUTES les opportunités (archivées + non-archivées)
   * Le filtrage se fera côté FRONTEND
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findAllArchived(databaseName: string, organisationId: number): Promise<Opportunity[]> {
    console.log('🔍 Backend: Récupération de TOUTES les opportunités (archivées + non-archivées) depuis', databaseName, 'org:', organisationId);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const allOpportunities = await connection.query(
      `SELECT o.*, 
              l.company as lead_company, l.full_name as lead_name,
              c.nom as client_name,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username
       FROM crm_opportunities o
       LEFT JOIN crm_leads l ON o.lead_id = l.id
       LEFT JOIN client c ON o.client_id = c.id
       LEFT JOIN personnel creator ON o.created_by = creator.id
       LEFT JOIN personnel updater ON o.updated_by = updater.id
       ORDER BY o.created_at DESC`
    );
    
    console.log(`✅ ${allOpportunities.length} opportunités retournées`);
    return allOpportunities.map(opp => this.transformOpportunity(opp));
  }

  /**
   * 📊 Statistiques des opportunités
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getStatistics(databaseName: string, organisationId: number) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const allOpportunities = await connection.query(
      `SELECT * FROM crm_opportunities WHERE deleted_at IS NULL`
    );

    const totalValue = allOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0);
    const wonOpportunities = allOpportunities.filter((opp) => opp.stage === 'closed_won');
    const lostOpportunities = allOpportunities.filter((opp) => opp.stage === 'closed_lost');

    return {
      total: allOpportunities.length,
      byStage: {
        prospecting: allOpportunities.filter((o) => o.stage === 'prospecting').length,
        qualification: allOpportunities.filter((o) => o.stage === 'qualification').length,
        needs_analysis: allOpportunities.filter((o) => o.stage === 'needs_analysis').length,
        proposal: allOpportunities.filter((o) => o.stage === 'proposal').length,
        negotiation: allOpportunities.filter((o) => o.stage === 'negotiation').length,
        closed_won: wonOpportunities.length,
        closed_lost: lostOpportunities.length,
      },
      totalValue,
      wonValue: wonOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0),
      lostValue: lostOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0),
      averageValue: allOpportunities.length > 0 ? totalValue / allOpportunities.length : 0,
      winRate: allOpportunities.length > 0
        ? (wonOpportunities.length / allOpportunities.length) * 100
        : 0,
    };
  }

  /**
   * 📊 Statistiques des opportunités pour un commercial spécifique
   * ✅ MULTI-COMMERCIAUX: Utilise assignedToIds (array)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getStatisticsByCommercial(databaseName: string, organisationId: number, userId: number) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const allOpportunities = await connection.query(
      `SELECT * FROM crm_opportunities 
       WHERE deleted_at IS NULL AND ($1 = ANY(assigned_to_ids) OR assigned_to_ids IS NULL OR assigned_to_ids = '{}')`,
      [userId]
    );

    const totalValue = allOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0);
    const wonOpportunities = allOpportunities.filter((opp) => opp.stage === 'closed_won');
    const lostOpportunities = allOpportunities.filter((opp) => opp.stage === 'closed_lost');

    return {
      total: allOpportunities.length,
      byStage: {
        prospecting: allOpportunities.filter((o) => o.stage === 'prospecting').length,
        qualification: allOpportunities.filter((o) => o.stage === 'qualification').length,
        needs_analysis: allOpportunities.filter((o) => o.stage === 'needs_analysis').length,
        proposal: allOpportunities.filter((o) => o.stage === 'proposal').length,
        negotiation: allOpportunities.filter((o) => o.stage === 'negotiation').length,
        closed_won: wonOpportunities.length,
        closed_lost: lostOpportunities.length,
      },
      totalValue,
      wonValue: wonOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0),
      lostValue: lostOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0),
      averageValue: allOpportunities.length > 0 ? totalValue / allOpportunities.length : 0,
      winRate: allOpportunities.length > 0
        ? (wonOpportunities.length / allOpportunities.length) * 100
        : 0,
    };
  }
}
