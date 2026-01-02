import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Engin } from '../entities/engin.entity';
import { EnginsController } from './engins.controller';
import { EnginsService } from './engins.service';

@Module({
  imports: [TypeOrmModule.forFeature([Engin])],
  controllers: [EnginsController],
  providers: [EnginsService],
  exports: [EnginsService],
})
export class GestionRessourcesModule {}
