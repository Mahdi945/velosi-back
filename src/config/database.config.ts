import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';
import { ContactClient } from '../entities/contact-client.entity';
import { ObjectifCom } from '../entities/objectif-com.entity';
import { AutorisationTVA } from '../entities/autorisation-tva.entity';
import { BCsusTVA } from '../entities/bcsus-tva.entity';
import { BiometricCredential } from '../entities/biometric-credential.entity';
import { VechatMessage } from '../vechat/entities/vechat-message.entity';
import { VechatConversation } from '../vechat/entities/vechat-conversation.entity';
import { VechatPresence } from '../vechat/entities/vechat-presence.entity';
import { VechatUserSettings } from '../vechat/entities/vechat-user-settings.entity';
import { Lead } from '../entities/crm/lead.entity';
import { Opportunity } from '../entities/crm/opportunity.entity';
import { Activity } from '../crm/entities/activity.entity';
import { ActivityParticipant } from '../crm/entities/activity-participant.entity';
import { Quote } from '../crm/entities/quote.entity';
import { QuoteItem } from '../crm/entities/quote-item.entity';
import { TypeFraisAnnexe } from '../crm/entities/type-frais-annexe.entity';
import { Industry } from '../crm/entities/industry.entity';
import { Engin } from '../entities/engin.entity';
import { Armateur } from '../entities/armateur.entity';
import { Navire } from '../entities/navire.entity';
import { Fournisseur } from '../entities/fournisseur.entity';
import { Correspondant } from '../correspondants/entities/correspondant.entity';
import { Port } from '../entities/port.entity';
import { Aeroport } from '../entities/aeroport.entity';

export const typeOrmConfig = (
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
    type: 'postgres',
    host: dbHost,
    port: parseInt(configService.get('DB_PORT')) || 5432,
    username: configService.get('DB_USERNAME') || configService.get('DB_USER') || 'msp',
    password: configService.get('DB_PASSWORD') || '87Eq8384',
    database: configService.get('DB_DATABASE') || 'velosi',
    entities: [
      Client,
      Personnel,
      ContactClient,
      ObjectifCom,
      BiometricCredential,
      VechatMessage,
      VechatConversation,
      VechatPresence,
      VechatUserSettings,
      Lead,
      Opportunity,
      Activity,
      ActivityParticipant,
      Quote,
      QuoteItem,
      TypeFraisAnnexe,
      Industry,
      AutorisationTVA,
      BCsusTVA,
      Engin,
      Armateur,
      Navire,
      Fournisseur,
      Correspondant,
      Port,
      Aeroport
    ],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    ssl: sslConfig,
  };
};
