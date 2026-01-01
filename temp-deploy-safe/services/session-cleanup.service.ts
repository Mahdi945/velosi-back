import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoginHistoryService } from './login-history.service';
import { DatabaseConnectionService } from '../common/database-connection.service';

/**
 * Service de nettoyage automatique des sessions expirées
 * Exécuté toutes les 15 minutes via un cron job
 */
@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(
    private readonly loginHistoryService: LoginHistoryService,
    private readonly databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Cron job exécuté toutes les 15 minutes pour fermer les sessions expirées
   * Pattern cron: Toutes les 15 minutes
   */
  @Cron('*/15 * * * *', {
    name: 'closeExpiredSessions',
    timeZone: 'Europe/Paris',
  })
  async handleExpiredSessions() {
    this.logger.log('⏰ Démarrage du nettoyage des sessions expirées...');
    
    try {
      const organisations = await this.databaseConnectionService.getAllOrganisations();
      let totalClosed = 0;
      
      for (const org of organisations) {
        try {
          const closedCount = await this.loginHistoryService.closeExpiredSessions(org.database_name, org.id);
          totalClosed += closedCount;
          
          if (closedCount > 0) {
            this.logger.log(`✅ ${closedCount} session(s) expirée(s) fermée(s) pour ${org.nom}`);
          }
        } catch (error) {
          this.logger.error(`❌ Erreur nettoyage sessions pour ${org.nom}:`, error);
        }
      }
      
      if (totalClosed > 0) {
        this.logger.log(`✅ Total: ${totalClosed} session(s) expirée(s) fermée(s) automatiquement`);
      } else {
        this.logger.debug('✅ Aucune session expirée trouvée');
      }
    } catch (error) {
      this.logger.error('❌ Erreur lors du nettoyage des sessions:', error);
    }
  }

  /**
   * Exécution manuelle du nettoyage (pour tests ou trigger manuel)
   */
  async triggerManualCleanup(): Promise<number> {
    this.logger.log('🔧 Nettoyage manuel des sessions expirées déclenché');
    
    const organisations = await this.databaseConnectionService.getAllOrganisations();
    let totalClosed = 0;
    
    for (const org of organisations) {
      try {
        const closedCount = await this.loginHistoryService.closeExpiredSessions(org.database_name, org.id);
        totalClosed += closedCount;
      } catch (error) {
        this.logger.error(`Erreur nettoyage manuel pour ${org.nom}:`, error);
      }
    }
    
    return totalClosed;
  }
}
