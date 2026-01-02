import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus,
  ConflictException 
} from '@nestjs/common';
import { EnhancedMultiTenantAuthService } from './enhanced-multi-tenant-auth.service';

/**
 * Contrôleur pour l'authentification multi-tenant ROBUSTE
 * Route: /api/auth/enhanced/* 
 * 
 * Fonctionnalités:
 * - Login intelligent par email (recommandé) ou username
 * - Détection automatique des conflits de username entre organisations
 * - Gestion transparente des bases de données multiples
 */
@Controller('auth/enhanced')
export class EnhancedMultiTenantAuthController {
  constructor(
    private enhancedMultiTenantAuthService: EnhancedMultiTenantAuthService
  ) {}

  /**
   * Login multi-tenant INTELLIGENT
   * POST /api/auth/enhanced/login
   * 
   * Accepte:
   * - Email (recommandé) : unique donc pas de conflit possible
   * - Username : détecte automatiquement les conflits et suggère l'email
   * 
   * Retourne:
   * - JWT avec informations de l'organisation et de l'utilisateur
   * - En cas de conflit, retourne la liste des organisations avec ce username
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { identifier: string; password: string }) {
    try {
      return await this.enhancedMultiTenantAuthService.login(
        loginDto.identifier,
        loginDto.password
      );
    } catch (error) {
      // Gérer spécialement les conflits pour fournir des informations au frontend
      if (error instanceof ConflictException) {
        throw error; // Le frontend affichera un sélecteur d'organisation
      }
      throw error;
    }
  }

  /**
   * Login avec sélection explicite d'organisation
   * POST /api/auth/enhanced/login-with-org
   * 
   * Utilisé quand l'utilisateur a un username en conflit et choisit son organisation
   */
  @Post('login-with-org')
  @HttpCode(HttpStatus.OK)
  async loginWithOrganisation(
    @Body() loginDto: { 
      organisationSlug: string; 
      username: string; 
      password: string 
    }
  ) {
    return await this.enhancedMultiTenantAuthService.loginWithOrganisation(
      loginDto.organisationSlug,
      loginDto.username,
      loginDto.password
    );
  }

  /**
   * Refresh token
   * POST /api/auth/enhanced/refresh
   * 
   * Génère un nouveau access token à partir d'un refresh token valide
   * Maintient la connexion à la même organisation
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: { refresh_token: string }) {
    return await this.enhancedMultiTenantAuthService.refreshAccessToken(
      refreshDto.refresh_token
    );
  }

  /**
   * Test de connexion aux bases de données (debug)
   * POST /api/auth/enhanced/test-connections
   * 
   * Vérifie que toutes les bases d'organisations sont accessibles
   */
  @Post('test-connections')
  @HttpCode(HttpStatus.OK)
  async testConnections() {
    // Cette route devrait être protégée ou désactivée en production
    return { 
      message: 'Endpoint de test - à implémenter pour debug uniquement',
      warning: 'Cette route devrait être protégée en production'
    };
  }
}
