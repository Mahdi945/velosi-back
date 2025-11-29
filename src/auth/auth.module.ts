import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { KeycloakService } from './keycloak.service';
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { ContactClient } from '../entities/contact-client.entity';
import { ObjectifCom } from '../entities/objectif-com.entity';
import { BiometricCredential } from '../entities/biometric-credential.entity';
import { ContactClientService } from '../services/contact-client.service';
import { EmailService } from '../services/email.service';
import { OtpService } from '../services/otp.service';
import { BiometricService } from './biometric.service';
import { BiometricController } from './biometric.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Personnel, ContactClient, ObjectifCom, BiometricCredential]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'velosi-secret-key-2024',
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '24h',
          issuer: 'velosi-erp',
          audience: 'velosi-users',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, KeycloakService, LocalStrategy, JwtStrategy, ContactClientService, EmailService, OtpService, BiometricService],
  controllers: [AuthController, BiometricController],
  exports: [AuthService, KeycloakService, JwtModule, BiometricService],
})
export class AuthModule {}
