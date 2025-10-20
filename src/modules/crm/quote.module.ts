import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from '../../crm/entities/quote.entity';
import { QuoteItem } from '../../crm/entities/quote-item.entity';
import { Lead } from '../../entities/crm/lead.entity';
import { Opportunity } from '../../entities/crm/opportunity.entity';
import { Client } from '../../entities/client.entity';
import { Personnel } from '../../entities/personnel.entity';
import { ContactClient } from '../../entities/contact-client.entity';
import { AutorisationTVA } from '../../entities/autorisation-tva.entity';
import { BCsusTVA } from '../../entities/bcsus-tva.entity';
import { QuotesService } from '../../crm/services/quotes.service';
import { QuotesController } from '../../crm/controllers/quotes.controller';
import { EmailService } from '../../services/email.service';
import { ClientService } from '../../services/client.service';
import { AutorisationTVAService } from '../../services/autorisation-tva.service';
import { KeycloakService } from '../../auth/keycloak.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quote,
      QuoteItem,
      Lead,
      Opportunity,
      Client,
      Personnel,
      ContactClient,
      AutorisationTVA,
      BCsusTVA,
    ]),
  ],
  controllers: [QuotesController],
  providers: [
    QuotesService,
    EmailService,
    ClientService,
    AutorisationTVAService,
    KeycloakService,
  ],
  exports: [QuotesService],
})
export class QuoteModule {}
