import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Armateur } from '../entities/armateur.entity';
import { CreateArmateurDto } from '../dto/create-armateur.dto';
import { UpdateArmateurDto } from '../dto/update-armateur.dto';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable()
export class ArmateursService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Créer un nouvel armateur
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async create(databaseName: string, createArmateurDto: CreateArmateurDto): Promise<Armateur> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      // Générer automatiquement le code si non fourni
      let code = createArmateurDto.code;
      if (!code) {
        code = await this.generateArmateurCode(databaseName);
      }

      // Vérifier si le code existe déjà
      const existing = await connection.query(
        `SELECT * FROM armateurs WHERE code = $1 LIMIT 1`,
        [code]
      );

      if (existing && existing.length > 0) {
        throw new ConflictException(`Un armateur avec le code "${code}" existe déjà`);
      }

      const results = await connection.query(
        `INSERT INTO armateurs (code, nom, adresse, ville, pays, codepostal, 
         telephone, telephonesecondaire, fax, email, siteweb,
         logo, notes, isactive)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          code,
          createArmateurDto.nom,
          createArmateurDto.adresse || null,
          createArmateurDto.ville || null,
          createArmateurDto.pays || null,
          createArmateurDto.codePostal || null,
          createArmateurDto.telephone || null,
          createArmateurDto.telephoneSecondaire || null,
          createArmateurDto.fax || null,
          createArmateurDto.email || null,
          createArmateurDto.siteWeb || null,
          createArmateurDto.logo || null,
          createArmateurDto.notes || null,
          createArmateurDto.isActive !== undefined ? createArmateurDto.isActive : true
        ]
      );
      const row = results[0];
      return {
        id: row.id,
        code: row.code,
        nom: row.nom,
        abreviation: row.abreviation,
        adresse: row.adresse,
        ville: row.ville,
        pays: row.pays,
        codePostal: row.codepostal,
        telephone: row.telephone,
        telephoneSecondaire: row.telephonesecondaire,
        fax: row.fax,
        email: row.email,
        siteWeb: row.siteweb,
        tarif20Pieds: row.tarif20pieds,
        tarif40Pieds: row.tarif40pieds,
        tarif45Pieds: row.tarif45pieds,
        logo: row.logo,
        notes: row.notes,
        isActive: row.isactive,
        createdAt: row.createdat,
        updatedAt: row.updatedat
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la création de l\'armateur');
    }
  }

  /**
   * Génère un code armateur unique au format ARM001, ARM002, etc.
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  private async generateArmateurCode(databaseName: string): Promise<string> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Récupérer le dernier armateur créé
    const lastArmateur = await connection.query(
      `SELECT code FROM armateurs WHERE code LIKE 'ARM%' ORDER BY id DESC LIMIT 1`
    );

    if (!lastArmateur || lastArmateur.length === 0) {
      return 'ARM001';
    }

    // Extraire le numéro du dernier code
    const lastCode = lastArmateur[0].code;
    const match = lastCode.match(/ARM(\d+)/);
    
    if (match) {
      const lastNumber = parseInt(match[1], 10);
      const newNumber = lastNumber + 1;
      return `ARM${newNumber.toString().padStart(3, '0')}`;
    }

    // Si le format ne correspond pas, chercher le plus grand ID
    const countResult = await connection.query(`SELECT COUNT(*) as count FROM armateurs`);
    const count = parseInt(countResult[0].count);
    return `ARM${(count + 1).toString().padStart(3, '0')}`;
  }

  /**
   * Récupérer tous les armateurs
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
  ): Promise<{ data: Armateur[]; total: number; page: number; limit: number }> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    let whereConditions = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Filtre par statut uniquement (recherche côté client)
    if (isActive !== undefined && isActive !== null) {
      whereConditions.push(`isactive = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Compter le total
    const countQuery = `SELECT COUNT(*) as total FROM armateurs ${whereClause}`;
    const countResult = await connection.query(countQuery, params);
    const total = parseInt(countResult[0].total);

    // Récupérer les données (tous les armateurs sans pagination)
    const dataQuery = `SELECT * FROM armateurs ${whereClause} ORDER BY id DESC`;
    const rawData = await connection.query(dataQuery, params);

    // Mapper snake_case vers camelCase
    const data = rawData.map(row => ({
      id: row.id,
      code: row.code,
      nom: row.nom,
      abreviation: row.abreviation,
      adresse: row.adresse,
      ville: row.ville,
      pays: row.pays,
      codePostal: row.codepostal,
      telephone: row.telephone,
      telephoneSecondaire: row.telephonesecondaire,
      fax: row.fax,
      email: row.email,
      siteWeb: row.siteweb,
      tarif20Pieds: row.tarif20pieds,
      tarif40Pieds: row.tarif40pieds,
      tarif45Pieds: row.tarif45pieds,
      logo: row.logo,
      notes: row.notes,
      isActive: row.isactive,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Récupérer un armateur par ID
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findOne(databaseName: string, id: number): Promise<Armateur> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM armateurs WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (!results || results.length === 0) {
      throw new NotFoundException(`Armateur avec l'ID ${id} non trouvé`);
    }
    
    const row = results[0];
    return {
      id: row.id,
      code: row.code,
      nom: row.nom,
      abreviation: row.abreviation,
      adresse: row.adresse,
      ville: row.ville,
      pays: row.pays,
      codePostal: row.codepostal,
      telephone: row.telephone,
      telephoneSecondaire: row.telephonesecondaire,
      fax: row.fax,
      email: row.email,
      siteWeb: row.siteweb,
      tarif20Pieds: row.tarif20pieds,
      tarif40Pieds: row.tarif40pieds,
      tarif45Pieds: row.tarif45pieds,
      logo: row.logo,
      notes: row.notes,
      isActive: row.isactive,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }

  /**
   * Récupérer un armateur par code
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findByCode(databaseName: string, code: string): Promise<Armateur> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM armateurs WHERE code = $1 LIMIT 1`,
      [code]
    );
    
    if (!results || results.length === 0) {
      throw new NotFoundException(`Armateur avec le code ${code} non trouvé`);
    }
    
    const row = results[0];
    return {
      id: row.id,
      code: row.code,
      nom: row.nom,
      abreviation: row.abreviation,
      adresse: row.adresse,
      ville: row.ville,
      pays: row.pays,
      codePostal: row.codepostal,
      telephone: row.telephone,
      telephoneSecondaire: row.telephonesecondaire,
      fax: row.fax,
      email: row.email,
      siteWeb: row.siteweb,
      tarif20Pieds: row.tarif20pieds,
      tarif40Pieds: row.tarif40pieds,
      tarif45Pieds: row.tarif45pieds,
      logo: row.logo,
      notes: row.notes,
      isActive: row.isactive,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }

  /**
   * Mettre à jour un armateur
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async update(databaseName: string, id: number, updateArmateurDto: UpdateArmateurDto): Promise<Armateur> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const armateur = await this.findOne(databaseName, id);

    // Si le code est modifié, vérifier qu'il n'existe pas déjà
    if (updateArmateurDto.code && updateArmateurDto.code !== armateur.code) {
      const existing = await connection.query(
        `SELECT * FROM armateurs WHERE code = $1 AND id != $2 LIMIT 1`,
        [updateArmateurDto.code, id]
      );

      if (existing && existing.length > 0) {
        throw new ConflictException(`Un armateur avec le code "${updateArmateurDto.code}" existe déjà`);
      }
    }

    // Construire la requête UPDATE dynamiquement
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Mapping camelCase vers snake_case pour les colonnes de la base
    const columnMapping: Record<string, string> = {
      'code': 'code',
      'nom': 'nom',
      'abreviation': 'abreviation',
      'adresse': 'adresse',
      'ville': 'ville',
      'pays': 'pays',
      'codePostal': 'codepostal',
      'telephone': 'telephone',
      'telephoneSecondaire': 'telephonesecondaire',
      'fax': 'fax',
      'email': 'email',
      'siteWeb': 'siteweb',
      'tarif20Pieds': 'tarif20pieds',
      'tarif40Pieds': 'tarif40pieds',
      'tarif45Pieds': 'tarif45pieds',
      'logo': 'logo',
      'notes': 'notes',
      'isActive': 'isactive'
    };

    Object.keys(updateArmateurDto).forEach((key) => {
      if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && updateArmateurDto[key] !== undefined) {
        const dbColumnName = columnMapping[key] || key;
        fields.push(`${dbColumnName} = $${paramIndex}`);
        values.push(updateArmateurDto[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return armateur;
    }

    values.push(id);
    const query = `UPDATE armateurs SET ${fields.join(', ')}, updatedat = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    
    const results = await connection.query(query, values);
    const row = results[0];
    return {
      id: row.id,
      code: row.code,
      nom: row.nom,
      abreviation: row.abreviation,
      adresse: row.adresse,
      ville: row.ville,
      pays: row.pays,
      codePostal: row.codepostal,
      telephone: row.telephone,
      telephoneSecondaire: row.telephonesecondaire,
      fax: row.fax,
      email: row.email,
      siteWeb: row.siteweb,
      tarif20Pieds: row.tarif20pieds,
      tarif40Pieds: row.tarif40pieds,
      tarif45Pieds: row.tarif45pieds,
      logo: row.logo,
      notes: row.notes,
      isActive: row.isactive,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }

  /**
   * Activer/Désactiver un armateur
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async toggleActive(databaseName: string, id: number): Promise<Armateur> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const armateur = await this.findOne(databaseName, id);
    
    const results = await connection.query(
      `UPDATE armateurs SET isactive = $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [!armateur.isActive, id]
    );
    
    const row = results[0];
    return {
      id: row.id,
      code: row.code,
      nom: row.nom,
      abreviation: row.abreviation,
      adresse: row.adresse,
      ville: row.ville,
      pays: row.pays,
      codePostal: row.codepostal,
      telephone: row.telephone,
      telephoneSecondaire: row.telephonesecondaire,
      fax: row.fax,
      email: row.email,
      siteWeb: row.siteweb,
      tarif20Pieds: row.tarif20pieds,
      tarif40Pieds: row.tarif40pieds,
      tarif45Pieds: row.tarif45pieds,
      logo: row.logo,
      notes: row.notes,
      isActive: row.isactive,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }

  /**
   * Supprimer un armateur
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async remove(databaseName: string, id: number): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await this.findOne(databaseName, id);
    
    await connection.query(
      `DELETE FROM armateurs WHERE id = $1`,
      [id]
    );
  }

  /**
   * Mettre à jour le logo d'un armateur
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async updateLogo(databaseName: string, id: number, logoUrl: string): Promise<Armateur> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await this.findOne(databaseName, id);
    
    const results = await connection.query(
      `UPDATE armateurs SET logo = $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [logoUrl, id]
    );
    
    const row = results[0];
    return {
      id: row.id,
      code: row.code,
      nom: row.nom,
      abreviation: row.abreviation,
      adresse: row.adresse,
      ville: row.ville,
      pays: row.pays,
      codePostal: row.codepostal,
      telephone: row.telephone,
      telephoneSecondaire: row.telephonesecondaire,
      fax: row.fax,
      email: row.email,
      siteWeb: row.siteweb,
      tarif20Pieds: row.tarif20pieds,
      tarif40Pieds: row.tarif40pieds,
      tarif45Pieds: row.tarif45pieds,
      logo: row.logo,
      notes: row.notes,
      isActive: row.isactive,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }

  /**
   * Obtenir les statistiques des armateurs
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async getStats(databaseName: string): Promise<{
    total: number;
    actifs: number;
    inactifs: number;
    parPays: { pays: string; count: number }[];
  }> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const stats = await connection.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN isactive = true THEN 1 ELSE 0 END) as actifs,
        SUM(CASE WHEN isactive = false THEN 1 ELSE 0 END) as inactifs
       FROM armateurs`
    );

    const parPaysRaw = await connection.query(
      `SELECT pays, COUNT(*) as count
       FROM armateurs
       WHERE pays IS NOT NULL
       GROUP BY pays
       ORDER BY count DESC
       LIMIT 10`
    );

    const parPays = parPaysRaw.map(item => ({
      pays: item.pays,
      count: parseInt(item.count, 10),
    }));

    return {
      total: parseInt(stats[0].total),
      actifs: parseInt(stats[0].actifs),
      inactifs: parseInt(stats[0].inactifs),
      parPays
    };
  }

  /**
   * Obtenir la liste des villes
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async getVilles(databaseName: string): Promise<string[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT DISTINCT ville FROM armateurs 
       WHERE ville IS NOT NULL 
       ORDER BY ville ASC`
    );

    return results.map(item => item.ville);
  }

  /**
   * Obtenir la liste des pays
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async getPays(databaseName: string): Promise<string[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT DISTINCT pays FROM armateurs 
       WHERE pays IS NOT NULL 
       ORDER BY pays ASC`
    );

    return results.map(item => item.pays);
  }
}
