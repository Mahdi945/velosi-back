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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BCsusTVAService } from '../services/bcsus-tva.service';
import { CreateBCsusTVADto, UpdateBCsusTVADto, BCsusTVAResponseDto } from '../dto/bcsus-tva.dto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Controller('api/bcsus-tva')
@UsePipes(new ValidationPipe({ transform: true }))
export class BCsusTVAController {
  constructor(private readonly bcsusTVAService: BCsusTVAService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBCsusTVADto: CreateBCsusTVADto): Promise<BCsusTVAResponseDto> {
    return this.bcsusTVAService.create(createBCsusTVADto);
  }

  @Get()
  async findAll(
    @Query('autorisationId') autorisationId?: number,
    @Query('statut') statut?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<BCsusTVAResponseDto[]> {
    return this.bcsusTVAService.findAll(autorisationId, statut, isActive);
  }

  @Get('client/:clientId')
  async findByClient(@Param('clientId', ParseIntPipe) clientId: number): Promise<BCsusTVAResponseDto[]> {
    return this.bcsusTVAService.findByClient(clientId);
  }

  @Get('autorisation/:autorisationId/stats')
  async getStatsByAutorisation(@Param('autorisationId', ParseIntPipe) autorisationId: number) {
    return this.bcsusTVAService.getStatsByAutorisation(autorisationId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<BCsusTVAResponseDto> {
    return this.bcsusTVAService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBCsusTVADto: UpdateBCsusTVADto,
  ): Promise<BCsusTVAResponseDto> {
    return this.bcsusTVAService.update(id, updateBCsusTVADto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean; message: string }> {
    await this.bcsusTVAService.remove(id);
    return { success: true, message: 'Bon de commande supprimé avec succès' };
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.bcsusTVAService.hardDelete(id);
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
  ): Promise<{ message: string; imagePath: string }> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const imagePath = `uploads/bons-de-commande/${file.filename}`;
    
    // Mettre à jour le bon de commande avec le chemin de l'image
    await this.bcsusTVAService.update(id, { imagePath });

    return {
      message: 'Image téléchargée avec succès',
      imagePath,
    };
  }

  @Get(':id/image')
  async getImage(@Param('id', ParseIntPipe) id: number): Promise<{ imagePath: string }> {
    const bonCommande = await this.bcsusTVAService.findOne(id);
    
    if (!bonCommande.imagePath) {
      throw new BadRequestException('Aucune image associée à ce bon de commande');
    }

    return { imagePath: bonCommande.imagePath };
  }
}