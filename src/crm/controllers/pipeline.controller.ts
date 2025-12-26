import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
  Logger,
  Delete,
  UseGuards,
  Req,
  Request
} from '@nestjs/common';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PipelineService, KanbanData, PipelineFilters } from '../services/pipeline.service';
import { MoveOpportunityDto, UpdateOpportunityDto, CreateOpportunityDto } from '../../dto/crm/opportunity.dto';
import { OpportunityStage } from '../../entities/crm/opportunity.entity';
import { getOrganisationId, getDatabaseName } from '../../common/helpers/multi-tenant.helper';

export class PipelineFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assignedToId?: number;
  
  @IsOptional()
  @IsString()
  priority?: string;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minValue?: number;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxValue?: number;
  
  @IsOptional()
  @IsString()
  dateFrom?: string;
  
  @IsOptional()
  @IsString()
  dateTo?: string;
}

@Controller('api/crm/pipeline')
@UseGuards(JwtAuthGuard)
export class PipelineController {
  private readonly logger = new Logger(PipelineController.name);

  constructor(private readonly pipelineService: PipelineService) {}

  /**
   * GET /api/crm/pipeline
   * Récupérer les données du pipeline Kanban
   * ✅ MULTI-TENANT: Utilise databaseName depuis le JWT
   */
  @Get()
  async getKanbanData(
    @Query() queryFilters: PipelineFiltersDto,
    @Req() req: any
  ): Promise<{
    success: boolean;
    data: KanbanData;
    message: string;
  }> {
    this.logger.log('📊 GET /api/crm/pipeline - Récupération données Kanban');
    
    try {
      // 🏛️ Récupérer databaseName depuis le JWT
      const databaseName = getDatabaseName(req);
      
      // Transformer les paramètres de requête en filtres
      const filters: PipelineFilters = this.transformQueryToFilters(queryFilters);
      
      this.logger.log('Filtres appliqués:', filters);
      this.logger.log(`🏛️ Database: ${databaseName}`);

      const kanbanData = await this.pipelineService.getKanbanData(filters, databaseName);
      
      this.logger.log(`✅ Pipeline récupéré: ${kanbanData.totalOpportunities} opportunités, ${kanbanData.stages.length} étapes`);

      return {
        success: true,
        data: kanbanData,
        message: 'Données du pipeline récupérées avec succès'
      };

    } catch (error) {
      this.logger.error('❌ Erreur récupération pipeline:', error.message);
      throw new BadRequestException({
        success: false,
        message: 'Erreur lors de la récupération du pipeline',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/crm/pipeline/:id/stage
   * Déplacer une opportunité vers une autre étape
   */
  @Put(':id/stage')
  async moveOpportunity(
    @Request() req,
    @Param('id', ParseIntPipe) opportunityId: number,
    @Body() moveDto: MoveOpportunityDto
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    this.logger.log(`🔄 PUT /api/crm/pipeline/${opportunityId}/stage - Déplacement vers ${moveDto.toStage}`);

    try {
      const databaseName = getDatabaseName(req);
      const movedOpportunity = await this.pipelineService.moveOpportunity(
        opportunityId,
        moveDto.toStage,
        databaseName
      );

      this.logger.log(`✅ Opportunité ${opportunityId} déplacée vers ${moveDto.toStage}`);

      return {
        success: true,
        data: movedOpportunity,
        message: `Opportunité déplacée vers "${moveDto.toStage}" avec succès`
      };

    } catch (error) {
      this.logger.error(`❌ Erreur déplacement opportunité ${opportunityId}:`, error.message);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException({
        success: false,
        message: 'Erreur lors du déplacement de l\'opportunité',
        error: error.message
      });
    }
  }

  /**
   * GET /api/crm/pipeline/stats
   * Récupérer les statistiques du pipeline
   * ✅ MULTI-TENANT: Utilise databaseName depuis le JWT
   */
  @Get('stats')
  async getPipelineStats(
    @Query() queryFilters: PipelineFiltersDto,
    @Req() req: any
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    this.logger.log('📈 GET /api/crm/pipeline/stats - Récupération statistiques');

    try {
      // 🏛️ Récupérer databaseName depuis le JWT
      const databaseName = getDatabaseName(req);
      
      const filters: PipelineFilters = this.transformQueryToFilters(queryFilters);
      const stats = await this.pipelineService.getPipelineStats(filters, databaseName);

      this.logger.log('✅ Statistiques pipeline récupérées');

      return {
        success: true,
        data: stats,
        message: 'Statistiques du pipeline récupérées avec succès'
      };

    } catch (error) {
      this.logger.error('❌ Erreur récupération statistiques:', error.message);
      throw new BadRequestException({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  }

  /**
   * Transformer les paramètres de requête en filtres typés
   */
  private transformQueryToFilters(queryFilters: PipelineFiltersDto): PipelineFilters {
    const filters: PipelineFilters = {};

    if (queryFilters.search) {
      filters.search = queryFilters.search.toString();
    }

    if (queryFilters.assignedToId) {
      const assignedToId = parseInt(queryFilters.assignedToId.toString());
      if (!isNaN(assignedToId)) {
        filters.assignedToId = assignedToId;
      }
    }

    if (queryFilters.priority) {
      filters.priority = queryFilters.priority.toString();
    }

    if (queryFilters.minValue) {
      const minValue = parseFloat(queryFilters.minValue.toString());
      if (!isNaN(minValue)) {
        filters.minValue = minValue;
      }
    }

    if (queryFilters.maxValue) {
      const maxValue = parseFloat(queryFilters.maxValue.toString());
      if (!isNaN(maxValue)) {
        filters.maxValue = maxValue;
      }
    }

    if (queryFilters.dateFrom) {
      try {
        filters.dateFrom = new Date(queryFilters.dateFrom);
      } catch (e) {
        this.logger.warn(`Date de début invalide: ${queryFilters.dateFrom}`);
      }
    }

    if (queryFilters.dateTo) {
      try {
        filters.dateTo = new Date(queryFilters.dateTo);
      } catch (e) {
        this.logger.warn(`Date de fin invalide: ${queryFilters.dateTo}`);
      }
    }

    return filters;
  }

  /**
   * PATCH /api/crm/pipeline/:id
   * Mettre à jour une opportunité
   */
  @Patch(':id')
  async updateOpportunity(
    @Request() req,
    @Param('id', ParseIntPipe) opportunityId: number,
    @Body() updateDto: UpdateOpportunityDto
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    this.logger.log(`📝 PATCH /api/crm/pipeline/${opportunityId} - Mise à jour opportunité`);

    try {
      // Transformer les données pour correspondre aux types de l'entité
      const updateData: Partial<any> = { ...updateDto };
      
      // Convertir expectedCloseDate string en Date si fournie
      if (updateDto.expectedCloseDate) {
        updateData.expectedCloseDate = new Date(updateDto.expectedCloseDate);
      }

      const databaseName = getDatabaseName(req);
      const updatedOpportunity = await this.pipelineService.updateOpportunity(
        opportunityId,
        updateData,
        databaseName
      );

      this.logger.log(`✅ Opportunité ${opportunityId} mise à jour avec succès`);

      return {
        success: true,
        data: updatedOpportunity,
        message: 'Opportunité mise à jour avec succès'
      };

    } catch (error) {
      this.logger.error(`❌ Erreur mise à jour opportunité ${opportunityId}:`, error.message);
      
      throw new BadRequestException(`Erreur lors de la mise à jour: ${error.message}`);
    }
  }

  /**
   * DELETE /api/crm/pipeline/:id
   * Supprimer une opportunité depuis le pipeline
   */
  @Delete(':id')
  async deleteOpportunity(
    @Request() req,
    @Param('id', ParseIntPipe) opportunityId: number
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`🗑️ DELETE /api/crm/pipeline/${opportunityId} - Suppression opportunité`);

    try {
      const databaseName = getDatabaseName(req);
      await this.pipelineService.deleteOpportunity(opportunityId, databaseName);

      this.logger.log(`✅ Opportunité ${opportunityId} supprimée avec succès`);

      return {
        success: true,
        message: 'Opportunité supprimée avec succès'
      };

    } catch (error) {
      this.logger.error(`❌ Erreur suppression opportunité ${opportunityId}:`, error.message);
      
      throw new BadRequestException(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  /**
   * PATCH /api/crm/pipeline/:id/won
   * Marquer une opportunité comme gagnée
   */
  @Patch(':id/won')
  async markAsWon(
    @Request() req,
    @Param('id', ParseIntPipe) opportunityId: number,
    @Body() body: { comment?: string }
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    this.logger.log(`🏆 PATCH /api/crm/pipeline/${opportunityId}/won - Marquage comme gagné`);

    try {
      const databaseName = getDatabaseName(req);
      const updatedOpportunity = await this.pipelineService.markAsWon(opportunityId, body.comment, databaseName);

      this.logger.log(`✅ Opportunité ${opportunityId} marquée comme gagnée`);

      return {
        success: true,
        data: updatedOpportunity,
        message: 'Opportunité marquée comme gagnée avec succès'
      };

    } catch (error) {
      this.logger.error(`❌ Erreur marquage gagné opportunité ${opportunityId}:`, error.message);
      
      throw new BadRequestException(`Erreur lors du marquage: ${error.message}`);
    }
  }

  /**
   * PATCH /api/crm/pipeline/:id/lost
   * Marquer une opportunité comme perdue
   */
  @Patch(':id/lost')
  async markAsLost(
    @Request() req,
    @Param('id', ParseIntPipe) opportunityId: number,
    @Body() body: { reason?: string }
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    this.logger.log(`❌ PATCH /api/crm/pipeline/${opportunityId}/lost - Marquage comme perdu`);

    try {
      const databaseName = getDatabaseName(req);
      const updatedOpportunity = await this.pipelineService.markAsLost(opportunityId, body.reason, databaseName);

      this.logger.log(`✅ Opportunité ${opportunityId} marquée comme perdue`);

      return {
        success: true,
        data: updatedOpportunity,
        message: 'Opportunité marquée comme perdue avec succès'
      };

    } catch (error) {
      this.logger.error(`❌ Erreur marquage perdu opportunité ${opportunityId}:`, error.message);
      
      throw new BadRequestException(`Erreur lors du marquage: ${error.message}`);
    }
  }

  /**
   * GET /api/crm/leads
   * R�cup�rer la liste de tous les prospects (leads)
   */
  @Get('/leads')
  async getAllLeads(@Request() req): Promise<{
    success: boolean;
    data: any[];
    message: string;
  }> {
    this.logger.log('📋 GET /api/crm/leads - Récupération liste des prospects');
    
    try {
      const databaseName = getDatabaseName(req);
      const leads = await this.pipelineService.getAllLeads(databaseName);

      this.logger.log(`?  prospects r�cup�r�s`);

      return {
        success: true,
        data: leads,
        message: 'Liste des prospects r�cup�r�e avec succ�s'
      };

    } catch (error) {
      this.logger.error('? Erreur r�cup�ration prospects:', error.message);
      
      throw new BadRequestException(`Erreur lors de la r�cup�ration des prospects: `);
    }
  }

  /**
   * GET /api/crm/opportunities
   * R�cup�rer la liste de toutes les opportunit�s
   */
  @Get('/opportunities')
  async getAllOpportunities(@Request() req): Promise<{
    success: boolean;
    data: any[];
    message: string;
  }> {
    this.logger.log('📊 GET /api/crm/opportunities - Récupération liste des opportunités');
    
    try {
      const databaseName = getDatabaseName(req);
      const opportunities = await this.pipelineService.getAllOpportunities(databaseName);

      this.logger.log(`?  opportunit�s r�cup�r�es`);

      return {
        success: true,
        data: opportunities,
        message: 'Liste des opportunit�s r�cup�r�e avec succ�s'
      };

    } catch (error) {
      this.logger.error('? Erreur r�cup�ration opportunit�s:', error.message);
      
      throw new BadRequestException(`Erreur lors de la r�cup�ration des opportunit�s: `);
    }
  }
}
