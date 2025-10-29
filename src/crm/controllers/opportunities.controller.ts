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
} from '@nestjs/common';
import { OpportunitiesService } from '../services/opportunities.service';
import { Opportunity } from '../../entities/crm/opportunity.entity';

@Controller('crm/opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  /**
   * 📋 Récupérer toutes les opportunités actives
   * Si l'utilisateur est commercial, filtre par assignedToId automatiquement
   */
  @Get()
  async findAll(@Req() req: any): Promise<Opportunity[]> {
    const userId = req.user?.userId || req.user?.id;
    const userRoles = req.user?.roles || [];
    
    // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses opportunités
    const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
    
    if (isCommercialOnly && userId) {
      console.log(`🔐 [Opportunities] Filtrage par commercial assigné: ${userId}`);
      return this.opportunitiesService.findByAssignedTo(userId);
    }
    
    // Sinon, retourner toutes les opportunités (admin/manager)
    return this.opportunitiesService.findAll();
  }

  /**
   * 📊 Statistiques des opportunités
   * Si l'utilisateur est commercial, filtre par assignedToId automatiquement
   */
  @Get('statistics')
  async getStatistics(@Req() req: any) {
    const userId = req.user?.userId || req.user?.id;
    const userRoles = req.user?.roles || [];
    
    // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses opportunités
    const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
    
    if (isCommercialOnly && userId) {
      console.log(`🔐 [Opportunities Statistics] Filtrage par commercial assigné: ${userId}`);
      return this.opportunitiesService.getStatisticsByCommercial(userId);
    }
    
    return this.opportunitiesService.getStatistics();
  }

  /**
   * 📋 Récupérer les opportunités archivées
   */
  @Get('archived/all')
  async findAllArchived(): Promise<Opportunity[]> {
    return this.opportunitiesService.findAllArchived();
  }

  /**
   * 🔍 Récupérer une opportunité par ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Opportunity> {
    return this.opportunitiesService.findOne(id);
  }

  /**
   * ✏️ Créer une nouvelle opportunité
   */
  @Post()
  async create(@Body() opportunityData: Partial<Opportunity>, @Req() req: any): Promise<Opportunity> {
    const userId = req.user?.userId || req.user?.id || 1;
    opportunityData.createdById = userId;
    return this.opportunitiesService.create(opportunityData);
  }

  /**
   * 🔄 Mettre à jour une opportunité
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() opportunityData: Partial<Opportunity>,
    @Req() req: any,
  ): Promise<Opportunity> {
    const userId = req.user?.userId || req.user?.id || 1;
    opportunityData.updatedById = userId;
    return this.opportunitiesService.update(id, opportunityData);
  }

  /**
   * 🗑️ Archiver une opportunité (soft delete)
   */
  @Patch(':id/archive')
  async archiveOpportunity(
    @Param('id', ParseIntPipe) id: number,
    @Body() archiveData: { reason: string },
    @Req() req: any,
  ): Promise<Opportunity> {
    const userId = req.user?.userId || req.user?.id || 1;
    return this.opportunitiesService.archiveOpportunity(id, archiveData.reason, userId);
  }

  /**
   * ♻️ Restaurer une opportunité archivée
   */
  @Patch(':id/restore')
  async restoreOpportunity(@Param('id', ParseIntPipe) id: number): Promise<Opportunity> {
    return this.opportunitiesService.restoreOpportunity(id);
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
