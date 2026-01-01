import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ArmateursController } from '../controllers/armateurs.controller';
import { ArmateursService } from '../services/armateurs.service';
import { Armateur } from '../entities/armateur.entity';
import { DatabaseModule } from '../common/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Armateur]),
    DatabaseModule, // 🏢 Multi-tenant database support
    MulterModule.register({
      dest: './uploads/logos_armateurs',
    }),
  ],
  controllers: [ArmateursController],
  providers: [ArmateursService],
  exports: [ArmateursService],
})
export class ArmateursModule {}
