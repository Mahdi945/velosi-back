import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminMsp } from './entities/admin-msp.entity';
import { Organisation } from './entities/organisation.entity';
import { SetupToken } from './entities/setup-token.entity';
import { AdminAuthService } from './admin-auth.service';
import { OrganisationsService } from './organisations.service';
import { EmailSetupService } from './email-setup.service';
import { AdminMspCrudService } from './admin-msp-crud.service';
import { AdminAuthController } from './admin-auth.controller';
import { OrganisationsController } from './organisations.controller';
import { AdminMspCrudController } from './admin-msp-crud.controller';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { EmailService } from '../services/email.service';
import { DatabaseConnectionService } from '../common/database-connection.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminMsp, Organisation, SetupToken], 'shipnology'),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure',
        signOptions: { 
          expiresIn: '8h', // Session limitée à 8 heures comme les utilisateurs normaux
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminAuthController, OrganisationsController, AdminMspCrudController],
  providers: [
    AdminAuthService, 
    OrganisationsService, 
    EmailSetupService, 
    EmailService,
    DatabaseConnectionService,
    AdminMspCrudService, 
    AdminJwtStrategy
  ],
  exports: [AdminAuthService, OrganisationsService, EmailSetupService, AdminMspCrudService],
})
export class AdminMspModule {}
