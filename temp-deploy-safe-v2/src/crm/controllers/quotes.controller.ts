import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Public } from '../../auth/public.decorator';
import { QuotesService } from '../services/quotes.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteFilterDto,
  SendQuoteDto,
  AcceptQuoteDto,
  RejectQuoteDto,
} from '../dto/quote.dto';
import { getDatabaseName, getOrganisationId } from '../../common/helpers/multi-tenant.helper';

@Controller('crm/quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  async create(@Body() createQuoteDto: CreateQuoteDto, @Req() req: any) {
    console.log('🔐 [CREATE QUOTE] ========================================');
    console.log('🔐 [CREATE QUOTE] req.user:', req.user ? 'présent' : 'undefined');
    console.log('🔐 [CREATE QUOTE] createdBy depuis DTO:', createQuoteDto.createdBy);
    console.log('🔐 [CREATE QUOTE] ========================================');
    
    // ✅ SOLUTION SIMPLIFIÉE: Utiliser directement createdBy du DTO
    // Si createdBy n'est pas fourni, essayer de récupérer depuis req.user
    let userId = createQuoteDto.createdBy;
    
    if (!userId && req.user) {
      // Fallback: Utiliser req.user si disponible
      const rawUserId = req.user.id || req.user.userId;
      userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;
      console.log('🔐 [CREATE QUOTE] Utilisation de req.user.id:', userId);
    }
    
    if (!userId) {
      console.error('❌ [CREATE QUOTE] ERREUR: Aucun utilisateur identifié!');
      throw new UnauthorizedException('Impossible d\'identifier l\'utilisateur créateur');
    }
    
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    console.log('✅ [CREATE QUOTE] User ID final:', userId, 'Type:', typeof userId);
    console.log('🏢 [CREATE QUOTE] Multi-tenant:', { databaseName, organisationId });
    
    return this.quotesService.create(createQuoteDto, userId, databaseName, organisationId);
  }

  @Get()
  async findAll(@Query() filters: QuoteFilterDto, @Req() req: any) {
    const userId = req.user?.userId || req.user?.id;
    const userRoles = req.user?.roles || [];
    
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    // Si l'utilisateur est SEULEMENT client (pas admin/commercial), filtrer par clientId
    const isClientOnly = userRoles.includes('client') && !userRoles.includes('administratif') && !userRoles.includes('admin') && !userRoles.includes('commercial');
    
    if (isClientOnly && userId && !filters.clientId) {
      console.log(`🔐 [Quotes] Filtrage par client: ${userId}`);
      filters.clientId = userId;
    }
    
    // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses cotations
    const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
    
    if (isCommercialOnly && userId && !filters.commercialId) {
      console.log(`🔐 [Quotes] Filtrage par commercial créateur: ${userId}`);
      // Ajouter le filtre commercialId si pas déjà présent
      filters.commercialId = userId;
    }
    
    return this.quotesService.findAll(filters, databaseName, organisationId);
  }

  /**
   * 📋 Récupérer une cotation par ID (PROTÉGÉ - Pour modification)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId du JWT
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.quotesService.findOne(id, databaseName, organisationId);
  }

  /**
   * 🌐 Récupérer une cotation par UUID ou ID (ROUTE PUBLIQUE - Pour visualisation)
   * ✅ SANS AUTHENTIFICATION: Utilisable par les clients via lien email
   * ✅ Récupère aussi les informations de l'organisation
   * ✅ Accepte UUID (ex: 550e8400-e29b-41d4-a716-446655440000) ou ID (ex: 3)
   */
  @Get('public/:identifier')
  @Public()
  async findOnePublic(@Param('identifier') identifier: string) {
    return this.quotesService.findOnePublic(identifier);
  }

  @Get('number/:quoteNumber')
  async findByQuoteNumber(@Param('quoteNumber') quoteNumber: string, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.quotesService.findByQuoteNumber(quoteNumber, databaseName, organisationId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuoteDto: UpdateQuoteDto,
    @Req() req: any,
  ) {
    console.log('🔐 [UPDATE QUOTE] ========================================');
    console.log('🔐 [UPDATE QUOTE] req.user:', req.user ? 'présent' : 'undefined');
    console.log('🔐 [UPDATE QUOTE] updatedBy depuis DTO:', updateQuoteDto.updatedBy);
    console.log('🔐 [UPDATE QUOTE] ========================================');
    
    // ✅ SOLUTION IDENTIQUE À CREATE: Utiliser directement updatedBy du DTO
    // Si updatedBy n'est pas fourni, essayer de récupérer depuis req.user
    let userId = updateQuoteDto.updatedBy;
    
    if (!userId && req.user) {
      // Fallback: Utiliser req.user si disponible
      const rawUserId = req.user.id || req.user.userId;
      userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;
      console.log('🔐 [UPDATE QUOTE] Utilisation de req.user.id:', userId);
    }
    
    if (userId) {
      console.log('✅ [UPDATE QUOTE] User ID final:', userId, 'Type:', typeof userId);
      updateQuoteDto.updatedBy = userId;
    } else {
      console.warn('⚠️ [UPDATE QUOTE] Aucun utilisateur identifié pour updatedBy');
    }
    
    // 🏢 Ajouter les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.quotesService.update(id, updateQuoteDto, databaseName, organisationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    await this.quotesService.remove(id, databaseName, organisationId);
  }

  @Post(':id/send')
  async sendQuote(
    @Param('id', ParseIntPipe) id: number,
    @Body() sendQuoteDto: SendQuoteDto,
    @Req() req: any,
  ) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.quotesService.sendQuote(id, sendQuoteDto, databaseName, organisationId);
  }

  @Post(':id/view')
  @Public() // Endpoint public pour le tracking de visualisation
  @HttpCode(HttpStatus.OK)
  async markAsViewed(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    // Pour une route publique, récupérer d'abord la cotation pour connaître son organisation
    return this.quotesService.markAsViewedPublic(id);
  }

  @Post(':id/accept')
  async acceptQuote(
    @Param('id', ParseIntPipe) id: number,
    @Body() acceptQuoteDto: AcceptQuoteDto,
    @Req() req: any,
  ) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.quotesService.acceptQuote(id, acceptQuoteDto, databaseName, organisationId);
  }

  @Post(':id/reject')
  async rejectQuote(
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectQuoteDto: RejectQuoteDto,
    @Req() req: any,
  ) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.quotesService.rejectQuote(id, rejectQuoteDto, databaseName, organisationId);
  }

  @Post(':id/cancel')
  async cancelQuote(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelData: { reason?: string },
    @Req() req: any,
  ) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.quotesService.cancelQuote(id, cancelData.reason, databaseName, organisationId);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.userId || req.user?.id || 1;
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.quotesService.duplicate(id, userId, databaseName, organisationId);
  }

  /**
   * 🗑️ Archiver une cotation (soft delete)
   */
  @Patch(':id/archive')
  async archiveQuote(
    @Param('id', ParseIntPipe) id: number,
    @Body() archiveData: { reason: string },
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id || 1;
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.quotesService.archiveQuote(id, archiveData.reason, userId, databaseName, organisationId);
  }

  /**
   * ♻️ Restaurer une cotation archivée
   */
  @Patch(':id/restore')
  async restoreQuote(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.quotesService.restoreQuote(id, databaseName, organisationId);
  }

  /**
   * 📋 Récupérer les cotations archivées
   * ✅ CORRECTION: Utilise maintenant findAllArchived() avec pagination
   */
  @Get('archived/all')
  async findAllArchived(@Query() filters: QuoteFilterDto, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.id;
    const userRoles = req?.user?.roles || [];
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses cotations
    const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
    
    if (isCommercialOnly && userId && !filters.commercialId) {
      console.log(`🔐 [Quotes Archived] Filtrage par commercial: ${userId}`);
      filters.commercialId = userId;
    }
    
    return this.quotesService.findAllArchived(filters, databaseName, organisationId);
  }

  @Get('statistics')
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('commercialId') commercialId?: number,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId || req?.user?.id;
    const userRoles = req?.user?.roles || [];
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses cotations
    const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
    
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      commercialId: (isCommercialOnly && userId && !commercialId) ? userId : commercialId,
    };
    
    if (isCommercialOnly && userId) {
      console.log(`🔐 [Quotes Statistics] Filtrage par commercial: ${userId}`);
    }
    
    return this.quotesService.getStatistics(filters, databaseName, organisationId);
  }
}
