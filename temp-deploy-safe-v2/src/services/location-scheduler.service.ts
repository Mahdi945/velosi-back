import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LocationService } from './location.service';
import { LocationGateway } from '../gateway/location.gateway';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Injectable()
export class LocationSchedulerService {
  private readonly logger = new Logger(LocationSchedulerService.name);

  constructor(
    private readonly locationService: LocationService,
    private readonly locationGateway: LocationGateway,
    private readonly databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Marque les positions inactives toutes les 1 minute pour une meilleure réactivité
   */
  @Cron('*/1 * * * *') // Toutes les 1 minute
  async handleInactiveLocationCleanup() {
    try {
      this.logger.debug('Début du nettoyage des positions inactives...');
      
      // Récupérer toutes les organisations
      const organisations = await this.databaseConnectionService.getAllOrganisations();
      
      for (const org of organisations) {
        try {
          await this.locationService.markInactiveLocations(org.database_name, org.id);
          
          // Diffuser les nouvelles statistiques toutes les 5 minutes seulement
          const currentMinute = new Date().getMinutes();
          if (currentMinute % 5 === 0) {
            const stats = await this.locationService.getLocationStats(org.database_name, org.id);
            await this.locationGateway.broadcastLocationStats(stats);
          }
        } catch (error) {
          this.logger.error(`Erreur nettoyage positions inactives pour ${org.nom}:`, error);
        }
      }
      
      this.logger.log('Nettoyage des positions inactives terminé pour toutes les organisations');
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
      
      const organisations = await this.databaseConnectionService.getAllOrganisations();
      
      for (const org of organisations) {
        try {
          await this.locationService.cleanupOldLocations(org.database_name, org.id);
        } catch (error) {
          this.logger.error(`Erreur nettoyage anciennes positions pour ${org.nom}:`, error);
        }
      }
      
      this.logger.log('Nettoyage des anciennes positions terminé pour toutes les organisations');
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
      const organisations = await this.databaseConnectionService.getAllOrganisations();
      
      for (const org of organisations) {
        try {
          const stats = await this.locationService.getLocationStats(org.database_name, org.id);
          await this.locationGateway.broadcastLocationStats(stats);
        } catch (error) {
          this.logger.error(`Erreur diffusion stats pour ${org.nom}:`, error);
        }
      }
      
      this.logger.log('Statistiques de géolocalisation diffusées pour toutes les organisations');
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
      
      const organisations = await this.databaseConnectionService.getAllOrganisations();
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      for (const org of organisations) {
        try {
          const allPersonnel = await this.locationService.getAllPersonnelWithLocation(org.database_name, org.id);
          
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
            this.logger.warn(`${inactivePersonnel.length} personnel(s) inactif(s) détecté(s) pour ${org.nom}`);
          }
        } catch (error) {
          this.logger.error(`Erreur vérification personnels inactifs pour ${org.nom}:`, error);
        }
      }
      
      this.logger.log('Vérification des personnels inactifs terminée');
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
      
      const organisations = await this.databaseConnectionService.getAllOrganisations();
      
      // Diffuser les statistiques de connexion pour chaque organisation
      for (const org of organisations) {
        try {
          const stats = await this.locationService.getLocationStats(org.database_name, org.id);
          await this.locationGateway.broadcastLocationStats({
            ...stats,
            websocketConnections: connectionStats
          });
        } catch (error) {
          this.logger.error(`Erreur monitoring connexions pour ${org.nom}:`, error);
        }
      }
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
      
      const organisations = await this.databaseConnectionService.getAllOrganisations();
      
      for (const org of organisations) {
        try {
          // Nettoyer les anciennes positions
          await this.locationService.cleanupOldLocations(org.database_name, org.id);
          
          // Marquer les positions inactives
          await this.locationService.markInactiveLocations(org.database_name, org.id);
          
          // Obtenir et diffuser les statistiques
          const stats = await this.locationService.getLocationStats(org.database_name, org.id);
          await this.locationGateway.broadcastLocationStats(stats);
          
          this.logger.log(`Nettoyage hebdomadaire terminé pour ${org.nom}`);
        } catch (error) {
          this.logger.error(`Erreur nettoyage hebdomadaire pour ${org.nom}:`, error);
        }
      }
      
      this.logger.log('Nettoyage hebdomadaire terminé pour toutes les organisations');
    } catch (error) {
      this.logger.error('Erreur lors du nettoyage hebdomadaire:', error);
    }
  }
}