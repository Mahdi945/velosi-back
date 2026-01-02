import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FilesController } from './files.controller';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Personnel, Client]),
    ConfigModule,
  ],
  controllers: [FilesController],
})
export class FilesModule {}