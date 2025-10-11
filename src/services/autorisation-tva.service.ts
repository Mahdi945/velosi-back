import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { AutorisationTVA } from '../entities/autorisation-tva.entity';
import { BCsusTVA } from '../entities/bcsus-tva.entity';
import { Client } from '../entities/client.entity';
import { 
  CreateAutorisationTVADto, 
  UpdateAutorisationTVADto, 
  CreateBonCommandeDto, 
  UpdateBonCommandeDto 
} from '../dto/tva-complete.dto';

@Injectable()
export class AutorisationTVAService {
  constructor(
    @InjectRepository(AutorisationTVA)
    private readonly autorisationTVARepository: Repository<AutorisationTVA>,
    @InjectRepository(BCsusTVA)
    private readonly bcsusTVARepository: Repository<BCsusTVA>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  // ===========================
  // MÉTHODES POUR AUTORISATIONS TVA
  // ===========================

  async createAutorisationTVA(createDto: CreateAutorisationTVADto): Promise<AutorisationTVA> {
    // Vérifier que le client existe
    const client = await this.clientRepository.findOne({
      where: { id: createDto.clientId }
    });

    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${createDto.clientId} non trouvé`);
    }

    // Vérifier qu'il n'existe pas déjà une autorisation avec le même numéro
    const existingAutorisation = await this.autorisationTVARepository.findOne({
      where: {
        numeroAutorisation: createDto.numeroAutorisation,
        is_active: true,
      },
    });

    if (existingAutorisation) {
      throw new BadRequestException(
        `Une autorisation TVA avec le numéro ${createDto.numeroAutorisation} existe déjà`
      );
    }

    const autorisation = this.autorisationTVARepository.create({
      client: client,
      numeroAutorisation: createDto.numeroAutorisation,
      dateDebutValidite: createDto.dateDebutValidite ? new Date(createDto.dateDebutValidite) : null,
      dateFinValidite: createDto.dateFinValidite ? new Date(createDto.dateFinValidite) : null,
      dateAutorisation: createDto.dateAutorisation ? new Date(createDto.dateAutorisation) : null,
      typeDocument: createDto.typeDocument,
      referenceDocument: createDto.referenceDocument,
      statutAutorisation: createDto.statutAutorisation,
      is_active: createDto.is_active ?? true
    });

    return await this.autorisationTVARepository.save(autorisation);
  }

  async findAllAutorisationsTVA(): Promise<AutorisationTVA[]> {
    return await this.autorisationTVARepository.find({
      where: { is_active: true },
      relations: ['client', 'bonsCommande'],
      order: { created_at: 'DESC' },
    });
  }

  async findAutorisationsTVAByClient(clientId: number): Promise<AutorisationTVA[]> {
    return await this.autorisationTVARepository.find({
      where: { 
        client: { id: clientId },
        is_active: true 
      },
      relations: ['client', 'bonsCommande'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneAutorisationTVA(id: number): Promise<AutorisationTVA> {
    const autorisation = await this.autorisationTVARepository.findOne({
      where: { id, is_active: true },
      relations: ['client', 'bonsCommande'],
    });

    if (!autorisation) {
      throw new NotFoundException(`Autorisation TVA avec l'ID ${id} non trouvée`);
    }

    return autorisation;
  }

  async updateAutorisationTVA(id: number, updateDto: UpdateAutorisationTVADto): Promise<AutorisationTVA> {
    const autorisation = await this.findOneAutorisationTVA(id);

    // Vérifier l'unicité du numéro d'autorisation si modifié
    if (updateDto.numeroAutorisation && updateDto.numeroAutorisation !== autorisation.numeroAutorisation) {
      const existingAutorisation = await this.autorisationTVARepository.findOne({
        where: {
          numeroAutorisation: updateDto.numeroAutorisation,
          is_active: true,
        },
      });

      if (existingAutorisation && existingAutorisation.id !== id) {
        throw new BadRequestException(
          `Une autorisation TVA avec le numéro ${updateDto.numeroAutorisation} existe déjà`
        );
      }
    }

    // Mettre à jour les champs
    if (updateDto.numeroAutorisation) autorisation.numeroAutorisation = updateDto.numeroAutorisation;
    if (updateDto.dateDebutValidite) autorisation.dateDebutValidite = new Date(updateDto.dateDebutValidite);
    if (updateDto.dateFinValidite) autorisation.dateFinValidite = new Date(updateDto.dateFinValidite);
    if (updateDto.dateAutorisation) autorisation.dateAutorisation = new Date(updateDto.dateAutorisation);
    if (updateDto.typeDocument) autorisation.typeDocument = updateDto.typeDocument;
    if (updateDto.referenceDocument) autorisation.referenceDocument = updateDto.referenceDocument;
    if (updateDto.statutAutorisation) autorisation.statutAutorisation = updateDto.statutAutorisation;
    if (typeof updateDto.is_active === 'boolean') autorisation.is_active = updateDto.is_active;

    return await this.autorisationTVARepository.save(autorisation);
  }

  async deleteAutorisationTVA(id: number): Promise<void> {
    const autorisation = await this.findOneAutorisationTVA(id);
    autorisation.is_active = false;
    await this.autorisationTVARepository.save(autorisation);
  }

  async uploadAutorisationTVAImage(id: number, imageBuffer: Buffer, originalName?: string): Promise<AutorisationTVA> {
    const autorisation = await this.findOneAutorisationTVA(id);
    
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
    autorisation.imagePath = relativePath;
    
    return await this.autorisationTVARepository.save(autorisation);
  }

  // ===========================
  // MÉTHODES POUR BONS DE COMMANDE
  // ===========================

  async createBonCommande(createDto: CreateBonCommandeDto): Promise<BCsusTVA> {
    // Vérifier que l'autorisation existe
    const autorisation = await this.autorisationTVARepository.findOne({
      where: { id: createDto.autorisationId, is_active: true }
    });

    if (!autorisation) {
      throw new NotFoundException(`Autorisation TVA avec l'ID ${createDto.autorisationId} non trouvée`);
    }

    // Vérifier qu'il n'existe pas déjà un bon de commande avec le même numéro pour cette autorisation
    const existingBonCommande = await this.bcsusTVARepository.findOne({
      where: {
        autorisation: { id: createDto.autorisationId },
        numeroBonCommande: createDto.numeroBonCommande,
        is_active: true,
      },
    });

    if (existingBonCommande) {
      throw new BadRequestException(
        `Un bon de commande avec le numéro ${createDto.numeroBonCommande} existe déjà pour cette autorisation`
      );
    }

    const bonCommande = this.bcsusTVARepository.create({
      autorisation: autorisation,
      numeroBonCommande: createDto.numeroBonCommande,
      dateBonCommande: new Date(createDto.dateBonCommande),
      montantBonCommande: createDto.montantBonCommande,
      description: createDto.description,
      statut: createDto.statut || 'ACTIF',
      is_active: createDto.is_active ?? true
    });

    return await this.bcsusTVARepository.save(bonCommande);
  }

  async findAllBonsCommande(): Promise<BCsusTVA[]> {
    return await this.bcsusTVARepository.find({
      where: { is_active: true },
      relations: ['autorisation', 'autorisation.client'],
      order: { created_at: 'DESC' },
    });
  }

  async findBonsCommandeByAutorisation(autorisationId: number): Promise<BCsusTVA[]> {
    return await this.bcsusTVARepository.find({
      where: { 
        autorisation: { id: autorisationId },
        is_active: true 
      },
      relations: ['autorisation', 'autorisation.client'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneBonCommande(id: number): Promise<BCsusTVA> {
    const bonCommande = await this.bcsusTVARepository.findOne({
      where: { id, is_active: true },
      relations: ['autorisation', 'autorisation.client'],
    });

    if (!bonCommande) {
      throw new NotFoundException(`Bon de commande avec l'ID ${id} non trouvé`);
    }

    return bonCommande;
  }

  async updateBonCommande(id: number, updateDto: UpdateBonCommandeDto): Promise<BCsusTVA> {
    const bonCommande = await this.findOneBonCommande(id);

    // Vérifier l'unicité du numéro si modifié
    if (updateDto.numeroBonCommande && updateDto.numeroBonCommande !== bonCommande.numeroBonCommande) {
      const existingBonCommande = await this.bcsusTVARepository.findOne({
        where: {
          autorisation: { id: bonCommande.autorisation.id },
          numeroBonCommande: updateDto.numeroBonCommande,
          is_active: true,
        },
      });

      if (existingBonCommande && existingBonCommande.id !== id) {
        throw new BadRequestException(
          `Un bon de commande avec le numéro ${updateDto.numeroBonCommande} existe déjà pour cette autorisation`
        );
      }
    }

    // Mettre à jour les champs
    if (updateDto.numeroBonCommande) bonCommande.numeroBonCommande = updateDto.numeroBonCommande;
    if (updateDto.dateBonCommande) bonCommande.dateBonCommande = new Date(updateDto.dateBonCommande);
    if (updateDto.montantBonCommande) bonCommande.montantBonCommande = updateDto.montantBonCommande;
    if (updateDto.description !== undefined) bonCommande.description = updateDto.description;
    if (updateDto.statut) bonCommande.statut = updateDto.statut;
    if (typeof updateDto.is_active === 'boolean') bonCommande.is_active = updateDto.is_active;
    if (updateDto.imagePath === null) bonCommande.imagePath = null; // Permet de supprimer l'image

    return await this.bcsusTVARepository.save(bonCommande);
  }

  async deleteBonCommande(id: number): Promise<void> {
    const bonCommande = await this.findOneBonCommande(id);
    bonCommande.is_active = false;
    await this.bcsusTVARepository.save(bonCommande);
  }

  async uploadBonCommandeImage(id: number, imageBuffer: Buffer, originalName?: string): Promise<BCsusTVA> {
    const bonCommande = await this.findOneBonCommande(id);
    
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
    bonCommande.imagePath = relativePath;
    
    return await this.bcsusTVARepository.save(bonCommande);
  }

  // ===========================
  // COMPATIBILITÉ TEMPORAIRE (DEPRECATED)
  // ===========================

  // Alias pour maintenir la compatibilité avec l'ancien code
  async createSuspensionTVA(createDto: CreateBonCommandeDto): Promise<BCsusTVA> {
    return await this.createBonCommande({
      autorisationId: createDto.autorisationId,
      numeroBonCommande: createDto.numeroBonCommande,
      dateBonCommande: createDto.dateBonCommande,
      montantBonCommande: createDto.montantBonCommande,
      description: createDto.description,
      statut: createDto.statut,
      is_active: createDto.is_active
    });
  }

  async findAllSuspensionsTVA(): Promise<BCsusTVA[]> {
    return await this.findAllBonsCommande();
  }

  async findSuspensionsTVAByClient(clientId: number): Promise<BCsusTVA[]> {
    // Trouver d'abord toutes les autorisations du client
    const autorisations = await this.findAutorisationsTVAByClient(clientId);
    const autorisationIds = autorisations.map(a => a.id);
    
    if (autorisationIds.length === 0) {
      return [];
    }

    return await this.bcsusTVARepository.find({
      where: { 
        autorisation: { id: In(autorisationIds) },
        is_active: true 
      },
      relations: ['autorisation', 'autorisation.client'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneSuspensionTVA(id: number): Promise<BCsusTVA> {
    return await this.findOneBonCommande(id);
  }

  async updateSuspensionTVA(id: number, updateDto: UpdateBonCommandeDto): Promise<BCsusTVA> {
    return await this.updateBonCommande(id, updateDto);
  }

  async deleteSuspensionTVA(id: number): Promise<void> {
    return await this.deleteBonCommande(id);
  }

  async uploadSuspensionTVAImage(id: number, imageBuffer: Buffer, originalName?: string): Promise<BCsusTVA> {
    return await this.uploadBonCommandeImage(id, imageBuffer, originalName);
  }

  // ===========================
  // MÉTHODES UTILITAIRES
  // ===========================

  async getClientTVAStatus(clientId: number): Promise<{
    client: Client;
    autorisations: AutorisationTVA[];
    bonsCommande: BCsusTVA[];
    hasValidAutorisations: boolean;
    activesAutorisations: AutorisationTVA[];
    montantTotalBonsCommande: number;
  }> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId }
    });

    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${clientId} non trouvé`);
    }

    const autorisations = await this.findAutorisationsTVAByClient(clientId);
    const activesAutorisations = autorisations.filter(a => a.isValid);
    
    // Récupérer tous les bons de commande pour ce client
    const autorisationIds = autorisations.map(a => a.id);
    const bonsCommande = autorisationIds.length > 0 
      ? await this.bcsusTVARepository.find({
          where: { 
            autorisation: { id: In(autorisationIds) },
            is_active: true 
          },
          relations: ['autorisation'],
        })
      : [];

    const montantTotalBonsCommande = bonsCommande
      .filter(bc => bc.statut === 'ACTIF')
      .reduce((total, bc) => total + Number(bc.montantBonCommande), 0);

    return {
      client,
      autorisations,
      bonsCommande,
      hasValidAutorisations: activesAutorisations.length > 0,
      activesAutorisations,
      montantTotalBonsCommande,
    };
  }

  // Valide la cohérence de l'état fiscal du client avec ses autorisations
  async validateClientTVACoherence(clientId: number): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const status = await this.getClientTVAStatus(clientId);
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
}