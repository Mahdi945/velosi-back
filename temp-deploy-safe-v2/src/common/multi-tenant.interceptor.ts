import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

/**
 * Intercepteur Multi-Tenant
 * 
 * Intercepte toutes les requêtes HTTP et extrait l'information de l'organisation
 * depuis le header X-Organisation-Database ou depuis le JWT.
 * 
 * Stocke cette information dans req.organisationDatabase pour utilisation
 * ultérieure par les services.
 */
@Injectable()
export class MultiTenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MultiTenantInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // ✅ Vérifier si la route est publique (pas besoin d'organisation)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      this.logger.debug('🔓 Route publique détectée - Skip extraction organisation');
      return next.handle();
    }
    
    const request = context.switchToHttp().getRequest<Request & { organisationDatabase?: string; organisationId?: number }>();
    
    // 1. Essayer de récupérer depuis le header personnalisé
    const headerDatabase = request.headers['x-organisation-database'] as string;
    
    if (headerDatabase) {
      request.organisationDatabase = headerDatabase;
      this.logger.debug(`Organisation détectée depuis header: ${headerDatabase}`);
    } else {
      // 2. Essayer de décoder le JWT AVANT la validation pour extraire l'organisation
      const authHeader = request.headers.authorization;
      let tokenDecoded = false;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded: any = jwt.decode(token);
          
          if (decoded && decoded.databaseName) {
            request.organisationDatabase = decoded.databaseName;
            request.organisationId = decoded.organisationId;
            this.logger.debug(`🏢 Organisation extraite du JWT: ${decoded.databaseName} (ID: ${decoded.organisationId})`);
            tokenDecoded = true;
          }
        } catch (error) {
          this.logger.warn(`Impossible de décoder le JWT: ${error.message}`);
        }
      }
      
      // 3. Essayer depuis les cookies si pas de header
      if (!tokenDecoded && request.cookies) {
        const cookieToken = request.cookies.access_token || 
                          Object.keys(request.cookies).find(key => key.startsWith('access_token_'));
        
        if (cookieToken) {
          try {
            const token = typeof cookieToken === 'string' ? cookieToken : request.cookies[cookieToken];
            const decoded: any = jwt.decode(token);
            
            if (decoded && decoded.databaseName) {
              request.organisationDatabase = decoded.databaseName;
              request.organisationId = decoded.organisationId;
              this.logger.debug(`🏢 Organisation extraite du cookie JWT: ${decoded.databaseName} (ID: ${decoded.organisationId})`);
              tokenDecoded = true;
            }
          } catch (error) {
            this.logger.warn(`Impossible de décoder le JWT du cookie: ${error.message}`);
          }
        }
      }
      
      // 4. Vérifier si request.user existe déjà (après validation)
      if (!tokenDecoded) {
        const user = request.user as any;
        if (user && user.databaseName) {
          request.organisationDatabase = user.databaseName;
          request.organisationId = user.organisationId;
          this.logger.debug(`Organisation détectée depuis request.user: ${user.databaseName}`);
          tokenDecoded = true;
        }
      }
      
      // 5. ⛔ SÉCURITÉ CRITIQUE: Ne JAMAIS utiliser de base par défaut
      // Si aucune organisation n'est trouvée, la requête sera rejetée par le JwtAuthGuard
      if (!tokenDecoded) {
        this.logger.warn(`⚠️ AUCUNE ORGANISATION DÉTECTÉE - La requête sera rejetée par le guard`);
        // Ne PAS définir request.organisationDatabase
        // Le JwtAuthGuard rejettera la requête avec 401
      }
    }

    // Continuer le traitement de la requête
    return next.handle();
  }
}
