import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ParseIntPipe, HttpCode, HttpStatus, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { OrganisationsService } from './organisations.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt.guard';

// Filtre pour accepter uniquement les images
const imageFileFilter = (req, file, callback) => {
  console.log('🔍 [ImageFilter] Vérification du fichier:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
    console.log('❌ [ImageFilter] Type de fichier rejeté:', file.mimetype);
    return callback(
      new BadRequestException('Seuls les fichiers images sont autorisés (JPG, PNG, GIF, WebP)'),
      false,
    );
  }
  
  console.log('✅ [ImageFilter] Fichier accepté');
  callback(null, true);
};

@Controller('admin-msp/organisations')
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  // Routes publiques (sans authentification)
  /**
   * Valider un token de setup (accessible sans authentification)
   */
  @Get('validate-setup-token/:token')
  @HttpCode(HttpStatus.OK)
  async validateSetupToken(@Param('token') token: string) {
    const organisation = await this.organisationsService.validateSetupToken(token);
    return {
      valid: true,
      organisation: {
        id: organisation.id,
        nom: organisation.nom,
        email_contact: organisation.email_contact,
        telephone: organisation.telephone,
      },
    };
  }

  /**
   * Compléter le setup d'une organisation (accessible sans authentification)
   */
  @Post('complete-setup/:token')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('logo', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/logos');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `logo-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: imageFileFilter,
  }))
  async completeSetup(
    @Param('token') token: string,
    @Body() setupData: CompleteSetupDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    // Ajouter le chemin du logo aux données si présent
    if (logo) {
      setupData['logo_url'] = `/uploads/logos/${logo.filename}`;
    }

    const organisation = await this.organisationsService.completeSetup(token, setupData);
    
    return {
      success: true,
      message: 'Configuration terminée avec succès',
      organisation: {
        id: organisation.id,
        nom: organisation.nom,
        nom_affichage: organisation.nom_affichage,
        slug: organisation.slug,
      },
    };
  }

  // Routes protégées (nécessitent authentification admin)
  @Get()
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findAll() {
    const organisations = await this.organisationsService.findAll();
    console.log('📤 [Backend] Envoi de', organisations.length, 'organisations');
    console.log('📤 [Backend] Premier élément:', organisations[0]);
    return organisations;
  }

  @Get('stats')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return await this.organisationsService.getStats();
  }

  @Get(':id')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.organisationsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateOrganisationDto, @Request() req) {
    return await this.organisationsService.create(createDto, req.user.id);
  }

  @Put(':id')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateOrganisationDto,
  ) {
    return await this.organisationsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.organisationsService.remove(id);
  }

  @Post(':id/activate')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id', ParseIntPipe) id: number) {
    return await this.organisationsService.activate(id);
  }

  @Post(':id/deactivate')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return await this.organisationsService.deactivate(id);
  }

  /**
   * Upload du logo d'une organisation
   * Stockage dans uploads/logos/ avec nom unique: org_{id}_logo_{timestamp}.{ext}
   */
  @Post(':id/upload-logo')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/logos';
          // Créer le dossier s'il n'existe pas
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
            console.log('📁 [Upload Logo] Dossier créé:', uploadPath);
          }
          cb(null, uploadPath);
        },
        filename: (req: any, file, cb) => {
          const orgId = req.params.id;
          const timestamp = Date.now();
          const extension = path.extname(file.originalname);
          const filename = `org_${orgId}_logo_${timestamp}${extension}`;
          console.log('📁 [Upload Logo] Nom de fichier généré:', filename);
          cb(null, filename);
        },
      }),
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    console.log('📤 [Upload Logo] =================================');
    console.log('📤 [Upload Logo] Début upload logo organisation #', id);
    console.log('📤 [Upload Logo] Fichier reçu par multer:', file);
    console.log('📤 [Upload Logo] Type de file:', typeof file);
    console.log('📤 [Upload Logo] File est null?', file === null);
    console.log('📤 [Upload Logo] File est undefined?', file === undefined);
    console.log('📤 [Upload Logo] =================================');

    if (!file) {
      throw new BadRequestException('Aucun fichier fourni. Veuillez sélectionner une image.');
    }

    // Valider la taille du fichier
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Le fichier est trop volumineux. Taille maximum: 5MB');
    }

    console.log('📤 [Upload Logo] Détails du fichier:', {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    });

    const logoPath = `/uploads/logos/${file.filename}`;
    
    // Mettre à jour l'organisation avec le nouveau chemin du logo
    await this.organisationsService.updateLogoPath(id, logoPath);

    return {
      success: true,
      message: 'Logo uploadé avec succès',
      logoUrl: logoPath,
    };
  }

  /**
   * Récupérer les tokens de setup d'une organisation
   */
  @Get(':id/tokens')
  @UseGuards(AdminJwtAuthGuard)
  async getOrganisationTokens(@Param('id', ParseIntPipe) id: number) {
    return await this.organisationsService.getOrganisationTokens(id);
  }

  /**
   * Récupérer le statut d'une organisation (BD créée, utilisateurs, etc.)
   */
  @Get(':id/status')
  @UseGuards(AdminJwtAuthGuard)
  async getOrganisationStatus(@Param('id', ParseIntPipe) id: number) {
    return await this.organisationsService.getOrganisationStatus(id);
  }

  /**
   * Générer un nouveau token de configuration
   */
  @Post(':id/generate-token')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async generateNewToken(@Param('id', ParseIntPipe) id: number) {
    return await this.organisationsService.generateNewSetupToken(id);
  }

  /**
   * Supprimer un token de configuration
   */
  @Delete('tokens/:tokenId')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteToken(@Param('tokenId', ParseIntPipe) tokenId: number) {
    return await this.organisationsService.deleteSetupToken(tokenId);
  }
}
