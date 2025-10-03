import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Personnel } from '../entities/personnel.entity';
import { LocationService } from '../services/location.service';
import { LocationController } from '../controllers/location.controller';
import { LocationGateway } from '../gateway/location.gateway';
import { LocationSchedulerService } from '../services/location-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Personnel]),
    ScheduleModule.forRoot(),
  ],
  controllers: [LocationController],
  providers: [
    LocationService,
    LocationGateway,
    LocationSchedulerService,
  ],
  exports: [
    LocationService,
    LocationGateway,
  ],
})
export class LocationModule {}