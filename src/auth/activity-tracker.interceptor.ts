import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DatabaseConnectionService } from '../common/database-connection.service';
import { getDatabaseName, getOrganisationId } from '../common/helpers/multi-tenant.helper';

/**
 * Intercepteur pour tracker l'activité des utilisateurs
 * Met à jour automatiquement le champ last_activity à chaque requête authentifiée
 * ✅ MULTI-TENANT: Utilise DatabaseConnectionService au lieu de Repository
 */
@Injectable()
export class ActivityTrackerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityTrackerInterceptor.name);

  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si l'utilisateur est authentifié, mettre à jour son activité
    if (user && user.id && user.userType) {
      // Utiliser tap pour exécuter après la réponse sans bloquer la requête
      return next.handle().pipe(
        tap(async () => {
          try {
            const now = new Date();
            const databaseName = getDatabaseName(request);
            const organisationId = getOrganisationId(request);
            
            // Obtenir la connexion à la base de l'organisation
            const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
            
            if (user.userType === 'personnel') {
              await connection.query(
                'UPDATE personnel SET last_activity = $1 WHERE id = $2',
                [now, user.id]
              );
              this.logger.debug(`Activité mise à jour pour personnel ${user.username} (ID: ${user.id}) - DB: ${databaseName}`);
            } else if (user.userType === 'client') {
              await connection.query(
                'UPDATE client SET last_activity = $1 WHERE id = $2',
                [now, user.id]
              );
              this.logger.debug(`Activité mise à jour pour client ${user.username} (ID: ${user.id}) - DB: ${databaseName}`);
            }
          } catch (error) {
            // Ne pas faire échouer la requête si la mise à jour de l'activité échoue
            this.logger.warn(`Erreur lors de la mise à jour de l'activité pour ${user.userType} ${user.username}:`, error.message);
          }
        }),
      );
    }

    // Si pas d'utilisateur authentifié, continuer normalement
    return next.handle();
  }
}
