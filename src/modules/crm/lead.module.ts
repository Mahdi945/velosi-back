import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadController } from '../../controllers/crm/lead.controller';
import { LeadService } from '../../services/crm/lead.service';
import { Lead } from '../../entities/crm/lead.entity';
import { Personnel } from '../../entities/personnel.entity';
import { OpportunityService } from '../../services/crm/opportunity.service';
import { Opportunity } from '../../entities/crm/opportunity.entity';
import { Client } from '../../entities/client.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, Personnel, Opportunity, Client]),
  ],
  controllers: [LeadController],
  providers: [
    LeadService,
    OpportunityService,
  ],
  exports: [LeadService],
})
export class LeadModule {}