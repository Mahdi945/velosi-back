import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BCsusTVAService } from '../services/bcsus-tva.service';
import { CreateBCsusTVADto, UpdateBCsusTVADto, BCsusTVAResponseDto } from '../dto/bcsus-tva.dto';
import { getDatabaseName, getOrganisationId } from '../common/helpers/multi-tenant.helper';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Controller('api/bcsus-tva')
@UsePipes(new ValidationPipe({ transform: true }))
export class BCsusTVAController {
  constructor(private readonly bcsusTVAService: BCsusTVAService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBCsusTVADto: CreateBCsusTVADto, @Req() req: any): Promise<BCsusTVAResponseDto> {
    const databaseName = getDatabaseName(req);
    return this.bcsusTVAService.create(databaseName, createBCsusTVADto);
  }

  @Get()
  async findAll(
    @Query('autorisationId') autorisationId?: number,
    @Query('statut') statut?: string,
    @Query('isActive') isActive?: boolean,
    @Req() req?: any,
  ): Promise<BCsusTVAResponseDto[]> {
    const databaseName = getDatabaseName(req);
    return this.bcsusTVAService.findAll(databaseName, autorisationId, statut, isActive);
  }

  @Get('client/:clientId')
  async findByClient(@Param('clientId', ParseIntPipe) clientId: number, @Req() req: any): Promise<BCsusTVAResponseDto[]> {
    const databaseName = getDatabaseName(req);
    return this.bcsusTVAService.findByClient(databaseName, clientId);
  }

  @Get('autorisation/:autorisationId/stats')
  async getStatsByAutorisation(@Param('autorisationId', ParseIntPipe) autorisationId: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.bcsusTVAService.getStatsByAutorisation(databaseName, autorisationId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<BCsusTVAResponseDto> {
    const databaseName = getDatabaseName(req);
    return this.bcsusTVAService.findOne(databaseName, id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBCsusTVADto: UpdateBCsusTVADto,
    @Req() req: any,
  ): Promise<BCsusTVAResponseDto> {
    const databaseName = getDatabaseName(req);
    return this.bcsusTVAService.update(databaseName, id, updateBCsusTVADto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<{ success: boolean; message: string }> {
    const databaseName = getDatabaseName(req);
    await this.bcsusTVAService.remove(databaseName, id);
    return { success: true, message: 'Bon de commande supprimé avec succès' };
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<void> {
    const databaseName = getDatabaseName(req);
    return this.bcsusTVAService.hardDelete(databaseName, id);
  }

  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads', 'bons-de-commande');
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtName = extname(file.originalname);
        const fileName = `bc-${req.params.id}-${uniqueSuffix}${fileExtName}`;
        cb(null, fileName);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
        return cb(new BadRequestException('Seuls les fichiers JPG, JPEG, PNG et PDF sont autorisés'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }))
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<{ message: string; imagePath: string }> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const imagePath = `uploads/bons-de-commande/${file.filename}`;
    
    // Mettre à jour le bon de commande avec le chemin de l'image
    const databaseName = getDatabaseName(req);
    await this.bcsusTVAService.update(databaseName, id, { imagePath });

    return {
      message: 'Image téléchargée avec succès',
      imagePath,
    };
  }

  @Get(':id/image')
  async getImage(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<{ imagePath: string }> {
    const databaseName = getDatabaseName(req);
    const bonCommande = await this.bcsusTVAService.findOne(databaseName, id);
    
    if (!bonCommande.imagePath) {
      throw new BadRequestException('Aucune image associée à ce bon de commande');
    }

    return { imagePath: bonCommande.imagePath };
  }
}