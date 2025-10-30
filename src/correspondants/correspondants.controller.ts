import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { CorrespondantsService } from './correspondants.service';
import { CreateCorrespondantDto } from './dto/create-correspondant.dto';
import { UpdateCorrespondantDto } from './dto/update-correspondant.dto';

@ApiTags('Correspondants')
@Controller('correspondants')
export class CorrespondantsController {
  constructor(private readonly correspondantsService: CorrespondantsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau correspondant' })
  @ApiResponse({ status: 201, description: 'Correspondant créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  create(@Body() createCorrespondantDto: CreateCorrespondantDto) {
    return this.correspondantsService.create(createCorrespondantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les correspondants avec filtres et pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'nature', required: false, enum: ['LOCAL', 'ETRANGER'] })
  @ApiQuery({ name: 'statut', required: false, enum: ['actif', 'inactif'] })
  @ApiQuery({ name: 'ville', required: false, type: String })
  @ApiQuery({ name: 'pays', required: false, type: String })
  @ApiQuery({ name: 'competence', required: false, enum: ['maritime', 'routier', 'aerien'] })
  @ApiResponse({ status: 200, description: 'Liste des correspondants récupérée avec succès' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('nature') nature?: string,
    @Query('statut') statut?: string,
    @Query('ville') ville?: string,
    @Query('pays') pays?: string,
    @Query('competence') competence?: string,
  ) {
    return this.correspondantsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      nature,
      statut,
      ville,
      pays,
      competence,
    });
  }

  @Get('statistiques')
  @ApiOperation({ summary: 'Obtenir les statistiques des correspondants' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  getStatistiques() {
    return this.correspondantsService.getStatistiques();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un correspondant par son ID' })
  @ApiResponse({ status: 200, description: 'Correspondant trouvé' })
  @ApiResponse({ status: 404, description: 'Correspondant non trouvé' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.correspondantsService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Récupérer un correspondant par son code' })
  @ApiResponse({ status: 200, description: 'Correspondant trouvé' })
  @ApiResponse({ status: 404, description: 'Correspondant non trouvé' })
  findByCode(@Param('code') code: string) {
    return this.correspondantsService.findByCode(code);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un correspondant' })
  @ApiResponse({ status: 200, description: 'Correspondant mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Correspondant non trouvé' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCorrespondantDto: UpdateCorrespondantDto,
  ) {
    return this.correspondantsService.update(id, updateCorrespondantDto);
  }

  @Patch(':id/statut')
  @ApiOperation({ summary: 'Mettre à jour le statut d\'un correspondant' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Correspondant non trouvé' })
  updateStatut(
    @Param('id', ParseIntPipe) id: number,
    @Body('statut') statut: 'actif' | 'inactif',
  ) {
    return this.correspondantsService.updateStatut(id, statut);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un correspondant' })
  @ApiResponse({ status: 200, description: 'Correspondant supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Correspondant non trouvé' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.correspondantsService.remove(id);
  }

  @Post(':id/logo')
  @ApiOperation({ summary: 'Upload du logo d\'un correspondant' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Logo uploadé avec succès' })
  @ApiResponse({ status: 404, description: 'Correspondant non trouvé' })
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/correspondants-logo',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `correspondant-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg\+xml)$/)) {
          return callback(new BadRequestException('Seuls les fichiers images sont autorisés'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    const logoPath = `uploads/correspondants-logo/${file.filename}`;
    return this.correspondantsService.uploadLogo(id, logoPath);
  }

  @Delete(':id/logo')
  @ApiOperation({ summary: 'Supprimer le logo d\'un correspondant' })
  @ApiResponse({ status: 200, description: 'Logo supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Correspondant non trouvé' })
  removeLogo(@Param('id', ParseIntPipe) id: number) {
    return this.correspondantsService.removeLogo(id);
  }
}
