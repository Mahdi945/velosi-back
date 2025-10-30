import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorrespondantsService } from './correspondants.service';
import { CorrespondantsController } from './correspondants.controller';
import { Correspondant } from './entities/correspondant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Correspondant])],
  controllers: [CorrespondantsController],
  providers: [CorrespondantsService],
  exports: [CorrespondantsService],
})
export class CorrespondantsModule {}
