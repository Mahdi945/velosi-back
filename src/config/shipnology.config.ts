import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AdminMsp } from '../admin-msp/entities/admin-msp.entity';
import { Organisation } from '../admin-msp/entities/organisation.entity';
import { SetupToken } from '../admin-msp/entities/setup-token.entity';

export const shipnologyConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const dbHost = configService.get('DB_HOST') || configService.get('DB_ADDR') || 'localhost';
  const dbSslMode = configService.get('DB_SSL_MODE', 'auto');

  // Déterminer la configuration SSL
  let sslConfig: any = false;

  if (dbSslMode === 'disable') {
    sslConfig = false;
  } else if (dbSslMode === 'require') {
    sslConfig = { rejectUnauthorized: false };
  } else if (dbHost === 'localhost' || dbHost === '127.0.0.1') {
    sslConfig = false;
  } else if (process.env.NODE_ENV === 'production') {
    sslConfig = { rejectUnauthorized: false };
  }

  return {
    name: 'shipnology',
    type: 'postgres',
    host: dbHost,
    port: parseInt(configService.get('DB_PORT')) || 5432,
    username: configService.get('DB_USERNAME') || configService.get('DB_USER') || 'msp',
    password: configService.get('DB_PASSWORD') || '87Eq8384',
    database: 'shipnology', // Base principale du registre
    entities: [
      AdminMsp,
      Organisation,
      SetupToken,
    ],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    ssl: sslConfig,
  };
};
