import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { LoginHistory } from '../entities/login-history.entity';

/**
 * 🔌 WebSocket Gateway pour le journal de connexion en temps réel
 * 
 * ÉVÉNEMENTS ÉMIS:
 * - new-login: Nouvelle connexion enregistrée
 * - new-logout: Déconnexion enregistrée
 * - session-update: Mise à jour de session
 * 
 * ÉVÉNEMENTS REÇUS:
 * - subscribe-login-history: S'abonner aux mises à jour
 * - unsubscribe-login-history: Se désabonner des mises à jour
 */
@WebSocketGateway({
  namespace: 'login-history',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class LoginHistoryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LoginHistoryGateway.name);
  private connectedClients = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.logger.log(`✅ Client WebSocket connecté: ${client.id}`);
    this.connectedClients.set(client.id, client);
    
    // Envoyer un message de bienvenue
    client.emit('connected', {
      message: 'Connecté au service de journal de connexion',
      clientId: client.id,
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client WebSocket déconnecté: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  /**
   * S'abonner aux mises à jour du journal de connexion
   */
  @SubscribeMessage('subscribe-login-history')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId?: number; userType?: string },
  ) {
    this.logger.log(`📡 Client ${client.id} s'abonne aux mises à jour du journal`);
    
    // Stocker les préférences d'abonnement dans les données du socket
    client.data.subscribed = true;
    if (data.userId) {
      client.data.userId = data.userId;
    }
    if (data.userType) {
      client.data.userType = data.userType;
    }

    client.emit('subscribed', {
      message: 'Abonné aux mises à jour du journal de connexion',
      userId: data.userId,
      userType: data.userType,
    });
  }

  /**
   * Se désabonner des mises à jour
   */
  @SubscribeMessage('unsubscribe-login-history')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    this.logger.log(`📡 Client ${client.id} se désabonne des mises à jour`);
    client.data.subscribed = false;
    
    client.emit('unsubscribed', {
      message: 'Désabonné des mises à jour du journal de connexion',
    });
  }

  /**
   * 🚀 Diffuser une nouvelle connexion à tous les clients abonnés
   */
  broadcastNewLogin(loginHistory: LoginHistory) {
    this.logger.log(`📢 Diffusion nouvelle connexion: ${loginHistory.username} (#${loginHistory.id})`);
    
    this.server.emit('new-login', {
      id: loginHistory.id,
      userId: loginHistory.user_id,
      userType: loginHistory.user_type,
      username: loginHistory.username,
      fullName: loginHistory.full_name,
      loginTime: loginHistory.login_time,
      ipAddress: loginHistory.ip_address,
      deviceType: loginHistory.device_type,
      browserName: loginHistory.browser_name,
      osName: loginHistory.os_name,
      loginMethod: loginHistory.login_method,
      status: loginHistory.status,
      timestamp: new Date(),
    });
  }

  /**
   * 🚀 Diffuser une déconnexion à tous les clients abonnés
   */
  broadcastNewLogout(loginHistory: LoginHistory) {
    this.logger.log(`📢 Diffusion déconnexion: ${loginHistory.username} (#${loginHistory.id})`);
    
    this.server.emit('new-logout', {
      id: loginHistory.id,
      userId: loginHistory.user_id,
      userType: loginHistory.user_type,
      username: loginHistory.username,
      logoutTime: loginHistory.logout_time,
      sessionDuration: loginHistory.session_duration,
      formattedDuration: loginHistory.getFormattedDuration(),
      timestamp: new Date(),
    });
  }

  /**
   * 🚀 Diffuser une mise à jour de session
   */
  broadcastSessionUpdate(loginHistory: LoginHistory) {
    this.logger.log(`📢 Diffusion mise à jour session: ${loginHistory.username} (#${loginHistory.id})`);
    
    this.server.emit('session-update', {
      id: loginHistory.id,
      userId: loginHistory.user_id,
      userType: loginHistory.user_type,
      username: loginHistory.username,
      sessionDuration: loginHistory.session_duration,
      timestamp: new Date(),
    });
  }

  /**
   * 📊 Obtenir le nombre de clients connectés
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * 📊 Obtenir les statistiques de connexion
   */
  getConnectionStats() {
    const subscribedClients = Array.from(this.connectedClients.values()).filter(
      client => client.data.subscribed
    ).length;

    return {
      totalConnected: this.connectedClients.size,
      subscribed: subscribedClients,
      unsubscribed: this.connectedClients.size - subscribedClients,
    };
  }
}
