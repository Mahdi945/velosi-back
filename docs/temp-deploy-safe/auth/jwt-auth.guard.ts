import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }
  
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // ✅ Vérifier si la route est marquée comme publique
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      console.log('🔓 [JWT Auth Guard] Route publique détectée - Authentification bypassée');
      return true;
    }
    
    console.log('🔐 [JWT Auth Guard] Vérification de l\'authentification');
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const hasCookie = !!request.headers.cookie;
    
    console.log('🔐 [JWT Auth Guard] Headers:', {
      authorization: authHeader ? 'Présent (Bearer ' + authHeader.substring(7, 37) + '...)' : 'Absent',
      cookie: hasCookie ? 'Présent' : 'Absent',
      url: request.url,
      method: request.method
    });
    
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context, status) {
    const request = context.switchToHttp().getRequest();
    
    console.log('🔐 [JWT Auth Guard] Résultat de l\'authentification:', {
      err: err?.message,
      user: user ? { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        tokenInfo: user.tokenInfo 
      } : null,
      info: info?.message || info,
      url: request.url,
      method: request.method
    });

    if (err || !user) {
      // Diagnostic détaillé de l'erreur
      let errorMessage = 'Token invalide ou expiré';
      let errorType = 'UNKNOWN';
      
      if (info?.message === 'No auth token') {
        errorType = 'NO_TOKEN';
        errorMessage = 'Aucun token d\'authentification fourni. Veuillez vous connecter.';
      } else if (info?.message === 'jwt expired') {
        errorType = 'EXPIRED';
        errorMessage = 'Token JWT expiré - veuillez vous reconnecter';
      } else if (info?.message === 'invalid token') {
        errorType = 'INVALID';
        errorMessage = 'Token JWT invalide';
      } else if (info?.message === 'jwt malformed') {
        errorType = 'MALFORMED';
        errorMessage = 'Token JWT malformé';
      } else if (!user && !err) {
        errorType = 'USER_NOT_FOUND';
        errorMessage = 'Utilisateur non trouvé ou inactif';
      }
      
      console.error('❌ [JWT Auth Guard] Échec d\'authentification:', {
        url: request.url,
        method: request.method,
        errorType,
        error: err?.message || errorMessage,
        info: info?.message || info,
        headers: {
          authorization: request.headers.authorization ? 'Présent' : 'Absent',
          cookie: request.headers.cookie ? 'Présent' : 'Absent'
        },
        solution: errorType === 'NO_TOKEN' 
          ? 'Vérifier que le frontend envoie bien le token dans le header Authorization' 
          : 'Vérifier la validité du token'
      });
      
      throw err || new UnauthorizedException({
        message: errorMessage,
        errorType,
        timestamp: new Date().toISOString(),
        path: request.url,
        hint: errorType === 'NO_TOKEN' 
          ? 'Le token doit être envoyé dans le header Authorization avec le format: Bearer <token>'
          : 'Veuillez vous reconnecter pour obtenir un nouveau token'
      });
    }
    
    // Ajouter des informations de debug à la requête
    request.tokenInfo = user.tokenInfo;
    
    // 🏢 CORRECTION MULTI-TENANT: Remplir req.organisationDatabase et req.organisationId
    // pour que getDatabaseName() et getOrganisationId() fonctionnent correctement
    if (user.databaseName) {
      request.organisationDatabase = user.databaseName;
    }
    if (user.organisationId) {
      request.organisationId = user.organisationId;
    }
    
    console.log('✅ [JWT Auth Guard] Authentification réussie pour:', user.username, {
      organisationDatabase: request.organisationDatabase,
      organisationId: request.organisationId
    });
    
    return user;
  }
}
