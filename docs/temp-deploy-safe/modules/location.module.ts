import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Personnel } from '../entities/personnel.entity';
import { LocationService } from '../services/location.service';
import { LocationController } from '../controllers/location.controller';
import { LocationGateway } from '../gateway/location.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Personnel]),
    // ScheduleModule.forRoot() est déjà appelé dans AppModule - ne pas le dupliquer
  ],
  controllers: [LocationController],
  providers: [
    LocationService,
    LocationGateway,
    // LocationSchedulerService déplacé vers AppModule pour les cron jobs
  ],
  exports: [
    LocationService,
    LocationGateway,
  ],
})
export class LocationModule {}