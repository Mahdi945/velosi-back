import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LocationService } from './location.service';
import { LocationGateway } from '../gateway/location.gateway';

@Injectable()
export class LocationSchedulerService {
  private readonly logger = new Logger(LocationSchedulerService.name);

  constructor(
    private readonly locationService: LocationService,
    private readonly locationGateway: LocationGateway,
  ) {}

  /**
   * Marque les positions inactives toutes les 5 minutes
   */
  @Cron('*/5 * * * *') // Toutes les 5 minutes
  async handleInactiveLocationCleanup() {
    try {
      this.logger.log('Début du nettoyage des positions inactives...');
      await this.locationService.markInactiveLocations();
      
      // Diffuser les nouvelles statistiques
      const stats = await this.locationService.getLocationStats();
      await this.locationGateway.broadcastLocationStats(stats);
      
      this.logger.log('Nettoyage des positions inactives terminé');
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage des positions inactives:', error);
    }
  }

  /**
   * Nettoie les anciennes positions tous les jours à 2h du matin
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleOldLocationCleanup() {
    try {
      this.logger.log('Début du nettoyage des anciennes positions...');
      await this.locationService.cleanupOldLocations();
      this.logger.log('Nettoyage des anciennes positions terminé');
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage des anciennes positions:', error);
    }
  }

  /**
   * Diffuse les statistiques de géolocalisation toutes les 10 minutes
   */
  @Cron('*/10 * * * *') // Toutes les 10 minutes
  async handleLocationStatsBroadcast() {
    try {
      const stats = await this.locationService.getLocationStats();
      await this.locationGateway.broadcastLocationStats(stats);
      this.logger.log('Statistiques de géolocalisation diffusées');
    } catch (error) {
      this.logger.error('Erreur lors de la diffusion des statistiques:', error);
    }
  }

  /**
   * Vérifie les personnels inactifs trop longtemps (plus de 2 heures)
   * et envoie une alerte aux administrateurs
   */
  @Cron('0 */2 * * *') // Toutes les 2 heures
  async handleInactivePersonnelAlert() {
    try {
      this.logger.log('Vérification des personnels inactifs...');
      
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const allPersonnel = await this.locationService.getAllPersonnelWithLocation();
      
      const inactivePersonnel = allPersonnel.filter(personnel => 
        personnel.location_tracking_enabled && 
        personnel.last_location_update && 
        personnel.last_location_update < twoHoursAgo
      );

      for (const personnel of inactivePersonnel) {
        await this.locationGateway.broadcastLocationAlert({
          type: 'inactive_too_long',
          personnelId: personnel.id,
          personnelName: `${personnel.prenom} ${personnel.nom}`,
          message: `${personnel.prenom} ${personnel.nom} est inactif depuis plus de 2 heures`,
          severity: 'medium'
        });
      }

      if (inactivePersonnel.length > 0) {
        this.logger.warn(`${inactivePersonnel.length} personnel(s) inactif(s) détecté(s)`);
      } else {
        this.logger.log('Aucun personnel inactif détecté');
      }
    } catch (error) {
      this.logger.error('Erreur lors de la vérification des personnels inactifs:', error);
    }
  }

  /**
   * Vérifie l'état des connexions WebSocket toutes les heures
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleConnectionMonitoring() {
    try {
      const connectionStats = this.locationGateway.getConnectionStats();
      this.logger.log(`Connexions WebSocket - Total: ${connectionStats.totalConnected}, Admins: ${connectionStats.adminConnected}, Personnel: ${connectionStats.personnelConnected}`);
      
      // Diffuser les statistiques de connexion
      await this.locationGateway.broadcastLocationStats({
        ...await this.locationService.getLocationStats(),
        websocketConnections: connectionStats
      });
    } catch (error) {
      this.logger.error('Erreur lors du monitoring des connexions:', error);
    }
  }

  /**
   * Nettoyage hebdomadaire approfondi - dimanche à 3h du matin
   */
  @Cron('0 3 * * 0') // Dimanche à 3h du matin
  async handleWeeklyCleanup() {
    try {
      this.logger.log('Début du nettoyage hebdomadaire...');
      
      // Nettoyer les anciennes positions
      await this.locationService.cleanupOldLocations();
      
      // Marquer les positions inactives
      await this.locationService.markInactiveLocations();
      
      // Obtenir et diffuser les statistiques
      const stats = await this.locationService.getLocationStats();
      await this.locationGateway.broadcastLocationStats(stats);
      
      this.logger.log('Nettoyage hebdomadaire terminé');
      this.logger.log(`Statistiques après nettoyage: ${JSON.stringify(stats)}`);
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage hebdomadaire:', error);
    }
  }
}