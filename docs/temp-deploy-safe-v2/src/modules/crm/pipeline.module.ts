import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineController } from '../../crm/controllers/pipeline.controller';
import { PipelineService } from '../../crm/services/pipeline.service';
import { Opportunity } from '../../entities/crm/opportunity.entity';
import { Lead } from '../../entities/crm/lead.entity';
import { Personnel } from '../../entities/personnel.entity';
import { Client } from '../../entities/client.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Opportunity, Lead, Personnel, Client]),
  ],
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}