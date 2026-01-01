import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Param, 
  Request, 
  UseGuards,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VeChatUnifiedService } from '../services/vechat-unified.service';
import { 
  UnifiedUserDto, 
  VeChatConversationDto, 
  VeChatMessageDto, 
  CreateConversationDto, 
  SendMessageDto 
} from '../dto/vechat-unified.dto';

@Controller('api/vechat')
@UseGuards(JwtAuthGuard)
export class VeChatUnifiedController {
  private readonly logger = new Logger(VeChatUnifiedController.name);

  constructor(private readonly vechatService: VeChatUnifiedService) {}

  /**
   * Récupère tous les utilisateurs accessibles pour le chat
   * GET /api/vechat/users
   */
  @Get('users')
  async getUsers(@Request() req): Promise<UnifiedUserDto[]> {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        throw new HttpException('Utilisateur non authentifié', HttpStatus.UNAUTHORIZED);
      }

      // Déterminer le type d'utilisateur basé sur la session/token
      const userType = this.determineUserType(currentUser);
      
      return await this.vechatService.getUsersForChat(currentUser.id, userType);
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des utilisateurs:', error);
      throw new HttpException(
        'Erreur lors de la récupération des utilisateurs',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Récupère les détails d'un utilisateur
   * GET /api/vechat/users/:id
   */
  @Get('users/:id')
  async getUserDetails(
    @Param('id') userId: string,
    @Query('type') userType: string,
    @Request() req
  ): Promise<UnifiedUserDto> {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        throw new HttpException('Utilisateur non authentifié', HttpStatus.UNAUTHORIZED);
      }

      const user = await this.vechatService.getUserDetails(
        parseInt(userId), 
        userType as 'personnel' | 'client'
      );

      if (!user) {
        throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);
      }

      return user;
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des détails utilisateur:', error);
      throw new HttpException(
        'Erreur lors de la récupération des détails utilisateur',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Récupère les conversations de l'utilisateur actuel
   * GET /api/vechat/conversations
   */
  @Get('conversations')
  async getConversations(@Request() req): Promise<VeChatConversationDto[]> {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        throw new HttpException('Utilisateur non authentifié', HttpStatus.UNAUTHORIZED);
      }

      const userType = this.determineUserType(currentUser);
      
      return await this.vechatService.getUserConversations(currentUser.id, userType);
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des conversations:', error);
      throw new HttpException(
        'Erreur lors de la récupération des conversations',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Crée ou récupère une conversation
   * POST /api/vechat/conversations
   */
  @Post('conversations')
  async createConversation(
    @Body() dto: CreateConversationDto,
    @Request() req
  ): Promise<VeChatConversationDto> {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        throw new HttpException('Utilisateur non authentifié', HttpStatus.UNAUTHORIZED);
      }

      return await this.vechatService.createOrGetConversation(dto);
    } catch (error) {
      this.logger.error('Erreur lors de la création de la conversation:', error);
      throw new HttpException(
        'Erreur lors de la création de la conversation',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Récupère les messages d'une conversation
   * GET /api/vechat/messages?conversationId=1&page=1&limit=50
   */
  @Get('messages')
  async getMessages(
    @Query('conversationId') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Request() req
  ): Promise<VeChatMessageDto[]> {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        throw new HttpException('Utilisateur non authentifié', HttpStatus.UNAUTHORIZED);
      }

      if (!conversationId) {
        throw new HttpException('ID de conversation requis', HttpStatus.BAD_REQUEST);
      }

      const messages = await this.vechatService.getConversationMessages(
        parseInt(conversationId),
        parseInt(page),
        parseInt(limit)
      );

      // Marquer les messages comme lus
      const userType = this.determineUserType(currentUser);
      await this.vechatService.markMessagesAsRead(
        parseInt(conversationId),
        currentUser.id,
        userType
      );

      return messages;
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des messages:', error);
      throw new HttpException(
        'Erreur lors de la récupération des messages',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Envoie un message
   * POST /api/vechat/messages
   */
  @Post('messages')
  async sendMessage(
    @Body() dto: SendMessageDto,
    @Request() req
  ): Promise<VeChatMessageDto> {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        throw new HttpException('Utilisateur non authentifié', HttpStatus.UNAUTHORIZED);
      }

      const userType = this.determineUserType(currentUser);
      
      return await this.vechatService.sendMessage(currentUser.id, userType, dto);
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi du message:', error);
      throw new HttpException(
        'Erreur lors de l\'envoi du message',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Marque les messages comme lus
   * POST /api/vechat/conversations/:id/read
   */
  @Post('conversations/:id/read')
  async markAsRead(
    @Param('id') conversationId: string,
    @Request() req
  ): Promise<{ success: boolean }> {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        throw new HttpException('Utilisateur non authentifié', HttpStatus.UNAUTHORIZED);
      }

      const userType = this.determineUserType(currentUser);
      
      await this.vechatService.markMessagesAsRead(
        parseInt(conversationId),
        currentUser.id,
        userType
      );

      return { success: true };
    } catch (error) {
      this.logger.error('Erreur lors du marquage comme lu:', error);
      throw new HttpException(
        'Erreur lors du marquage comme lu',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Détermine le type d'utilisateur basé sur les informations de session
   * Cette logique doit être adaptée à votre système d'authentification
   */
  private determineUserType(user: any): 'personnel' | 'client' {
    // Exemples de logique pour déterminer le type d'utilisateur :
    
    // Option 1: Basé sur un champ dans le token/session
    if (user.userType) {
      return user.userType;
    }
    
    // Option 2: Basé sur la présence de certains champs
    if (user.poste || user.role) {
      return 'personnel';
    }
    
    // Option 3: Basé sur la table d'origine de l'authentification
    if (user.tableName === 'personnel') {
      return 'personnel';
    }
    
    if (user.tableName === 'client') {
      return 'client';
    }

    // Option 4: Basé sur l'email/domaine
    if (user.email && user.email.includes('@votre-entreprise.com')) {
      return 'personnel';
    }

    // Par défaut, considérer comme client
    return 'client';
  }
}