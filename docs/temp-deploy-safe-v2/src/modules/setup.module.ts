import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SetupController } from '../controllers/setup.controller';
import { SetupService } from '../services/setup.service';
import { Organisation } from '../entities/organisation.entity';
import { SetupToken } from '../entities/setup-token.entity';
import { DatabaseModule } from '../common/database.module';
import { EmailService } from '../services/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organisation, SetupToken]),
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [SetupController],
  providers: [SetupService, EmailService],
  exports: [SetupService],
})
export class SetupModule {}
