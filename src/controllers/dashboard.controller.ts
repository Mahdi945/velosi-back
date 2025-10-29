import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Request } from 'express';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Obtenir les statistiques globales du dashboard
   * Accès: Administratif uniquement
   */
  @Get('stats')
  @Roles('administratif')
  async getDashboardStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transportType') transportType?: string,
    @Query('trafficType') trafficType?: string,
  ) {
    try {
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (transportType) filters.transportType = transportType;
      if (trafficType) filters.trafficType = trafficType;
      
      const stats = await this.dashboardService.getDashboardStats(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      return {
        success: true,
        data: stats,
        message: 'Statistiques du dashboard récupérées avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques du dashboard:', error);
      return {
        success: false,
        data: null,
        message: 'Erreur lors de la récupération des statistiques'
      };
    }
  }

  /**
   * Obtenir l'évolution des ventes sur 12 mois
   * Accès: Administratif et Commercial
   */
  @Get('sales-evolution')
  @Roles('administratif', 'commercial')
  async getSalesEvolution(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transportType') transportType?: string,
    @Query('trafficType') trafficType?: string,
  ) {
    try {
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (transportType) filters.transportType = transportType;
      if (trafficType) filters.trafficType = trafficType;
      
      const evolution = await this.dashboardService.getSalesEvolution(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      return {
        success: true,
        data: evolution,
        message: 'Évolution des ventes récupérée avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'évolution des ventes:', error);
      return {
        success: false,
        data: null,
        message: 'Erreur lors de la récupération de l\'évolution'
      };
    }
  }

  /**
   * Obtenir les statistiques CRM détaillées
   * Accès: Administratif et Commercial
   */
  @Get('crm-stats')
  @Roles('administratif', 'commercial')
  async getCRMStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transportType') transportType?: string,
    @Query('trafficType') trafficType?: string,
  ) {
    try {
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (transportType) filters.transportType = transportType;
      if (trafficType) filters.trafficType = trafficType;
      
      const stats = await this.dashboardService.getCRMStats(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      return {
        success: true,
        data: stats,
        message: 'Statistiques CRM récupérées avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques CRM:', error);
      return {
        success: false,
        data: null,
        message: 'Erreur lors de la récupération des statistiques CRM'
      };
    }
  }

  /**
   * Obtenir les activités récentes
   * Accès: Tous les utilisateurs authentifiés
   */
  @Get('recent-activities')
  async getRecentActivities(
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transportType') transportType?: string,
    @Query('trafficType') trafficType?: string,
  ) {
    try {
      const limitNumber = limit ? parseInt(limit, 10) : 10;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (transportType) filters.transportType = transportType;
      if (trafficType) filters.trafficType = trafficType;
      
      const activities = await this.dashboardService.getRecentActivities(
        limitNumber,
        Object.keys(filters).length > 0 ? filters : undefined
      );
      return {
        success: true,
        data: activities,
        message: 'Activités récentes récupérées avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des activités récentes:', error);
      return {
        success: false,
        data: [],
        message: 'Erreur lors de la récupération des activités'
      };
    }
  }

  /**
   * Obtenir la répartition par type de transport (spécifique Velosi)
   * Accès: Administratif et Commercial
   */
  @Get('transport-distribution')
  @Roles('administratif', 'commercial')
  async getTransportDistribution(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transportType') transportType?: string,
    @Query('trafficType') trafficType?: string,
  ) {
    try {
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (transportType) filters.transportType = transportType;
      if (trafficType) filters.trafficType = trafficType;
      
      const distribution = await this.dashboardService.getTransportDistribution(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      return {
        success: true,
        data: distribution,
        message: 'Répartition par transport récupérée avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de la répartition transport:', error);
      return {
        success: false,
        data: null,
        message: 'Erreur lors de la récupération de la répartition'
      };
    }
  }

  /**
   * Obtenir les statistiques Import/Export basées sur les cotations
   * Accès: Administratif uniquement
   */
  @Get('import-export-stats')
  @Roles('administratif')
  async getImportExportStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      
      const stats = await this.dashboardService.getImportExportStats(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      return {
        success: true,
        data: stats,
        message: 'Statistiques Import/Export récupérées avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques Import/Export:', error);
      return {
        success: false,
        data: null,
        message: 'Erreur lors de la récupération des statistiques Import/Export'
      };
    }
  }

  /**
   * Obtenir les statistiques personnalisées du commercial connecté
   * Accès: Commercial uniquement
   */
  @Get('commercial/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('commercial')
  async getCommercialStats(@Req() req: Request) {
    try {
      console.log('📊 [commercial/stats] Requête reçue');
      console.log('👤 [commercial/stats] User:', (req as any).user);
      
      const userId = (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        console.error('❌ [commercial/stats] Aucun userId trouvé');
        return {
          success: false,
          data: null,
          message: 'Utilisateur non identifié'
        };
      }
      
      console.log('✅ [commercial/stats] userId:', userId);
      const stats = await this.dashboardService.getCommercialStats(userId);
      return {
        success: true,
        data: stats,
        message: 'Statistiques commerciales récupérées avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques commerciales:', error);
      return {
        success: false,
        data: null,
        message: 'Erreur lors de la récupération des statistiques commerciales'
      };
    }
  }

  /**
   * Obtenir la performance mensuelle du commercial
   * Accès: Commercial uniquement
   */
  @Get('commercial/performance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('commercial')
  async getCommercialPerformance(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      console.log('📊 [commercial/performance] Requête reçue');
      console.log('👤 [commercial/performance] User:', (req as any).user);
      
      const userId = (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        console.error('❌ [commercial/performance] Aucun userId trouvé');
        return {
          success: false,
          data: null,
          message: 'Utilisateur non identifié'
        };
      }
      
      console.log('✅ [commercial/performance] userId:', userId);
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      
      const performance = await this.dashboardService.getCommercialPerformance(
        userId,
        Object.keys(filters).length > 0 ? filters : undefined
      );
      return {
        success: true,
        data: performance,
        message: 'Performance commerciale récupérée avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de la performance commerciale:', error);
      return {
        success: false,
        data: null,
        message: 'Erreur lors de la récupération de la performance'
      };
    }
  }
}
