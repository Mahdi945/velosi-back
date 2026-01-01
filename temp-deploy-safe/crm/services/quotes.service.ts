import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Quote, QuoteStatus } from '../entities/quote.entity';
import { QuoteItem } from '../entities/quote-item.entity';
import { Lead, LeadStatus } from '../../entities/crm/lead.entity';
import { Opportunity, OpportunityStage } from '../../entities/crm/opportunity.entity';
import { Client, EtatFiscal } from '../../entities/client.entity';
import { DatabaseConnectionService } from '../../common/database-connection.service';
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
    private databaseConnectionService: DatabaseConnectionService,
    private emailService: EmailService,
    private clientService: ClientService,
  ) {}

  /**
   * 🔄 Transformer un item de snake_case vers camelCase
   */
  private transformItemToCamelCase(item: any): any {
    if (!item) return null;
    
    return {
      id: item.id,
      quoteId: item.quote_id,
      description: item.description,
      category: item.category,
      vehicleDescription: item.vehicle_description,
      cargoDesignation: item.cargo_designation,
      packagesCount: item.packages_count,
      weightKg: item.weight_kg,
      volumeM3: item.volume_m3,
      lengthCm: item.length_cm,
      widthCm: item.width_cm,
      heightCm: item.height_cm,
      volumetricWeight: item.volumetric_weight,
      originStreet: item.origin_street,
      originCity: item.origin_city,
      originPostalCode: item.origin_postal_code,
      originCountry: item.origin_country,
      destinationStreet: item.destination_street,
      destinationCity: item.destination_city,
      destinationPostalCode: item.destination_postal_code,
      destinationCountry: item.destination_country,
      distanceKm: item.distance_km,
      vehicleType: item.vehicle_type,
      serviceType: item.service_type,
      currency: item.currency,
      conversionRate: item.conversion_rate,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unit_price, // ✅ CRITIQUE: Transformation snake_case → camelCase
      purchasePrice: item.purchase_price, // ✅ CRITIQUE
      sellingPrice: item.selling_price, // ✅ CRITIQUE
      totalPrice: item.total_price,
      margin: item.margin,
      itemType: item.item_type,
      lineOrder: item.line_order,
      notes: item.notes,
      taxRate: item.tax_rate,
      taxAmount: item.tax_amount,
      isTaxable: item.is_taxable,
      taxableAccount: item.taxable_account,
      nonTaxableAccount: item.non_taxable_account,
      isDebours: item.is_debours,
      caType: item.ca_type,
    };
  }

  /**
   * 🔄 Transformer les noms de colonnes snake_case en camelCase
   */
  private transformQuoteToCamelCase(quote: any): any {
    if (!quote) return null;
    
    return {
      id: quote.id,
      uuid: quote.uuid,
      quoteNumber: quote.quote_number,
      opportunityId: quote.opportunity_id,
      leadId: quote.lead_id,
      clientId: quote.client_id,
      title: quote.title,
      status: quote.status,
      type: quote.type,
      validUntil: quote.valid_until,
      sentAt: quote.sent_at,
      viewedAt: quote.viewed_at,
      acceptedAt: quote.accepted_at,
      rejectedAt: quote.rejected_at,
      clientName: quote.client_name,
      clientCompany: quote.client_company,
      clientEmail: quote.client_email,
      clientPhone: quote.client_phone,
      clientAddress: quote.client_address,
      subtotal: quote.subtotal,
      taxRate: quote.tax_rate,
      taxAmount: quote.tax_amount,
      total: quote.total,
      paymentTerms: quote.payment_terms,
      deliveryTerms: quote.delivery_terms,
      termsConditions: quote.terms_conditions,
      notes: quote.notes,
      rejectionReason: quote.rejection_reason,
      createdAt: quote.created_at,
      updatedAt: quote.updated_at,
      createdBy: quote.created_by,
      updatedBy: quote.updated_by,
      approvedBy: quote.approved_by,
      commercialId: quote.commercial_id,
      commercialIds: quote.commercial_ids || [],
      country: quote.country,
      tiers: quote.tiers,
      attentionTo: quote.attention_to,
      pickupLocation: quote.pickup_location,
      deliveryLocation: quote.delivery_location,
      transitTime: quote.transit_time,
      departureFrequency: quote.departure_frequency,
      clientType: quote.client_type,
      importExport: quote.import_export,
      fileStatus: quote.file_status,
      terms: quote.terms,
      paymentMethod: quote.payment_method,
      paymentConditions: quote.payment_conditions,
      condition: quote.condition,
      requester: quote.requester,
      vehicleId: quote.vehicle_id,
      freightPurchased: quote.freight_purchased,
      freightOffered: quote.freight_offered,
      freightMargin: quote.freight_margin,
      additionalCostsPurchased: quote.additional_costs_purchased,
      additionalCostsOffered: quote.additional_costs_offered,
      totalPurchases: quote.total_purchases,
      totalOffers: quote.total_offers,
      totalMargin: quote.total_margin,
      internalInstructions: quote.internal_instructions,
      customerRequest: quote.customer_request,
      exchangeNotes: quote.exchange_notes,
      qrCodeData: quote.qr_code_data,
      deletedAt: quote.deleted_at,
      isArchived: quote.is_archived,
      archivedReason: quote.archived_reason,
      archivedBy: quote.archived_by,
      armateurId: quote.armateur_id,
      navireId: quote.navire_id,
      portEnlevementId: quote.port_enlevement_id,
      portLivraisonId: quote.port_livraison_id,
      aeroportEnlevementId: quote.aeroport_enlevement_id,
      aeroportLivraisonId: quote.aeroport_livraison_id,
      hbl: quote.hbl,
      mbl: quote.mbl,
      // Jointures
      leadCompany: quote.lead_company,
      leadName: quote.lead_name,
      opportunityTitle: quote.opportunity_title,
      creatorNom: quote.creator_nom,
      creatorPrenom: quote.creator_prenom,
      updaterNom: quote.updater_nom,
      updaterPrenom: quote.updater_prenom,
      // Construire l'objet creator complet
      creator: quote.creator_id ? {
        id: quote.creator_id,
        nom: quote.creator_nom,
        prenom: quote.creator_prenom
      } : null,
      // Construire l'objet updater complet
      updater: quote.updater_id ? {
        id: quote.updater_id,
        nom: quote.updater_nom,
        prenom: quote.updater_prenom
      } : null,
      armateurName: quote.armateur_name,
      navireName: quote.navire_name,
      portEnlevementName: quote.port_enlevement_name,
      portLivraisonName: quote.port_livraison_name,
      aeroportEnlevementName: quote.aeroport_enlevement_name,
      aeroportLivraisonName: quote.aeroport_livraison_name,
      // Items et commerciaux (si chargés) - ✅ CORRECTION: Transformer les items aussi
      items: (quote.items || []).map((item: any) => this.transformItemToCamelCase(item)),
      assignedCommercials: quote.assignedCommercials || [],
    };
  }

  /**
   * ⚠️ ATTENTION - SERVICE À MIGRER VERS CONNEXION DYNAMIQUE
   * 
   * 🔴 PROBLÈME: Ce service utilise des @InjectRepository qui se connectent à la base par défaut (velosi)
   * au lieu de la base spécifiée dans le JWT (danino, etc.)
   * 
   * 📋 MIGRATION NÉCESSAIRE:
   * 1. Supprimer tous les @InjectRepository (Quote, QuoteItem, Lead, Opportunity, Client)
   * 2. Injecter uniquement DatabaseConnectionService
   * 3. Convertir tous les appels Repository en connection.query()
   * 4. Ajouter paramètre databaseName à toutes les méthodes
   * 5. Mettre à jour le controller pour passer databaseName
   * 
   * 📊 COMPLEXITÉ: Service très volumineux (2226 lignes)
   * - 20+ utilisations de this.quoteRepository
   * - 10+ utilisations de this.quoteItemRepository
   * - Utilise aussi leadRepository, opportunityRepository, clientRepository
   * - Logique métier complexe (génération QR code, envoi emails, PDF)
   * 
   * 🎯 PRIORITÉ: HAUTE - Service critique pour les cotations
   * 
   * Voir MIGRATION_TYPEORM_TO_DYNAMIC_CONNECTION.md pour le guide complet
   */

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
  private async generateQuoteNumber(databaseName: string): Promise<string> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      
      const pattern = `Q${year}/${month}-%`;
      
      const result = await connection.query(
        `SELECT quote_number as "quoteNumber" 
         FROM crm_quotes 
         WHERE quote_number LIKE $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [pattern]
      );

      let sequence = 1; // Par défaut, premier devis du mois

      if (result && result.length > 0 && result[0].quoteNumber) {
        // Extraire la séquence du dernier numéro (ex: "Q25/11-5" → 5)
        const match = result[0].quoteNumber.match(/-(\d+)$/);
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
   * Créer un nouveau devis
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   */
  async create(
    createQuoteDto: CreateQuoteDto,
    userId: number,
    databaseName: string,
    organisationId: number
  ): Promise<Quote> {
    try {
      console.log('📝 [QuotesService.create] ========================================');
      console.log('📝 [QuotesService.create] userId reçu:', userId, 'Type:', typeof userId);
      console.log('🏢 [QuotesService.create] Multi-tenant:', { databaseName, organisationId });
      console.log('📝 [QuotesService.create] DTO createdBy:', createQuoteDto.createdBy);
      console.log('📝 [QuotesService.create] ========================================');
      
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      // Générer le numéro de devis
      const quoteNumber = await this.generateQuoteNumber(databaseName);

      // ✅ Gérer les commerciaux (nouveau système multi-commerciaux)
      let commercialIds = [];
      if (createQuoteDto.commercialIds && createQuoteDto.commercialIds.length > 0) {
        commercialIds = createQuoteDto.commercialIds;
      } else if (createQuoteDto.commercialId) {
        commercialIds = [createQuoteDto.commercialId];
      }
      const firstCommercialId = commercialIds.length > 0 ? commercialIds[0] : null;

      // Insérer le quote
      const quoteInsertSql = `
        INSERT INTO crm_quotes (
          quote_number, title, status, type, valid_until,
          client_name, client_company, client_email, client_phone, client_address,
          opportunity_id, lead_id, client_id,
          commercial_id, commercial_ids,
          organisation_id,
          subtotal, tax_amount, tax_rate, total,
          freight_purchased, freight_offered, freight_margin,
          additional_costs_purchased, additional_costs_offered,
          total_purchases, total_offers, total_margin,
          created_by, notes,
          country, tiers, attention_to, pickup_location, delivery_location,
          transit_time, departure_frequency, client_type, import_export,
          file_status, terms, payment_method, payment_conditions, requester, vehicle_id,
          condition, hbl, mbl,
          armateur_id, navire_id, port_enlevement_id, port_livraison_id,
          aeroport_enlevement_id, aeroport_livraison_id
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13,
          $14, $15,
          $16,
          $17, $18, $19, $20,
          $21, $22, $23,
          $24, $25,
          $26, $27, $28,
          $29, $30,
          $31, $32, $33, $34, $35,
          $36, $37, $38, $39,
          $40, $41, $42, $43, $44, $45,
          $46, $47, $48, $49, $50,
          $51, $52, $53,
          $54, $55, $56, $57,
          $58, $59
        ) RETURNING *
      `;

      const result = await connection.query(quoteInsertSql, [
        quoteNumber,
        createQuoteDto.title,
        QuoteStatus.DRAFT,
        createQuoteDto.type || 'cotation',
        createQuoteDto.validUntil,
        createQuoteDto.clientName,
        createQuoteDto.clientCompany,
        createQuoteDto.clientEmail,
        createQuoteDto.clientPhone,
        createQuoteDto.clientAddress,
        createQuoteDto.opportunityId || null,
        createQuoteDto.leadId || null,
        createQuoteDto.clientId || null,
        firstCommercialId,
        commercialIds,
        organisationId, // ✅ Enregistrer l'organisation_id
        0, 0, createQuoteDto.taxRate || 19.0, 0,
        0, 0, 0,
        0, 0,
        0, 0, 0,
        userId,
        createQuoteDto.notes || null,
        createQuoteDto.country || null,
        createQuoteDto.tiers || null,
        createQuoteDto.attentionTo || null,
        createQuoteDto.pickupLocation || null,
        createQuoteDto.deliveryLocation || null,
        createQuoteDto.transitTime || null,
        createQuoteDto.departureFrequency || null,
        createQuoteDto.clientType || null,
        createQuoteDto.importExport || null,
        createQuoteDto.fileStatus || null,
        createQuoteDto.terms || null,
        createQuoteDto.paymentMethod || null,
        createQuoteDto.paymentConditions || null,
        createQuoteDto.requester || null,
        createQuoteDto.vehicleId || null,
        createQuoteDto.condition || null,
        createQuoteDto.hbl || null,
        createQuoteDto.mbl || null,
        createQuoteDto.armateurId || null,
        createQuoteDto.navireId || null,
        createQuoteDto.portEnlevementId || null,
        createQuoteDto.portLivraisonId || null,
        createQuoteDto.aeroportEnlevementId || null,
        createQuoteDto.aeroportLivraisonId || null
      ]);
      const savedQuote = result[0];

      console.log('💾 [QuotesService.create] Quote sauvegardée:', savedQuote.id);

      // Créer les lignes (items)
      if (createQuoteDto.items && createQuoteDto.items.length > 0) {
        console.log(`📝 [CREATE] Création de ${createQuoteDto.items.length} items`);
        
        for (let index = 0; index < createQuoteDto.items.length; index++) {
          const item = createQuoteDto.items[index];
          
          // Calculs identiques à la version Git (sans conversion dans totalPrice/margin, appliquée plus tard)
          const conversionRate = item.conversionRate || 1;
          const sellingPrice = item.sellingPrice || item.unitPrice || 0;
          const purchasePrice = item.purchasePrice || 0;
          const totalPrice = item.quantity * sellingPrice; // Sans conversion ici
          const margin = sellingPrice - purchasePrice; // Sans conversion ici
          
          await connection.query(
            `INSERT INTO crm_quote_items (
              quote_id, description, category, vehicle_description, cargo_designation,
              packages_count, weight_kg, volume_m3, length_cm, width_cm, height_cm, volumetric_weight,
              origin_street, origin_city, origin_postal_code, origin_country,
              destination_street, destination_city, destination_postal_code, destination_country,
              distance_km, vehicle_type, service_type,
              currency, conversion_rate, unit,
              quantity, unit_price, selling_price, purchase_price,
              total_price, margin, item_type, line_order, notes,
              tax_rate, tax_amount, is_taxable, taxable_account, non_taxable_account,
              is_debours, ca_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42)`,
            [
              savedQuote.id, // $1
              item.description, // $2
              item.category || null, // $3
              item.vehicleDescription || null, // $4
              item.cargoDesignation || null, // $5
              item.packagesCount || null, // $6
              item.weightKg || null, // $7
              item.volumeM3 || null, // $8
              item.lengthCm || null, // $9
              item.widthCm || null, // $10
              item.heightCm || null, // $11
              item.volumetricWeight || null, // $12
              item.originStreet || null, // $13
              item.originCity || null, // $14
              item.originPostalCode || null, // $15
              item.originCountry || null, // $16
              item.destinationStreet || null, // $17
              item.destinationCity || null, // $18
              item.destinationPostalCode || null, // $19
              item.destinationCountry || null, // $20
              item.distanceKm || null, // $21
              item.vehicleType || null, // $22
              item.serviceType || null, // $23
              item.currency || 'TND', // $24
              conversionRate, // $25
              item.unit || null, // $26
              item.quantity, // $27
              item.unitPrice || 0, // $28
              sellingPrice, // $29
              purchasePrice, // $30
              totalPrice, // $31
              margin, // $32
              item.itemType || 'freight', // $33
              item.lineOrder || (index + 1), // $34
              item.notes || null, // $35
              item.taxRate !== undefined ? item.taxRate : 19, // $36
              item.taxAmount || 0, // $37
              item.isTaxable !== undefined ? item.isTaxable : true, // $38
              item.taxableAccount || null, // $39
              item.nonTaxableAccount || null, // $40
              item.isDebours !== undefined ? item.isDebours : false, // $41
              item.caType || 'Oui' // $42
            ]
          );
        }
        
        console.log(`✅ [CREATE] ${createQuoteDto.items.length} items créés`);
      }

      // Recalculer les totaux
      await this.recalculateQuoteTotals(connection, savedQuote.id);

      // 🎯 Générer le QR code après la sauvegarde
      const fullQuote = await this.findOne(savedQuote.id, databaseName, organisationId);
      const qrCode = await this.generateQRCode(fullQuote);
      if (qrCode) {
        await connection.query(
          `UPDATE crm_quotes SET qr_code_data = $1 WHERE id = $2`,
          [qrCode, savedQuote.id]
        );
      }

      // 🎯 SYNCHRONISATION: déplacer l'opportunité dans "proposal"
      if (savedQuote.opportunity_id) {
        await this.moveOpportunityToProposal(savedQuote.opportunity_id, databaseName);
      }

      return this.findOne(savedQuote.id, databaseName, organisationId);
    } catch (error) {
      console.error('❌ [QuotesService.create] Erreur:', error);
      throw new InternalServerErrorException(
        `Erreur lors de la création du devis: ${error.message}`,
      );
    }
  }

  /**
   * Recalculer les totaux d'un quote en SQL
   */
  private async recalculateQuoteTotals(connection: any, quoteId: number): Promise<void> {
    const items = await connection.query(
      `SELECT * FROM crm_quote_items WHERE quote_id = $1`,
      [quoteId]
    );

    let freightPurchased = 0, freightOffered = 0;
    let additionalCostsPurchased = 0, additionalCostsOffered = 0;
    let taxAmount = 0;

    for (const item of items) {
      const conversionRate = item.conversion_rate || 1;
      const totalPrice = item.quantity * (item.selling_price || item.unit_price) * conversionRate;
      const margin = ((item.selling_price || item.unit_price) - (item.purchase_price || 0)) * conversionRate;

      if (item.item_type === 'freight') {
        freightPurchased += item.quantity * (item.purchase_price || 0) * conversionRate;
        freightOffered += totalPrice;
      } else if (item.item_type === 'additional_cost') {
        additionalCostsPurchased += item.quantity * (item.purchase_price || 0) * conversionRate;
        additionalCostsOffered += totalPrice;
      }

      // Calculer la TVA par ligne
      if (item.is_taxable !== false) {
        const taxRate = item.tax_rate || 19;
        taxAmount += totalPrice * (taxRate / 100);
      }
    }

    const totalOffers = freightOffered + additionalCostsOffered;
    const totalPurchases = freightPurchased + additionalCostsPurchased;
    const subtotal = totalOffers;
    const total = subtotal + taxAmount;

    await connection.query(
      `UPDATE crm_quotes SET
        subtotal = $1,
        tax_amount = $2,
        total = $3,
        freight_purchased = $4,
        freight_offered = $5,
        freight_margin = $6,
        additional_costs_purchased = $7,
        additional_costs_offered = $8,
        total_purchases = $9,
        total_offers = $10,
        total_margin = $11
      WHERE id = $12`,
      [
        subtotal, taxAmount, total,
        freightPurchased, freightOffered, freightOffered - freightPurchased,
        additionalCostsPurchased, additionalCostsOffered,
        totalPurchases, totalOffers, totalOffers - totalPurchases,
        quoteId
      ]
    );
  }

  /**
   * Récupérer tous les devis avec filtres
   * ✅ CORRECTION: Retourne UNIQUEMENT les cotations NON-ARCHIVÉES par défaut
   * Pour les archivées, utiliser findAllArchived()
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName, SANS filtre organisation_id
   */
  async findAll(
    filters: QuoteFilterDto,
    databaseName: string,
    organisationId: number
  ): Promise<{ data: Quote[]; total: number }> {
    console.log('🔍 [QuotesService.findAll] Début avec filtres:', filters);
    console.log('🏢 [QuotesService.findAll] Multi-tenant:', { databaseName, organisationId });
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
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
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = filters;

    console.log('🔍 Backend: Récupération des cotations NON-ARCHIVÉES uniquement');
    
    // Construction dynamique de la requête SQL
    const params: any[] = [];
    let paramIndex = 1;
    
    let sql = `
      SELECT q.*,
             l.company as lead_company, l.full_name as lead_name,
             o.title as opportunity_title,
             c.nom as client_db_name,
             p.id as creator_id, p.nom as creator_nom, p.prenom as creator_prenom,
             u.id as updater_id, u.nom as updater_nom, u.prenom as updater_prenom
      FROM crm_quotes q
      LEFT JOIN crm_leads l ON q.lead_id = l.id
      LEFT JOIN crm_opportunities o ON q.opportunity_id = o.id
      LEFT JOIN client c ON q.client_id = c.id
      LEFT JOIN personnel p ON q.created_by = p.id
      LEFT JOIN personnel u ON q.updated_by = u.id
      WHERE (q.is_archived = false OR q.is_archived IS NULL)
        AND q.deleted_at IS NULL
    `;

    // Appliquer les filtres dynamiquement
    if (status) {
      sql += ` AND q.status = $${paramIndex++}`;
      params.push(status);
    }
    if (opportunityId) {
      sql += ` AND q.opportunity_id = $${paramIndex++}`;
      params.push(opportunityId);
    }
    if (leadId) {
      sql += ` AND q.lead_id = $${paramIndex++}`;
      params.push(leadId);
    }
    if (clientId) {
      sql += ` AND q.client_id = $${paramIndex++}`;
      params.push(clientId);
    }
    if (commercialId) {
      // Ne PAS inclure les cotations non assignées pour les commerciaux
      sql += ` AND (q.commercial_id = $${paramIndex} OR $${paramIndex} = ANY(q.commercial_ids))`;
      params.push(commercialId);
      paramIndex++;
    }
    if (search) {
      sql += ` AND (
        q.quote_number ILIKE $${paramIndex} OR
        q.client_name ILIKE $${paramIndex} OR
        q.client_company ILIKE $${paramIndex} OR
        q.title ILIKE $${paramIndex} OR
        q.client_email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (startDate && endDate) {
      sql += ` AND q.created_at BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params.push(startDate, endDate);
    }
    if (minTotal !== undefined) {
      sql += ` AND q.total >= $${paramIndex++}`;
      params.push(minTotal);
    }
    if (maxTotal !== undefined) {
      sql += ` AND q.total <= $${paramIndex++}`;
      params.push(maxTotal);
    }
    if (importExport) {
      sql += ` AND q.import_export = $${paramIndex++}`;
      params.push(importExport);
    }
    if (paymentMethod) {
      sql += ` AND q.payment_method = $${paramIndex++}`;
      params.push(paymentMethod);
    }
    if (type) {
      sql += ` AND q.type = $${paramIndex++}`;
      params.push(type);
    }

    // Compte total
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_query`;
    const [{ total }] = await connection.query(countSql, params);

    // Tri et pagination
    const orderColumn = sortBy === 'createdAt' ? 'created_at' : 
                       sortBy === 'updatedAt' ? 'updated_at' : sortBy;
    sql += ` ORDER BY q.${orderColumn} ${sortOrder}`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, (page - 1) * limit);

    const data = await connection.query(sql, params);

    // Charger les items pour chaque quote
    for (const quote of data) {
      quote.items = await connection.query(
        `SELECT * FROM crm_quote_items WHERE quote_id = $1 ORDER BY line_order, id`,
        [quote.id]
      );
      
      // Charger les commerciaux assignés
      if (quote.commercial_ids && quote.commercial_ids.length > 0) {
        const commercialIdsArray = typeof quote.commercial_ids === 'string' 
          ? JSON.parse(quote.commercial_ids) 
          : quote.commercial_ids;
        
        const commercials = await connection.query(
          `SELECT id, nom, prenom, nom_utilisateur, email, telephone, role
           FROM personnel
           WHERE id = ANY($1)`,
          [commercialIdsArray]
        );
        quote.assignedCommercials = commercials;
      }
    }

    console.log(`✅ Backend retourne ${data.length} cotations NON-ARCHIVÉES (total: ${total})`);
    return { 
      data: data.map(quote => this.transformQuoteToCamelCase(quote)), 
      total: parseInt(total) 
    };
  }

  /**
   * 📋 Récupérer UNIQUEMENT les cotations archivées avec filtres
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName, SANS filtre organisation_id
   * ✅ NOUVELLE MÉTHODE pour séparer les archivées des non-archivées
   */
  async findAllArchived(filters: QuoteFilterDto, databaseName: string, organisationId: number) {
    const {
      status,
      commercialId,
      search,
      startDate,
      endDate,
      type,
      page = 1,
      limit = 25,
      sortBy = 'deleted_at',
      sortOrder = 'DESC',
    } = filters || {};

    console.log('🗄️ Backend: Récupération des cotations ARCHIVÉES uniquement');

    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const params: any[] = [];
    let paramIndex = 1;

    let sql = `
      SELECT q.*,
             l.company as lead_company, l.full_name as lead_name,
             o.title as opportunity_title,
             c.nom as client_db_name, c.interlocuteur as client_prenom,
             p.id as creator_id, p.nom as creator_nom, p.prenom as creator_prenom,
             u.id as updater_id, u.nom as updater_nom, u.prenom as updater_prenom
      FROM crm_quotes q
      LEFT JOIN crm_leads l ON q.lead_id = l.id
      LEFT JOIN crm_opportunities o ON q.opportunity_id = o.id
      LEFT JOIN client c ON q.client_id = c.id
      LEFT JOIN personnel p ON q.created_by = p.id
      LEFT JOIN personnel u ON q.updated_by = u.id
      WHERE q.deleted_at IS NOT NULL
    `;

    // Appliquer les filtres
    if (commercialId) {
      sql += ` AND (q.commercial_id = $${paramIndex} OR $${paramIndex} = ANY(q.commercial_ids))`;
      params.push(commercialId);
      paramIndex++;
    }
    if (status) {
      sql += ` AND q.status = $${paramIndex++}`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (
        q.quote_number ILIKE $${paramIndex} OR
        q.client_name ILIKE $${paramIndex} OR
        q.client_company ILIKE $${paramIndex} OR
        q.title ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (startDate && endDate) {
      sql += ` AND q.deleted_at BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params.push(startDate, endDate);
    }
    if (type) {
      sql += ` AND q.type = $${paramIndex++}`;
      params.push(type);
    }

    // Compte total
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_query`;
    const [{ total }] = await connection.query(countSql, params);

    // Tri et pagination
    const orderColumn = sortBy === 'deletedAt' ? 'deleted_at' : 
                       sortBy === 'createdAt' ? 'created_at' : sortBy;
    sql += ` ORDER BY q.${orderColumn} ${sortOrder}`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, (page - 1) * limit);

    const data = await connection.query(sql, params);

    // Charger les items pour chaque quote
    for (const quote of data) {
      quote.items = await connection.query(
        `SELECT * FROM crm_quote_items WHERE quote_id = $1 ORDER BY line_order, id`,
        [quote.id]
      );
      
      // Charger les commerciaux assignés
      if (quote.commercial_ids && quote.commercial_ids.length > 0) {
        const commercialIdsArray = typeof quote.commercial_ids === 'string' 
          ? JSON.parse(quote.commercial_ids) 
          : quote.commercial_ids;
        
        const commercials = await connection.query(
          `SELECT id, nom, prenom, nom_utilisateur, email, telephone, role
           FROM personnel
           WHERE id = ANY($1)`,
          [commercialIdsArray]
        );
        quote.assignedCommercials = commercials;
      }
    }

    console.log(`✅ Backend retourne ${data.length} cotations ARCHIVÉES (total: ${total})`);
    return { 
      data: data.map(quote => this.transformQuoteToCamelCase(quote)), 
      total: parseInt(total) 
    };
  }

  /**
   * Récupérer un devis par ID
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName, SANS filtre organisation_id
   * ✅ CORRECTION: Charger les commerciaux assignés depuis commercialIds
   */
  async findOne(id: number, databaseName: string, organisationId: number): Promise<Quote> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const quotes = await connection.query(
      `SELECT q.*,
              l.company as lead_company, l.full_name as lead_name,
              o.title as opportunity_title,
              c.nom as client_db_name, c.interlocuteur as client_prenom,
              p.id as creator_id, p.nom as creator_nom, p.prenom as creator_prenom,
              u.id as updater_id, u.nom as updater_nom, u.prenom as updater_prenom,
              arm.nom as armateur_name,
              nav.libelle as navire_name,
              pe.libelle as port_enlevement_name,
              pl.libelle as port_livraison_name,
              ae.libelle as aeroport_enlevement_name,
              al.libelle as aeroport_livraison_name
       FROM crm_quotes q
       LEFT JOIN crm_leads l ON q.lead_id = l.id
       LEFT JOIN crm_opportunities o ON q.opportunity_id = o.id
       LEFT JOIN client c ON q.client_id = c.id
       LEFT JOIN personnel p ON q.created_by = p.id
       LEFT JOIN personnel u ON q.updated_by = u.id
       LEFT JOIN armateurs arm ON q.armateur_id = arm.id
       LEFT JOIN navires nav ON q.navire_id = nav.id
       LEFT JOIN ports pe ON q.port_enlevement_id = pe.id
       LEFT JOIN ports pl ON q.port_livraison_id = pl.id
       LEFT JOIN aeroports ae ON q.aeroport_enlevement_id = ae.id
       LEFT JOIN aeroports al ON q.aeroport_livraison_id = al.id
       WHERE q.id = $1`,
      [id]
    );

    if (!quotes || quotes.length === 0) {
      throw new NotFoundException(`Devis avec l'ID ${id} introuvable`);
    }

    const quote = quotes[0];

    // Charger les items
    quote.items = await connection.query(
      `SELECT * FROM crm_quote_items WHERE quote_id = $1 ORDER BY id`,
      [id]
    );

    // ✅ Charger les commerciaux assignés depuis commercialIds
    if (quote.commercial_ids && quote.commercial_ids.length > 0) {
      const commercialIdsArray = typeof quote.commercial_ids === 'string' 
        ? JSON.parse(quote.commercial_ids) 
        : quote.commercial_ids;
      
      const commercials = await connection.query(
        `SELECT id, nom, prenom, nom_utilisateur, email, telephone, role
         FROM personnel
         WHERE id = ANY($1)`,
        [commercialIdsArray]
      );
      quote.assignedCommercials = commercials;
      console.log(`✅ ${commercials.length} commerciaux chargés pour cotation ${quote.quote_number}`);
    }

    console.log(`✅ Items triés par ID croissant pour cotation ${quote.quote_number}`);
    return this.transformQuoteToCamelCase(quote);
  }

  /**
   * Récupérer un devis par numéro
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName, SANS filtre organisation_id
   */
  async findByQuoteNumber(quoteNumber: string, databaseName: string, organisationId: number): Promise<Quote> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const quotes = await connection.query(
      `SELECT q.*,
              l.company as lead_company, l.full_name as lead_name,
              o.title as opportunity_title,
              c.nom as client_db_name, c.interlocuteur as client_prenom,
              p.id as creator_id, p.nom as creator_nom, p.prenom as creator_prenom,
              u.id as updater_id, u.nom as updater_nom, u.prenom as updater_prenom,
              arm.nom as armateur_name,
              nav.libelle as navire_name,
              pe.libelle as port_enlevement_name,
              pl.libelle as port_livraison_name,
              ae.libelle as aeroport_enlevement_name,
              al.libelle as aeroport_livraison_name
       FROM crm_quotes q
       LEFT JOIN crm_leads l ON q.lead_id = l.id
       LEFT JOIN crm_opportunities o ON q.opportunity_id = o.id
       LEFT JOIN client c ON q.client_id = c.id
       LEFT JOIN personnel p ON q.created_by = p.id
       LEFT JOIN personnel u ON q.updated_by = u.id
       LEFT JOIN armateurs arm ON q.armateur_id = arm.id
       LEFT JOIN navires nav ON q.navire_id = nav.id
       LEFT JOIN ports pe ON q.port_enlevement_id = pe.id
       LEFT JOIN ports pl ON q.port_livraison_id = pl.id
       LEFT JOIN aeroports ae ON q.aeroport_enlevement_id = ae.id
       LEFT JOIN aeroports al ON q.aeroport_livraison_id = al.id
       WHERE q.quote_number = $1`,
      [quoteNumber]
    );

    if (!quotes || quotes.length === 0) {
      throw new NotFoundException(`Devis ${quoteNumber} introuvable`);
    }

    const quote = quotes[0];

    // Charger les items triés par lineOrder et ID
    quote.items = await connection.query(
      `SELECT * FROM crm_quote_items WHERE quote_id = $1 ORDER BY line_order, id`,
      [quote.id]
    );

    // ✅ Charger les commerciaux assignés depuis commercialIds
    if (quote.commercial_ids && quote.commercial_ids.length > 0) {
      const commercialIdsArray = typeof quote.commercial_ids === 'string' 
        ? JSON.parse(quote.commercial_ids) 
        : quote.commercial_ids;
      
      const commercials = await connection.query(
        `SELECT id, nom, prenom, nom_utilisateur, email, telephone, role
         FROM personnel
         WHERE id = ANY($1)`,
        [commercialIdsArray]
      );
      quote.assignedCommercials = commercials;
    }

    console.log(`✅ Items triés par lineOrder et ID pour cotation ${quoteNumber}`);
    return this.transformQuoteToCamelCase(quote);
  }

  /**
   * 🌐 Récupérer un devis par UUID ou ID (ROUTE PUBLIQUE - Sans authentification)
   * ✅ Détecte automatiquement si c'est un UUID ou un ID
   * ✅ Cherche dans toutes les bases de données jusqu'à trouver la cotation
   * ✅ Récupère automatiquement les informations de l'organisation
   * ✅ Pas besoin de table centrale - l'UUID est unique globalement
   * ✅ Récupère dynamiquement la liste des bases depuis la table organisations
   */
  async findOnePublic(identifier: string): Promise<any> {
    // Détecter si c'est un UUID ou un ID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const isId = /^\d+$/.test(identifier);
    
    if (!isUuid && !isId) {
      throw new BadRequestException('L\'identifiant doit être un UUID ou un ID numérique');
    }
    
    console.log(`🔍 [findOnePublic] Recherche cotation par ${isUuid ? 'UUID' : 'ID'}: ${identifier}`);
    // Étape 1: Récupérer la liste de toutes les bases de données depuis organisations (base centrale shipnology)
    const shipnologyConnection = await this.databaseConnectionService.getOrganisationConnection('shipnology');
    const orgsResult = await shipnologyConnection.query(
      `SELECT DISTINCT database_name FROM organisations WHERE database_name IS NOT NULL AND database_name != '' ORDER BY database_name`
    );
    
    let databases = orgsResult.map((org: any) => org.database_name);
    
    // ✅ FALLBACK: Ajouter les bases principales si elles ne sont pas dans la table organisations
    const mainDatabases = ['velosi', 'danino'];
    for (const mainDb of mainDatabases) {
      if (!databases.includes(mainDb)) {
        databases.push(mainDb);
      }
    }
    
    console.log(`🔍 [findOnePublic] Recherche dans ${databases.length} bases:`, databases);
    
    let quote = null;
    let foundDatabase = null;
    let organisation = null;

    // Étape 2: Chercher dans toutes les bases jusqu'à trouver l'UUID
    for (const dbName of databases) {
      try {
        const connection = await this.databaseConnectionService.getOrganisationConnection(dbName);
        
        // Construire la requête selon le type d'identifiant
        const whereClause = isUuid ? 'q.uuid = $1' : 'q.id = $1';
        const paramValue = isUuid ? identifier : parseInt(identifier, 10);
        
        const quotes = await connection.query(
          `SELECT q.*,
                  l.company as lead_company, l.full_name as lead_name,
                  o.title as opportunity_title,
                  c.nom as client_db_name, c.interlocuteur as client_prenom,
                  p.nom as creator_nom, p.prenom as creator_prenom,
                  u.nom as updater_nom, u.prenom as updater_prenom,
                  arm.nom as armateur_name,
                  nav.libelle as navire_name,
                  pe.libelle as port_enlevement_name,
                  pl.libelle as port_livraison_name,
                  ae.libelle as aeroport_enlevement_name,
                  al.libelle as aeroport_livraison_name
           FROM crm_quotes q
           LEFT JOIN crm_leads l ON q.lead_id = l.id
           LEFT JOIN crm_opportunities o ON q.opportunity_id = o.id
           LEFT JOIN client c ON q.client_id = c.id
           LEFT JOIN personnel p ON q.created_by = p.id
           LEFT JOIN personnel u ON q.updated_by = u.id
           LEFT JOIN armateurs arm ON q.armateur_id = arm.id
           LEFT JOIN navires nav ON q.navire_id = nav.id
           LEFT JOIN ports pe ON q.port_enlevement_id = pe.id
           LEFT JOIN ports pl ON q.port_livraison_id = pl.id
           LEFT JOIN aeroports ae ON q.aeroport_enlevement_id = ae.id
           LEFT JOIN aeroports al ON q.aeroport_livraison_id = al.id
           WHERE ${whereClause}
           LIMIT 1`,
          [paramValue]
        );

        if (quotes && quotes.length > 0) {
          quote = quotes[0];
          foundDatabase = dbName;
          
          // Charger les items
          quote.items = await connection.query(
            `SELECT * FROM crm_quote_items WHERE quote_id = $1 ORDER BY line_order, id`,
            [quote.id]
          );

          // Charger les commerciaux assignés
          if (quote.commercial_ids && quote.commercial_ids.length > 0) {
            const commercialIdsArray = typeof quote.commercial_ids === 'string' 
              ? JSON.parse(quote.commercial_ids) 
              : quote.commercial_ids;
            
            const commercials = await connection.query(
              `SELECT id, nom, prenom, nom_utilisateur, email, telephone, role
               FROM personnel
               WHERE id = ANY($1)`,
              [commercialIdsArray]
            );
            quote.assignedCommercials = commercials;
          }

          console.log(`✅ [findOnePublic] Cotation ${quote.quote_number} trouvée dans: ${dbName}`);
          break;
        }
      } catch (error) {
        console.log(`ℹ️ [findOnePublic] Cotation non trouvée dans ${dbName}`);
      }
    }

    if (!quote) {
      throw new NotFoundException(`Cotation avec ${isUuid ? 'UUID' : 'ID'} ${identifier} introuvable`);
    }

    // Étape 3: Récupérer les informations de l'organisation depuis shipnology
    const organisations = await shipnologyConnection.query(
      `SELECT id, nom, nom_affichage, slug, adresse, telephone, logo_url, database_name
       FROM organisations WHERE id = $1`,
      [quote.organisation_id || 1]
    );

    organisation = organisations.length > 0 ? organisations[0] : null;

    // Étape 3: Transformer et ajouter les informations de l'organisation
    const transformedQuote = this.transformQuoteToCamelCase(quote);
    transformedQuote.organisation = organisation;

    console.log(`✅ Cotation publique ${quote.quote_number} (${isUuid ? 'UUID' : 'ID'}: ${identifier}) récupérée avec organisation:`, organisation?.nom || 'N/A');
    
    return transformedQuote;
  }

  /**
   * Récupérer un devis par numéro
              pe.libelle as port_enlevement_name,
              pl.libelle as port_livraison_name,
              ae.libelle as aeroport_enlevement_name,
              al.libelle as aeroport_livraison_name
       FROM crm_quotes q
       LEFT JOIN crm_leads l ON q.lead_id = l.id
       LEFT JOIN crm_opportunities o ON q.opportunity_id = o.id
       LEFT JOIN client c ON q.client_id = c.id
       LEFT JOIN personnel p ON q.created_by = p.id
       LEFT JOIN personnel u ON q.updated_by = u.id
       LEFT JOIN armateurs arm ON q.armateur_id = arm.id
       LEFT JOIN navires nav ON q.navire_id = nav.id
       LEFT JOIN ports pe ON q.port_enlevement_id = pe.id
       LEFT JOIN ports pl ON q.port_livraison_id = pl.id
       LEFT JOIN aeroports ae ON q.aeroport_enlevement_id = ae.id
       LEFT JOIN aeroports al ON q.aeroport_livraison_id = al.id
       WHERE q.id = $1`,
      [id]
    );

    if (!quotes || quotes.length === 0) {
      throw new NotFoundException(`Cotation avec l'ID ${id} introuvable`);
    }

    const quote = quotes[0];

    // Étape 6: Charger les items
    quote.items = await connection.query(
      `SELECT * FROM crm_quote_items WHERE quote_id = $1 ORDER BY line_order, id`,
      [id]
    );

    // Étape 7: Charger les commerciaux assignés
    if (quote.commercial_ids && quote.commercial_ids.length > 0) {
      const commercialIdsArray = typeof quote.commercial_ids === 'string' 
        ? JSON.parse(quote.commercial_ids) 
        : quote.commercial_ids;
      
      const commercials = await connection.query(
        `SELECT id, nom, prenom, nom_utilisateur, email, telephone, role
         FROM personnel
         WHERE id = ANY($1)`,
        [commercialIdsArray]
      );
      quote.assignedCommercials = commercials;
    }

    // Étape 8: Transformer et ajouter les informations de l'organisation
    const transformedQuote = this.transformQuoteToCamelCase(quote);
    transformedQuote.organisation = organisation;

    console.log(`✅ Cotation publique ${id} récupérée avec organisation:`, organisation?.nom || 'N/A');
    
    return transformedQuote;
  }

  /**
   * Mettre à jour un devis
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName, SANS filtre organisation_id
   * ✅ CORRECTION: Gérer la mise à jour des commerciaux multi-assignés
   */
  async update(id: number, updateQuoteDto: UpdateQuoteDto, databaseName: string, organisationId: number): Promise<Quote> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const quote = await this.findOne(id, databaseName, organisationId);

    console.log('🔄 [UPDATE] Données reçues pour mise à jour:', {
      id,
      leadId: updateQuoteDto.leadId,
      opportunityId: updateQuoteDto.opportunityId,
      clientId: updateQuoteDto.clientId,
      commercialIds: updateQuoteDto.commercialIds,
      commercialId: updateQuoteDto.commercialId,
      updatedBy: updateQuoteDto.updatedBy,
      itemsPresent: !!updateQuoteDto.items,
      itemsLength: updateQuoteDto.items?.length || 0,
    });

    // 🔍 LOG DÉTAILLÉ DES ITEMS REÇUS
    if (updateQuoteDto.items) {
      console.log('📦 [UPDATE] Items reçus du frontend:', JSON.stringify(updateQuoteDto.items, null, 2));
      // Log détaillé de chaque item
      updateQuoteDto.items.forEach((item, idx) => {
        console.log(`📦 [UPDATE] Item ${idx}:`, {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sellingPrice: item.sellingPrice,
          purchasePrice: item.purchasePrice,
          itemType: item.itemType,
          currency: item.currency,
          conversionRate: item.conversionRate,
        });
      });
    } else {
      console.log('⚠️ [UPDATE] AUCUN item reçu du frontend - les items ne seront PAS mis à jour');
    }

    // Vérifier que le devis peut être modifié
    const isFicheDossier = quote.type === 'fiche_dossier';
    if (!isFicheDossier && [QuoteStatus.ACCEPTED, QuoteStatus.EXPIRED, QuoteStatus.CANCELLED].includes(quote.status)) {
      throw new BadRequestException(
        `Impossible de modifier un devis avec le statut ${quote.status}`,
      );
    }

    // Construction dynamique de la requête UPDATE
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Champs simples
    if (updateQuoteDto.title !== undefined) { fields.push(`title = $${paramIndex++}`); params.push(updateQuoteDto.title); }
    if (updateQuoteDto.status !== undefined) { fields.push(`status = $${paramIndex++}`); params.push(updateQuoteDto.status); }
    if (updateQuoteDto.validUntil !== undefined) { fields.push(`valid_until = $${paramIndex++}`); params.push(updateQuoteDto.validUntil); }
    if (updateQuoteDto.clientName !== undefined) { fields.push(`client_name = $${paramIndex++}`); params.push(updateQuoteDto.clientName); }
    if (updateQuoteDto.clientCompany !== undefined) { fields.push(`client_company = $${paramIndex++}`); params.push(updateQuoteDto.clientCompany); }
    if (updateQuoteDto.clientEmail !== undefined) { fields.push(`client_email = $${paramIndex++}`); params.push(updateQuoteDto.clientEmail); }
    if (updateQuoteDto.clientPhone !== undefined) { fields.push(`client_phone = $${paramIndex++}`); params.push(updateQuoteDto.clientPhone); }
    if (updateQuoteDto.clientAddress !== undefined) { fields.push(`client_address = $${paramIndex++}`); params.push(updateQuoteDto.clientAddress); }
    if (updateQuoteDto.notes !== undefined) { fields.push(`notes = $${paramIndex++}`); params.push(updateQuoteDto.notes); }
    if (updateQuoteDto.taxRate !== undefined) { fields.push(`tax_rate = $${paramIndex++}`); params.push(updateQuoteDto.taxRate); }
    
    // Relations
    if ('leadId' in updateQuoteDto) { fields.push(`lead_id = $${paramIndex++}`); params.push(updateQuoteDto.leadId); }
    if ('opportunityId' in updateQuoteDto) { fields.push(`opportunity_id = $${paramIndex++}`); params.push(updateQuoteDto.opportunityId); }
    if ('clientId' in updateQuoteDto) { fields.push(`client_id = $${paramIndex++}`); params.push(updateQuoteDto.clientId); }
    if ('updatedBy' in updateQuoteDto) { fields.push(`updated_by = $${paramIndex++}`); params.push(updateQuoteDto.updatedBy); }
    
    // Commerciaux
    if (updateQuoteDto.commercialIds && updateQuoteDto.commercialIds.length > 0) {
      fields.push(`commercial_ids = $${paramIndex++}`);
      params.push(updateQuoteDto.commercialIds); // ✅ Passer le tableau directement, pas JSON.stringify
      fields.push(`commercial_id = $${paramIndex++}`);
      params.push(updateQuoteDto.commercialIds[0]);
      console.log(`✅ ${updateQuoteDto.commercialIds.length} commerciaux assignés`);
    } else if ('commercialId' in updateQuoteDto) {
      fields.push(`commercial_id = $${paramIndex++}`);
      params.push(updateQuoteDto.commercialId);
      fields.push(`commercial_ids = $${paramIndex++}`);
      params.push([updateQuoteDto.commercialId]); // ✅ Passer le tableau directement, pas JSON.stringify
    }

    // Transport
    if ('armateurId' in updateQuoteDto) { fields.push(`armateur_id = $${paramIndex++}`); params.push(updateQuoteDto.armateurId); }
    if ('navireId' in updateQuoteDto) { fields.push(`navire_id = $${paramIndex++}`); params.push(updateQuoteDto.navireId); }
    if ('portEnlevementId' in updateQuoteDto) { fields.push(`port_enlevement_id = $${paramIndex++}`); params.push(updateQuoteDto.portEnlevementId); }
    if ('portLivraisonId' in updateQuoteDto) { fields.push(`port_livraison_id = $${paramIndex++}`); params.push(updateQuoteDto.portLivraisonId); }
    if ('aeroportEnlevementId' in updateQuoteDto) { fields.push(`aeroport_enlevement_id = $${paramIndex++}`); params.push(updateQuoteDto.aeroportEnlevementId); }
    if ('aeroportLivraisonId' in updateQuoteDto) { fields.push(`aeroport_livraison_id = $${paramIndex++}`); params.push(updateQuoteDto.aeroportLivraisonId); }
    if (updateQuoteDto.hbl !== undefined) { fields.push(`hbl = $${paramIndex++}`); params.push(updateQuoteDto.hbl); }
    if (updateQuoteDto.mbl !== undefined) { fields.push(`mbl = $${paramIndex++}`); params.push(updateQuoteDto.mbl); }
    if (updateQuoteDto.condition !== undefined) { fields.push(`condition = $${paramIndex++}`); params.push(updateQuoteDto.condition); }

    // Autres champs de transport
    if (updateQuoteDto.country !== undefined) { fields.push(`country = $${paramIndex++}`); params.push(updateQuoteDto.country); }
    if (updateQuoteDto.tiers !== undefined) { fields.push(`tiers = $${paramIndex++}`); params.push(updateQuoteDto.tiers); }
    if (updateQuoteDto.attentionTo !== undefined) { fields.push(`attention_to = $${paramIndex++}`); params.push(updateQuoteDto.attentionTo); }
    if (updateQuoteDto.pickupLocation !== undefined) { fields.push(`pickup_location = $${paramIndex++}`); params.push(updateQuoteDto.pickupLocation); }
    if (updateQuoteDto.deliveryLocation !== undefined) { fields.push(`delivery_location = $${paramIndex++}`); params.push(updateQuoteDto.deliveryLocation); }
    if (updateQuoteDto.transitTime !== undefined) { fields.push(`transit_time = $${paramIndex++}`); params.push(updateQuoteDto.transitTime); }
    if (updateQuoteDto.departureFrequency !== undefined) { fields.push(`departure_frequency = $${paramIndex++}`); params.push(updateQuoteDto.departureFrequency); }
    if (updateQuoteDto.clientType !== undefined) { fields.push(`client_type = $${paramIndex++}`); params.push(updateQuoteDto.clientType); }
    if (updateQuoteDto.importExport !== undefined) { fields.push(`import_export = $${paramIndex++}`); params.push(updateQuoteDto.importExport); }
    if (updateQuoteDto.fileStatus !== undefined) { fields.push(`file_status = $${paramIndex++}`); params.push(updateQuoteDto.fileStatus); }
    if (updateQuoteDto.terms !== undefined) { fields.push(`terms = $${paramIndex++}`); params.push(updateQuoteDto.terms); }
    if (updateQuoteDto.paymentMethod !== undefined) { fields.push(`payment_method = $${paramIndex++}`); params.push(updateQuoteDto.paymentMethod); }
    if (updateQuoteDto.paymentConditions !== undefined) { fields.push(`payment_conditions = $${paramIndex++}`); params.push(updateQuoteDto.paymentConditions); }
    if (updateQuoteDto.requester !== undefined) { fields.push(`requester = $${paramIndex++}`); params.push(updateQuoteDto.requester); }
    if ('vehicleId' in updateQuoteDto) { fields.push(`vehicle_id = $${paramIndex++}`); params.push(updateQuoteDto.vehicleId); }

    // 1️⃣ D'ABORD: Mettre à jour les champs de la cotation
    if (fields.length > 0) {
      fields.push(`updated_at = NOW()`);
      params.push(id);

      await connection.query(
        `UPDATE crm_quotes SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
        params
      );

      console.log(`✅ [UPDATE] Quote ${id} mise à jour avec succès`);
    }

    // 2️⃣ ENSUITE: Mettre à jour les items si fournis
    if (updateQuoteDto.items && updateQuoteDto.items.length > 0) {
      console.log(`🔄 [UPDATE] Mise à jour de ${updateQuoteDto.items.length} items`);
      
      // Supprimer les anciens items
      await connection.query(
        `DELETE FROM crm_quote_items WHERE quote_id = $1`,
        [id]
      );

      // Insérer les nouveaux items
      for (let index = 0; index < updateQuoteDto.items.length; index++) {
        const item = updateQuoteDto.items[index];
        
        // Calculs identiques à la version Git
        const conversionRate = item.conversionRate || 1;
        const sellingPrice = item.sellingPrice || item.unitPrice || 0;
        const purchasePrice = item.purchasePrice || 0;
        const totalPrice = item.quantity * sellingPrice; // Sans conversion ici, elle est appliquée dans recalculateQuoteTotals
        const margin = sellingPrice - purchasePrice; // Sans conversion ici
        
        await connection.query(
          `INSERT INTO crm_quote_items (
            quote_id, description, category, vehicle_description, cargo_designation,
            packages_count, weight_kg, volume_m3, length_cm, width_cm, height_cm, volumetric_weight,
            origin_street, origin_city, origin_postal_code, origin_country,
            destination_street, destination_city, destination_postal_code, destination_country,
            distance_km, vehicle_type, service_type,
            currency, conversion_rate, unit,
            quantity, unit_price, selling_price, purchase_price,
            total_price, margin, item_type, line_order, notes,
            tax_rate, tax_amount, is_taxable, taxable_account, non_taxable_account,
            is_debours, ca_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42)`,
          [
            id, // $1
            item.description, // $2
            item.category || null, // $3
            item.vehicleDescription || null, // $4
            item.cargoDesignation || null, // $5
            item.packagesCount || null, // $6
            item.weightKg || null, // $7
            item.volumeM3 || null, // $8
            item.lengthCm || null, // $9
            item.widthCm || null, // $10
            item.heightCm || null, // $11
            item.volumetricWeight || null, // $12
            item.originStreet || null, // $13
            item.originCity || null, // $14
            item.originPostalCode || null, // $15
            item.originCountry || null, // $16
            item.destinationStreet || null, // $17
            item.destinationCity || null, // $18
            item.destinationPostalCode || null, // $19
            item.destinationCountry || null, // $20
            item.distanceKm || null, // $21
            item.vehicleType || null, // $22
            item.serviceType || null, // $23
            item.currency || 'TND', // $24
            conversionRate, // $25
            item.unit || null, // $26
            item.quantity, // $27
            item.unitPrice || 0, // $28
            sellingPrice, // $29
            purchasePrice, // $30
            totalPrice, // $31
            margin, // $32
            item.itemType || 'freight', // $33
            item.lineOrder || (index + 1), // $34
            item.notes || null, // $35
            item.taxRate !== undefined ? item.taxRate : 19, // $36
            item.taxAmount || 0, // $37
            item.isTaxable !== undefined ? item.isTaxable : true, // $38
            item.taxableAccount || null, // $39
            item.nonTaxableAccount || null, // $40
            item.isDebours !== undefined ? item.isDebours : false, // $41
            item.caType || 'Oui' // $42
          ]
        );
      }

      console.log(`✅ [UPDATE] ${updateQuoteDto.items.length} items insérés`);
      
      // 3️⃣ ENFIN: Recalculer les totaux (applique les conversions de devises)
      await this.recalculateQuoteTotals(connection, id);
    }

    // Régénérer le QR code
    const updatedQuote = await this.findOne(id, databaseName, organisationId);
    const qrCode = await this.generateQRCode(updatedQuote);
    if (qrCode) {
      await connection.query(
        `UPDATE crm_quotes SET qr_code_data = $1 WHERE id = $2`,
        [qrCode, id]
      );
    }

    return this.findOne(id, databaseName, organisationId);
  }

  /**
   * Supprimer un devis
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName, SANS filtre organisation_id
   */
  async remove(id: number, databaseName: string, organisationId: number): Promise<void> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const quote = await this.findOne(id, databaseName, organisationId);

    // Vérifier que le devis peut être supprimé
    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Impossible de supprimer un devis accepté');
    }

    // Supprimer les items d'abord
    await connection.query(
      `DELETE FROM crm_quote_items WHERE quote_id = $1`,
      [id]
    );

    // Supprimer le quote
    await connection.query(
      `DELETE FROM crm_quotes WHERE id = $1`,
      [id]
    );

    console.log(`✅ Quote ${id} supprimé avec succès`);
  }

  /**
   * Envoyer un devis par email
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   */
  async sendQuote(id: number, sendQuoteDto: SendQuoteDto, databaseName: string, organisationId: number): Promise<Quote> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const quote = await this.findOne(id, databaseName, organisationId);

    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Ce devis a déjà été accepté');
    }

    console.log('📧 [Email] Envoi cotation avec totaux en TND:', {
      quoteNumber: quote.quoteNumber,
      total: quote.total,
    });

    // 🏢 Récupérer les informations de l'organisation (avec tous les champs nécessaires)
    const mainConnection = await this.databaseConnectionService.getMainConnection();
    const orgResult = await mainConnection.query(
      `SELECT nom, nom_affichage, logo_url, adresse, telephone, email_contact, slug FROM organisations WHERE id = $1`,
      [organisationId]
    );
    const organisation = orgResult && orgResult.length > 0 ? orgResult[0] : null;

    // Préparer le contenu HTML de l'email
    const emailHtml = this.generateQuoteEmailHtml(quote, sendQuoteDto, organisation);

    // Envoyer l'email
    const emailSubject = sendQuoteDto.emailSubject || `Cotation ${quote.quoteNumber} - ${quote.title}`;
    
    try {
      await this.emailService.sendEmail(
        sendQuoteDto.recipientEmail || quote.clientEmail,
        emailSubject,
        emailHtml
      );

      // Mettre à jour le statut
      await connection.query(
        `UPDATE crm_quotes SET status = $1, sent_at = NOW() WHERE id = $2`,
        [QuoteStatus.SENT, id]
      );

      return this.findOne(id, databaseName, organisationId);
    } catch (error) {
      throw new InternalServerErrorException(
        `Erreur lors de l'envoi de l'email: ${error.message}`
      );
    }
  }

  /**
   * Obtenir l'email du commercial assigné à la cotation
   */
  private getCommercialEmail(quote: Quote): string {
    const defaultEmail = 'sales1@velosi.com.tn';
    
    // Vérifier si on a des commerciaux assignés (nouveau système)
    if (quote.assignedCommercials && quote.assignedCommercials.length > 0) {
      const firstCommercial = quote.assignedCommercials[0];
      if (firstCommercial && firstCommercial.email) {
        return firstCommercial.email;
      }
    }
    
    // Vérifier l'ancien système (commercial unique)
    if ((quote as any).commercial && (quote as any).commercial.email) {
      return (quote as any).commercial.email;
    }
    
    // Fallback sur l'email par défaut
    return defaultEmail;
  }

  /**
   * Générer le HTML pour l'email de la cotation
   */
  private generateQuoteEmailHtml(quote: Quote, sendData: SendQuoteDto, organisation?: any): string {
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
            ${organisation && organisation.logo_url ? `
              <img src="${process.env.FRONTEND_URL || 'https://wyselogiquote.com'}${organisation.logo_url}" alt="Logo" style="max-width: 150px; max-height: 80px; margin-bottom: 15px; background: white; padding: 10px; border-radius: 8px;">
            ` : ''}
            ${organisation ? `<h2 style="margin: 10px 0; font-size: 24px;">${organisation.nom_affichage || organisation.nom}</h2>` : ''}
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
              © ${new Date().getFullYear()} ${organisation ? (organisation.nom_affichage || organisation.nom) : 'VELOSI LOGISTICS'} - Tous droits réservés
            </p>
            <div class="company-info">
              <p><strong>Adresse:</strong> ${organisation && organisation.adresse ? organisation.adresse : '06 Av. H. Bourguiba Résidence ZOHRA 2040 Radès, Tunisie'}</p>
              <p><strong>Tél:</strong> ${organisation && organisation.telephone ? organisation.telephone : '(+216) 71 460 969 / (+216) 71 460 991 / (+216) 79 459 553'}</p>
              <p><strong>Email:</strong> ${this.getCommercialEmail(quote)} | <strong>Web:</strong> ${organisation && organisation.slug ? 'www.' + organisation.slug + '.tn' : 'www.velosi.com.tn'}</p>
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
   * ✅ MULTI-TENANT: Vérifie l'organisationId
   * ✅ CORRECTION: Marque comme vu même si viewedAt existe déjà
   */
  async markAsViewed(id: number, databaseName: string, organisationId: number): Promise<Quote> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const quote = await this.findOne(id, databaseName, organisationId);

    console.log('👁️ [Mark As Viewed] Tentative de marquage:', {
      quoteId: id,
      quoteNumber: quote.quoteNumber,
      currentStatus: quote.status,
      viewedAt: quote.viewedAt,
      sentAt: quote.sentAt
    });

    // Marquer comme vu si le statut est SENT
    if (quote.status === QuoteStatus.SENT) {
      await connection.query(
        `UPDATE crm_quotes SET status = $1, viewed_at = NOW() WHERE id = $2`,
        [QuoteStatus.VIEWED, id]
      );
      
      console.log('✅ [Mark As Viewed] Cotation marquée comme vue:', {
        quoteNumber: quote.quoteNumber,
        newStatus: QuoteStatus.VIEWED
      });
      
      return this.findOne(id, databaseName, organisationId);
    }

    console.log('ℹ️ [Mark As Viewed] Pas de changement de statut (statut actuel:', quote.status + ')');
    return quote;
  }

  /**
   * 🌐 Marquer une cotation comme vue (VERSION PUBLIQUE - Sans authentification via ID)
   * ⚠️ Note: Pour l'UUID, utiliser la route /public/:uuid qui appelle findOnePublicByUuid
   *    puis marquer comme vue via cette méthode si nécessaire
   * ✅ Récupère dynamiquement la liste des bases depuis la table organisations
   */
  async markAsViewedPublic(id: number): Promise<Quote> {
    // Étape 1: Récupérer la liste de toutes les bases de données depuis organisations (base centrale shipnology)
    const shipnologyConnection = await this.databaseConnectionService.getOrganisationConnection('shipnology');
    const orgsResult = await shipnologyConnection.query(
      `SELECT DISTINCT database_name FROM organisations WHERE database_name IS NOT NULL AND database_name != '' ORDER BY database_name`
    );
    
    let databases = orgsResult.map((org: any) => org.database_name);
    
    // ✅ FALLBACK: Ajouter les bases principales si elles ne sont pas dans la table organisations
    const mainDatabases = ['velosi', 'danino'];
    for (const mainDb of mainDatabases) {
      if (!databases.includes(mainDb)) {
        databases.push(mainDb);
      }
    }
    
    console.log(`🔍 [markAsViewedPublic] Recherche dans ${databases.length} bases:`, databases);
    
    for (const dbName of databases) {
      try {
        const connection = await this.databaseConnectionService.getOrganisationConnection(dbName);
        
        const quotes = await connection.query(
          `SELECT id, organisation_id, quote_number FROM crm_quotes WHERE id = $1 LIMIT 1`,
          [id]
        );

        if (quotes && quotes.length > 0) {
          const quote = quotes[0];
          const organisationId = quote.organisation_id || 1;
          
          console.log(`✅ [markAsViewedPublic] Cotation ${quote.quote_number} trouvée dans: ${dbName}`);
          return this.markAsViewed(id, dbName, organisationId);
        }
      } catch (error) {
        // Continue vers la prochaine base
      }
    }

    throw new NotFoundException(`Cotation avec l'ID ${id} introuvable`);
  }

  /**
   * Accepter un devis
   * ✅ MULTI-TENANT: Vérifie l'organisationId
   * ✅ CORRECTION: Permettre l'acceptation depuis DRAFT, SENT ou VIEWED
   */
  async acceptQuote(id: number, acceptQuoteDto: AcceptQuoteDto, databaseName: string, organisationId: number): Promise<Quote> {
    console.log(`🎯 DÉBUT acceptQuote pour cotation ID: ${id}`);
    const quote = await this.findOne(id, databaseName, organisationId); // 🏢 FILTRE MULTI-TENANT
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
    
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await connection.query(
      `UPDATE crm_quotes 
       SET status = $1, accepted_at = $2, type = $3, notes = $4, updated_at = NOW() 
       WHERE id = $5`,
      [QuoteStatus.ACCEPTED, new Date(), quote.type, quote.notes, quote.id]
    );
    
    // Recharger la cotation mise à jour
    const [updatedQuote] = await connection.query(
      `SELECT * FROM crm_quotes WHERE id = $1`,
      [quote.id]
    );
    
    console.log(`✅ Cotation sauvegardée: ${updatedQuote.quote_number} - Statut: ${updatedQuote.status}`);

    // 🎯 SYNCHRONISATION AUTOMATIQUE: Opportunité → CLOSED_WON
    if (updatedQuote.opportunityId) {
      console.log(`🔄 Mise à jour opportunité ID: ${updatedQuote.opportunityId}`);
      await this.updateOpportunityStage(
        updatedQuote.opportunityId,
        'closed_won',
        `Cotation ${updatedQuote.quoteNumber} acceptée`,
        databaseName
      );
    }

    // Conversion automatique prospect/opportunité vers client permanent
    console.log(`🚀 Appel de autoConvertToClient...`);
    await this.autoConvertToClient(databaseName, organisationId, updatedQuote);
    console.log(`✅ autoConvertToClient terminé`);
    
    // Mettre à jour le statut du prospect vers CLIENT
    await this.updateLeadStatusToClient(updatedQuote, databaseName);

    return this.findOne(updatedQuote.id, databaseName, organisationId);
  }

  /**
   * ✅ SIMPLIFICATION TOTALE: Convertir automatiquement en client TEMPORAIRE
   * Utilise UNIQUEMENT les données de la cotation (pas de lead/opportunity)
   * SANS mot de passe et SANS compte Keycloak
   * ✅ Le statut du prospect est mis à jour automatiquement par un TRIGGER PostgreSQL
   */
  private async autoConvertToClient(databaseName: string, organisationId: number, quote: Quote): Promise<void> {
    try {
      console.log(`\n========================================`);
      console.log(`🔄 CRÉATION CLIENT AUTOMATIQUE`);
      console.log(`========================================`);
      console.log(`📋 Cotation: ${quote.quoteNumber}`);
      console.log(`📊 Client existant: ${quote.clientId || 'AUCUN'}`);

      // ✅ ÉTAPE 1: Vérifier si UN CLIENT EXISTE DÉJÀ
      if (quote.clientId && quote.clientId > 0) {
        const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
        const clients = await connection.query(
          `SELECT id, nom FROM client WHERE id = $1`,
          [quote.clientId]
        );

        if (clients && clients.length > 0) {
          const existingClient = clients[0];
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
      
      // ✅ CORRECTION CRITIQUE: Assurer qu'on a toujours un nom valide (jamais undefined)
      const clientNom = quote.clientCompany || quote.clientName || 'Client Sans Nom';
      const clientInterlocuteur = quote.clientName || quote.clientCompany || 'Non renseigné';
      
      const clientData: any = {
        nom: clientNom,
        interlocuteur: clientInterlocuteur,
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
        const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
        await connection.query(
          `UPDATE crm_quotes SET client_id = $1, updated_at = NOW() WHERE id = $2`,
          [newClient.id, quote.id]
        );
        
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
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   */
  private async updateLeadStatusToClient(quote: Quote, databaseName: string): Promise<void> {
    try {
      console.log(`🔍 updateLeadStatusToClient appelée pour cotation ${quote.quoteNumber}`);
      console.log(`📊 Quote leadId: ${quote.leadId}, opportunityId: ${quote.opportunityId}`);
      
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      // Cas 1: Cotation directement liée à un prospect
      if (quote.leadId) {
        console.log(`🎯 Mise à jour directe du prospect ID: ${quote.leadId}`);
        
        const leads = await connection.query(
          `SELECT id, status FROM crm_leads WHERE id = $1`,
          [quote.leadId]
        );
        
        if (leads && leads.length > 0) {
          const lead = leads[0];
          console.log(`📋 Prospect trouvé - Statut actuel: ${lead.status}`);
          console.log(`🔄 Mise à jour vers: CLIENT`);
          
          await connection.query(
            `UPDATE crm_leads SET status = $1, updated_at = NOW() WHERE id = $2`,
            [LeadStatus.CLIENT, quote.leadId]
          );
          
          console.log(`✅ Statut du prospect #${lead.id} mis à jour vers CLIENT`);
        } else {
          console.log(`⚠️ Prospect ID ${quote.leadId} non trouvé`);
        }
      } 
      // Cas 2: Cotation liée à une opportunité qui a un prospect
      else if (quote.opportunityId) {
        console.log(`🎯 Recherche du prospect via opportunité ID: ${quote.opportunityId}`);
        
        const opportunities = await connection.query(
          `SELECT o.id, o.lead_id, l.id as lead_id, l.status as lead_status 
           FROM crm_opportunities o 
           LEFT JOIN crm_leads l ON o.lead_id = l.id 
           WHERE o.id = $1`,
          [quote.opportunityId]
        );
        
        if (opportunities && opportunities.length > 0 && opportunities[0].lead_id) {
          const opportunity = opportunities[0];
          console.log(`📋 Prospect trouvé via opportunité - ID: ${opportunity.lead_id}, Statut actuel: ${opportunity.lead_status}`);
          console.log(`🔄 Mise à jour vers: CLIENT`);
          
          await connection.query(
            `UPDATE crm_leads SET status = $1, updated_at = NOW() WHERE id = $2`,
            [LeadStatus.CLIENT, opportunity.lead_id]
          );
          
          console.log(`✅ Statut du prospect #${opportunity.lead_id} mis à jour vers CLIENT`);
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
  private async createTemporaryClientFromLead(databaseName: string, organisationId: number, lead: Lead, quote: Quote): Promise<Client> {
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
  private async createTemporaryClientFromQuote(databaseName: string, organisationId: number, quote: Quote): Promise<Client> {
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
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   */
  private async updateOpportunityStage(
    opportunityId: number,
    newStage: 'closed_won' | 'closed_lost',
    description: string,
    databaseName: string
  ): Promise<void> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      const opportunities = await connection.query(
        `SELECT id, title, stage FROM crm_opportunities WHERE id = $1`,
        [opportunityId]
      );

      if (!opportunities || opportunities.length === 0) {
        console.log(`⚠️ Opportunité ${opportunityId} introuvable - synchronisation ignorée`);
        return;
      }

      const opportunity = opportunities[0];
      console.log(`🔄 Synchronisation opportunité: ${opportunity.title}`);
      console.log(`   Ancien statut: ${opportunity.stage}`);
      console.log(`   Nouveau statut: ${newStage}`);

      // Construire la requête de mise à jour
      if (newStage === 'closed_won') {
        await connection.query(
          `UPDATE crm_opportunities 
           SET stage = $1, actual_close_date = NOW(), won_description = $2, probability = 100, updated_at = NOW() 
           WHERE id = $3`,
          [newStage, description, opportunityId]
        );
      } else if (newStage === 'closed_lost') {
        await connection.query(
          `UPDATE crm_opportunities 
           SET stage = $1, actual_close_date = NOW(), lost_reason = $2, probability = 0, updated_at = NOW() 
           WHERE id = $3`,
          [newStage, description, opportunityId]
        );
      }

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
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   */
  private async moveOpportunityToProposal(opportunityId: number, databaseName: string): Promise<void> {
    try {
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      const opportunities = await connection.query(
        `SELECT * FROM crm_opportunities WHERE id = $1`,
        [opportunityId]
      );

      if (!opportunities || opportunities.length === 0) {
        console.log(`⚠️ Opportunité ${opportunityId} introuvable - déplacement ignoré`);
        return;
      }

      const opportunity = opportunities[0];

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
      await connection.query(
        `UPDATE crm_opportunities SET stage = $1, probability = $2 WHERE id = $3`,
        [OpportunityStage.PROPOSAL, 60, opportunityId]
      );

      console.log(`✅ Opportunité ${opportunity.title} déplacée → proposal`);
      
    } catch (error) {
      console.error(`❌ Erreur lors du déplacement de l'opportunité ${opportunityId}:`, error);
      // Ne pas faire échouer la création de la cotation si le déplacement échoue
    }
  }

  /**
   * Rejeter un devis
   * ✅ MULTI-TENANT: Vérifie l'organisationId
   */
  async rejectQuote(id: number, rejectQuoteDto: RejectQuoteDto, databaseName: string, organisationId: number): Promise<Quote> {
    const quote = await this.findOne(id, databaseName, organisationId); // 🏢 FILTRE MULTI-TENANT

    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Impossible de rejeter un devis déjà accepté');
    }

    quote.status = QuoteStatus.REJECTED;
    quote.rejectedAt = new Date();
    quote.rejectionReason = rejectQuoteDto.reason;

    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await connection.query(
      `UPDATE crm_quotes 
       SET status = $1, rejected_at = $2, rejection_reason = $3, updated_at = NOW() 
       WHERE id = $4`,
      [QuoteStatus.REJECTED, new Date(), rejectQuoteDto.reason, quote.id]
    );

    // 🎯 SYNCHRONISATION AUTOMATIQUE: Opportunité → CLOSED_LOST
    if (quote.opportunityId) {
      await this.updateOpportunityStage(
        quote.opportunityId,
        'closed_lost',
        `Cotation ${quote.quoteNumber} rejetée: ${rejectQuoteDto.reason || 'Non spécifié'}`,
        databaseName
      );
    }

    return this.findOne(id, databaseName, organisationId);
  }

  /**
   * Annuler un devis
   * ✅ MULTI-TENANT: Vérifie l'organisationId
   */
  async cancelQuote(id: number, reason: string | undefined, databaseName: string, organisationId: number): Promise<Quote> {
    const quote = await this.findOne(id, databaseName, organisationId); // 🏢 FILTRE MULTI-TENANT

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

    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    await connection.query(
      `UPDATE crm_quotes 
       SET status = $1, notes = $2, updated_at = NOW() 
       WHERE id = $3`,
      [QuoteStatus.CANCELLED, quote.notes, quote.id]
    );

    // Note: Pas de synchronisation automatique avec l'opportunité pour l'annulation
    // L'annulation d'une cotation ne change pas automatiquement le statut de l'opportunité
    // car il peut y avoir d'autres cotations en cours

    console.log(`✅ Cotation ${quote.quoteNumber} marquée comme annulée`);

    return this.findOne(id, databaseName, organisationId);
  }

  /**
   * Dupliquer un devis
   * ✅ MULTI-TENANT: Vérifie l'organisationId et l'applique au duplicata
   */
  async duplicate(id: number, userId: number, databaseName: string, organisationId: number): Promise<Quote> {
    const originalQuote = await this.findOne(id, databaseName, organisationId); // 🏢 FILTRE MULTI-TENANT

    const newQuoteNumber = await this.generateQuoteNumber(databaseName);
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);

    // Dupliquer le quote principal
    const [newQuote] = await connection.query(
      `INSERT INTO crm_quotes (
        quote_number, title, status, type, valid_until,
        client_name, client_company, client_email, client_phone, client_address,
        opportunity_id, lead_id, client_id,
        commercial_id, commercial_ids,
        subtotal, tax_amount, tax_rate, total,
        freight_purchased, freight_offered, freight_margin,
        additional_costs_purchased, additional_costs_offered,
        total_purchases, total_offers, total_margin,
        created_by, notes,
        country, tiers, attention_to, pickup_location, delivery_location,
        transit_time, departure_frequency, client_type, import_export,
        file_status, terms, payment_method, condition, hbl, mbl,
        armateur_id, navire_id, port_enlevement_id, port_livraison_id,
        aeroport_enlevement_id, aeroport_livraison_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22,
        $23, $24,
        $25, $26, $27,
        $28, $29,
        $30, $31, $32, $33, $34,
        $35, $36, $37, $38,
        $39, $40, $41, $42, $43,
        $44, $45, $46, $47,
        $48, $49
      ) RETURNING *`,
      [
        newQuoteNumber,
        originalQuote.title,
        QuoteStatus.DRAFT,
        originalQuote.type || 'cotation',
        originalQuote.validUntil,
        originalQuote.clientName,
        originalQuote.clientCompany,
        originalQuote.clientEmail,
        originalQuote.clientPhone,
        originalQuote.clientAddress,
        originalQuote.opportunityId,
        originalQuote.leadId,
        originalQuote.clientId,
        originalQuote.commercialId,
        originalQuote.commercialIds,
        originalQuote.subtotal,
        originalQuote.taxAmount,
        originalQuote.taxRate,
        originalQuote.total,
        originalQuote.freightPurchased,
        originalQuote.freightOffered,
        originalQuote.freightMargin,
        originalQuote.additionalCostsPurchased,
        originalQuote.additionalCostsOffered,
        originalQuote.totalPurchases,
        originalQuote.totalOffers,
        originalQuote.totalMargin,
        userId,
        originalQuote.notes,
        originalQuote.country,
        originalQuote.tiers,
        originalQuote.attentionTo,
        originalQuote.pickupLocation,
        originalQuote.deliveryLocation,
        originalQuote.transitTime,
        originalQuote.departureFrequency,
        originalQuote.clientType,
        originalQuote.importExport,
        originalQuote.fileStatus,
        originalQuote.terms,
        originalQuote.paymentMethod,
        originalQuote.condition,
        originalQuote.hbl,
        originalQuote.mbl,
        originalQuote.armateurId,
        originalQuote.navireId,
        originalQuote.portEnlevementId,
        originalQuote.portLivraisonId,
        originalQuote.aeroportEnlevementId,
        originalQuote.aeroportLivraisonId
      ]
    );

    // Dupliquer les lignes (items)
    if (originalQuote.items && originalQuote.items.length > 0) {
      for (const item of originalQuote.items) {
        await connection.query(
          `INSERT INTO crm_quote_items (
            quote_id, description, category, vehicle_description, cargo_designation,
            packages_count, weight_kg, volume_m3, length_cm, width_cm, height_cm, volumetric_weight,
            origin_street, origin_city, origin_postal_code, origin_country,
            destination_street, destination_city, destination_postal_code, destination_country,
            distance_km, vehicle_type, service_type,
            currency, conversion_rate, unit,
            quantity, unit_price, selling_price, purchase_price,
            total_price, margin, item_type, line_order, notes,
            tax_rate, tax_amount, is_taxable, taxable_account, non_taxable_account,
            is_debours, ca_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42)`,
          [
            newQuote.id, // $1
            item.description, // $2
            item.category || null, // $3
            item.vehicleDescription || null, // $4
            item.cargoDesignation || null, // $5
            item.packagesCount || null, // $6
            item.weightKg || null, // $7
            item.volumeM3 || null, // $8
            item.lengthCm || null, // $9
            item.widthCm || null, // $10
            item.heightCm || null, // $11
            item.volumetricWeight || null, // $12
            item.originStreet || null, // $13
            item.originCity || null, // $14
            item.originPostalCode || null, // $15
            item.originCountry || null, // $16
            item.destinationStreet || null, // $17
            item.destinationCity || null, // $18
            item.destinationPostalCode || null, // $19
            item.destinationCountry || null, // $20
            item.distanceKm || null, // $21
            item.vehicleType || null, // $22
            item.serviceType || null, // $23
            item.currency || 'TND', // $24
            item.conversionRate || 1, // $25
            item.unit || null, // $26
            item.quantity, // $27
            item.unitPrice, // $28
            item.sellingPrice, // $29
            item.purchasePrice, // $30
            item.totalPrice, // $31
            item.margin, // $32
            item.itemType, // $33
            item.lineOrder, // $34
            item.notes || null, // $35
            item.taxRate !== undefined ? item.taxRate : 19, // $36
            item.taxAmount || 0, // $37
            item.isTaxable !== undefined ? item.isTaxable : true, // $38
            item.taxableAccount || null, // $39
            item.nonTaxableAccount || null, // $40
            item.isDebours !== undefined ? item.isDebours : false, // $41
            item.caType || 'Oui' // $42
          ]
        );
      }
    }

    return this.findOne(newQuote.id, databaseName, organisationId); // 🏢 UTILISER MULTI-TENANT
  }

  /**
   * 📊 Statistiques des cotations
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName, SANS filtre organisation_id
   * ✅ MULTI-COMMERCIAUX: Utilise commercial_ids (array) avec ANY operator
   */
  async getStatistics(
    filters: { startDate?: Date; endDate?: Date; commercialId?: number },
    databaseName: string,
    organisationId: number
  ) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const params: any[] = [];
    let paramIndex = 1;
    
    let sql = `SELECT * FROM crm_quotes WHERE deleted_at IS NULL`;

    // Filtrer par commercial si spécifié (multi-commerciaux)
    if (filters?.commercialId) {
      sql += ` AND $${paramIndex} = ANY(commercial_ids)`;
      params.push(filters.commercialId);
      paramIndex++;
    }

    // Filtrer par dates si spécifiées
    if (filters?.startDate && filters?.endDate) {
      sql += ` AND created_at BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params.push(filters.startDate, filters.endDate);
    }

    const quotes = await connection.query(sql, params);

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
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   * Ne supprime jamais physiquement - crucial pour audit et conformité légale
   */
  async archiveQuote(id: number, reason: string, userId: number, databaseName: string, organisationId: number): Promise<Quote> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    const quote = await this.findOne(id, databaseName, organisationId);

    if (!quote) {
      throw new NotFoundException(`Cotation #${id} introuvable`);
    }

    // Vérifier si déjà archivée
    if (quote.deletedAt || quote.isArchived) {
      throw new BadRequestException('Cette cotation est déjà archivée');
    }

    // Mettre à jour avec soft delete
    await connection.query(
      `UPDATE crm_quotes SET
        deleted_at = NOW(),
        is_archived = true,
        archived_reason = $1,
        archived_by = $2
      WHERE id = $3`,
      [reason, userId, id]
    );

    // Retourner le quote archivé avec deleted_at
    const archived = await connection.query(
      `SELECT * FROM crm_quotes WHERE id = $1`,
      [id]
    );
    
    return archived[0];
  }

  /**
   * ♻️ Restaurer une cotation archivée
   * ✅ MULTI-TENANT: Utilise SQL pur avec databaseName
   */
  async restoreQuote(id: number, databaseName: string, organisationId: number): Promise<Quote> {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    const quotes = await connection.query(
      `SELECT * FROM crm_quotes WHERE id = $1`,
      [id]
    );

    if (!quotes || quotes.length === 0) {
      throw new NotFoundException(`Cotation #${id} introuvable`);
    }

    const quote = quotes[0];

    // Vérifier si déjà restaurée
    if (!quote.deleted_at && !quote.is_archived) {
      throw new BadRequestException('Cette cotation n\'est pas archivée');
    }

    // Restaurer
    await connection.query(
      `UPDATE crm_quotes SET
        deleted_at = NULL,
        is_archived = false,
        archived_reason = NULL,
        archived_by = NULL
      WHERE id = $1`,
      [id]
    );

    return this.findOne(id, databaseName, organisationId);
  }
}

