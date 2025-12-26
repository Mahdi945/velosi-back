import { Injectable, Scope, Inject, Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Repository, DataSource, EntityTarget } from 'typeorm';
import { DatabaseConnectionService } from './database-connection.service';

/**
 * ✅ SERVICE DE BASE MULTI-TENANT
 * 
 * Tous les services de votre application doivent étendre cette classe
 * pour bénéficier automatiquement du multi-tenant.
 * 
 * Usage:
 * ```typescript
 * @Injectable({ scope: Scope.REQUEST })
 * export class MonService extends BaseTenantService {
 *   constructor(
 *     @Inject(REQUEST) request: Request,
 *     dbConnectionService: DatabaseConnectionService
 *   ) {
 *     super(request, dbConnectionService);
 *   }
 * 
 *   async mesClients() {
 *     // ✅ Utilise automatiquement la bonne base de données
 *     const clientRepo = await this.getRepository(Client);
 *     return clientRepo.find();
 *   }
 * }
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class BaseTenantService {
  protected readonly logger: Logger;
  protected databaseName: string;
  protected organisationId: number;
  protected organisationName: string;
  protected connection: DataSource;

  constructor(
    @Inject(REQUEST) protected readonly request: Request & {
      user?: any;
      organisationDatabase?: string;
      organisationId?: number;
      organisationName?: string;
    },
    protected readonly dbConnectionService: DatabaseConnectionService,
  ) {
    this.logger = new Logger(this.constructor.name);
    
    // Extraire les informations multi-tenant depuis la requête
    this.extractTenantInfo();
  }

  /**
   * Extrait les informations de l'organisation depuis la requête
   */
  private extractTenantInfo(): void {
    // Priorité 1: request.organisationDatabase (injecté par MultiTenantInterceptor)
    if (this.request.organisationDatabase) {
      this.databaseName = this.request.organisationDatabase;
      this.organisationId = this.request.organisationId;
      this.organisationName = this.request.organisationName;
      this.logger.debug(
        `🏢 [TENANT-INFO] Depuis interceptor: ${this.organisationName} (DB: ${this.databaseName})`
      );
      return;
    }

    // Priorité 2: request.user (depuis JWT)
    if (this.request.user) {
      const user = this.request.user as any;
      this.databaseName = user.databaseName || 'velosi';
      this.organisationId = user.organisationId || 1;
      this.organisationName = user.organisationName || 'Velosi';
      this.logger.debug(
        `🏢 [TENANT-INFO] Depuis JWT: ${this.organisationName} (DB: ${this.databaseName})`
      );
      return;
    }

    // Fallback: base velosi par défaut (pour les endpoints publics)
    this.databaseName = 'velosi';
    this.organisationId = 1;
    this.organisationName = 'Velosi';
    this.logger.warn(
      `⚠️ [TENANT-INFO] Fallback: Utilisation de la base par défaut (${this.databaseName})`
    );
  }

  /**
   * Obtient la connexion à la base de données de l'organisation
   */
  protected async getConnection(): Promise<DataSource> {
    if (!this.connection || !this.connection.isInitialized) {
      this.connection = await this.dbConnectionService.getOrganisationConnection(
        this.databaseName
      );
    }
    return this.connection;
  }

  /**
   * Obtient un repository TypeORM pour l'entité spécifiée
   * dans la base de données de l'organisation
   * 
   * @param entity - La classe de l'entité (ex: Client, Personnel)
   * @returns Repository<T>
   */
  protected async getRepository<T>(
    entity: EntityTarget<T>
  ): Promise<Repository<T>> {
    const conn = await this.getConnection();
    const repo = conn.getRepository(entity);
    
    this.logger.debug(
      `📦 [REPOSITORY] ${entity.toString()} → ${this.databaseName}`
    );
    
    return repo;
  }

  /**
   * Execute une requête SQL brute sur la base de données de l'organisation
   * 
   * @param query - Requête SQL
   * @param parameters - Paramètres de la requête
   * @returns Résultat de la requête
   */
  protected async query(query: string, parameters?: any[]): Promise<any> {
    const conn = await this.getConnection();
    this.logger.debug(
      `🔍 [SQL] Organisation ${this.databaseName}: ${query.substring(0, 100)}...`
    );
    return conn.query(query, parameters);
  }

  /**
   * Retourne les informations de l'organisation courante
   */
  protected getTenantInfo() {
    return {
      databaseName: this.databaseName,
      organisationId: this.organisationId,
      organisationName: this.organisationName,
    };
  }
}
