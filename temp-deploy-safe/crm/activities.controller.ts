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
  UseInterceptors,
  UploadedFiles,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { FilterActivityDto } from './dto/filter-activity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityAttachmentsService } from './services/activity-attachments.service';
import {
  activityStorage,
  fileFilter,
  MAX_FILES_COUNT,
  MAX_FILE_SIZE,
  validateTotalSize,
} from './config/multer.config';
import * as path from 'path';
import { getDatabaseName, getOrganisationId } from '../common/helpers/multi-tenant.helper';

@Controller('crm/activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly attachmentsService: ActivityAttachmentsService,
  ) {}

  /**
   * Résout l'ID utilisateur depuis différentes sources
   * Priorité: JWT > Header numérique > Header UUID (recherche dans personnel)
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  private async resolveUserId(req: any): Promise<number | undefined> {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    console.log('🔍 [RESOLVE_USER_ID] Début de la résolution - DB:', databaseName);
    
    // 1. Depuis JWT (si guard activé)
    if (req.user && req.user.id) {
      console.log('✅ [RESOLVE_USER_ID] ID depuis JWT:', req.user.id);
      return req.user.id;
    }
    
    // 2. Depuis header X-User-Id
    if (req.headers['x-user-id']) {
      const headerValue = req.headers['x-user-id'] as string;
      console.log('🔍 [RESOLVE_USER_ID] X-User-Id reçu:', headerValue);
      
      // Essayer d'abord de parser comme nombre
      const numericId = parseInt(headerValue, 10);
      
      if (!isNaN(numericId) && numericId > 0) {
        console.log('✅ [RESOLVE_USER_ID] ID numérique depuis header:', numericId);
        return numericId;
      }
      
      // Si ce n'est pas un nombre, c'est probablement un UUID Keycloak
      console.log('🔍 [RESOLVE_USER_ID] Recherche UUID Keycloak dans personnel:', headerValue);
      const personnel = await this.activitiesService.findPersonnelByKeycloakId(databaseName, organisationId, headerValue);
      
      if (personnel) {
        console.log('✅ [RESOLVE_USER_ID] Personnel trouvé:', personnel.id);
        return personnel.id;
      }
      
      console.warn('⚠️ [RESOLVE_USER_ID] Aucun personnel trouvé pour UUID:', headerValue);
    }
    
    console.error('❌ [RESOLVE_USER_ID] Impossible de résoudre l\'ID utilisateur');
    return undefined;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    console.log('📨 Requête CREATE activité - DB:', databaseName, 'Org:', organisationId);
    
    // Résoudre l'ID utilisateur
    let userId: number | undefined = createActivityDto.createdBy;
    
    if (!userId) {
      userId = await this.resolveUserId(req);
    }
    
    if (!userId) {
      throw new BadRequestException('Impossible de déterminer l\'utilisateur connecté. Veuillez vous reconnecter.');
    }
    
    if (!createActivityDto.createdBy) {
      createActivityDto.createdBy = userId;
    }
    
    if (!createActivityDto.assignedTo) {
      createActivityDto.assignedTo = userId;
    }
    
    return this.activitiesService.create(databaseName, organisationId, createActivityDto);
  }

  @Get()
  findAll(@Query() filters: FilterActivityDto, @Request() req) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.activitiesService.findAll(databaseName, organisationId, filters);
  }

  @Get('commercials')
  getCommercials(@Request() req) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.activitiesService.getCommercials(databaseName, organisationId);
  }

  @Get('stats')
  getStats(@Query('userId') userId: string, @Request() req) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    const userIdNum = userId ? parseInt(userId, 10) : undefined;
    return this.activitiesService.getActivitiesStats(databaseName, organisationId, userIdNum);
  }

  @Get('upcoming')
  getUpcoming(@Request() req) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    const userId = req.user?.userId;
    return this.activitiesService.getUpcomingActivities(databaseName, organisationId, userId);
  }

  @Get('overdue')
  getOverdue(@Request() req) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    const userId = req.user?.userId;
    return this.activitiesService.getOverdueActivities(databaseName, organisationId, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.activitiesService.findOne(databaseName, organisationId, +id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateActivityDto: UpdateActivityDto, @Request() req) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    console.log('📝 [UPDATE_ACTIVITY] DB:', databaseName, 'ID:', id);
    console.log('📝 [UPDATE_ACTIVITY] DTO reçu:', JSON.stringify(updateActivityDto, null, 2));
    return this.activitiesService.update(databaseName, organisationId, +id, updateActivityDto);
  }

  @Patch(':id/complete')
  markAsCompleted(@Param('id') id: string, @Body('outcome') outcome: string, @Request() req) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return this.activitiesService.markAsCompleted(databaseName, organisationId, +id, outcome);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    // Supprimer les fichiers avant de supprimer l'activité
    await this.attachmentsService.deleteAllActivityAttachments(+id);
    return this.activitiesService.remove(databaseName, organisationId, +id);
  }

  // ============= ENDPOINTS POUR LES PIÈCES JOINTES =============

  /**
   * Upload de fichiers pour une activité
   */
  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_COUNT, {
      storage: activityStorage,
      fileFilter: fileFilter,
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    }),
  )
  async uploadAttachments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    try {
      // Valider la taille totale
      validateTotalSize(files);

      const databaseName = getDatabaseName(req);

      // Ajouter les fichiers
      const attachments = await this.attachmentsService.addAttachments(
        +id,
        files,
        databaseName,
      );

      return {
        message: `${files.length} fichier(s) téléchargé(s) avec succès`,
        attachments,
      };
    } catch (error) {
      // Nettoyer les fichiers en cas d'erreur
      for (const file of files) {
        try {
          const fs = require('fs');
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (e) {
          console.error('Erreur nettoyage fichier:', e);
        }
      }
      throw error;
    }
  }

  /**
   * Télécharger un fichier
   */
  @Get(':id/attachments/:fileName')
  async downloadAttachment(
    @Param('id') id: string,
    @Param('fileName') fileName: string,
    @Res() res: Response,
    @Request() req,
  ) {
    const activityId = +id;

    if (!this.attachmentsService.fileExists(activityId, fileName)) {
      throw new NotFoundException('Fichier non trouvé');
    }

    const filePath = this.attachmentsService.getFilePath(activityId, fileName);
    
    // Récupérer l'activité pour avoir le nom original
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    const activity = await this.activitiesService.findOne(databaseName, organisationId, activityId);
    const attachment = activity.attachments?.find(a => a.fileName === fileName);
    const originalName = attachment?.originalName || fileName;

    res.download(filePath, originalName);
  }

  /**
   * Supprimer un fichier
   */
  @Delete(':id/attachments/:fileName')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @Request() req,
    @Param('id') id: string,
    @Param('fileName') fileName: string,
  ) {
    const databaseName = getDatabaseName(req);
    await this.attachmentsService.deleteAttachment(+id, fileName, databaseName);
  }
}
