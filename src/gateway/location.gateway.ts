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
import { Logger, Injectable } from '@nestjs/common';
import { 
  PersonnelLocationUpdateEvent, 
  PersonnelTrackingStatusEvent 
} from '../dto/location-update.dto';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/location',
})
export class LocationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('LocationGateway');
  private connectedClients = new Map<string, { socket: Socket; userId?: number; role?: string }>();

  afterInit(server: Server) {
    this.logger.log('LocationGateway initialisé');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté: ${client.id}`);
    this.connectedClients.set(client.id, { socket: client });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  /**
   * L'utilisateur s'authentifie et rejoint sa room
   */
  @SubscribeMessage('joinLocationRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: number; role: string; roomType: 'admin' | 'personnel' }
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.userId = data.userId;
      clientInfo.role = data.role;
    }

    // Rejoindre la room appropriée
    if (data.roomType === 'admin') {
      client.join('admin-dashboard');
      this.logger.log(`Admin ${data.userId} a rejoint la room admin-dashboard`);
    } else {
      client.join(`personnel-${data.userId}`);
      this.logger.log(`Personnel ${data.userId} a rejoint sa room personnelle`);
    }

    // Confirmer la connexion
    client.emit('locationRoomJoined', {
      success: true,
      roomType: data.roomType,
      message: 'Connecté au système de géolocalisation en temps réel'
    });
  }

  /**
   * L'utilisateur quitte sa room
   */
  @SubscribeMessage('leaveLocationRoom')
  handleLeaveRoom(@ConnectedSocket() client: Socket) {
    client.leave('admin-dashboard');
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo?.userId) {
      client.leave(`personnel-${clientInfo.userId}`);
    }
    
    client.emit('locationRoomLeft', { success: true });
    this.logger.log(`Client ${client.id} a quitté les rooms de géolocalisation`);
  }

  /**
   * Diffuse une mise à jour de position à tous les administrateurs
   */
  async broadcastLocationUpdate(locationData: PersonnelLocationUpdateEvent): Promise<void> {
    this.server.to('admin-dashboard').emit('personnelLocationUpdate', {
      type: 'location_update',
      data: locationData,
      timestamp: new Date().toISOString()
    });

    // Envoyer aussi à l'utilisateur lui-même s'il est connecté
    this.server.to(`personnel-${locationData.personnelId}`).emit('myLocationUpdate', {
      type: 'my_location_update',
      data: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        source: locationData.source,
        timestamp: locationData.timestamp,
        isActive: locationData.isActive
      }
    });

    this.logger.log(`Position diffusée pour le personnel ${locationData.personnelId}`);
  }

  /**
   * Diffuse un changement de statut de tracking
   */
  async broadcastTrackingStatusUpdate(statusData: PersonnelTrackingStatusEvent): Promise<void> {
    this.server.to('admin-dashboard').emit('personnelTrackingStatus', {
      type: 'tracking_status_update',
      data: statusData,
      timestamp: new Date().toISOString()
    });

    // Notifier l'utilisateur du changement de statut
    this.server.to(`personnel-${statusData.personnelId}`).emit('myTrackingStatus', {
      type: 'my_tracking_status',
      data: {
        trackingEnabled: statusData.trackingEnabled,
        message: statusData.trackingEnabled 
          ? 'Suivi GPS activé' 
          : 'Suivi GPS désactivé'
      }
    });

    this.logger.log(`Statut de tracking diffusé pour le personnel ${statusData.personnelId}`);
  }

  /**
   * Diffuse les statistiques de géolocalisation aux administrateurs
   */
  async broadcastLocationStats(stats: any): Promise<void> {
    this.server.to('admin-dashboard').emit('locationStats', {
      type: 'location_stats',
      data: stats,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Demande de mise à jour de position (utilisé par les admins)
   */
  @SubscribeMessage('requestLocationUpdate')
  handleLocationUpdateRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { personnelId: number }
  ) {
    // Demander à l'utilisateur spécifique de mettre à jour sa position
    this.server.to(`personnel-${data.personnelId}`).emit('locationUpdateRequested', {
      type: 'location_update_requested',
      message: 'Veuillez mettre à jour votre position',
      requestedBy: 'admin',
      timestamp: new Date().toISOString()
    });

    this.logger.log(`Demande de mise à jour de position envoyée au personnel ${data.personnelId}`);
  }

  /**
   * Diffuse une alerte de géolocalisation
   */
  async broadcastLocationAlert(alert: {
    type: 'geofence_exit' | 'inactive_too_long' | 'location_disabled';
    personnelId: number;
    personnelName: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }): Promise<void> {
    this.server.to('admin-dashboard').emit('locationAlert', {
      type: 'location_alert',
      data: alert,
      timestamp: new Date().toISOString()
    });

    this.logger.warn(`Alerte de géolocalisation: ${alert.message} (Personnel ${alert.personnelId})`);
  }

  /**
   * Obtient le nombre de clients connectés
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Obtient les statistiques de connexion
   */
  getConnectionStats(): {
    totalConnected: number;
    adminConnected: number;
    personnelConnected: number;
  } {
    let adminCount = 0;
    let personnelCount = 0;

    this.connectedClients.forEach(client => {
      if (client.role === 'admin' || client.role === 'administratif') {
        adminCount++;
      } else if (client.userId) {
        personnelCount++;
      }
    });

    return {
      totalConnected: this.connectedClients.size,
      adminConnected: adminCount,
      personnelConnected: personnelCount
    };
  }

  /**
   * Force la déconnexion d'un client spécifique
   */
  disconnectPersonnel(personnelId: number): void {
    this.connectedClients.forEach((client, socketId) => {
      if (client.userId === personnelId) {
        client.socket.emit('forceDisconnect', {
          reason: 'Déconnexion forcée par l\'administrateur',
          timestamp: new Date().toISOString()
        });
        client.socket.disconnect(true);
        this.logger.log(`Personnel ${personnelId} déconnecté de force`);
      }
    });
  }
}