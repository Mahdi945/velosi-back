import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { UnifiedUserDto, VeChatConversationDto, VeChatMessageDto, CreateConversationDto, SendMessageDto, UserType } from '../dto/vechat-unified.dto';

@Injectable()
export class VeChatUnifiedService {
  private readonly logger = new Logger(VeChatUnifiedService.name);

  constructor(
    @InjectConnection() private connection: Connection,
  ) {}

  /**
   * Récupère tous les utilisateurs accessibles selon les règles métier
   * - Personnel: voit tous les utilisateurs (personnel + clients)
   * - Commercial: voit seulement ses clients assignés (charge_com)
   */
  async getUsersForChat(currentUserId: number, currentUserType: 'personnel' | 'client'): Promise<UnifiedUserDto[]> {
    try {
      let query: string;
      let params: any[] = [];

      if (currentUserType === 'personnel') {
        // Personnel voit tous les utilisateurs
        query = `
          SELECT 
            id, nom, prenom, email, poste, photo, is_chat_enabled,
            'personnel' as user_type, poste as info, 'Personnel' as category
          FROM personnel 
          WHERE id != ? AND (is_chat_enabled IS NULL OR is_chat_enabled = 1)
          
          UNION ALL
          
          SELECT 
            id, NULL as nom, NULL as prenom, email, interlocuteur as poste, photo, is_chat_enabled,
            'client' as user_type, societe as info, 'Client' as category
          FROM client 
          WHERE is_chat_enabled IS NULL OR is_chat_enabled = 1
          
          ORDER BY user_type, info
        `;
        params = [currentUserId];
      } else {
        // Client ne voit que le personnel et éventuellement d'autres clients selon la logique métier
        query = `
          SELECT 
            id, nom, prenom, email, poste, photo, is_chat_enabled,
            'personnel' as user_type, poste as info, 'Personnel' as category
          FROM personnel 
          WHERE (is_chat_enabled IS NULL OR is_chat_enabled = 1)
          
          ORDER BY info
        `;
        params = [];
      }

      const result = await this.connection.query(query, params);
      
      return result.map(row => ({
        id: row.id,
        nom: row.nom,
        prenom: row.prenom,
        interlocuteur: row.poste, // Pour les clients, c'est dans poste
        email: row.email,
        photo: row.photo,
        is_chat_enabled: row.is_chat_enabled !== 0,
        user_type: row.user_type as UserType,
        category: row.category,
        info: row.info,
        isOnline: false, // À implémenter avec WebSocket
        lastSeen: undefined
      }));
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des utilisateurs:', error);
      throw error;
    }
  }

  /**
   * Récupère les détails d'un utilisateur unifié
   */
  async getUserDetails(userId: number, userType: 'personnel' | 'client'): Promise<UnifiedUserDto | null> {
    try {
      let query: string;
      let params: any[] = [userId];

      if (userType === 'personnel') {
        query = `
          SELECT 
            id, nom, prenom, email, poste, photo, is_chat_enabled,
            'personnel' as user_type, poste as info, 'Personnel' as category
          FROM personnel 
          WHERE id = ?
        `;
      } else {
        query = `
          SELECT 
            id, interlocuteur, email, societe, photo, is_chat_enabled, charge_com,
            'client' as user_type, societe as info, 'Client' as category
          FROM client 
          WHERE id = ?
        `;
      }

      const result = await this.connection.query(query, params);
      
      if (!result || result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        id: row.id,
        nom: row.nom,
        prenom: row.prenom,
        interlocuteur: row.interlocuteur,
        email: row.email,
        societe: row.societe,
        charge_com: row.charge_com,
        poste: row.poste,
        photo: row.photo,
        is_chat_enabled: row.is_chat_enabled !== 0,
        user_type: row.user_type as UserType,
        category: row.category,
        info: row.info,
        isOnline: false,
        lastSeen: undefined
      };
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des détails utilisateur:', error);
      throw error;
    }
  }

  /**
   * Récupère les conversations d'un utilisateur
   */
  async getUserConversations(userId: number, userType: 'personnel' | 'client'): Promise<VeChatConversationDto[]> {
    try {
      const query = `
        SELECT 
          c.*,
          CASE 
            WHEN c.participant1_id = ? AND c.participant1_type = ? 
            THEN c.participant2_name 
            ELSE c.participant1_name 
          END as contact_name,
          CASE 
            WHEN c.participant1_id = ? AND c.participant1_type = ? 
            THEN c.participant2_photo 
            ELSE c.participant1_photo 
          END as contact_photo
        FROM vechat_conversations c
        WHERE (c.participant1_id = ? AND c.participant1_type = ?) 
           OR (c.participant2_id = ? AND c.participant2_type = ?)
        ORDER BY c.updated_at DESC
      `;

      const params = [userId, userType, userId, userType, userId, userType, userId, userType];
      const result = await this.connection.query(query, params);

      return result.map(row => ({
        id: row.id,
        participant1_id: row.participant1_id,
        participant1_type: row.participant1_type,
        participant1_name: row.participant1_name,
        participant1_photo: row.participant1_photo,
        participant2_id: row.participant2_id,
        participant2_type: row.participant2_type,
        participant2_name: row.participant2_name,
        participant2_photo: row.participant2_photo,
        last_message: row.last_message,
        last_message_at: row.last_message_at,
        unread_count: row.unread_count || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des conversations:', error);
      throw error;
    }
  }

  /**
   * Crée ou récupère une conversation existante
   */
  async createOrGetConversation(dto: CreateConversationDto): Promise<VeChatConversationDto> {
    try {
      // Vérifier si la conversation existe déjà
      const existingQuery = `
        SELECT * FROM vechat_conversations 
        WHERE (participant1_id = ? AND participant1_type = ? AND participant2_id = ? AND participant2_type = ?)
           OR (participant1_id = ? AND participant1_type = ? AND participant2_id = ? AND participant2_type = ?)
        LIMIT 1
      `;
      
      const existingParams = [
        dto.participant1_id, dto.participant1_type, dto.participant2_id, dto.participant2_type,
        dto.participant2_id, dto.participant2_type, dto.participant1_id, dto.participant1_type
      ];

      const existing = await this.connection.query(existingQuery, existingParams);
      
      if (existing && existing.length > 0) {
        return existing[0];
      }

      // Récupérer les noms et photos des participants
      const participant1 = await this.getUserDetails(dto.participant1_id, dto.participant1_type as any);
      const participant2 = await this.getUserDetails(dto.participant2_id, dto.participant2_type as any);

      const participant1Name = participant1?.interlocuteur || 
                              (participant1?.nom && participant1?.prenom ? 
                               `${participant1.prenom} ${participant1.nom}` : 'Utilisateur');
      
      const participant2Name = participant2?.interlocuteur || 
                              (participant2?.nom && participant2?.prenom ? 
                               `${participant2.prenom} ${participant2.nom}` : 'Utilisateur');

      // Créer la nouvelle conversation
      const insertQuery = `
        INSERT INTO vechat_conversations 
        (participant1_id, participant1_type, participant1_name, participant1_photo,
         participant2_id, participant2_type, participant2_name, participant2_photo,
         created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const insertParams = [
        dto.participant1_id, dto.participant1_type, participant1Name, participant1?.photo,
        dto.participant2_id, dto.participant2_type, participant2Name, participant2?.photo
      ];

      const result = await this.connection.query(insertQuery, insertParams);
      const conversationId = result.insertId;

      // Récupérer la conversation créée
      const newConversation = await this.connection.query(
        'SELECT * FROM vechat_conversations WHERE id = ?',
        [conversationId]
      );

      return newConversation[0];
    } catch (error) {
      this.logger.error('Erreur lors de la création de la conversation:', error);
      throw error;
    }
  }

  /**
   * Envoie un message
   */
  async sendMessage(senderId: number, senderType: 'personnel' | 'client', dto: SendMessageDto): Promise<VeChatMessageDto> {
    try {
      // Récupérer les infos de l'expéditeur
      const sender = await this.getUserDetails(senderId, senderType);
      const senderName = sender?.interlocuteur || 
                        (sender?.nom && sender?.prenom ? 
                         `${sender.prenom} ${sender.nom}` : 'Utilisateur');

      // Insérer le message
      const insertQuery = `
        INSERT INTO vechat_messages 
        (conversation_id, sender_id, sender_type, sender_name, sender_photo,
         content, message_type, file_url, file_name, file_type, file_size,
         created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const insertParams = [
        dto.conversation_id, senderId, senderType, senderName, sender?.photo,
        dto.content, dto.message_type || 'text', dto.file_url, dto.file_name, 
        dto.file_type, dto.file_size
      ];

      const result = await this.connection.query(insertQuery, insertParams);
      const messageId = result.insertId;

      // Mettre à jour la conversation
      await this.connection.query(`
        UPDATE vechat_conversations 
        SET last_message = ?, last_message_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `, [dto.content, dto.conversation_id]);

      // Récupérer le message créé
      const newMessage = await this.connection.query(
        'SELECT * FROM vechat_messages WHERE id = ?',
        [messageId]
      );

      return newMessage[0];
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi du message:', error);
      throw error;
    }
  }

  /**
   * Récupère les messages d'une conversation
   */
  async getConversationMessages(conversationId: number, page: number = 1, limit: number = 50): Promise<VeChatMessageDto[]> {
    try {
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT * FROM vechat_messages 
        WHERE conversation_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;

      const result = await this.connection.query(query, [conversationId, limit, offset]);
      return result.reverse(); // Inverser pour avoir les plus anciens en premier
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des messages:', error);
      throw error;
    }
  }

  /**
   * Marque les messages comme lus
   */
  async markMessagesAsRead(conversationId: number, userId: number, userType: string): Promise<void> {
    try {
      await this.connection.query(`
        UPDATE vechat_messages 
        SET is_read = 1 
        WHERE conversation_id = ? 
          AND sender_id != ? 
          AND sender_type != ?
          AND is_read = 0
      `, [conversationId, userId, userType]);
    } catch (error) {
      this.logger.error('Erreur lors du marquage des messages comme lus:', error);
      throw error;
    }
  }
}