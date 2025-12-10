import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { VechatService } from './vechat.service';

interface ConnectedUser {
  userId: number;
  userType: 'personnel' | 'client';
  socketId: string;
  userName: string;
  lastSeen: Date;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:4200',
      process.env.BACKEND_URL || 'http://localhost:3000',
      'https://wyselogiquote.com'
    ],
    credentials: true,
  },
  namespace: '/vechat',
})
export class VechatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VechatGateway.name);
  private connectedUsers = new Map<string, ConnectedUser>();
  private userSockets = new Map<string, Set<string>>(); // userId_userType -> Set of socketIds

  constructor(
    private jwtService: JwtService,
    private vechatService: VechatService
  ) {}

  // === Événements de connexion ===

  async handleConnection(client: Socket) {
    try {
      // Authentifier le client
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Client ${client.id} attempting to connect without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;
      const userType = payload.userType || 'personnel';
      const userName = `${payload.prenom || ''} ${payload.nom || ''}`.trim();

      // Ajouter à la liste des utilisateurs connectés
      const userKey = `${userId}_${userType}`;
      const connectedUser: ConnectedUser = {
        userId,
        userType,
        socketId: client.id,
        userName,
        lastSeen: new Date(),
      };

      this.connectedUsers.set(client.id, connectedUser);

      // Gérer les connexions multiples du même utilisateur
      if (!this.userSockets.has(userKey)) {
        this.userSockets.set(userKey, new Set());
      }
      this.userSockets.get(userKey)!.add(client.id);

      // Rejoindre les salles personnelles
      await client.join(`user_${userKey}`);
      await client.join(`presence_${userType}`);

      this.logger.log(`User ${userName} (${userKey}) connected with socket ${client.id}`);

      // Notifier les autres utilisateurs de la connexion
      this.broadcastUserOnlineStatus({
        userId,
        userType,
        isOnline: true,
        lastSeen: new Date(),
      });

      // Envoyer la liste des utilisateurs en ligne au nouveau client
      client.emit('online_users', this.getOnlineUsers());

    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const connectedUser = this.connectedUsers.get(client.id);

    if (connectedUser) {
      const userKey = `${connectedUser.userId}_${connectedUser.userType}`;
      
      // Retirer cette socket de l'utilisateur
      const userSocketSet = this.userSockets.get(userKey);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        
        // Si plus aucune socket pour cet utilisateur, le marquer comme hors ligne
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userKey);
          
          this.logger.log(`User ${connectedUser.userName} (${userKey}) went offline`);
          
          // Notifier les autres utilisateurs de la déconnexion
          this.broadcastUserOnlineStatus({
            userId: connectedUser.userId,
            userType: connectedUser.userType,
            isOnline: false,
            lastSeen: new Date(),
          });
        }
      }

      this.connectedUsers.delete(client.id);
    }

    this.logger.log(`Client ${client.id} disconnected`);
  }

  // === Gestion des messages ===

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() messageData: any,
    @ConnectedSocket() client: Socket,
  ) {
    const sender = this.connectedUsers.get(client.id);
    if (!sender) {
      client.emit('error', { message: 'Utilisateur non authentifié' });
      return;
    }

    try {
      console.log('📨 NOUVEAU SYSTÈME - Message reçu:', messageData);

      // 1. Sauvegarder le message en base
      const savedMessage = await this.vechatService.sendMessage(messageData, {
        id: sender.userId,
        userType: sender.userType
      });

      // 2. SYNCHRONISATION IMMÉDIATE COMPLÈTE
      await this.syncCompleteState(savedMessage, sender);

      this.logger.log(`Message sent from ${sender.userName}`);

    } catch (error) {
      this.logger.error('Error handling sendMessage:', error);
      client.emit('error', { message: 'Erreur lors de l\'envoi du message' });
    }
  }

  // NOUVELLE MÉTHODE : Synchronisation complète de l'état
  private async syncCompleteState(message: any, sender: any): Promise<void> {
    console.log('🔄 SYNC COMPLET démarré pour message:', message.id);

    try {
      // Récupérer l'état COMPLET des deux participants
      const senderState = await this.getCompleteUserState(sender.userId, sender.userType);
      const receiverState = await this.getCompleteUserState(message.receiver_id, message.receiver_type);

      // Diffuser l'état complet à l'expéditeur
      const senderKey = `${sender.userId}_${sender.userType}`;
      this.server.to(`user_${senderKey}`).emit('stateSync', {
        type: 'MESSAGE_SENT',
        message: message,
        conversations: senderState.conversations,
        unreadCounts: senderState.unreadCounts,
        timestamp: new Date()
      });

      // Diffuser l'état complet au destinataire
      const receiverKey = `${message.receiver_id}_${message.receiver_type}`;
      this.server.to(`user_${receiverKey}`).emit('stateSync', {
        type: 'MESSAGE_RECEIVED',
        message: message,
        conversations: receiverState.conversations,
        unreadCounts: receiverState.unreadCounts,
        timestamp: new Date()
      });

      console.log('✅ SYNC COMPLET terminé pour expéditeur et destinataire');

    } catch (error) {
      console.error('❌ Erreur lors du sync complet:', error);
    }
  }
  
  // Récupérer l'état complet d'un utilisateur
  private async getCompleteUserState(userId: number, userType: 'personnel' | 'client'): Promise<any> {
    try {
      const [conversations, unreadCounts] = await Promise.all([
        this.vechatService.getConversationsForUser(userId, userType),
        this.vechatService.getUnreadCountsForUser(userId, userType)
      ]);

      return {
        conversations,
        unreadCounts,
        userId,
        userType
      };
    } catch (error) {
      console.error('❌ Erreur récupération état utilisateur:', error);
      return { conversations: [], unreadCounts: {}, userId, userType };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { receiverId: number; receiverType: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const sender = this.connectedUsers.get(client.id);
    if (!sender) return;

    const receiverKey = `${data.receiverId}_${data.receiverType}`;
    this.server.to(`user_${receiverKey}`).emit('userTyping', {
      userId: sender.userId,
      userType: sender.userType,
      userName: sender.userName,
      isTyping: data.isTyping,
    });

    console.log(`👤 ${sender.userName} ${data.isTyping ? 'started' : 'stopped'} typing to ${receiverKey}`);
  }

  @SubscribeMessage('markMessagesRead')
  async handleMarkMessagesRead(
    @MessageBody() data: { messageIds: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const reader = this.connectedUsers.get(client.id);
    if (!reader) return;

    try {
      console.log('📖 WebSocket - Marquage messages comme lus:', data.messageIds);
      
      // Récupérer les détails des messages avant de les marquer comme lus
      const messages = await this.vechatService.getMessagesByIds(data.messageIds);
      
      // Appeler le service pour marquer les messages comme lus
      const result = await this.vechatService.markMessagesAsRead(data.messageIds, {
        id: reader.userId,
        userType: reader.userType
      });

      console.log('✅ Messages marqués comme lus:', result);

      // Confirmer au lecteur
      client.emit('messagesMarkedAsRead', {
        messageIds: data.messageIds,
        success: true
      });

      // Notifier spécifiquement chaque expéditeur des messages lus
      const sendersNotified = new Set<string>();
      const conversationsToUpdate = new Set<number>();
      
      for (const message of messages) {
        const senderKey = `${message.sender_id}_${message.sender_type}`;
        
        // Éviter de notifier le même expéditeur plusieurs fois
        if (!sendersNotified.has(senderKey)) {
          sendersNotified.add(senderKey);
          
          // Récupérer les compteurs mis à jour pour cet expéditeur
          const unreadCounts = await this.vechatService.getUnreadCountsForUser(
            message.sender_id, 
            message.sender_type
          );
          
          // Notifier l'expéditeur que ses messages ont été lus avec compteurs mis à jour
          this.server.to(`user_${senderKey}`).emit('messagesReadByReceiver', {
            messageIds: data.messageIds.filter(id => 
              messages.some(m => m.id === id && m.sender_id === message.sender_id)
            ),
            readBy: {
              id: reader.userId,
              type: reader.userType,
              name: reader.userName
            },
            unreadCounts: unreadCounts,
            timestamp: new Date()
          });
          
          console.log(`📤 Notification lecture envoyée à ${senderKey}:`, unreadCounts);
        }

        // Collecter les conversations pour mise à jour globale
        const conversation = await this.vechatService.getConversationForMessage(message);
        if (conversation) {
          conversationsToUpdate.add(conversation.id);
        }
      }

      // Notifier tous les participants des conversations affectées pour une mise à jour complète
      for (const conversationId of conversationsToUpdate) {
        const conversation = await this.vechatService.getConversationById(conversationId);
        if (conversation) {
          const participant1Key = `${conversation.participant1_id}_${conversation.participant1_type}`;
          const participant2Key = `${conversation.participant2_id}_${conversation.participant2_type}`;
          
          // Notifier la mise à jour de la conversation
          this.server.to(`user_${participant1Key}`).emit('conversationUpdated', {
            conversationId: conversationId,
            type: 'unread_count_updated'
          });
          
          this.server.to(`user_${participant2Key}`).emit('conversationUpdated', {
            conversationId: conversationId,
            type: 'unread_count_updated'
          });
        }
      }

    } catch (error) {
      console.error('❌ Erreur lors du marquage des messages:', error);
      client.emit('messagesMarkedAsRead', {
        messageIds: data.messageIds,
        success: false,
        error: error.message
      });
    }
  }

  @SubscribeMessage('message_read')
  async handleMessageReadEvent(
    @MessageBody() data: { messageIds: number[]; senderId: number; senderType: string },
    @ConnectedSocket() client: Socket,
  ) {
    const reader = this.connectedUsers.get(client.id);
    if (!reader) return;

    // Notifier l'expéditeur que ses messages ont été lus
    const senderKey = `${data.senderId}_${data.senderType}`;
    this.server.to(`user_${senderKey}`).emit('messageRead', {
      messageIds: data.messageIds,
      readBy: reader.userId,
      readByType: reader.userType,
      readByName: reader.userName,
      readAt: new Date(),
    });

    this.logger.log(`Messages ${data.messageIds.join(',')} marked as read by ${reader.userName}`);
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    try {
      const conversationRoom = `conversation_${data.conversationId}`;
      await client.join(conversationRoom);

      console.log(`👤 CONSULTATION: ${user.userName} ouvre conversation ${data.conversationId}`);

      // 1. Marquer TOUS les messages non lus comme lus IMMÉDIATEMENT
      const unreadMessages = await this.vechatService.getUnreadMessagesForUserInConversation(
        data.conversationId, 
        user.userId, 
        user.userType
      );

      if (unreadMessages.length > 0) {
        console.log(`📖 LECTURE AUTO: ${unreadMessages.length} messages marqués comme lus`);
        
        const messageIds = unreadMessages.map(msg => msg.id);
        await this.vechatService.markMessagesAsRead(messageIds, {
          id: user.userId,
          userType: user.userType
        });

        // 2. SYNC IMMÉDIAT pour TOUS les participants de la conversation
        await this.syncConversationState(data.conversationId, 'CONVERSATION_VIEWED');
      }

      this.logger.log(`User ${user.userName} joined conversation ${data.conversationId}`);

    } catch (error) {
      console.error('❌ Erreur lors de l\'entrée dans la conversation:', error);
    }
  }

  // Synchroniser l'état de la conversation pour tous les participants
  private async syncConversationState(conversationId: number, reason: string): Promise<void> {
    console.log(`🔄 SYNC CONVERSATION ${conversationId} - Raison: ${reason}`);

    try {
      const conversation = await this.vechatService.getConversationById(conversationId);
      if (!conversation) return;

      // Récupérer l'état complet des deux participants
      const participant1State = await this.getCompleteUserState(
        conversation.participant1_id, 
        conversation.participant1_type
      );
      const participant2State = await this.getCompleteUserState(
        conversation.participant2_id, 
        conversation.participant2_type
      );

      // Diffuser à chaque participant
      const participant1Key = `${conversation.participant1_id}_${conversation.participant1_type}`;
      const participant2Key = `${conversation.participant2_id}_${conversation.participant2_type}`;

      this.server.to(`user_${participant1Key}`).emit('stateSync', {
        type: 'CONVERSATION_UPDATE',
        conversations: participant1State.conversations,
        unreadCounts: participant1State.unreadCounts,
        timestamp: new Date(),
        reason
      });

      this.server.to(`user_${participant2Key}`).emit('stateSync', {
        type: 'CONVERSATION_UPDATE',
        conversations: participant2State.conversations,
        unreadCounts: participant2State.unreadCounts,
        timestamp: new Date(),
        reason
      });

      console.log('✅ SYNC CONVERSATION terminé pour tous les participants');

    } catch (error) {
      console.error('❌ Erreur sync conversation:', error);
    }
  }

  @SubscribeMessage('requestStateSync')
  async handleRequestStateSync(
    @MessageBody() data: { conversationId?: number, reason: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    console.log(`🔄 DEMANDE SYNC explicite de ${user.userName}:`, data.reason);

    try {
      if (data.conversationId) {
        // Sync spécifique à une conversation
        await this.syncConversationState(data.conversationId, data.reason);
      } else {
        // Sync général de l'utilisateur
        const userState = await this.getCompleteUserState(user.userId, user.userType);
        const userKey = `${user.userId}_${user.userType}`;
        
        this.server.to(`user_${userKey}`).emit('stateSync', {
          type: 'FULL_SYNC',
          conversations: userState.conversations,
          unreadCounts: userState.unreadCounts,
          timestamp: new Date(),
          reason: data.reason
        });
      }

      console.log('✅ SYNC sur demande terminé');

    } catch (error) {
      console.error('❌ Erreur sync sur demande:', error);
    }
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    const conversationRoom = `conversation_${data.conversationId}`;
    await client.leave(conversationRoom);

    this.logger.log(`User ${user.userName} left conversation ${data.conversationId}`);
  }

  @SubscribeMessage('update_presence')
  async handleUpdatePresence(
    @MessageBody() data: { status: 'online' | 'away' | 'busy' | 'offline' },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    // Mettre à jour le statut local
    user.lastSeen = new Date();

    // Diffuser le changement de statut
    this.broadcastUserOnlineStatus({
      userId: user.userId,
      userType: user.userType,
      isOnline: data.status !== 'offline',
      status: data.status,
      lastSeen: user.lastSeen,
    });

    this.logger.log(`User ${user.userName} updated presence to ${data.status}`);
  }

  @SubscribeMessage('get_online_users')
  async handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    client.emit('online_users', this.getOnlineUsers());
  }

  @SubscribeMessage('get_user_presence')
  async handleGetUserPresence(
    @MessageBody() data: { userId: number; userType: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    const userKey = `${data.userId}_${data.userType}`;
    const isOnline = this.userSockets.has(userKey);
    const onlineUser = this.getOnlineUsers().find(u => u.userId === data.userId && u.userType === data.userType);

    client.emit('user_presence_update', {
      userId: data.userId,
      userType: data.userType,
      isOnline,
      lastSeen: onlineUser?.lastSeen || new Date(),
      connectedAt: onlineUser?.connectedAt || null
    });
  }

  @SubscribeMessage('conversation_cleared')
  async handleConversationCleared(
    @MessageBody() data: { conversationId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    // Diffuser à tous les participants de la conversation
    const conversationRoom = `conversation_${data.conversationId}`;
    this.server.to(conversationRoom).emit('conversation_cleared', {
      conversationId: data.conversationId,
      clearedBy: user.userId,
      clearedByType: user.userType,
      clearedAt: new Date()
    });

    this.logger.log(`Conversation ${data.conversationId} cleared by ${user.userName}`);
  }

  // === Méthodes publiques pour les services ===

  handleNewMessage(message: any) {
    const receiverKey = `${message.receiver_id}_${message.receiver_type}`;
    this.server.to(`user_${receiverKey}`).emit('new_message', message);

    // Émettre aussi à l'expéditeur pour confirmation
    const senderKey = `${message.sender_id}_${message.sender_type}`;
    this.server.to(`user_${senderKey}`).emit('message_confirmed', message);

    this.logger.log(`New message broadcast to ${receiverKey}`);
  }

  handleMessageUpdated(message: any) {
    const receiverKey = `${message.receiver_id}_${message.receiver_type}`;
    const senderKey = `${message.sender_id}_${message.sender_type}`;

    this.server.to(`user_${receiverKey}`).emit('message_updated', message);
    this.server.to(`user_${senderKey}`).emit('message_updated', message);

    this.logger.log(`Message ${message.id} update broadcast`);
  }

  handleMessageDeleted(message: any) {
    const receiverKey = `${message.receiver_id}_${message.receiver_type}`;
    const senderKey = `${message.sender_id}_${message.sender_type}`;

    this.server.to(`user_${receiverKey}`).emit('message_deleted', {
      messageId: message.id,
      deletedBy: message.sender_id,
      deletedByType: message.sender_type,
    });
    this.server.to(`user_${senderKey}`).emit('message_deleted', {
      messageId: message.id,
      deletedBy: message.sender_id,
      deletedByType: message.sender_type,
    });

    this.logger.log(`Message ${message.id} deletion broadcast`);
  }

  handleMessageRead(data: any) {
    const senderKey = `${data.senderId}_${data.senderType}`;
    this.server.to(`user_${senderKey}`).emit('message_read', data);

    this.logger.log(`Message read receipt sent to ${senderKey}`);
  }

  handleUserOnlineStatus(data: {
    userId: number;
    userType: string;
    isOnline: boolean;
    status?: string;
    lastSeen?: Date;
  }) {
    this.broadcastUserOnlineStatus(data);
  }

  handleConversationUpdated(conversationId: number, data: any) {
    const conversationRoom = `conversation_${conversationId}`;
    this.server.to(conversationRoom).emit('conversation_updated', {
      conversationId,
      ...data,
    });

    this.logger.log(`Conversation ${conversationId} update broadcast`);
  }

  // === Méthodes utilitaires ===

  private broadcastUserOnlineStatus(data: {
    userId: number;
    userType: string;
    isOnline: boolean;
    status?: string;
    lastSeen?: Date;
  }) {
    // Diffuser à tous les utilisateurs du même type (personnel/client)
    this.server.to(`presence_${data.userType}`).emit('userOnlineStatus', data);

    // Diffuser aussi aux autres types si nécessaire (selon les règles métier)
    if (data.userType === 'personnel') {
      this.server.to('presence_client').emit('userOnlineStatus', data);
    }
  }

  private getOnlineUsers(): Array<{
    userId: number;
    userType: string;
    userName: string;
    isOnline: boolean;
    lastSeen: Date;
    connectedAt: Date;
  }> {
    const onlineUsers = new Map<string, any>();

    this.connectedUsers.forEach((user) => {
      const userKey = `${user.userId}_${user.userType}`;
      onlineUsers.set(userKey, {
        userId: user.userId,
        userType: user.userType,
        userName: user.userName,
        isOnline: true,
        lastSeen: user.lastSeen,
        connectedAt: user.lastSeen, // On utilise lastSeen comme connectedAt pour les utilisateurs connectés
      });
    });

    return Array.from(onlineUsers.values());
  }

  // === Méthodes de débogage ===

  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  getUniqueUsersCount(): number {
    return this.userSockets.size;
  }

  getConnectionsForUser(userId: number, userType: string): number {
    const userKey = `${userId}_${userType}`;
    return this.userSockets.get(userKey)?.size || 0;
  }

  // === Méthodes d'administration ===

  @SubscribeMessage('admin_get_stats')
  async handleAdminGetStats(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (!user || !this.isUserAdmin(user)) {
      client.emit('error', { message: 'Accès non autorisé' });
      return;
    }

    const stats = {
      totalConnections: this.connectedUsers.size,
      uniqueUsers: this.userSockets.size,
      connectedUsers: this.getOnlineUsers(),
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };

    client.emit('admin_stats', stats);
  }

  @SubscribeMessage('admin_broadcast_message')
  async handleAdminBroadcast(
    @MessageBody() data: { message: string; type: 'info' | 'warning' | 'error' },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user || !this.isUserAdmin(user)) {
      client.emit('error', { message: 'Accès non autorisé' });
      return;
    }

    this.server.emit('admin_broadcast', {
      message: data.message,
      type: data.type,
      timestamp: new Date(),
    });

    this.logger.log(`Admin broadcast sent by ${user.userName}: ${data.message}`);
  }

  // === Méthodes de diffusion pour les mises à jour ===

  private broadcastUnreadCountUpdate(): void {
    console.log('📡 Diffusion mise à jour compteurs non lus');
    
    // Émettre à tous les clients connectés pour qu'ils rechargent leurs conversations
    this.server.emit('unreadCountsUpdated', {
      timestamp: new Date(),
      message: 'Les compteurs de messages non lus ont été mis à jour'
    });
  }

  private isUserAdmin(user: ConnectedUser): boolean {
    // TODO: Implémenter la vérification des droits admin
    return user.userType === 'personnel'; // Simplifié pour le moment
  }

  // === Méthodes de maintenance ===

  async cleanupStaleConnections() {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (now.getTime() - user.lastSeen.getTime() > staleThreshold) {
        this.logger.warn(`Cleaning up stale connection for user ${user.userName} (${socketId})`);
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect();
        } else {
          // La socket n'existe plus, nettoyer manuellement
          this.handleDisconnect({ id: socketId } as Socket);
        }
      }
    }
  }

  // Nettoyer les connexions obsolètes toutes les 10 minutes
  onModuleInit() {
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 10 * 60 * 1000);
  }
}