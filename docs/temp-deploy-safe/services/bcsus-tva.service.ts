import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BCsusTVA } from '../entities/bcsus-tva.entity';
import { CreateBCsusTVADto, UpdateBCsusTVADto, BCsusTVAResponseDto } from '../dto/bcsus-tva.dto';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable()
export class BCsusTVAService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Créer un nouveau bon de commande
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async create(databaseName: string, createBCsusTVADto: CreateBCsusTVADto): Promise<BCsusTVAResponseDto> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Vérifier que l'autorisation existe
    const autorisation = await connection.query(
      `SELECT * FROM autorisations_tva WHERE id = $1 LIMIT 1`,
      [createBCsusTVADto.autorisationId]
    );

    if (!autorisation || autorisation.length === 0) {
      throw new NotFoundException(`Autorisation avec l'ID ${createBCsusTVADto.autorisationId} non trouvée`);
    }

    // Vérifier l'unicité du numéro de bon de commande pour cette autorisation
    const existingBC = await connection.query(
      `SELECT * FROM bcsus_tva WHERE numero_bon_commande = $1 AND autorisation_id = $2 LIMIT 1`,
      [createBCsusTVADto.numeroBonCommande, createBCsusTVADto.autorisationId]
    );

    if (existingBC && existingBC.length > 0) {
      throw new BadRequestException(`Un bon de commande avec le numéro ${createBCsusTVADto.numeroBonCommande} existe déjà pour cette autorisation`);
    }

    const result = await connection.query(
      `INSERT INTO bcsus_tva (autorisation_id, numero_bon_commande, date_bon_commande, 
                             montant_bon_commande, description, statut, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        createBCsusTVADto.autorisationId,
        createBCsusTVADto.numeroBonCommande,
        createBCsusTVADto.dateBonCommande,
        createBCsusTVADto.montantBonCommande || null,
        createBCsusTVADto.description || null,
        createBCsusTVADto.statut || 'ACTIF',
        createBCsusTVADto.is_active !== undefined ? createBCsusTVADto.is_active : true,
      ]
    );

    return this.toResponseDto(result[0]);
  }

  /**
   * Récupérer tous les bons de commande avec filtres optionnels
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAll(
    databaseName: string,
    autorisationId?: number,
    statut?: string,
    isActive?: boolean
  ): Promise<BCsusTVAResponseDto[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    let whereConditions = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (autorisationId) {
      whereConditions.push(`bc.autorisation_id = $${paramIndex}`);
      params.push(autorisationId);
      paramIndex++;
    }

    if (statut) {
      whereConditions.push(`bc.statut = $${paramIndex}`);
      params.push(statut);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`bc.is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const bonsCommande = await connection.query(
      `SELECT bc.*, 
              at.id as autorisation_id, at.numero_autorisation, 
              c.id as client_id, c.nom as client_nom
       FROM bcsus_tva bc
       LEFT JOIN autorisations_tva at ON bc.autorisation_id = at.id
       LEFT JOIN clients c ON at.client_id = c.id
       ${whereClause}
       ORDER BY bc.created_at DESC`,
      params
    );

    return bonsCommande.map(bc => this.toResponseDto(bc));
  }

  /**
   * Récupérer un bon de commande par ID
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findOne(databaseName: string, id: number): Promise<BCsusTVAResponseDto> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    const result = await connection.query(
      `SELECT bc.*, 
              at.id as autorisation_id, at.numero_autorisation, 
              c.id as client_id, c.nom as client_nom
       FROM bcsus_tva bc
       LEFT JOIN autorisations_tva at ON bc.autorisation_id = at.id
       LEFT JOIN clients c ON at.client_id = c.id
       WHERE bc.id = $1`,
      [id]
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`Bon de commande avec l'ID ${id} non trouvé`);
    }

    return this.toResponseDto(result[0]);
  }

  /**
   * Récupérer les bons de commande par client
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findByClient(databaseName: string, clientId: number): Promise<BCsusTVAResponseDto[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    const bonsCommande = await connection.query(
      `SELECT bc.*, 
              at.id as autorisation_id, at.numero_autorisation, 
              c.id as client_id, c.nom as client_nom
       FROM bcsus_tva bc
       LEFT JOIN autorisations_tva at ON bc.autorisation_id = at.id
       LEFT JOIN clients c ON at.client_id = c.id
       WHERE c.id = $1
       ORDER BY bc.created_at DESC`,
      [clientId]
    );

    return bonsCommande.map(bc => this.toResponseDto(bc));
  }

  /**
   * Mettre à jour un bon de commande
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async update(databaseName: string, id: number, updateBCsusTVADto: UpdateBCsusTVADto): Promise<BCsusTVAResponseDto> {
    const bonCommande = await this.findOne(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Vérifier l'unicité du numéro si modifié
    if (updateBCsusTVADto.numeroBonCommande && updateBCsusTVADto.numeroBonCommande !== bonCommande.numeroBonCommande) {
      const existingBC = await connection.query(
        `SELECT * FROM bcsus_tva WHERE numero_bon_commande = $1 AND autorisation_id = $2 AND id != $3 LIMIT 1`,
        [updateBCsusTVADto.numeroBonCommande, bonCommande.autorisationId, id]
      );

      if (existingBC && existingBC.length > 0) {
        throw new BadRequestException(`Un bon de commande avec le numéro ${updateBCsusTVADto.numeroBonCommande} existe déjà pour cette autorisation`);
      }
    }

    await connection.query(
      `UPDATE bcsus_tva 
       SET numero_bon_commande = $1, date_bon_commande = $2, montant_bon_commande = $3, 
           description = $4, statut = $5, is_active = $6, updated_at = NOW()
       WHERE id = $7`,
      [
        updateBCsusTVADto.numeroBonCommande !== undefined ? updateBCsusTVADto.numeroBonCommande : bonCommande.numeroBonCommande,
        updateBCsusTVADto.dateBonCommande !== undefined ? updateBCsusTVADto.dateBonCommande : bonCommande.dateBonCommande,
        updateBCsusTVADto.montantBonCommande !== undefined ? updateBCsusTVADto.montantBonCommande : bonCommande.montantBonCommande,
        updateBCsusTVADto.description !== undefined ? updateBCsusTVADto.description : bonCommande.description,
        updateBCsusTVADto.statut !== undefined ? updateBCsusTVADto.statut : bonCommande.statut,
        updateBCsusTVADto.is_active !== undefined ? updateBCsusTVADto.is_active : bonCommande.is_active,
        id,
      ]
    );

    return this.findOne(databaseName, id);
  }

  /**
   * Supprimer un bon de commande (soft delete)
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async remove(databaseName: string, id: number): Promise<void> {
    const bonCommande = await this.findOne(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    await connection.query(
      `UPDATE bcsus_tva SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  /**
   * Supprimer définitivement un bon de commande
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async hardDelete(databaseName: string, id: number): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(`DELETE FROM bcsus_tva WHERE id = $1`, [id]);
    
    if (!result || result.rowCount === 0) {
      throw new NotFoundException(`Bon de commande avec l'ID ${id} non trouvé`);
    }
  }

  /**
   * Obtenir les statistiques des bons de commande pour une autorisation
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async getStatsByAutorisation(databaseName: string, autorisationId: number) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const stats = await connection.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN statut = 'ACTIF' THEN 1 END) as actifs,
        COUNT(CASE WHEN statut = 'EXPIRE' THEN 1 END) as expires,
        COUNT(CASE WHEN statut = 'SUSPENDU' THEN 1 END) as suspendus,
        COUNT(CASE WHEN statut = 'ANNULE' THEN 1 END) as annules,
        SUM(CASE WHEN statut = 'ACTIF' THEN montant_bon_commande ELSE 0 END) as montantTotal
       FROM bcsus_tva
       WHERE autorisation_id = $1 AND is_active = true`,
      [autorisationId]
    );

    return {
      total: parseInt(stats[0].total) || 0,
      actifs: parseInt(stats[0].actifs) || 0,
      expires: parseInt(stats[0].expires) || 0,
      suspendus: parseInt(stats[0].suspendus) || 0,
      annules: parseInt(stats[0].annules) || 0,
      montantTotal: parseFloat(stats[0].montantTotal) || 0
    };
  }

  /**
   * Convertir une entité en DTO de réponse
   */
  private toResponseDto(bonCommande: BCsusTVA): BCsusTVAResponseDto {
    return {
      id: bonCommande.id,
      autorisationId: bonCommande.autorisation?.id,
      numeroBonCommande: bonCommande.numeroBonCommande,
      dateBonCommande: bonCommande.dateBonCommande,
      montantBonCommande: bonCommande.montantBonCommande,
      description: bonCommande.description,
      imagePath: bonCommande.imagePath,
      statut: bonCommande.statut,
      is_active: bonCommande.is_active,
      created_at: bonCommande.created_at,
      updated_at: bonCommande.updated_at,
      statusText: bonCommande.statusText,
      isValid: bonCommande.isValid,
      isExpired: bonCommande.isExpired,
      numeroAutorisationFromRelation: bonCommande.numeroAutorisationFromRelation
    };
  }
}