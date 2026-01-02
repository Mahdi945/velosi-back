import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NaviresController } from '../controllers/navires.controller';
import { NaviresService } from '../services/navires.service';
import { Navire } from '../entities/navire.entity';
import { Armateur } from '../entities/armateur.entity';
import { DatabaseModule } from '../common/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Navire, Armateur]),
    DatabaseModule, // 🏢 Multi-tenant database support
  ],
  controllers: [NaviresController],
  providers: [NaviresService],
  exports: [NaviresService],
})
export class NaviresModule {}
