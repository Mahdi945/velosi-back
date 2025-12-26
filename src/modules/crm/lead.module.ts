import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadController } from '../../controllers/crm/lead.controller';
import { LeadService } from '../../services/crm/lead.service';
import { LeadsController } from '../../crm/controllers/leads.controller';
import { LeadsService } from '../../crm/services/leads.service';
import { Lead } from '../../entities/crm/lead.entity';
import { Personnel } from '../../entities/personnel.entity';
import { OpportunityService } from '../../services/crm/opportunity.service';
import { Opportunity } from '../../entities/crm/opportunity.entity';
import { Client } from '../../entities/client.entity';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Lead, Personnel, Opportunity, Client]),
  ],
  // ⚠️ DÉSACTIVATION DE L'ANCIEN CONTROLLER - Utiliser LeadsController à la place
  // LeadController utilise @InjectRepository qui se connecte à velosi
  // LeadsController utilise connection.query() multi-tenant
  controllers: [
    // LeadController, // ❌ ANCIEN - Utilise TypeORM (velosi uniquement)
    LeadsController,   // ✅ NOUVEAU - Multi-tenant compatible
  ],
  providers: [
    LeadService,      // ⚠️ Garde pour la compatibilité, mais ne pas utiliser directement
    LeadsService,     // ✅ Service avec soft delete et multi-tenant
    OpportunityService,
  ],
  exports: [LeadService, LeadsService],
})
export class LeadModule {}