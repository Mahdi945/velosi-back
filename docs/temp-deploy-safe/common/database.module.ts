import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConnectionService } from './database-connection.service';
import { TenantRepositoryService } from './tenant-repository.service';
import { BaseTenantService } from './base-tenant.service';
import { Organisation } from '../entities/organisation.entity';
import { SetupToken } from '../entities/setup-token.entity';

/**
 * Module global de gestion des connexions multi-tenant
 * 
 * Fournit DatabaseConnectionService pour obtenir dynamiquement les connexions
 * selon l'organisation de l'utilisateur.
 * 
 * Les services doivent injecter DatabaseConnectionService et obtenir
 * les repositories à la volée avec getOrganisationConnection().
 * 
 * OU étendre BaseTenantService pour bénéficier automatiquement du multi-tenant.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    // TypeORM pour les entités de la base principale (shipnology)
    TypeOrmModule.forFeature([Organisation, SetupToken]),
  ],
  providers: [
    DatabaseConnectionService,
    TenantRepositoryService,
    BaseTenantService,
  ],
  exports: [
    DatabaseConnectionService,
    TenantRepositoryService,
    BaseTenantService,
    TypeOrmModule,
  ],
})
export class DatabaseModule {}
