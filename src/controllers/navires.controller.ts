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
} from '@nestjs/common';
import { NaviresService } from '../services/navires.service';
import { CreateNavireDto } from '../dto/create-navire.dto';
import { UpdateNavireDto } from '../dto/update-navire.dto';

@Controller('navires')
export class NaviresController {
  private readonly logger = new Logger(NaviresController.name);

  constructor(private readonly naviresService: NaviresService) {}

  /**
   * Créer un nouveau navire
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createNavireDto: CreateNavireDto) {
    this.logger.log(`Création d'un navire`);
    return this.naviresService.create(createNavireDto);
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
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const armateurIdNum = armateurId ? parseInt(armateurId, 10) : undefined;
    
    this.logger.log(`Récupération des navires - Page: ${pageNum}, Limite: ${limitNum}`);
    return this.naviresService.findAll(pageNum, limitNum, search, statut, armateurIdNum);
  }

  /**
   * Récupérer tous les navires actifs (pour les dropdowns)
   */
  @Get('active')
  async findAllActive() {
    this.logger.log('Récupération des navires actifs');
    return this.naviresService.findAllActive();
  }

  /**
   * Récupérer les navires par armateur
   */
  @Get('armateur/:armateurId')
  async findByArmateur(@Param('armateurId', ParseIntPipe) armateurId: number) {
    this.logger.log(`Récupération des navires de l'armateur ${armateurId}`);
    return this.naviresService.findByArmateur(armateurId);
  }

  /**
   * Récupérer un navire par son ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Récupération du navire ${id}`);
    return this.naviresService.findOne(id);
  }

  /**
   * Mettre à jour un navire
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNavireDto: UpdateNavireDto,
  ) {
    this.logger.log(`Mise à jour du navire ${id}`);
    return this.naviresService.update(id, updateNavireDto);
  }

  /**
   * Supprimer un navire
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Suppression du navire ${id}`);
    await this.naviresService.remove(id);
  }

  /**
   * Activer un navire
   */
  @Put(':id/activate')
  async activate(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Activation du navire ${id}`);
    return this.naviresService.activate(id);
  }

  /**
   * Désactiver un navire
   */
  @Put(':id/deactivate')
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Désactivation du navire ${id}`);
    return this.naviresService.deactivate(id);
  }
}
