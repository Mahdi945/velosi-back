import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import { NaviresService } from '../services/navires.service';
import { CreateNavireDto } from '../dto/create-navire.dto';
import { UpdateNavireDto } from '../dto/update-navire.dto';
import { getDatabaseName, getOrganisationId } from '../common/helpers/multi-tenant.helper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@Controller('navires')
@UseGuards(JwtAuthGuard)
export class NaviresController {
  private readonly logger = new Logger(NaviresController.name);

  constructor(private readonly naviresService: NaviresService) {}

  /**
   * Créer un nouveau navire
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createNavireDto: CreateNavireDto, @Req() req: any) {
    this.logger.log(`Création d'un navire`);
    const databaseName = getDatabaseName(req);
    return this.naviresService.create(databaseName, createNavireDto);
  }

  /**
   * Récupérer tous les navires avec pagination et filtres
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('statut') statut?: string,
    @Query('armateurId') armateurId?: string,
    @Req() req?: any,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const armateurIdNum = armateurId ? parseInt(armateurId, 10) : undefined;
    
    this.logger.log(`Récupération des navires - Page: ${pageNum}, Limite: ${limitNum}`);
    const databaseName = getDatabaseName(req);
    return this.naviresService.findAll(databaseName, pageNum, limitNum, search, statut, armateurIdNum);
  }

  /**
   * Récupérer tous les navires actifs (pour les dropdowns)
   */
  @Get('active')
  async findAllActive(@Req() req: any) {
    this.logger.log('Récupération des navires actifs');
    const databaseName = getDatabaseName(req);
    return this.naviresService.findAllActive(databaseName);
  }

  /**
   * Récupérer les navires par armateur
   */
  @Get('armateur/:armateurId')
  async findByArmateur(@Param('armateurId', ParseIntPipe) armateurId: number, @Req() req: any) {
    this.logger.log(`Récupération des navires de l'armateur ${armateurId}`);
    const databaseName = getDatabaseName(req);
    return this.naviresService.findByArmateur(databaseName, armateurId);
  }

  /**
   * Récupérer un navire par son ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    this.logger.log(`Récupération du navire ${id}`);
    const databaseName = getDatabaseName(req);
    return this.naviresService.findOne(databaseName, id);
  }

  /**
   * Mettre à jour un navire
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNavireDto: UpdateNavireDto,
    @Req() req: any,
  ) {
    this.logger.log(`Mise à jour du navire ${id}`);
    const databaseName = getDatabaseName(req);
    return this.naviresService.update(databaseName, id, updateNavireDto);
  }

  /**
   * Supprimer un navire
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    this.logger.log(`Suppression du navire ${id}`);
    const databaseName = getDatabaseName(req);
    await this.naviresService.remove(databaseName, id);
  }

  /**
   * Activer un navire
   */
  @Put(':id/activate')
  async activate(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    this.logger.log(`Activation du navire ${id}`);
    const databaseName = getDatabaseName(req);
    return this.naviresService.activate(databaseName, id);
  }

  /**
   * Désactiver un navire
   */
  @Put(':id/deactivate')
  async deactivate(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    this.logger.log(`Désactivation du navire ${id}`);
    const databaseName = getDatabaseName(req);
    return this.naviresService.deactivate(databaseName, id);
  }
}
