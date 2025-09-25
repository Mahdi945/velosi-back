import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class TokenAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    try {
      console.log('🔐 TokenAuthGuard - Vérification token...');
      
      // Chercher le token dans différents endroits
      let token: string | null = null;
      
      // 1. Header Authorization
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('✅ Token trouvé dans Authorization header');
      }
      
      // 2. Body (pour les requêtes POST/PUT)
      if (!token && request.body && request.body.token) {
        token = request.body.token;
        console.log('✅ Token trouvé dans body');
      }
      
      // 3. Query parameter
      if (!token && request.query && request.query.token) {
        token = request.query.token;
        console.log('✅ Token trouvé dans query');
      }
      
      // 4. Cookies (pour compatibilité avec le frontend)
      if (!token && request.cookies && request.cookies.access_token) {
        token = request.cookies.access_token;
        console.log('✅ Token trouvé dans cookies');
      }
      
      if (!token) {
        console.log('❌ Aucun token trouvé');
        throw new UnauthorizedException('Token d\'authentification requis');
      }

      // Valider le token JWT
      const jwt = require('jsonwebtoken');
      const secret = this.configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
      
      try {
        const decoded = jwt.verify(token, secret);
        console.log('✅ Token JWT valide pour:', decoded.username);
        
        // Vérifier l'expiration
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && currentTime > decoded.exp) {
          console.log('❌ Token expiré');
          throw new UnauthorizedException('Token expiré');
        }
        
        // Si c'est un utilisateur local, récupérer les infos complètes
        if (decoded.userType !== 'keycloak-only' && decoded.sub) {
          try {
            const user = await this.authService.validateJwtPayload(decoded);
            if (user) {
              // Prioriser les rôles Keycloak s'ils sont disponibles
              const finalRole = decoded.keycloak_roles && decoded.keycloak_roles.length > 0 
                ? decoded.keycloak_roles[0] 
                : (user.role || decoded.role);
              
              request.user = {
                id: user.id,
                username: decoded.userType === 'personnel' ? user.nom_utilisateur : user.nom,
                email: user.email,
                userType: decoded.userType,
                role: finalRole,
                keycloak_roles: decoded.keycloak_roles || [],
                keycloak_id: decoded.keycloak_id
              };
              console.log('✅ Utilisateur local validé:', request.user.username, 'Rôle:', request.user.role);
              return true;
            }
          } catch (userError) {
            console.log('⚠️ Erreur validation utilisateur local:', userError.message);
          }
        }
        
        // Pour les utilisateurs Keycloak uniquement ou fallback
        const keycloakRole = decoded.keycloak_roles && decoded.keycloak_roles.length > 0 
          ? decoded.keycloak_roles[0] 
          : decoded.role;
          
        request.user = {
          id: decoded.sub,
          username: decoded.username,
          userType: decoded.userType,
          role: keycloakRole,
          keycloak_roles: decoded.keycloak_roles || [],
          keycloak_id: decoded.keycloak_id
        };
        
        console.log('✅ Utilisateur Keycloak validé:', request.user.username, 'Rôle:', request.user.role);
        return true;
        
      } catch (verifyError) {
        console.log('❌ Erreur validation token JWT:', verifyError.message);
        throw new UnauthorizedException('Token invalide ou expiré');
      }
      
    } catch (error) {
      console.log('❌ TokenAuthGuard - Erreur:', error.message);
      throw new UnauthorizedException(error.message || 'Erreur d\'authentification');
    }
  }
}