import { Injectable, NotFoundException } from '@nestjs/common';
import { Engin } from '../entities/engin.entity';
import { DatabaseConnectionService } from '../common/database-connection.service';

export interface CreateEnginDto {
  libelle: string;
  conteneurRemorque?: string;
  poidsVide?: number;
  pied?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateEnginDto {
  libelle?: string;
  conteneurRemorque?: string;
  poidsVide?: number;
  pied?: string;
  description?: string;
  isActive?: boolean;
}

export interface EnginQuery {
  search?: string;
  isActive?: boolean;
  pied?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class EnginService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Récupérer tous les engins avec pagination et filtres
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async findAll(databaseName: string, query: EnginQuery = {}) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const {
      search,
      isActive,
      pied,
      page = 1,
      limit = 50,
      sortBy = 'libelle',
      sortOrder = 'ASC'
    } = query;

    let sqlQuery = 'SELECT * FROM engin WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Filtres
    if (search) {
      sqlQuery += ` AND (libelle ILIKE $${paramIndex} OR conteneur_remorque ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (isActive !== undefined) {
      sqlQuery += ` AND is_active = $${paramIndex}`;
      params.push(isActive);
      paramIndex++;
    }

    if (pied) {
      sqlQuery += ` AND pied = $${paramIndex}`;
      params.push(pied);
      paramIndex++;
    }

    // Tri
    const validSortFields = ['libelle', 'conteneur_remorque', 'poids_vide', 'pied', 'id'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'libelle';
    sqlQuery += ` ORDER BY ${sortField} ${sortOrder}`;

    // Pagination
    const skip = (page - 1) * limit;
    sqlQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, skip);

    const items = await connection.query(sqlQuery, params);
    
    // Count total
    let countQuery = 'SELECT COUNT(*) as count FROM engin WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;
    
    if (search) {
      countQuery += ` AND (libelle ILIKE $${countParamIndex} OR conteneur_remorque ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    
    if (isActive !== undefined) {
      countQuery += ` AND is_active = $${countParamIndex}`;
      countParams.push(isActive);
      countParamIndex++;
    }
    
    if (pied) {
      countQuery += ` AND pied = $${countParamIndex}`;
      countParams.push(pied);
    }
    
    const countResult = await connection.query(countQuery, countParams);
    const total = parseInt(countResult[0].count);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer un engin par ID
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async findOne(databaseName: string, id: number): Promise<Engin> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      'SELECT * FROM engin WHERE id = $1 LIMIT 1',
      [id]
    );

    if (!results || results.length === 0) {
      throw new NotFoundException(`Engin avec l'ID ${id} non trouvé`);
    }

    return results[0];
  }

  /**
   * Récupérer tous les engins actifs (pour les selects)
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async findActive(databaseName: string): Promise<Engin[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    return connection.query(
      'SELECT * FROM engin WHERE is_active = true ORDER BY libelle ASC'
    );
  }

  /**
   * Créer un nouvel engin
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async create(databaseName: string, createEnginDto: CreateEnginDto): Promise<Engin> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `INSERT INTO engin (libelle, conteneur_remorque, poids_vide, pied, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        createEnginDto.libelle,
        createEnginDto.conteneurRemorque || null,
        createEnginDto.poidsVide || null,
        createEnginDto.pied || null,
        createEnginDto.description || null,
        createEnginDto.isActive ?? true
      ]
    );

    return results[0];
  }

  /**
   * Mettre à jour un engin
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async update(databaseName: string, id: number, updateEnginDto: UpdateEnginDto): Promise<Engin> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await this.findOne(databaseName, id);

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updateEnginDto.libelle !== undefined) {
      fields.push(`libelle = $${paramIndex}`);
      values.push(updateEnginDto.libelle);
      paramIndex++;
    }
    if (updateEnginDto.conteneurRemorque !== undefined) {
      fields.push(`conteneur_remorque = $${paramIndex}`);
      values.push(updateEnginDto.conteneurRemorque);
      paramIndex++;
    }
    if (updateEnginDto.poidsVide !== undefined) {
      fields.push(`poids_vide = $${paramIndex}`);
      values.push(updateEnginDto.poidsVide);
      paramIndex++;
    }
    if (updateEnginDto.pied !== undefined) {
      fields.push(`pied = $${paramIndex}`);
      values.push(updateEnginDto.pied);
      paramIndex++;
    }
    if (updateEnginDto.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(updateEnginDto.description);
      paramIndex++;
    }
    if (updateEnginDto.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex}`);
      values.push(updateEnginDto.isActive);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findOne(databaseName, id);
    }

    values.push(id);
    const query = `UPDATE engin SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const results = await connection.query(query, values);
    return results[0];
  }

  /**
   * Supprimer un engin (soft delete en désactivant)
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async remove(databaseName: string, id: number): Promise<Engin> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await this.findOne(databaseName, id);
    
    const results = await connection.query(
      'UPDATE engin SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    
    return results[0];
  }

  /**
   * Supprimer définitivement un engin
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async delete(databaseName: string, id: number): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      'DELETE FROM engin WHERE id = $1',
      [id]
    );
    
    if (result.affectedRows === 0) {
      throw new NotFoundException(`Engin avec l'ID ${id} non trouvé`);
    }
  }

  /**
   * Récupérer les engins par IDs
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async findByIds(databaseName: string, ids: number[]): Promise<Engin[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const query = `SELECT * FROM engin WHERE id IN (${placeholders})`;
    
    return connection.query(query, ids);
  }

  /**
   * Statistiques des engins
   * ✅ MULTI-TENANT: Utilise databaseName (isolation par base de données)
   */
  async getStats(databaseName: string) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const totalResult = await connection.query('SELECT COUNT(*) as count FROM engin');
    const total = parseInt(totalResult[0].count);
    
    const activeResult = await connection.query('SELECT COUNT(*) as count FROM engin WHERE is_active = true');
    const active = parseInt(activeResult[0].count);
    
    const inactive = total - active;

    // Grouper par pied
    const byPied = await connection.query(
      `SELECT pied, COUNT(*) as count 
       FROM engin 
       WHERE is_active = true 
       GROUP BY pied 
       ORDER BY count DESC`
    );

    return {
      total,
      active,
      inactive,
      byPied: byPied.map(item => ({
        pied: item.pied || 'Non défini',
        count: parseInt(item.count)
      }))
    };
  }
}