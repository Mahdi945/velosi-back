import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { KeycloakSyncService } from '../services/keycloak-sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('sync')
export class SyncController {
  constructor(private readonly keycloakSyncService: KeycloakSyncService) {}

  // Route publique pour synchronisation interne (sans authentification)
  @Post('internal/keycloak/:userType/:userId')
  async syncSingleUserInternal(
    @Param('userType') userType: 'personnel' | 'client',
    @Param('userId') userId: number,
  ) {
    try {
      const success = await this.keycloakSyncService.syncSingleUserToKeycloak(
        userType,
        userId,
      );
      return {
        success,
        message: success
          ? 'Utilisateur synchronisé avec succès'
          : 'Échec de la synchronisation',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la synchronisation',
        error: error.message,
      };
    }
  }

  // Routes avec authentification pour les appels externes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('keycloak/all')
  @Roles('admin', 'personnel')
  async syncAllUsers() {
    try {
      await this.keycloakSyncService.syncAllUsersToKeycloak();
      return {
        success: true,
        message: 'Synchronisation complète vers Keycloak terminée avec succès',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la synchronisation',
        error: error.message,
      };
    }
  }

  @Post('keycloak/personnel')
  @Roles('admin', 'personnel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async syncPersonnel() {
    try {
      await this.keycloakSyncService.syncPersonnelToKeycloak();
      return {
        success: true,
        message: 'Synchronisation du personnel vers Keycloak terminée avec succès',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la synchronisation du personnel',
        error: error.message,
      };
    }
  }

  @Post('keycloak/clients')
  @Roles('admin', 'personnel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async syncClients() {
    try {
      await this.keycloakSyncService.syncClientsToKeycloak();
      return {
        success: true,
        message: 'Synchronisation des clients vers Keycloak terminée avec succès',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la synchronisation des clients',
        error: error.message,
      };
    }
  }

  @Post('keycloak/:userType/:userId')
  @Roles('admin', 'personnel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async syncSingleUser(
    @Param('userType') userType: 'personnel' | 'client',
    @Param('userId') userId: number,
  ) {
    try {
      const success = await this.keycloakSyncService.syncSingleUserToKeycloak(
        userType,
        userId,
      );
      return {
        success,
        message: success
          ? 'Utilisateur synchronisé avec succès'
          : 'Échec de la synchronisation',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la synchronisation',
        error: error.message,
      };
    }
  }
}
