import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { LocationService } from '../services/location.service';
import { 
  LocationUpdateDto, 
  LocationTrackingToggleDto, 
  LocationSearchDto,
  LocationResponseDto,
  LocationStatsResponseDto
} from '../dto/location-update.dto';
import { Personnel } from '../entities/personnel.entity';

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Mettre à jour la position GPS d'un personnel
   * POST /location/personnel/:id/update
   */
  @Post('personnel/:id/update')
  async updatePersonnelLocation(
    @Param('id', ParseIntPipe) personnelId: number,
    @Body() locationData: LocationUpdateDto,
  ): Promise<{ success: boolean; data: Personnel; message: string }> {
    try {
      const updatedPersonnel = await this.locationService.updatePersonnelLocation(
        personnelId,
        locationData,
      );

      return {
        success: true,
        data: updatedPersonnel,
        message: 'Position mise à jour avec succès',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Erreur lors de la mise à jour de la position',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Activer/désactiver le suivi GPS pour un personnel
   * PUT /location/personnel/:id/tracking
   */
  @Put('personnel/:id/tracking')
  async toggleLocationTracking(
    @Param('id', ParseIntPipe) personnelId: number,
    @Body() toggleData: LocationTrackingToggleDto,
  ): Promise<{ success: boolean; data: Personnel; message: string }> {
    try {
      const updatedPersonnel = await this.locationService.toggleLocationTracking(
        personnelId,
        toggleData.enabled,
      );

      return {
        success: true,
        data: updatedPersonnel,
        message: `Suivi GPS ${toggleData.enabled ? 'activé' : 'désactivé'} avec succès`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Erreur lors du changement de statut de tracking',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Récupérer tous les personnels avec leur position
   * GET /location/personnel/all
   */
  @Get('personnel/all')
  async getAllPersonnelWithLocation(): Promise<{
    success: boolean;
    data: Personnel[];
    count: number;
  }> {
    try {
      const personnelList = await this.locationService.getAllPersonnelWithLocation();

      return {
        success: true,
        data: personnelList,
        count: personnelList.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération des positions',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Récupérer les personnels actifs avec position récente
   * GET /location/personnel/active
   */
  @Get('personnel/active')
  async getActivePersonnelWithRecentLocation(): Promise<{
    success: boolean;
    data: Personnel[];
    count: number;
  }> {
    try {
      const activePersonnelList = await this.locationService.getActivePersonnelWithRecentLocation();

      return {
        success: true,
        data: activePersonnelList,
        count: activePersonnelList.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération des personnels actifs',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Rechercher du personnel par proximité géographique
   * GET /location/personnel/nearby?lat=33.5731&lng=-7.5898&radius=5
   */
  @Get('personnel/nearby')
  async findPersonnelNearby(
    @Query('lat') latitude: number,
    @Query('lng') longitude: number,
    @Query('radius') radius?: number,
  ): Promise<{
    success: boolean;
    data: Array<Personnel & { distance: number }>;
    searchCenter: { latitude: number; longitude: number };
    searchRadius: number;
    count: number;
  }> {
    try {
      // Validation des paramètres
      if (!latitude || !longitude) {
        throw new HttpException(
          'Les paramètres lat et lng sont requis',
          HttpStatus.BAD_REQUEST,
        );
      }

      const searchRadius = radius || 5;
      const nearbyPersonnel = await this.locationService.findPersonnelNearby(
        Number(latitude),
        Number(longitude),
        searchRadius,
      );

      return {
        success: true,
        data: nearbyPersonnel,
        searchCenter: { latitude: Number(latitude), longitude: Number(longitude) },
        searchRadius,
        count: nearbyPersonnel.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Erreur lors de la recherche de proximité',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtenir la position d'un personnel spécifique
   * GET /location/personnel/:id
   */
  @Get('personnel/:id')
  async getPersonnelLocation(
    @Param('id', ParseIntPipe) personnelId: number,
  ): Promise<{ success: boolean; data: Personnel | null }> {
    try {
      const personnelList = await this.locationService.getAllPersonnelWithLocation();
      const personnel = personnelList.find(p => p.id === personnelId);

      return {
        success: true,
        data: personnel || null,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération de la position',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtenir les statistiques de géolocalisation
   * GET /location/stats
   */
  @Get('stats')
  async getLocationStats(): Promise<{
    success: boolean;
    data: LocationStatsResponseDto;
  }> {
    try {
      const stats = await this.locationService.getLocationStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération des statistiques',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Marquer les positions inactives (tâche de nettoyage)
   * POST /location/cleanup/inactive
   */
  @Post('cleanup/inactive')
  async markInactiveLocations(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.locationService.markInactiveLocations();

      return {
        success: true,
        message: 'Positions inactives marquées avec succès',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors du nettoyage des positions inactives',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Nettoyer les anciennes positions (plus de 24h)
   * POST /location/cleanup/old
   */
  @Post('cleanup/old')
  async cleanupOldLocations(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.locationService.cleanupOldLocations();

      return {
        success: true,
        message: 'Anciennes positions nettoyées avec succès',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors du nettoyage des anciennes positions',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Vérifier le statut de suivi GPS pour un personnel
   * GET /location/personnel/:id/tracking-status
   */
  @Get('personnel/:id/tracking-status')
  async getPersonnelTrackingStatus(
    @Param('id', ParseIntPipe) personnelId: number,
  ): Promise<{ location_tracking_enabled: boolean; is_location_active: boolean }> {
    try {
      const personnel = await this.locationService.findPersonnelById(personnelId);
      
      if (!personnel) {
        throw new HttpException(
          'Personnel non trouvé',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        location_tracking_enabled: personnel.location_tracking_enabled || false,
        is_location_active: personnel.is_location_active || false,
      };
    } catch (error) {
      console.error(`❌ Erreur récupération statut GPS personnel ${personnelId}:`, error);
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération du statut GPS',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test endpoint pour vérifier la connectivité
   * GET /location/health
   */
  @Get('health')
  getHealthCheck(): {
    success: boolean;
    message: string;
    timestamp: string;
    service: string;
  } {
    return {
      success: true,
      message: 'Service de géolocalisation opérationnel',
      timestamp: new Date().toISOString(),
      service: 'LocationController',
    };
  }
}