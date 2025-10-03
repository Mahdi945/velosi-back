import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { VechatController } from './vechat.controller';
import { VechatService } from './vechat.service';
import { VechatGateway } from './vechat.gateway';

// Entités VelosiChat
import { VechatMessage } from './entities/vechat-message.entity';
import { VechatConversation } from './entities/vechat-conversation.entity';
import { VechatPresence } from './entities/vechat-presence.entity';
import { VechatUserSettings } from './entities/vechat-user-settings.entity';

// Entités existantes
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';

@Module({
  imports: [
    // TypeORM pour les entités VelosiChat
    TypeOrmModule.forFeature([
      VechatMessage,
      VechatConversation,
      VechatPresence,
      VechatUserSettings,
      Personnel,
      Client,
    ]),

    // JWT pour l'authentification WebSocket
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),

    // Multer pour l'upload de fichiers
    MulterModule.register({
      dest: './uploads/vechat',
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    }),
  ],
  controllers: [VechatController],
  providers: [VechatService, VechatGateway],
  exports: [VechatService, VechatGateway],
})
export class VechatModule {}