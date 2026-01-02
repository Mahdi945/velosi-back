import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorrespondantsService } from './correspondants.service';
import { CorrespondantsController } from './correspondants.controller';
import { Correspondant } from './entities/correspondant.entity';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../common/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Correspondant]),
    AuthModule,
    DatabaseModule, // 🏢 Multi-tenant database support
  ],
  controllers: [CorrespondantsController],
  providers: [CorrespondantsService],
  exports: [CorrespondantsService],
})
export class CorrespondantsModule {}
