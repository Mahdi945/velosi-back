import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DatabaseConnectionService } from '../common/database-connection.service';
import { getDatabaseName } from '../common/helpers/multi-tenant.helper';
import { Request } from 'express';

export interface UserStatsResponse {
  clients: number;
  chauffeur: number;
  administratif: number;
  commercial: number;
  financiers: number;
  exploiteurs: number;
  total_personnel: number;
}

/**
 * ✅ MULTI-TENANT: Contrôleur des statistiques utilisateurs
 * Utilise DatabaseConnectionService pour se connecter à la bonne base de données
 */
@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(
    private readonly databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * ✅ MULTI-TENANT: Obtenir les statistiques utilisateurs
   * Compte le personnel et les clients de l'organisation de l'utilisateur connecté
   */
  @Get('users-count')
  async getUsersCount(@Req() req: Request): Promise<{ success: boolean; data: UserStatsResponse; message: string }> {
    try {
      const databaseName = getDatabaseName(req);
      console.log('🏢 [getUsersCount] Utilisation de la base:', databaseName);
      
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      // Compter les clients actifs uniquement
      const clientsResult = await connection.query(
        `SELECT COUNT(*) as count FROM client WHERE statut = $1`,
        ['actif']
      );
      const clientsCount = parseInt(clientsResult[0]?.count || '0');

      // Compter le personnel par rôle (seulement les actifs)
      const chauffeurResult = await connection.query(
        `SELECT COUNT(*) as count FROM personnel WHERE role = $1 AND statut = $2`,
        ['chauffeur', 'actif']
      );
      const chauffeurCount = parseInt(chauffeurResult[0]?.count || '0');

      const administratifResult = await connection.query(
        `SELECT COUNT(*) as count FROM personnel WHERE role = $1 AND statut = $2`,
        ['administratif', 'actif']
      );
      const administratifCount = parseInt(administratifResult[0]?.count || '0');

      const commercialResult = await connection.query(
        `SELECT COUNT(*) as count FROM personnel WHERE role = $1 AND statut = $2`,
        ['commercial', 'actif']
      );
      const commercialCount = parseInt(commercialResult[0]?.count || '0');

      const financiersResult = await connection.query(
        `SELECT COUNT(*) as count FROM personnel WHERE role = $1 AND statut = $2`,
        ['finance', 'actif']
      );
      const financiersCount = parseInt(financiersResult[0]?.count || '0');

      const exploiteursResult = await connection.query(
        `SELECT COUNT(*) as count FROM personnel WHERE role = $1 AND statut = $2`,
        ['exploitation', 'actif']
      );
      const exploiteursCount = parseInt(exploiteursResult[0]?.count || '0');

      // Compter le total du personnel actif
      const totalPersonnelResult = await connection.query(
        `SELECT COUNT(*) as count FROM personnel WHERE statut = $1`,
        ['actif']
      );
      const totalPersonnelCount = parseInt(totalPersonnelResult[0]?.count || '0');

      // Debug: récupérer tous les rôles distincts
      const allRoles = await connection.query(
        `SELECT role, COUNT(*) as count FROM personnel WHERE statut = $1 GROUP BY role`,
        ['actif']
      );

      const stats: UserStatsResponse = {
        clients: clientsCount,
        chauffeur: chauffeurCount,
        administratif: administratifCount,
        commercial: commercialCount,
        financiers: financiersCount,
        exploiteurs: exploiteursCount,
        total_personnel: totalPersonnelCount
      };

      console.log('✅ [getUsersCount] Stats calculées:', stats);

      return {
        success: true,
        data: stats,
        message: `Statistiques récupérées avec succès - DEBUG: ${JSON.stringify(allRoles)}`
      };

    } catch (error) {
      console.error('❌ [getUsersCount] Erreur lors de la récupération des statistiques:', error);
      return {
        success: false,
        data: {
          clients: 0,
          chauffeur: 0,
          administratif: 0,
          commercial: 0,
          financiers: 0,
          exploiteurs: 0,
          total_personnel: 0
        },
        message: 'Erreur lors de la récupération des statistiques'
      };
    }
  }

  /**
   * ✅ MULTI-TENANT: Debug - Obtenir les rôles distincts
   */
  @Get('debug-roles')
  async getDebugRoles(@Req() req: Request): Promise<{ success: boolean; data: any; message: string }> {
    try {
      const databaseName = getDatabaseName(req);
      console.log('🏢 [getDebugRoles] Utilisation de la base:', databaseName);
      
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      // Récupérer tous les rôles distincts avec leur count
      const rolesQuery = await connection.query(
        `SELECT role, COUNT(*) as count FROM personnel WHERE statut = $1 GROUP BY role`,
        ['actif']
      );

      console.log('✅ [getDebugRoles] Rôles trouvés:', rolesQuery);

      return {
        success: true,
        data: rolesQuery,
        message: 'Rôles debug récupérés avec succès'
      };

    } catch (error) {
      console.error('❌ [getDebugRoles] Erreur lors de la récupération des rôles debug:', error);
      return {
        success: false,
        data: [],
        message: 'Erreur lors de la récupération des rôles debug'
      };
    }
  }

  /**
   * ✅ MULTI-TENANT: Obtenir les statistiques détaillées
   */
  @Get('users-count-detailed')
  async getUsersCountDetailed(@Req() req: Request): Promise<{ success: boolean; data: any; message: string }> {
    try {
      const databaseName = getDatabaseName(req);
      console.log('🏢 [getUsersCountDetailed] Utilisation de la base:', databaseName);
      
      const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
      
      // Récupérer tous les rôles distincts du personnel actif
      const rolesQuery = await connection.query(
        `SELECT role, COUNT(*) as count FROM personnel WHERE statut = $1 GROUP BY role`,
        ['actif']
      );

      // Compter les clients actifs
      const clientsResult = await connection.query(
        `SELECT COUNT(*) as count FROM client WHERE statut = $1`,
        ['actif']
      );
      const clientsCount = parseInt(clientsResult[0]?.count || '0');

      // Compter aussi les clients par statut
      const clientsByStatus = await connection.query(
        `SELECT statut, COUNT(*) as count FROM client GROUP BY statut`
      );

      console.log('✅ [getUsersCountDetailed] Stats détaillées calculées');

      return {
        success: true,
        data: {
          clients_actifs: clientsCount,
          clients_by_status: clientsByStatus,
          personnel_roles: rolesQuery
        },
        message: 'Statistiques détaillées récupérées avec succès'
      };

    } catch (error) {
      console.error('❌ [getUsersCountDetailed] Erreur lors de la récupération des statistiques détaillées:', error);
      return {
        success: false,
        data: { 
          clients_actifs: 0, 
          clients_by_status: [], 
          personnel_roles: [] 
        },
        message: 'Erreur lors de la récupération des statistiques détaillées'
      };
    }
  }
}