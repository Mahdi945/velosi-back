import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { KeycloakSyncService } from '../services/keycloak-sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('sync')
export class SyncController {
  constructor(private readonly keycloakSyncService: KeycloakSyncService) {}

  /**
   * Synchroniser le personnel vers Keycloak
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('keycloak/personnel')
  @Roles('administratif', 'admin')
  async syncPersonnel() {
    try {
      await this.keycloakSyncService.syncPersonnelToKeycloak();
      return {
        success: true,
        message: 'Synchronisation personnel vers Keycloak terminée avec succès',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la synchronisation personnel',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Synchroniser les clients vers Keycloak
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('keycloak/clients')
  @Roles('administratif', 'admin')
  async syncClients() {
    try {
      await this.keycloakSyncService.syncClientsToKeycloak();
      return {
        success: true,
        message: 'Synchronisation clients vers Keycloak terminée avec succès',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la synchronisation clients',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Synchronisation complète (personnel + clients)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('keycloak/all')
  @Roles('administratif', 'admin')
  async syncAll() {
    try {
      await this.keycloakSyncService.syncPersonnelToKeycloak();
      await this.keycloakSyncService.syncClientsToKeycloak();
      return {
        success: true,
        message: 'Synchronisation complète vers Keycloak terminée avec succès',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la synchronisation complète',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}