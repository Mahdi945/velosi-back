import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OpportunitiesService } from '../services/opportunities.service';
import { Opportunity } from '../../entities/crm/opportunity.entity';
import { getDatabaseName, getOrganisationId } from '../../common/helpers/multi-tenant.helper';

@Controller('crm/opportunities')
@UseGuards(JwtAuthGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  /**
   * 📋 Récupérer toutes les opportunités actives
   * Si l'utilisateur est commercial, filtre par assignedToId automatiquement
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get()
  async findAll(@Req() req: any): Promise<Opportunity[]> {
    const userId = req.user?.userId || req.user?.id;
    const userRoles = req.user?.roles || [];
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    console.log(`🏢 [Opportunities.findAll] DB: ${databaseName}, Org: ${organisationId}, User: ${userId}`);
    
    // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses opportunités
    const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
    
    if (isCommercialOnly && userId) {
      console.log(`🔐 [Opportunities] Filtrage par commercial assigné: ${userId}`);
      return this.opportunitiesService.findByAssignedTo(databaseName, organisationId, userId);
    }
    
    // Sinon, retourner toutes les opportunités (admin/manager)
    return this.opportunitiesService.findAll(databaseName, organisationId);
  }

  /**
   * 📊 Statistiques des opportunités
   * Si l'utilisateur est commercial, filtre par assignedToId automatiquement
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get('statistics')
  async getStatistics(@Req() req: any) {
    const userId = req.user?.userId || req.user?.id;
    const userRoles = req.user?.roles || [];
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses opportunités
    const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
    
    if (isCommercialOnly && userId) {
      console.log(`🔐 [Opportunities Statistics] Filtrage par commercial assigné: ${userId}`);
      return this.opportunitiesService.getStatisticsByCommercial(databaseName, organisationId, userId);
    }
    
    return this.opportunitiesService.getStatistics(databaseName, organisationId);
  }

  /**
   * 📋 Récupérer les opportunités archivées
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get('archived/all')
  async findAllArchived(@Req() req: any): Promise<Opportunity[]> {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.opportunitiesService.findAllArchived(databaseName, organisationId);
  }

  /**
   * 🔍 Récupérer une opportunité par ID
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    const opportunity = await this.opportunitiesService.findOne(databaseName, organisationId, id);
    return {
      success: true,
      data: opportunity,
      message: 'Opportunité récupérée avec succès'
    };
  }

  /**
   * ✏️ Créer une nouvelle opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Post()
  async create(@Body() opportunityData: Partial<Opportunity>, @Req() req: any): Promise<Opportunity> {
    const userId = req.user?.userId || req.user?.id || 1;
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    opportunityData.createdById = userId;
    return this.opportunitiesService.create(databaseName, organisationId, opportunityData);
  }

  /**
   * 🔄 Mettre à jour une opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() opportunityData: Partial<Opportunity>,
    @Req() req: any,
  ): Promise<Opportunity> {
    const userId = req.user?.userId || req.user?.id || 1;
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    opportunityData.updatedById = userId;
    return this.opportunitiesService.update(databaseName, organisationId, id, opportunityData);
  }

  /**
   * 🗑️ Archiver une opportunité (soft delete)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Patch(':id/archive')
  async archiveOpportunity(
    @Param('id', ParseIntPipe) id: number,
    @Body() archiveData: { reason: string },
    @Req() req: any,
  ): Promise<Opportunity> {
    const userId = req.user?.userId || req.user?.id || 1;
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.opportunitiesService.archiveOpportunity(databaseName, organisationId, id, archiveData.reason, userId);
  }

  /**
   * ♻️ Restaurer une opportunité archivée
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Patch(':id/restore')
  async restoreOpportunity(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<Opportunity> {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.opportunitiesService.restoreOpportunity(databaseName, organisationId, id);
  }

  /**
   * ❌ Suppression physique désactivée - utiliser archiveOpportunity à la place
   * Cette route renvoie une erreur pour forcer l'utilisation du soft delete
   */
  @Delete(':id')
  @HttpCode(HttpStatus.BAD_REQUEST)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'La suppression physique des opportunités est désactivée. Utilisez PATCH /crm/opportunities/:id/archive à la place.',
      error: 'Bad Request',
    };
  }
}
