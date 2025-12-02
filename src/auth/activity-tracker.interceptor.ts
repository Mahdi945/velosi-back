import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';

/**
 * Intercepteur pour tracker l'activité des utilisateurs
 * Met à jour automatiquement le champ last_activity à chaque requête authentifiée
 */
@Injectable()
export class ActivityTrackerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityTrackerInterceptor.name);

  constructor(
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
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
            
            if (user.userType === 'personnel') {
              await this.personnelRepository.update(user.id, {
                last_activity: now,
              });
              this.logger.debug(`Activité mise à jour pour personnel ${user.username} (ID: ${user.id})`);
            } else if (user.userType === 'client') {
              await this.clientRepository.update(user.id, {
                last_activity: now,
              });
              this.logger.debug(`Activité mise à jour pour client ${user.username} (ID: ${user.id})`);
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
