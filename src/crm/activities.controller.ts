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
// @UseGuards(JwtAuthGuard) // Temporairement désactivé pour déboggage - MÊME COMPORTEMENT QUE OPPORTUNITIES
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly attachmentsService: ActivityAttachmentsService,
  ) {}

  /**
   * Résout l'ID utilisateur depuis différentes sources
   * Priorité: JWT > Header numérique > Header UUID (recherche dans personnel)
   */
  private async resolveUserId(req: any): Promise<number | undefined> {
    console.log('🔍 [RESOLVE_USER_ID] Début de la résolution');
    console.log('🔍 [RESOLVE_USER_ID] req.user:', req.user);
    console.log('🔍 [RESOLVE_USER_ID] headers:', {
      'x-user-id': req.headers['x-user-id'],
      'authorization': req.headers['authorization'] ? 'présent' : 'absent',
      'cookie': req.headers['cookie'] ? 'présent' : 'absent'
    });
    
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
      console.log('🔍 [RESOLVE_USER_ID] Parse numericId:', numericId, 'isNaN:', isNaN(numericId));
      
      if (!isNaN(numericId) && numericId > 0) {
        console.log('✅ [RESOLVE_USER_ID] ID numérique depuis header:', numericId);
        return numericId;
      }
      
      // Si ce n'est pas un nombre, c'est probablement un UUID Keycloak
      // Chercher dans la table personnel
      console.log('🔍 [RESOLVE_USER_ID] Recherche UUID Keycloak dans personnel:', headerValue);
      const personnel = await this.activitiesService.findPersonnelByKeycloakId(headerValue);
      
      if (personnel) {
        console.log('✅ [RESOLVE_USER_ID] Personnel trouvé:', {
          id: personnel.id,
          nom: personnel.nom,
          prenom: personnel.prenom,
          keycloak_id: personnel.keycloak_id
        });
        return personnel.id;
      }
      
      console.warn('⚠️ [RESOLVE_USER_ID] Aucun personnel trouvé pour UUID:', headerValue);
    } else {
      console.warn('⚠️ [RESOLVE_USER_ID] Aucun header X-User-Id trouvé');
    }
    
    console.error('❌ [RESOLVE_USER_ID] Impossible de résoudre l\'ID utilisateur');
    return undefined;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
    // Log pour déboggage
    console.log('📨 Requête CREATE activité reçue:', {
      hasUser: !!req.user,
      userId: req.user?.id,
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'authorization': req.headers['authorization'] ? 'présent' : 'absent'
      },
      dto: {
        createdBy: createActivityDto.createdBy,
        assignedTo: createActivityDto.assignedTo
      }
    });
    
    // Résoudre l'ID utilisateur
    // Priorité: DTO > Headers/JWT
    let userId: number | undefined = createActivityDto.createdBy;
    
    if (!userId) {
      console.log('🔍 CreatedBy non fourni dans DTO, résolution via headers/JWT...');
      userId = await this.resolveUserId(req);
    } else {
      console.log('✅ CreatedBy fourni dans DTO:', userId);
    }
    
    if (!userId) {
      console.error('❌ Impossible de déterminer l\'utilisateur');
      throw new BadRequestException('Impossible de déterminer l\'utilisateur connecté. Veuillez vous reconnecter.');
    }
    
    console.log('✅ ID utilisateur final:', userId);
    
    // Si createdBy n'est pas fourni, utiliser l'utilisateur résolu
    if (!createActivityDto.createdBy) {
      createActivityDto.createdBy = userId;
    }
    
    // Si assignedTo n'est pas fourni, utiliser l'utilisateur résolu
    // (pour les activités sans liaison à prospect/opportunité/client)
    if (!createActivityDto.assignedTo) {
      createActivityDto.assignedTo = userId;
    }
    
    console.log('📝 Création activité:', { 
      createdBy: createActivityDto.createdBy, 
      assignedTo: createActivityDto.assignedTo,
      linkType: createActivityDto.leadId ? 'lead' : createActivityDto.opportunityId ? 'opportunity' : createActivityDto.clientId ? 'client' : 'none'
    });
    
    return this.activitiesService.create(createActivityDto);
  }

  @Get()
  findAll(@Query() filters: FilterActivityDto) {
    return this.activitiesService.findAll(filters);
  }

  @Get('commercials')
  getCommercials() {
    return this.activitiesService.getCommercials();
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
    console.log('📝 [UPDATE_ACTIVITY] ID:', id);
    console.log('📝 [UPDATE_ACTIVITY] DTO reçu:', JSON.stringify(updateActivityDto, null, 2));
    console.log('📝 [UPDATE_ACTIVITY] assignedTo dans DTO:', updateActivityDto.assignedTo);
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
