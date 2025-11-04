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
      console.log('📍 Headers reçus:', Object.keys(request.headers));
      
      // Chercher le token dans différents endroits
      let token: string | null = null;
      
      // 1. Header Authorization (PRIORITÉ 1 - Standard REST API)
      const authHeader = request.headers.authorization || request.headers.Authorization;
      if (authHeader) {
        console.log('📥 Authorization header présent:', authHeader.substring(0, 20) + '...');
        if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
          token = authHeader.substring(7);
          console.log('✅ Token trouvé dans Authorization header');
        } else {
          console.warn('⚠️ Authorization header présent mais format incorrect:', authHeader.substring(0, 30));
        }
      } else {
        console.log('❌ Aucun Authorization header présent');
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
        console.log('❌ Aucun token trouvé dans aucune source');
        console.log('📊 Debug info:');
        console.log('  - Authorization header:', authHeader ? 'Présent' : 'Absent');
        console.log('  - Body token:', request.body?.token ? 'Présent' : 'Absent');
        console.log('  - Query token:', request.query?.token ? 'Présent' : 'Absent');
        console.log('  - Cookie token:', request.cookies?.access_token ? 'Présent' : 'Absent');
        throw new UnauthorizedException('Token d\'authentification requis');
      }

      console.log('🔑 Token reçu (20 premiers car):', token.substring(0, 20) + '...');

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