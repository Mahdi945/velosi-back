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
  private async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

    // Compter les devis du mois actuel
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const count = await this.quoteRepository.count({
      where: {
        createdAt: Between(startOfMonth, endOfMonth),
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `Q${year}/${month}${sequence.slice(-2)}`;
  }

  /**
   * Calcule les totaux d'un devis
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

    // Calculer le total de chaque ligne
    quote.items.forEach((item) => {
      // totalPrice devrait utiliser le prix de vente (sellingPrice)
      item.totalPrice = item.quantity * (item.sellingPrice || item.unitPrice);
      item.margin = (item.sellingPrice || item.unitPrice) - (item.purchasePrice || 0);
    });

    // Séparer fret et frais annexes
    const freightItems = quote.items.filter((item) => item.itemType === 'freight');
    const additionalItems = quote.items.filter((item) => item.itemType === 'additional_cost');

    // Calculer les totaux fret
    quote.freightPurchased = freightItems.reduce(
      (sum, item) => sum + item.quantity * (item.purchasePrice || 0),
      0,
    );
    quote.freightOffered = freightItems.reduce(
      (sum, item) => sum + item.quantity * (item.sellingPrice || item.unitPrice),
      0,
    );
    quote.freightMargin = quote.freightOffered - quote.freightPurchased;

    // Calculer les totaux frais annexes
    quote.additionalCostsPurchased = additionalItems.reduce(
      (sum, item) => sum + item.quantity * (item.purchasePrice || 0),
      0,
    );
    quote.additionalCostsOffered = additionalItems.reduce(
      (sum, item) => sum + item.quantity * (item.sellingPrice || item.unitPrice),
      0,
    );

    // Totaux généraux
    quote.totalPurchases = quote.freightPurchased + quote.additionalCostsPurchased;
    quote.totalOffers = quote.freightOffered + quote.additionalCostsOffered;
    quote.totalMargin = quote.totalOffers - quote.totalPurchases;

    // Sous-total HT (basé sur les prix de vente = totalOffers)
    quote.subtotal = quote.totalOffers;
    
    // TVA et Total TTC
    quote.taxAmount = (quote.subtotal * (quote.taxRate || 19)) / 100;
    quote.total = quote.subtotal + quote.taxAmount;
  }

  /**
   * Créer un nouveau devis
   */
  async create(createQuoteDto: CreateQuoteDto, userId: number): Promise<Quote> {
    try {
      // Générer le numéro de devis
      const quoteNumber = await this.generateQuoteNumber();

      // Créer le devis
      const quote = this.quoteRepository.create({
        ...createQuoteDto,
        quoteNumber,
        createdBy: userId,
        status: QuoteStatus.DRAFT,
        taxRate: createQuoteDto.taxRate || 19.0,
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
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    const where: FindOptionsWhere<Quote> = {};

    if (status) where.status = status;
    if (opportunityId) where.opportunityId = opportunityId;
    if (leadId) where.leadId = leadId;
    if (clientId) where.clientId = clientId;
    if (commercialId) where.commercialId = commercialId;

    // Recherche améliorée - Utiliser QueryBuilder pour rechercher dans plusieurs champs
    let queryBuilder = this.quoteRepository.createQueryBuilder('quote');
    
    // Joindre les relations nécessaires
    queryBuilder
      .leftJoinAndSelect('quote.items', 'items')
      .leftJoinAndSelect('quote.creator', 'creator')
      .leftJoinAndSelect('quote.commercial', 'commercial')
      .leftJoinAndSelect('quote.opportunity', 'opportunity')
      .leftJoinAndSelect('quote.lead', 'lead')
      .leftJoinAndSelect('quote.client', 'client')
      .leftJoinAndSelect('quote.approver', 'approver');

    // Appliquer les filtres simples
    if (status) queryBuilder.andWhere('quote.status = :status', { status });
    if (opportunityId) queryBuilder.andWhere('quote.opportunityId = :opportunityId', { opportunityId });
    if (leadId) queryBuilder.andWhere('quote.leadId = :leadId', { leadId });
    if (clientId) queryBuilder.andWhere('quote.clientId = :clientId', { clientId });
    if (commercialId) queryBuilder.andWhere('quote.commercialId = :commercialId', { commercialId });

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

    // Tri et pagination
    queryBuilder
      .orderBy(`quote.${sortBy}`, sortOrder as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  /**
   * Récupérer un devis par ID
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
      ],
    });

    if (!quote) {
      throw new NotFoundException(`Devis avec l'ID ${id} introuvable`);
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
      ],
    });

    if (!quote) {
      throw new NotFoundException(`Devis ${quoteNumber} introuvable`);
    }

    return quote;
  }

  /**
   * Mettre à jour un devis
   */
  async update(id: number, updateQuoteDto: UpdateQuoteDto): Promise<Quote> {
    const quote = await this.findOne(id);

    // Vérifier que le devis peut être modifié
    if ([QuoteStatus.ACCEPTED, QuoteStatus.EXPIRED, QuoteStatus.CANCELLED].includes(quote.status)) {
      throw new BadRequestException(
        `Impossible de modifier un devis avec le statut ${quote.status}`,
      );
    }

    // Mettre à jour les champs principaux
    Object.assign(quote, updateQuoteDto);

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

    // Sauvegarder
    const updatedQuote = await this.quoteRepository.save(quote);

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
    // Calcul du total
    const total = quote.total || 0;

    const formatAmount = (amount: number) => {
      return amount.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('fr-FR');
    };

    // Générer le lien de visualisation avec tracking
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
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

            <div class="amount-box">
              <div class="amount-label">Montant Total TTC</div>
              <div class="amount-value">${formatAmount(total)} TND</div>
            </div>

            <p style="font-size: 16px; color: #555; margin: 25px 0;">
              Pour savoir les détails et imprimer la cotation, cliquer sur ce bouton :
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
   */
  async markAsViewed(id: number): Promise<Quote> {
    const quote = await this.findOne(id);

    if (quote.status === QuoteStatus.SENT && !quote.viewedAt) {
      quote.status = QuoteStatus.VIEWED;
      quote.viewedAt = new Date();
      return this.quoteRepository.save(quote);
    }

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
        timbre: true,
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
      
      // ✅ Mapping correct des données du prospect vers le client
      const clientData: any = {
        nom: lead.company || lead.fullName,
        interlocuteur: lead.fullName,
        categorie: lead.isLocal ? 'LOCAL' : 'ETRANGER',
        type_client: 'CONVERTI',
        adresse: lead.street || null,
        code_postal: lead.postalCode || null,
        ville: lead.city || null,
        pays: lead.country || 'Tunisie',
        nature: lead.industry || null,
        etat_fiscal: EtatFiscal.ASSUJETTI_TVA,
        timbre: true,
        statut: 'actif',
        is_permanent: false,
        mot_de_passe: null,
        keycloak_id: null,
        contact_mail1: lead.email,
        contact_tel1: lead.phone || null,
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
   */
  private async createTemporaryClientFromQuote(quote: Quote): Promise<Client> {
    try {
      console.log(`🔧 createTemporaryClientFromQuote - Début de création`);
      console.log(`📋 Cotation: ${quote.quoteNumber} - Client: ${quote.clientName}`);
      
      // ✅ Déterminer la catégorie en fonction du pays
      const isLocalCountry = !quote.country || quote.country.toLowerCase() === 'tunisie';
      
      const clientData = {
        nom: quote.clientCompany || quote.clientName,
        interlocuteur: quote.clientName,
        categorie: isLocalCountry ? 'LOCAL' : 'ETRANGER',
        type_client: 'CONVERTI',
        adresse: quote.clientAddress || null,
        pays: quote.country || 'Tunisie',
        etat_fiscal: EtatFiscal.ASSUJETTI_TVA,
        timbre: true,
        statut: 'actif',
        is_permanent: false, // CLIENT TEMPORAIRE
        mot_de_passe: null, // PAS de mot de passe
        keycloak_id: null, // PAS de compte Keycloak
        // ✅ CORRECTION: Email et téléphone depuis la cotation
        contact_mail1: quote.clientEmail,
        contact_tel1: quote.clientPhone || null,
      };

      console.log(`� Données client à créer:`, JSON.stringify(clientData, null, 2));
      console.log(`⚠️ Client TEMPORAIRE - SANS mot de passe et SANS compte Keycloak`);
      
      console.log(`🔄 Appel de clientService.create()...`);
      const newClient = await this.clientService.create(clientData as any);
      
      if (newClient && newClient.id) {
        console.log(`✅ Client temporaire créé avec succès (FALLBACK depuis cotation)!`);
        console.log(`   - ID: ${newClient.id}`);
        console.log(`   - Nom: ${newClient.nom}`);
        console.log(`   - Catégorie: ${clientData.categorie}`);
        console.log(`   - Email: ${quote.clientEmail}`);
        console.log(`   - Téléphone: ${quote.clientPhone || 'Non fourni'}`);
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
  async getStatistics(filters?: { startDate?: Date; endDate?: Date; commercialId?: number }) {
    const where: FindOptionsWhere<Quote> = {};

    if (filters?.commercialId) {
      where.commercialId = filters.commercialId;
    }

    if (filters?.startDate && filters?.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    }

    const quotes = await this.quoteRepository.find({ where });

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
}
