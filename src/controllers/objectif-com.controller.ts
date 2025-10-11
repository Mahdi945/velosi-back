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
  Request,
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

  @Get('mes-objectifs')
  async findMyObjectives(@Request() req) {
    const userId = req.user?.id;
    const userType = req.user?.userType || 'personnel';
    
    console.log('=== CONTRÔLEUR MES-OBJECTIFS ===');
    console.log('Récupération des objectifs pour l\'utilisateur connecté:', {
      userId,
      userType,
      userIdType: typeof userId,
      fullUser: req.user
    });
    
    if (!userId) {
      console.log('❌ Aucun userId trouvé dans la requête');
      return {
        success: false,
        data: [],
        message: 'Utilisateur non identifié'
      };
    }

    try {
      // Pour les commerciaux, récupérer leurs propres objectifs
      if (userType === 'personnel') {
        const userIdNumber = parseInt(userId);
        console.log('🔍 Recherche objectifs pour personnel ID:', userIdNumber);
        
        // D'abord, récupérer tous les objectifs (actifs et inactifs) pour diagnostic
        const tousObjectifs = await this.objectifComService.findByPersonnel(userIdNumber);
        console.log('📊 Tous les objectifs trouvés:', tousObjectifs.length);
        
        // Ensuite, récupérer seulement les actifs
        const objectifsActifs = await this.objectifComService.findActiveByPersonnel(userIdNumber);
        console.log('✅ Objectifs actifs trouvés:', objectifsActifs.length);
        
        return {
          success: true,
          data: objectifsActifs,
          message: `${objectifsActifs.length} objectif(s) actif(s) trouvé(s) sur ${tousObjectifs.length} total`,
          debug: {
            totalObjectifs: tousObjectifs.length,
            objectifsActifs: objectifsActifs.length,
            userId: userIdNumber,
            userType
          }
        };
      } else {
        console.log('👤 Utilisateur client détecté - pas d\'objectifs');
        return {
          success: true,
          data: [],
          message: 'Fonctionnalité à implémenter pour les clients'
        };
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des objectifs:', error);
      return {
        success: false,
        data: [],
        message: 'Erreur lors de la récupération des objectifs: ' + error.message
      };
    }
  }

  @Get('commercial/actifs')
  async findActiveCommercialObjectives() {
    return this.objectifComService.findActiveCommercialObjectives();
  }

  @Get('personnel/:personnelId')
  async findByPersonnel(
    @Param('personnelId', ParseIntPipe) personnelId: number,
    @Query('active_only') activeOnly?: string,
  ) {
    console.log('Contrôleur: Recherche objectifs pour personnel:', personnelId);
    console.log('Filtrer seulement les actifs:', activeOnly);
    
    try {
      let objectifs;
      
      // Si active_only est précisé, utiliser la méthode pour les objectifs actifs seulement
      if (activeOnly === 'true') {
        objectifs = await this.objectifComService.findActiveByPersonnel(personnelId);
      } else {
        objectifs = await this.objectifComService.findByPersonnel(personnelId);
      }
      
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

  // Nouveau endpoint pour activer/désactiver un objectif
  @Put(':id/toggle-active')
  async toggleActiveStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { is_active: boolean },
  ) {
    console.log(`Contrôleur: Toggle statut actif pour objectif ${id}:`, body.is_active);
    
    try {
      const objectif = await this.objectifComService.toggleActiveStatus(id, body.is_active);
      
      return {
        success: true,
        data: objectif,
        message: `Objectif ${body.is_active ? 'activé' : 'désactivé'} avec succès`
      };
    } catch (error) {
      console.error('Contrôleur: Erreur lors du toggle:', error);
      return {
        success: false,
        data: null,
        message: 'Erreur lors de la modification du statut'
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.objectifComService.findOne(id);
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
