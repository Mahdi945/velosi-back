import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from '../../crm/controllers/reports.controller';
import { ReportsService } from '../../crm/services/reports.service';
import { Lead } from '../../entities/crm/lead.entity';
import { Opportunity } from '../../entities/crm/opportunity.entity';
import { Quote } from '../../crm/entities/quote.entity';
import { Activity } from '../../crm/entities/activity.entity';
import { Personnel } from '../../entities/personnel.entity';
import { Client } from '../../entities/client.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, Opportunity, Quote, Activity, Personnel, Client]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportModule {}
