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

@Controller('crm/opportunities')
// @UseGuards(JwtAuthGuard, RolesGuard) // Temporairement désactivé pour debug
export class OpportunityController {
  constructor(private readonly opportunityService: OpportunityService) {}

  /**
   * Créer une nouvelle opportunité
   * POST /api/crm/opportunities
   */
  @Post()
  // @Roles('commercial', 'admin') // Temporairement désactivé pour debug
  async create(@Body() rawBody: any, @Request() req) {
    console.log('🔍 DEBUG CREATE - Données brutes reçues:', JSON.stringify(rawBody, null, 2));
    
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
      // Supprimer engineTypes pour éviter confusion
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
      // Supprimer vehicleTypes pour éviter confusion
      delete createOpportunityDto.vehicleTypes;
    }
    
    console.log('🔍 DEBUG CREATE - Données après transformation:', JSON.stringify(createOpportunityDto, null, 2));
    try {
      // Priorité : utilisateur authentifié > header personnalisé > défaut
      let userId = 1; // ID par défaut (administratif)
      
      if (req.user && req.user.id) {
        userId = req.user.id;
        console.log('👤 Utilisateur authentifié pour création opportunité:', { 
          id: userId, 
          username: req.user.username, 
          role: req.user.role 
        });
      } else if (req.headers['x-user-id']) {
        const headerUserId = parseInt(req.headers['x-user-id'] as string, 10);
        if (!isNaN(headerUserId) && headerUserId > 0) {
          userId = headerUserId;
          console.log('👤 Utilisateur via header pour création opportunité:', { id: userId });
        }
      } else {
        console.warn('⚠️ Pas d\'utilisateur identifié pour création opportunité, utilisation de l\'ID par défaut:', userId);
      }
      
      const opportunity = await this.opportunityService.create(createOpportunityDto, userId);
      return {
        success: true,
        message: 'Opportunité créée avec succès',
        data: opportunity,
      };
    } catch (error) {
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
   * ✅ NOUVELLE ROUTE: Retourne uniquement les archivées
   * ⚠️ IMPORTANT: Doit être AVANT @Get(':id') pour éviter la confusion avec les paramètres de route
   */
  @Get('archived')
  async findAllArchived(@Query() query: OpportunityQueryDto) {
    try {
      const result = await this.opportunityService.findAllArchived(query);
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
   * ✅ CORRECTION: Retourne uniquement les NON-archivées
   */
  @Get()
  async findAll(@Query() query: OpportunityQueryDto) {
    try {
      const result = await this.opportunityService.findAll(query);
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
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const opportunity = await this.opportunityService.findOne(+id);
      return {
        success: true,
        message: 'Opportunité récupérée avec succès',
        data: opportunity,
      };
    } catch (error) {
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
   */
  @Patch(':id')
  // @Roles('commercial', 'admin') // Temporairement désactivé pour debug
  async update(
    @Param('id') id: string,
    @Body() rawBody: any, // Accepter d'abord les données brutes
    @Request() req,
  ) {
    console.log('🔍 DEBUG UPDATE - Opportunity ID:', id);
    console.log('🔍 DEBUG UPDATE - Données brutes reçues:', JSON.stringify(rawBody, null, 2));
    
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
      // Supprimer engineTypes pour éviter confusion
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
      // Supprimer vehicleTypes pour éviter confusion
      delete updateOpportunityDto.vehicleTypes;
    }
    
    console.log('🔍 DEBUG UPDATE - Données après transformation:', JSON.stringify(updateOpportunityDto, null, 2));
    try {
      console.log('🔄 [CONTROLLER UPDATE] Mise à jour opportunité ID:', id);
      console.log('📝 [CONTROLLER UPDATE] Données reçues:', updateOpportunityDto);
      console.log('🎯 [CONTROLLER UPDATE] AssignedToId reçu:', updateOpportunityDto.assignedToId, 'type:', typeof updateOpportunityDto.assignedToId);
      console.log('👤 [CONTROLLER UPDATE] Utilisateur dans req:', req.user);
      
      // Priorité : utilisateur authentifié > header personnalisé > défaut
      let userId = 1; // ID par défaut (administratif)
      let userInfo = 'Utilisateur par défaut (ID: 1)';
      
      if (req.user && req.user.id) {
        userId = req.user.id;
        userInfo = `${req.user.username || 'N/A'} (ID: ${userId}, Rôle: ${req.user.role || 'N/A'})`;
        console.log('👤 Utilisateur authentifié pour mise à jour opportunité:', { 
          id: userId, 
          username: req.user.username, 
          role: req.user.role 
        });
      } else if (req.headers['x-user-id']) {
        // Header personnalisé pour l'ID utilisateur
        const headerUserId = parseInt(req.headers['x-user-id'] as string, 10);
        if (!isNaN(headerUserId) && headerUserId > 0) {
          userId = headerUserId;
          userInfo = `Via header (ID: ${userId})`;
          console.log('👤 Utilisateur via header pour mise à jour opportunité:', { id: userId });
        }
      } else {
        console.warn('⚠️ Pas d\'utilisateur identifié pour mise à jour opportunité, utilisation de l\'ID par défaut:', userId);
      }
      
      const opportunity = await this.opportunityService.update(+id, updateOpportunityDto, userId);
      return {
        success: true,
        message: 'Opportunité mise à jour avec succès',
        data: opportunity,
      };
    } catch (error) {
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
   */
  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    try {
      await this.opportunityService.remove(+id);
      return {
        success: true,
        message: 'Opportunité supprimée avec succès',
      };
    } catch (error) {
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
   */
  @Post('convert-from-lead/:leadId')
  // @Roles('commercial', 'admin') // Temporairement désactivé pour debug
  async convertFromLead(
    @Param('leadId') leadId: string,
    @Body() rawBody: any, // Accepter d'abord les données brutes
    @Request() req,
  ) {
    try {
      console.log('🔍 DEBUG CONVERSION - Lead ID:', leadId);
      console.log('🔍 DEBUG CONVERSION - Données brutes reçues:', JSON.stringify(rawBody, null, 2));
      
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
        // Supprimer engineTypes pour éviter confusion
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
        // Supprimer vehicleTypes pour éviter confusion
        delete convertDto.vehicleTypes;
      }
      
      console.log('🔍 DEBUG CONVERSION - Données après transformation:', JSON.stringify(convertDto, null, 2));
      // Priorité : utilisateur authentifié > header personnalisé > défaut
      let userId = 1; // ID par défaut (administratif)
      let userInfo = 'Utilisateur par défaut (ID: 1)';
      
      if (req.user && req.user.id) {
        // Utilisateur authentifié via JWT
        userId = req.user.id;
        userInfo = `${req.user.username || 'N/A'} (ID: ${userId}, Rôle: ${req.user.role || 'N/A'})`;
        console.log('👤 Utilisateur authentifié pour conversion:', { 
          id: userId, 
          username: req.user.username, 
          role: req.user.role 
        });
      } else if (req.headers['x-user-id']) {
        // Header personnalisé pour l'ID utilisateur
        const headerUserId = parseInt(req.headers['x-user-id'] as string, 10);
        if (!isNaN(headerUserId) && headerUserId > 0) {
          userId = headerUserId;
          userInfo = `Via header (ID: ${userId})`;
          console.log('👤 Utilisateur via header pour conversion:', { id: userId });
        }
      } else {
        console.warn('⚠️ Pas d\'utilisateur identifié, utilisation de l\'ID par défaut:', userId);
      }
      
      const opportunity = await this.opportunityService.convertFromLead(+leadId, convertDto, userId);
      return {
        success: true,
        message: 'Prospect converti en opportunité avec succès',
        data: opportunity,
      };
    } catch (error) {
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
   */
  @Get('stats/summary')
  async getStats(@Query('userId') userId?: string, @Request() req?) {
    try {
      // Utiliser l'ID fourni ou celui de l'utilisateur authentifié
      const targetUserId = userId ? +userId : (req.user?.id || null);
      const stats = await this.opportunityService.getStats(targetUserId);
      return {
        success: true,
        message: 'Statistiques récupérées avec succès',
        data: stats,
      };
    } catch (error) {
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
   */
  @Patch(':id/stage')
  @Roles('commercial', 'admin')
  async changeStage(
    @Param('id') id: string,
    @Body() body: { stage: string; wonDescription?: string; lostReason?: string; lostToCompetitor?: string },
    @Request() req,
  ) {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!req.user || !req.user.id) {
        return {
          success: false,
          message: 'Utilisateur non authentifié',
          error: 'UNAUTHORIZED',
        };
      }
      
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

      const opportunity = await this.opportunityService.update(+id, updateData, req.user.id);
      return {
        success: true,
        message: 'Stage de l\'opportunité mis à jour avec succès',
        data: opportunity,
      };
    } catch (error) {
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
   */
  @Get('by-stage/all')
  async getByStage(@Query('assignedToId') assignedToId?: string) {
    try {
      const stages = ['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation'];
      const result = {};

      for (const stage of stages) {
        const query: OpportunityQueryDto = { stage: stage as any };
        if (assignedToId) {
          query.assignedToId = +assignedToId;
        }
        const stageData = await this.opportunityService.findAll(query);
        result[stage] = stageData.data;
      }

      return {
        success: true,
        message: 'Opportunités par stage récupérées avec succès',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }
}