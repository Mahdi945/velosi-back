import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutorisationTVA } from '../entities/autorisation-tva.entity';
import { BCsusTVA } from '../entities/bcsus-tva.entity';
import { Client } from '../entities/client.entity';
import { AutorisationTVAService } from '../services/autorisation-tva.service';
import { ClientService } from '../services/client.service';
import { BCsusTVAService } from '../services/bcsus-tva.service';
import { EmailService } from '../services/email.service';
import { AutorisationTVAController } from '../controllers/autorisation-tva.controller';
import { ClientController } from '../controllers/client.controller';
import { BCsusTVAController } from '../controllers/bcsus-tva.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutorisationTVA, BCsusTVA, Client]),
    AuthModule
  ],
  controllers: [AutorisationTVAController, ClientController, BCsusTVAController],
  providers: [AutorisationTVAService, ClientService, BCsusTVAService, EmailService],
  exports: [AutorisationTVAService, ClientService, BCsusTVAService],
})
export class ClientTVAModule {}