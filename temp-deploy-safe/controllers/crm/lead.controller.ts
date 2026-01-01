import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { LeadService } from '../../services/crm/lead.service';
import { CreateLeadDto, UpdateLeadDto, LeadQueryDto, ConvertLeadDto } from '../../dto/crm/lead.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('crm/leads')
// @UseGuards(JwtAuthGuard, RolesGuard) // Temporairement désactivé pour debug
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  /**
   * Créer un nouveau prospect
   * POST /api/crm/leads
   */
  @Post()
  // @Roles('commercial', 'admin') // Temporairement désactivé pour debug
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLeadDto: CreateLeadDto, @Request() req) {
    try {
      // Priorité : utilisateur authentifié > header personnalisé > assignedToId > défaut
      let userId = 1; // ID par défaut (administratif)
      let userInfo = 'Utilisateur par défaut (ID: 1)';
      
      if (req.user && req.user.id) {
        // Utilisateur authentifié via JWT
        userId = req.user.id;
        userInfo = `${req.user.username || 'N/A'} (ID: ${userId}, Rôle: ${req.user.role || 'N/A'})`;
        console.log('👤 Utilisateur authentifié pour création:', { 
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
          console.log('👤 Utilisateur via header pour création:', { id: userId });
        }
      } else {
        console.warn('⚠️ Pas d\'utilisateur identifié, utilisation de l\'ID par défaut:', userId);
      }
      const lead = await this.leadService.create(createLeadDto, userId);
      return {
        success: true,
        message: 'Prospect créé avec succès',
        data: lead,
      };
    } catch (error) {
      console.error('Erreur lors de la création du prospect:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * Obtenir tous les prospects NON-ARCHIVÉS avec filtres
   * GET /api/crm/leads
   * ✅ CORRECTION: Retourne uniquement les NON-archivés
   */
  @Get()
  // @Roles('commercial', 'admin', 'client') // Temporairement désactivé pour debug
  async findAll(@Query() query: LeadQueryDto) {
    try {
      console.log('Récupération des prospects NON-ARCHIVÉS avec query:', query);
      const result = await this.leadService.findAll(query);
      console.log('Résultat du service:', { total: result.total, leadsCount: result.leads.length });
      
      return {
        success: true,
        message: 'Prospects récupérés avec succès',
        data: result.leads,
        pagination: {
          total: result.total,
          pages: result.pages,
          current: query.page || 1,
          limit: query.limit || 25,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des prospects:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
        data: [], // Retourner un tableau vide en cas d'erreur
      };
    }
  }

  /**
   * 📋 Obtenir tous les prospects ARCHIVÉS avec filtres
   * GET /api/crm/leads/archived
   * ✅ NOUVELLE ROUTE: Retourne uniquement les archivés
   */
  @Get('archived')
  // @Roles('commercial', 'admin', 'client') // Temporairement désactivé pour debug
  async findAllArchived(@Query() query: LeadQueryDto) {
    try {
      console.log('Récupération des prospects ARCHIVÉS avec query:', query);
      const result = await this.leadService.findAllArchived(query);
      console.log('Résultat du service (archivés):', { total: result.total, leadsCount: result.leads.length });
      
      return {
        success: true,
        message: 'Prospects archivés récupérés avec succès',
        data: result.leads,
        pagination: {
          total: result.total,
          pages: result.pages,
          current: query.page || 1,
          limit: query.limit || 25,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des prospects archivés:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
        data: [], // Retourner un tableau vide en cas d'erreur
      };
    }
  }

  /**
   * Obtenir les statistiques des prospects
   * GET /api/crm/leads/stats
   */
  @Get('stats')
  // @Roles('commercial', 'admin') // Temporairement désactivé pour debug
  async getStats() {
    try {
      const stats = await this.leadService.getStats();
      return {
        success: true,
        message: 'Statistiques récupérées avec succès',
        data: stats,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
        data: {
          total: 0,
          byStatus: [],
          bySource: [],
          monthly: []
        }
      };
    }
  }

  /**
   * Obtenir les prospects nécessitant un suivi
   * GET /api/crm/leads/followup
   */
  @Get('followup')
  // @Roles('commercial', 'admin') // Temporairement désactivé pour debug
  async getLeadsRequiringFollowup() {
    try {
      const leads = await this.leadService.getLeadsRequiringFollowup();
      return {
        success: true,
        message: 'Prospects à suivre récupérés avec succès',
        data: leads,
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
   * Recherche avancée de prospects
   * POST /api/crm/leads/search
   */
  @Post('search')
  // @Roles('commercial', 'admin') // Temporairement désactivé pour debug
  async advancedSearch(@Body() filters: any) {
    try {
      const leads = await this.leadService.advancedSearch(filters);
      return {
        success: true,
        message: 'Recherche effectuée avec succès',
        data: leads,
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
   * Obtenir un prospect par ID
   * GET /api/crm/leads/:id
   */
  @Get(':id')
  // @Roles('commercial', 'admin', 'client') // Temporairement désactivé pour debug
  async findOne(@Param('id') id: string) {
    try {
      const lead = await this.leadService.findOne(+id);
      return {
        success: true,
        message: 'Prospect récupéré avec succès',
        data: lead,
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
   * Mettre à jour un prospect
   * PATCH /api/crm/leads/:id
   */
  @Patch(':id')
  // @Roles('commercial', 'admin') // Temporairement désactivé pour debug
  async update(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @Request() req,
  ) {
    try {
      console.log('🔄 [CONTROLLER UPDATE] Mise à jour prospect ID:', id);
      console.log('📝 [CONTROLLER UPDATE] Données reçues:', updateLeadDto);
      console.log('� [CONTROLLER UPDATE] AssignedToId reçu:', updateLeadDto.assignedToId, 'type:', typeof updateLeadDto.assignedToId);
      console.log('�👤 [CONTROLLER UPDATE] Utilisateur dans req:', req.user);
      
      // Priorité : utilisateur authentifié > header personnalisé > défaut
      let userId = 1; // ID par défaut (administratif)
      let userInfo = 'Utilisateur par défaut (ID: 1)';
      
      if (req.user && req.user.id) {
        // Utilisateur authentifié via JWT
        userId = req.user.id;
        userInfo = `${req.user.username || 'N/A'} (ID: ${userId}, Rôle: ${req.user.role || 'N/A'})`;
        console.log('👤 Utilisateur authentifié pour mise à jour:', { 
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
          console.log('👤 Utilisateur via header pour mise à jour:', { id: userId });
        }
      } else {
        console.warn('⚠️ Pas d\'utilisateur identifié, utilisation de l\'ID par défaut:', userId);
      }
      
      const lead = await this.leadService.update(+id, updateLeadDto, userId);
      console.log('✅ Prospect mis à jour:', lead);
      
      return {
        success: true,
        message: 'Prospect mis à jour avec succès',
        data: lead,
      };
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du prospect:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * Supprimer un prospect
   * DELETE /api/crm/leads/:id
   */
  @Delete(':id')
  // @Roles('admin') // Temporairement désactivé pour debug
  @HttpCode(HttpStatus.OK) // Changé de NO_CONTENT à OK pour retourner du contenu
  async remove(@Param('id') id: string) {
    try {
      console.log('🗑️ Suppression du prospect ID:', id);
      await this.leadService.remove(+id);
      console.log('✅ Prospect supprimé avec succès');
      return {
        success: true,
        message: 'Prospect supprimé avec succès',
      };
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du prospect:', error);
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  /**
   * Convertir un prospect en opportunité
   * POST /api/crm/leads/:id/convert
   */
  @Post(':id/convert')
  // @Roles('commercial', 'admin')
  async convertToOpportunity(
    @Param('id') id: string,
    @Body() convertDto: ConvertLeadDto,
    @Request() req,
  ) {
    try {
      const result = await this.leadService.convertToOpportunity(+id, convertDto, req.user.id);
      return {
        success: true,
        message: 'Prospect converti en opportunité avec succès',
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

  /**
   * Assigner un prospect à un commercial
   * PATCH /api/crm/leads/:id/assign
   */
  @Patch(':id/assign')
  // @Roles('admin')
  async assignLead(
    @Param('id') id: string,
    @Body('assignedToId') assignedToId: number,
    @Request() req,
  ) {
    try {
      const lead = await this.leadService.assignLead(+id, assignedToId, req.user.id);
      return {
        success: true,
        message: 'Prospect assigné avec succès',
        data: lead,
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
