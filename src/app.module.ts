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
import { NaviresModule } from './modules/navires.module';
import { FournisseursModule } from './modules/fournisseurs.module';
import { CorrespondantsModule } from './correspondants/correspondants.module';
import { PortsModule } from './modules/ports.module';
import { AeroportsModule } from './modules/aeroports.module';
import { GestionRessourcesModule } from './gestion-ressources/gestion-ressources.module';
import { FilesModule } from './files/files.module';
import { DiagnosticController } from './controllers/diagnostic.controller';
import { CleanupController } from './controllers/cleanup.controller';
import { StatsController } from './controllers/stats.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { LoginHistoryController } from './controllers/login-history.controller';
import { typeOrmConfig } from './config/database.config';
import { SchedulerService } from './services/scheduler.service';
import { DashboardService } from './services/dashboard.service';
import { LoginHistoryService } from './services/login-history.service';
import { Personnel } from './entities/personnel.entity';
import { Client } from './entities/client.entity';
import { AutorisationTVA } from './entities/autorisation-tva.entity';
import { BCsusTVA } from './entities/bcsus-tva.entity';
import { Lead } from './entities/crm/lead.entity';
import { Opportunity } from './entities/crm/opportunity.entity';
import { Quote } from './crm/entities/quote.entity';
import { ObjectifCom } from './entities/objectif-com.entity';
import { Navire } from './entities/navire.entity';
import { BiometricCredential } from './entities/biometric-credential.entity';
import { LoginHistory } from './entities/login-history.entity';
import { KeycloakService } from './auth/keycloak.service';
import { EmailService } from './services/email.service';
import { PersonnelService } from './services/personnel.service';
import { ContactController } from './contact/contact.controller';
import { LocationModule } from './modules/location.module';
import { VechatModule } from './vechat/vechat.module';
import { ClientTVAModule } from './modules/client-tva.module';
import { ImportDataModule } from './modules/import-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Charger automatiquement le bon fichier selon NODE_ENV
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
      // Fallback sur .env si .env.production n'existe pas
      ignoreEnvFile: false,
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
  NaviresModule,
  FournisseursModule,
  CorrespondantsModule,
  PortsModule,
  AeroportsModule,
  GestionRessourcesModule,
    FilesModule,
    LocationModule, // Module de géolocalisation
    VechatModule, // Module VelosiChat
    ClientTVAModule, // Module de gestion des clients et autorisations TVA
    ImportDataModule, // Module d'importation de données (ports et aéroports)
  TypeOrmModule.forFeature([Personnel, Client, AutorisationTVA, BCsusTVA, Lead, Opportunity, Quote, ObjectifCom, Navire, BiometricCredential, LoginHistory]), // Ajout Navire pour le SchedulerService, StatsController et DashboardService et BiometricCredential pour l'authentification biométrique et LoginHistory pour l'historique de connexion
  ],
  controllers: [AppController, DiagnosticController, CleanupController, StatsController, DashboardController, ContactController, LoginHistoryController],
  providers: [AppService, SchedulerService, DashboardService, KeycloakService, EmailService, PersonnelService, LoginHistoryService],
})
export class AppModule {}
