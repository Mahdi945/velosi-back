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
  Req,
} from '@nestjs/common';
import { getDatabaseName, getOrganisationId } from '../common/helpers/multi-tenant.helper';
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
  async createAutorisation(@Body() createDto: CreateAutorisationTVADto, @Req() req: any): Promise<AutorisationTVA> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.createAutorisationTVA(databaseName, createDto);
  }

  @Get()
  async findAllAutorisations(@Req() req: any): Promise<AutorisationTVA[]> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.findAllAutorisationsTVA(databaseName);
  }

  @Get('client/:clientId')
  async findAutorisationsByClient(@Param('clientId', ParseIntPipe) clientId: number, @Req() req: any): Promise<AutorisationTVA[]> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.findAutorisationsTVAByClient(databaseName, clientId);
  }

  @Get(':id')
  async findOneAutorisation(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<AutorisationTVA> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.findOneAutorisationTVA(databaseName, id);
  }

  @Patch(':id')
  async updateAutorisation(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAutorisationTVADto,
    @Req() req: any,
  ): Promise<AutorisationTVA> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.updateAutorisationTVA(databaseName, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAutorisation(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<void> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.deleteAutorisationTVA(databaseName, id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAutorisationImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
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

    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.uploadAutorisationTVAImage(databaseName, id, file.buffer, file.originalname);
  }

  // === ENDPOINTS POUR SUSPENSIONS TVA ===

  @Post('suspension')
  async createSuspension(@Body() createDto: CreateBonCommandeDto, @Req() req: any): Promise<BCsusTVA> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.createSuspensionTVA(databaseName, createDto);
  }

  @Get('suspension')
  async findAllSuspensions(@Req() req: any): Promise<BCsusTVA[]> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.findAllSuspensionsTVA(databaseName);
  }

  @Get('suspension/client/:clientId')
  async findSuspensionsByClient(@Param('clientId', ParseIntPipe) clientId: number, @Req() req: any): Promise<BCsusTVA[]> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.findSuspensionsTVAByClient(databaseName, clientId);
  }

  @Get('suspension/:id')
  async findOneSuspension(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<BCsusTVA> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.findOneSuspensionTVA(databaseName, id);
  }

  @Patch('suspension/:id')
  async updateSuspension(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBonCommandeDto,
    @Req() req: any,
  ): Promise<BCsusTVA> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.updateSuspensionTVA(databaseName, id, updateDto);
  }

  @Delete('suspension/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSuspension(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<void> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.deleteSuspensionTVA(databaseName, id);
  }

  @Get('suspension/:id/image')
  async getSuspensionImage(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    const suspension = await this.autorisationTVAService.findOneSuspensionTVA(databaseName, id);
    
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
  async createBonCommande(@Body() createDto: CreateBonCommandeDto, @Req() req: any): Promise<BCsusTVA> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.createBonCommande(databaseName, createDto);
  }

  @Get('bon-commande')
  async findAllBonsCommande(@Req() req: any): Promise<BCsusTVA[]> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.findAllBonsCommande(databaseName);
  }

  @Get('bon-commande/:id')
  async findOneBonCommande(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<BCsusTVA> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.findOneBonCommande(databaseName, id);
  }

  @Get('autorisation/:autorisationId/bons-commande')
  async findBonsCommandeByAutorisation(@Param('autorisationId', ParseIntPipe) autorisationId: number, @Req() req: any): Promise<BCsusTVA[]> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.findBonsCommandeByAutorisation(databaseName, autorisationId);
  }

  @Patch('bon-commande/:id')
  async updateBonCommande(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBonCommandeDto,
    @Req() req: any,
  ): Promise<BCsusTVA> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.updateBonCommande(databaseName, id, updateDto);
  }

  @Delete('bon-commande/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBonCommande(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<void> {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.deleteBonCommande(databaseName, id);
  }

  // === ENDPOINTS POUR UPLOAD D'IMAGES BONS DE COMMANDE ===

  @Post('bon-commande/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBonCommandeImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
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

    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.uploadBonCommandeImage(databaseName, id, file.buffer, file.originalname);
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
    @Req() req: any,
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

    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.uploadSuspensionTVAImage(databaseName, id, file.buffer, file.originalname);
  }

  // === ENDPOINTS UTILITAIRES ===

  @Get('client/:clientId/status')
  async getClientTVAStatus(@Param('clientId', ParseIntPipe) clientId: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.getClientTVAStatus(databaseName, clientId);
  }

  @Get('client/:clientId/validate')
  async validateClientTVACoherence(@Param('clientId', ParseIntPipe) clientId: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return await this.autorisationTVAService.validateClientTVACoherence(databaseName, clientId);
  }
}