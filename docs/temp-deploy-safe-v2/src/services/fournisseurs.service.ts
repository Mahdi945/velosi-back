import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Fournisseur } from '../entities/fournisseur.entity';
import { CreateFournisseurDto } from '../dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from '../dto/update-fournisseur.dto';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable()
export class FournisseursService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Helper pour mapper les colonnes snake_case de la base vers camelCase
   */
  private mapRowToFournisseur(row: any): Fournisseur {
    return {
      id: row.id,
      code: row.code,
      nom: row.nom,
      typeFournisseur: row.type_fournisseur,
      categorie: row.categorie,
      activite: row.activite,
      natureIdentification: row.nature_identification,
      numeroIdentification: row.numero_identification,
      codeFiscal: row.code_fiscal,
      typeMf: row.type_mf,
      adresse: row.adresse,
      adresse2: row.adresse2,
      adresse3: row.adresse3,
      ville: row.ville,
      codePostal: row.code_postal,
      pays: row.pays,
      nomContact: row.nom_contact,
      telephone: row.telephone,
      fax: row.fax,
      email: row.email,
      ribIban: row.rib_iban,
      swift: row.swift,
      adresseBanque: row.adresse_banque,
      codePaysPayeur: row.code_pays_payeur,
      modalitePaiement: row.modalite_paiement,
      delaiPaiement: row.delai_paiement,
      timbreFiscal: row.timbre_fiscal,
      estFournisseurMarchandise: row.est_fournisseur_marchandise,
      aChargeFixe: row.a_charge_fixe,
      compteComptable: row.compte_comptable,
      logo: row.logo,
      notes: row.notes,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async create(databaseName: string, createFournisseurDto: CreateFournisseurDto): Promise<Fournisseur> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      // Générer le code si non fourni
      const code = createFournisseurDto.code || await this.generateFournisseurCode(databaseName);

      // Vérifier si le code existe déjà
      const existingFournisseur = await connection.query(
        `SELECT * FROM fournisseurs WHERE code = $1 LIMIT 1`,
        [code]
      );

      if (existingFournisseur && existingFournisseur.length > 0) {
        throw new ConflictException(`Un fournisseur avec le code "${code}" existe déjà`);
      }

      const result = await connection.query(
        `INSERT INTO fournisseurs (code, nom, type_fournisseur, categorie, activite, nature_identification, 
         numero_identification, code_fiscal, type_mf, adresse, adresse2, adresse3, ville, code_postal, pays,
         telephone, fax, email, rib_iban, swift, adresse_banque, nom_contact, notes, logo, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                 $21, $22, $23, $24, $25)
         RETURNING *`,
        [
          code,
          createFournisseurDto.nom,
          createFournisseurDto.typeFournisseur || 'local',
          createFournisseurDto.categorie || 'personne_morale',
          createFournisseurDto.activite,
          createFournisseurDto.natureIdentification || 'mf',
          createFournisseurDto.numeroIdentification,
          createFournisseurDto.codeFiscal,
          createFournisseurDto.typeMf || 0,
          createFournisseurDto.adresse,
          createFournisseurDto.adresse2,
          createFournisseurDto.adresse3,
          createFournisseurDto.ville,
          createFournisseurDto.codePostal,
          createFournisseurDto.pays || 'Tunisie',
          createFournisseurDto.telephone,
          createFournisseurDto.fax,
          createFournisseurDto.email,
          createFournisseurDto.ribIban || null,
          null, // swift
          null, // adresse_banque
          createFournisseurDto.nomContact || null,
          createFournisseurDto.notes || null,
          createFournisseurDto.logo,
          createFournisseurDto.isActive !== false
        ]
      );
      return this.mapRowToFournisseur(result[0]);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la création du fournisseur');
    }
  }

  /**
   * Génère un code fournisseur unique au format FRN001, FRN002, etc.
   */
  private async generateFournisseurCode(databaseName: string): Promise<string> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const lastFournisseur = await connection.query(
      `SELECT * FROM fournisseurs WHERE code LIKE 'FRN%' ORDER BY id DESC LIMIT 1`
    );

    if (!lastFournisseur || lastFournisseur.length === 0) {
      return 'FRN001';
    }

    // Extraire le numéro du dernier code
    const match = lastFournisseur[0].code.match(/FRN(\d+)/);
    if (match) {
      const lastNumber = parseInt(match[1], 10);
      const newNumber = lastNumber + 1;
      return `FRN${newNumber.toString().padStart(3, '0')}`;
    }

    const countResult = await connection.query(`SELECT COUNT(*) as count FROM fournisseurs`);
    const count = parseInt(countResult[0].count);
    return `FRN${(count + 1).toString().padStart(3, '0')}`;
  }

  async findAll(
    databaseName: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    ville?: string,
    pays?: string,
    isActive?: boolean,
  ): Promise<{ data: Fournisseur[]; total: number; page: number; limit: number }> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    let query = `SELECT * FROM fournisseurs WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    // Filtre par statut uniquement (recherche côté client)
    if (isActive !== undefined && isActive !== null) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(isActive);
      paramIndex++;
    }
    
    query += ` ORDER BY id DESC`;
    
    const rawData = await connection.query(query, params);
    const data = rawData.map(row => this.mapRowToFournisseur(row));
    
    const totalResult = await connection.query(
      `SELECT COUNT(*) as count FROM fournisseurs WHERE ${isActive !== undefined ? 'is_active = $1' : '1=1'}`,
      isActive !== undefined ? [isActive] : []
    );
    const total = parseInt(totalResult[0].count);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(databaseName: string, id: number): Promise<Fournisseur> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const fournisseur = await connection.query(
      `SELECT * FROM fournisseurs WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!fournisseur || fournisseur.length === 0) {
      throw new NotFoundException(`Fournisseur avec l'ID ${id} non trouvé`);
    }

    return this.mapRowToFournisseur(fournisseur[0]);
  }

  async findByCode(databaseName: string, code: string): Promise<Fournisseur> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT * FROM fournisseurs WHERE code = $1 LIMIT 1`,
      [code]
    );

    if (!results || results.length === 0) {
      throw new NotFoundException(`Fournisseur avec le code "${code}" non trouvé`);
    }

    return this.mapRowToFournisseur(results[0]);
  }

  async update(databaseName: string, id: number, updateFournisseurDto: UpdateFournisseurDto): Promise<Fournisseur> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const fournisseur = await this.findOne(databaseName, id);

    // Si le code est modifié, vérifier qu'il n'existe pas déjà
    if (updateFournisseurDto.code && updateFournisseurDto.code !== fournisseur.code) {
      const existing = await connection.query(
        `SELECT * FROM fournisseurs WHERE code = $1 AND id != $2 LIMIT 1`,
        [updateFournisseurDto.code, id]
      );

      if (existing && existing.length > 0) {
        throw new ConflictException(`Un fournisseur avec le code "${updateFournisseurDto.code}" existe déjà`);
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
      'typeFournisseur': 'type_fournisseur',
      'categorie': 'categorie',
      'activite': 'activite',
      'natureIdentification': 'nature_identification',
      'numeroIdentification': 'numero_identification',
      'codeFiscal': 'code_fiscal',
      'typeMf': 'type_mf',
      'adresse': 'adresse',
      'adresse2': 'adresse2',
      'adresse3': 'adresse3',
      'ville': 'ville',
      'codePostal': 'code_postal',
      'pays': 'pays',
      'nomContact': 'nom_contact',
      'telephone': 'telephone',
      'fax': 'fax',
      'email': 'email',
      'ribIban': 'rib_iban',
      'swift': 'swift',
      'adresseBanque': 'adresse_banque',
      'codePaysPayeur': 'code_pays_payeur',
      'modalitePaiement': 'modalite_paiement',
      'delaiPaiement': 'delai_paiement',
      'timbreFiscal': 'timbre_fiscal',
      'estFournisseurMarchandise': 'est_fournisseur_marchandise',
      'aChargeFixe': 'a_charge_fixe',
      'compteComptable': 'compte_comptable',
      'logo': 'logo',
      'notes': 'notes',
      'isActive': 'is_active'
    };

    Object.keys(updateFournisseurDto).forEach((key) => {
      if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && updateFournisseurDto[key] !== undefined) {
        const dbColumnName = columnMapping[key] || key;
        fields.push(`${dbColumnName} = $${paramIndex}`);
        values.push(updateFournisseurDto[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return fournisseur;
    }

    values.push(id);
    const query = `UPDATE fournisseurs SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    
    const results = await connection.query(query, values);
    return this.mapRowToFournisseur(results[0]);
  }

  async toggleActive(databaseName: string, id: number): Promise<Fournisseur> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const fournisseur = await this.findOne(databaseName, id);
    
    const results = await connection.query(
      `UPDATE fournisseurs SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [!fournisseur.isActive, id]
    );
    
    return this.mapRowToFournisseur(results[0]);
  }

  async remove(databaseName: string, id: number): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await this.findOne(databaseName, id); // Vérifier que le fournisseur existe
    
    await connection.query(
      `DELETE FROM fournisseurs WHERE id = $1`,
      [id]
    );
  }

  async updateLogo(databaseName: string, id: number, logoUrl: string): Promise<Fournisseur> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await this.findOne(databaseName, id); // Vérifier que le fournisseur existe
    
    const results = await connection.query(
      `UPDATE fournisseurs SET logo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [logoUrl, id]
    );
    
    return this.mapRowToFournisseur(results[0]);
  }

  async getStats(databaseName: string): Promise<any> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const stats = await connection.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as actifs,
        SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactifs,
        SUM(CASE WHEN type_fournisseur = 'local' THEN 1 ELSE 0 END) as locaux,
        SUM(CASE WHEN type_fournisseur = 'etranger' THEN 1 ELSE 0 END) as etrangers
       FROM fournisseurs`
    );

    return stats[0];
  }

  async getVilles(databaseName: string): Promise<string[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT DISTINCT ville FROM fournisseurs 
       WHERE ville IS NOT NULL AND ville != '' 
       ORDER BY ville ASC`
    );

    return results.map(r => r.ville);
  }

  async getPays(databaseName: string): Promise<string[]> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const results = await connection.query(
      `SELECT DISTINCT pays FROM fournisseurs 
       WHERE pays IS NOT NULL AND pays != '' 
       ORDER BY pays ASC`
    );

    return results.map(r => r.pays);
  }
}
