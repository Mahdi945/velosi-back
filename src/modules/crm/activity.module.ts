import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from '../../crm/activities.controller';
import { ActivitiesService } from '../../crm/activities.service';
import { Activity } from '../../crm/entities/activity.entity';
import { ActivityParticipant } from '../../crm/entities/activity-participant.entity';
import { ActivityAttachmentsService } from '../../crm/services/activity-attachments.service';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ActivityParticipant]),
    MulterModule.register({
      dest: './uploads/activites/temp',
    }),
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivityAttachmentsService],
  exports: [ActivitiesService, ActivityAttachmentsService],
})
export class ActivityModule {}
