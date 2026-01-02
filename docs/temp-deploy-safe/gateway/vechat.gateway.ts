import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { VechatService } from '../vechat/vechat.service';

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:4200',
      process.env.BACKEND_URL || 'http://localhost:3000',
      'https://wyselogiquote.com',
      'https://www.wyselogiquote.com',
      'http://vps-3b4fd3be.vps.ovh.ca:4200',
      'https://vps-3b4fd3be.vps.ovh.ca',
      'https://velosi-front.vercel.app',
      'https://localhost:4200'
    ],
    credentials: true,
  },
  namespace: '/vechat',
  transports: ['websocket', 'polling']
})
export class VechatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('VechatGateway');
  private connectedUsers = new Map<string, {
    socket: Socket;
    userId: number;
    userType: 'personnel' | 'client';
    role?: string;
    databaseName: string;
    organisationId: number;
  }>();

  constructor(
    private jwtService: JwtService,
    private vechatService: VechatService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('VechatGateway initialisé sur le namespace /vechat');
  }

  async handleConnection(socket: Socket) {
    try {
      // Récupérer le token depuis les headers ou query params
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token) {
        this.logger.warn(`Connexion refusée - pas de token: ${socket.id}`);
        socket.disconnect();
        return;
      }

      // Vérifier et décoder le token JWT
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      const userType = payload.userType || 'personnel';
      const role = payload.role;
      // 🏢 MULTI-TENANT: Extraire les informations d'organisation
      const databaseName = payload.databaseName;
      const organisationId = payload.organisationId;

      if (!databaseName || !organisationId) {
        this.logger.error(`JWT manque databaseName ou organisationId pour user ${userId}`);
        socket.disconnect();
        return;
      }

      // Stocker les informations de l'utilisateur
      this.connectedUsers.set(socket.id, {
        socket,
        userId,
        userType,
        role,
        databaseName,
        organisationId,
      });

      // Rejoindre une room personnelle pour recevoir les messages
      socket.join(`user_${userType}_${userId}`);

      // Mettre à jour le statut en ligne
      await this.vechatService.updatePresence(
        userId,
        userType,
        'online',
        { id: userId, userType },
        databaseName,
        organisationId
      );

      // Notifier les autres utilisateurs du statut en ligne
      socket.broadcast.emit('userOnlineStatus', {
        userId,
        userType,
        isOnline: true,
      });

      this.logger.log(`Utilisateur connecté: ${userType}_${userId} (${socket.id})`);

    } catch (error) {
      this.logger.error(`Erreur de connexion: ${error.message}`);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const userInfo = this.connectedUsers.get(socket.id);
    
    if (userInfo) {
      const { userId, userType, databaseName, organisationId } = userInfo;
      
      // Mettre à jour le statut hors ligne
      await this.vechatService.updatePresence(
        userId,
        userType,
        'offline',
        { id: userId, userType },
        databaseName,
        organisationId
      );

      // Notifier les autres utilisateurs du statut hors ligne
      socket.broadcast.emit('userOnlineStatus', {
        userId,
        userType,
        isOnline: false,
      });

      // Supprimer de la liste des utilisateurs connectés
      this.connectedUsers.delete(socket.id);

      this.logger.log(`Utilisateur déconnecté: ${userType}_${userId} (${socket.id})`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: {
      receiverId: number;
      receiverType: 'personnel' | 'client';
      content: string;
      type?: 'text' | 'image' | 'file';
    },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const userInfo = this.connectedUsers.get(socket.id);
      if (!userInfo) {
        socket.emit('error', { message: 'Utilisateur non authentifié' });
        return;
      }

      const { userId, userType, databaseName, organisationId } = userInfo;

      // Envoyer le message via le service
      const messageDto = {
        receiver_id: data.receiverId,
        receiver_type: data.receiverType,
        content: data.content,
        type: data.type || 'text'
      };
      const message = await this.vechatService.sendMessage(
        messageDto,
        { id: userId, userType },
        databaseName,
        organisationId
      );

      // Envoyer le message à l'expéditeur (confirmation)
      socket.emit('messageSent', message);

      // Envoyer le message au destinataire s'il est connecté
      const receiverRoom = `user_${data.receiverType}_${data.receiverId}`;
      socket.to(receiverRoom).emit('newMessage', message);

      this.logger.log(`Message envoyé de ${userType}_${userId} vers ${data.receiverType}_${data.receiverId}`);

    } catch (error) {
      this.logger.error(`Erreur envoi message: ${error.message}`);
      socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
    }
  }

  @SubscribeMessage('markMessageAsRead')
  async handleMarkMessageAsRead(
    @MessageBody() data: { messageId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const userInfo = this.connectedUsers.get(socket.id);
      if (!userInfo) {
        socket.emit('error', { message: 'Utilisateur non authentifié' });
        return;
      }

      const { userId, userType, databaseName, organisationId } = userInfo;

      // Marquer le message comme lu
      await this.vechatService.markMessagesAsRead(
        [data.messageId],
        { id: userId, userType },
        databaseName,
        organisationId
      );

      // Notifier l'expéditeur que le message a été lu
      socket.broadcast.emit('messageRead', {
        messageId: data.messageId,
        readBy: userId,
        readByType: userType,
      });

    } catch (error) {
      this.logger.error(`Erreur marquage message lu: ${error.message}`);
      socket.emit('error', { message: 'Erreur lors du marquage du message' });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: {
      receiverId: number;
      receiverType: 'personnel' | 'client';
      isTyping: boolean;
    },
    @ConnectedSocket() socket: Socket,
  ) {
    const userInfo = this.connectedUsers.get(socket.id);
    if (!userInfo) return;

    const { userId, userType } = userInfo;
    const receiverRoom = `user_${data.receiverType}_${data.receiverId}`;

    // Notifier le destinataire que l'utilisateur tape
    socket.to(receiverRoom).emit('userTyping', {
      userId,
      userType,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody() data: {
      participantId: number;
      participantType: 'personnel' | 'client';
    },
    @ConnectedSocket() socket: Socket,
  ) {
    const userInfo = this.connectedUsers.get(socket.id);
    if (!userInfo) return;

    const { userId, userType } = userInfo;
    
    // Créer un nom de room unique pour la conversation
    const conversationRoom = this.getConversationRoom(
      userId, userType,
      data.participantId, data.participantType
    );

    socket.join(conversationRoom);
    this.logger.log(`Utilisateur ${userType}_${userId} rejoint la conversation: ${conversationRoom}`);
  }

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @MessageBody() data: {
      participantId: number;
      participantType: 'personnel' | 'client';
    },
    @ConnectedSocket() socket: Socket,
  ) {
    const userInfo = this.connectedUsers.get(socket.id);
    if (!userInfo) return;

    const { userId, userType } = userInfo;
    
    const conversationRoom = this.getConversationRoom(
      userId, userType,
      data.participantId, data.participantType
    );

    socket.leave(conversationRoom);
    this.logger.log(`Utilisateur ${userType}_${userId} quitte la conversation: ${conversationRoom}`);
  }

  // Méthode utilitaire pour créer un nom de room unique pour une conversation
  private getConversationRoom(
    user1Id: number, user1Type: string,
    user2Id: number, user2Type: string
  ): string {
    // Créer un identifiant unique et ordonné pour la conversation
    const participants = [
      `${user1Type}_${user1Id}`,
      `${user2Type}_${user2Id}`
    ].sort();
    
    return `conversation_${participants.join('_')}`;
  }

  // Méthode pour envoyer un message à une conversation spécifique (utilisée par le service)
  public emitToConversation(
    user1Id: number, user1Type: string,
    user2Id: number, user2Type: string,
    event: string,
    data: any
  ) {
    const conversationRoom = this.getConversationRoom(user1Id, user1Type, user2Id, user2Type);
    this.server.to(conversationRoom).emit(event, data);
  }

  // Méthode pour envoyer à un utilisateur spécifique
  public emitToUser(userId: number, userType: string, event: string, data: any) {
    const userRoom = `user_${userType}_${userId}`;
    this.server.to(userRoom).emit(event, data);
  }
}