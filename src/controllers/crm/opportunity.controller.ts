import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OpportunityService } from '../../services/crm/opportunity.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  OpportunityQueryDto,
  ConvertLeadToOpportunityDto,
} from '../../dto/crm/opportunity.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { getDatabaseName, getOrganisationId } from '../../common/helpers/multi-tenant.helper';

@Controller('crm/opportunities')
@UseGuards(JwtAuthGuard)
export class OpportunityController {
  constructor(private readonly opportunityService: OpportunityService) {}

  /**
   * Créer une nouvelle opportunité
   * POST /api/crm/opportunities
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Post()
  @Roles('commercial', 'admin')
  async create(@Body() rawBody: any, @Req() req) {
    console.log('🔍 DEBUG CREATE - Données brutes reçues:', JSON.stringify(rawBody, null, 2));
    
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    const userId = req.user?.userId || req.user?.id || 1;
    
    console.log(`🏢 [Opportunity.create] DB: ${databaseName}, Org: ${organisationId}, User: ${userId}`);
    
    // Transformer engineTypes (array) en engineType (single) si nécessaire
    const createOpportunityDto = { ...rawBody };
    
    // Traiter le nouveau format engineTypes (array)
    if (rawBody.engineTypes && Array.isArray(rawBody.engineTypes) && rawBody.engineTypes.length > 0 && !rawBody.engineType) {
      const firstEngineId = rawBody.engineTypes[0];
      const parsedEngineType = parseInt(firstEngineId, 10);
      if (!isNaN(parsedEngineType) && parsedEngineType > 0) {
        createOpportunityDto.engineType = parsedEngineType;
        console.log('🔄 CREATE - Conversion engineTypes -> engineType:', firstEngineId, '->', parsedEngineType);
      }
      delete createOpportunityDto.engineTypes;
    }
    
    // Compatibilité avec l'ancien format vehicleTypes
    if (rawBody.vehicleTypes && Array.isArray(rawBody.vehicleTypes) && rawBody.vehicleTypes.length > 0 && !rawBody.engineType) {
      const firstVehicleType = rawBody.vehicleTypes[0];
      const parsedEngineType = parseInt(firstVehicleType, 10);
      if (!isNaN(parsedEngineType) && parsedEngineType > 0) {
        createOpportunityDto.engineType = parsedEngineType;
        console.log('🔄 CREATE - Conversion vehicleTypes -> engineType:', firstVehicleType, '->', parsedEngineType);
      }
      delete createOpportunityDto.vehicleTypes;
    }
    
    console.log('🔍 DEBUG CREATE - Données après transformation:', JSON.stringify(createOpportunityDto, null, 2));
    try {
      const opportunity = await this.opportunityService.create(databaseName, organisationId, createOpportunityDto, userId);
      return {
        success: true,
        message: 'Opportunité créée avec succès',
        data: opportunity,
      };
    } catch (error) {
      console.error('❌ [Opportunity.create] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * 📋 Obtenir toutes les opportunités ARCHIVÉES avec filtres
   * GET /api/crm/opportunities/archived
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   * ⚠️ IMPORTANT: Doit être AVANT @Get(':id') pour éviter la confusion avec les paramètres de route
   */
  @Get('archived')
  async findAllArchived(@Query() query: OpportunityQueryDto, @Req() req) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      
      console.log(`🏢 [Opportunity.findAllArchived] DB: ${databaseName}, Org: ${organisationId}`);
      
      const result = await this.opportunityService.findAllArchived(databaseName, organisationId, query);
      return {
        success: true,
        message: 'Opportunités archivées récupérées avec succès',
        data: result.data,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: query.page || 1,
        pageSize: query.limit || 25,
      };
    } catch (error) {
      console.error('❌ [Opportunity.findAllArchived] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * Obtenir toutes les opportunités NON-ARCHIVÉES avec filtres
   * GET /api/crm/opportunities
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get()
  async findAll(@Query() query: OpportunityQueryDto, @Req() req) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      const userId = req.user?.userId || req.user?.id;
      const userRoles = req.user?.roles || [];
      
      console.log(`🏢 [Opportunity.findAll] DB: ${databaseName}, Org: ${organisationId}, User: ${userId}`);
      
      // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses opportunités
      const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
      
      if (isCommercialOnly && userId && !query.assignedToId && !query.assignedToIds) {
        console.log(`🔐 [Opportunity] Filtrage par commercial assigné: ${userId}`);
        query.assignedToId = userId;
      }
      
      const result = await this.opportunityService.findAll(databaseName, organisationId, query);
      
      console.log(`✅ [Opportunity] ${result.data.length} opportunités récupérées depuis ${databaseName}`);
      
      return {
        success: true,
        message: 'Opportunités récupérées avec succès',
        data: result.data,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: query.page || 1,
        pageSize: query.limit || 25,
      };
    } catch (error) {
      console.error('❌ [Opportunity.findAll] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * Obtenir une opportunité par ID
   * GET /api/crm/opportunities/:id
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      
      console.log(`🏢 [Opportunity.findOne] DB: ${databaseName}, Org: ${organisationId}, ID: ${id}`);
      
      const opportunity = await this.opportunityService.findOne(databaseName, organisationId, +id);
      return {
        success: true,
        message: 'Opportunité récupérée avec succès',
        data: opportunity,
      };
    } catch (error) {
      console.error('❌ [Opportunity.findOne] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * Mettre à jour une opportunité
   * PATCH /api/crm/opportunities/:id
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Patch(':id')
  @Roles('commercial', 'admin')
  async update(
    @Param('id') id: string,
    @Body() rawBody: any,
    @Req() req,
  ) {
    console.log('🔍 DEBUG UPDATE - Opportunity ID:', id);
    console.log('🔍 DEBUG UPDATE - Données brutes reçues:', JSON.stringify(rawBody, null, 2));
    
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    const userId = req.user?.userId || req.user?.id || 1;
    
    console.log(`🏢 [Opportunity.update] DB: ${databaseName}, Org: ${organisationId}, User: ${userId}, ID: ${id}`);
    
    // Transformer engineTypes (array) en engineType (single) si nécessaire
    const updateOpportunityDto = { ...rawBody };
    
    // Traiter le nouveau format engineTypes (array)
    if (rawBody.engineTypes && Array.isArray(rawBody.engineTypes) && rawBody.engineTypes.length > 0 && !rawBody.engineType) {
      const firstEngineId = rawBody.engineTypes[0];
      const parsedEngineType = parseInt(firstEngineId, 10);
      if (!isNaN(parsedEngineType) && parsedEngineType > 0) {
        updateOpportunityDto.engineType = parsedEngineType;
        console.log('🔄 UPDATE - Conversion engineTypes -> engineType:', firstEngineId, '->', parsedEngineType);
      }
      delete updateOpportunityDto.engineTypes;
    }
    
    // Compatibilité avec l'ancien format vehicleTypes
    if (rawBody.vehicleTypes && Array.isArray(rawBody.vehicleTypes) && rawBody.vehicleTypes.length > 0 && !rawBody.engineType) {
      const firstVehicleType = rawBody.vehicleTypes[0];
      const parsedEngineType = parseInt(firstVehicleType, 10);
      if (!isNaN(parsedEngineType) && parsedEngineType > 0) {
        updateOpportunityDto.engineType = parsedEngineType;
        console.log('🔄 UPDATE - Conversion vehicleTypes -> engineType:', firstVehicleType, '->', parsedEngineType);
      }
      delete updateOpportunityDto.vehicleTypes;
    }
    
    console.log('🔍 DEBUG UPDATE - Données après transformation:', JSON.stringify(updateOpportunityDto, null, 2));
    try {
      const opportunity = await this.opportunityService.update(databaseName, organisationId, +id, updateOpportunityDto, userId);
      return {
        success: true,
        message: 'Opportunité mise à jour avec succès',
        data: opportunity,
      };
    } catch (error) {
      console.error('❌ [Opportunity.update] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * Supprimer une opportunité
   * DELETE /api/crm/opportunities/:id
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string, @Req() req) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      
      console.log(`🏢 [Opportunity.remove] DB: ${databaseName}, Org: ${organisationId}, ID: ${id}`);
      
      await this.opportunityService.remove(databaseName, organisationId, +id);
      return {
        success: true,
        message: 'Opportunité supprimée avec succès',
      };
    } catch (error) {
      console.error('❌ [Opportunity.remove] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * Convertir un prospect en opportunité
   * POST /api/crm/opportunities/convert-from-lead/:leadId
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Post('convert-from-lead/:leadId')
  @Roles('commercial', 'admin')
  async convertFromLead(
    @Param('leadId') leadId: string,
    @Body() rawBody: any,
    @Req() req,
  ) {
    try {
      console.log('🔍 DEBUG CONVERSION - Lead ID:', leadId);
      console.log('🔍 DEBUG CONVERSION - Données brutes reçues:', JSON.stringify(rawBody, null, 2));
      
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      const userId = req.user?.userId || req.user?.id || 1;
      
      console.log(`🏢 [Opportunity.convertFromLead] DB: ${databaseName}, Org: ${organisationId}, User: ${userId}, Lead ID: ${leadId}`);
      
      // Transformer engineTypes (array) en engineType (single) si nécessaire
      const convertDto = { ...rawBody };
      
      // Traiter le nouveau format engineTypes (array)
      if (rawBody.engineTypes && Array.isArray(rawBody.engineTypes) && rawBody.engineTypes.length > 0 && !rawBody.engineType) {
        const firstEngineId = rawBody.engineTypes[0];
        const parsedEngineType = parseInt(firstEngineId, 10);
        if (!isNaN(parsedEngineType) && parsedEngineType > 0) {
          convertDto.engineType = parsedEngineType;
          console.log('🔄 CONVERT - Conversion engineTypes -> engineType:', firstEngineId, '->', parsedEngineType);
        }
        delete convertDto.engineTypes;
      }
      
      // Compatibilité avec l'ancien format vehicleTypes
      if (rawBody.vehicleTypes && Array.isArray(rawBody.vehicleTypes) && rawBody.vehicleTypes.length > 0 && !rawBody.engineType) {
        const firstVehicleType = rawBody.vehicleTypes[0];
        const parsedEngineType = parseInt(firstVehicleType, 10);
        if (!isNaN(parsedEngineType) && parsedEngineType > 0) {
          convertDto.engineType = parsedEngineType;
          console.log('🔄 CONVERT - Conversion vehicleTypes -> engineType:', firstVehicleType, '->', parsedEngineType);
        }
        delete convertDto.vehicleTypes;
      }
      
      console.log('🔍 DEBUG CONVERSION - Données après transformation:', JSON.stringify(convertDto, null, 2));
      
      const opportunity = await this.opportunityService.convertFromLead(databaseName, organisationId, +leadId, convertDto, userId);
      return {
        success: true,
        message: 'Prospect converti en opportunité avec succès',
        data: opportunity,
      };
    } catch (error) {
      console.error('❌ [Opportunity.convertFromLead] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * Obtenir les statistiques des opportunités
   * GET /api/crm/opportunities/stats
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get('stats/summary')
  async getStats(@Query('userId') userId?: string, @Req() req?) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      
      // Utiliser l'ID fourni ou celui de l'utilisateur authentifié
      const targetUserId = userId ? +userId : (req.user?.userId || req.user?.id || null);
      
      console.log(`🏢 [Opportunity.getStats] DB: ${databaseName}, Org: ${organisationId}, User: ${targetUserId}`);
      
      const stats = await this.opportunityService.getStats(databaseName, organisationId, targetUserId);
      return {
        success: true,
        message: 'Statistiques récupérées avec succès',
        data: stats,
      };
    } catch (error) {
      console.error('❌ [Opportunity.getStats] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * Changer le stage d'une opportunité
   * PATCH /api/crm/opportunities/:id/stage
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Patch(':id/stage')
  @Roles('commercial', 'admin')
  async changeStage(
    @Param('id') id: string,
    @Body() body: { stage: string; wonDescription?: string; lostReason?: string; lostToCompetitor?: string },
    @Req() req,
  ) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return {
          success: false,
          message: 'Utilisateur non authentifié',
          error: 'UNAUTHORIZED',
        };
      }
      
      console.log(`🏢 [Opportunity.changeStage] DB: ${databaseName}, Org: ${organisationId}, User: ${userId}, ID: ${id}`);
      
      const updateData: UpdateOpportunityDto = { stage: body.stage as any };
      
      if (body.wonDescription) {
        updateData.wonDescription = body.wonDescription;
      }
      
      if (body.lostReason) {
        updateData.lostReason = body.lostReason;
      }
      
      if (body.lostToCompetitor) {
        updateData.lostToCompetitor = body.lostToCompetitor;
      }

      const opportunity = await this.opportunityService.update(databaseName, organisationId, +id, updateData, userId);
      return {
        success: true,
        message: 'Stage de l\'opportunité mis à jour avec succès',
        data: opportunity,
      };
    } catch (error) {
      console.error('❌ [Opportunity.changeStage] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * Obtenir les opportunités par stage (pour kanban)
   * GET /api/crm/opportunities/by-stage
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get('by-stage/all')
  async getByStage(@Query('assignedToId') assignedToId?: string, @Req() req?) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      
      console.log(`🏢 [Opportunity.getByStage] DB: ${databaseName}, Org: ${organisationId}`);
      
      const stages = ['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation'];
      const result = {};

      for (const stage of stages) {
        const query: OpportunityQueryDto = { stage: stage as any };
        if (assignedToId) {
          query.assignedToId = +assignedToId;
        }
        const stageData = await this.opportunityService.findAll(databaseName, organisationId, query);
        result[stage] = stageData.data;
      }

      return {
        success: true,
        message: 'Opportunités par stage récupérées avec succès',
        data: result,
      };
    } catch (error) {
      console.error('❌ [Opportunity.getByStage] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * 🗄️ Archiver une opportunité
   * POST /api/crm/opportunities/:id/archive
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Post(':id/archive')
  @Roles('commercial', 'admin')
  async archiveOpportunity(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req,
  ) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return {
          success: false,
          message: 'Utilisateur non authentifié',
          error: 'UNAUTHORIZED',
        };
      }
      
      console.log(`🏢 [Opportunity.archive] DB: ${databaseName}, Org: ${organisationId}, User: ${userId}, ID: ${id}`);
      
      const opportunity = await this.opportunityService.archiveOpportunity(databaseName, organisationId, +id, body.reason, userId);
      return {
        success: true,
        message: 'Opportunité archivée avec succès',
        data: opportunity,
      };
    } catch (error) {
      console.error('❌ [Opportunity.archive] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * ♻️ Restaurer une opportunité archivée
   * POST /api/crm/opportunities/:id/restore
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Post(':id/restore')
  @Roles('commercial', 'admin')
  async restoreOpportunity(@Param('id') id: string, @Req() req) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      
      console.log(`🏢 [Opportunity.restore] DB: ${databaseName}, Org: ${organisationId}, ID: ${id}`);
      
      const opportunity = await this.opportunityService.restoreOpportunity(databaseName, organisationId, +id);
      return {
        success: true,
        message: 'Opportunité restaurée avec succès',
        data: opportunity,
      };
    } catch (error) {
      console.error('❌ [Opportunity.restore] Erreur:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }
}
