import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VeChatUnifiedController } from '../controllers/vechat-unified.controller';
import { VeChatUnifiedService } from '../services/vechat-unified.service';

@Module({
  imports: [
    // Si vous utilisez des entités TypeORM, ajoutez-les ici
    // TypeOrmModule.forFeature([VeChatConversation, VeChatMessage])
  ],
  controllers: [VeChatUnifiedController],
  providers: [VeChatUnifiedService],
  exports: [VeChatUnifiedService],
})
export class VeChatUnifiedModule {}