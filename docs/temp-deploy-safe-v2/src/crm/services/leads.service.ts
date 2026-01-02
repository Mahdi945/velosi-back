import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Lead } from '../../entities/crm/lead.entity';
import { DatabaseConnectionService } from '../../common/database-connection.service';

@Injectable()
export class LeadsService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * � Transformer les noms de colonnes snake_case en camelCase
   */
  private transformLeadToCamelCase(lead: any): any {
    if (!lead) {
      console.error('❌ [transformLeadToCamelCase] lead est null ou undefined');
      return null;
    }
    
    if (!lead.id) {
      console.error('❌ [transformLeadToCamelCase] lead.id est manquant!', lead);
    }
    
    return {
      id: lead.id,
      uuid: lead.uuid,
      fullName: lead.full_name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      position: lead.position,
      website: lead.website,
      industry: lead.industry,
      employeeCount: lead.employee_count,
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
      transportNeeds: lead.transport_needs,
      traffic: lead.traffic,
      annualVolume: lead.annual_volume,
      currentProvider: lead.current_provider,
      contractEndDate: lead.contract_end_date,
      street: lead.street,
      city: lead.city,
      state: lead.state,
      postalCode: lead.postal_code,
      country: lead.country,
      isLocal: lead.is_local,
      assignedTo: lead.assigned_to,
      assignedToIds: lead.assigned_to_ids || [],
      assignedToName: lead.assigned_to_name,
      assignedToPrenom: lead.assigned_to_prenom,
      assignedCommercials: lead.assigned_commercials || [],
      estimatedValue: lead.estimated_value,
      currency: lead.currency,
      tags: lead.tags,
      notes: lead.notes,
      lastContactDate: lead.last_contact_date,
      nextFollowupDate: lead.next_followup_date,
      qualifiedDate: lead.qualified_date,
      convertedDate: lead.converted_date,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
      createdBy: lead.created_by ? {
        id: lead.created_by,
        nom: lead.created_by_nom,
        prenom: lead.created_by_prenom,
        nom_utilisateur: lead.created_by_username
      } : null,
      updatedBy: lead.updated_by ? {
        id: lead.updated_by,
        nom: lead.updated_by_nom,
        prenom: lead.updated_by_prenom,
        nom_utilisateur: lead.updated_by_username
      } : null,
      deletedAt: lead.deleted_at,
      isArchived: lead.is_archived,
      archivedReason: lead.archived_reason,
      archivedBy: lead.archived_by,
    };
  }

  /**
   * 🔍 Récupérer tous les leads actifs (non archivés)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findAll(databaseName: string, organisationId: number, filters?: any): Promise<Lead[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const leads = await connection.query(
      `SELECT l.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username,
              (
                SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
                FROM unnest(l.assigned_to_ids) AS commercial_id
                LEFT JOIN personnel p2 ON p2.id = commercial_id
                WHERE p2.id IS NOT NULL
              ) as assigned_commercials
       FROM crm_leads l
       LEFT JOIN personnel p ON l.assigned_to = p.id
       LEFT JOIN personnel creator ON l.created_by = creator.id
       LEFT JOIN personnel updater ON l.updated_by = updater.id
       WHERE l.is_archived = false
       ORDER BY l.created_at DESC`
    );
    
    // Transformer en camelCase pour le frontend
    return leads.map(lead => this.transformLeadToCamelCase(lead));
  }

  /**
   * 🔍 Récupérer les leads assignés à un ou plusieurs commerciaux
   * ✅ MULTI-COMMERCIAUX: Utilise assignedToIds (array)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findByAssignedTo(databaseName: string, organisationId: number, assignedToIds: number | number[], filters?: any): Promise<Lead[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Convertir en tableau si c'est un seul ID
    const idsArray = Array.isArray(assignedToIds) ? assignedToIds : [assignedToIds];
    
    const results = await connection.query(
      `SELECT l.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username,
              (
                SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
                FROM unnest(l.assigned_to_ids) AS commercial_id
                LEFT JOIN personnel p2 ON p2.id = commercial_id
                WHERE p2.id IS NOT NULL
              ) as assigned_commercials
       FROM crm_leads l
       LEFT JOIN personnel p ON l.assigned_to = p.id
       LEFT JOIN personnel creator ON l.created_by = creator.id
       LEFT JOIN personnel updater ON l.updated_by = updater.id
       WHERE l.is_archived = false
         AND (l.assigned_to_ids && $1 OR l.assigned_to_ids IS NULL OR l.assigned_to_ids = '{}')
       ORDER BY l.created_at DESC`,
      [idsArray]
    );
    
    // Transformer en camelCase pour le frontend
    return results.map(lead => this.transformLeadToCamelCase(lead));
  }

  /**
   * 🔍 Récupérer un lead par ID
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findOne(databaseName: string, organisationId: number, id: number): Promise<Lead> {
    console.log(`🔍 [LeadsService.findOne] DB: ${databaseName}, Org: ${organisationId}, Lead ID: ${id}`);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const leads = await connection.query(
      `SELECT l.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username,
              (
                SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
                FROM unnest(l.assigned_to_ids) AS commercial_id
                LEFT JOIN personnel p2 ON p2.id = commercial_id
                WHERE p2.id IS NOT NULL
              ) as assigned_commercials
       FROM crm_leads l
       LEFT JOIN personnel p ON l.assigned_to = p.id
       LEFT JOIN personnel creator ON l.created_by = creator.id
       LEFT JOIN personnel updater ON l.updated_by = updater.id
       WHERE l.id = $1 AND l.is_archived = false`,
      [id]
    );
    
    if (!leads || leads.length === 0) {
      console.error(`❌ [LeadsService.findOne] Lead #${id} non trouvé`);
      throw new NotFoundException(`Lead #${id} non trouvé`);
    }
    
    console.log(`📦 [LeadsService.findOne] Lead trouvé:`, JSON.stringify(leads[0], null, 2));
    
    // Transformer en camelCase pour le frontend
    const transformedLead = this.transformLeadToCamelCase(leads[0]);
    console.log(`✨ [LeadsService.findOne] Lead transformé:`, JSON.stringify(transformedLead, null, 2));
    
    return transformedLead;
  }

  /**
   * ✨ Créer un nouveau lead
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async create(databaseName: string, organisationId: number, leadData: Partial<Lead>, userId?: number): Promise<Lead> {
    console.log(`✨ [LeadsService.create] DB: ${databaseName}, Org: ${organisationId}`);
    console.log(`📝 [LeadsService.create] Données reçues:`, JSON.stringify(leadData, null, 2));
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // 🔧 Synchroniser la séquence avant l'insertion pour éviter les conflits de clés
    try {
      await connection.query(
        `SELECT setval(pg_get_serial_sequence('crm_leads', 'id'), 
         COALESCE((SELECT MAX(id) FROM crm_leads), 0) + 1, false)`
      );
    } catch (error) {
      console.warn('⚠️ Impossible de synchroniser la séquence crm_leads:', error.message);
    }
    
    const result = await connection.query(
      `INSERT INTO crm_leads (
        full_name, email, phone, company, position, website, industry,
        source, status, priority, assigned_to_ids, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        leadData.fullName,
        leadData.email,
        leadData.phone,
        leadData.company,
        leadData.position,
        leadData.website,
        leadData.industry,
        leadData.source,
        leadData.status || 'new',
        leadData.priority || 'medium',
        leadData.assignedToIds || [],
        leadData.notes,
        userId || 1,
      ]
    );

    console.log(`✅ [LeadsService.create] Lead créé avec ID: ${result[0].id}`);
    
    // Récupérer les données complètes avec les jointures
    const completeLeads = await connection.query(
      `SELECT l.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username,
              (
                SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
                FROM unnest(l.assigned_to_ids) AS commercial_id
                LEFT JOIN personnel p2 ON p2.id = commercial_id
                WHERE p2.id IS NOT NULL
              ) as assigned_commercials
       FROM crm_leads l
       LEFT JOIN personnel p ON l.assigned_to = p.id
       LEFT JOIN personnel creator ON l.created_by = creator.id
       LEFT JOIN personnel updater ON l.updated_by = updater.id
       WHERE l.id = $1`,
      [result[0].id]
    );
    
    if (completeLeads && completeLeads.length > 0) {
      console.log(`📦 [LeadsService.create] Données complètes récupérées`);
      const transformedLead = this.transformLeadToCamelCase(completeLeads[0]);
      console.log(`✨ [LeadsService.create] Lead transformé:`, JSON.stringify(transformedLead, null, 2));
      return transformedLead;
    }
    
    // Fallback sur le résultat direct si la requête de récupération échoue
    console.warn(`⚠️ [LeadsService.create] Impossible de récupérer les données complètes, utilisation du résultat direct`);
    return this.transformLeadToCamelCase(result[0]);
  }

  /**
   * 📝 Mettre à jour un lead
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async update(databaseName: string, organisationId: number, id: number, leadData: Partial<Lead>, userId?: number): Promise<Lead> {
    console.log(`🔄 [LeadsService.update] Début - DB: ${databaseName}, Org: ${organisationId}, Lead ID: ${id}`);
    console.log(`📝 [LeadsService.update] Données reçues:`, JSON.stringify(leadData, null, 2));
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (leadData.fullName !== undefined) { fields.push(`full_name = $${paramIndex++}`); values.push(leadData.fullName); }
    if (leadData.email !== undefined) { fields.push(`email = $${paramIndex++}`); values.push(leadData.email); }
    if (leadData.phone !== undefined) { fields.push(`phone = $${paramIndex++}`); values.push(leadData.phone); }
    if (leadData.company !== undefined) { fields.push(`company = $${paramIndex++}`); values.push(leadData.company); }
    if (leadData.position !== undefined) { fields.push(`position = $${paramIndex++}`); values.push(leadData.position); }
    if (leadData.website !== undefined) { fields.push(`website = $${paramIndex++}`); values.push(leadData.website); }
    if (leadData.industry !== undefined) { fields.push(`industry = $${paramIndex++}`); values.push(leadData.industry); }
    if (leadData.source !== undefined) { fields.push(`source = $${paramIndex++}`); values.push(leadData.source); }
    if (leadData.status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(leadData.status); }
    if (leadData.priority !== undefined) { fields.push(`priority = $${paramIndex++}`); values.push(leadData.priority); }
    if (leadData.assignedToIds !== undefined) { fields.push(`assigned_to_ids = $${paramIndex++}`); values.push(leadData.assignedToIds); }
    if (leadData.notes !== undefined) { fields.push(`notes = $${paramIndex++}`); values.push(leadData.notes); }
    
    // Ajouter updated_by et updated_at
    if (userId) { fields.push(`updated_by = $${paramIndex++}`); values.push(userId); }
    fields.push(`updated_at = NOW()`);
    
    if (fields.length === (userId ? 2 : 1)) {
      throw new BadRequestException('Aucune donnée à mettre à jour');
    }

    values.push(id);
    
    console.log(`🔍 [LeadsService.update] Exécution UPDATE avec ${fields.length} champs`);
    
    const result = await connection.query(
      `UPDATE crm_leads 
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!result || result.length === 0) {
      console.error(`❌ [LeadsService.update] Lead #${id} non trouvé`);
      throw new NotFoundException(`Lead #${id} non trouvé`);
    }

    console.log(`✅ [LeadsService.update] Lead mis à jour, récupération des données complètes...`);
    
    // Récupérer les données complètes avec les jointures (comme findOne)
    console.log(`🔍 [LeadsService.update] Exécution SELECT pour Lead ID: ${id}`);
    const completeLeads = await connection.query(
      `SELECT l.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username,
              (
                SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
                FROM unnest(l.assigned_to_ids) AS commercial_id
                LEFT JOIN personnel p2 ON p2.id = commercial_id
                WHERE p2.id IS NOT NULL
              ) as assigned_commercials
       FROM crm_leads l
       LEFT JOIN personnel p ON l.assigned_to = p.id
       LEFT JOIN personnel creator ON l.created_by = creator.id
       LEFT JOIN personnel updater ON l.updated_by = updater.id
       WHERE l.id = $1`,
      [id]
    );
    
    console.log(`🔍 [LeadsService.update] Résultat SELECT (${completeLeads?.length || 0} résultats):`, JSON.stringify(completeLeads, null, 2));
    
    if (!completeLeads || completeLeads.length === 0) {
      console.error(`❌ [LeadsService.update] Impossible de récupérer le lead #${id} après mise à jour`);
      // Essayer une requête simple sans jointure pour débugger
      const simpleCheck = await connection.query(`SELECT * FROM crm_leads WHERE id = $1`, [id]);
      console.error(`🔍 [LeadsService.update] Vérification simple:`, JSON.stringify(simpleCheck, null, 2));
      throw new NotFoundException(`Lead #${id} introuvable après mise à jour`);
    }
    
    const completeLead = completeLeads[0];
    console.log(`📦 [LeadsService.update] Données brutes récupérées:`, JSON.stringify(completeLead, null, 2));
    
    // Transformer en camelCase pour le frontend
    const transformedLead = this.transformLeadToCamelCase(completeLead);
    console.log(`✨ [LeadsService.update] Lead transformé:`, JSON.stringify(transformedLead, null, 2));
    
    return transformedLead;
  }

  /**
   * 🗑️ Archiver un lead
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async archiveLead(databaseName: string, organisationId: number, id: number, reason: string, userId: number): Promise<Lead> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `UPDATE crm_leads 
       SET deleted_at = NOW(), 
           is_archived = true, 
           archived_reason = $1, 
           archived_by = $2
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [reason, userId, id]
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`Lead #${id} introuvable ou déjà archivé`);
    }

    // Récupérer les données complètes avec les commerciaux
    const completeLeads = await connection.query(
      `SELECT l.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              (
                SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
                FROM unnest(l.assigned_to_ids) AS commercial_id
                LEFT JOIN personnel p2 ON p2.id = commercial_id
                WHERE p2.id IS NOT NULL
              ) as assigned_commercials
       FROM crm_leads l
       LEFT JOIN personnel p ON l.assigned_to = p.id
       WHERE l.id = $1`,
      [id]
    );

    // Transformer en camelCase pour le frontend
    return this.transformLeadToCamelCase(completeLeads[0] || result[0]);
  }

  /**
   * ♻️ Restaurer un lead archivé
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async restoreLead(databaseName: string, organisationId: number, id: number): Promise<Lead> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `UPDATE crm_leads 
       SET deleted_at = NULL, 
           is_archived = false, 
           archived_reason = NULL, 
           archived_by = NULL
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`Lead #${id} introuvable`);
    }

    // Récupérer les données complètes avec les commerciaux
    const completeLeads = await connection.query(
      `SELECT l.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              (
                SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
                FROM unnest(l.assigned_to_ids) AS commercial_id
                LEFT JOIN personnel p2 ON p2.id = commercial_id
                WHERE p2.id IS NOT NULL
              ) as assigned_commercials
       FROM crm_leads l
       LEFT JOIN personnel p ON l.assigned_to = p.id
       WHERE l.id = $1`,
      [id]
    );

    // Transformer en camelCase pour le frontend
    return this.transformLeadToCamelCase(completeLeads[0] || result[0]);
  }

  /**
   * 📦 Récupérer tous les leads archivés
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async findAllArchived(databaseName: string, organisationId: number): Promise<Lead[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const allLeads = await connection.query(
      `SELECT l.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              creator.nom as created_by_nom, creator.prenom as created_by_prenom, creator.nom_utilisateur as created_by_username,
              updater.nom as updated_by_nom, updater.prenom as updated_by_prenom, updater.nom_utilisateur as updated_by_username,
              (
                SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
                FROM unnest(l.assigned_to_ids) AS commercial_id
                LEFT JOIN personnel p2 ON p2.id = commercial_id
                WHERE p2.id IS NOT NULL
              ) as assigned_commercials
       FROM crm_leads l
       LEFT JOIN personnel p ON l.assigned_to = p.id
       LEFT JOIN personnel creator ON l.created_by = creator.id
       LEFT JOIN personnel updater ON l.updated_by = updater.id
       WHERE l.is_archived = true
       ORDER BY l.created_at DESC`
    );

    // Transformer en camelCase pour le frontend
    return allLeads.map(lead => this.transformLeadToCamelCase(lead));
  }

  /**
   * 📊 Statistiques des leads
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getStatistics(databaseName: string, organisationId: number) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const allLeads = await connection.query(
      `SELECT * FROM crm_leads 
       WHERE is_archived = false`
    );

    return {
      total: allLeads.length,
      byStatus: {
        new: allLeads.filter((l) => l.status === 'new').length,
        contacted: allLeads.filter((l) => l.status === 'contacted').length,
        qualified: allLeads.filter((l) => l.status === 'qualified').length,
        unqualified: allLeads.filter((l) => l.status === 'unqualified').length,
        nurturing: allLeads.filter((l) => l.status === 'nurturing').length,
        converted: allLeads.filter((l) => l.status === 'converted').length,
        client: allLeads.filter((l) => l.status === 'client').length,
        lost: allLeads.filter((l) => l.status === 'lost').length,
      },
      byPriority: {
        low: allLeads.filter((l) => l.priority === 'low').length,
        medium: allLeads.filter((l) => l.priority === 'medium').length,
        high: allLeads.filter((l) => l.priority === 'high').length,
        urgent: allLeads.filter((l) => l.priority === 'urgent').length,
      },
    };
  }

  /**
   * 📊 Statistiques des leads pour un commercial spécifique
   * ✅ MULTI-COMMERCIAUX: Utilise assignedToIds (array)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getStatisticsByCommercial(databaseName: string, organisationId: number, commercialId: number) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const allLeads = await connection.query(
      `SELECT * FROM crm_leads 
       WHERE is_archived = false 
         AND ($1 = ANY(assigned_to_ids) OR assigned_to_ids IS NULL OR assigned_to_ids = '{}')`,
      [commercialId]
    );

    return {
      total: allLeads.length,
      byStatus: {
        new: allLeads.filter((l) => l.status === 'new').length,
        contacted: allLeads.filter((l) => l.status === 'contacted').length,
        qualified: allLeads.filter((l) => l.status === 'qualified').length,
        unqualified: allLeads.filter((l) => l.status === 'unqualified').length,
        nurturing: allLeads.filter((l) => l.status === 'nurturing').length,
        converted: allLeads.filter((l) => l.status === 'converted').length,
        client: allLeads.filter((l) => l.status === 'client').length,
        lost: allLeads.filter((l) => l.status === 'lost').length,
      },
      byPriority: {
        low: allLeads.filter((l) => l.priority === 'low').length,
        medium: allLeads.filter((l) => l.priority === 'medium').length,
        high: allLeads.filter((l) => l.priority === 'high').length,
        urgent: allLeads.filter((l) => l.priority === 'urgent').length,
      },
    };
  }

  /**
   * 🔄 Convertir un prospect en opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async convertToOpportunity(
    databaseName: string,
    organisationId: number,
    id: number,
    convertData: {
      opportunityTitle: string;
      opportunityDescription?: string;
      opportunityValue?: number;
      currency?: string;
      probability?: number;
      expectedCloseDate?: Date;
      originAddress?: string;
      destinationAddress?: string;
      transportType?: string;
      traffic?: string;
      serviceFrequency?: string;
      specialRequirements?: string;
      priority?: string;
    },
    userId: number
  ) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Vérifier que le lead existe et n'est pas déjà converti
    const lead = await this.findOne(databaseName, organisationId, id);
    
    if (lead.status === 'converted') {
      throw new BadRequestException('Ce prospect a déjà été converti');
    }

    try {
      // ✅ Copier UNIQUEMENT les commerciaux assignés du lead
      // Ne JAMAIS utiliser userId (créateur) qui peut être un administratif
      const assignedCommercialsIds = lead.assignedToIds && lead.assignedToIds.length > 0 
        ? lead.assignedToIds 
        : []; // Tableau vide si aucun commercial assigné
      
      console.log(`📋 [LeadsService.convertToOpportunity] Commerciaux assignés copiés du lead:`, assignedCommercialsIds);
      
      // Créer l'opportunité
      const opportunityResult = await connection.query(
        `INSERT INTO crm_opportunities (
          title, description, lead_id, value, currency, probability, stage,
          expected_close_date, origin_address, destination_address, 
          transport_type, traffic, service_frequency, special_requirements,
          assigned_to_ids, source, priority, created_by, updated_by,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'prospecting',
          $7, $8, $9, $10, $11, $12, $13, $14, 'lead_conversion', $15, $16, $16,
          NOW(), NOW()
        ) RETURNING *`,
        [
          convertData.opportunityTitle,
          convertData.opportunityDescription || '',
          id,
          convertData.opportunityValue || 0,
          convertData.currency || lead.currency || 'EUR',
          convertData.probability || 20,
          convertData.expectedCloseDate,
          convertData.originAddress,
          convertData.destinationAddress,
          convertData.transportType,
          convertData.traffic,
          convertData.serviceFrequency,
          convertData.specialRequirements,
          assignedCommercialsIds,
          convertData.priority || 'medium',
          userId,
        ]
      );

      console.log(`✅ [LeadsService.convertToOpportunity] Opportunité créée: ID ${opportunityResult[0].id}`);

      // Mettre à jour le statut du lead
      await connection.query(
        `UPDATE crm_leads 
         SET status = 'converted', 
             converted_date = NOW(),
             updated_by = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [userId, id]
      );

      console.log(`✅ [LeadsService.convertToOpportunity] Lead #${id} marqué comme converti`);

      return {
        success: true,
        message: 'Prospect converti en opportunité avec succès',
        opportunity: opportunityResult[0],
        lead: await this.findOne(databaseName, organisationId, id),
      };
    } catch (error) {
      console.error('❌ [LeadsService.convertToOpportunity] Erreur:', error);
      throw new BadRequestException(`Erreur lors de la conversion: ${error.message}`);
    }
  }

  /**
   * 👤 Assigner un prospect à un commercial
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async assignLead(
    databaseName: string,
    organisationId: number,
    id: number,
    commercialId: number,
    userId: number
  ) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Vérifier que le commercial existe
    const commercial = await connection.query(
      `SELECT id FROM personnel WHERE id = $1`,
      [commercialId]
    );

    if (!commercial || commercial.length === 0) {
      throw new NotFoundException('Commercial introuvable');
    }

    // Mettre à jour l'assignation
    const result = await connection.query(
      `UPDATE crm_leads 
       SET assigned_to = $1,
           assigned_to_ids = CASE 
             WHEN assigned_to_ids IS NULL THEN ARRAY[$1]
             WHEN NOT ($1 = ANY(assigned_to_ids)) THEN array_append(assigned_to_ids, $1)
             ELSE assigned_to_ids
           END,
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [commercialId, userId, id]
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`Lead #${id} introuvable`);
    }

    console.log(`✅ [LeadsService.assignLead] Lead #${id} assigné au commercial ${commercialId}`);

    // Récupérer les données complètes avec les commerciaux
    const completeLeads = await connection.query(
      `SELECT l.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom,
              (
                SELECT json_agg(json_build_object('id', p2.id, 'nom', p2.nom, 'prenom', p2.prenom, 'nom_utilisateur', p2.nom_utilisateur))
                FROM unnest(l.assigned_to_ids) AS commercial_id
                LEFT JOIN personnel p2 ON p2.id = commercial_id
                WHERE p2.id IS NOT NULL
              ) as assigned_commercials
       FROM crm_leads l
       LEFT JOIN personnel p ON l.assigned_to = p.id
       WHERE l.id = $1`,
      [id]
    );

    return this.transformLeadToCamelCase(completeLeads[0] || result[0]);
  }

  /**
   * ⏰ Obtenir les prospects nécessitant un suivi
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async getLeadsRequiringFollowup(databaseName: string, organisationId: number) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const leads = await connection.query(
      `SELECT l.*, 
              p.nom as assigned_to_name, p.prenom as assigned_to_prenom
       FROM crm_leads l
       LEFT JOIN personnel p ON l.assigned_to = p.id
       WHERE l.is_archived = false
         AND l.next_followup_date <= NOW()
         AND l.status NOT IN ('converted', 'lost', 'unqualified')
       ORDER BY l.next_followup_date ASC`
    );

    return leads.map(lead => this.transformLeadToCamelCase(lead));
  }

  /**
   * 🔍 Recherche avancée de prospects
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  async advancedSearch(
    databaseName: string,
    organisationId: number,
    filters: {
      valueRange?: { min: number; max: number };
      tags?: string[];
      transportNeeds?: string[];
      dateRange?: { start: Date; end: Date };
    }
  ) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    let query = `SELECT l.*, 
                        p.nom as assigned_to_name, p.prenom as assigned_to_prenom
                 FROM crm_leads l
                 LEFT JOIN personnel p ON l.assigned_to = p.id
                 WHERE l.is_archived = false`;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.valueRange) {
      query += ` AND l.estimated_value BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(filters.valueRange.min, filters.valueRange.max);
      paramIndex += 2;
    }

    if (filters.tags && filters.tags.length > 0) {
      query += ` AND l.tags && $${paramIndex}`;
      params.push(filters.tags);
      paramIndex++;
    }

    if (filters.transportNeeds && filters.transportNeeds.length > 0) {
      query += ` AND l.transport_needs && $${paramIndex}`;
      params.push(filters.transportNeeds);
      paramIndex++;
    }

    if (filters.dateRange) {
      query += ` AND l.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(filters.dateRange.start, filters.dateRange.end);
      paramIndex += 2;
    }

    query += ` ORDER BY l.created_at DESC`;

    const leads = await connection.query(query, params);
    return leads.map(lead => this.transformLeadToCamelCase(lead));
  }
}
