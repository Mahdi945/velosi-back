import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { MultiTenantAuthService } from './multi-tenant-auth.service';

/**
 * Contrôleur pour l'authentification multi-tenant
 * Route: /api/auth/mt/* (mt = multi-tenant)
 */
@Controller('auth/mt')
export class MultiTenantAuthController {
  constructor(private multiTenantAuthService: MultiTenantAuthService) {}

  /**
   * Login multi-tenant
   * POST /api/auth/mt/login
   * 
   * Recherche l'utilisateur dans toutes les organisations et retourne un JWT
   * avec les informations de l'organisation à laquelle il appartient
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { usernameOrEmail: string; password: string }) {
    return this.multiTenantAuthService.login(
      loginDto.usernameOrEmail,
      loginDto.password
    );
  }

  /**
   * Refresh token
   * POST /api/auth/mt/refresh
   * 
   * Génère un nouveau access token à partir d'un refresh token valide
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: { refresh_token: string }) {
    return this.multiTenantAuthService.refreshAccessToken(refreshDto.refresh_token);
  }

  /**
   * Validation de token
   * POST /api/auth/mt/validate
   * 
   * Vérifie si un token JWT est valide et retourne les informations décodées
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() validateDto: { token: string }) {
    return this.multiTenantAuthService.validateToken(validateDto.token);
  }
}
