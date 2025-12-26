import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getDatabaseName, getOrganisationId } from '../common/helpers/multi-tenant.helper';
import { AeroportsService } from '../services/aeroports.service';
import { CreateAeroportDto, UpdateAeroportDto } from '../dto/aeroport.dto';
import { Aeroport } from '../entities/aeroport.entity';

@ApiTags('Aéroports')
@Controller('aeroports')
export class AeroportsController {
  constructor(private readonly aeroportsService: AeroportsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Créer un nouvel aéroport' })
  @ApiResponse({ status: 201, description: 'Aéroport créé avec succès', type: Aeroport })
  @ApiResponse({ status: 409, description: 'Le code IATA/ICAO existe déjà' })
  async create(@Body() createAeroportDto: CreateAeroportDto, @Req() req: any): Promise<Aeroport> {
    const databaseName = getDatabaseName(req);
    return await this.aeroportsService.create(databaseName, createAeroportDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les aéroports avec filtres' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche dans libellé, code, ville, pays' })
  @ApiQuery({ name: 'ville', required: false, type: String, description: 'Filtrer par ville' })
  @ApiQuery({ name: 'pays', required: false, type: String, description: 'Filtrer par pays' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filtrer par statut actif/inactif' })
  @ApiResponse({ status: 200, description: 'Liste des aéroports', type: [Aeroport] })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('ville') ville?: string,
    @Query('pays') pays?: string,
    @Query('isActive') isActive?: boolean,
    @Req() req?: any,
  ): Promise<{ data: Aeroport[]; total: number; page: number; limit: number }> {
    const databaseName = getDatabaseName(req);
    return await this.aeroportsService.findAll(
      databaseName,
      page || 1,
      limit || 10,
      search,
      ville,
      pays,
      isActive,
    );
  }

  @Get('active')
  @ApiOperation({ summary: 'Récupérer tous les aéroports actifs' })
  @ApiResponse({ status: 200, description: 'Liste des aéroports actifs', type: [Aeroport] })
  async findAllActive(@Req() req: any): Promise<Aeroport[]> {
    const databaseName = getDatabaseName(req);
    return await this.aeroportsService.findAllActive(databaseName);
  }

  @Get('all')
  @ApiOperation({ summary: 'Récupérer tous les aéroports (actifs et inactifs)' })
  @ApiResponse({ status: 200, description: 'Liste de tous les aéroports', type: [Aeroport] })
  async findAllAeroports(@Req() req: any): Promise<Aeroport[]> {
    const databaseName = getDatabaseName(req);
    return await this.aeroportsService.findAllAeroports(databaseName);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un aéroport par ID' })
  @ApiResponse({ status: 200, description: 'Aéroport trouvé', type: Aeroport })
  @ApiResponse({ status: 404, description: 'Aéroport non trouvé' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<Aeroport> {
    const databaseName = getDatabaseName(req);
    return await this.aeroportsService.findOne(databaseName, id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mettre à jour un aéroport' })
  @ApiResponse({ status: 200, description: 'Aéroport mis à jour', type: Aeroport })
  @ApiResponse({ status: 404, description: 'Aéroport non trouvé' })
  @ApiResponse({ status: 409, description: 'Le code IATA/ICAO existe déjà' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAeroportDto: UpdateAeroportDto,
    @Req() req: any,
  ): Promise<Aeroport> {
    const databaseName = getDatabaseName(req);
    return await this.aeroportsService.update(databaseName, id, updateAeroportDto);
  }

  @Put(':id/toggle-active')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Basculer le statut actif/inactif d\'un aéroport' })
  @ApiResponse({ status: 200, description: 'Statut basculé avec succès', type: Aeroport })
  @ApiResponse({ status: 404, description: 'Aéroport non trouvé' })
  async toggleActive(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<Aeroport> {
    const databaseName = getDatabaseName(req);
    return await this.aeroportsService.toggleActive(databaseName, id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Supprimer un aéroport' })
  @ApiResponse({ status: 200, description: 'Aéroport supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Aéroport non trouvé' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<{ message: string }> {
    const databaseName = getDatabaseName(req);
    await this.aeroportsService.remove(databaseName, id);
    return { message: 'Aéroport supprimé avec succès' };
  }
}
