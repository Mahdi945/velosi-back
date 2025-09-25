import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    console.log('JWT Auth Guard - Vérification de l\'authentification');
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    console.log('JWT Auth Guard - Header Authorization:', authHeader ? 'Présent' : 'Absent');
    
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context, status) {
    const request = context.switchToHttp().getRequest();
    
    console.log('JWT Auth Guard - Résultat de l\'authentification:', {
      err: err?.message,
      user: user ? { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        tokenInfo: user.tokenInfo 
      } : null,
      info: info?.message || info,
      url: request.url
    });

    if (err || !user) {
      // Diagnostic détaillé de l'erreur
      let errorMessage = 'Token invalide ou expiré';
      let errorType = 'UNKNOWN';
      
      if (info?.message === 'jwt expired') {
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
      
      console.error('JWT Auth Guard - Échec d\'authentification:', {
        url: request.url,
        method: request.method,
        errorType,
        error: err?.message || errorMessage,
        info: info?.message || info,
        headers: {
          authorization: request.headers.authorization ? 'Présent' : 'Absent',
          cookie: request.headers.cookie ? 'Présent' : 'Absent'
        }
      });
      
      throw err || new UnauthorizedException({
        message: errorMessage,
        errorType,
        timestamp: new Date().toISOString(),
        path: request.url
      });
    }
    
    // Ajouter des informations de debug à la requête
    request.tokenInfo = user.tokenInfo;
    
    return user;
  }
}
