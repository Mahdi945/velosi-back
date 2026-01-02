import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Industry } from '../../crm/entities/industry.entity';
import { IndustryService } from '../../crm/services/industry.service';
import { IndustryController } from '../../crm/controllers/industry.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Industry])],
  controllers: [IndustryController],
  providers: [IndustryService],
  exports: [IndustryService],
})
export class IndustryModule {}
