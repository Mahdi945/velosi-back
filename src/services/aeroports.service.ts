import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Aeroport } from '../entities/aeroport.entity';
import { CreateAeroportDto, UpdateAeroportDto } from '../dto/aeroport.dto';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable()
export class AeroportsService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Mapper les colonnes PostgreSQL (minuscules) en camelCase
   */
  private mapAeroportFromDb(dbAeroport: any): Aeroport {
    if (!dbAeroport) return dbAeroport;
    return {
      ...dbAeroport,
      isActive: dbAeroport.isactive !== undefined ? dbAeroport.isactive : dbAeroport.isActive,
      createdAt: dbAeroport.createdat || dbAeroport.createdAt,
      updatedAt: dbAeroport.updatedat || dbAeroport.updatedAt,
    };
  }

  /**
   * Créer un nouvel aéroport
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async create(databaseName: string, createAeroportDto: CreateAeroportDto): Promise<Aeroport> {
    console.log('🔍 [AeroportsService.create] Début de création:', {
      databaseName,
      dto: createAeroportDto,
    });
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    console.log('✅ [AeroportsService.create] Connexion obtenue pour:', databaseName);
    
    // Vérifier si l'abréviation existe déjà (seulement si fournie)
    if (createAeroportDto.abbreviation && createAeroportDto.abbreviation.trim() !== '') {
      const existing = await connection.query(
        `SELECT * FROM aeroports WHERE UPPER(abbreviation) = UPPER($1) LIMIT 1`,
        [createAeroportDto.abbreviation.trim()]
      );

      if (existing && existing.length > 0) {
        console.log('❌ [AeroportsService.create] Code déjà existant:', createAeroportDto.abbreviation);
        throw new ConflictException(
          `Un aéroport avec le code "${createAeroportDto.abbreviation}" existe déjà`
        );
      }
    }

    const result = await connection.query(
      `INSERT INTO aeroports (libelle, abbreviation, ville, pays, isactive, createdat, updatedat)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [
        createAeroportDto.libelle,
        createAeroportDto.abbreviation || null,
        createAeroportDto.ville || null,
        createAeroportDto.pays || null,
        createAeroportDto.isActive !== undefined ? createAeroportDto.isActive : true,
      ]
    );
    
    console.log('✅ [AeroportsService.create] Aéroport créé avec succès:', result[0]);
    return this.mapAeroportFromDb(result[0]);
  }

  /**
   * Récupérer tous les aéroports avec filtres et pagination
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAll(
    databaseName: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    ville?: string,
    pays?: string,
    isActive?: boolean,
  ): Promise<{ data: Aeroport[]; total: number; page: number; limit: number }> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    let whereConditions = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (isActive !== undefined) {
      whereConditions.push(`isactive = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    if (ville) {
      whereConditions.push(`ville ILIKE $${paramIndex}`);
      params.push(`%${ville}%`);
      paramIndex++;
    }

    if (pays) {
      whereConditions.push(`pays ILIKE $${paramIndex}`);
      params.push(`%${pays}%`);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        libelle ILIKE $${paramIndex} OR 
        abbreviation ILIKE $${paramIndex} OR 
        ville ILIKE $${paramIndex} OR 
        pays ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Compter le total
    const countQuery = `SELECT COUNT(*) as total FROM aeroports ${whereClause}`;
    const countResult = await connection.query(countQuery, params);
    const total = parseInt(countResult[0].total);

    // Récupérer les données
    const dataQuery = `
      SELECT * FROM aeroports ${whereClause}
      ORDER BY libelle ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, (page - 1) * limit);
    const data = await connection.query(dataQuery, params);

    return { 
      data: data.map(aeroport => this.mapAeroportFromDb(aeroport)), 
      total, 
      page, 
      limit 
    };
  }

  /**
   * Récupérer un aéroport par ID
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findOne(databaseName: string, id: number): Promise<Aeroport> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `SELECT * FROM aeroports WHERE id = $1`,
      [id]
    );
    
    if (!result || result.length === 0) {
      throw new NotFoundException(`Aéroport avec l'ID ${id} non trouvé`);
    }

    return this.mapAeroportFromDb(result[0]);
  }

  /**
   * Mettre à jour un aéroport
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async update(databaseName: string, id: number, updateAeroportDto: UpdateAeroportDto): Promise<Aeroport> {
    const aeroport = await this.findOne(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Si l'abréviation change, vérifier qu'elle n'existe pas déjà
    if (updateAeroportDto.abbreviation && updateAeroportDto.abbreviation.trim() !== '' && updateAeroportDto.abbreviation !== aeroport.abbreviation) {
      const existing = await connection.query(
        `SELECT * FROM aeroports WHERE UPPER(abbreviation) = UPPER($1) AND id != $2 LIMIT 1`,
        [updateAeroportDto.abbreviation.trim(), id]
      );

      if (existing && existing.length > 0) {
        throw new ConflictException(
          `Un aéroport avec le code "${updateAeroportDto.abbreviation}" existe déjà`
        );
      }
    }

    await connection.query(
      `UPDATE aeroports 
       SET libelle = $1, abbreviation = $2, ville = $3, pays = $4, 
           isactive = $5, updatedat = NOW()
       WHERE id = $6`,
      [
        updateAeroportDto.libelle !== undefined ? updateAeroportDto.libelle : aeroport.libelle,
        updateAeroportDto.abbreviation !== undefined ? updateAeroportDto.abbreviation : aeroport.abbreviation,
        updateAeroportDto.ville !== undefined ? updateAeroportDto.ville : aeroport.ville,
        updateAeroportDto.pays !== undefined ? updateAeroportDto.pays : aeroport.pays,
        updateAeroportDto.isActive !== undefined ? updateAeroportDto.isActive : aeroport.isActive,
        id,
      ]
    );

    return this.findOne(databaseName, id);
  }

  /**
   * Basculer le statut actif/inactif d'un aéroport
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async toggleActive(databaseName: string, id: number): Promise<Aeroport> {
    const aeroport = await this.findOne(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    await connection.query(
      `UPDATE aeroports SET isactive = $1, updatedat = NOW() WHERE id = $2`,
      [!aeroport.isActive, id]
    );
    
    return this.findOne(databaseName, id);
  }

  /**
   * Supprimer un aéroport
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async remove(databaseName: string, id: number): Promise<void> {
    const aeroport = await this.findOne(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    await connection.query(`DELETE FROM aeroports WHERE id = $1`, [id]);
  }

  /**
   * Récupérer tous les aéroports actifs (pour les listes déroulantes)
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAllActive(databaseName: string): Promise<Aeroport[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM aeroports WHERE isactive = true ORDER BY libelle ASC`
    );
    
    return results.map(aeroport => this.mapAeroportFromDb(aeroport));
  }

  /**
   * Récupérer tous les aéroports (actifs et inactifs) pour les listes déroulantes complètes
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAllAeroports(databaseName: string): Promise<Aeroport[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM aeroports ORDER BY libelle ASC`
    );
    
    return results.map(aeroport => this.mapAeroportFromDb(aeroport));
  }

  /**
   * Recherche rapide par code IATA/ICAO
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findByAbbreviation(databaseName: string, abbreviation: string): Promise<Aeroport | null> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `SELECT * FROM aeroports WHERE abbreviation = $1 LIMIT 1`,
      [abbreviation]
    );
    
    return result && result.length > 0 ? this.mapAeroportFromDb(result[0]) : null;
  }
}
