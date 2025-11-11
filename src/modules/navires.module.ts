import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NaviresController } from '../controllers/navires.controller';
import { NaviresService } from '../services/navires.service';
import { Navire } from '../entities/navire.entity';
import { Armateur } from '../entities/armateur.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Navire, Armateur]),
  ],
  controllers: [NaviresController],
  providers: [NaviresService],
  exports: [NaviresService],
})
export class NaviresModule {}
