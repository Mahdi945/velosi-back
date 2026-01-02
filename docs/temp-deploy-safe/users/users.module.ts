import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { ObjectifCom } from '../entities/objectif-com.entity';
import { ContactClient } from '../entities/contact-client.entity';
import { AuthModule } from '../auth/auth.module';
import { EmailService } from '../services/email.service';
import { DatabaseModule } from '../common/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Personnel, ObjectifCom, ContactClient]), 
    AuthModule,
    DatabaseModule, // 🏢 Importer DatabaseModule pour TenantRepositoryService
  ],
  providers: [UsersService, EmailService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
