import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between } from 'typeorm';
import { Quote, QuoteStatus } from '../entities/quote.entity';
import { QuoteItem } from '../entities/quote-item.entity';
import { Lead, LeadStatus } from '../../entities/crm/lead.entity';
import { Opportunity, OpportunityStage } from '../../entities/crm/opportunity.entity';
import { Client, EtatFiscal } from '../../entities/client.entity';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteFilterDto,
  SendQuoteDto,
  AcceptQuoteDto,
  RejectQuoteDto,
} from '../dto/quote.dto';
import { EmailService } from '../../services/email.service';
import { ClientService } from '../../services/client.service';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    @InjectRepository(QuoteItem)
    private quoteItemRepository: Repository<QuoteItem>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private emailService: EmailService,
    private clientService: ClientService,
  ) {}

  /**
   * 🎯 Générer un QR code pour la cotation
   * Contient les informations essentielles : numéro, montant, date, validité, lien de visualisation
   * Supporte localhost (dev) et production (Vercel: https://velosi-front.vercel.app)
   */
  private async generateQRCode(quote: Quote): Promise<string> {
    const QRCode = require('qrcode');
    
    // URL de visualisation publique de la cotation
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const viewLink = `${frontendUrl}/public/quote-view/${quote.id}`;

    // Données à encoder dans le QR code (format structuré pour faciliter le parsing)
    const qrData = {
      numero: quote.quoteNumber,
      titre: quote.title,
      client: quote.clientName,
      montantTTC: quote.total,
      devise: 'TND',
      dateCreation: quote.createdAt?.toISOString().split('T')[0],
      dateValidite: quote.validUntil?.toISOString().split('T')[0],
      statut: quote.status,
      lien: viewLink
    };

    // Encoder en JSON puis en base64 pour le QR code
    const qrContent = JSON.stringify(qrData);

    try {
      // Générer le QR code en base64
      const qrCodeBase64 = await QRCode.toDataURL(qrContent, {
        errorCorrectionLevel: 'H', // Haute correction d'erreur
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeBase64;
    } catch (error) {
      console.error('❌ Erreur lors de la génération du QR code:', error);
      return null;
    }
  }

  /**
   * Génère un numéro de devis unique (format: Q25/0629)
   */
  /**
   * Génère un numéro de cotation unique
   * Format: Q{Année}/{Mois}{Séquence}
   * Exemple: Q25/110001, Q25/110002, Q25/120001 (mois suivant)
   * 
   * LOGIQUE SIMPLIFIÉE:
   * 1. Chercher le dernier numéro du mois actuel dans la BDD
   * 2. Extraire sa séquence et incrémenter de 1
   * 3. Si aucun devis ce mois → commencer à 0001
   */
  /**
   * 🎯 Génère un numéro de cotation avec année/mois-séquence
   * Format: Q25/11-1, Q25/11-2, Q25/12-1, Q25/12-2...
   * La séquence redémarre à 1 chaque nouveau mois
   */
  private async generateQuoteNumber(): Promise<string> {
    try {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2); // 2 derniers chiffres de l'année (25 pour 2025)
      const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Mois sur 2 chiffres (01-12)
      
      // Chercher le dernier numéro du mois actuel
      // Format attendu: Q25/11-X où X est la séquence
      const pattern = `Q${year}/${month}-%`;
      
      const result = await this.quoteRepository
        .createQueryBuilder('quote')
        .select('quote.quoteNumber', 'quoteNumber')
        .where('quote.quoteNumber LIKE :pattern', { pattern })
        .orderBy('quote.createdAt', 'DESC')
        .limit(1)
        .getRawOne();

      let sequence = 1; // Par défaut, premier devis du mois

      if (result && result.quoteNumber) {
        // Extraire la séquence du dernier numéro (ex: "Q25/11-5" → 5)
        const match = result.quoteNumber.match(/-(\d+)$/);
        if (match) {
          sequence = parseInt(match[1], 10) + 1;
        }
      }

      const quoteNumber = `Q${year}/${month}-${sequence}`;
      console.log(`✅ [QUOTE_NUMBER] Numéro généré: ${quoteNumber} (année: ${year}, mois: ${month}, séquence: ${sequence})`);
      return quoteNumber;
    } catch (error) {
      console.error('❌ [QUOTE_NUMBER] Erreur lors de la génération:', error);
      // Fallback: utiliser timestamp si erreur
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const fallback = `Q${year}/${month}-${Date.now()}`;
      console.warn(`⚠️ [QUOTE_NUMBER] Utilisation du fallback: ${fallback}`);
      return fallback;
    }
  }

  /**
   * Calcule les totaux d'un devis
   * ✅ CORRECTION: Prend en compte le taux de conversion pour calculer en TND
   */
  private calculateTotals(quote: Quote): void {
    if (!quote.items || quote.items.length === 0) {
      quote.subtotal = 0;
      quote.taxAmount = 0;
      quote.total = 0;
      quote.freightPurchased = 0;
      quote.freightOffered = 0;
      quote.freightMargin = 0;
      quote.additionalCostsPurchased = 0;
      quote.additionalCostsOffered = 0;
      quote.totalPurchases = 0;
      quote.totalOffers = 0;
      quote.totalMargin = 0;
      return;
    }

    // Calculer le total de chaque ligne EN TND (avec conversion)
    quote.items.forEach((item) => {
      const conversionRate = (item as any).conversionRate || 1;
      
      // totalPrice en TND (converti)
      item.totalPrice = item.quantity * (item.sellingPrice || item.unitPrice) * conversionRate;
      
      // Marge en TND (converti)
      item.margin = ((item.sellingPrice || item.unitPrice) - (item.purchasePrice || 0)) * conversionRate;
      
      // Stocker aussi le total en TND pour usage dans le frontend
      (item as any).totalPriceTnd = item.totalPrice;
    });

    // Séparer fret et frais annexes
    const freightItems = quote.items.filter((item) => item.itemType === 'freight');
    const additionalItems = quote.items.filter((item) => item.itemType === 'additional_cost');

    // Calculer les totaux fret EN TND (avec conversion)
    quote.freightPurchased = freightItems.reduce((sum, item) => {
      const conversionRate = (item as any).conversionRate || 1;
      return sum + (item.quantity * (item.purchasePrice || 0) * conversionRate);
    }, 0);
    
    quote.freightOffered = freightItems.reduce((sum, item) => {
      const conversionRate = (item as any).conversionRate || 1;
      return sum + (item.quantity * (item.sellingPrice || item.unitPrice) * conversionRate);
    }, 0);
    
    quote.freightMargin = quote.freightOffered - quote.freightPurchased;

    // Calculer les totaux frais annexes EN TND (avec conversion)
    quote.additionalCostsPurchased = additionalItems.reduce((sum, item) => {
      const conversionRate = (item as any).conversionRate || 1;
      return sum + (item.quantity * (item.purchasePrice || 0) * conversionRate);
    }, 0);
    
    quote.additionalCostsOffered = additionalItems.reduce((sum, item) => {
      const conversionRate = (item as any).conversionRate || 1;
      return sum + (item.quantity * (item.sellingPrice || item.unitPrice) * conversionRate);
    }, 0);

    // Totaux généraux EN TND
    quote.totalPurchases = quote.freightPurchased + quote.additionalCostsPurchased;
    quote.totalOffers = quote.freightOffered + quote.additionalCostsOffered;
    quote.totalMargin = quote.totalOffers - quote.totalPurchases;

    // Sous-total HT (basé sur les prix de vente convertis en TND)
    quote.subtotal = quote.totalOffers;
    
    // ✅ CORRECTION MAJEURE: Calculer la TVA ligne par ligne au lieu d'une TVA globale
    // Chaque ligne peut avoir un taux de TVA différent (0%, 7%, 13%, 19%, etc.)
    quote.taxAmount = quote.items.reduce((sum, item) => {
      const conversionRate = (item as any).conversionRate || 1;
      const taxRate = (item as any).taxRate || 19;
      const isTaxable = (item as any).isTaxable !== false; // Par défaut true
      
      if (!isTaxable) return sum; // Ligne non taxable, TVA = 0
      
      // Total HT de la ligne en TND
      const lineTotal = item.quantity * (item.sellingPrice || item.unitPrice) * conversionRate;
      
      // TVA de la ligne = Total HT × (Taux TVA / 100)
      const lineTax = lineTotal * (taxRate / 100);
      
      return sum + lineTax;
    }, 0);
    
    // Total TTC = Sous-total HT + TVA totale (somme des TVA de chaque ligne)
    quote.total = quote.subtotal + quote.taxAmount;
    
    console.log('💰 [Backend] Totaux calculés en TND (TVA par ligne):', {
      quoteNumber: quote.quoteNumber,
      totalOffers: quote.totalOffers,
      taxAmount: quote.taxAmount,
      total: quote.total
    });
  }

  /**
   * Créer un nouveau devis
   */
  async create(createQuoteDto: CreateQuoteDto, userId: number): Promise<Quote> {
    try {
      // Générer le numéro de devis
      const quoteNumber = await this.generateQuoteNumber();

      // ✅ Gérer les commerciaux (nouveau système multi-commerciaux)
      let commercialIds = [];
      if (createQuoteDto.commercialIds && createQuoteDto.commercialIds.length > 0) {
        commercialIds = createQuoteDto.commercialIds;
      } else if (createQuoteDto.commercialId) {
        // Fallback: ancien système avec commercialId unique
        commercialIds = [createQuoteDto.commercialId];
      }

      // Créer le devis
      const quote = this.quoteRepository.create({
        ...createQuoteDto,
        quoteNumber,
        createdBy: userId,
        status: QuoteStatus.DRAFT,
        type: 'cotation', // ✅ Type par défaut: cotation
        taxRate: createQuoteDto.taxRate || 19.0,
        commercialIds, // ✅ Array de commerciaux
        // Garder aussi commercialId pour compatibilité (premier commercial)
        commercialId: commercialIds.length > 0 ? commercialIds[0] : undefined,
      });

      // Créer les lignes
      if (createQuoteDto.items && createQuoteDto.items.length > 0) {
        quote.items = createQuoteDto.items.map((item, index) =>
          this.quoteItemRepository.create({
            ...item,
            lineOrder: item.lineOrder || index + 1,
            // totalPrice doit utiliser sellingPrice, pas unitPrice
            totalPrice: item.quantity * (item.sellingPrice || item.unitPrice),
            itemType: item.itemType || 'freight',
          }),
        );
      }

      // Calculer les totaux
      this.calculateTotals(quote);

      // Sauvegarder
      const savedQuote = await this.quoteRepository.save(quote);

      // 🎯 Générer le QR code après la sauvegarde (on a besoin de l'ID)
      const qrCode = await this.generateQRCode(savedQuote);
      if (qrCode) {
        savedQuote.qrCodeData = qrCode;
        await this.quoteRepository.save(savedQuote);
      }

      // 🎯 SYNCHRONISATION AUTOMATIQUE: Si cotation créée depuis opportunité, 
      // déplacer l'opportunité dans la colonne "proposal"
      if (savedQuote.opportunityId) {
        await this.moveOpportunityToProposal(savedQuote.opportunityId);
      }

      return this.findOne(savedQuote.id);
    } catch (error) {
      throw new InternalServerErrorException(
        `Erreur lors de la création du devis: ${error.message}`,
      );
    }
  }

  /**
   * Récupérer tous les devis avec filtres
   * ✅ CORRECTION: Retourne UNIQUEMENT les cotations NON-ARCHIVÉES par défaut
   * Pour les archivées, utiliser findAllArchived()
   */
  async findAll(filters: QuoteFilterDto): Promise<{ data: Quote[]; total: number }> {
    const {
      status,
      opportunityId,
      leadId,
      clientId,
      commercialId,
      search,
      startDate,
      endDate,
      minTotal,
      maxTotal,
      importExport,
      paymentMethod,
      type,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    // ✅ CORRECTION: Filtrer explicitement les cotations NON-ARCHIVÉES
    console.log('🔍 Backend: Récupération des cotations NON-ARCHIVÉES uniquement');
    let queryBuilder = this.quoteRepository.createQueryBuilder('quote');
    
    // ✅ FILTRE ESSENTIEL: Exclure les archivées
    queryBuilder.where('(quote.isArchived = false OR quote.isArchived IS NULL)');
    queryBuilder.andWhere('quote.deletedAt IS NULL');
    
    // Joindre les relations nécessaires
    queryBuilder
      .leftJoinAndSelect('quote.items', 'items')
      .leftJoinAndSelect('quote.creator', 'creator')
      .leftJoinAndSelect('quote.commercial', 'commercial')
      .leftJoinAndSelect('quote.opportunity', 'opportunity')
      .leftJoinAndSelect('quote.lead', 'lead')
      .leftJoinAndSelect('quote.client', 'client')
      .leftJoinAndSelect('quote.approver', 'approver')
      .leftJoinAndSelect('quote.armateur', 'armateur')
      .leftJoinAndSelect('quote.navire', 'navire')
      .leftJoinAndSelect('quote.portEnlevement', 'portEnlevement')
      .leftJoinAndSelect('quote.portLivraison', 'portLivraison')
      .leftJoinAndSelect('quote.aeroportEnlevement', 'aeroportEnlevement')
      .leftJoinAndSelect('quote.aeroportLivraison', 'aeroportLivraison');

    // Appliquer les filtres
    if (status) queryBuilder.andWhere('quote.status = :status', { status });
    if (opportunityId) queryBuilder.andWhere('quote.opportunityId = :opportunityId', { opportunityId });
    if (leadId) queryBuilder.andWhere('quote.leadId = :leadId', { leadId });
    if (clientId) queryBuilder.andWhere('quote.clientId = :clientId', { clientId });
    
    // ✅ CORRECTION: Filtrage commercial multi-système
    // Prendre en compte commercialId ET commercialIds (nouveau système)
    if (commercialId) {
      queryBuilder.andWhere(
        '(quote.commercialId = :commercialId OR :commercialId = ANY(quote.commercial_ids) OR (quote.commercialId IS NULL AND (quote.commercial_ids IS NULL OR array_length(quote.commercial_ids, 1) IS NULL)))',
        { commercialId }
      );
    }

    // Recherche dynamique dans plusieurs champs
    if (search) {
      queryBuilder.andWhere(
        '(quote.quoteNumber LIKE :search OR ' +
        'LOWER(quote.clientName) LIKE LOWER(:search) OR ' +
        'LOWER(quote.clientCompany) LIKE LOWER(:search) OR ' +
        'LOWER(quote.title) LIKE LOWER(:search) OR ' +
        'LOWER(quote.clientEmail) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    // Filtres de dates
    if (startDate && endDate) {
      queryBuilder.andWhere('quote.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // Filtre par montant total TTC
    if (minTotal !== undefined) {
      queryBuilder.andWhere('quote.total >= :minTotal', { minTotal });
    }
    if (maxTotal !== undefined) {
      queryBuilder.andWhere('quote.total <= :maxTotal', { maxTotal });
    }

    // Filtre par import/export
    if (importExport) {
      queryBuilder.andWhere('quote.import_export = :importExport', { importExport });
    }

    // Filtre par mode de paiement
    if (paymentMethod) {
      queryBuilder.andWhere('quote.payment_method = :paymentMethod', { paymentMethod });
    }

    // Filtre par type (cotation / fiche_dossier)
    if (type) {
      queryBuilder.andWhere('quote.type = :type', { type });
    }

    // Tri et pagination
    queryBuilder
      .orderBy(`quote.${sortBy}`, sortOrder as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // ✅ Charger les commerciaux assignés pour toutes les cotations
    if (data && data.length > 0) {
      const { Personnel } = await import('../../entities/personnel.entity');
      const personnelRepo = this.quoteRepository.manager.getRepository(Personnel);
      
      for (const quote of data) {
        if (quote.commercialIds && quote.commercialIds.length > 0) {
          const fullPersonnel = await personnelRepo.findByIds(quote.commercialIds);
          // ✅ CORRECTION: Sérialiser pour éviter les conflits avec les propriétés first_*, last_*
          quote.assignedCommercials = fullPersonnel.map(p => ({
            id: p.id,
            nom: p.nom,
            prenom: p.prenom,
            nom_utilisateur: p.nom_utilisateur,
            email: p.email,
            telephone: p.telephone,
            role: p.role
          })) as any;
        }
      }
    }

    console.log(`✅ Backend retourne ${data.length} cotations NON-ARCHIVÉES (total: ${total})`);
    return { data, total };
  }

  /**
   * 📋 Récupérer UNIQUEMENT les cotations archivées avec filtres
   * ✅ NOUVELLE MÉTHODE pour séparer les archivées des non-archivées
   */
  async findAllArchived(filters?: QuoteFilterDto) {
    const {
      status,
      commercialId,
      search,
      startDate,
      endDate,
      type,
      page = 1,
      limit = 25,
      sortBy = 'deletedAt',
      sortOrder = 'DESC',
    } = filters || {};

    console.log('🗄️ Backend: Récupération des cotations ARCHIVÉES uniquement');

    const query = this.quoteRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.lead', 'lead')
      .leftJoinAndSelect('quote.opportunity', 'opportunity')
      .leftJoinAndSelect('quote.client', 'client')
      .leftJoinAndSelect('quote.creator', 'creator')
      .leftJoinAndSelect('quote.commercial', 'commercial')
      .leftJoinAndSelect('quote.items', 'items')
      .withDeleted() // ✅ Inclure les soft-deleted
      .where('quote.deleted_at IS NOT NULL'); // ✅ Filtrer uniquement les archivées

    // Appliquer les filtres optionnels
    // ✅ CORRECTION: Filtrage commercial multi-système pour les archivées
    if (commercialId) {
      query.andWhere(
        '(quote.commercialId = :commercialId OR :commercialId = ANY(quote.commercial_ids) OR (quote.commercialId IS NULL AND (quote.commercial_ids IS NULL OR array_length(quote.commercial_ids, 1) IS NULL)))',
        { commercialId }
      );
    }

    if (status) {
      query.andWhere('quote.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(quote.quoteNumber LIKE :search OR ' +
        'LOWER(quote.clientName) LIKE LOWER(:search) OR ' +
        'LOWER(quote.clientCompany) LIKE LOWER(:search) OR ' +
        'LOWER(quote.title) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    if (startDate && endDate) {
      query.andWhere('quote.deletedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // Filtre par type (cotation / fiche_dossier)
    if (type) {
      query.andWhere('quote.type = :type', { type });
    }

    // Pagination et tri
    query
      .orderBy(`quote.${sortBy}`, sortOrder as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    // ✅ Charger les commerciaux assignés pour toutes les cotations archivées
    if (data && data.length > 0) {
      const { Personnel } = await import('../../entities/personnel.entity');
      const personnelRepo = this.quoteRepository.manager.getRepository(Personnel);
      
      for (const quote of data) {
        if (quote.commercialIds && quote.commercialIds.length > 0) {
          const fullPersonnel = await personnelRepo.findByIds(quote.commercialIds);
          // ✅ CORRECTION: Sérialiser pour éviter les conflits avec les propriétés first_*, last_*
          quote.assignedCommercials = fullPersonnel.map(p => ({
            id: p.id,
            nom: p.nom,
            prenom: p.prenom,
            nom_utilisateur: p.nom_utilisateur,
            email: p.email,
            telephone: p.telephone,
            role: p.role
          })) as any;
        }
      }
    }

    console.log(`✅ Backend retourne ${data.length} cotations ARCHIVÉES (total: ${total})`);
    return { data, total };
  }

  /**
   * Récupérer un devis par ID
   * ✅ CORRECTION: Charger les commerciaux assignés depuis commercialIds
   */
  async findOne(id: number): Promise<Quote> {
    const quote = await this.quoteRepository.findOne({
      where: { id },
      relations: [
        'items',
        'creator',
        'commercial',
        'opportunity',
        'lead',
        'client',
        'approver',
        'activities',
        'armateur',
        'navire',
        'portEnlevement',
        'portLivraison',
        'aeroportEnlevement',
        'aeroportLivraison',
      ],
    });

    if (!quote) {
      throw new NotFoundException(`Devis avec l'ID ${id} introuvable`);
    }

    // ✅ Charger les commerciaux assignés depuis commercialIds
    if (quote.commercialIds && quote.commercialIds.length > 0) {
      const { Repository } = await import('typeorm');
      const { Personnel } = await import('../../entities/personnel.entity');
      const { InjectRepository } = await import('@nestjs/typeorm');
      
      // Utiliser le repository pour charger les commerciaux
      const personnelRepo = this.quoteRepository.manager.getRepository(Personnel);
      const fullPersonnel = await personnelRepo.findByIds(quote.commercialIds);
      
      // ✅ CORRECTION: Sérialiser pour éviter les conflits avec les propriétés first_*, last_*
      quote.assignedCommercials = fullPersonnel.map(p => ({
        id: p.id,
        nom: p.nom,
        prenom: p.prenom,
        nom_utilisateur: p.nom_utilisateur,
        email: p.email,
        telephone: p.telephone,
        role: p.role
      })) as any;
      
      console.log(`✅ ${quote.assignedCommercials.length} commerciaux chargés pour cotation ${quote.quoteNumber}`);
    }

    // ✅ Trier les items par ID croissant pour garantir l'ordre d'affichage
    if (quote.items && quote.items.length > 0) {
      quote.items.sort((a, b) => (a.id || 0) - (b.id || 0));
      console.log(`✅ Items triés par ID croissant pour cotation ${quote.quoteNumber}`);
    }

    return quote;
  }

  /**
   * Récupérer un devis par numéro
   */
  async findByQuoteNumber(quoteNumber: string): Promise<Quote> {
    const quote = await this.quoteRepository.findOne({
      where: { quoteNumber },
      relations: [
        'items',
        'creator',
        'commercial',
        'opportunity',
        'lead',
        'client',
        'approver',
        'armateur',
        'navire',
        'portEnlevement',
        'portLivraison',
        'aeroportEnlevement',
        'aeroportLivraison',
      ],
    });

    if (!quote) {
      throw new NotFoundException(`Devis ${quoteNumber} introuvable`);
    }

    // ✅ Trier les items par lineOrder croissant pour garantir l'ordre de présentation
    if (quote.items && quote.items.length > 0) {
      quote.items.sort((a, b) => (a.lineOrder || 0) - (b.lineOrder || 0));
      console.log(`✅ Items triés par lineOrder croissant pour cotation ${quoteNumber}`);
    }

    // ✅ Trier les items par ID croissant pour garantir l'ordre d'affichage
    if (quote.items && quote.items.length > 0) {
      quote.items.sort((a, b) => (a.id || 0) - (b.id || 0));
      console.log(`✅ Items triés par ID croissant pour cotation ${quote.quoteNumber}`);
    }

    return quote;
  }

  /**
   * Mettre à jour un devis
   * ✅ CORRECTION: Gérer la mise à jour des commerciaux multi-assignés
   */
  async update(id: number, updateQuoteDto: UpdateQuoteDto): Promise<Quote> {
    const quote = await this.findOne(id);

    console.log('🔄 [UPDATE] Données reçues pour mise à jour:', {
      id,
      leadId: updateQuoteDto.leadId,
      opportunityId: updateQuoteDto.opportunityId,
      clientId: updateQuoteDto.clientId,
      commercialIds: updateQuoteDto.commercialIds,
      commercialId: updateQuoteDto.commercialId,
      armateurId: updateQuoteDto.armateurId,
      navireId: updateQuoteDto.navireId,
      portEnlevementId: updateQuoteDto.portEnlevementId,
      portLivraisonId: updateQuoteDto.portLivraisonId,
      aeroportEnlevementId: updateQuoteDto.aeroportEnlevementId,
      aeroportLivraisonId: updateQuoteDto.aeroportLivraisonId,
      hbl: updateQuoteDto.hbl,
      mbl: updateQuoteDto.mbl,
      condition: updateQuoteDto.condition,
    });

    // Vérifier que le devis peut être modifié
    // ✅ EXCEPTION: Les fiches dossier (type='fiche_dossier') peuvent toujours être modifiées
    const isFicheDossier = quote.type === 'fiche_dossier';
    if (!isFicheDossier && [QuoteStatus.ACCEPTED, QuoteStatus.EXPIRED, QuoteStatus.CANCELLED].includes(quote.status)) {
      throw new BadRequestException(
        `Impossible de modifier un devis avec le statut ${quote.status}`,
      );
    }

    // ✅ Gérer la mise à jour des commerciaux (nouveau système multi-commerciaux)
    if (updateQuoteDto.commercialIds && updateQuoteDto.commercialIds.length > 0) {
      quote.commercialIds = updateQuoteDto.commercialIds;
      quote.commercialId = updateQuoteDto.commercialIds[0]; // Premier commercial pour compatibilité
      console.log(`✅ ${updateQuoteDto.commercialIds.length} commerciaux assignés`);
    } else if (updateQuoteDto.commercialId) {
      // Fallback: ancien système avec commercialId unique
      quote.commercialIds = [updateQuoteDto.commercialId];
      quote.commercialId = updateQuoteDto.commercialId;
      console.log(`✅ 1 commercial assigné (ancien système)`);
    }

    // 🎯 FIX CRITIQUE: Décharger les relations TypeORM AVANT d'assigner les nouveaux IDs
    // TypeORM peut réinitialiser les IDs de clés étrangères lors de la sauvegarde si les objets relation sont chargés
    // On doit donc les mettre à undefined pour forcer TypeORM à utiliser les IDs numériques
    if ('leadId' in updateQuoteDto) {
      quote.lead = undefined;
      quote.leadId = updateQuoteDto.leadId;
      console.log('🔧 [UPDATE] Déchargement relation lead + assignation leadId:', updateQuoteDto.leadId);
    }
    if ('opportunityId' in updateQuoteDto) {
      quote.opportunity = undefined;
      quote.opportunityId = updateQuoteDto.opportunityId;
      console.log('🔧 [UPDATE] Déchargement relation opportunity + assignation opportunityId:', updateQuoteDto.opportunityId);
    }
    if ('clientId' in updateQuoteDto) {
      quote.client = undefined;
      quote.clientId = updateQuoteDto.clientId;
      console.log('🔧 [UPDATE] Déchargement relation client + assignation clientId:', updateQuoteDto.clientId);
    }

    // 🆕 FIX: Décharger les relations de transport (armateur, navire, ports, aéroports)
    if ('armateurId' in updateQuoteDto) {
      quote.armateur = undefined;
      quote.armateurId = updateQuoteDto.armateurId;
      console.log('🔧 [UPDATE] Déchargement relation armateur + assignation armateurId:', updateQuoteDto.armateurId);
    }
    if ('navireId' in updateQuoteDto) {
      quote.navire = undefined;
      quote.navireId = updateQuoteDto.navireId;
      console.log('🔧 [UPDATE] Déchargement relation navire + assignation navireId:', updateQuoteDto.navireId);
    }
    if ('portEnlevementId' in updateQuoteDto) {
      quote.portEnlevement = undefined;
      quote.portEnlevementId = updateQuoteDto.portEnlevementId;
      console.log('🔧 [UPDATE] Déchargement relation portEnlevement + assignation portEnlevementId:', updateQuoteDto.portEnlevementId);
    }
    if ('portLivraisonId' in updateQuoteDto) {
      quote.portLivraison = undefined;
      quote.portLivraisonId = updateQuoteDto.portLivraisonId;
      console.log('🔧 [UPDATE] Déchargement relation portLivraison + assignation portLivraisonId:', updateQuoteDto.portLivraisonId);
    }
    if ('aeroportEnlevementId' in updateQuoteDto) {
      quote.aeroportEnlevement = undefined;
      quote.aeroportEnlevementId = updateQuoteDto.aeroportEnlevementId;
      console.log('🔧 [UPDATE] Déchargement relation aeroportEnlevement + assignation aeroportEnlevementId:', updateQuoteDto.aeroportEnlevementId);
    }
    if ('aeroportLivraisonId' in updateQuoteDto) {
      quote.aeroportLivraison = undefined;
      quote.aeroportLivraisonId = updateQuoteDto.aeroportLivraisonId;
      console.log('🔧 [UPDATE] Déchargement relation aeroportLivraison + assignation aeroportLivraisonId:', updateQuoteDto.aeroportLivraisonId);
    }

    // Mettre à jour les champs principaux (SAUF les IDs de relation qui sont déjà traités)
    const { 
      leadId, 
      opportunityId, 
      clientId, 
      armateurId, 
      navireId, 
      portEnlevementId, 
      portLivraisonId, 
      aeroportEnlevementId, 
      aeroportLivraisonId,
      ...otherFields 
    } = updateQuoteDto;
    Object.assign(quote, otherFields);
    
    console.log('✅ [UPDATE] Quote après Object.assign:', {
      leadId: quote.leadId,
      opportunityId: quote.opportunityId,
      clientId: quote.clientId,
      commercialIds: quote.commercialIds,
      armateurId: quote.armateurId,
      navireId: quote.navireId,
      portEnlevementId: quote.portEnlevementId,
      portLivraisonId: quote.portLivraisonId,
      aeroportEnlevementId: quote.aeroportEnlevementId,
      aeroportLivraisonId: quote.aeroportLivraisonId,
      hbl: quote.hbl,
      mbl: quote.mbl,
      condition: quote.condition,
    });

    // Mettre à jour les lignes si fournies
    if (updateQuoteDto.items) {
      // Supprimer les anciennes lignes
      await this.quoteItemRepository.delete({ quoteId: id });

      // Créer les nouvelles lignes
      quote.items = updateQuoteDto.items.map((item, index) =>
        this.quoteItemRepository.create({
          ...item,
          quoteId: id,
          lineOrder: item.lineOrder || index + 1,
          // totalPrice doit utiliser sellingPrice, pas unitPrice
          totalPrice: item.quantity * (item.sellingPrice || item.unitPrice),
          itemType: item.itemType || 'freight',
        }),
      );
    }

    // Recalculer les totaux
    this.calculateTotals(quote);

    console.log('💾 [UPDATE] Quote avant save:', {
      id: quote.id,
      leadId: quote.leadId,
      opportunityId: quote.opportunityId,
      clientId: quote.clientId,
      commercialIds: quote.commercialIds,
      armateurId: quote.armateurId,
      navireId: quote.navireId,
      portEnlevementId: quote.portEnlevementId,
      portLivraisonId: quote.portLivraisonId,
      aeroportEnlevementId: quote.aeroportEnlevementId,
      aeroportLivraisonId: quote.aeroportLivraisonId,
      hbl: quote.hbl,
      mbl: quote.mbl,
      condition: quote.condition,
    });

    // Sauvegarder
    const updatedQuote = await this.quoteRepository.save(quote);

    // 🎯 FIX CRITIQUE: TOUJOURS forcer la mise à jour des IDs de liaison via UPDATE direct
    // TypeORM ne détecte pas toujours les changements sur ces colonnes quand les relations sont chargées
    // ✅ IMPORTANT: On force la mise à jour MÊME si la valeur est null pour réinitialiser correctement
    const updateData: any = {};
    
    // ✅ CORRECTION: Vérifier si la propriété existe dans le DTO (même si null/undefined)
    // On ne peut pas utiliser hasOwnProperty car class-transformer modifie l'objet
    // On vérifie plutôt si la propriété n'est pas undefined (null est valide)
    if ('leadId' in updateQuoteDto) {
      updateData.leadId = updateQuoteDto.leadId;
      console.log('🔧 [UPDATE] Forçage leadId:', updateQuoteDto.leadId, '(type:', typeof updateQuoteDto.leadId, ')');
    }
    if ('opportunityId' in updateQuoteDto) {
      updateData.opportunityId = updateQuoteDto.opportunityId;
      console.log('🔧 [UPDATE] Forçage opportunityId:', updateQuoteDto.opportunityId, '(type:', typeof updateQuoteDto.opportunityId, ')');
    }
    if ('clientId' in updateQuoteDto) {
      updateData.clientId = updateQuoteDto.clientId;
      console.log('🔧 [UPDATE] Forçage clientId:', updateQuoteDto.clientId, '(type:', typeof updateQuoteDto.clientId, ')');
    }

    // 🆕 FIX: Forcer aussi les champs de transport
    if ('armateurId' in updateQuoteDto) {
      updateData.armateurId = updateQuoteDto.armateurId;
      console.log('🔧 [UPDATE] Forçage armateurId:', updateQuoteDto.armateurId, '(type:', typeof updateQuoteDto.armateurId, ')');
    }
    if ('navireId' in updateQuoteDto) {
      updateData.navireId = updateQuoteDto.navireId;
      console.log('🔧 [UPDATE] Forçage navireId:', updateQuoteDto.navireId, '(type:', typeof updateQuoteDto.navireId, ')');
    }
    if ('portEnlevementId' in updateQuoteDto) {
      updateData.portEnlevementId = updateQuoteDto.portEnlevementId;
      console.log('🔧 [UPDATE] Forçage portEnlevementId:', updateQuoteDto.portEnlevementId, '(type:', typeof updateQuoteDto.portEnlevementId, ')');
    }
    if ('portLivraisonId' in updateQuoteDto) {
      updateData.portLivraisonId = updateQuoteDto.portLivraisonId;
      console.log('🔧 [UPDATE] Forçage portLivraisonId:', updateQuoteDto.portLivraisonId, '(type:', typeof updateQuoteDto.portLivraisonId, ')');
    }
    if ('aeroportEnlevementId' in updateQuoteDto) {
      updateData.aeroportEnlevementId = updateQuoteDto.aeroportEnlevementId;
      console.log('🔧 [UPDATE] Forçage aeroportEnlevementId:', updateQuoteDto.aeroportEnlevementId, '(type:', typeof updateQuoteDto.aeroportEnlevementId, ')');
    }
    if ('aeroportLivraisonId' in updateQuoteDto) {
      updateData.aeroportLivraisonId = updateQuoteDto.aeroportLivraisonId;
      console.log('🔧 [UPDATE] Forçage aeroportLivraisonId:', updateQuoteDto.aeroportLivraisonId, '(type:', typeof updateQuoteDto.aeroportLivraisonId, ')');
    }
    if ('hbl' in updateQuoteDto) {
      updateData.hbl = updateQuoteDto.hbl;
      console.log('🔧 [UPDATE] Forçage hbl:', updateQuoteDto.hbl);
    }
    if ('mbl' in updateQuoteDto) {
      updateData.mbl = updateQuoteDto.mbl;
      console.log('🔧 [UPDATE] Forçage mbl:', updateQuoteDto.mbl);
    }
    if ('condition' in updateQuoteDto) {
      updateData.condition = updateQuoteDto.condition;
      console.log('🔧 [UPDATE] Forçage condition:', updateQuoteDto.condition);
    }
    
    // ✅ TOUJOURS exécuter l'UPDATE si au moins un ID est présent
    if (Object.keys(updateData).length > 0) {
      console.log('💾 [UPDATE] Exécution UPDATE SQL direct avec:', updateData);
      await this.quoteRepository.update(id, updateData);
      console.log('✅ [UPDATE] IDs mis à jour via UPDATE SQL direct');
      
      // Recharger pour avoir les bonnes valeurs
      const finalQuote = await this.quoteRepository.findOne({ where: { id } });
      console.log('✨ [UPDATE] Valeurs finales après UPDATE:', {
        leadId: finalQuote.leadId,
        opportunityId: finalQuote.opportunityId,
        clientId: finalQuote.clientId,
        armateurId: finalQuote.armateurId,
        navireId: finalQuote.navireId,
        portEnlevementId: finalQuote.portEnlevementId,
        portLivraisonId: finalQuote.portLivraisonId,
        aeroportEnlevementId: finalQuote.aeroportEnlevementId,
        aeroportLivraisonId: finalQuote.aeroportLivraisonId,
        hbl: finalQuote.hbl,
        mbl: finalQuote.mbl,
        condition: finalQuote.condition,
      });
      
      // Mettre à jour l'objet retourné
      updatedQuote.leadId = finalQuote.leadId;
      updatedQuote.opportunityId = finalQuote.opportunityId;
      updatedQuote.clientId = finalQuote.clientId;
      updatedQuote.armateurId = finalQuote.armateurId;
      updatedQuote.navireId = finalQuote.navireId;
      updatedQuote.portEnlevementId = finalQuote.portEnlevementId;
      updatedQuote.portLivraisonId = finalQuote.portLivraisonId;
      updatedQuote.aeroportEnlevementId = finalQuote.aeroportEnlevementId;
      updatedQuote.aeroportLivraisonId = finalQuote.aeroportLivraisonId;
      updatedQuote.hbl = finalQuote.hbl;
      updatedQuote.mbl = finalQuote.mbl;
      updatedQuote.condition = finalQuote.condition;
    } else {
      console.log('⚠️ [UPDATE] Aucun ID de liaison présent dans updateQuoteDto - pas de forçage');
    }

    console.log('✨ [UPDATE] Quote après save:', {
      id: updatedQuote.id,
      leadId: updatedQuote.leadId,
      opportunityId: updatedQuote.opportunityId,
      clientId: updatedQuote.clientId,
      armateurId: updatedQuote.armateurId,
      navireId: updatedQuote.navireId,
      portEnlevementId: updatedQuote.portEnlevementId,
      portLivraisonId: updatedQuote.portLivraisonId,
      aeroportEnlevementId: updatedQuote.aeroportEnlevementId,
      aeroportLivraisonId: updatedQuote.aeroportLivraisonId,
      hbl: updatedQuote.hbl,
      mbl: updatedQuote.mbl,
      condition: updatedQuote.condition,
    });

    // 🎯 Régénérer le QR code après la mise à jour
    const qrCode = await this.generateQRCode(updatedQuote);
    if (qrCode) {
      updatedQuote.qrCodeData = qrCode;
      await this.quoteRepository.save(updatedQuote);
    }

    return this.findOne(updatedQuote.id);
  }

  /**
   * Supprimer un devis
   */
  async remove(id: number): Promise<void> {
    const quote = await this.findOne(id);

    // Vérifier que le devis peut être supprimé
    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Impossible de supprimer un devis accepté');
    }

    await this.quoteRepository.remove(quote);
  }

  /**
   * Envoyer un devis par email
   */
  async sendQuote(id: number, sendQuoteDto: SendQuoteDto): Promise<Quote> {
    const quote = await this.findOne(id);

    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Ce devis a déjà été accepté');
    }

    // ✅ Recalculer les totaux avec conversion en TND avant d'envoyer l'email
    this.calculateTotals(quote);

    console.log('📧 [Email] Envoi cotation avec totaux en TND:', {
      quoteNumber: quote.quoteNumber,
      totalOffers: quote.totalOffers,
      taxAmount: quote.taxAmount,
      total: quote.total,
      itemsWithRates: quote.items?.map(item => ({
        desc: item.description,
        currency: (item as any).currency,
        conversionRate: (item as any).conversionRate,
        sellingPrice: item.sellingPrice,
        quantity: item.quantity
      }))
    });

    // Préparer le contenu HTML de l'email
    const emailHtml = this.generateQuoteEmailHtml(quote, sendQuoteDto);

    // Envoyer l'email
    const emailSubject = sendQuoteDto.emailSubject || `Cotation ${quote.quoteNumber} - ${quote.title}`;
    
    try {
      await this.emailService.sendEmail(
        sendQuoteDto.recipientEmail || quote.clientEmail,
        emailSubject,
        emailHtml
      );

      // Mettre à jour le statut
      quote.status = QuoteStatus.SENT;
      quote.sentAt = new Date();

      return this.quoteRepository.save(quote);
    } catch (error) {
      throw new InternalServerErrorException(
        `Erreur lors de l'envoi de l'email: ${error.message}`
      );
    }
  }

  /**
   * Générer le HTML pour l'email de la cotation
   */
  private generateQuoteEmailHtml(quote: Quote, sendData: SendQuoteDto): string {
    // ✅ Le total est déjà calculé EN TND avec conversion ET TVA par ligne dans calculateTotals()
    const total = quote.total || 0;
    
    // 🆕 Calculer les totaux FRET par devise (sans conversion)
    const freightTotalsByDevise = new Map<string, number>();
    (quote.items || [])
      .filter(item => item.itemType === 'freight')
      .forEach(item => {
        const currency = (item as any).currency || 'TND';
        const itemTotal = (item.sellingPrice || 0) * (item.quantity || 0);
        freightTotalsByDevise.set(
          currency,
          (freightTotalsByDevise.get(currency) || 0) + itemTotal
        );
      });
    
    // 🆕 Calculer les totaux FRAIS ANNEXES par devise (sans conversion)
    const additionalTotalsByDevise = new Map<string, number>();
    (quote.items || [])
      .filter(item => item.itemType === 'additional_cost')
      .forEach(item => {
        const currency = (item as any).currency || 'TND';
        const itemTotal = (item.sellingPrice || 0) * (item.quantity || 0);
        additionalTotalsByDevise.set(
          currency,
          (additionalTotalsByDevise.get(currency) || 0) + itemTotal
        );
      });

    // 🆕 Générer le HTML pour afficher les montants par devise
    const generateAmountsByDevise = (totalsByDevise: Map<string, number>) => {
      const devises = Array.from(totalsByDevise.entries());
      if (devises.length === 0) return '<div class="total-item-value">0 TND</div>';
      
      return devises.map(([currency, amount]) => {
        const symbol = currency === 'TND' ? 'TND' : 
                       currency === 'EUR' ? '€' : 
                       currency === 'USD' ? '$' : 
                       currency === 'GBP' ? '£' : currency;
        return `<div class="total-item-value">${formatAmount(amount)} ${symbol}</div>`;
      }).join('');
    };

    // ✅ Format cohérent avec le frontend (jusqu'à 3 décimales pour TND)
    const formatAmount = (amount: number) => {
      let minDecimals = 0;
      let maxDecimals = 3; // Pour TND, autoriser jusqu'à 3 décimales (millimes)
      
      // Ne pas forcer les décimales si le nombre est entier
      if (amount % 1 !== 0) {
        minDecimals = 0; // Laisser JavaScript décider
      }
      
      return amount.toLocaleString('fr-FR', {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals
      });
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('fr-FR');
    };

    // Générer le lien de visualisation avec tracking
    // Production: https://wyselogiquote.com (domaine principal)
    // Dev: localhost
    const frontendUrl = process.env.FRONTEND_URL || 'https://wyselogiquote.com';
    const viewLink = `${frontendUrl}/public/quote-view/${quote.id}`;

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cotation ${quote.quoteNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 32px;
          }
          .header p {
            margin: 5px 0;
            font-size: 14px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
            text-align: center;
          }
          .greeting {
            font-size: 18px;
            color: #555;
            margin-bottom: 25px;
          }
          ${sendData.emailBody ? `
          .custom-message {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: left;
            font-size: 15px;
            line-height: 1.6;
          }
          ` : ''}
      .amount-box {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); /* violet clair */
  color: #4c1d95; /* violet profond, lisible */
  padding: 12px 18px; /* plus petit et équilibré */
  border-radius: 10px;
  margin: 10px auto;
  width: fit-content; /* largeur selon le texte */
  min-width: 140px; /* limite minimale */
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 2px 6px rgba(76, 29, 149, 0.15); /* ombre légère */
  border: 1px solid #e0d7ff; /* contour fin */
}

.amount-box:hover {
  background: linear-gradient(135deg, #ede9fe 0%, #e0d7ff 100%);
  box-shadow: 0 4px 10px rgba(76, 29, 149, 0.25);
  transform: translateY(-1px);
}
          .totals-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          .total-item {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #dee2e6;
          }
          .total-item-freight {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            border-color: #2196f3;
          }
          .total-item-additional {
            background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
            border-color: #009688;
          }
          .total-item-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
            font-weight: 500;
          }
          .total-item-value {
            font-size: 20px;
            font-weight: bold;
            color: #333;
          }
          .total-item-currency {
            font-size: 11px;
            color: #888;
            margin-top: 3px;
          }

          .amount-label {
            font-size: 14px;
            opacity: 0.95;
            margin-bottom: 8px;
            font-weight: 500;
          }
          .amount-value {
            font-size: 36px;
            font-weight: bold;
            margin: 0;
            letter-spacing: 1px;
          }
          .view-button {
            display: inline-block;
            padding: 18px 40px;
            background-color: #2196f3;
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
            transition: background-color 0.3s;
          }
          .view-button:hover {
            background-color: #1976d2;
          }
          .info-text {
            color: #666;
            font-size: 14px;
            margin-top: 20px;
            line-height: 1.6;
          }
          .footer {
            text-align: center;
            padding: 30px;
            background-color: #f8f9fa;
            border-top: 3px solid #2196f3;
            color: #6c757d;
            font-size: 12px;
          }
          .company-info {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
          }
          .company-info p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cotation ${quote.quoteNumber}</h1>
            <p><strong>Date:</strong> ${formatDate(quote.createdAt)}</p>
            <p><strong>Validité:</strong> ${formatDate(quote.validUntil)}</p>
          </div>

          <div class="content">
            <div class="greeting">
              Bonjour ${quote.clientName || 'Cher client'},
            </div>

            ${sendData.emailBody ? `
              <div class="custom-message">
                ${sendData.emailBody.replace(/\n/g, '<br>')}
              </div>
            ` : ''}

            <!-- Totaux FRET et FRAIS ANNEXES (en grille 2 colonnes) -->
            <div class="totals-grid">
              <div class="total-item total-item-freight">
                <div class="total-item-label">🚚 FRET (Transport)</div>
                ${generateAmountsByDevise(freightTotalsByDevise)}
              </div>
              <div class="total-item total-item-additional">
                <div class="total-item-label">📄 FRAIS ANNEXES</div>
                ${generateAmountsByDevise(additionalTotalsByDevise)}
              </div>
            </div>

            <!-- Total TTC -->
            <div class="amount-box">
              <div class="amount-label">Montant Total TTC</div>
              <div class="amount-value">${formatAmount(total)} TND</div>
            </div>

            <p style="font-size: 13px; color: #888; margin: 10px 0 25px 0; text-align: center; font-style: italic;">
              Toutes les devises sont converties en TND
            </p>

            <p style="font-size: 16px; color: #555; margin: 25px 0;">
              Pour consulter les détails et imprimer la cotation, cliquez sur ce bouton :
            </p>

            <a href="${viewLink}" class="view-button" target="_blank">
              📄 Voir la cotation complète
            </a>

            <p class="info-text">
              Ce lien vous permettra de consulter tous les détails de votre cotation,<br>
              y compris les lignes détaillées et les conditions.
            </p>
          </div>

          <div class="footer">
            <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">
              © ${new Date().getFullYear()} VELOSI LOGISTICS - Tous droits réservés
            </p>
            <div class="company-info">
              <p><strong>Adresse:</strong> 06 Av. H. Bourguiba Résidence ZOHRA 2040 Radès, Tunisie</p>
              <p><strong>Tél:</strong> (+216) 71 460 969 / (+216) 71 460 991 / (+216) 79 459 553</p>
              <p><strong>Email:</strong> contact@velosi.com | <strong>Web:</strong> www.velosi.com</p>
            </div>
            <p style="margin: 15px 0 0 0; font-size: 11px;">
              Cet email a été envoyé automatiquement. Pour toute question, veuillez contacter notre service commercial.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Marquer un devis comme vu
   * ✅ CORRECTION: Marque comme vu même si viewedAt existe déjà
   */
  async markAsViewed(id: number): Promise<Quote> {
    const quote = await this.findOne(id);

    console.log('👁️ [Mark As Viewed] Tentative de marquage:', {
      quoteId: id,
      quoteNumber: quote.quoteNumber,
      currentStatus: quote.status,
      viewedAt: quote.viewedAt,
      sentAt: quote.sentAt
    });

    // Marquer comme vu si le statut est SENT (même si déjà viewedAt existe)
    if (quote.status === QuoteStatus.SENT) {
      quote.status = QuoteStatus.VIEWED;
      quote.viewedAt = new Date();
      
      const savedQuote = await this.quoteRepository.save(quote);
      
      console.log('✅ [Mark As Viewed] Cotation marquée comme vue:', {
        quoteNumber: savedQuote.quoteNumber,
        newStatus: savedQuote.status,
        viewedAt: savedQuote.viewedAt
      });
      
      return savedQuote;
    }

    console.log('ℹ️ [Mark As Viewed] Pas de changement de statut (statut actuel:', quote.status + ')');
    return quote;
  }

  /**
   * Accepter un devis
   * ✅ CORRECTION: Permettre l'acceptation depuis DRAFT, SENT ou VIEWED
   */
  async acceptQuote(id: number, acceptQuoteDto: AcceptQuoteDto): Promise<Quote> {
    console.log(`🎯 DÉBUT acceptQuote pour cotation ID: ${id}`);
    const quote = await this.findOne(id);
    console.log(`📋 Cotation trouvée: ${quote.quoteNumber}, Statut actuel: ${quote.status}`);

    // ✅ CORRECTION: Permettre l'acceptation depuis DRAFT, SENT ou VIEWED
    if (![QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.VIEWED].includes(quote.status)) {
      console.error(`❌ Statut invalide pour acceptation: ${quote.status}`);
      throw new BadRequestException(
        `Impossible d'accepter un devis avec le statut ${quote.status}`,
      );
    }

    console.log(`✅ Statut valide - Passage à ACCEPTED`);
    quote.status = QuoteStatus.ACCEPTED;
    quote.acceptedAt = new Date();

    // ✅ Mettre à jour les champs de transport (fiche dossier)
    // 🆕 FIX: Décharger les relations TypeORM avant d'assigner les IDs
    if (acceptQuoteDto.armateurId !== undefined) {
      quote.armateur = undefined;
      quote.armateurId = acceptQuoteDto.armateurId;
    }
    if (acceptQuoteDto.navireId !== undefined) {
      quote.navire = undefined;
      quote.navireId = acceptQuoteDto.navireId;
    }
    if (acceptQuoteDto.portEnlevementId !== undefined) {
      quote.portEnlevement = undefined;
      quote.portEnlevementId = acceptQuoteDto.portEnlevementId;
    }
    if (acceptQuoteDto.portLivraisonId !== undefined) {
      quote.portLivraison = undefined;
      quote.portLivraisonId = acceptQuoteDto.portLivraisonId;
    }
    if (acceptQuoteDto.aeroportEnlevementId !== undefined) {
      quote.aeroportEnlevement = undefined;
      quote.aeroportEnlevementId = acceptQuoteDto.aeroportEnlevementId;
    }
    if (acceptQuoteDto.aeroportLivraisonId !== undefined) {
      quote.aeroportLivraison = undefined;
      quote.aeroportLivraisonId = acceptQuoteDto.aeroportLivraisonId;
    }
    if (acceptQuoteDto.hbl !== undefined) quote.hbl = acceptQuoteDto.hbl;
    if (acceptQuoteDto.mbl !== undefined) quote.mbl = acceptQuoteDto.mbl;
    if (acceptQuoteDto.condition !== undefined) quote.condition = acceptQuoteDto.condition;

    // ✅ Déterminer automatiquement le type: si au moins un champ de transport est renseigné → fiche_dossier
    const hasTransportInfo = !!(
      acceptQuoteDto.armateurId || acceptQuoteDto.navireId || 
      acceptQuoteDto.portEnlevementId || acceptQuoteDto.portLivraisonId ||
      acceptQuoteDto.aeroportEnlevementId || acceptQuoteDto.aeroportLivraisonId ||
      acceptQuoteDto.hbl || acceptQuoteDto.mbl || acceptQuoteDto.condition
    );
    
    quote.type = hasTransportInfo ? 'fiche_dossier' : 'cotation';
    console.log(`📋 Type déterminé: ${quote.type} (infos transport: ${hasTransportInfo})`);

    if (acceptQuoteDto.notes) {
      quote.notes = quote.notes
        ? `${quote.notes}\n\nAcceptation: ${acceptQuoteDto.notes}`
        : `Acceptation: ${acceptQuoteDto.notes}`;
    }

    console.log(`💾 Sauvegarde de la cotation avec statut ACCEPTED...`);
    const updatedQuote = await this.quoteRepository.save(quote);
    console.log(`✅ Cotation sauvegardée: ${updatedQuote.quoteNumber} - Statut: ${updatedQuote.status}`);

    // 🎯 SYNCHRONISATION AUTOMATIQUE: Opportunité → CLOSED_WON
    if (updatedQuote.opportunityId) {
      console.log(`🔄 Mise à jour opportunité ID: ${updatedQuote.opportunityId}`);
      await this.updateOpportunityStage(
        updatedQuote.opportunityId,
        'closed_won',
        `Cotation ${updatedQuote.quoteNumber} acceptée`
      );
    }

    // Conversion automatique prospect/opportunité vers client permanent
    console.log(`🚀 Appel de autoConvertToClient...`);
    await this.autoConvertToClient(updatedQuote);
    console.log(`✅ autoConvertToClient terminé`);

    return this.findOne(updatedQuote.id);
  }

  /**
   * ✅ SIMPLIFICATION TOTALE: Convertir automatiquement en client TEMPORAIRE
   * Utilise UNIQUEMENT les données de la cotation (pas de lead/opportunity)
   * SANS mot de passe et SANS compte Keycloak
   * ✅ Le statut du prospect est mis à jour automatiquement par un TRIGGER PostgreSQL
   */
  private async autoConvertToClient(quote: Quote): Promise<void> {
    try {
      console.log(`\n========================================`);
      console.log(`🔄 CRÉATION CLIENT AUTOMATIQUE`);
      console.log(`========================================`);
      console.log(`📋 Cotation: ${quote.quoteNumber}`);
      console.log(`📊 Client existant: ${quote.clientId || 'AUCUN'}`);

      // ✅ ÉTAPE 1: Vérifier si UN CLIENT EXISTE DÉJÀ
      if (quote.clientId && quote.clientId > 0) {
        const existingClient = await this.clientRepository.findOne({
          where: { id: quote.clientId }
        });

        if (existingClient) {
          console.log(`✅ Client existant trouvé: ${existingClient.nom} (ID: ${existingClient.id})`);
          console.log(`ℹ️ Statut prospect mis à jour automatiquement par trigger PostgreSQL`);
          console.log(`========================================\n`);
          return;
        }
      }

      console.log(`🆕 Création d'un nouveau client depuis la cotation...`);

      // ✅ ÉTAPE 2: Créer le client UNIQUEMENT avec les données de la cotation
      const isLocalCountry = !quote.country || quote.country.toLowerCase() === 'tunisie';
      
      // ✅ CORRECTION: S'assurer que l'email et le téléphone sont bien fournis
      const clientEmail = quote.clientEmail;
      const clientPhone = quote.clientPhone || null;
      
      const clientData: any = {
        nom: quote.clientCompany || quote.clientName,
        interlocuteur: quote.clientName,
        categorie: isLocalCountry ? 'LOCAL' : 'ETRANGER',
        type_client: 'CONVERTI',
        adresse: quote.clientAddress || null,
        pays: quote.country || 'Tunisie',
        etat_fiscal: EtatFiscal.ASSUJETTI_TVA,
        timbre: false,
        statut: 'actif',
        is_permanent: false,
        mot_de_passe: null,
        keycloak_id: null,
        // ✅ CORRECTION: Champs critiques pour contact_client
        contact_mail1: clientEmail,
        contact_tel1: clientPhone,
        contact_fonction: null,
      };

      console.log(`\n📊 DONNÉES CLIENT À ENVOYER (depuis quote #${quote.id}):`);
      console.log(`   ========================================`);
      console.log(`   - Nom: ${clientData.nom}`);
      console.log(`   - Interlocuteur: ${clientData.interlocuteur}`);
      console.log(`   - Catégorie: ${clientData.categorie}`);
      console.log(`   - Type: ${clientData.type_client}`);
      console.log(`   - is_permanent: ${clientData.is_permanent}`);
      console.log(`   ----------------------------------------`);
      console.log(`   📧 DONNÉES DE CONTACT (CRITIQUES):`);
      console.log(`   - contact_mail1: "${clientData.contact_mail1}" (depuis quote.clientEmail: "${quote.clientEmail}")`);
      console.log(`   - contact_tel1: "${clientData.contact_tel1}" (depuis quote.clientPhone: "${quote.clientPhone || 'NULL'}")`);
      console.log(`   - contact_fonction: "${clientData.contact_fonction}"`);
      console.log(`   ========================================\n`);
      
      // ✅ VÉRIFICATION: Alerter si l'email est manquant
      if (!clientEmail) {
        console.warn(`⚠️ ATTENTION: Cotation ${quote.quoteNumber} sans email client!`);
        console.warn(`   → Le contact_client sera créé mais sans email`);
      }

      const newClient = await this.clientService.create(clientData);
      
      if (newClient && newClient.id) {
        console.log(`✅ Client créé avec succès: ID ${newClient.id}`);
        
        // Mettre à jour la cotation
        await this.quoteRepository.update(quote.id, {
          clientId: newClient.id
        });
        
        console.log(`✅ Cotation mise à jour avec clientId: ${newClient.id}`);
        console.log(`ℹ️ Statut prospect mis à jour automatiquement par trigger PostgreSQL`);
      }

      console.log(`========================================`);
      console.log(`✅ FIN - CLIENT CRÉÉ ET LIÉ`);
      console.log(`========================================\n`);

    } catch (error) {
      console.error(`\n❌ ERREUR création client:`, error.message);
      console.error(`❌ Stack:`, error.stack);
      // Ne pas bloquer l'acceptation de la cotation
    }
  }

  /**
   * ✅ CORRECTION FINALE: Mettre à jour le statut du prospect vers CLIENT
   * Exécutée TOUJOURS lors de l'acceptation d'une cotation
   */
  private async updateLeadStatusToClient(quote: Quote): Promise<void> {
    try {
      console.log(`🔍 updateLeadStatusToClient appelée pour cotation ${quote.quoteNumber}`);
      console.log(`📊 Quote leadId: ${quote.leadId}, opportunityId: ${quote.opportunityId}`);
      
      // Cas 1: Cotation directement liée à un prospect
      if (quote.leadId) {
        console.log(`🎯 Mise à jour directe du prospect ID: ${quote.leadId}`);
        
        // Vérifier que le prospect existe
        const lead = await this.leadRepository.findOne({
          where: { id: quote.leadId }
        });
        
        if (lead) {
          console.log(`📋 Prospect trouvé - Statut actuel: ${lead.status}`);
          console.log(`🔄 Mise à jour vers: CLIENT`);
          
          // ✅ CORRECTION: Utiliser LeadStatus.CLIENT (l'enum existe bien)
          lead.status = LeadStatus.CLIENT;
          await this.leadRepository.save(lead);
          
          console.log(`✅ Statut du prospect #${lead.id} mis à jour vers CLIENT`);
        } else {
          console.log(`⚠️ Prospect ID ${quote.leadId} non trouvé`);
        }
      } 
      // Cas 2: Cotation liée à une opportunité qui a un prospect
      else if (quote.opportunityId) {
        console.log(`🎯 Recherche du prospect via opportunité ID: ${quote.opportunityId}`);
        
        const opportunity = await this.opportunityRepository.findOne({
          where: { id: quote.opportunityId },
          relations: ['lead']
        });
        
        if (opportunity && opportunity.lead) {
          console.log(`📋 Prospect trouvé via opportunité - ID: ${opportunity.lead.id}, Statut actuel: ${opportunity.lead.status}`);
          console.log(`🔄 Mise à jour vers: CLIENT`);
          
          // ✅ CORRECTION: Utiliser LeadStatus.CLIENT (l'enum existe bien)
          opportunity.lead.status = LeadStatus.CLIENT;
          await this.leadRepository.save(opportunity.lead);
          
          console.log(`✅ Statut du prospect #${opportunity.lead.id} mis à jour vers CLIENT`);
        } else {
          console.log(`⚠️ Opportunité ou prospect non trouvé`);
        }
      } else {
        console.log(`⚠️ Aucun leadId ni opportunityId dans la cotation`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour du statut du prospect:`, error);
      console.error(`❌ Stack trace:`, error.stack);
      // Ne pas faire échouer le processus si cette étape échoue
    }
  }

  /**
   * ✅ CORRECTION FINALE: Créer un client TEMPORAIRE à partir d'un PROSPECT
   * SANS mot de passe et SANS compte Keycloak
   * Utilise toutes les données du prospect pour un mapping correct
   */
  private async createTemporaryClientFromLead(lead: Lead, quote: Quote): Promise<Client> {
    try {
      console.log(`🔧 createTemporaryClientFromLead - Début de création`);
      console.log(`📋 Données du prospect:`);
      console.log(`   - ID: ${lead.id}`);
      console.log(`   - Nom complet: ${lead.fullName}`);
      console.log(`   - Société: ${lead.company || 'Non fournie'}`);
      console.log(`   - Email: ${lead.email}`);
      console.log(`   - Téléphone: ${lead.phone || 'Non fourni'}`);
      console.log(`   - Pays: ${lead.country || 'Tunisie'}`);
      console.log(`   - isLocal: ${lead.isLocal}`);
      console.log(`   - Adresse: ${lead.street || 'Non fournie'}`);
      console.log(`   - Ville: ${lead.city || 'Non fournie'}`);
      console.log(`   - Code postal: ${lead.postalCode || 'Non fourni'}`);
      
      // ✅ CORRECTION FINALE: Mapping correct avec catégorie vide, timbre=false, contact principal
      const clientData: any = {
        nom: lead.company || lead.fullName,
        interlocuteur: lead.fullName,
        // ✅ Ne PAS remplir la catégorie automatiquement (laisser vide pour que l'admin décide)
        categorie: null,
        type_client: 'CONVERTI',
        adresse: lead.street || null,
        code_postal: lead.postalCode || null,
        ville: lead.city || null,
        pays: lead.country || 'Tunisie',
        nature: lead.industry || null,
        etat_fiscal: EtatFiscal.ASSUJETTI_TVA,
        // ✅ timbre doit être FALSE par défaut (pas TRUE)
        timbre: false,
        statut: null, // ✅ Ne PAS remplir le statut automatiquement
        is_permanent: false,
        mot_de_passe: null,
        keycloak_id: null,
        // ✅ CONTACT PRINCIPAL: Créer automatiquement avec prenom = nom du client
        contact_mail1: lead.email,
        contact_tel1: lead.phone || null,
        contact_fonction: 'interlocuteur', // ✅ Fonction = chaîne littérale "interlocuteur"
      };

      console.log(`\n📊 DONNÉES CLIENT À CRÉER (depuis lead #${lead.id}):`);
      console.log(`   ========================================`);
      console.log(`   - nom: ${clientData.nom}`);
      console.log(`   - interlocuteur: ${clientData.interlocuteur}`);
      console.log(`   - categorie: ${clientData.categorie} (mappé depuis isLocal: ${lead.isLocal})`);
      console.log(`   - type_client: ${clientData.type_client}`);
      console.log(`   - is_permanent: ${clientData.is_permanent}`);
      console.log(`   ----------------------------------------`);
      console.log(`   📧 DONNÉES DE CONTACT (CRITIQUES):`);
      console.log(`   - contact_mail1: "${clientData.contact_mail1}" (depuis lead.email: "${lead.email}")`);
      console.log(`   - contact_tel1: "${clientData.contact_tel1}" (depuis lead.phone: "${lead.phone || 'NULL'}")`);
      console.log(`   - contact_fonction: "${clientData.contact_fonction || 'NULL'}"`);
      console.log(`   ========================================`);
      console.log(`⚠️ Client TEMPORAIRE - SANS mot de passe et SANS compte Keycloak\n`);
      
      console.log(`🔄 Appel de clientService.create()...`);
      const newClient = await this.clientService.create(clientData);
      
      if (newClient && newClient.id) {
        console.log(`✅ Client temporaire créé avec succès!`);
        console.log(`   - ID: ${newClient.id}`);
        console.log(`   - Nom: ${newClient.nom}`);
        console.log(`   - Catégorie: ${newClient.categorie}`);
        console.log(`   - is_permanent: ${newClient.is_permanent}`);
        console.log(`   - ✅ contact_client créé automatiquement par clientService`);
      } else {
        console.error(`❌ Client créé mais sans ID!`, newClient);
        throw new Error('Client créé sans ID');
      }

      return newClient;
    } catch (error) {
      console.error(`❌ Erreur dans createTemporaryClientFromLead:`, error);
      console.error(`❌ Message d'erreur:`, error.message);
      console.error(`❌ Stack trace:`, error.stack);
      throw error;
    }
  }

  /**
   * ⚠️ MÉTHODE OBSOLÈTE - Non utilisée depuis la simplification
   * Créer un client TEMPORAIRE à partir d'un lead (prospect)
   * SANS mot de passe et SANS compte Keycloak
   */
  /*private async createTemporaryClientFromLead(lead: Lead, quote: Quote): Promise<Client> {
    try {
      console.log(`🔧 createTemporaryClientFromLead - Début de création`);
      console.log(`📋 Lead: ${lead.fullName} (${lead.company || 'Pas de société'})`);
      
      const clientData = {
        nom: lead.company || lead.fullName,
        interlocuteur: lead.fullName,
        categorie: 'CLIENT',
        type_client: 'PROSPECT_CONVERTI',
        adresse: lead.street || null,
        code_postal: lead.postalCode || null,
        ville: lead.city || null,
        pays: lead.country || 'Tunisie',
        nature: lead.industry || null,
        etat_fiscal: EtatFiscal.ASSUJETTI_TVA,
        timbre: true,
        statut: 'actif',
        is_permanent: false, // CLIENT TEMPORAIRE
        mot_de_passe: null, // PAS de mot de passe
        keycloak_id: null, // PAS de compte Keycloak
        // Contact
        contact_mail1: lead.email,
        contact_tel1: lead.phone || null,
      };

      console.log(`� Données client à créer:`, JSON.stringify(clientData, null, 2));
      console.log(`⚠️ Client TEMPORAIRE - SANS mot de passe et SANS compte Keycloak`);
      
      console.log(`🔄 Appel de clientService.create()...`);
      const newClient = await this.clientService.create(clientData as any);
      
      if (newClient && newClient.id) {
        console.log(`✅ Client temporaire créé avec succès!`);
        console.log(`   - ID: ${newClient.id}`);
        console.log(`   - Nom: ${newClient.nom}`);
        console.log(`   - Email: ${clientData.contact_mail1}`);
        console.log(`   - is_permanent: ${newClient.is_permanent}`);
        console.log(`   - Aucun accès web (pas de mot de passe)`);
      } else {
        console.log(`⚠️ Client créé mais sans ID?`, newClient);
      }

      return newClient;
    } catch (error) {
      console.error(`❌ Erreur dans createTemporaryClientFromLead:`, error);
      console.error(`❌ Stack trace:`, error.stack);
      throw error; // Relancer l'erreur pour qu'elle soit catchée par autoConvertToClient
    }
  }*/

  /**
   * ✅ Créer un client TEMPORAIRE à partir des données de cotation UNIQUEMENT
   * SANS mot de passe et SANS compte Keycloak
   * ✅ CORRECTION: catégorie vide, timbre=false, contact principal avec prenom = nom client
   */
  private async createTemporaryClientFromQuote(quote: Quote): Promise<Client> {
    try {
      console.log(`🔧 createTemporaryClientFromQuote - Début de création`);
      console.log(`📋 Cotation: ${quote.quoteNumber} - Client: ${quote.clientName}`);
      
      // ✅ CORRECTION FINALE: Mapping correct avec catégorie vide, timbre=false
      const clientData = {
        nom: quote.clientCompany || quote.clientName,
        interlocuteur: quote.clientName, // ✅ Ce champ sera utilisé pour créer le 'prenom' du contact_client
        // ✅ Ne PAS remplir la catégorie automatiquement
        categorie: null,
        type_client: 'CONVERTI',
        adresse: quote.clientAddress || null,
        pays: quote.country || 'Tunisie',
        etat_fiscal: EtatFiscal.ASSUJETTI_TVA,
        // ✅ timbre doit être FALSE par défaut
        timbre: false,
        statut: null, // ✅ Ne PAS remplir le statut automatiquement
        is_permanent: false, // CLIENT TEMPORAIRE
        mot_de_passe: null, // PAS de mot de passe
        keycloak_id: null, // PAS de compte Keycloak
        // ✅ CONTACT PRINCIPAL: Email et téléphone depuis la cotation
        // Le clientService utilisera 'interlocuteur' pour remplir 'prenom' dans contact_client
        contact_mail1: quote.clientEmail,
        contact_tel1: quote.clientPhone || null,
        contact_fonction: 'interlocuteur', // ✅ Fonction = chaîne littérale "interlocuteur"
      };

      console.log(`📊 Données client à créer:`, JSON.stringify(clientData, null, 2));
      console.log(`⚠️ Client TEMPORAIRE - SANS mot de passe et SANS compte Keycloak`);
      
      console.log(`🔄 Appel de clientService.create()...`);
      const newClient = await this.clientService.create(clientData as any);
      
      if (newClient && newClient.id) {
        console.log(`✅ Client temporaire créé avec succès (FALLBACK depuis cotation)!`);
        console.log(`   - ID: ${newClient.id}`);
        console.log(`   - Nom: ${newClient.nom}`);
        console.log(`   - Catégorie: ${clientData.categorie || 'NON DÉFINIE'}`);
        console.log(`   - Email: ${quote.clientEmail}`);
        console.log(`   - Téléphone: ${quote.clientPhone || 'Non fourni'}`);
        console.log(`   - timbre: ${newClient.timbre}`);
        console.log(`   - is_permanent: ${newClient.is_permanent}`);
        console.log(`   - ✅ contact_client créé automatiquement par clientService`);
      } else {
        console.log(`⚠️ Client créé mais sans ID?`, newClient);
      }

      return newClient;
    } catch (error) {
      console.error(`❌ Erreur dans createTemporaryClientFromQuote:`, error);
      console.error(`❌ Stack trace:`, error.stack);
      throw error;
    }
  }

  /**
   * 🎯 Mettre à jour automatiquement le statut d'une opportunité
   * lorsqu'une cotation est acceptée ou rejetée
   */
  private async updateOpportunityStage(
    opportunityId: number,
    newStage: 'closed_won' | 'closed_lost',
    description: string
  ): Promise<void> {
    try {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: opportunityId }
      });

      if (!opportunity) {
        console.log(`⚠️ Opportunité ${opportunityId} introuvable - synchronisation ignorée`);
        return;
      }

      console.log(`🔄 Synchronisation opportunité: ${opportunity.title}`);
      console.log(`   Ancien statut: ${opportunity.stage}`);
      console.log(`   Nouveau statut: ${newStage}`);

      // Préparer les données de mise à jour
      const updateData: any = {
        stage: newStage,
        actualCloseDate: new Date(),
      };

      // Ajouter la description appropriée
      if (newStage === 'closed_won') {
        updateData.wonDescription = description;
        // Mettre à jour la probabilité à 100%
        updateData.probability = 100;
      } else if (newStage === 'closed_lost') {
        updateData.lostReason = description;
        // Mettre à jour la probabilité à 0%
        updateData.probability = 0;
      }

      // Mettre à jour l'opportunité
      await this.opportunityRepository.update(opportunityId, updateData);

      console.log(`✅ Opportunité ${opportunity.title} mise à jour → ${newStage}`);
      
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour de l'opportunité ${opportunityId}:`, error);
      // Ne pas faire échouer la cotation si la mise à jour de l'opportunité échoue
      // L'utilisateur pourra la mettre à jour manuellement
    }
  }

  /**
   * 🎯 Déplacer automatiquement une opportunité dans la colonne "proposal"
   * lorsqu'une cotation est créée
   */
  private async moveOpportunityToProposal(opportunityId: number): Promise<void> {
    try {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: opportunityId }
      });

      if (!opportunity) {
        console.log(`⚠️ Opportunité ${opportunityId} introuvable - déplacement ignoré`);
        return;
      }

      // Ne déplacer que si l'opportunité n'est pas déjà fermée
      if (opportunity.stage === OpportunityStage.CLOSED_WON || opportunity.stage === OpportunityStage.CLOSED_LOST) {
        console.log(`⚠️ Opportunité ${opportunity.title} déjà fermée - déplacement ignoré`);
        return;
      }

      // Ne déplacer que si l'opportunité n'est pas déjà en "proposal"
      if (opportunity.stage === OpportunityStage.PROPOSAL) {
        console.log(`ℹ️ Opportunité ${opportunity.title} déjà en "proposal"`);
        return;
      }

      console.log(`🔄 Déplacement opportunité: ${opportunity.title}`);
      console.log(`   Ancien statut: ${opportunity.stage}`);
      console.log(`   Nouveau statut: proposal`);

      // Mettre à jour l'opportunité vers "proposal"
      await this.opportunityRepository.update(opportunityId, {
        stage: OpportunityStage.PROPOSAL,
        probability: 60, // Probabilité par défaut pour l'étape "proposal"
      });

      console.log(`✅ Opportunité ${opportunity.title} déplacée → proposal`);
      
    } catch (error) {
      console.error(`❌ Erreur lors du déplacement de l'opportunité ${opportunityId}:`, error);
      // Ne pas faire échouer la création de la cotation si le déplacement échoue
    }
  }

  /**
   * Rejeter un devis
   */
  async rejectQuote(id: number, rejectQuoteDto: RejectQuoteDto): Promise<Quote> {
    const quote = await this.findOne(id);

    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Impossible de rejeter un devis déjà accepté');
    }

    quote.status = QuoteStatus.REJECTED;
    quote.rejectedAt = new Date();
    quote.rejectionReason = rejectQuoteDto.reason;

    const updatedQuote = await this.quoteRepository.save(quote);

    // 🎯 SYNCHRONISATION AUTOMATIQUE: Opportunité → CLOSED_LOST
    if (updatedQuote.opportunityId) {
      await this.updateOpportunityStage(
        updatedQuote.opportunityId,
        'closed_lost',
        `Cotation ${updatedQuote.quoteNumber} rejetée: ${rejectQuoteDto.reason || 'Non spécifié'}`
      );
    }

    return updatedQuote;
  }

  /**
   * Annuler un devis
   */
  async cancelQuote(id: number, reason?: string): Promise<Quote> {
    const quote = await this.findOne(id);

    // Vérifier que le devis n'est pas déjà accepté
    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Impossible d\'annuler un devis déjà accepté');
    }

    quote.status = QuoteStatus.CANCELLED;
    
    // Ajouter la raison d'annulation dans les notes si fournie
    if (reason) {
      quote.notes = quote.notes
        ? `${quote.notes}\n\nAnnulation: ${reason}`
        : `Annulation: ${reason}`;
    }

    const updatedQuote = await this.quoteRepository.save(quote);

    // Note: Pas de synchronisation automatique avec l'opportunité pour l'annulation
    // L'annulation d'une cotation ne change pas automatiquement le statut de l'opportunité
    // car il peut y avoir d'autres cotations en cours

    console.log(`✅ Cotation ${updatedQuote.quoteNumber} marquée comme annulée`);

    return updatedQuote;
  }

  /**
   * Dupliquer un devis
   */
  async duplicate(id: number, userId: number): Promise<Quote> {
    const originalQuote = await this.findOne(id);

    const newQuoteNumber = await this.generateQuoteNumber();

    const newQuote = this.quoteRepository.create({
      ...originalQuote,
      id: undefined,
      uuid: undefined,
      quoteNumber: newQuoteNumber,
      status: QuoteStatus.DRAFT,
      createdBy: userId,
      createdAt: undefined,
      updatedAt: undefined,
      sentAt: null,
      viewedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      approvedBy: null,
    });

    // Dupliquer les lignes
    if (originalQuote.items && originalQuote.items.length > 0) {
      newQuote.items = originalQuote.items.map((item) =>
        this.quoteItemRepository.create({
          ...item,
          id: undefined,
          quoteId: undefined,
        }),
      );
    }

    const savedQuote = await this.quoteRepository.save(newQuote);

    return this.findOne(savedQuote.id);
  }

  /**
   * Obtenir les statistiques des devis
   */
  /**
   * 📊 Statistiques des cotations
   * ✅ MULTI-COMMERCIAUX: Utilise commercial_ids (array) avec ANY operator
   */
  async getStatistics(filters?: { startDate?: Date; endDate?: Date; commercialId?: number }) {
    let queryBuilder = this.quoteRepository.createQueryBuilder('quote');

    // Filtrer par commercial si spécifié (multi-commerciaux)
    if (filters?.commercialId) {
      queryBuilder.andWhere(
        ':commercialId = ANY(quote.commercial_ids)',
        { commercialId: filters.commercialId }
      );
    }

    // Filtrer par dates si spécifiées
    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere(
        'quote.createdAt BETWEEN :startDate AND :endDate',
        { startDate: filters.startDate, endDate: filters.endDate }
      );
    }

    const quotes = await queryBuilder.getMany();

    return {
      total: quotes.length,
      byStatus: {
        draft: quotes.filter((q) => q.status === QuoteStatus.DRAFT).length,
        sent: quotes.filter((q) => q.status === QuoteStatus.SENT).length,
        viewed: quotes.filter((q) => q.status === QuoteStatus.VIEWED).length,
        accepted: quotes.filter((q) => q.status === QuoteStatus.ACCEPTED).length,
        rejected: quotes.filter((q) => q.status === QuoteStatus.REJECTED).length,
        expired: quotes.filter((q) => q.status === QuoteStatus.EXPIRED).length,
        cancelled: quotes.filter((q) => q.status === QuoteStatus.CANCELLED).length,
      },
      totalValue: quotes.reduce((sum, q) => sum + Number(q.total), 0),
      acceptedValue: quotes
        .filter((q) => q.status === QuoteStatus.ACCEPTED)
        .reduce((sum, q) => sum + Number(q.total), 0),
      averageValue: quotes.length > 0
        ? quotes.reduce((sum, q) => sum + Number(q.total), 0) / quotes.length
        : 0,
      conversionRate: quotes.length > 0
        ? (quotes.filter((q) => q.status === QuoteStatus.ACCEPTED).length / quotes.length) * 100
        : 0,
    };
  }

  /**
   * 🗑️ SOFT DELETE - Archiver une cotation
   * Ne supprime jamais physiquement - crucial pour audit et conformité légale
   */
  async archiveQuote(id: number, reason: string, userId: number): Promise<Quote> {
    const quote = await this.findOne(id);

    if (!quote) {
      throw new NotFoundException(`Cotation #${id} introuvable`);
    }

    // Vérifier si déjà archivée
    if (quote.deletedAt || quote.isArchived) {
      throw new BadRequestException('Cette cotation est déjà archivée');
    }

    // Mettre à jour avec soft delete
    await this.quoteRepository.update(id, {
      deletedAt: new Date(),
      isArchived: true,
      archivedReason: reason,
      archivedBy: userId,
    });

    return this.quoteRepository.findOne({
      where: { id },
      withDeleted: true, // Inclure les entités soft-deleted
    });
  }

  /**
   * ♻️ Restaurer une cotation archivée
   */
  async restoreQuote(id: number): Promise<Quote> {
    const quote = await this.quoteRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!quote) {
      throw new NotFoundException(`Cotation #${id} introuvable`);
    }

    if (!quote.deletedAt && !quote.isArchived) {
      throw new BadRequestException('Cette cotation n\'est pas archivée');
    }

    // Restaurer
    await this.quoteRepository.update(id, {
      deletedAt: null,
      isArchived: false,
      archivedReason: null,
      archivedBy: null,
    });

    return this.findOne(id);
  }
}
