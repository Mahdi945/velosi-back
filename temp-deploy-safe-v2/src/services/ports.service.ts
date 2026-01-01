import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Port } from '../entities/port.entity';
import { CreatePortDto, UpdatePortDto } from '../dto/port.dto';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable()
export class PortsService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Mapper les colonnes PostgreSQL (minuscules) en camelCase
   */
  private mapPortFromDb(dbPort: any): Port {
    if (!dbPort) return dbPort;
    return {
      ...dbPort,
      isActive: dbPort.isactive !== undefined ? dbPort.isactive : dbPort.isActive,
      createdAt: dbPort.createdat || dbPort.createdAt,
      updatedAt: dbPort.updatedat || dbPort.updatedAt,
    };
  }

  /**
   * Créer un nouveau port
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async create(databaseName: string, createPortDto: CreatePortDto): Promise<Port> {
    console.log('🔍 [PortsService.create] Début de création:', {
      databaseName,
      dto: createPortDto,
    });
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    console.log('✅ [PortsService.create] Connexion obtenue pour:', databaseName);
    
    // Vérifier si l'abréviation existe déjà (seulement si fournie)
    if (createPortDto.abbreviation && createPortDto.abbreviation.trim() !== '') {
      const existing = await connection.query(
        `SELECT * FROM ports WHERE UPPER(abbreviation) = UPPER($1) LIMIT 1`,
        [createPortDto.abbreviation.trim()]
      );

      if (existing && existing.length > 0) {
        console.log('❌ [PortsService.create] Abréviation déjà existante:', createPortDto.abbreviation);
        throw new ConflictException(
          `Un port avec l'abréviation "${createPortDto.abbreviation}" existe déjà`
        );
      }
    }

    const result = await connection.query(
      `INSERT INTO ports (libelle, abbreviation, ville, pays, isactive, createdat, updatedat)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [
        createPortDto.libelle,
        createPortDto.abbreviation || null,
        createPortDto.ville || null,
        createPortDto.pays || null,
        createPortDto.isActive !== undefined ? createPortDto.isActive : true,
      ]
    );
    
    console.log('✅ [PortsService.create] Port créé avec succès:', result[0]);
    return this.mapPortFromDb(result[0]);
  }

  /**
   * Récupérer tous les ports avec filtres et pagination
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
  ): Promise<{ data: Port[]; total: number; page: number; limit: number }> {
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
    const countQuery = `SELECT COUNT(*) as total FROM ports ${whereClause}`;
    const countResult = await connection.query(countQuery, params);
    const total = parseInt(countResult[0].total);

    // Récupérer les données
    const dataQuery = `
      SELECT * FROM ports ${whereClause}
      ORDER BY libelle ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, (page - 1) * limit);
    const data = await connection.query(dataQuery, params);

    return { 
      data: data.map(port => this.mapPortFromDb(port)), 
      total, 
      page, 
      limit 
    };
  }

  /**
   * Récupérer un port par ID
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findOne(databaseName: string, id: number): Promise<Port> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `SELECT * FROM ports WHERE id = $1`,
      [id]
    );
    
    if (!result || result.length === 0) {
      throw new NotFoundException(`Port avec l'ID ${id} non trouvé`);
    }

    return this.mapPortFromDb(result[0]);
  }

  /**
   * Mettre à jour un port
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async update(databaseName: string, id: number, updatePortDto: UpdatePortDto): Promise<Port> {
    const port = await this.findOne(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Si l'abréviation change, vérifier qu'elle n'existe pas déjà
    if (updatePortDto.abbreviation && updatePortDto.abbreviation.trim() !== '' && updatePortDto.abbreviation !== port.abbreviation) {
      const existing = await connection.query(
        `SELECT * FROM ports WHERE UPPER(abbreviation) = UPPER($1) AND id != $2 LIMIT 1`,
        [updatePortDto.abbreviation.trim(), id]
      );

      if (existing && existing.length > 0) {
        throw new ConflictException(
          `Un port avec l'abréviation "${updatePortDto.abbreviation}" existe déjà`
        );
      }
    }

    await connection.query(
      `UPDATE ports 
       SET libelle = $1, abbreviation = $2, ville = $3, pays = $4, 
           isactive = $5, updatedat = NOW()
       WHERE id = $6`,
      [
        updatePortDto.libelle !== undefined ? updatePortDto.libelle : port.libelle,
        updatePortDto.abbreviation !== undefined ? updatePortDto.abbreviation : port.abbreviation,
        updatePortDto.ville !== undefined ? updatePortDto.ville : port.ville,
        updatePortDto.pays !== undefined ? updatePortDto.pays : port.pays,
        updatePortDto.isActive !== undefined ? updatePortDto.isActive : port.isActive,
        id,
      ]
    );

    return this.findOne(databaseName, id);
  }

  /**
   * Basculer le statut actif/inactif d'un port
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async toggleActive(databaseName: string, id: number): Promise<Port> {
    const port = await this.findOne(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    await connection.query(
      `UPDATE ports SET isactive = $1, updatedat = NOW() WHERE id = $2`,
      [!port.isActive, id]
    );
    
    return this.findOne(databaseName, id);
  }

  /**
   * Supprimer un port
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async remove(databaseName: string, id: number): Promise<void> {
    const port = await this.findOne(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    await connection.query(`DELETE FROM ports WHERE id = $1`, [id]);
  }

  /**
   * Récupérer tous les ports actifs (pour les listes déroulantes)
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAllActive(databaseName: string): Promise<Port[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM ports WHERE isactive = true ORDER BY libelle ASC`
    );
    
    return results.map(port => this.mapPortFromDb(port));
  }

  /**
   * Récupérer tous les ports (actifs et inactifs) pour les listes déroulantes complètes
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAllPorts(databaseName: string): Promise<Port[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM ports ORDER BY libelle ASC`
    );
    
    return results.map(port => this.mapPortFromDb(port));
  }

  /**
   * Recherche rapide par abréviation
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findByAbbreviation(databaseName: string, abbreviation: string): Promise<Port | null> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `SELECT * FROM ports WHERE abbreviation = $1 LIMIT 1`,
      [abbreviation]
    );
    
    return result && result.length > 0 ? this.mapPortFromDb(result[0]) : null;
  }
}
