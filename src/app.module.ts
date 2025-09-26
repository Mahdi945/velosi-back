import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CrmModule } from './modules/crm.module';
import { FilesModule } from './files/files.module';
import { DiagnosticController } from './controllers/diagnostic.controller';
import { CleanupController } from './controllers/cleanup.controller';
import { StatsController } from './controllers/stats.controller';
import { typeOrmConfig } from './config/database.config';
import { SchedulerService } from './services/scheduler.service';
import { Personnel } from './entities/personnel.entity';
import { Client } from './entities/client.entity';
import { KeycloakService } from './auth/keycloak.service';
import { EmailService } from './services/email.service';

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

    AuthModule,
    UsersModule,
    CrmModule,
    FilesModule,
    TypeOrmModule.forFeature([Personnel, Client]), // Pour le SchedulerService et StatsController
  ],
  controllers: [AppController, DiagnosticController, CleanupController, StatsController],
  providers: [AppService, SchedulerService, KeycloakService, EmailService],
})
export class AppModule {}
