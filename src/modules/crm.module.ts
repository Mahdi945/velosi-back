import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactClientController } from '../controllers/contact-client.controller';
import { ObjectifComController } from '../controllers/objectif-com.controller';
import { SyncController } from '../controllers/sync.controller';
import { StatsController } from '../controllers/stats.controller';
import { ContactClientService } from '../services/contact-client.service';
import { ObjectifComService } from '../services/objectif-com.service';
import { KeycloakSyncService } from '../services/keycloak-sync.service';
import { ContactClient } from '../entities/contact-client.entity';
import { ObjectifCom } from '../entities/objectif-com.entity';
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { LeadModule } from './crm/lead.module';
import { OpportunityModule } from './crm/opportunity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactClient, ObjectifCom, Client, Personnel]),
    LeadModule, // Module pour la gestion des prospects/leads
    OpportunityModule, // Module pour la gestion des opportunités
  ],
  controllers: [ContactClientController, ObjectifComController, SyncController, StatsController],
  providers: [ContactClientService, ObjectifComService, KeycloakSyncService],
  exports: [ContactClientService, ObjectifComService, KeycloakSyncService],
})
export class CrmModule {}
