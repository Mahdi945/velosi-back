import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpportunityController } from '../../controllers/crm/opportunity.controller';
import { OpportunityService } from '../../services/crm/opportunity.service';
import { Opportunity } from '../../entities/crm/opportunity.entity';
import { Lead } from '../../entities/crm/lead.entity';
import { Personnel } from '../../entities/personnel.entity';
import { Client } from '../../entities/client.entity';
import { LeadModule } from './lead.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Opportunity, Lead, Personnel, Client]),
    forwardRef(() => LeadModule),
  ],
  controllers: [OpportunityController],
  providers: [OpportunityService],
  exports: [OpportunityService],
})
export class OpportunityModule {}