import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { KeycloakService } from '../auth/keycloak.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Controller('api/diagnostic')
@UseGuards(JwtAuthGuard)
export class DiagnosticController {
  constructor(
    private authService: AuthService,
    private keycloakService: KeycloakService,
    private configService: ConfigService,
  ) {}

  @Get('auth-status')
  async getAuthStatus() {
    const currentTime = new Date();
    const jwtConfig = {
      secret: this.configService.get('JWT_SECRET') ? 'Configuré' : 'Non configuré',
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || 'Valeur par défaut',
      refreshExpiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || 'Valeur par défaut',
    };

    const keycloakConfig = {
      url: this.configService.get('KEYCLOAK_URL') || 'Non configuré',
      realm: this.configService.get('KEYCLOAK_REALM') || 'Non configuré',
      clientId: this.configService.get('KEYCLOAK_CLIENT_ID') || 'Non configuré',
      clientSecret: this.configService.get('KEYCLOAK_CLIENT_SECRET') ? 'Configuré' : 'Non configuré',
    };

    let keycloakStatus = 'Non testé';
    try {
      const isKeycloakConnected = await this.keycloakService.checkConnection();
      keycloakStatus = isKeycloakConnected ? 'Connecté' : 'Déconnecté';
    } catch (error) {
      keycloakStatus = `Erreur: ${error.message}`;
    }

    return {
      timestamp: currentTime.toISOString(),
      status: 'OK',
      jwt: jwtConfig,
      keycloak: {
        ...keycloakConfig,
        status: keycloakStatus,
      },
      environment: {
        nodeEnv: this.configService.get('NODE_ENV') || 'development',
        port: this.configService.get('PORT') || 3000,
      },
    };
  }

  @Get('token-info')
  async getTokenInfo() {
    // Ce endpoint permettra de déboguer les informations du token
    return {
      message: 'Informations du token disponibles dans les logs du serveur',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('force-logout-all')
  async forceLogoutAll() {
    // Endpoint pour forcer la déconnexion de tous les utilisateurs
    // Cela invalidera tous les tokens existants en changeant le secret temporairement
    return {
      message: 'Tous les utilisateurs doivent se reconnecter avec les nouveaux tokens',
      timestamp: new Date().toISOString(),
      action: 'Veuillez vider le cache du navigateur et vous reconnecter',
    };
  }

  @Get('debug-tokens')
  async debugTokens(@Req() request: any) {
    // Endpoint pour déboguer les tokens reçus
    const cookieToken = request.cookies?.access_token;
    const headerToken = request.headers?.authorization?.replace('Bearer ', '');
    
    console.log('🔍 DEBUG TOKENS - Analyse complète:');
    console.log('Cookies disponibles:', Object.keys(request.cookies || {}));
    console.log('Headers d\'autorisation:', request.headers?.authorization ? 'Présent' : 'Absent');
    
    let cookiePayload = null;
    let headerPayload = null;
    
    try {
      if (cookieToken) {
        const jwt = require('jsonwebtoken');
        cookiePayload = jwt.decode(cookieToken);
        console.log('Token cookie décodé:', cookiePayload);
      }
    } catch (e) {
      console.error('Erreur décodage token cookie:', e.message);
    }
    
    try {
      if (headerToken) {
        const jwt = require('jsonwebtoken');
        headerPayload = jwt.decode(headerToken);
        console.log('Token header décodé:', headerPayload);
      }
    } catch (e) {
      console.error('Erreur décodage token header:', e.message);
    }
    
    return {
      timestamp: new Date().toISOString(),
      tokens: {
        cookie: {
          present: !!cookieToken,
          preview: cookieToken ? cookieToken.substring(0, 50) + '...' : null,
          payload: cookiePayload
        },
        header: {
          present: !!headerToken,
          preview: headerToken ? headerToken.substring(0, 50) + '...' : null,
          payload: headerPayload
        }
      },
      analysis: {
        tokensMatch: cookieToken === headerToken,
        cookieUser: cookiePayload?.username || 'N/A',
        headerUser: headerPayload?.username || 'N/A',
        cookieRole: cookiePayload?.role || 'N/A',
        headerRole: headerPayload?.role || 'N/A'
      }
    };
  }
}