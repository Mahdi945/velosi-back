import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoginHistoryService } from './login-history.service';

/**
 * Service de nettoyage automatique des sessions expirées
 * Exécuté toutes les 15 minutes via un cron job
 */
@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private readonly loginHistoryService: LoginHistoryService) {}

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
      const closedCount = await this.loginHistoryService.closeExpiredSessions();
      
      if (closedCount > 0) {
        this.logger.log(`✅ ${closedCount} session(s) expirée(s) fermée(s) automatiquement`);
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
    return await this.loginHistoryService.closeExpiredSessions();
  }
}
