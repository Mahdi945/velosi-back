import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Navire } from '../entities/navire.entity';
import { CreateNavireDto } from '../dto/create-navire.dto';
import { UpdateNavireDto } from '../dto/update-navire.dto';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable()
export class NaviresService {
  private readonly logger = new Logger(NaviresService.name);

  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Générer un code unique pour un navire
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  private async generateCode(databaseName: string): Promise<string> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      const lastNavire = await connection.query(
        `SELECT code FROM navires WHERE code LIKE 'NAV%' ORDER BY id DESC LIMIT 1`
      );

      let newNumber = 1;
      if (lastNavire && lastNavire.length > 0 && lastNavire[0].code) {
        const match = lastNavire[0].code.match(/NAV(\d+)/);
        if (match) {
          newNumber = parseInt(match[1], 10) + 1;
        }
      }

      return `NAV${newNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      this.logger.error('Erreur lors de la génération du code navire', error.stack);
      throw new InternalServerErrorException('Erreur lors de la génération du code');
    }
  }

  /**
   * Créer un nouveau navire
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async create(databaseName: string, createNavireDto: CreateNavireDto, userId?: number): Promise<Navire> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      const code = await this.generateCode(databaseName);

      const result = await connection.query(
        `INSERT INTO navires (code, libelle, nationalite, conducteur, code_omi, 
         armateur_id, statut, created_by, updated_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        [
          code,
          createNavireDto.libelle,
          createNavireDto.nationalite || null,
          createNavireDto.conducteur || null,
          createNavireDto.codeOmi || null,
          createNavireDto.armateurId || null,
          createNavireDto.statut || 'actif',
          userId || null,
          userId || null,
        ]
      );

      const savedNavire = result[0];
      this.logger.log(`Navire créé avec succès: ${savedNavire.code}`);

      // Recharger avec la relation armateur
      return this.findOne(databaseName, savedNavire.id);
    } catch (error) {
      this.logger.error('Erreur lors de la création du navire', error.stack);
      if (error.code === '23505') {
        throw new BadRequestException('Un navire avec ce code existe déjà');
      }
      throw new InternalServerErrorException('Erreur lors de la création du navire');
    }
  }

  /**
   * Récupérer tous les navires avec pagination et filtres
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAll(
    databaseName: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    statut?: string,
    armateurId?: number,
  ): Promise<{ data: Navire[]; total: number; page: number; totalPages: number }> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      const skip = (page - 1) * limit;

      let whereConditions = [];
      let params: any[] = [];
      let paramIndex = 1;

      // Filtre par statut
      if (statut) {
        whereConditions.push(`n.statut = $${paramIndex}`);
        params.push(statut);
        paramIndex++;
      }

      // Filtre par armateur
      if (armateurId) {
        whereConditions.push(`n.armateur_id = $${paramIndex}`);
        params.push(armateurId);
        paramIndex++;
      }

      // Recherche textuelle
      if (search) {
        whereConditions.push(`(
          n.libelle ILIKE $${paramIndex} OR 
          n.code ILIKE $${paramIndex} OR 
          n.nationalite ILIKE $${paramIndex} OR 
          n.conducteur ILIKE $${paramIndex} OR 
          n.code_omi ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Compter le total
      const countQuery = `SELECT COUNT(*) as total FROM navires n ${whereClause}`;
      const countResult = await connection.query(countQuery, params);
      const total = parseInt(countResult[0].total);

      // Récupérer les données avec jointure armateur
      const dataQuery = `
        SELECT n.*, 
               a.id as armateur_id, a.code as armateur_code, a.nom as armateur_nom
        FROM navires n
        LEFT JOIN armateurs a ON n.armateur_id = a.id
        ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, skip);

      const data = await connection.query(dataQuery, params);

      // Restructurer les données pour inclure l'armateur comme objet
      const formattedData = data.map((row: any) => ({
        ...row,
        armateur: row.armateur_id ? {
          id: row.armateur_id,
          code: row.armateur_code,
          nom: row.armateur_nom,
        } : null,
      }));

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Récupération de ${formattedData.length} navires (page ${page}/${totalPages})`);

      return {
        data: formattedData,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des navires', error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des navires');
    }
  }

  /**
   * Récupérer un navire par son ID
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findOne(databaseName: string, id: number): Promise<Navire> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      const result = await connection.query(
        `SELECT n.*, 
                a.id as armateur_id, a.code as armateur_code, a.nom as armateur_nom
         FROM navires n
         LEFT JOIN armateurs a ON n.armateur_id = a.id
         WHERE n.id = $1`,
        [id]
      );

      if (!result || result.length === 0) {
        throw new NotFoundException(`Navire avec l'ID ${id} non trouvé`);
      }

      const row = result[0];
      return {
        ...row,
        armateur: row.armateur_id ? {
          id: row.armateur_id,
          code: row.armateur_code,
          nom: row.armateur_nom,
        } : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la récupération du navire ${id}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération du navire');
    }
  }

  /**
   * Mettre à jour un navire
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async update(databaseName: string, id: number, updateNavireDto: UpdateNavireDto, userId?: number): Promise<Navire> {
    try {
      const navire = await this.findOne(databaseName, id);
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

      await connection.query(
        `UPDATE navires 
         SET libelle = $1, nationalite = $2, conducteur = $3, 
             code_omi = $4, armateur_id = $5, statut = $6, updated_by = $7, updated_at = NOW()
         WHERE id = $8`,
        [
          updateNavireDto.libelle !== undefined ? updateNavireDto.libelle : navire.libelle,
          updateNavireDto.nationalite !== undefined ? updateNavireDto.nationalite : navire.nationalite,
          updateNavireDto.conducteur !== undefined ? updateNavireDto.conducteur : navire.conducteur,
          updateNavireDto.codeOmi !== undefined ? updateNavireDto.codeOmi : navire.codeOmi,
          updateNavireDto.armateurId !== undefined ? updateNavireDto.armateurId : navire.armateurId,
          updateNavireDto.statut !== undefined ? updateNavireDto.statut : navire.statut,
          userId || null,
          id,
        ]
      );

      this.logger.log(`Navire ${id} mis à jour avec succès`);

      return this.findOne(databaseName, id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la mise à jour du navire ${id}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la mise à jour du navire');
    }
  }

  /**
   * Supprimer un navire
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async remove(databaseName: string, id: number): Promise<void> {
    try {
      const navire = await this.findOne(databaseName, id);
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

      await connection.query(`DELETE FROM navires WHERE id = $1`, [id]);
      this.logger.log(`Navire ${id} supprimé avec succès`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la suppression du navire ${id}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la suppression du navire');
    }
  }

  /**
   * Activer un navire
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async activate(databaseName: string, id: number, userId?: number): Promise<Navire> {
    try {
      const navire = await this.findOne(databaseName, id);
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

      await connection.query(
        `UPDATE navires SET statut = 'actif', updated_by = $1, updated_at = NOW() WHERE id = $2`,
        [userId || null, id]
      );

      this.logger.log(`Navire ${id} activé avec succès`);
      return this.findOne(databaseName, id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de l'activation du navire ${id}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de l\'activation du navire');
    }
  }

  /**
   * Désactiver un navire
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async deactivate(databaseName: string, id: number, userId?: number): Promise<Navire> {
    try {
      const navire = await this.findOne(databaseName, id);
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

      await connection.query(
        `UPDATE navires SET statut = 'inactif', updated_by = $1, updated_at = NOW() WHERE id = $2`,
        [userId || null, id]
      );

      this.logger.log(`Navire ${id} désactivé avec succès`);
      return this.findOne(databaseName, id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la désactivation du navire ${id}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la désactivation du navire');
    }
  }

  /**
   * Récupérer tous les navires actifs (pour les dropdowns)
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAllActive(databaseName: string): Promise<Navire[]> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      const data = await connection.query(
        `SELECT n.*, 
                a.id as armateur_id, a.code as armateur_code, a.nom as armateur_nom
         FROM navires n
         LEFT JOIN armateurs a ON n.armateur_id = a.id
         WHERE n.statut = 'actif'
         ORDER BY n.libelle ASC`
      );

      return data.map((row: any) => ({
        ...row,
        armateur: row.armateur_id ? {
          id: row.armateur_id,
          code: row.armateur_code,
          nom: row.armateur_nom,
        } : null,
      }));
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des navires actifs', error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des navires actifs');
    }
  }

  /**
   * Récupérer les navires par armateur
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findByArmateur(databaseName: string, armateurId: number): Promise<Navire[]> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      const data = await connection.query(
        `SELECT n.*, 
                a.id as armateur_id, a.code as armateur_code, a.nom as armateur_nom
         FROM navires n
         LEFT JOIN armateurs a ON n.armateur_id = a.id
         WHERE n.armateur_id = $1
         ORDER BY n.libelle ASC`,
        [armateurId]
      );

      return data.map((row: any) => ({
        ...row,
        armateur: row.armateur_id ? {
          id: row.armateur_id,
          code: row.armateur_code,
          nom: row.armateur_nom,
        } : null,
      }));
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des navires de l'armateur ${armateurId}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des navires');
    }
  }
}
