import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';

export interface UserStatsResponse {
  clients: number;
  chauffeur: number;
  administratif: number;
  commercial: number;
  financiers: number;
  exploiteurs: number;
  total_personnel: number;
}

@Controller('stats')
export class StatsController {
  constructor(
    @InjectRepository(Personnel)
    private readonly personnelRepository: Repository<Personnel>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  @Get('users-count')
  async getUsersCount(): Promise<{ success: boolean; data: UserStatsResponse; message: string }> {
    try {
      // Compter les clients actifs uniquement
      const clientsCount = await this.clientRepository.count({
        where: { statut: 'actif' }
      });

      // Compter le personnel par rôle (seulement les actifs)
      const chauffeurCount = await this.personnelRepository.count({
        where: { 
          role: 'chauffeur',
          statut: 'actif'
        }
      });

      const administratifCount = await this.personnelRepository.count({
        where: { 
          role: 'administratif',
          statut: 'actif'
        }
      });

      const commercialCount = await this.personnelRepository.count({
        where: { 
          role: 'commercial',
          statut: 'actif'
        }
      });

      const financiersCount = await this.personnelRepository.count({
        where: { 
          role: 'finance',
          statut: 'actif'
        }
      });

      const exploiteursCount = await this.personnelRepository.count({
        where: { 
          role: 'exploitation',
          statut: 'actif'
        }
      });

      // Compter le total du personnel actif
      const totalPersonnelCount = await this.personnelRepository.count({
        where: { statut: 'actif' }
      });

      // Debug: récupérer tous les rôles distincts
      const allRoles = await this.personnelRepository
        .createQueryBuilder('personnel')
        .select('personnel.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .where('personnel.statut = :statut', { statut: 'actif' })
        .groupBy('personnel.role')
        .getRawMany();

      const stats: UserStatsResponse = {
        clients: clientsCount,
        chauffeur: chauffeurCount,
        administratif: administratifCount,
        commercial: commercialCount,
        financiers: financiersCount,
        exploiteurs: exploiteursCount,
        total_personnel: totalPersonnelCount
      };

      return {
        success: true,
        data: stats,
        message: `Statistiques récupérées avec succès - DEBUG: ${JSON.stringify(allRoles)}`
      };

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
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

  @Get('debug-roles')
  async getDebugRoles(): Promise<{ success: boolean; data: any; message: string }> {
    try {
      // Récupérer tous les rôles distincts avec leur count
      const rolesQuery = await this.personnelRepository
        .createQueryBuilder('personnel')
        .select('personnel.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .where('personnel.statut = :statut', { statut: 'actif' })
        .groupBy('personnel.role')
        .getRawMany();

      return {
        success: true,
        data: rolesQuery,
        message: 'Rôles debug récupérés avec succès'
      };

    } catch (error) {
      console.error('Erreur lors de la récupération des rôles debug:', error);
      return {
        success: false,
        data: [],
        message: 'Erreur lors de la récupération des rôles debug'
      };
    }
  }

  @Get('users-count-detailed')
  async getUsersCountDetailed(): Promise<{ success: boolean; data: any; message: string }> {
    try {
      // Récupérer tous les rôles distincts du personnel actif
      const rolesQuery = await this.personnelRepository
        .createQueryBuilder('personnel')
        .select('personnel.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .where('personnel.statut = :statut', { statut: 'actif' })
        .groupBy('personnel.role')
        .getRawMany();

      // Compter les clients actifs
      const clientsCount = await this.clientRepository.count({
        where: { statut: 'actif' }
      });

      // Compter aussi les clients par statut
      const clientsByStatus = await this.clientRepository
        .createQueryBuilder('client')
        .select('client.statut', 'statut')
        .addSelect('COUNT(*)', 'count')
        .groupBy('client.statut')
        .getRawMany();

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
      console.error('Erreur lors de la récupération des statistiques détaillées:', error);
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