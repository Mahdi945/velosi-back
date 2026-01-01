import { Injectable } from '@nestjs/common';
import { Industry } from '../entities/industry.entity';
import { DatabaseConnectionService } from '../../common/database-connection.service';

@Injectable()
export class IndustryService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Récupérer tous les secteurs d'activité
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAll(databaseName: string): Promise<Industry[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT id, libelle 
       FROM industries 
       ORDER BY libelle ASC`
    );
    
    return results;
  }

  /**
   * Créer un nouveau secteur d'activité
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async create(databaseName: string, libelle: string): Promise<Industry> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Vérifier si le secteur existe déjà (case-insensitive)
    const existing = await connection.query(
      `SELECT * FROM industries WHERE LOWER(libelle) = LOWER($1) LIMIT 1`,
      [libelle.trim()]
    );

    if (existing && existing.length > 0) {
      throw new Error(`Le secteur d'activité "${libelle.trim()}" existe déjà`);
    }

    const results = await connection.query(
      `INSERT INTO industries (libelle) VALUES ($1) RETURNING *`,
      [libelle.trim()]
    );
    
    return results[0];
  }

  /**
   * Rechercher un secteur par ID
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findById(databaseName: string, id: number): Promise<Industry> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM industries WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    return results[0] || null;
  }

  /**
   * Supprimer un secteur d'activité
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async delete(databaseName: string, id: number): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    await connection.query(
      `DELETE FROM industries WHERE id = $1`,
      [id]
    );
  }
}
