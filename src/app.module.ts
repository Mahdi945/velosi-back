import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CrmModule } from './modules/crm.module';
import { EnginModule } from './modules/engin.module';
import { ArmateursModule } from './modules/armateurs.module';
import { FournisseursModule } from './modules/fournisseurs.module';
import { GestionRessourcesModule } from './gestion-ressources/gestion-ressources.module';
import { FilesModule } from './files/files.module';
import { DiagnosticController } from './controllers/diagnostic.controller';
import { CleanupController } from './controllers/cleanup.controller';
import { StatsController } from './controllers/stats.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { typeOrmConfig } from './config/database.config';
import { SchedulerService } from './services/scheduler.service';
import { DashboardService } from './services/dashboard.service';
import { Personnel } from './entities/personnel.entity';
import { Client } from './entities/client.entity';
import { AutorisationTVA } from './entities/autorisation-tva.entity';
import { BCsusTVA } from './entities/bcsus-tva.entity';
import { Lead } from './entities/crm/lead.entity';
import { Opportunity } from './entities/crm/opportunity.entity';
import { Quote } from './crm/entities/quote.entity';
import { ObjectifCom } from './entities/objectif-com.entity';
import { KeycloakService } from './auth/keycloak.service';
import { EmailService } from './services/email.service';
import { ContactController } from './contact/contact.controller';
import { LocationModule } from './modules/location.module';
import { VechatModule } from './vechat/vechat.module';
import { ClientTVAModule } from './modules/client-tva.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: typeOrmConfig,
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),

    AuthModule,
    UsersModule,
    CrmModule,
  EnginModule,
  ArmateursModule,
  FournisseursModule,
  GestionRessourcesModule,
    FilesModule,
    LocationModule, // Module de géolocalisation
    VechatModule, // Module VelosiChat
    ClientTVAModule, // Module de gestion des clients et autorisations TVA
    TypeOrmModule.forFeature([Personnel, Client, AutorisationTVA, BCsusTVA, Lead, Opportunity, Quote, ObjectifCom]), // Pour le SchedulerService, StatsController et DashboardService
  ],
  controllers: [AppController, DiagnosticController, CleanupController, StatsController, DashboardController, ContactController],
  providers: [AppService, SchedulerService, DashboardService, KeycloakService, EmailService],
})
export class AppModule {}
