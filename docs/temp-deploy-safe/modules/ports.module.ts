import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Port } from '../entities/port.entity';
import { PortsService } from '../services/ports.service';
import { PortsController } from '../controllers/ports.controller';
import { DatabaseModule } from '../common/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Port]),
    DatabaseModule, // 🏢 Multi-tenant database support
  ],
  controllers: [PortsController],
  providers: [PortsService],
  exports: [PortsService],
})
export class PortsModule {}
