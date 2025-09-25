import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CrmModule } from './modules/crm.module';
import { FilesModule } from './files/files.module';
import { DiagnosticController } from './controllers/diagnostic.controller';
import { typeOrmConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: typeOrmConfig,
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CrmModule,
    FilesModule,
  ],
  controllers: [AppController, DiagnosticController],
  providers: [AppService],
})
export class AppModule {}
