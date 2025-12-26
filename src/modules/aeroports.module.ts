import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aeroport } from '../entities/aeroport.entity';
import { Port } from '../entities/port.entity';
import { AeroportsService } from '../services/aeroports.service';
import { AeroportsController } from '../controllers/aeroports.controller';
import { ImportDataService } from '../services/import-data.service';
import { ImportDataController } from '../controllers/import-data.controller';
import { DatabaseModule } from '../common/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Aeroport, Port]),
    DatabaseModule, // 🏢 Multi-tenant database support
  ],
  controllers: [AeroportsController, ImportDataController],
  providers: [AeroportsService, ImportDataService],
  exports: [AeroportsService, ImportDataService],
})
export class AeroportsModule {}
