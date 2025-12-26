import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { TypeFraisAnnexe } from '../entities/type-frais-annexe.entity';
import { CreateTypeFraisAnnexeDto, UpdateTypeFraisAnnexeDto } from '../dto/type-frais-annexe.dto';
import { DatabaseConnectionService } from '../../common/database-connection.service';

@Injectable()
export class TypeFraisAnnexeService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Helper pour mapper les colonnes snake_case de la base vers camelCase
   */
  private mapRowToTypeFraisAnnexe(row: any): TypeFraisAnnexe {
    return {
      id: row.id,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Récupérer tous les types de frais annexes actifs
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAllActive(databaseName: string): Promise<TypeFraisAnnexe[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM type_frais_annexes WHERE is_active = true ORDER BY description ASC`
    );
    
    return results.map(row => this.mapRowToTypeFraisAnnexe(row));
  }

  /**
   * Récupérer tous les types (actifs et inactifs) - pour l'admin
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAll(databaseName: string): Promise<TypeFraisAnnexe[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM type_frais_annexes ORDER BY description ASC`
    );
    
    return results.map(row => this.mapRowToTypeFraisAnnexe(row));
  }

  /**
   * Récupérer un type par ID
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findOne(databaseName: string, id: number): Promise<TypeFraisAnnexe> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM type_frais_annexes WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!results || results.length === 0) {
      throw new NotFoundException(`Type de frais annexe avec l'ID ${id} introuvable`);
    }
    
    return this.mapRowToTypeFraisAnnexe(results[0]);
  }

  /**
   * Créer un nouveau type de frais annexe
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async create(databaseName: string, createDto: CreateTypeFraisAnnexeDto): Promise<TypeFraisAnnexe> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Vérifier si la description existe déjà
    const existing = await connection.query(
      `SELECT * FROM type_frais_annexes WHERE description = $1 LIMIT 1`,
      [createDto.description]
    );

    if (existing && existing.length > 0) {
      throw new ConflictException(
        `Un type de frais annexe avec la description "${createDto.description}" existe déjà`
      );
    }

    const results = await connection.query(
      `INSERT INTO type_frais_annexes (description, is_active) 
       VALUES ($1, $2) RETURNING *`,
      [
        createDto.description,
        createDto.isActive !== undefined ? createDto.isActive : true
      ]
    );

    return this.mapRowToTypeFraisAnnexe(results[0]);
  }

  /**
   * Mettre à jour un type de frais annexe
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async update(databaseName: string, id: number, updateDto: UpdateTypeFraisAnnexeDto): Promise<TypeFraisAnnexe> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const type = await this.findOne(databaseName, id);

    // Si on change la description, vérifier qu'elle n'existe pas déjà
    if (updateDto.description && updateDto.description !== type.description) {
      const existing = await connection.query(
        `SELECT * FROM type_frais_annexes WHERE description = $1 AND id != $2 LIMIT 1`,
        [updateDto.description, id]
      );

      if (existing && existing.length > 0) {
        throw new ConflictException(
          `Un type de frais annexe avec la description "${updateDto.description}" existe déjà`
        );
      }
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updateDto.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updateDto.description);
    }
    if (updateDto.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updateDto.isActive);
    }

    if (fields.length === 0) {
      return type;
    }

    values.push(id);
    const results = await connection.query(
      `UPDATE type_frais_annexes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return this.mapRowToTypeFraisAnnexe(results[0]);
  }

  /**
   * Désactiver un type (soft delete)
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async deactivate(databaseName: string, id: number): Promise<TypeFraisAnnexe> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await this.findOne(databaseName, id);
    
    const results = await connection.query(
      `UPDATE type_frais_annexes SET is_active = false WHERE id = $1 RETURNING *`,
      [id]
    );
    
    return this.mapRowToTypeFraisAnnexe(results[0]);
  }

  /**
   * Activer un type
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async activate(databaseName: string, id: number): Promise<TypeFraisAnnexe> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await this.findOne(databaseName, id);
    
    const results = await connection.query(
      `UPDATE type_frais_annexes SET is_active = true WHERE id = $1 RETURNING *`,
      [id]
    );
    
    return this.mapRowToTypeFraisAnnexe(results[0]);
  }

  /**
   * Supprimer définitivement un type (hard delete)
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async remove(databaseName: string, id: number): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await this.findOne(databaseName, id);
    
    await connection.query(
      `DELETE FROM type_frais_annexes WHERE id = $1`,
      [id]
    );
  }
}
