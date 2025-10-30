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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PortsService } from '../services/ports.service';
import { CreatePortDto, UpdatePortDto } from '../dto/port.dto';
import { Port } from '../entities/port.entity';

@ApiTags('Ports')
@Controller('ports')
export class PortsController {
  constructor(private readonly portsService: PortsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Créer un nouveau port' })
  @ApiResponse({ status: 201, description: 'Port créé avec succès', type: Port })
  @ApiResponse({ status: 409, description: 'L\'abréviation existe déjà' })
  async create(@Body() createPortDto: CreatePortDto): Promise<Port> {
    return await this.portsService.create(createPortDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les ports avec filtres' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche dans libellé, abréviation, ville, pays' })
  @ApiQuery({ name: 'ville', required: false, type: String, description: 'Filtrer par ville' })
  @ApiQuery({ name: 'pays', required: false, type: String, description: 'Filtrer par pays' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filtrer par statut actif/inactif' })
  @ApiResponse({ status: 200, description: 'Liste des ports', type: [Port] })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('ville') ville?: string,
    @Query('pays') pays?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<{ data: Port[]; total: number; page: number; limit: number }> {
    return await this.portsService.findAll(
      page || 1,
      limit || 10,
      search,
      ville,
      pays,
      isActive,
    );
  }

  @Get('active')
  @ApiOperation({ summary: 'Récupérer tous les ports actifs' })
  @ApiResponse({ status: 200, description: 'Liste des ports actifs', type: [Port] })
  async findAllActive(): Promise<Port[]> {
    return await this.portsService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un port par ID' })
  @ApiResponse({ status: 200, description: 'Port trouvé', type: Port })
  @ApiResponse({ status: 404, description: 'Port non trouvé' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Port> {
    return await this.portsService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mettre à jour un port' })
  @ApiResponse({ status: 200, description: 'Port mis à jour', type: Port })
  @ApiResponse({ status: 404, description: 'Port non trouvé' })
  @ApiResponse({ status: 409, description: 'L\'abréviation existe déjà' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePortDto: UpdatePortDto,
  ): Promise<Port> {
    return await this.portsService.update(id, updatePortDto);
  }

  @Put(':id/toggle-active')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Basculer le statut actif/inactif d\'un port' })
  @ApiResponse({ status: 200, description: 'Statut basculé avec succès', type: Port })
  @ApiResponse({ status: 404, description: 'Port non trouvé' })
  async toggleActive(@Param('id', ParseIntPipe) id: number): Promise<Port> {
    return await this.portsService.toggleActive(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Supprimer un port' })
  @ApiResponse({ status: 200, description: 'Port supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Port non trouvé' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.portsService.remove(id);
    return { message: 'Port supprimé avec succès' };
  }
}
