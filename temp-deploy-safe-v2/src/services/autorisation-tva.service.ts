import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { AutorisationTVA } from '../entities/autorisation-tva.entity';
import { BCsusTVA } from '../entities/bcsus-tva.entity';
import { 
  CreateAutorisationTVADto, 
  UpdateAutorisationTVADto, 
  CreateBonCommandeDto, 
  UpdateBonCommandeDto 
} from '../dto/tva-complete.dto';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable()
export class AutorisationTVAService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
    private configService: ConfigService,
  ) {}

  // ===========================
  // MÉTHODES POUR AUTORISATIONS TVA
  // ===========================

  /**
   * Créer une autorisation TVA
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async createAutorisationTVA(databaseName: string, createDto: CreateAutorisationTVADto): Promise<AutorisationTVA> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Vérifier que le client existe
    const client = await connection.query(
      `SELECT * FROM clients WHERE id = $1 LIMIT 1`,
      [createDto.clientId]
    );

    if (!client || client.length === 0) {
      throw new NotFoundException(`Client avec l'ID ${createDto.clientId} non trouvé`);
    }

    // Vérifier qu'il n'existe pas déjà une autorisation avec le même numéro
    const existingAutorisation = await connection.query(
      `SELECT * FROM autorisations_tva WHERE numero_autorisation = $1 AND is_active = true LIMIT 1`,
      [createDto.numeroAutorisation]
    );

    if (existingAutorisation && existingAutorisation.length > 0) {
      throw new BadRequestException(
        `Une autorisation TVA avec le numéro ${createDto.numeroAutorisation} existe déjà`
      );
    }

    const result = await connection.query(
      `INSERT INTO autorisations_tva (client_id, numero_autorisation, date_debut_validite, date_fin_validite, 
                                      date_autorisation, type_document, reference_document, statut_autorisation, 
                                      is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        createDto.clientId,
        createDto.numeroAutorisation,
        createDto.dateDebutValidite ? new Date(createDto.dateDebutValidite) : null,
        createDto.dateFinValidite ? new Date(createDto.dateFinValidite) : null,
        createDto.dateAutorisation ? new Date(createDto.dateAutorisation) : null,
        createDto.typeDocument || null,
        createDto.referenceDocument || null,
        createDto.statutAutorisation || null,
        createDto.is_active ?? true,
      ]
    );

    return result[0];
  }

  /**
   * Récupérer toutes les autorisations TVA
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAllAutorisationsTVA(databaseName: string): Promise<AutorisationTVA[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    return await connection.query(
      `SELECT at.*, c.id as client_id, c.nom as client_nom
       FROM autorisations_tva at
       LEFT JOIN clients c ON at.client_id = c.id
       WHERE at.is_active = true
       ORDER BY at.created_at DESC`
    );
  }

  /**
   * Récupérer les autorisations TVA d'un client
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAutorisationsTVAByClient(databaseName: string, clientId: number): Promise<AutorisationTVA[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    return await connection.query(
      `SELECT at.*, c.id as client_id, c.nom as client_nom
       FROM autorisations_tva at
       LEFT JOIN clients c ON at.client_id = c.id
       WHERE at.client_id = $1 AND at.is_active = true
       ORDER BY at.created_at DESC`,
      [clientId]
    );
  }

  /**
   * Récupérer une autorisation TVA par ID
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findOneAutorisationTVA(databaseName: string, id: number): Promise<AutorisationTVA> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `SELECT at.*, c.id as client_id, c.nom as client_nom
       FROM autorisations_tva at
       LEFT JOIN clients c ON at.client_id = c.id
       WHERE at.id = $1 AND at.is_active = true`,
      [id]
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`Autorisation TVA avec l'ID ${id} non trouvée`);
    }

    return result[0];
  }

  /**
   * Mettre à jour une autorisation TVA
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async updateAutorisationTVA(databaseName: string, id: number, updateDto: UpdateAutorisationTVADto): Promise<AutorisationTVA> {
    const autorisation = await this.findOneAutorisationTVA(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Vérifier l'unicité du numéro d'autorisation si modifié
    if (updateDto.numeroAutorisation && updateDto.numeroAutorisation !== autorisation.numeroAutorisation) {
      const existingAutorisation = await connection.query(
        `SELECT * FROM autorisations_tva WHERE numero_autorisation = $1 AND is_active = true AND id != $2 LIMIT 1`,
        [updateDto.numeroAutorisation, id]
      );

      if (existingAutorisation && existingAutorisation.length > 0) {
        throw new BadRequestException(
          `Une autorisation TVA avec le numéro ${updateDto.numeroAutorisation} existe déjà`
        );
      }
    }

    await connection.query(
      `UPDATE autorisations_tva 
       SET numero_autorisation = $1, date_debut_validite = $2, date_fin_validite = $3, 
           date_autorisation = $4, type_document = $5, reference_document = $6, 
           statut_autorisation = $7, is_active = $8, updated_at = NOW()
       WHERE id = $9`,
      [
        updateDto.numeroAutorisation !== undefined ? updateDto.numeroAutorisation : autorisation.numeroAutorisation,
        updateDto.dateDebutValidite !== undefined ? new Date(updateDto.dateDebutValidite) : autorisation.dateDebutValidite,
        updateDto.dateFinValidite !== undefined ? new Date(updateDto.dateFinValidite) : autorisation.dateFinValidite,
        updateDto.dateAutorisation !== undefined ? new Date(updateDto.dateAutorisation) : autorisation.dateAutorisation,
        updateDto.typeDocument !== undefined ? updateDto.typeDocument : autorisation.typeDocument,
        updateDto.referenceDocument !== undefined ? updateDto.referenceDocument : autorisation.referenceDocument,
        updateDto.statutAutorisation !== undefined ? updateDto.statutAutorisation : autorisation.statutAutorisation,
        updateDto.is_active !== undefined ? updateDto.is_active : autorisation.is_active,
        id,
      ]
    );

    return this.findOneAutorisationTVA(databaseName, id);
  }

  /**
   * Supprimer une autorisation TVA (soft delete)
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async deleteAutorisationTVA(databaseName: string, id: number): Promise<void> {
    const autorisation = await this.findOneAutorisationTVA(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    await connection.query(
      `UPDATE autorisations_tva SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  /**
   * Upload image pour une autorisation TVA
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async uploadAutorisationTVAImage(databaseName: string, id: number, imageBuffer: Buffer, originalName?: string): Promise<AutorisationTVA> {
    const autorisation = await this.findOneAutorisationTVA(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Créer le répertoire s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'uploads', 'autorisations');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const fileExtension = originalName ? path.extname(originalName) : '.jpg';
    const fileName = `autorisation-${id}-${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Sauvegarder le fichier sur disque
    fs.writeFileSync(filePath, imageBuffer);

    // Stocker le chemin relatif dans la base de données
    const relativePath = `uploads/autorisations/${fileName}`;
    await connection.query(
      `UPDATE autorisations_tva SET image_path = $1, updated_at = NOW() WHERE id = $2`,
      [relativePath, id]
    );
    
    return this.findOneAutorisationTVA(databaseName, id);
  }

  // ===========================
  // MÉTHODES POUR BONS DE COMMANDE
  // ===========================

  /**
   * Créer un bon de commande
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async createBonCommande(databaseName: string, createDto: CreateBonCommandeDto): Promise<BCsusTVA> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Vérifier que l'autorisation existe
    const autorisation = await connection.query(
      `SELECT * FROM autorisations_tva WHERE id = $1 AND is_active = true LIMIT 1`,
      [createDto.autorisationId]
    );

    if (!autorisation || autorisation.length === 0) {
      throw new NotFoundException(`Autorisation TVA avec l'ID ${createDto.autorisationId} non trouvée`);
    }

    // Vérifier qu'il n'existe pas déjà un bon de commande avec le même numéro pour cette autorisation
    const existingBonCommande = await connection.query(
      `SELECT * FROM bcsus_tva WHERE autorisation_id = $1 AND numero_bon_commande = $2 AND is_active = true LIMIT 1`,
      [createDto.autorisationId, createDto.numeroBonCommande]
    );

    if (existingBonCommande && existingBonCommande.length > 0) {
      throw new BadRequestException(
        `Un bon de commande avec le numéro ${createDto.numeroBonCommande} existe déjà pour cette autorisation`
      );
    }

    const result = await connection.query(
      `INSERT INTO bcsus_tva (autorisation_id, numero_bon_commande, date_bon_commande, 
                             montant_bon_commande, description, statut, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        createDto.autorisationId,
        createDto.numeroBonCommande,
        new Date(createDto.dateBonCommande),
        createDto.montantBonCommande || null,
        createDto.description || null,
        createDto.statut || 'ACTIF',
        createDto.is_active ?? true,
      ]
    );

    return result[0];
  }

  /**
   * Récupérer tous les bons de commande
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findAllBonsCommande(databaseName: string): Promise<BCsusTVA[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    return await connection.query(
      `SELECT bc.*, at.numero_autorisation, c.nom as client_nom
       FROM bcsus_tva bc
       LEFT JOIN autorisations_tva at ON bc.autorisation_id = at.id
       LEFT JOIN clients c ON at.client_id = c.id
       WHERE bc.is_active = true
       ORDER BY bc.created_at DESC`
    );
  }

  /**
   * Récupérer les bons de commande par autorisation
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findBonsCommandeByAutorisation(databaseName: string, autorisationId: number): Promise<BCsusTVA[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    return await connection.query(
      `SELECT bc.*, at.numero_autorisation, c.nom as client_nom
       FROM bcsus_tva bc
       LEFT JOIN autorisations_tva at ON bc.autorisation_id = at.id
       LEFT JOIN clients c ON at.client_id = c.id
       WHERE bc.autorisation_id = $1 AND bc.is_active = true
       ORDER BY bc.created_at DESC`,
      [autorisationId]
    );
  }

  /**
   * Récupérer un bon de commande par ID
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async findOneBonCommande(databaseName: string, id: number): Promise<BCsusTVA> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const result = await connection.query(
      `SELECT bc.*, at.numero_autorisation, c.nom as client_nom
       FROM bcsus_tva bc
       LEFT JOIN autorisations_tva at ON bc.autorisation_id = at.id
       LEFT JOIN clients c ON at.client_id = c.id
       WHERE bc.id = $1 AND bc.is_active = true`,
      [id]
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`Bon de commande avec l'ID ${id} non trouvé`);
    }

    return result[0];
  }

  /**
   * Mettre à jour un bon de commande
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async updateBonCommande(databaseName: string, id: number, updateDto: UpdateBonCommandeDto): Promise<BCsusTVA> {
    const bonCommande = await this.findOneBonCommande(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Vérifier l'unicité du numéro si modifié
    if (updateDto.numeroBonCommande && updateDto.numeroBonCommande !== bonCommande.numeroBonCommande) {
      // Récupérer l'autorisation_id depuis la base de données
      const bcData = await connection.query(
        `SELECT autorisation_id FROM bcsus_tva WHERE id = $1`,
        [id]
      );
      
      const autorisationId = bcData[0].autorisation_id;
      const existingBonCommande = await connection.query(
        `SELECT * FROM bcsus_tva WHERE autorisation_id = $1 AND numero_bon_commande = $2 AND is_active = true AND id != $3 LIMIT 1`,
        [autorisationId, updateDto.numeroBonCommande, id]
      );

      if (existingBonCommande && existingBonCommande.length > 0) {
        throw new BadRequestException(
          `Un bon de commande avec le numéro ${updateDto.numeroBonCommande} existe déjà pour cette autorisation`
        );
      }
    }

    await connection.query(
      `UPDATE bcsus_tva 
       SET numero_bon_commande = $1, date_bon_commande = $2, montant_bon_commande = $3, 
           description = $4, statut = $5, is_active = $6, image_path = $7, updated_at = NOW()
       WHERE id = $8`,
      [
        updateDto.numeroBonCommande !== undefined ? updateDto.numeroBonCommande : bonCommande.numeroBonCommande,
        updateDto.dateBonCommande !== undefined ? new Date(updateDto.dateBonCommande) : bonCommande.dateBonCommande,
        updateDto.montantBonCommande !== undefined ? updateDto.montantBonCommande : bonCommande.montantBonCommande,
        updateDto.description !== undefined ? updateDto.description : bonCommande.description,
        updateDto.statut !== undefined ? updateDto.statut : bonCommande.statut,
        updateDto.is_active !== undefined ? updateDto.is_active : bonCommande.is_active,
        updateDto.imagePath !== undefined ? updateDto.imagePath : bonCommande.imagePath,
        id,
      ]
    );

    return this.findOneBonCommande(databaseName, id);
  }

  /**
   * Supprimer un bon de commande (soft delete)
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async deleteBonCommande(databaseName: string, id: number): Promise<void> {
    const bonCommande = await this.findOneBonCommande(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    await connection.query(
      `UPDATE bcsus_tva SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  /**
   * Upload image pour un bon de commande
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async uploadBonCommandeImage(databaseName: string, id: number, imageBuffer: Buffer, originalName?: string): Promise<BCsusTVA> {
    const bonCommande = await this.findOneBonCommande(databaseName, id);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Créer le répertoire s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'uploads', 'bons-de-commande');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const fileExtension = originalName ? path.extname(originalName) : '.jpg';
    const fileName = `bon-commande-${id}-${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Sauvegarder le fichier sur disque
    fs.writeFileSync(filePath, imageBuffer);

    // Stocker le chemin relatif dans la base de données
    const relativePath = `uploads/bons-de-commande/${fileName}`;
    await connection.query(
      `UPDATE bcsus_tva SET image_path = $1, updated_at = NOW() WHERE id = $2`,
      [relativePath, id]
    );
    
    return this.findOneBonCommande(databaseName, id);
  }

  // ===========================
  // COMPATIBILITÉ TEMPORAIRE (DEPRECATED)
  // ===========================

  /**
   * Alias pour maintenir la compatibilité avec l'ancien code
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async createSuspensionTVA(databaseName: string, createDto: CreateBonCommandeDto): Promise<BCsusTVA> {
    return await this.createBonCommande(databaseName, {
      autorisationId: createDto.autorisationId,
      numeroBonCommande: createDto.numeroBonCommande,
      dateBonCommande: createDto.dateBonCommande,
      montantBonCommande: createDto.montantBonCommande,
      description: createDto.description,
      statut: createDto.statut,
      is_active: createDto.is_active
    });
  }

  async findAllSuspensionsTVA(databaseName: string): Promise<BCsusTVA[]> {
    return await this.findAllBonsCommande(databaseName);
  }

  async findSuspensionsTVAByClient(databaseName: string, clientId: number): Promise<BCsusTVA[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    // Trouver d'abord toutes les autorisations du client
    const autorisations = await this.findAutorisationsTVAByClient(databaseName, clientId);
    const autorisationIds = autorisations.map(a => a.id);
    
    if (autorisationIds.length === 0) {
      return [];
    }

    const placeholders = autorisationIds.map((_, i) => `$${i + 1}`).join(',');
    return await connection.query(
      `SELECT bc.*, at.numero_autorisation, c.nom as client_nom
       FROM bcsus_tva bc
       LEFT JOIN autorisations_tva at ON bc.autorisation_id = at.id
       LEFT JOIN clients c ON at.client_id = c.id
       WHERE bc.autorisation_id IN (${placeholders}) AND bc.is_active = true
       ORDER BY bc.created_at DESC`,
      autorisationIds
    );
  }

  async findOneSuspensionTVA(databaseName: string, id: number): Promise<BCsusTVA> {
    return await this.findOneBonCommande(databaseName, id);
  }

  async updateSuspensionTVA(databaseName: string, id: number, updateDto: UpdateBonCommandeDto): Promise<BCsusTVA> {
    return await this.updateBonCommande(databaseName, id, updateDto);
  }

  async deleteSuspensionTVA(databaseName: string, id: number): Promise<void> {
    return await this.deleteBonCommande(databaseName, id);
  }

  async uploadSuspensionTVAImage(databaseName: string, id: number, imageBuffer: Buffer, originalName?: string): Promise<BCsusTVA> {
    return await this.uploadBonCommandeImage(databaseName, id, imageBuffer, originalName);
  }

  // ===========================
  // MÉTHODES UTILITAIRES
  // ===========================

  /**
   * Obtenir le statut TVA d'un client
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async getClientTVAStatus(databaseName: string, clientId: number): Promise<{
    client: any;
    autorisations: AutorisationTVA[];
    bonsCommande: BCsusTVA[];
    hasValidAutorisations: boolean;
    activesAutorisations: AutorisationTVA[];
    montantTotalBonsCommande: number;
  }> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const clientResult = await connection.query(
      `SELECT * FROM clients WHERE id = $1 LIMIT 1`,
      [clientId]
    );

    if (!clientResult || clientResult.length === 0) {
      throw new NotFoundException(`Client avec l'ID ${clientId} non trouvé`);
    }

    const client = clientResult[0];
    const autorisations = await this.findAutorisationsTVAByClient(databaseName, clientId);
    const activesAutorisations = autorisations.filter(a => a.isValid);
    
    // Récupérer tous les bons de commande pour ce client
    const autorisationIds = autorisations.map(a => a.id);
    let bonsCommande = [];
    
    if (autorisationIds.length > 0) {
      const placeholders = autorisationIds.map((_, i) => `$${i + 1}`).join(',');
      bonsCommande = await connection.query(
        `SELECT bc.* FROM bcsus_tva bc
         WHERE bc.autorisation_id IN (${placeholders}) AND bc.is_active = true`,
        autorisationIds
      );
    }

    const montantTotalBonsCommande = bonsCommande
      .filter(bc => bc.statut === 'ACTIF')
      .reduce((total, bc) => total + Number(bc.montant_bon_commande || 0), 0);

    return {
      client,
      autorisations,
      bonsCommande,
      hasValidAutorisations: activesAutorisations.length > 0,
      activesAutorisations,
      montantTotalBonsCommande,
    };
  }

  /**
   * Valide la cohérence de l'état fiscal du client avec ses autorisations
   * ✅ MULTI-TENANT: Utilise databaseName
   */
  async validateClientTVACoherence(databaseName: string, clientId: number): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const status = await this.getClientTVAStatus(databaseName, clientId);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation de la cohérence
    if (status.client.etat_fiscal === 'SUSPENSION_TVA' && !status.hasValidAutorisations) {
      errors.push('Client en suspension TVA sans autorisation valide');
    }

    if (status.client.etat_fiscal === 'SUSPENSION_TVA' && status.montantTotalBonsCommande === 0) {
      warnings.push('Client en suspension TVA sans bons de commande actifs');
    }

    if (status.client.etat_fiscal !== 'SUSPENSION_TVA' && status.hasValidAutorisations) {
      warnings.push('Client non suspendu avec des autorisations TVA actives');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  // ===========================
  // MÉTHODES WRAPPER POUR COMPATIBILITÉ TYPEORM
  // ===========================
  
  /**
   * Wrapper pour getClientTVAStatus utilisant la base TypeORM configurée
   * ⚠️ DEPRECATED: Utiliser getClientTVAStatus avec databaseName explicite
   * Utilisé par les services qui utilisent encore TypeORM Repository
   */
  async getClientTVAStatusFromTypeORM(clientId: number, databaseName?: string): Promise<{
    client: any;
    autorisations: AutorisationTVA[];
    bonsCommande: BCsusTVA[];
    hasValidAutorisations: boolean;
    activesAutorisations: AutorisationTVA[];
    montantTotalBonsCommande: number;
  }> {
    if (!databaseName) {
      throw new Error('databaseName requis - pas de fallback vers velosi');
    }
    return this.getClientTVAStatus(databaseName, clientId);
  }
  
  /**
   * Wrapper pour validateClientTVACoherence utilisant la base TypeORM configurée
   * ⚠️ DEPRECATED: Utiliser validateClientTVACoherence avec databaseName explicite
   * Utilisé par les services qui utilisent encore TypeORM Repository
   */
  async validateClientTVACoherenceFromTypeORM(clientId: number, databaseName?: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    if (!databaseName) {
      throw new Error('databaseName requis - pas de fallback vers velosi');
    }
    return this.validateClientTVACoherence(databaseName, clientId);
  }
}