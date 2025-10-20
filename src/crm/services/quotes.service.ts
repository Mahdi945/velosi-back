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
import { Lead } from '../../entities/crm/lead.entity';
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
    // Calcul des totaux
    const subtotal = quote.subtotal || 0;
    const taxAmount = quote.taxAmount || 0;
    const total = quote.total || 0;
    const freightPurchased = quote.freightPurchased || 0;
    const freightOffered = quote.freightOffered || 0;
    const freightMargin = quote.freightMargin || 0;
    const additionalCostsPurchased = quote.additionalCostsPurchased || 0;
    const additionalCostsOffered = quote.additionalCostsOffered || 0;
    const totalPurchases = quote.totalPurchases || 0;
    const totalOffers = quote.totalOffers || 0;
    const totalMargin = quote.totalMargin || 0;

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
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .content {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            background-color: white;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
          }
          th {
            background-color: #2196f3;
            color: white;
            font-weight: bold;
          }
          .totals-table {
            margin-left: auto;
            width: 60%;
          }
          .totals-table td {
            padding: 10px 15px;
          }
          .totals-table .label {
            font-weight: bold;
            text-align: right;
          }
          .totals-table .value {
            text-align: right;
          }
          .highlight {
            background-color: #e3f2fd;
            font-weight: bold;
            font-size: 16px;
          }
          .success {
            background-color: #e8f5e9;
            color: #2e7d32;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            padding: 20px;
            background-color: #f8f9fa;
            border-top: 3px solid #2196f3;
            margin-top: 30px;
            color: #6c757d;
            font-size: 12px;
          }
          .text-right {
            text-align: right;
          }
          .view-button {
            display: inline-block;
            padding: 15px 30px;
            background-color: #2196f3;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
          }
          .view-button:hover {
            background-color: #1976d2;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Cotation ${quote.quoteNumber}</h1>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formatDate(quote.createdAt)}</p>
          <p style="margin: 5px 0;"><strong>Validité:</strong> ${formatDate(quote.validUntil)}</p>
        </div>

        ${sendData.emailBody ? `
          <div class="content">
            <p>${sendData.emailBody.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        <!-- Bouton de visualisation avec tracking -->
        <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f0f7ff; border-radius: 8px;">
          <p style="margin: 0 0 15px 0; font-size: 16px; color: #333;">
            Cliquez sur le bouton ci-dessous pour visualiser votre cotation en ligne
          </p>
          <a href="${viewLink}" class="view-button" target="_blank">
            📄 Voir la cotation
          </a>
          <p style="margin: 15px 0 0 0; font-size: 12px; color: #666;">
            Ce lien vous permettra de consulter tous les détails de votre cotation
          </p>
        </div>

        <div class="content">
          <h2 style="color: #2196f3; margin-top: 0;">Informations Client</h2>
          <p><strong>Nom:</strong> ${quote.clientName || '-'}</p>
          <p><strong>Entreprise:</strong> ${quote.clientCompany || '-'}</p>
          <p><strong>Email:</strong> ${quote.clientEmail || '-'}</p>
          <p><strong>Téléphone:</strong> ${quote.clientPhone || '-'}</p>
        </div>

        <h2 style="color: #2196f3;">Détails de la cotation</h2>
        <p><strong>Titre:</strong> ${quote.title}</p>

        <h3>Lignes de cotation</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 40%;">Description</th>
              <th style="width: 10%;">Type</th>
              <th style="width: 10%;">Qté</th>
              <th style="width: 15%;">Prix unitaire</th>
              <th style="width: 15%;">Total HT</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items?.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.description}</td>
                <td>${item.itemType === 'freight' ? 'Fret' : 'Frais annexe'}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatAmount(item.sellingPrice || item.unitPrice)} TND</td>
                <td class="text-right">${formatAmount(item.totalPrice || 0)} TND</td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align: center;">Aucune ligne</td></tr>'}
          </tbody>
        </table>

        <h3 style="color: #2196f3;">Résumé Financier</h3>
        <table class="totals-table">
          <tr>
            <td colspan="2" style="background-color: #f5f5f5; font-weight: bold;">FRET</td>
          </tr>
          <tr>
            <td class="label">Fret Offerte:</td>
            <td class="value">${formatAmount(freightOffered)} TND</td>
          </tr>
          <tr style="background-color: #fff3e0;">
            <td class="label">Marge Fret:</td>
            <td class="value">${formatAmount(freightMargin)} TND</td>
          </tr>
          
          <tr>
            <td colspan="2" style="background-color: #f5f5f5; font-weight: bold;">FRAIS ADDITIONNELS</td>
          </tr>
          <tr>
            <td class="label">Frais Offre:</td>
            <td class="value">${formatAmount(additionalCostsOffered)} TND</td>
          </tr>
          
          <tr>
            <td colspan="2" style="background-color: #f5f5f5; font-weight: bold;">TOTAUX</td>
          </tr>
          <tr>
            <td class="label">TOT.Offre (HT):</td>
            <td class="value">${formatAmount(totalOffers)} TND</td>
          </tr>
          <tr>
            <td class="label">Sous-total HT:</td>
            <td class="value">${formatAmount(subtotal)} TND</td>
          </tr>
          <tr>
            <td class="label">TVA (${quote.taxRate || 19}%):</td>
            <td class="value">${formatAmount(taxAmount)} TND</td>
          </tr>
          <tr class="highlight">
            <td class="label">Total TTC:</td>
            <td class="value">${formatAmount(total)} TND</td>
          </tr>
          <tr class="success">
            <td class="label">Marge Totale:</td>
            <td class="value">${formatAmount(totalMargin)} TND</td>
          </tr>
        </table>

        ${quote.termsConditions ? `
          <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <h3 style="color: #2196f3;">Conditions et Termes</h3>
            <p>${quote.termsConditions.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p style="margin: 0 0 8px 0; font-weight: 500;">
            © ${new Date().getFullYear()} Velosi ERP - Tous droits réservés
          </p>
          <p style="margin: 0; font-size: 11px;">
            Cet email a été envoyé automatiquement. Pour toute question, veuillez contacter notre service commercial.
          </p>
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
   */
  async acceptQuote(id: number, acceptQuoteDto: AcceptQuoteDto): Promise<Quote> {
    const quote = await this.findOne(id);

    if (![QuoteStatus.SENT, QuoteStatus.VIEWED].includes(quote.status)) {
      throw new BadRequestException(
        `Impossible d'accepter un devis avec le statut ${quote.status}`,
      );
    }

    quote.status = QuoteStatus.ACCEPTED;
    quote.acceptedAt = new Date();

    if (acceptQuoteDto.notes) {
      quote.notes = quote.notes
        ? `${quote.notes}\n\nAcceptation: ${acceptQuoteDto.notes}`
        : `Acceptation: ${acceptQuoteDto.notes}`;
    }

    const updatedQuote = await this.quoteRepository.save(quote);

    // 🎯 SYNCHRONISATION AUTOMATIQUE: Opportunité → CLOSED_WON
    if (updatedQuote.opportunityId) {
      await this.updateOpportunityStage(
        updatedQuote.opportunityId,
        'closed_won',
        `Cotation ${updatedQuote.quoteNumber} acceptée`
      );
    }

    // Conversion automatique prospect/opportunité vers client permanent
    await this.autoConvertToClient(updatedQuote);

    return this.findOne(updatedQuote.id);
  }

  /**
   * Convertir automatiquement un prospect/opportunité en client TEMPORAIRE
   * lorsqu'une cotation est acceptée
   * NOTE: Création d'un client SANS mot de passe et SANS compte Keycloak
   */
  private async autoConvertToClient(quote: Quote): Promise<void> {
    try {
      console.log(`🔄 Vérification de conversion automatique pour cotation ${quote.quoteNumber}...`);

      // Si la cotation est déjà liée à un client existant, ne rien faire
      if (quote.clientId) {
        const existingClient = await this.clientRepository.findOne({
          where: { id: quote.clientId }
        });

        if (existingClient) {
          console.log(`✅ Cotation déjà liée à un client existant (ID: ${existingClient.id})`);
          return;
        }
      }

      let newClient: Client | null = null;
      let sourceType = '';

      // Cas 1: Cotation liée à un lead (prospect)
      if (quote.leadId) {
        const lead = await this.leadRepository.findOne({
          where: { id: quote.leadId }
        });

        if (lead) {
          console.log(`📋 Lead trouvé: ${lead.fullName} (${lead.company})`);
          sourceType = 'Lead/Prospect';

          // Mapper les données du lead vers un nouveau client TEMPORAIRE
          newClient = await this.createTemporaryClientFromLead(lead, quote);
        }
      }

      // Cas 2: Cotation liée à une opportunité
      if (quote.opportunityId && !newClient) {
        const opportunity = await this.opportunityRepository.findOne({
          where: { id: quote.opportunityId },
          relations: ['lead']
        });

        if (opportunity) {
          console.log(`💼 Opportunité trouvée: ${opportunity.title}`);
          sourceType = 'Opportunité';

          // Si l'opportunité a un lead lié, utiliser ces données
          if (opportunity.lead) {
            newClient = await this.createTemporaryClientFromLead(opportunity.lead, quote);
          } else {
            // Sinon, créer à partir des données de la cotation
            newClient = await this.createTemporaryClientFromQuote(quote);
          }
        }
      }

      // Si un client a été créé, mettre à jour la cotation
      if (newClient) {
        console.log(`✅ Client temporaire créé avec succès: ${newClient.nom} (ID: ${newClient.id})`);
        
        // Mettre à jour la cotation avec le nouveau client
        await this.quoteRepository.update(quote.id, {
          clientId: newClient.id
        });

        // Ajouter une note dans la cotation
        const conversionNote = `\n\n[${new Date().toLocaleString('fr-FR')}] Client temporaire créé automatiquement depuis ${sourceType} suite à l'acceptation de la cotation.`;
        await this.quoteRepository.update(quote.id, {
          notes: quote.notes ? quote.notes + conversionNote : conversionNote
        });

        console.log(`✅ Cotation ${quote.quoteNumber} mise à jour avec le client ID: ${newClient.id}`);
      } else {
        console.log(`⚠️ Aucun client créé - données insuffisantes ou cotation sans lead/opportunité`);
      }

    } catch (error) {
      console.error(`❌ Erreur lors de la conversion automatique en client:`, error);
      // Ne pas faire échouer l'acceptation de la cotation si la conversion échoue
      // L'utilisateur pourra créer le client manuellement si nécessaire
    }
  }

  /**
   * Créer un client TEMPORAIRE à partir d'un lead (prospect)
   * SANS mot de passe et SANS compte Keycloak
   */
  private async createTemporaryClientFromLead(lead: Lead, quote: Quote): Promise<Client> {
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

    console.log(`🔧 Création client TEMPORAIRE depuis lead: ${lead.fullName}`);
    console.log(`   ⚠️ SANS mot de passe et SANS compte Keycloak`);
    
    const newClient = await this.clientService.create(clientData as any);

    // NE PAS créer de compte Keycloak - Client temporaire uniquement
    console.log(`✅ Client temporaire créé (ID: ${newClient.id}) - Aucun accès web`);

    return newClient;
  }

  /**
   * Créer un client TEMPORAIRE à partir des données de cotation
   * SANS mot de passe et SANS compte Keycloak
   */
  private async createTemporaryClientFromQuote(quote: Quote): Promise<Client> {
    const clientData = {
      nom: quote.clientCompany || quote.clientName,
      interlocuteur: quote.clientName,
      categorie: 'CLIENT',
      type_client: 'PROSPECT_CONVERTI',
      adresse: quote.clientAddress || null,
      pays: quote.country || 'Tunisie',
      etat_fiscal: EtatFiscal.ASSUJETTI_TVA,
      timbre: true,
      statut: 'actif',
      is_permanent: false, // CLIENT TEMPORAIRE
      mot_de_passe: null, // PAS de mot de passe
      keycloak_id: null, // PAS de compte Keycloak
      // Contact
      contact_mail1: quote.clientEmail,
      contact_tel1: quote.clientPhone || null,
    };

    console.log(`🔧 Création client TEMPORAIRE depuis cotation: ${quote.clientName}`);
    console.log(`   ⚠️ SANS mot de passe et SANS compte Keycloak`);
    
    const newClient = await this.clientService.create(clientData as any);

    // NE PAS créer de compte Keycloak - Client temporaire uniquement
    console.log(`✅ Client temporaire créé (ID: ${newClient.id}) - Aucun accès web`);

    return newClient;
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
