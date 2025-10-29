import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ArmateursController } from '../controllers/armateurs.controller';
import { ArmateursService } from '../services/armateurs.service';
import { Armateur } from '../entities/armateur.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Armateur]),
    MulterModule.register({
      dest: './uploads/logos_armateurs',
    }),
  ],
  controllers: [ArmateursController],
  providers: [ArmateursService],
  exports: [ArmateursService],
})
export class ArmateursModule {}
