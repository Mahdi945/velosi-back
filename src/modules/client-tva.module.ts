import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutorisationTVA } from '../entities/autorisation-tva.entity';
import { BCsusTVA } from '../entities/bcsus-tva.entity';
import { Client } from '../entities/client.entity';
import { AutorisationTVAService } from '../services/autorisation-tva.service';
import { ClientService } from '../services/client.service';
import { BCsusTVAService } from '../services/bcsus-tva.service';
import { AutorisationTVAController } from '../controllers/autorisation-tva.controller';
import { ClientController } from '../controllers/client.controller';
import { BCsusTVAController } from '../controllers/bcsus-tva.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutorisationTVA, BCsusTVA, Client])
  ],
  controllers: [AutorisationTVAController, ClientController, BCsusTVAController],
  providers: [AutorisationTVAService, ClientService, BCsusTVAService],
  exports: [AutorisationTVAService, ClientService, BCsusTVAService],
})
export class ClientTVAModule {}