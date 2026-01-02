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
import { LeadsService } from '../services/leads.service';
import { Lead } from '../../entities/crm/lead.entity';
import { getDatabaseName, getOrganisationId } from '../../common/helpers/multi-tenant.helper';

@Controller('crm/leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /**
   * 📋 Récupérer tous les leads actifs
   * Si l'utilisateur est commercial, filtre par assignedToId automatiquement
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get()
  async findAll(@Req() req: any) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const userRoles = req.user?.roles || [];
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      
      console.log(`🏢 [Leads.findAll] DB: ${databaseName}, Org: ${organisationId}, User: ${userId}`);
      console.log(`🔐 [Leads.findAll] Rôles utilisateur:`, userRoles);
      console.log(`🔐 [Leads.findAll] req.user complet:`, JSON.stringify(req.user, null, 2));
      
      // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses leads
      const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
      
      console.log(`🔐 [Leads.findAll] isCommercialOnly: ${isCommercialOnly}`);
      
      let leads: Lead[];
      if (isCommercialOnly && userId) {
        console.log(`🔐 [Leads] Filtrage par commercial assigné: ${userId}`);
        leads = await this.leadsService.findByAssignedTo(databaseName, organisationId, userId);
      } else {
        console.log(`🔓 [Leads] Récupération de TOUS les leads (admin/manager)`);
        // Sinon, retourner tous les leads (admin/manager)
        leads = await this.leadsService.findAll(databaseName, organisationId);
      }
      
      console.log(`✅ [Leads] ${leads.length} prospects récupérés depuis ${databaseName}`);
      
      // Retourner au format attendu par le frontend
      return {
        success: true,
        message: 'Prospects récupérés avec succès',
        data: leads,
        pagination: {
          total: leads.length,
          pages: 1,
          current: 1,
          limit: leads.length,
        },
      };
    } catch (error) {
      console.error('❌ [Leads] Erreur lors de la récupération des prospects:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la récupération des prospects',
        error: error.name,
        data: [],
      };
    }
  }

  /**
   * 📊 Statistiques des leads
   * Si l'utilisateur est commercial, filtre par assignedToId automatiquement
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get('statistics')
  async getStatistics(@Req() req: any) {
    const userId = req.user?.userId || req.user?.id;
    const userRoles = req.user?.roles || [];
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses leads
    const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
    
    if (isCommercialOnly && userId) {
      console.log(`🔐 [Leads Statistics] Filtrage par commercial assigné: ${userId}`);
      return this.leadsService.getStatisticsByCommercial(databaseName, organisationId, userId);
    }
    
    return this.leadsService.getStatistics(databaseName, organisationId);
  }

  /**
   * 📋 Récupérer les leads archivés avec pagination
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get('archived')
  async findAllArchived(@Req() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      
      const leads = await this.leadsService.findAllArchived(databaseName, organisationId);
      
      return {
        success: true,
        message: 'Prospects archivés récupérés avec succès',
        data: leads,
        pagination: {
          total: leads.length,
          pages: 1,
          current: 1,
          limit: leads.length,
        },
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des prospects archivés:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la récupération des prospects archivés',
        error: error.name,
        data: [],
      };
    }
  }

  /**
   * 🔍 Récupérer un lead par ID
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<Lead> {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.leadsService.findOne(databaseName, organisationId, id);
  }

  /**
   * ✏️ Créer un nouveau lead
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Post()
  async create(@Body() leadData: Partial<Lead>, @Req() req: any) {
    try {
      const userId = req.user?.userId || req.user?.id || 1;
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      
      console.log(`🏢 [Leads.create] DB: ${databaseName}, Org: ${organisationId}, User: ${userId}`);
      
      const lead = await this.leadsService.create(databaseName, organisationId, leadData, userId);
      
      console.log(`✅ [Leads] Prospect créé avec succès: ID ${lead.id}`);
      console.log('📦 [Leads] Données du prospect créé:', JSON.stringify(lead, null, 2));
      
      // Vérifier que le lead a bien un ID
      if (!lead || !lead.id) {
        console.error('❌ [Leads] Le service a retourné un prospect sans ID!', lead);
        throw new Error('Erreur interne: prospect créé sans ID');
      }
      
      const response = {
        success: true,
        message: 'Prospect créé avec succès',
        data: lead,
      };
      
      console.log('📤 [Leads] Réponse envoyée au frontend:', JSON.stringify(response, null, 2));
      
      return response;
    } catch (error) {
      console.error('❌ [Leads] Erreur lors de la création du prospect:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la création du prospect',
        error: error.name,
        data: null,
      };
    }
  }

  /**
   * 🔄 Mettre à jour un lead
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() leadData: Partial<Lead>,
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.userId || req.user?.id || 1;
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      
      console.log(`🏢 [Leads.update] DB: ${databaseName}, Org: ${organisationId}, User: ${userId}, Lead ID: ${id}`);
      
      const lead = await this.leadsService.update(databaseName, organisationId, id, leadData, userId);
      
      console.log(`✅ [Leads] Prospect ${id} mis à jour avec succès`);
      console.log('📦 [Leads] Données du prospect mis à jour:', JSON.stringify(lead, null, 2));
      
      // Vérifier que le lead a bien un ID
      if (!lead || !lead.id) {
        console.error('❌ [Leads] Le service a retourné un prospect sans ID!', lead);
        throw new Error('Erreur interne: prospect mis à jour sans ID');
      }
      
      const response = {
        success: true,
        message: 'Prospect mis à jour avec succès',
        data: lead,
      };
      
      console.log('📤 [Leads] Réponse envoyée au frontend:', JSON.stringify(response, null, 2));
      
      return response;
    } catch (error) {
      console.error('❌ [Leads] Erreur lors de la mise à jour du prospect:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la mise à jour du prospect',
        error: error.name,
        data: null,
      };
    }
  }

  /**
   * 🗑️ Archiver un lead (soft delete)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Patch(':id/archive')
  async archiveLead(
    @Param('id', ParseIntPipe) id: number,
    @Body() archiveData: { reason: string },
    @Req() req: any,
  ): Promise<Lead> {
    const userId = req.user?.userId || req.user?.id || 1;
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.leadsService.archiveLead(databaseName, organisationId, id, archiveData.reason, userId);
  }

  /**
   * ♻️ Restaurer un lead archivé
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Patch(':id/restore')
  async restoreLead(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<Lead> {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.leadsService.restoreLead(databaseName, organisationId, id);
  }

  /**
   * ❌ Suppression physique désactivée - utiliser archiveLead à la place
   * Cette route renvoie une erreur pour forcer l'utilisation du soft delete
   */
  @Delete(':id')
  @HttpCode(HttpStatus.BAD_REQUEST)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'La suppression physique des leads est désactivée. Utilisez PATCH /crm/leads/:id/archive à la place.',
      error: 'Bad Request',
    };
  }

  /**
   * 🔄 Convertir un prospect en opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Post(':id/convert')
  async convertToOpportunity(
    @Param('id', ParseIntPipe) id: number,
    @Body() convertData: any,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id || 1;
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.leadsService.convertToOpportunity(databaseName, organisationId, id, convertData, userId);
  }

  /**
   * 👤 Assigner un prospect à un commercial
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Patch(':id/assign/:commercialId')
  async assignLead(
    @Param('id', ParseIntPipe) id: number,
    @Param('commercialId', ParseIntPipe) commercialId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id || 1;
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.leadsService.assignLead(databaseName, organisationId, id, commercialId, userId);
  }

  /**
   * ⏰ Obtenir les prospects nécessitant un suivi
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Get('followup/required')
  async getLeadsRequiringFollowup(@Req() req: any) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.leadsService.getLeadsRequiringFollowup(databaseName, organisationId);
  }

  /**
   * 🔍 Recherche avancée de prospects
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId depuis le JWT
   */
  @Post('search/advanced')
  async advancedSearch(@Body() filters: any, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.leadsService.advancedSearch(databaseName, organisationId, filters);
  }
}
