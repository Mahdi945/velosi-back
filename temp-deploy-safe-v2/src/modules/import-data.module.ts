import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportDataService } from '../services/import-data.service';
import { ImportDataController } from '../controllers/import-data.controller';
import { Port } from '../entities/port.entity';
import { Aeroport } from '../entities/aeroport.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Port, Aeroport])
  ],
  controllers: [ImportDataController],
  providers: [ImportDataService],
  exports: [ImportDataService],
})
export class ImportDataModule {}
