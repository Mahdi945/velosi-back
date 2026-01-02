import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VechatService } from './vechat.service';
import { CreateMessageDto, UpdateMessageDto, MarkReadDto } from './dto/vechat.dto';
import { getDatabaseName, getOrganisationId } from '../common/helpers/multi-tenant.helper';

@Controller('vechat')
@UseGuards(JwtAuthGuard)
export class VechatController {
  constructor(private readonly vechatService: VechatService) {}

  // === Conversations ===

  @Get('conversations')
  async getConversations(
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    // Utiliser les informations de l'utilisateur connecté via JWT
    const userId = req.user.id;
    const userType = req.user.userType || 'personnel';
    
    return this.vechatService.getUserConversations(
      userId,
      userType,
      req.user,
      databaseName,
      organisationId,
    );
  }

  @Post('conversations')
  async createConversation(
    @Body() body: {
      participant1_id: number;
      participant1_type: 'personnel' | 'client';
      participant2_id: number;
      participant2_type: 'personnel' | 'client';
    },
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.createOrGetConversation(
      body.participant1_id,
      body.participant1_type,
      body.participant2_id,
      body.participant2_type,
      req.user,
      databaseName,
      organisationId,
    );
  }

  @Put('conversations/:id/archive')
  async archiveConversation(
    @Param('id') conversationId: string,
    @Body() body: { userId: number; userType: 'personnel' | 'client' },
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.archiveConversation(
      parseInt(conversationId),
      body.userId,
      body.userType,
      req.user,
      databaseName,
      organisationId,
    );
  }

  @Put('conversations/:id/mute')
  async muteConversation(
    @Param('id') conversationId: string,
    @Body() body: { userId: number; userType: 'personnel' | 'client'; muted: boolean },
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.muteConversation(
      parseInt(conversationId),
      body.userId,
      body.userType,
      body.muted,
      req.user,
      databaseName,
      organisationId,
    );
  }

  @Put('conversations/:id/reset-unread')
  async resetUnreadCount(
    @Param('id') conversationId: string,
    @Body() body: { userId: number; userType: 'personnel' | 'client' },
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.resetUnreadCount(
      parseInt(conversationId),
      body.userId,
      body.userType,
      req.user,
      databaseName,
      organisationId,
    );
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @Param('id') conversationId: string,
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.deleteConversation(parseInt(conversationId), req.user, databaseName, organisationId);
  }

  // === Messages ===

  @Get('messages')
  async getMessages(
    @Query('conversationId') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.getConversationMessages(
      parseInt(conversationId),
      parseInt(page),
      parseInt(limit),
      req.user,
      databaseName,
      organisationId,
    );
  }

  @Post('messages')
  async sendMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.sendMessage(createMessageDto, req.user, databaseName, organisationId);
  }

  @Put('messages/:id')
  async updateMessage(
    @Param('id') messageId: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.updateMessage(
      parseInt(messageId),
      updateMessageDto,
      req.user,
      databaseName,
      organisationId,
    );
  }

  @Delete('messages/:id')
  async deleteMessage(
    @Param('id') messageId: string,
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.deleteMessage(
      parseInt(messageId),
      req.user.id,
      req.user.userType,
      req.user,
      databaseName,
      organisationId,
    );
  }

  @Put('messages/mark-read')
  async markMessagesAsRead(
    @Body() markReadDto: MarkReadDto,
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.markMessagesAsRead(markReadDto.messageIds, req.user, databaseName, organisationId);
  }

  @Get('messages/search')
  async searchMessages(
    @Query('conversationId') conversationId: string,
    @Query('query') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.searchMessages(
      parseInt(conversationId),
      query,
      parseInt(page),
      parseInt(limit),
      req.user,
      databaseName,
      organisationId,
    );
  }

  // === Upload ===

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      receiver_id: string;
      receiver_type: 'personnel' | 'client';
      message_type: 'image' | 'file' | 'video' | 'audio';
    },
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.uploadFile(
      file,
      parseInt(body.receiver_id),
      body.receiver_type,
      body.message_type,
      req.user,
      databaseName,
      organisationId,
    );
  }

  @Post('upload/voice')
  @UseInterceptors(FileInterceptor('voice'))
  async uploadVoiceMessage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      receiver_id: string;
      receiver_type: 'personnel' | 'client';
      duration: string;
    },
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.uploadVoiceMessage(
      file,
      parseInt(body.receiver_id),
      body.receiver_type,
      parseInt(body.duration),
      req.user,
      databaseName,
      organisationId,
    );
  }

  // === Contacts ===

  @Get('contacts')
  async getAvailableContacts(
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.getAvailableContacts(req.user, databaseName, organisationId);
  }

  @Get('contacts/search')
  async searchContacts(
    @Query('query') query: string,
    @Query('type') type: 'personnel' | 'client' = 'personnel',
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.searchContacts(query, type, req.user, databaseName, organisationId);
  }

  // === Présence ===

  @Put('presence')
  async updatePresence(
    @Body() body: {
      userId: number;
      userType: 'personnel' | 'client';
      status: 'online' | 'offline' | 'away' | 'busy';
    },
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.updatePresence(
      body.userId,
      body.userType,
      body.status,
      req.user,
      databaseName,
      organisationId,
    );
  }

  @Get('presence')
  async getPresence(
    @Query('userIds') userIds: string,
    @Query('userType') userType: 'personnel' | 'client',
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    const userIdArray = userIds.split(',').map(id => parseInt(id));
    return this.vechatService.getPresenceStatus(userIdArray, userType, req.user, databaseName, organisationId);
  }

  // === Paramètres ===

  @Get('settings')
  async getUserSettings(
    @Query('userId') userId: string,
    @Query('userType') userType: 'personnel' | 'client',
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.getUserSettings(
      parseInt(userId),
      userType,
      req.user,
      databaseName,
      organisationId,
    );
  }

  @Put('settings')
  async updateUserSettings(
    @Body() body: {
      userId: number;
      userType: 'personnel' | 'client';
      email_notifications?: boolean;
      push_notifications?: boolean;
      sound_notifications?: boolean;
      theme?: 'light' | 'dark' | 'auto';
      font_size?: 'small' | 'medium' | 'large';
      show_online_status?: boolean;
      show_read_receipts?: boolean;
    },
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.updateUserSettings(body, req.user, databaseName, organisationId);
  }

  // === Suppression de tous les messages ===

  @Delete('conversations/:conversationId/messages')
  async clearConversationMessages(
    @Param('conversationId') conversationId: string,
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.clearConversationMessages(
      parseInt(conversationId),
      req.user,
      databaseName,
      organisationId,
    );
  }

  // === Statistiques ===

  @Get('stats')
  async getChatStatistics(
    @Query('userId') userId: string,
    @Query('userType') userType: 'personnel' | 'client',
    @Request() req: any,
  ) {
    // 🏢 Extraire les informations multi-tenant
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    
    return this.vechatService.getChatStatistics(
      parseInt(userId),
      userType,
      req.user,
      databaseName,
      organisationId,
    );
  }

  // === Serving Files ===

  /**
   * Route pour servir les fichiers VeChat
   * GET /api/vechat/files/:type/:filename
   */
  @Get('files/:type/:filename')
  async getVechatFile(
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    return this.vechatService.serveFile(type, filename, res);
  }
}