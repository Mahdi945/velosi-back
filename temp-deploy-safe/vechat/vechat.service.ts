import { Injectable, Scope, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, DataSource } from 'typeorm';
import { 
  VechatMessage, 
  VechatConversation, 
  VechatPresence, 
  VechatUserSettings
} from './entities';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';
import { CreateMessageDto, UpdateMessageDto } from './dto/vechat.dto';
import { DatabaseConnectionService } from '../common/database-connection.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable({ scope: Scope.REQUEST })
export class VechatService {
  constructor(
    private databaseConnectionService: DatabaseConnectionService,
  ) {}

  // 🏢 M\u00e9thode helper pour obtenir les repositories dynamiques
  private async getRepositories(databaseName: string) {
    const connection = await this.databaseConnectionService.getOrganisationConnection(databaseName);
    
    return {
      messageRepository: connection.getRepository(VechatMessage),
      conversationRepository: connection.getRepository(VechatConversation),
      presenceRepository: connection.getRepository(VechatPresence),
      userSettingsRepository: connection.getRepository(VechatUserSettings),
      personnelRepository: connection.getRepository(Personnel),
      clientRepository: connection.getRepository(Client),
    };
  }

  // === Service Conversations ===

  async getUserConversations(
    userId: number, 
    userType: 'personnel' | 'client', 
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [getUserConversations] DB: ${databaseName}, Org: ${organisationId}, User: ${userId}, Type: ${userType}`);
    
    // Vérifier les permissions
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository, messageRepository } = await this.getRepositories(databaseName);

    const conversations = await conversationRepository.find({
      where: [
        {
          participant1_id: userId,
          participant1_type: userType,
        },
        {
          participant2_id: userId,
          participant2_type: userType,
        }
      ],
      order: { last_message_at: 'DESC' }
    });

    // Enrichir avec les informations des participants
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const participant1 = await this.getUserDetails(conv.participant1_id, conv.participant1_type, databaseName);
        const participant2 = await this.getUserDetails(conv.participant2_id, conv.participant2_type, databaseName);
        const lastMessage = conv.last_message_id ? 
          await messageRepository.findOne({ where: { id: conv.last_message_id } }) : null;

        return {
          ...conv,
          participant1_name: participant1 ? `${participant1.prenom} ${participant1.nom}` : null,
          participant1_avatar: participant1?.chat_avatar || participant1?.avatar,
          participant2_name: participant2 ? `${participant2.prenom} ${participant2.nom}` : null,
          participant2_avatar: participant2?.chat_avatar || participant2?.avatar,
          last_message_text: lastMessage?.message,
          last_message_type: lastMessage?.message_type,
        };
      })
    );

    console.log(`📊 [getUserConversations] Récupéré ${enrichedConversations.length} conversations`);
    return enrichedConversations;
  }

  async createOrGetConversation(
    participant1Id: number,
    participant1Type: 'personnel' | 'client',
    participant2Id: number,
    participant2Type: 'personnel' | 'client',
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [createOrGetConversation] DB: ${databaseName}, Org: ${organisationId}`);
    
    // Vérifier les permissions
    if (!this.canAccessUser(currentUser, participant1Id, participant1Type) &&
        !this.canAccessUser(currentUser, participant2Id, participant2Type)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository } = await this.getRepositories(databaseName);

    // Normaliser l'ordre des participants
    let normalizedParticipant1Id = participant1Id;
    let normalizedParticipant1Type = participant1Type;
    let normalizedParticipant2Id = participant2Id;
    let normalizedParticipant2Type = participant2Type;

    if (participant1Id > participant2Id || 
        (participant1Id === participant2Id && participant1Type > participant2Type)) {
      normalizedParticipant1Id = participant2Id;
      normalizedParticipant1Type = participant2Type;
      normalizedParticipant2Id = participant1Id;
      normalizedParticipant2Type = participant1Type;
    }

    // Chercher une conversation existante
    let conversation = await conversationRepository.findOne({
      where: {
        participant1_id: normalizedParticipant1Id,
        participant1_type: normalizedParticipant1Type,
        participant2_id: normalizedParticipant2Id,
        participant2_type: normalizedParticipant2Type,
      }
    });

    if (!conversation) {
      // Créer une nouvelle conversation
      conversation = conversationRepository.create({
        participant1_id: normalizedParticipant1Id,
        participant1_type: normalizedParticipant1Type,
        participant2_id: normalizedParticipant2Id,
        participant2_type: normalizedParticipant2Type,
        unread_count_participant1: 0,
        unread_count_participant2: 0,
        is_archived_by_participant1: false,
        is_archived_by_participant2: false,
        is_muted_by_participant1: false,
        is_muted_by_participant2: false,
      });

      conversation = await conversationRepository.save(conversation);
      console.log(`✅ [createOrGetConversation] Nouvelle conversation créée: ${conversation.id}`);
    } else {
      console.log(`📋 [createOrGetConversation] Conversation existante: ${conversation.id}`);
    }

    return conversation;
  }

  async archiveConversation(
    conversationId: number,
    userId: number,
    userType: 'personnel' | 'client',
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [archiveConversation] DB: ${databaseName}, Org: ${organisationId}`);
    
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository } = await this.getRepositories(databaseName);

    const conversation = await conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    // Déterminer si l'utilisateur est participant1 ou participant2
    const isParticipant1 = conversation.participant1_id === userId && 
                          conversation.participant1_type === userType;
    const isParticipant2 = conversation.participant2_id === userId && 
                          conversation.participant2_type === userType;

    if (!isParticipant1 && !isParticipant2) {
      throw new ForbiddenException('Vous n\'êtes pas participant à cette conversation');
    }

    if (isParticipant1) {
      conversation.is_archived_by_participant1 = true;
    } else {
      conversation.is_archived_by_participant2 = true;
    }

    return await conversationRepository.save(conversation);
  }

  async muteConversation(
    conversationId: number,
    userId: number,
    userType: 'personnel' | 'client',
    muted: boolean,
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [muteConversation] DB: ${databaseName}, Org: ${organisationId}`);
    
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository } = await this.getRepositories(databaseName);

    const conversation = await conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    const isParticipant1 = conversation.participant1_id === userId && 
                          conversation.participant1_type === userType;
    const isParticipant2 = conversation.participant2_id === userId && 
                          conversation.participant2_type === userType;

    if (!isParticipant1 && !isParticipant2) {
      throw new ForbiddenException('Vous n\'êtes pas participant à cette conversation');
    }

    if (isParticipant1) {
      conversation.is_muted_by_participant1 = muted;
    } else {
      conversation.is_muted_by_participant2 = muted;
    }

    return await conversationRepository.save(conversation);
  }

  async resetUnreadCount(
    conversationId: number,
    userId: number,
    userType: 'personnel' | 'client',
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [resetUnreadCount] DB: ${databaseName}, Org: ${organisationId}`);
    
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository, messageRepository } = await this.getRepositories(databaseName);

    const conversation = await conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    const isParticipant1 = conversation.participant1_id === userId && 
                          conversation.participant1_type === userType;
    const isParticipant2 = conversation.participant2_id === userId && 
                          conversation.participant2_type === userType;

    if (!isParticipant1 && !isParticipant2) {
      throw new ForbiddenException('Vous n\'êtes pas participant à cette conversation');
    }

    console.log(`🔄 RESET UNREAD COUNT - État AVANT:`, {
      conversationId,
      userId,
      userType,
      isParticipant1,
      currentCount1: conversation.unread_count_participant1,
      currentCount2: conversation.unread_count_participant2
    });

    // Remettre à zéro le compteur de messages non lus pour l'utilisateur
    if (isParticipant1) {
      conversation.unread_count_participant1 = 0;
      console.log(`✅ Compteur participant1 remis à zéro pour conversation ${conversationId}`);
    } else {
      conversation.unread_count_participant2 = 0;
      console.log(`✅ Compteur participant2 remis à zéro pour conversation ${conversationId}`);
    }

    const savedConversation = await conversationRepository.save(conversation);
    
    console.log(`📊 RESET UNREAD COUNT - État APRÈS sauvegarde:`, {
      conversationId,
      savedCount1: savedConversation.unread_count_participant1,
      savedCount2: savedConversation.unread_count_participant2
    });
    
    // Également marquer tous les messages reçus par cet utilisateur comme lus
    // Nous identifions les messages de cette conversation en utilisant les participants
    const otherParticipantId = isParticipant1 ? conversation.participant2_id : conversation.participant1_id;
    const otherParticipantType = isParticipant1 ? conversation.participant2_type : conversation.participant1_type;

    // Compter d'abord combien de messages vont être marqués comme lus
    const messagesToMarkRead = await messageRepository.count({
      where: {
        sender_id: otherParticipantId,
        sender_type: otherParticipantType,
        receiver_id: userId,
        receiver_type: userType,
        is_read: false
      }
    });

    console.log(`🔄 MARQUAGE MESSAGES - ${messagesToMarkRead} messages à marquer comme lus`);

    const updateResult = await messageRepository.update(
      {
        sender_id: otherParticipantId,
        sender_type: otherParticipantType,
        receiver_id: userId,
        receiver_type: userType,
        is_read: false
      },
      {
        is_read: true,
        read_at: new Date()
      }
    );

    console.log(`✅ MARQUAGE MESSAGES - ${updateResult.affected} messages marqués comme lus`);

    console.log(`🔄 Compteurs et messages marqués comme lus pour conversation ${conversationId}, utilisateur ${userId}`);
    
    return savedConversation;
  }

  async deleteConversation(
    conversationId: number, 
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [deleteConversation] DB: ${databaseName}, Org: ${organisationId}`);
    
    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository, messageRepository } = await this.getRepositories(databaseName);
    
    const conversation = await conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    // Seuls les participants peuvent supprimer la conversation
    const canDelete = this.canAccessUser(currentUser, conversation.participant1_id, conversation.participant1_type) ||
                     this.canAccessUser(currentUser, conversation.participant2_id, conversation.participant2_type);

    if (!canDelete) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Supprimer tous les messages de la conversation
    await messageRepository.delete({
      sender_id: In([conversation.participant1_id, conversation.participant2_id]),
      receiver_id: In([conversation.participant1_id, conversation.participant2_id])
    });

    // Supprimer la conversation
    await conversationRepository.delete(conversationId);

    return { success: true };
  }

  // === Service Messages ===

  async getConversationMessages(
    conversationId: number,
    page: number = 1,
    limit: number = 50,
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [getConversationMessages] DB: ${databaseName}, Org: ${organisationId}, Conversation: ${conversationId}`);
    
    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository, messageRepository } = await this.getRepositories(databaseName);
    
    const conversation = await conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    // Vérifier l'accès
    const canAccess = this.canAccessUser(currentUser, conversation.participant1_id, conversation.participant1_type) ||
                     this.canAccessUser(currentUser, conversation.participant2_id, conversation.participant2_type);

    if (!canAccess) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const messages = await messageRepository.find({
      where: [
        {
          sender_id: conversation.participant1_id,
          sender_type: conversation.participant1_type,
          receiver_id: conversation.participant2_id,
          receiver_type: conversation.participant2_type,
        },
        {
          sender_id: conversation.participant2_id,
          sender_type: conversation.participant2_type,
          receiver_id: conversation.participant1_id,
          receiver_type: conversation.participant1_type,
        }
      ],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Enrichir avec les informations des expéditeurs
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        const sender = await this.getUserDetails(message.sender_id, message.sender_type, databaseName);
        const receiver = await this.getUserDetails(message.receiver_id, message.receiver_type, databaseName);

        return {
          ...message,
          sender_name: sender ? `${sender.prenom} ${sender.nom}` : null,
          sender_avatar: sender?.chat_avatar || sender?.avatar,
          receiver_name: receiver ? `${receiver.prenom} ${receiver.nom}` : null,
          receiver_avatar: receiver?.chat_avatar || receiver?.avatar,
          // Ajouter les données enrichies pour les messages spéciaux
          location_data: message.location_latitude && message.location_longitude ? {
            latitude: message.location_latitude,
            longitude: message.location_longitude,
            accuracy: message.location_accuracy
          } : undefined,
          audio_metadata: message.message_type === 'audio' ? {
            duration: message.audio_duration,
            waveform: message.audio_waveform
          } : undefined
        };
      })
    );

    console.log(`📊 [getConversationMessages] Récupéré ${enrichedMessages.length} messages`);
    return enrichedMessages.reverse(); // Retourner dans l'ordre chronologique
  }

  async sendMessage(
    createMessageDto: CreateMessageDto, 
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [sendMessage] DB: ${databaseName}, Org: ${organisationId}`);
    
    // Déterminer le type et l'ID de l'expéditeur
    const senderType = currentUser.userType || 'personnel';
    const senderId = currentUser.id;

    // Vérifier l'accès
    if (!this.canAccessUser(currentUser, senderId, senderType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🔄 Obtenir les repositories dynamiques
    const { messageRepository } = await this.getRepositories(databaseName);

    // Vérifier que le destinataire existe
    const receiver = await this.getUserDetails(createMessageDto.receiver_id, createMessageDto.receiver_type, databaseName);
    if (!receiver) {
      throw new NotFoundException('Destinataire non trouvé');
    }

    // Valider les données spécifiques selon le type de message
    await this.validateMessageData(createMessageDto);

    // Créer le message avec les nouveaux champs
    const messageData = {
      sender_id: senderId,
      sender_type: senderType,
      receiver_id: createMessageDto.receiver_id,
      receiver_type: createMessageDto.receiver_type,
      message: createMessageDto.message,
      message_type: createMessageDto.message_type || 'text',
      file_url: createMessageDto.file_url,
      file_name: createMessageDto.file_name,
      file_size: createMessageDto.file_size,
      file_type: createMessageDto.file_type,
      reply_to_message_id: createMessageDto.reply_to_message_id,
      is_read: false,
      is_deleted_by_sender: false,
      is_deleted_by_receiver: false,
    };

    // Ajouter les données de localisation si c'est un message de localisation
    if (createMessageDto.message_type === 'location' && createMessageDto.location_data) {
      messageData['location_latitude'] = createMessageDto.location_data.latitude;
      messageData['location_longitude'] = createMessageDto.location_data.longitude;
      messageData['location_accuracy'] = createMessageDto.location_data.accuracy;
    }

    // Ajouter les données audio si c'est un message audio
    if (createMessageDto.message_type === 'audio') {
      messageData['audio_duration'] = createMessageDto.audio_duration;
      messageData['audio_waveform'] = createMessageDto.audio_waveform;
    }

    const message = messageRepository.create(messageData);

    const savedMessage = await messageRepository.save(message);

    // Mettre à jour ou créer la conversation
    await this.updateConversationAfterMessage(savedMessage, databaseName);

    // Enrichir le message avec les détails
    const sender = await this.getUserDetails(senderId, senderType, databaseName);
    const enrichedMessage = {
      ...savedMessage,
      sender_name: sender ? `${sender.prenom} ${sender.nom}` : null,
      sender_avatar: sender?.chat_avatar || sender?.avatar,
      receiver_name: receiver ? `${receiver.prenom} ${receiver.nom}` : null,
      receiver_avatar: receiver?.chat_avatar || receiver?.avatar,
      // Ajouter les données enrichies pour les messages spéciaux
      location_data: savedMessage.location_latitude && savedMessage.location_longitude ? {
        latitude: savedMessage.location_latitude,
        longitude: savedMessage.location_longitude,
        accuracy: savedMessage.location_accuracy
      } : undefined,
      audio_metadata: savedMessage.message_type === 'audio' ? {
        duration: savedMessage.audio_duration,
        waveform: savedMessage.audio_waveform
      } : undefined
    };

    console.log(`✅ [sendMessage] Message créé: ${savedMessage.id}`);

    // Émettre via WebSocket - géré par le gateway
    // this.vechatGateway.handleNewMessage(enrichedMessage);

    return enrichedMessage;
  }

  async updateMessage(
    messageId: number, 
    updateMessageDto: UpdateMessageDto, 
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [updateMessage] DB: ${databaseName}, Org: ${organisationId}`);
    
    // 🔄 Obtenir les repositories dynamiques
    const { messageRepository } = await this.getRepositories(databaseName);
    
    const message = await messageRepository.findOne({
      where: { id: messageId }
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    // Seul l'expéditeur peut modifier le message
    if (!this.canAccessUser(currentUser, message.sender_id, message.sender_type)) {
      throw new ForbiddenException('Seul l\'expéditeur peut modifier ce message');
    }

    // Sauvegarder le message original si c'est la première modification
    if (!message.is_edited) {
      message.original_message = message.message;
      message.is_edited = true;
      message.edited_at = new Date();
    }

    message.message = updateMessageDto.message;
    message.updated_at = new Date();

    const updatedMessage = await messageRepository.save(message);

    console.log(`✅ Message ${messageId} modifié par l'expéditeur`);

    // Émettre via WebSocket - géré par le gateway
    // this.vechatGateway.handleMessageUpdated(updatedMessage);

    return updatedMessage;
  }

  async deleteMessage(
    messageId: number,
    userId: number,
    userType: 'personnel' | 'client',
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [deleteMessage] DB: ${databaseName}, Org: ${organisationId}`);
    
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🔄 Obtenir les repositories dynamiques
    const { messageRepository } = await this.getRepositories(databaseName);

    const message = await messageRepository.findOne({
      where: { id: messageId }
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    // Seul l'expéditeur peut supprimer définitivement son message
    if (message.sender_id === userId && message.sender_type === userType) {
      // Suppression définitive du message pour l'expéditeur
      await messageRepository.remove(message);
      console.log(`✅ Message ${messageId} supprimé définitivement par l'expéditeur`);
    } else if (message.receiver_id === userId && message.receiver_type === userType) {
      // Masquer seulement pour le destinataire
      message.is_deleted_by_receiver = true;
      await messageRepository.save(message);
      console.log(`✅ Message ${messageId} masqué pour le destinataire`);
    } else {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages');
    }

    // Émettre via WebSocket - géré par le gateway
    // this.vechatGateway.handleMessageDeleted(message);

    return { success: true };
  }

  async markMessagesAsRead(
    messageIds: number[], 
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log('🔄 Backend - Marquage messages comme lus:', messageIds);
    console.log(`🏢 [markMessagesAsRead] DB: ${databaseName}, Org: ${organisationId}`);
    
    // 🔄 Obtenir les repositories dynamiques
    const { messageRepository } = await this.getRepositories(databaseName);
    
    const messages = await messageRepository.find({
      where: { id: In(messageIds) }
    });

    const updatedMessages = [];
    const conversationsToUpdate = new Set<number>();

    for (const message of messages) {
      // Seul le destinataire peut marquer comme lu
      if (this.canAccessUser(currentUser, message.receiver_id, message.receiver_type)) {
        message.is_read = true;
        message.read_at = new Date();
        await messageRepository.save(message);
        updatedMessages.push(message);

        // Collecter les conversations à mettre à jour
        const conversation = await this.getConversationForMessage(message, databaseName);
        if (conversation) {
          conversationsToUpdate.add(conversation.id);
        }
      }
    }

    // Mettre à jour les compteurs des conversations
    for (const conversationId of conversationsToUpdate) {
      await this.updateUnreadCountersForConversation(conversationId, databaseName);
    }

    console.log('✅ Backend - Messages marqués comme lus:', updatedMessages.length);
    return { success: true, updatedCount: updatedMessages.length };
  }

  // Méthode publique pour obtenir la conversation d'un message
  async getConversationForMessage(
    message: VechatMessage,
    databaseName: string
  ): Promise<VechatConversation | null> {
    const { conversationRepository } = await this.getRepositories(databaseName);
    
    return await conversationRepository.findOne({
      where: [
        {
          participant1_id: message.sender_id,
          participant1_type: message.sender_type,
          participant2_id: message.receiver_id,
          participant2_type: message.receiver_type,
        },
        {
          participant1_id: message.receiver_id,
          participant1_type: message.receiver_type,
          participant2_id: message.sender_id,
          participant2_type: message.sender_type,
        }
      ]
    });
  }

  // Nouvelle méthode pour mettre à jour les compteurs d'une conversation
  private async updateUnreadCountersForConversation(
    conversationId: number,
    databaseName: string
  ): Promise<void> {
    console.log('🔄 Mise à jour compteurs conversation:', conversationId);
    
    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository, messageRepository } = await this.getRepositories(databaseName);
    
    const conversation = await conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      console.log('⚠️ Conversation non trouvée:', conversationId);
      return;
    }

    // Compter les messages non lus pour chaque participant de manière optimisée
    const [unreadCountParticipant1, unreadCountParticipant2] = await Promise.all([
      messageRepository.count({
        where: {
          receiver_id: conversation.participant1_id,
          receiver_type: conversation.participant1_type,
          is_read: false,
          sender_id: conversation.participant2_id,
          sender_type: conversation.participant2_type,
        }
      }),
      messageRepository.count({
        where: {
          receiver_id: conversation.participant2_id,
          receiver_type: conversation.participant2_type,
          is_read: false,
          sender_id: conversation.participant1_id,
          sender_type: conversation.participant1_type,
        }
      })
    ]);

    // Seulement mettre à jour si les compteurs ont changé
    const hasChanged = conversation.unread_count_participant1 !== unreadCountParticipant1 ||
                      conversation.unread_count_participant2 !== unreadCountParticipant2;

    if (hasChanged) {
      conversation.unread_count_participant1 = unreadCountParticipant1;
      conversation.unread_count_participant2 = unreadCountParticipant2;

      await conversationRepository.save(conversation);
      
      console.log('✅ Compteurs mis à jour:', {
        conversationId,
        participant1: unreadCountParticipant1,
        participant2: unreadCountParticipant2
      });
    } else {
      console.log('📊 Compteurs déjà à jour:', {
        conversationId,
        participant1: unreadCountParticipant1,
        participant2: unreadCountParticipant2
      });
    }
  }

  async clearConversationMessages(
    conversationId: number, 
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [clearConversationMessages] DB: ${databaseName}, Org: ${organisationId}`);
    
    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository, messageRepository } = await this.getRepositories(databaseName);
    
    const conversation = await conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    // Vérifier l'accès
    const canAccess = this.canAccessUser(currentUser, conversation.participant1_id, conversation.participant1_type) ||
                     this.canAccessUser(currentUser, conversation.participant2_id, conversation.participant2_type);

    if (!canAccess) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Supprimer tous les messages de la conversation
    await messageRepository.delete({
      sender_id: In([conversation.participant1_id, conversation.participant2_id]),
      receiver_id: In([conversation.participant1_id, conversation.participant2_id]),
    });

    // Réinitialiser les compteurs de la conversation
    conversation.last_message_id = null;
    conversation.last_message_at = null;
    conversation.unread_count_participant1 = 0;
    conversation.unread_count_participant2 = 0;

    await conversationRepository.save(conversation);

    return { success: true, clearedCount: 0 }; // TODO: retourner le nombre réel de messages supprimés
  }

  async searchMessages(
    conversationId: number,
    query: string,
    page: number = 1,
    limit: number = 20,
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [searchMessages] DB: ${databaseName}, Org: ${organisationId}`);
    
    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository, messageRepository } = await this.getRepositories(databaseName);
    
    const conversation = await conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    // Vérifier l'accès
    const canAccess = this.canAccessUser(currentUser, conversation.participant1_id, conversation.participant1_type) ||
                     this.canAccessUser(currentUser, conversation.participant2_id, conversation.participant2_type);

    if (!canAccess) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const messages = await messageRepository.find({
      where: [
        {
          sender_id: conversation.participant1_id,
          sender_type: conversation.participant1_type,
          receiver_id: conversation.participant2_id,
          receiver_type: conversation.participant2_type,
          message: Like(`%${query}%`),
        },
        {
          sender_id: conversation.participant2_id,
          sender_type: conversation.participant2_type,
          receiver_id: conversation.participant1_id,
          receiver_type: conversation.participant1_type,
          message: Like(`%${query}%`),
        }
      ],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return messages;
  }

  // === Service Upload ===

  async uploadFile(
    file: Express.Multer.File,
    receiverId: number,
    receiverType: 'personnel' | 'client',
    messageType: 'image' | 'file' | 'video' | 'audio',
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [uploadFile] DB: ${databaseName}, Org: ${organisationId}`);
    
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Vérifier la taille du fichier (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Fichier trop volumineux (max 10MB)');
    }

    // Déterminer le sous-dossier selon le type de fichier
    let subFolder = 'files'; // par défaut
    if (messageType === 'image') {
      subFolder = 'images';
    } else if (messageType === 'video') {
      subFolder = 'videos';
    } else if (messageType === 'audio') {
      subFolder = 'audio';
    }

    // Créer le répertoire de stockage si nécessaire
    const uploadDir = path.join(process.cwd(), 'uploads', 'vechat', subFolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Sauvegarder le fichier
    if (file.buffer) {
      // Si le fichier est en mémoire (storage: memoryStorage)
      fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
      // Si le fichier est temporaire sur disque (dest: './uploads/vechat')
      fs.copyFileSync(file.path, filePath);
      // Supprimer le fichier temporaire
      fs.unlinkSync(file.path);
    } else {
      throw new BadRequestException('Données de fichier invalides');
    }

    // URL d'accès au fichier via l'endpoint sécurisé
    const backendUrl = process.env.BACKEND_URL || process.env.API_BASE_URL || 'http://localhost:3000';
    const fileUrl = `${backendUrl}/api/vechat/files/${subFolder}/${fileName}`;

    // Créer le message avec le fichier
    const messageData: CreateMessageDto = {
      receiver_id: receiverId,
      receiver_type: receiverType,
      message_type: messageType,
      file_url: fileUrl,
      file_name: file.originalname,
      file_size: file.size,
      file_type: file.mimetype,
    };

    const message = await this.sendMessage(messageData, currentUser, databaseName, organisationId);

    return {
      success: true,
      message,
      file_url: fileUrl,
    };
  }

  async uploadVoiceMessage(
    file: Express.Multer.File,
    receiverId: number,
    receiverType: 'personnel' | 'client',
    duration: number,
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [uploadVoiceMessage] DB: ${databaseName}, Org: ${organisationId}`);
    
    if (!file) {
      throw new BadRequestException('Aucun fichier audio fourni');
    }

    // Vérifier que c'est bien un fichier audio
    if (!file.mimetype.startsWith('audio/')) {
      throw new BadRequestException('Le fichier doit être un fichier audio');
    }

    // Vérifier la taille du fichier (5MB max pour l'audio)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('Fichier audio trop volumineux (max 5MB)');
    }

    // Créer le répertoire de stockage audio si nécessaire
    const uploadDir = path.join(process.cwd(), 'uploads', 'vechat', 'audio');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Sauvegarder le fichier
    if (file.buffer) {
      fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, filePath);
      fs.unlinkSync(file.path);
    } else {
      throw new BadRequestException('Données de fichier invalides');
    }

    // URL d'accès au fichier via l'endpoint sécurisé
    const fileUrl = `http://localhost:3000/api/vechat/files/audio/${fileName}`;

    // Créer le message audio avec les métadonnées
    const messageData: CreateMessageDto = {
      receiver_id: receiverId,
      receiver_type: receiverType,
      message: `Message vocal (${this.formatDuration(duration)})`,
      message_type: 'audio',
      file_url: fileUrl,
      file_name: file.originalname,
      file_size: file.size,
      file_type: file.mimetype,
      audio_duration: duration,
    };

    const message = await this.sendMessage(messageData, currentUser, databaseName, organisationId);

    return {
      success: true,
      message,
      file_url: fileUrl,
    };
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // === Service Contacts ===

  async searchContacts(
    query: string, 
    type: 'personnel' | 'client', 
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log('🔍 [searchContacts] Recherche contacts avec règles de visibilité:', {
      database: databaseName,
      organisationId,
      currentUser: currentUser.id,
      currentUserType: currentUser.userType || 'personnel',
      searchType: type,
      query
    });

    const currentUserType = currentUser.userType || 'personnel';
    const isAdminOrComm = this.isAdminOrCommercial(currentUser);

    let results = [];

    if (currentUserType === 'personnel') {
      if (isAdminOrComm) {
        // Admin/Commercial peuvent voir tout le monde
        if (type === 'personnel') {
          // Admin recherche personnel : retourner personnel + clients pour éviter confusion
          const personnel = await this.getPersonnelContacts(query, currentUser, databaseName);
          const clients = await this.getClientContacts(query, currentUser, databaseName);
          results = [...personnel, ...clients];
          console.log('👨‍💼 Admin/Commercial - Récupération complète:', {
            personnel: personnel.length,
            clients: clients.length,
            total: results.length
          });
        } else if (type === 'client') {
          results = await this.getClientContacts(query, currentUser, databaseName);
        } else {
          // Récupérer les deux types
          const personnel = await this.getPersonnelContacts(query, currentUser, databaseName);
          const clients = await this.getClientContacts(query, currentUser, databaseName);
          results = [...personnel, ...clients];
        }
      } else {
        // Autres rôles personnel : seulement le personnel
        if (type === 'personnel' || !type) {
          results = await this.getPersonnelContacts(query, currentUser, databaseName);
        }
        // Pas de clients pour les autres rôles
      }
    } else if (currentUserType === 'client') {
      // Clients : seulement leur commercial
      if (type === 'personnel' || !type) {
        results = await this.getCommercialForClient(currentUser.id, query, databaseName);
      }
      // Les clients ne voient pas d'autres clients
    }

    console.log('📋 Contacts trouvés:', results.length);
    return results;
  }

  async getAvailableContacts(
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log('📞 [getAvailableContacts] Récupération contacts disponibles pour:', {
      database: databaseName,
      organisationId,
      userId: currentUser.id,
      userType: currentUser.userType || 'personnel'
    });

    const currentUserType = currentUser.userType || 'personnel';
    const isAdminOrComm = this.isAdminOrCommercial(currentUser);

    let availableContacts = {
      personnel: [],
      clients: []
    };

    if (currentUserType === 'personnel') {
      if (isAdminOrComm) {
        // Admin/Commercial voient tout le monde
        availableContacts.personnel = await this.getPersonnelContacts('', currentUser, databaseName);
        availableContacts.clients = await this.getClientContacts('', currentUser, databaseName);
      } else {
        // Autres rôles personnel : seulement le personnel
        availableContacts.personnel = await this.getPersonnelContacts('', currentUser, databaseName);
      }
    } else if (currentUserType === 'client') {
      // Clients : seulement leur commercial
      availableContacts.personnel = await this.getCommercialForClient(currentUser.id, '', databaseName);
    }

    console.log('📊 Contacts disponibles:', {
      personnel: availableContacts.personnel.length,
      clients: availableContacts.clients.length
    });

    return availableContacts;
  }

  private async getPersonnelContacts(query: string, currentUser: any, databaseName: string): Promise<any[]> {
    console.log(`🔍 [getPersonnelContacts] Récupération personnel depuis ${databaseName}`);
    
    try {
      const { personnelRepository } = await this.getRepositories(databaseName);
      
      // Construction de la requête
      const queryBuilder = personnelRepository.createQueryBuilder('personnel')
        .where('personnel.id != :currentId', { currentId: currentUser.id })
        .andWhere('personnel.statut = :statut', { statut: 'actif' });
      
      // Filtre de recherche si query fourni
      if (query) {
        queryBuilder.andWhere(
          '(personnel.nom ILIKE :query OR personnel.prenom ILIKE :query OR personnel.email ILIKE :query OR personnel.nom_utilisateur ILIKE :query)',
          { query: `%${query}%` }
        );
      }
      
      const personnelList = await queryBuilder
        .select([
          'personnel.id',
          'personnel.nom',
          'personnel.prenom',
          'personnel.email',
          'personnel.role',
          'personnel.nom_utilisateur',
          'personnel.photo',
        ])
        .orderBy('personnel.nom', 'ASC')
        .getMany();
      
      const results = personnelList.map(p => ({
        id: p.id,
        nom: p.nom,
        prenom: p.prenom,
        email: p.email,
        poste: p.role, // Utiliser role car poste n'existe pas
        role: p.role,
        photo: p.photo || null, // Champ photo pour le frontend
        chat_avatar: p.photo || null, // Utiliser photo car chat_avatar/avatar n'existent pas
        is_chat_enabled: true,
        user_type: 'personnel'
      }));
      
      console.log(`✅ [getPersonnelContacts] Récupéré ${results.length} membres du personnel`);
      return results;
    } catch (error) {
      console.error(`❌ [getPersonnelContacts] Erreur:`, error);
      return [];
    }
  }

  private async getClientContacts(query: string, currentUser: any, databaseName: string): Promise<any[]> {
    console.log(`🔍 [getClientContacts] Récupération clients depuis ${databaseName}`, {
      currentUser: currentUser.id,
      query,
      isAdminOrComm: this.isAdminOrCommercial(currentUser)
    });

    try {
      const { clientRepository } = await this.getRepositories(databaseName);
      
      // Construction de la requête
      const queryBuilder = clientRepository.createQueryBuilder('client')
        .where('client.statut = :statut', { statut: 'actif' });
      
      // Filtre de recherche si query fourni
      if (query) {
        queryBuilder.andWhere(
          '(client.nom ILIKE :query OR client.interlocuteur ILIKE :query OR client.email ILIKE :query)',
          { query: `%${query}%` }
        );
      }
      
      const clientList = await queryBuilder
        .select([
          'client.id',
          'client.nom',
          'client.interlocuteur',
          'client.email',
          'client.charge_com',
        ])
        .orderBy('client.nom', 'ASC')
        .getMany();
      
      const results = clientList.map(c => ({
        id: c.id,
        nom: c.nom,
        prenom: c.interlocuteur || '', // Utiliser interlocuteur car prenom n'existe pas
        interlocuteur: c.interlocuteur,
        email: c.email,
        societe: c.nom, // La société est dans nom
        charge_com: c.charge_com,
        photo: null, // Pas de photo pour les clients
        chat_avatar: null, // Pas d'avatar pour les clients
        is_chat_enabled: true,
        user_type: 'client'
      }));
      
      console.log(`✅ [getClientContacts] Récupéré ${results.length} clients`);
      return results;
    } catch (error) {
      console.error(`❌ [getClientContacts] Erreur:`, error);
      return [];
    }
  }

  private async getCommercialForClient(clientId: number, query: string, databaseName: string): Promise<any[]> {
    console.log(`🔍 [getCommercialForClient] Récupération commercial pour client ${clientId} depuis ${databaseName}`);
    
    try {
      const { clientRepository, personnelRepository } = await this.getRepositories(databaseName);
      
      // Récupérer le client pour connaître son commercial
      const client = await clientRepository.findOne({ 
        where: { id: clientId },
        select: ['charge_com']
      });
      
      if (!client || !client.charge_com) {
        console.log(`⚠️ [getCommercialForClient] Client sans commercial assigné`);
        return [];
      }
      
      // Récupérer le commercial par son nom d'utilisateur
      const commercial = await personnelRepository.findOne({
        where: { nom_utilisateur: client.charge_com },
        select: ['id', 'nom', 'prenom', 'email', 'role', 'photo']
      });
      
      if (!commercial) {
        console.log(`⚠️ [getCommercialForClient] Commercial ${client.charge_com} non trouvé`);
        return [];
      }
      
      // Appliquer le filtre de recherche si fourni
      if (query) {
        const searchLower = query.toLowerCase();
        if (!(commercial.nom.toLowerCase().includes(searchLower) || 
              commercial.prenom.toLowerCase().includes(searchLower) ||
              commercial.email.toLowerCase().includes(searchLower))) {
          return [];
        }
      }
      
      const result = {
        id: commercial.id,
        nom: commercial.nom,
        prenom: commercial.prenom,
        email: commercial.email,
        poste: commercial.role, // Utiliser role car poste n'existe pas
        role: commercial.role,
        chat_avatar: commercial.photo || null, // Utiliser photo car chat_avatar/avatar n'existent pas
        is_chat_enabled: true,
        user_type: 'personnel'
      };
      
      console.log(`✅ [getCommercialForClient] Commercial trouvé: ${result.prenom} ${result.nom}`);
      return [result];
    } catch (error) {
      console.error(`❌ [getCommercialForClient] Erreur:`, error);
      return [];
    }
  }

  // === Service Présence ===

  async updatePresence(
    userId: number,
    userType: 'personnel' | 'client',
    status: 'online' | 'offline' | 'away' | 'busy',
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [updatePresence] DB: ${databaseName}, Org: ${organisationId}`);
    
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🔄 Obtenir les repositories dynamiques
    const { presenceRepository } = await this.getRepositories(databaseName);

    let presence = await presenceRepository.findOne({
      where: { user_id: userId, user_type: userType }
    });

    if (!presence) {
      presence = presenceRepository.create({
        user_id: userId,
        user_type: userType,
        status,
        last_seen: new Date(),
      });
    } else {
      presence.status = status;
      presence.last_seen = new Date();
    }

    const savedPresence = await presenceRepository.save(presence);

    // Émettre via WebSocket - géré par le gateway
    // this.vechatGateway.handleUserOnlineStatus({
    //   userId,
    //   userType,
    //   isOnline: status !== 'offline',
    //   lastSeen: status === 'offline' ? new Date() : undefined,
    // });

    return savedPresence;
  }

  async getPresenceStatus(
    userIds: number[], 
    userType: 'personnel' | 'client', 
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [getPresenceStatus] DB: ${databaseName}, Org: ${organisationId}`);
    
    // 🔄 Obtenir les repositories dynamiques
    const { presenceRepository } = await this.getRepositories(databaseName);
    
    const presences = await presenceRepository.find({
      where: {
        user_id: In(userIds),
        user_type: userType,
      }
    });

    return presences;
  }

  // === Service Paramètres ===

  async getUserSettings(
    userId: number, 
    userType: 'personnel' | 'client', 
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [getUserSettings] DB: ${databaseName}, Org: ${organisationId}`);
    
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🔄 Obtenir les repositories dynamiques
    const { userSettingsRepository } = await this.getRepositories(databaseName);

    let settings = await userSettingsRepository.findOne({
      where: { user_id: userId, user_type: userType }
    });

    if (!settings) {
      // Créer des paramètres par défaut
      settings = userSettingsRepository.create({
        user_id: userId,
        user_type: userType,
        email_notifications: true,
        push_notifications: true,
        sound_notifications: true,
        theme: 'light',
        font_size: 'medium',
        show_online_status: true,
        show_read_receipts: true,
      });
      settings = await userSettingsRepository.save(settings);
    }

    return settings;
  }

  async updateUserSettings(
    settingsData: any, 
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [updateUserSettings] DB: ${databaseName}, Org: ${organisationId}`);
    
    if (!this.canAccessUser(currentUser, settingsData.userId, settingsData.userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🔄 Obtenir les repositories dynamiques
    const { userSettingsRepository } = await this.getRepositories(databaseName);

    let settings = await userSettingsRepository.findOne({
      where: { user_id: settingsData.userId, user_type: settingsData.userType }
    });

    if (!settings) {
      settings = userSettingsRepository.create({
        user_id: settingsData.userId,
        user_type: settingsData.userType,
      });
    }

    // Mettre à jour les champs fournis
    Object.assign(settings, settingsData);

    return await userSettingsRepository.save(settings);
  }

  // === Service Statistiques ===

  async getChatStatistics(
    userId: number, 
    userType: 'personnel' | 'client', 
    currentUser: any,
    databaseName: string,
    organisationId: number
  ) {
    console.log(`🏢 [getChatStatistics] DB: ${databaseName}, Org: ${organisationId}`);
    
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // 🔄 Obtenir les repositories dynamiques
    const { messageRepository, conversationRepository } = await this.getRepositories(databaseName);

    // Statistiques des messages envoyés
    const sentMessages = await messageRepository.count({
      where: { sender_id: userId, sender_type: userType }
    });

    // Statistiques des messages reçus
    const receivedMessages = await messageRepository.count({
      where: { receiver_id: userId, receiver_type: userType }
    });

    // Statistiques des conversations
    const conversations = await conversationRepository.count({
      where: [
        { participant1_id: userId, participant1_type: userType },
        { participant2_id: userId, participant2_type: userType }
      ]
    });

    return {
      sentMessages,
      receivedMessages,
      totalMessages: sentMessages + receivedMessages,
      conversations,
    };
  }

  // === Méthodes utilitaires ===

  private async updateConversationAfterMessage(message: VechatMessage, databaseName: string) {
    console.log(`🔄 [updateConversationAfterMessage] Mise à jour conversation après message ${message.id}`);
    
    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository } = await this.getRepositories(databaseName);
    
    // Normaliser l'ordre des participants
    let participant1Id = message.sender_id;
    let participant1Type = message.sender_type;
    let participant2Id = message.receiver_id;
    let participant2Type = message.receiver_type;

    if (message.sender_id > message.receiver_id || 
        (message.sender_id === message.receiver_id && message.sender_type > message.receiver_type)) {
      participant1Id = message.receiver_id;
      participant1Type = message.receiver_type;
      participant2Id = message.sender_id;
      participant2Type = message.sender_type;
    }

    let conversation = await conversationRepository.findOne({
      where: {
        participant1_id: participant1Id,
        participant1_type: participant1Type,
        participant2_id: participant2Id,
        participant2_type: participant2Type,
      }
    });

    if (!conversation) {
      conversation = conversationRepository.create({
        participant1_id: participant1Id,
        participant1_type: participant1Type,
        participant2_id: participant2Id,
        participant2_type: participant2Type,
        unread_count_participant1: 0,
        unread_count_participant2: 0,
        is_archived_by_participant1: false,
        is_archived_by_participant2: false,
        is_muted_by_participant1: false,
        is_muted_by_participant2: false,
      });
      console.log(`✨ [updateConversationAfterMessage] Nouvelle conversation créée`);
    }

    // Mettre à jour la conversation
    conversation.last_message_id = message.id;
    conversation.last_message_at = message.created_at;

    // Incrémenter le compteur de messages non lus du destinataire
    if (message.receiver_id === participant1Id && message.receiver_type === participant1Type) {
      conversation.unread_count_participant1++;
    } else {
      conversation.unread_count_participant2++;
    }

    await conversationRepository.save(conversation);
    console.log(`✅ [updateConversationAfterMessage] Conversation mise à jour`);
  }

  private async getUserDetails(userId: number, userType: 'personnel' | 'client', databaseName: string) {
    console.log(`🔍 [getUserDetails] Récupération détails: ${userType} ${userId} depuis ${databaseName}`);
    
    try {
      const { personnelRepository, clientRepository } = await this.getRepositories(databaseName);
      
      if (userType === 'personnel') {
        const personnel = await personnelRepository.findOne({ where: { id: userId } });
        if (personnel) {
          console.log(`✅ Personnel trouvé: ${personnel.prenom} ${personnel.nom}`);
          return {
            id: personnel.id,
            nom: personnel.nom,
            prenom: personnel.prenom,
            email: personnel.email,
            chat_avatar: personnel.photo || null, // Utiliser photo
            avatar: personnel.photo || null, // Utiliser photo
            role: personnel.role,
            poste: personnel.role || null, // Utiliser role car poste n'existe pas
          };
        }
        console.log(`⚠️ Personnel ${userId} non trouvé dans ${databaseName}`);
      } else {
        const client = await clientRepository.findOne({ where: { id: userId } });
        if (client) {
          console.log(`✅ Client trouvé: ${client.interlocuteur || ''} ${client.nom}`);
          return {
            id: client.id,
            nom: client.nom,
            prenom: client.interlocuteur || '', // Utiliser interlocuteur
            email: client.email,
            chat_avatar: null, // Pas d'avatar pour les clients
            avatar: null,
            societe: client.nom || null, // La société est dans nom
            charge_com: client.charge_com || null,
          };
        }
        console.log(`⚠️ Client ${userId} non trouvé dans ${databaseName}`);
      }
      
      return null;
    } catch (error) {
      console.error(`❌ [getUserDetails] Erreur:`, error);
      return null;
    }
  }

  // Nouvelles méthodes pour les règles de visibilité
  private getUserRole(userId: number): string {
    // TODO: Récupérer le vrai rôle depuis la base de données
    // Pour l'instant, simulation étendue basée sur l'ID
    console.log('🎭 Récupération rôle utilisateur:', userId);
    
    // Étendre la simulation pour couvrir plus d'utilisateurs admin
    if ([1, 2, 3, 4].includes(userId)) {
      const role = userId <= 2 ? 'administratif' : 'commercial';
      console.log(`🎭 Rôle simulé pour user ${userId}: ${role}`);
      return role;
    }
    
    const otherRole = 'autre';
    console.log(`🎭 Rôle par défaut pour user ${userId}: ${otherRole}`);
    return otherRole; // autres rôles du personnel
  }

  private getClientChargeComm(clientId: number): string {
    // TODO: Récupérer le charge_com depuis la table client
    // Pour l'instant, simulation
    return 'commercial_user'; // username du commercial
  }

  private isAdminOrCommercial(currentUser: any): boolean {
    // Priorité au rôle réel du JWT, puis simulation
    const realRole = currentUser.role;
    const simulatedRole = this.getUserRole(currentUser.id);
    const userRole = realRole || simulatedRole;
    const isAdminComm = userRole === 'administratif' || userRole === 'commercial';
    
    console.log('🔐 Vérification rôle admin/commercial:', {
      userId: currentUser.id,
      realRole,
      simulatedRole,
      finalRole: userRole,
      isAdminCommercial: isAdminComm
    });
    
    return isAdminComm;
  }

  private canAccessUser(currentUser: any, userId: number, userType: 'personnel' | 'client'): boolean {
    // Vérifier si l'utilisateur actuel peut accéder aux données de l'utilisateur spécifié
    
    // Admin peut accéder à tout
    if (this.isUserAdmin(currentUser)) {
      return true;
    }

    // Un utilisateur peut accéder à ses propres données
    if (currentUser.id === userId && (currentUser.userType || 'personnel') === userType) {
      return true;
    }

    // Personnel peut accéder aux autres membres du personnel
    if ((currentUser.userType || 'personnel') === 'personnel' && userType === 'personnel') {
      return true;
    }

    // Commercial peut accéder aux clients dont il est charge_com
    if (this.isUserCommercial(currentUser) && userType === 'client') {
      // Cette vérification devrait être faite avec une requête à la base de données
      // Pour simplifier, on retourne true pour l'instant
      return true;
    }

    return false;
  }

  private isUserAdmin(user: any): boolean {
    return user.poste?.toLowerCase().includes('admin') ||
           user.poste?.toLowerCase().includes('directeur') ||
           user.poste?.toLowerCase().includes('manager');
  }

  private isUserCommercial(user: any): boolean {
    return user.poste?.toLowerCase().includes('commercial') ||
           user.poste?.toLowerCase().includes('vente') ||
           user.poste?.toLowerCase().includes('charge');
  }

  /**
   * Servir les fichiers VeChat avec sécurité
   */
  async serveFile(type: string, filename: string, res: any) {
    try {
      // Validation du type
      const allowedTypes = ['images', 'videos', 'files', 'audio'];
      if (!allowedTypes.includes(type)) {
        throw new BadRequestException('Type de fichier non autorisé');
      }

      // Sécurité: vérifier que le nom de fichier ne contient pas de caractères dangereux
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new BadRequestException('Nom de fichier invalide');
      }

      // Construire le chemin vers le fichier
      const filePath = path.join(process.cwd(), 'uploads', 'vechat', type, filename);
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Fichier introuvable');
      }

      // Déterminer le type MIME basé sur l'extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream'; // par défaut
      
      // Types d'images
      if (type === 'images') {
        switch (ext) {
          case '.png': contentType = 'image/png'; break;
          case '.jpg':
          case '.jpeg': contentType = 'image/jpeg'; break;
          case '.webp': contentType = 'image/webp'; break;
          case '.gif': contentType = 'image/gif'; break;
          case '.svg': contentType = 'image/svg+xml'; break;
          default: contentType = 'image/jpeg';
        }
      }
      // Types de vidéos
      else if (type === 'videos') {
        switch (ext) {
          case '.mp4': contentType = 'video/mp4'; break;
          case '.webm': contentType = 'video/webm'; break;
          case '.ogg': contentType = 'video/ogg'; break;
          case '.avi': contentType = 'video/x-msvideo'; break;
          case '.mov': contentType = 'video/quicktime'; break;
          default: contentType = 'video/mp4';
        }
      }
      // Types audio
      else if (type === 'audio') {
        switch (ext) {
          case '.mp3': contentType = 'audio/mpeg'; break;
          case '.wav': contentType = 'audio/wav'; break;
          case '.webm': contentType = 'audio/webm'; break;
          case '.ogg': contentType = 'audio/ogg'; break;
          case '.m4a': contentType = 'audio/mp4'; break;
          case '.aac': contentType = 'audio/aac'; break;
          case '.flac': contentType = 'audio/flac'; break;
          default: contentType = 'audio/mpeg';
        }
      }
      // Autres fichiers
      else {
        switch (ext) {
          case '.pdf': contentType = 'application/pdf'; break;
          case '.doc': contentType = 'application/msword'; break;
          case '.docx': contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; break;
          case '.xls': contentType = 'application/vnd.ms-excel'; break;
          case '.xlsx': contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; break;
          case '.txt': contentType = 'text/plain'; break;
          case '.zip': contentType = 'application/zip'; break;
          case '.rar': contentType = 'application/x-rar-compressed'; break;
        }
      }

      // Définir les en-têtes de réponse
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 an
      
      // Si c'est une image, vidéo ou audio, permettre l'affichage inline
      if (type === 'images' || type === 'videos' || type === 'audio') {
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      }

      // Envoyer le fichier
      const fileBuffer = fs.readFileSync(filePath);
      res.end(fileBuffer);

    } catch (error) {
      console.error('❌ Erreur lors du service du fichier:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Erreur lors de la récupération du fichier: ${error.message}`);
    }
  }

  // === Méthodes utilitaires pour le WebSocket Gateway ===

  async getMessagesByIds(
    messageIds: number[],
    databaseName: string
  ): Promise<VechatMessage[]> {
    const { messageRepository } = await this.getRepositories(databaseName);
    return await messageRepository.find({
      where: { id: In(messageIds) }
    });
  }

  async getUnreadCountsForUser(
    userId: number, 
    userType: 'personnel' | 'client',
    databaseName: string
  ): Promise<{ [conversationId: number]: number }> {
    console.log('🔢 Calcul compteurs non lus pour:', userId, userType);
    
    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository } = await this.getRepositories(databaseName);
    
    // Récupérer toutes les conversations de cet utilisateur
    const conversations = await conversationRepository.find({
      where: [
        { participant1_id: userId, participant1_type: userType },
        { participant2_id: userId, participant2_type: userType }
      ]
    });

    const unreadCounts: { [conversationId: number]: number } = {};

    for (const conversation of conversations) {
      // Déterminer si l'utilisateur est participant1 ou participant2
      const isParticipant1 = conversation.participant1_id === userId && 
                            conversation.participant1_type === userType;
      
      // Récupérer le compteur approprié
      const unreadCount = isParticipant1 
        ? conversation.unread_count_participant1 
        : conversation.unread_count_participant2;
      
      unreadCounts[conversation.id] = unreadCount;
    }

    console.log('📊 Compteurs calculés:', unreadCounts);
    return unreadCounts;
  }

  async getConversationById(
    conversationId: number,
    databaseName: string
  ): Promise<VechatConversation | null> {
    const { conversationRepository } = await this.getRepositories(databaseName);
    return await conversationRepository.findOne({
      where: { id: conversationId }
    });
  }

  async getConversationsForUser(
    userId: number, 
    userType: 'personnel' | 'client',
    databaseName: string
  ): Promise<any[]> {
    console.log('📋 Récupération conversations complètes pour:', userId, userType);
    
    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository } = await this.getRepositories(databaseName);
    
    // Récupérer toutes les conversations de l'utilisateur avec détails
    const conversations = await conversationRepository
      .createQueryBuilder('conv')
      .where(
        '(conv.participant1_id = :userId AND conv.participant1_type = :userType) OR ' +
        '(conv.participant2_id = :userId AND conv.participant2_type = :userType)',
        { userId, userType }
      )
      .orderBy('conv.last_message_at', 'DESC')
      .getMany();

    // Enrichir chaque conversation avec les détails des participants
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const participant1 = await this.getUserDetails(conv.participant1_id, conv.participant1_type, databaseName);
        const participant2 = await this.getUserDetails(conv.participant2_id, conv.participant2_type, databaseName);
        
        return {
          ...conv,
          participant1_details: participant1,
          participant2_details: participant2,
          // Calculer le compteur pour cet utilisateur spécifique
          my_unread_count: userId === conv.participant1_id && userType === conv.participant1_type
            ? conv.unread_count_participant1
            : conv.unread_count_participant2
        };
      })
    );

    console.log(`📊 ${enrichedConversations.length} conversations récupérées`);
    return enrichedConversations;
  }

  async getUnreadMessagesForUserInConversation(
    conversationId: number, 
    userId: number, 
    userType: 'personnel' | 'client',
    databaseName: string
  ): Promise<VechatMessage[]> {
    console.log('🔍 Recherche messages non lus pour utilisateur:', { conversationId, userId, userType });
    
    // 🔄 Obtenir les repositories dynamiques
    const { conversationRepository, messageRepository } = await this.getRepositories(databaseName);
    
    // Récupérer la conversation pour connaître les participants
    const conversation = await conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      console.log('⚠️ Conversation non trouvée:', conversationId);
      return [];
    }

    // Chercher les messages non lus reçus par cet utilisateur dans cette conversation
    const unreadMessages = await messageRepository.find({
      where: [
        {
          receiver_id: userId,
          receiver_type: userType,
          is_read: false,
          sender_id: conversation.participant1_id,
          sender_type: conversation.participant1_type,
        },
        {
          receiver_id: userId,
          receiver_type: userType,
          is_read: false,
          sender_id: conversation.participant2_id,
          sender_type: conversation.participant2_type,
        }
      ],
      order: { created_at: 'ASC' }
    });

    console.log(`📬 Trouvé ${unreadMessages.length} messages non lus`);
    return unreadMessages;
  }

  // === Méthodes de validation ===

  private async validateMessageData(createMessageDto: CreateMessageDto): Promise<void> {
    const messageType = createMessageDto.message_type;

    switch (messageType) {
      case 'location':
        this.validateLocationMessage(createMessageDto);
        break;
      case 'audio':
        this.validateAudioMessage(createMessageDto);
        break;
      case 'voice': // Support pour l'ancien type 'voice'
        this.validateAudioMessage(createMessageDto);
        break;
      case 'text':
      case 'image':
      case 'video':
      case 'file':
        // Validation standard déjà en place
        break;
      default:
        throw new BadRequestException(`Type de message non supporté: ${messageType}`);
    }
  }

  private validateLocationMessage(createMessageDto: CreateMessageDto): void {
    if (!createMessageDto.location_data) {
      throw new BadRequestException('Les données de localisation sont requises pour un message de localisation');
    }

    const { latitude, longitude, accuracy } = createMessageDto.location_data;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new BadRequestException('Latitude et longitude doivent être des nombres');
    }

    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Latitude doit être entre -90 et 90');
    }

    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Longitude doit être entre -180 et 180');
    }

    if (accuracy !== undefined && (typeof accuracy !== 'number' || accuracy < 0)) {
      throw new BadRequestException('L\'exactitude doit être un nombre positif');
    }
  }

  private validateAudioMessage(createMessageDto: CreateMessageDto): void {
    if (!createMessageDto.file_url) {
      throw new BadRequestException('URL du fichier audio requise');
    }

    if (!createMessageDto.file_type || !createMessageDto.file_type.startsWith('audio/')) {
      throw new BadRequestException('Type de fichier audio invalide');
    }

    if (createMessageDto.audio_duration !== undefined) {
      if (typeof createMessageDto.audio_duration !== 'number' || createMessageDto.audio_duration <= 0) {
        throw new BadRequestException('Durée audio doit être un nombre positif');
      }
    }

    if (createMessageDto.audio_waveform !== undefined) {
      if (typeof createMessageDto.audio_waveform !== 'string') {
        throw new BadRequestException('Forme d\'onde audio doit être une chaîne de caractères');
      }
    }
  }
}