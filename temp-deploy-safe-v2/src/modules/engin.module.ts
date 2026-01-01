import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Engin } from '../entities/engin.entity';
import { EnginService } from '../services/engin.service';
import { EnginController } from '../controllers/engin.controller';
import { DatabaseModule } from '../common/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Engin]),
    DatabaseModule, // 🏢 Multi-tenant database support
  ],
  controllers: [EnginController],
  providers: [EnginService],
  exports: [EnginService],
})
export class EnginModule {}