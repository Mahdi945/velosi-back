import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ObjectifComService } from '../services/objectif-com.service';
import {
  CreateObjectifComDto,
  UpdateObjectifComDto,
} from '../dto/objectif-com.dto';

@Controller('objectifs-commerciaux')
@UseGuards(JwtAuthGuard)
export class ObjectifComController {
  constructor(private readonly objectifComService: ObjectifComService) {}

  @Post()
  async create(@Body() createObjectifComDto: CreateObjectifComDto) {
    return this.objectifComService.create(createObjectifComDto);
  }

  @Get()
  async findAll(@Query('personnelId') personnelId?: number) {
    if (personnelId) {
      return this.objectifComService.findByPersonnel(personnelId);
    }
    return this.objectifComService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.objectifComService.findOne(id);
  }

  @Get('personnel/:personnelId')
  async findByPersonnel(
    @Param('personnelId', ParseIntPipe) personnelId: number,
  ) {
    console.log('Contrôleur: Recherche objectifs pour personnel:', personnelId);
    try {
      const objectifs = await this.objectifComService.findByPersonnel(personnelId);
      console.log('Contrôleur: Objectifs récupérés:', objectifs);
      
      return {
        success: true,
        data: objectifs,
        message: `${objectifs.length} objectif(s) trouvé(s) pour le personnel ${personnelId}`
      };
    } catch (error) {
      console.error('Contrôleur: Erreur lors de la récupération des objectifs:', error);
      return {
        success: false,
        data: [],
        message: 'Erreur lors de la récupération des objectifs'
      };
    }
  }

  @Get('commercial/actifs')
  async findActiveCommercialObjectives() {
    return this.objectifComService.findActiveCommercialObjectives();
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateObjectifComDto: UpdateObjectifComDto,
  ) {
    return this.objectifComService.update(id, updateObjectifComDto);
  }

  @Put('personnel/:personnelId')
  async upsertByPersonnel(
    @Param('personnelId', ParseIntPipe) personnelId: number,
    @Body() objectifData: any,
  ) {
    console.log('=== CONTRÔLEUR UPSERT OBJECTIF ===');
    console.log('URL appelée: PUT /objectifs-commerciaux/personnel/' + personnelId);
    console.log('Personnel ID reçu:', personnelId, 'Type:', typeof personnelId);
    console.log('Données objectif reçues:', JSON.stringify(objectifData, null, 2));
    console.log('Headers de la requête:', JSON.stringify(this.getHeaders(arguments), null, 2));
    
    try {
      console.log('Appel du service upsertByPersonnel...');
      const objectif = await this.objectifComService.upsertByPersonnel(personnelId, objectifData);
      console.log('Contrôleur: Objectif sauvegardé avec succès:', JSON.stringify(objectif, null, 2));
      
      const response = {
        success: true,
        data: objectif,
        message: 'Objectif sauvegardé avec succès'
      };
      
      console.log('Contrôleur: Réponse à envoyer:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('Contrôleur: Erreur détaillée lors de l\'upsert:');
      console.error('- Message:', error.message);
      console.error('- Stack:', error.stack);
      console.error('- Personnel ID:', personnelId);
      console.error('- Données:', objectifData);
      throw error;
    }
  }

  private getHeaders(args: any): any {
    // Récupérer les headers de la requête depuis le contexte NestJS
    try {
      const request = args[2] || {};
      return request.headers || {};
    } catch (e) {
      return {};
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.objectifComService.remove(id);
  }
}
