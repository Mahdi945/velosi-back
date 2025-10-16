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

@Controller('crm/activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly attachmentsService: ActivityAttachmentsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
    // Récupérer l'ID de l'utilisateur connecté depuis le JWT
    const userId = req.user?.id || req.user?.userId;
    
    // Si createdBy n'est pas fourni, utiliser l'utilisateur connecté
    if (!createActivityDto.createdBy) {
      createActivityDto.createdBy = userId;
    }
    
    // Si assignedTo n'est pas fourni, assigner à l'utilisateur connecté
    if (!createActivityDto.assignedTo) {
      createActivityDto.assignedTo = userId;
    }
    
    return this.activitiesService.create(createActivityDto);
  }

  @Get()
  findAll(@Query() filters: FilterActivityDto) {
    return this.activitiesService.findAll(filters);
  }

  @Get('stats')
  getStats(@Query('userId') userId?: string) {
    const userIdNum = userId ? parseInt(userId, 10) : undefined;
    return this.activitiesService.getActivitiesStats(userIdNum);
  }

  @Get('upcoming')
  getUpcoming(@Request() req) {
    return this.activitiesService.getUpcomingActivities(req.user.userId);
  }

  @Get('overdue')
  getOverdue(@Request() req) {
    return this.activitiesService.getOverdueActivities(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateActivityDto: UpdateActivityDto) {
    return this.activitiesService.update(+id, updateActivityDto);
  }

  @Patch(':id/complete')
  markAsCompleted(@Param('id') id: string, @Body('outcome') outcome?: string) {
    return this.activitiesService.markAsCompleted(+id, outcome);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    // Supprimer les fichiers avant de supprimer l'activité
    await this.attachmentsService.deleteAllActivityAttachments(+id);
    return this.activitiesService.remove(+id);
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
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    try {
      // Valider la taille totale
      validateTotalSize(files);

      // Ajouter les fichiers
      const attachments = await this.attachmentsService.addAttachments(
        +id,
        files,
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
  ) {
    const activityId = +id;

    if (!this.attachmentsService.fileExists(activityId, fileName)) {
      throw new NotFoundException('Fichier non trouvé');
    }

    const filePath = this.attachmentsService.getFilePath(activityId, fileName);
    
    // Récupérer l'activité pour avoir le nom original
    const activity = await this.activitiesService.findOne(activityId);
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
    @Param('id') id: string,
    @Param('fileName') fileName: string,
  ) {
    await this.attachmentsService.deleteAttachment(+id, fileName);
  }
}
