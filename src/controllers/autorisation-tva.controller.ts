import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
  HttpStatus,
  HttpCode,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { AutorisationTVAService } from '../services/autorisation-tva.service';
import { 
  CreateAutorisationTVADto, 
  UpdateAutorisationTVADto, 
  CreateBonCommandeDto, 
  UpdateBonCommandeDto 
} from '../dto/tva-complete.dto';
import { AutorisationTVA } from '../entities/autorisation-tva.entity';
import { BCsusTVA } from '../entities/bcsus-tva.entity';

@Controller('autorisation-tva')
export class AutorisationTVAController {
  constructor(private readonly autorisationTVAService: AutorisationTVAService) {}

  // === ENDPOINTS POUR AUTORISATIONS TVA ===

  @Post()
  async createAutorisation(@Body() createDto: CreateAutorisationTVADto): Promise<AutorisationTVA> {
    return await this.autorisationTVAService.createAutorisationTVA(createDto);
  }

  @Get()
  async findAllAutorisations(): Promise<AutorisationTVA[]> {
    return await this.autorisationTVAService.findAllAutorisationsTVA();
  }

  @Get('client/:clientId')
  async findAutorisationsByClient(@Param('clientId', ParseIntPipe) clientId: number): Promise<AutorisationTVA[]> {
    return await this.autorisationTVAService.findAutorisationsTVAByClient(clientId);
  }

  @Get(':id')
  async findOneAutorisation(@Param('id', ParseIntPipe) id: number): Promise<AutorisationTVA> {
    return await this.autorisationTVAService.findOneAutorisationTVA(id);
  }

  @Patch(':id')
  async updateAutorisation(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAutorisationTVADto,
  ): Promise<AutorisationTVA> {
    return await this.autorisationTVAService.updateAutorisationTVA(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAutorisation(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.autorisationTVAService.deleteAutorisationTVA(id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAutorisationImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AutorisationTVA> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Validation du type de fichier
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non supporté. Utilisez JPEG, PNG, GIF, WebP ou PDF.');
    }

    // Validation de la taille (10MB max pour les documents)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Le fichier ne peut pas dépasser 10MB');
    }

    return await this.autorisationTVAService.uploadAutorisationTVAImage(id, file.buffer, file.originalname);
  }

  // === ENDPOINTS POUR SUSPENSIONS TVA ===

  @Post('suspension')
  async createSuspension(@Body() createDto: CreateBonCommandeDto): Promise<BCsusTVA> {
    return await this.autorisationTVAService.createSuspensionTVA(createDto);
  }

  @Get('suspension')
  async findAllSuspensions(): Promise<BCsusTVA[]> {
    return await this.autorisationTVAService.findAllSuspensionsTVA();
  }

  @Get('suspension/client/:clientId')
  async findSuspensionsByClient(@Param('clientId', ParseIntPipe) clientId: number): Promise<BCsusTVA[]> {
    return await this.autorisationTVAService.findSuspensionsTVAByClient(clientId);
  }

  @Get('suspension/:id')
  async findOneSuspension(@Param('id', ParseIntPipe) id: number): Promise<BCsusTVA> {
    return await this.autorisationTVAService.findOneSuspensionTVA(id);
  }

  @Patch('suspension/:id')
  async updateSuspension(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBonCommandeDto,
  ): Promise<BCsusTVA> {
    return await this.autorisationTVAService.updateSuspensionTVA(id, updateDto);
  }

  @Delete('suspension/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSuspension(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.autorisationTVAService.deleteSuspensionTVA(id);
  }

  @Get('suspension/:id/image')
  async getSuspensionImage(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const suspension = await this.autorisationTVAService.findOneSuspensionTVA(id);
    
    if (!suspension || !suspension.imagePath) {
      throw new NotFoundException('Image de suspension non trouvée');
    }

    const filePath = path.join(process.cwd(), suspension.imagePath);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Fichier image non trouvé sur le disque');
    }

    const stat = fs.statSync(filePath);
    const fileExtension = path.extname(suspension.imagePath).toLowerCase();
    
    // Définir le type MIME approprié
    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(fileExtension)) contentType = 'image/jpeg';
    else if (fileExtension === '.png') contentType = 'image/png';
    else if (fileExtension === '.gif') contentType = 'image/gif';
    else if (fileExtension === '.webp') contentType = 'image/webp';
    else if (fileExtension === '.pdf') contentType = 'application/pdf';

    res.set({
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=86400', // Cache 24h
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  // === NOUVEAUX ENDPOINTS POUR BONS DE COMMANDE ===

  @Post('bon-commande')
  async createBonCommande(@Body() createDto: CreateBonCommandeDto): Promise<BCsusTVA> {
    return await this.autorisationTVAService.createBonCommande(createDto);
  }

  @Get('bon-commande')
  async findAllBonsCommande(): Promise<BCsusTVA[]> {
    return await this.autorisationTVAService.findAllBonsCommande();
  }

  @Get('bon-commande/:id')
  async findOneBonCommande(@Param('id', ParseIntPipe) id: number): Promise<BCsusTVA> {
    return await this.autorisationTVAService.findOneBonCommande(id);
  }

  @Get('autorisation/:autorisationId/bons-commande')
  async findBonsCommandeByAutorisation(@Param('autorisationId', ParseIntPipe) autorisationId: number): Promise<BCsusTVA[]> {
    return await this.autorisationTVAService.findBonsCommandeByAutorisation(autorisationId);
  }

  @Patch('bon-commande/:id')
  async updateBonCommande(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBonCommandeDto,
  ): Promise<BCsusTVA> {
    return await this.autorisationTVAService.updateBonCommande(id, updateDto);
  }

  @Delete('bon-commande/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBonCommande(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.autorisationTVAService.deleteBonCommande(id);
  }

  // === ENDPOINTS POUR UPLOAD D'IMAGES BONS DE COMMANDE ===

  @Post('bon-commande/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBonCommandeImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<BCsusTVA> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Validation du type de fichier
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non supporté. Utilisez JPEG, PNG, GIF, WebP ou PDF.');
    }

    // Validation de la taille (10MB max pour les documents)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Le fichier ne peut pas dépasser 10MB');
    }

    return await this.autorisationTVAService.uploadBonCommandeImage(id, file.buffer, file.originalname);
  }

  // === ENDPOINTS POUR SERVIR LES FICHIERS ===

  @Get('file/autorisation/:filename')
  async getAutorisationFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.join(process.cwd(), 'uploads', 'autorisations', filename);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Fichier non trouvé');
    }

    const stat = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();
    
    // Définir le type MIME approprié
    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(fileExtension)) contentType = 'image/jpeg';
    else if (fileExtension === '.png') contentType = 'image/png';
    else if (fileExtension === '.gif') contentType = 'image/gif';
    else if (fileExtension === '.webp') contentType = 'image/webp';
    else if (fileExtension === '.pdf') contentType = 'application/pdf';

    res.set({
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=86400', // Cache 24h
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Get('file/bon-commande/:filename')
  async getBonCommandeFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.join(process.cwd(), 'uploads', 'bons-de-commande', filename);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Fichier non trouvé');
    }

    const stat = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();
    
    // Définir le type MIME approprié
    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(fileExtension)) contentType = 'image/jpeg';
    else if (fileExtension === '.png') contentType = 'image/png';
    else if (fileExtension === '.gif') contentType = 'image/gif';
    else if (fileExtension === '.webp') contentType = 'image/webp';
    else if (fileExtension === '.pdf') contentType = 'application/pdf';

    res.set({
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=86400', // Cache 24h
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Post('suspension/:id/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadSuspensionImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<BCsusTVA> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Validation du type de fichier
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non supporté. Utilisez JPEG, PNG, GIF, WebP ou PDF.');
    }

    // Validation de la taille (10MB max pour les documents)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Le fichier ne peut pas dépasser 10MB');
    }

    return await this.autorisationTVAService.uploadSuspensionTVAImage(id, file.buffer, file.originalname);
  }

  // === ENDPOINTS UTILITAIRES ===

  @Get('client/:clientId/status')
  async getClientTVAStatus(@Param('clientId', ParseIntPipe) clientId: number) {
    return await this.autorisationTVAService.getClientTVAStatus(clientId);
  }

  @Get('client/:clientId/validate')
  async validateClientTVACoherence(@Param('clientId', ParseIntPipe) clientId: number) {
    return await this.autorisationTVAService.validateClientTVACoherence(clientId);
  }
}