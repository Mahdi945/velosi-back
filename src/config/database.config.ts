import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { ContactClient } from '../entities/contact-client.entity';
import { ObjectifCom } from '../entities/objectif-com.entity';
import { VechatMessage } from '../vechat/entities/vechat-message.entity';
import { VechatConversation } from '../vechat/entities/vechat-conversation.entity';
import { VechatPresence } from '../vechat/entities/vechat-presence.entity';
import { VechatUserSettings } from '../vechat/entities/vechat-user-settings.entity';

export const typeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_ADDR') || 'localhost',
  port: parseInt(configService.get('DB_PORT')) || 5432,
  username: configService.get('DB_USER') || 'msp',
  password: configService.get('DB_PASSWORD') || '87Eq8384',
  database: configService.get('DB_DATABASE') || 'velosi',
  entities: [Client, Personnel, ContactClient, ObjectifCom, VechatMessage, VechatConversation, VechatPresence, VechatUserSettings],
  synchronize: false, // Ne pas modifier automatiquement la structure de la DB
  logging: process.env.NODE_ENV === 'development',
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});
