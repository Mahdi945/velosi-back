import { Injectable, Scope, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { LoginHistory, UserType, LoginStatus, LoginMethod } from '../entities/login-history.entity';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';
import { Request } from 'express';
import { LoginHistoryGateway } from '../gateway/login-history.gateway';
import { DatabaseConnectionService } from '../common/database-connection.service';

/**
 * DTO pour créer une entrée d'historique de connexion
 */
export interface CreateLoginHistoryDto {
  userId: number;
  userType: UserType;
  username?: string;
  fullName?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  deviceName?: string;
  osName?: string;
  osVersion?: string;
  browserName?: string;
  browserVersion?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  loginMethod?: LoginMethod;
  status?: LoginStatus;
  failureReason?: string;
}

/**
 * Interface pour les options de pagination
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  status?: LoginStatus;
  loginMethod?: LoginMethod;
}

/**
 * Interface pour la réponse paginée
 */
export interface PaginatedLoginHistory {
  data: LoginHistory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class LoginHistoryService {
  private readonly logger = new Logger(LoginHistoryService.name);

  constructor(
    private readonly databaseConnectionService: DatabaseConnectionService,
    @Inject(forwardRef(() => LoginHistoryGateway))
    private loginHistoryGateway: LoginHistoryGateway,
  ) {}

  /**
   * Obtenir les repositories dynamiques pour une base de données
   */
  private async getRepositories(databaseName: string) {
    const dataSource = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    return {
      loginHistoryRepository: dataSource.getRepository(LoginHistory),
      personnelRepository: dataSource.getRepository(Personnel),
      clientRepository: dataSource.getRepository(Client),
    };
  }

  /**
   * Enregistrer une nouvelle connexion
   */
  async createLoginEntry(
    dto: CreateLoginHistoryDto,
    databaseName: string,
    organisationId: number,
  ): Promise<LoginHistory> {
    console.log(`🏢 [createLoginEntry] DB: ${databaseName}, Org: ${organisationId}`);
    try {
      const { loginHistoryRepository } = await this.getRepositories(databaseName);
      const loginEntry = loginHistoryRepository.create({
        user_id: dto.userId,
        user_type: dto.userType,
        username: dto.username,
        full_name: dto.fullName,
        ip_address: dto.ipAddress,
        user_agent: dto.userAgent,
        device_type: dto.deviceType,
        device_name: dto.deviceName,
        os_name: dto.osName,
        os_version: dto.osVersion,
        browser_name: dto.browserName,
        browser_version: dto.browserVersion,
        latitude: dto.latitude,
        longitude: dto.longitude,
        city: dto.city,
        country: dto.country,
        login_method: dto.loginMethod || LoginMethod.PASSWORD,
        status: dto.status || LoginStatus.SUCCESS,
        failure_reason: dto.failureReason,
        login_time: new Date(),
      });

      const saved = await loginHistoryRepository.save(loginEntry);
      
      this.logger.log(`✅ Connexion enregistrée: ${dto.userType} #${dto.userId} (${dto.username})`);
      
      // 🔥 Diffuser la nouvelle connexion via WebSocket
      if (this.loginHistoryGateway) {
        try {
          this.loginHistoryGateway.broadcastNewLogin(saved);
        } catch (error) {
          this.logger.warn('⚠️ Erreur lors de la diffusion WebSocket:', error.message);
        }
      }
      
      return saved;
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'enregistrement de la connexion:`, error);
      throw error;
    }
  }

  /**
   * Enregistrer une déconnexion
   */
  async recordLogout(
    loginHistoryId: number,
    databaseName: string,
    organisationId: number,
  ): Promise<LoginHistory> {
    console.log(`🏢 [recordLogout] DB: ${databaseName}, Org: ${organisationId}`);
    try {
      const { loginHistoryRepository } = await this.getRepositories(databaseName);
      const loginEntry = await loginHistoryRepository.findOne({
        where: { id: loginHistoryId },
      });

      if (!loginEntry) {
        throw new NotFoundException(`Entrée d'historique #${loginHistoryId} introuvable`);
      }

      loginEntry.logout_time = new Date();
      loginEntry.session_duration = loginEntry.calculateSessionDuration();

      const updated = await loginHistoryRepository.save(loginEntry);
      
      this.logger.log(`✅ Déconnexion enregistrée: ${loginEntry.user_type} #${loginEntry.user_id} - Durée: ${updated.getFormattedDuration()}`);
      
      // 🔥 Diffuser la déconnexion via WebSocket
      if (this.loginHistoryGateway) {
        try {
          this.loginHistoryGateway.broadcastNewLogout(updated);
        } catch (error) {
          this.logger.warn('⚠️ Erreur lors de la diffusion WebSocket:', error.message);
        }
      }
      
      return updated;
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'enregistrement de la déconnexion:`, error);
      throw error;
    }
  }

  /**
   * Récupérer l'historique de connexion d'un utilisateur avec pagination
   */
  async getUserLoginHistory(
    userId: number,
    userType: UserType,
    options: PaginationOptions = {},
    databaseName: string,
    organisationId: number,
  ): Promise<PaginatedLoginHistory> {
    console.log(`🏢 [getUserLoginHistory] DB: ${databaseName}, Org: ${organisationId}`);
    try {
      const { loginHistoryRepository } = await this.getRepositories(databaseName);
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      // Log pour déboguer les filtres reçus
      this.logger.log(`📅 Récupération historique pour ${userType} #${userId}:`, {
        startDate: options.startDate?.toISOString(),
        endDate: options.endDate?.toISOString(),
        page,
        limit
      });

      const queryBuilder = loginHistoryRepository
        .createQueryBuilder('lh')
        .where('lh.user_id = :userId', { userId })
        .andWhere('lh.user_type = :userType', { userType });

      // Filtres optionnels
      if (options.startDate) {
        queryBuilder.andWhere('lh.login_time >= :startDate', { startDate: options.startDate });
        this.logger.log(`✅ Filtre startDate appliqué: ${options.startDate.toISOString()}`);
      }
      if (options.endDate) {
        queryBuilder.andWhere('lh.login_time <= :endDate', { endDate: options.endDate });
        this.logger.log(`✅ Filtre endDate appliqué: ${options.endDate.toISOString()}`);
      }
      if (options.status) {
        queryBuilder.andWhere('lh.status = :status', { status: options.status });
      }
      if (options.loginMethod) {
        queryBuilder.andWhere('lh.login_method = :loginMethod', { loginMethod: options.loginMethod });
      }

      // Pagination et tri
      queryBuilder
        .orderBy('lh.login_time', 'DESC')
        .skip(skip)
        .take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      this.logger.log(`✅ Historique récupéré: ${data.length} entrées sur ${total} total`);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`❌ Erreur lors de la récupération de l'historique:`, error);
      throw error;
    }
  }

  /**
   * Récupérer la dernière connexion d'un utilisateur
   */
  async getLastLogin(
    userId: number,
    userType: UserType,
    databaseName: string,
    organisationId: number,
  ): Promise<LoginHistory | null> {
    console.log(`🏢 [getLastLogin] DB: ${databaseName}, Org: ${organisationId}`);
    const { loginHistoryRepository } = await this.getRepositories(databaseName);
    return await loginHistoryRepository.findOne({
      where: { user_id: userId, user_type: userType, status: LoginStatus.SUCCESS },
      order: { login_time: 'DESC' },
    });
  }

  /**
   * Récupérer les connexions actives d'un utilisateur
   */
  async getActiveSessions(
    userId: number,
    userType: UserType,
    databaseName: string,
    organisationId: number,
  ): Promise<LoginHistory[]> {
    console.log(`🏢 [getActiveSessions] DB: ${databaseName}, Org: ${organisationId}`);
    const { loginHistoryRepository } = await this.getRepositories(databaseName);
    return await loginHistoryRepository.find({
      where: { 
        user_id: userId, 
        user_type: userType,
        logout_time: null,
      },
      order: { login_time: 'DESC' },
    });
  }

  /**
   * Compter le nombre de tentatives échouées récentes
   */
  async countRecentFailedAttempts(
    userId: number,
    userType: UserType,
    minutesAgo: number = 15,
    databaseName: string,
    organisationId: number,
  ): Promise<number> {
    console.log(`🏢 [countRecentFailedAttempts] DB: ${databaseName}, Org: ${organisationId}`);
    const { loginHistoryRepository } = await this.getRepositories(databaseName);
    const since = new Date(Date.now() - minutesAgo * 60 * 1000);
    
    return await loginHistoryRepository.count({
      where: {
        user_id: userId,
        user_type: userType,
        status: LoginStatus.FAILED,
        login_time: MoreThanOrEqual(since),
      },
    });
  }

  /**
   * Extraire les informations de l'appareil depuis le User-Agent
   */
  parseUserAgent(userAgent: string): {
    deviceType: string;
    osName: string;
    osVersion: string;
    browserName: string;
    browserVersion: string;
  } {
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    
    let deviceType = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';

    // Détecter le navigateur
    let browserName = 'Unknown';
    let browserVersion = '';
    
    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] || '';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || '';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || '';
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge';
      browserVersion = userAgent.match(/Edge\/(\d+\.\d+)/)?.[1] || '';
    }

    // Détecter l'OS
    let osName = 'Unknown';
    let osVersion = '';

    if (userAgent.includes('Windows')) {
      osName = 'Windows';
      osVersion = userAgent.match(/Windows NT (\d+\.\d+)/)?.[1] || '';
    } else if (userAgent.includes('Mac OS')) {
      osName = 'macOS';
      osVersion = userAgent.match(/Mac OS X (\d+[._]\d+[._]\d+)/)?.[1]?.replace(/_/g, '.') || '';
    } else if (userAgent.includes('Linux')) {
      osName = 'Linux';
    } else if (userAgent.includes('Android')) {
      osName = 'Android';
      osVersion = userAgent.match(/Android (\d+\.\d+)/)?.[1] || '';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      osName = 'iOS';
      osVersion = userAgent.match(/OS (\d+[._]\d+)/)?.[1]?.replace(/_/g, '.') || '';
    }

    return {
      deviceType,
      osName,
      osVersion,
      browserName,
      browserVersion,
    };
  }

  /**
   * Extraire l'adresse IP d'une requête Express
   */
  getIpAddress(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'Unknown'
    );
  }

  /**
   * Créer une entrée d'historique depuis une requête Express
   */
  async createLoginFromRequest(
    req: Request,
    userId: number,
    userType: UserType,
    username: string,
    fullName: string,
    loginMethod: LoginMethod = LoginMethod.PASSWORD,
    status: LoginStatus = LoginStatus.SUCCESS,
    failureReason: string | undefined,
    databaseName: string,
    organisationId: number,
  ): Promise<LoginHistory> {
    console.log(`🏢 [createLoginFromRequest] DB: ${databaseName}, Org: ${organisationId}`);
    const { personnelRepository } = await this.getRepositories(databaseName);
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = this.getIpAddress(req);
    const deviceInfo = this.parseUserAgent(userAgent);

    // 🗺️ Récupérer la position GPS si disponible (pour le personnel uniquement)
    let latitude: number | undefined;
    let longitude: number | undefined;
    let city: string | undefined;
    let country: string | undefined;

    if (userType === UserType.PERSONNEL) {
      try {
        const personnel = await personnelRepository.findOne({
          where: { id: userId },
          select: ['latitude', 'longitude', 'location_tracking_enabled', 'is_location_active']
        });

        if (personnel && personnel.location_tracking_enabled && personnel.latitude && personnel.longitude) {
          latitude = personnel.latitude;
          longitude = personnel.longitude;
          this.logger.log(`📍 Position GPS récupérée pour ${username}: ${latitude}, ${longitude}`);
          
          // On pourrait aussi faire une requête de géocodage inverse pour obtenir ville/pays
          // mais pour l'instant on laisse null
        }
      } catch (error) {
        this.logger.warn(`⚠️ Erreur lors de la récupération de la position GPS:`, error);
        // Ne pas bloquer la connexion si la position échoue
      }
    }

    return await this.createLoginEntry({
      userId,
      userType,
      username,
      fullName,
      ipAddress,
      userAgent,
      deviceType: deviceInfo.deviceType,
      osName: deviceInfo.osName,
      osVersion: deviceInfo.osVersion,
      browserName: deviceInfo.browserName,
      browserVersion: deviceInfo.browserVersion,
      latitude,
      longitude,
      city,
      country,
      loginMethod,
      status,
      failureReason,
    }, databaseName, organisationId);
  }

  /**
   * Obtenir des statistiques de connexion
   */
  async getLoginStatistics(
    userId: number,
    userType: UserType,
    databaseName: string,
    organisationId: number,
  ): Promise<{
    totalLogins: number;
    successfulLogins: number;
    failedLogins: number;
    averageSessionDuration: number;
    lastLogin: Date | null;
    mostUsedDevice: string | null;
    mostUsedBrowser: string | null;
  }> {
    console.log(`🏢 [getLoginStatistics] DB: ${databaseName}, Org: ${organisationId}`);
    const { loginHistoryRepository } = await this.getRepositories(databaseName);
    const history = await loginHistoryRepository.find({
      where: { user_id: userId, user_type: userType },
    });

    const totalLogins = history.length;
    const successfulLogins = history.filter(h => h.status === LoginStatus.SUCCESS).length;
    const failedLogins = history.filter(h => h.status === LoginStatus.FAILED).length;

    const sessionsWithDuration = history.filter(h => h.session_duration !== null);
    const averageSessionDuration = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, h) => sum + (h.session_duration || 0), 0) / sessionsWithDuration.length
      : 0;

    const lastLoginEntry = history.find(h => h.status === LoginStatus.SUCCESS);
    const lastLogin = lastLoginEntry?.login_time || null;

    // Device le plus utilisé
    const deviceCounts = history.reduce((acc, h) => {
      if (h.device_type) {
        acc[h.device_type] = (acc[h.device_type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    const mostUsedDevice = Object.keys(deviceCounts).sort((a, b) => deviceCounts[b] - deviceCounts[a])[0] || null;

    // Navigateur le plus utilisé
    const browserCounts = history.reduce((acc, h) => {
      if (h.browser_name) {
        acc[h.browser_name] = (acc[h.browser_name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    const mostUsedBrowser = Object.keys(browserCounts).sort((a, b) => browserCounts[b] - browserCounts[a])[0] || null;

    return {
      totalLogins,
      successfulLogins,
      failedLogins,
      averageSessionDuration: Math.round(averageSessionDuration),
      lastLogin,
      mostUsedDevice,
      mostUsedBrowser,
    };
  }

  /**
   * Fermer automatiquement les sessions expirées (8 heures)
   * À appeler régulièrement via un cron job ou scheduler
   */
  async closeExpiredSessions(
    databaseName: string,
    organisationId: number,
  ): Promise<number> {
    console.log(`🏢 [closeExpiredSessions] DB: ${databaseName}, Org: ${organisationId}`);
    try {
      const { loginHistoryRepository } = await this.getRepositories(databaseName);
      const sessionDuration = 8 * 60 * 60 * 1000; // 8 heures en millisecondes
      const expirationTime = new Date(Date.now() - sessionDuration);

      // Trouver toutes les sessions actives (sans logout_time) qui ont dépassé 8 heures
      const expiredSessions = await loginHistoryRepository
        .createQueryBuilder('lh')
        .where('lh.logout_time IS NULL')
        .andWhere('lh.login_time < :expirationTime', { expirationTime })
        .getMany();

      if (expiredSessions.length === 0) {
        this.logger.debug('Aucune session expirée à fermer');
        return 0;
      }

      this.logger.log(`🔴 Fermeture automatique de ${expiredSessions.length} session(s) expirée(s)`);

      // Fermer chaque session expirée
      for (const session of expiredSessions) {
        // Calculer le logout_time comme étant login_time + 8 heures
        const autoLogoutTime = new Date(session.login_time.getTime() + sessionDuration);
        
        session.logout_time = autoLogoutTime;
        session.session_duration = Math.floor(sessionDuration / 1000); // 8 heures en secondes (28800 secondes)
        
        await loginHistoryRepository.save(session);
        
        this.logger.log(`✅ Session #${session.id} fermée automatiquement (User: ${session.user_type} #${session.user_id})`);
        
        // Diffuser la déconnexion automatique via WebSocket
        if (this.loginHistoryGateway) {
          try {
            this.loginHistoryGateway.broadcastNewLogout(session);
          } catch (error) {
            this.logger.warn('⚠️ Erreur diffusion WebSocket logout auto:', error.message);
          }
        }
      }

      return expiredSessions.length;
    } catch (error) {
      this.logger.error('❌ Erreur lors de la fermeture des sessions expirées:', error);
      throw error;
    }
  }
}
