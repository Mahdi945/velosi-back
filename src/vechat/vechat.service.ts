import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { 
  VechatMessage, 
  VechatConversation, 
  VechatPresence, 
  VechatUserSettings
} from './entities';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';
import { CreateMessageDto, UpdateMessageDto } from './dto/vechat.dto';
// import { VechatGateway } from './vechat.gateway'; // Supprimé pour éviter l'importation circulaire
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VechatService {
  constructor(
    @InjectRepository(VechatMessage)
    private messageRepository: Repository<VechatMessage>,
    @InjectRepository(VechatConversation)
    private conversationRepository: Repository<VechatConversation>,
    @InjectRepository(VechatPresence)
    private presenceRepository: Repository<VechatPresence>,
    @InjectRepository(VechatUserSettings)
    private userSettingsRepository: Repository<VechatUserSettings>,
    // @InjectRepository(Personnel)
    // private personnelRepository: Repository<Personnel>,
    // @InjectRepository(Client)
    // private clientRepository: Repository<Client>,
    // private vechatGateway: VechatGateway, // Supprimé pour éviter l'importation circulaire
  ) {}

  // === Service Conversations ===

  async getUserConversations(userId: number, userType: 'personnel' | 'client', currentUser: any) {
    // Vérifier les permissions
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const conversations = await this.conversationRepository.find({
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
        const participant1 = await this.getUserDetails(conv.participant1_id, conv.participant1_type);
        const participant2 = await this.getUserDetails(conv.participant2_id, conv.participant2_type);
        const lastMessage = conv.last_message_id ? 
          await this.messageRepository.findOne({ where: { id: conv.last_message_id } }) : null;

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

    return enrichedConversations;
  }

  async createOrGetConversation(
    participant1Id: number,
    participant1Type: 'personnel' | 'client',
    participant2Id: number,
    participant2Type: 'personnel' | 'client',
    currentUser: any
  ) {
    // Vérifier les permissions
    if (!this.canAccessUser(currentUser, participant1Id, participant1Type) &&
        !this.canAccessUser(currentUser, participant2Id, participant2Type)) {
      throw new ForbiddenException('Accès non autorisé');
    }

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
    let conversation = await this.conversationRepository.findOne({
      where: {
        participant1_id: normalizedParticipant1Id,
        participant1_type: normalizedParticipant1Type,
        participant2_id: normalizedParticipant2Id,
        participant2_type: normalizedParticipant2Type,
      }
    });

    if (!conversation) {
      // Créer une nouvelle conversation
      conversation = this.conversationRepository.create({
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

      conversation = await this.conversationRepository.save(conversation);
    }

    return conversation;
  }

  async archiveConversation(
    conversationId: number,
    userId: number,
    userType: 'personnel' | 'client',
    currentUser: any
  ) {
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const conversation = await this.conversationRepository.findOne({
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

    return await this.conversationRepository.save(conversation);
  }

  async muteConversation(
    conversationId: number,
    userId: number,
    userType: 'personnel' | 'client',
    muted: boolean,
    currentUser: any
  ) {
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const conversation = await this.conversationRepository.findOne({
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

    return await this.conversationRepository.save(conversation);
  }

  async resetUnreadCount(
    conversationId: number,
    userId: number,
    userType: 'personnel' | 'client',
    currentUser: any
  ) {
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const conversation = await this.conversationRepository.findOne({
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

    // Remettre à zéro le compteur de messages non lus pour l'utilisateur
    if (isParticipant1) {
      conversation.unread_count_participant1 = 0;
      console.log(`✅ Compteur participant1 remis à zéro pour conversation ${conversationId}`);
    } else {
      conversation.unread_count_participant2 = 0;
      console.log(`✅ Compteur participant2 remis à zéro pour conversation ${conversationId}`);
    }

    const savedConversation = await this.conversationRepository.save(conversation);
    
    // Également marquer tous les messages reçus par cet utilisateur comme lus
    // Nous identifions les messages de cette conversation en utilisant les participants
    const otherParticipantId = isParticipant1 ? conversation.participant2_id : conversation.participant1_id;
    const otherParticipantType = isParticipant1 ? conversation.participant2_type : conversation.participant1_type;

    await this.messageRepository.update(
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

    console.log(`🔄 Compteurs et messages marqués comme lus pour conversation ${conversationId}, utilisateur ${userId}`);
    
    return savedConversation;
  }

  async deleteConversation(conversationId: number, currentUser: any) {
    const conversation = await this.conversationRepository.findOne({
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
    await this.messageRepository.delete({
      sender_id: In([conversation.participant1_id, conversation.participant2_id]),
      receiver_id: In([conversation.participant1_id, conversation.participant2_id])
    });

    // Supprimer la conversation
    await this.conversationRepository.delete(conversationId);

    return { success: true };
  }

  // === Service Messages ===

  async getConversationMessages(
    conversationId: number,
    page: number = 1,
    limit: number = 50,
    currentUser: any
  ) {
    const conversation = await this.conversationRepository.findOne({
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

    const messages = await this.messageRepository.find({
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
        const sender = await this.getUserDetails(message.sender_id, message.sender_type);
        const receiver = await this.getUserDetails(message.receiver_id, message.receiver_type);

        return {
          ...message,
          sender_name: sender ? `${sender.prenom} ${sender.nom}` : null,
          sender_avatar: sender?.chat_avatar || sender?.avatar,
          receiver_name: receiver ? `${receiver.prenom} ${receiver.nom}` : null,
          receiver_avatar: receiver?.chat_avatar || receiver?.avatar,
        };
      })
    );

    return enrichedMessages.reverse(); // Retourner dans l'ordre chronologique
  }

  async sendMessage(createMessageDto: CreateMessageDto, currentUser: any) {
    // Déterminer le type et l'ID de l'expéditeur
    const senderType = currentUser.userType || 'personnel';
    const senderId = currentUser.id;

    // Vérifier l'accès
    if (!this.canAccessUser(currentUser, senderId, senderType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Vérifier que le destinataire existe
    const receiver = await this.getUserDetails(createMessageDto.receiver_id, createMessageDto.receiver_type);
    if (!receiver) {
      throw new NotFoundException('Destinataire non trouvé');
    }

    // Créer le message
    const message = this.messageRepository.create({
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
    });

    const savedMessage = await this.messageRepository.save(message);

    // Mettre à jour ou créer la conversation
    await this.updateConversationAfterMessage(savedMessage);

    // Enrichir le message avec les détails
    const sender = await this.getUserDetails(senderId, senderType);
    const enrichedMessage = {
      ...savedMessage,
      sender_name: sender ? `${sender.prenom} ${sender.nom}` : null,
      sender_avatar: sender?.chat_avatar || sender?.avatar,
      receiver_name: receiver ? `${receiver.prenom} ${receiver.nom}` : null,
      receiver_avatar: receiver?.chat_avatar || receiver?.avatar,
    };

    // Émettre via WebSocket - géré par le gateway
    // this.vechatGateway.handleNewMessage(enrichedMessage);

    return enrichedMessage;
  }

  async updateMessage(messageId: number, updateMessageDto: UpdateMessageDto, currentUser: any) {
    const message = await this.messageRepository.findOne({
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

    const updatedMessage = await this.messageRepository.save(message);

    console.log(`✅ Message ${messageId} modifié par l'expéditeur`);

    // Émettre via WebSocket - géré par le gateway
    // this.vechatGateway.handleMessageUpdated(updatedMessage);

    return updatedMessage;
  }

  async deleteMessage(
    messageId: number,
    userId: number,
    userType: 'personnel' | 'client',
    currentUser: any
  ) {
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const message = await this.messageRepository.findOne({
      where: { id: messageId }
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    // Seul l'expéditeur peut supprimer définitivement son message
    if (message.sender_id === userId && message.sender_type === userType) {
      // Suppression définitive du message pour l'expéditeur
      await this.messageRepository.remove(message);
      console.log(`✅ Message ${messageId} supprimé définitivement par l'expéditeur`);
    } else if (message.receiver_id === userId && message.receiver_type === userType) {
      // Masquer seulement pour le destinataire
      message.is_deleted_by_receiver = true;
      await this.messageRepository.save(message);
      console.log(`✅ Message ${messageId} masqué pour le destinataire`);
    } else {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages');
    }

    // Émettre via WebSocket - géré par le gateway
    // this.vechatGateway.handleMessageDeleted(message);

    return { success: true };
  }

  async markMessagesAsRead(messageIds: number[], currentUser: any) {
    console.log('🔄 Backend - Marquage messages comme lus:', messageIds);
    
    const messages = await this.messageRepository.find({
      where: { id: In(messageIds) }
    });

    const updatedMessages = [];
    const conversationsToUpdate = new Set<number>();

    for (const message of messages) {
      // Seul le destinataire peut marquer comme lu
      if (this.canAccessUser(currentUser, message.receiver_id, message.receiver_type)) {
        message.is_read = true;
        message.read_at = new Date();
        await this.messageRepository.save(message);
        updatedMessages.push(message);

        // Collecter les conversations à mettre à jour
        const conversation = await this.getConversationForMessage(message);
        if (conversation) {
          conversationsToUpdate.add(conversation.id);
        }
      }
    }

    // Mettre à jour les compteurs des conversations
    for (const conversationId of conversationsToUpdate) {
      await this.updateUnreadCountersForConversation(conversationId);
    }

    console.log('✅ Backend - Messages marqués comme lus:', updatedMessages.length);
    return { success: true, updatedCount: updatedMessages.length };
  }

  // Méthode publique pour obtenir la conversation d'un message
  async getConversationForMessage(message: VechatMessage): Promise<VechatConversation | null> {
    return await this.conversationRepository.findOne({
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
  private async updateUnreadCountersForConversation(conversationId: number): Promise<void> {
    console.log('🔄 Mise à jour compteurs conversation:', conversationId);
    
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      console.log('⚠️ Conversation non trouvée:', conversationId);
      return;
    }

    // Compter les messages non lus pour chaque participant de manière optimisée
    const [unreadCountParticipant1, unreadCountParticipant2] = await Promise.all([
      this.messageRepository.count({
        where: {
          receiver_id: conversation.participant1_id,
          receiver_type: conversation.participant1_type,
          is_read: false,
          sender_id: conversation.participant2_id,
          sender_type: conversation.participant2_type,
        }
      }),
      this.messageRepository.count({
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

      await this.conversationRepository.save(conversation);
      
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

  async clearConversationMessages(conversationId: number, currentUser: any) {
    const conversation = await this.conversationRepository.findOne({
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
    await this.messageRepository.delete({
      sender_id: In([conversation.participant1_id, conversation.participant2_id]),
      receiver_id: In([conversation.participant1_id, conversation.participant2_id]),
    });

    // Réinitialiser les compteurs de la conversation
    conversation.last_message_id = null;
    conversation.last_message_at = null;
    conversation.unread_count_participant1 = 0;
    conversation.unread_count_participant2 = 0;

    await this.conversationRepository.save(conversation);

    return { success: true, clearedCount: 0 }; // TODO: retourner le nombre réel de messages supprimés
  }

  async searchMessages(
    conversationId: number,
    query: string,
    page: number = 1,
    limit: number = 20,
    currentUser: any
  ) {
    const conversation = await this.conversationRepository.findOne({
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

    const messages = await this.messageRepository.find({
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
    messageType: 'image' | 'file' | 'video',
    currentUser: any
  ) {
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
    const fileUrl = `http://localhost:3000/api/vechat/files/${subFolder}/${fileName}`;

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

    const message = await this.sendMessage(messageData, currentUser);

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
    currentUser: any
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier audio fourni');
    }

    // Traiter comme un upload de fichier normal (temporairement comme 'file')
    const result = await this.uploadFile(file, receiverId, receiverType, 'file', currentUser);

    // Ajouter la durée dans le message si nécessaire
    // (vous pouvez stocker la durée dans un champ séparé ou dans les métadonnées)

    return result;
  }

  // === Service Contacts ===

  async searchContacts(query: string, type: 'personnel' | 'client', currentUser: any) {
    console.log('🔍 Recherche contacts avec règles de visibilité:', {
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
          const personnel = await this.getPersonnelContacts(query, currentUser);
          const clients = await this.getClientContacts(query, currentUser);
          results = [...personnel, ...clients];
          console.log('👨‍💼 Admin/Commercial - Récupération complète:', {
            personnel: personnel.length,
            clients: clients.length,
            total: results.length
          });
        } else if (type === 'client') {
          results = await this.getClientContacts(query, currentUser);
        } else {
          // Récupérer les deux types
          const personnel = await this.getPersonnelContacts(query, currentUser);
          const clients = await this.getClientContacts(query, currentUser);
          results = [...personnel, ...clients];
        }
      } else {
        // Autres rôles personnel : seulement le personnel
        if (type === 'personnel' || !type) {
          results = await this.getPersonnelContacts(query, currentUser);
        }
        // Pas de clients pour les autres rôles
      }
    } else if (currentUserType === 'client') {
      // Clients : seulement leur commercial
      if (type === 'personnel' || !type) {
        results = await this.getCommercialForClient(currentUser.id, query);
      }
      // Les clients ne voient pas d'autres clients
    }

    console.log('📋 Contacts trouvés:', results.length);
    return results;
  }

  async getAvailableContacts(currentUser: any) {
    console.log('📞 Récupération contacts disponibles pour:', {
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
        availableContacts.personnel = await this.getPersonnelContacts('', currentUser);
        availableContacts.clients = await this.getClientContacts('', currentUser);
      } else {
        // Autres rôles personnel : seulement le personnel
        availableContacts.personnel = await this.getPersonnelContacts('', currentUser);
      }
    } else if (currentUserType === 'client') {
      // Clients : seulement leur commercial
      availableContacts.personnel = await this.getCommercialForClient(currentUser.id, '');
    }

    console.log('📊 Contacts disponibles:', {
      personnel: availableContacts.personnel.length,
      clients: availableContacts.clients.length
    });

    return availableContacts;
  }

  private async getPersonnelContacts(query: string, currentUser: any): Promise<any[]> {
    // TODO: Implémenter avec la vraie table personnel
    const mockPersonnel = [
      {
        id: 1,
        nom: 'Admin',
        prenom: 'Super',
        email: 'admin@velosi.com',
        poste: 'Administrateur',
        role: 'administratif',
        chat_avatar: null,
        is_chat_enabled: true,
        user_type: 'personnel'
      },
      {
        id: 2,
        nom: 'Commercial',
        prenom: 'Premier',
        email: 'commercial@velosi.com',
        poste: 'Commercial',
        role: 'commercial',
        chat_avatar: null,
        is_chat_enabled: true,
        user_type: 'personnel'
      },
      {
        id: 3,
        nom: 'Technicien',
        prenom: 'Jean',
        email: 'tech@velosi.com',
        poste: 'Technicien',
        role: 'autre',
        chat_avatar: null,
        is_chat_enabled: true,
        user_type: 'personnel'
      }
    ];

    return mockPersonnel
      .filter(p => p.id !== currentUser.id) // Exclure soi-même
      .filter(p => 
        !query || 
        p.nom.toLowerCase().includes(query.toLowerCase()) ||
        p.prenom.toLowerCase().includes(query.toLowerCase()) ||
        p.email.toLowerCase().includes(query.toLowerCase())
      );
  }

  private async getClientContacts(query: string, currentUser: any): Promise<any[]> {
    console.log('🏢 Récupération contacts clients:', {
      currentUser: currentUser.id,
      query,
      isAdminOrComm: this.isAdminOrCommercial(currentUser)
    });

    // TODO: Implémenter avec la vraie table client
    const mockClients = [
      {
        id: 1,
        nom: 'Client1',
        prenom: 'Société',
        email: 'client1@example.com',
        societe: 'Entreprise ABC',
        charge_com: 'commercial_user',
        chat_avatar: null,
        is_chat_enabled: true,
        user_type: 'client'
      },
      {
        id: 2,
        nom: 'Client2',
        prenom: 'Société',
        email: 'client2@example.com',
        societe: 'Entreprise XYZ',
        charge_com: 'commercial_user',
        chat_avatar: null,
        is_chat_enabled: true,
        user_type: 'client'
      }
    ];

    const filteredClients = mockClients.filter(c => 
      !query || 
      c.nom.toLowerCase().includes(query.toLowerCase()) ||
      c.prenom.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase()) ||
      c.societe.toLowerCase().includes(query.toLowerCase())
    );

    console.log('🏢 Clients trouvés:', {
      mockClientsCount: mockClients.length,
      filteredCount: filteredClients.length,
      clients: filteredClients.map(c => ({ id: c.id, nom: c.nom, societe: c.societe }))
    });

    return filteredClients;
  }

  private async getCommercialForClient(clientId: number, query: string): Promise<any[]> {
    // TODO: Récupérer le commercial assigné au client
    const chargeComm = this.getClientChargeComm(clientId);
    
    const mockCommercial = [
      {
        id: 2,
        nom: 'Commercial',
        prenom: 'Assigné',
        email: 'commercial@velosi.com',
        poste: 'Commercial',
        role: 'commercial',
        username: chargeComm,
        chat_avatar: null,
        is_chat_enabled: true,
        user_type: 'personnel'
      }
    ];

    return mockCommercial.filter(c => 
      !query || 
      c.nom.toLowerCase().includes(query.toLowerCase()) ||
      c.prenom.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase())
    );
  }

  // === Service Présence ===

  async updatePresence(
    userId: number,
    userType: 'personnel' | 'client',
    status: 'online' | 'offline' | 'away' | 'busy',
    currentUser: any
  ) {
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    let presence = await this.presenceRepository.findOne({
      where: { user_id: userId, user_type: userType }
    });

    if (!presence) {
      presence = this.presenceRepository.create({
        user_id: userId,
        user_type: userType,
        status,
        last_seen: new Date(),
      });
    } else {
      presence.status = status;
      presence.last_seen = new Date();
    }

    const savedPresence = await this.presenceRepository.save(presence);

    // Émettre via WebSocket - géré par le gateway
    // this.vechatGateway.handleUserOnlineStatus({
    //   userId,
    //   userType,
    //   isOnline: status !== 'offline',
    //   lastSeen: status === 'offline' ? new Date() : undefined,
    // });

    return savedPresence;
  }

  async getPresenceStatus(userIds: number[], userType: 'personnel' | 'client', currentUser: any) {
    const presences = await this.presenceRepository.find({
      where: {
        user_id: In(userIds),
        user_type: userType,
      }
    });

    return presences;
  }

  // === Service Paramètres ===

  async getUserSettings(userId: number, userType: 'personnel' | 'client', currentUser: any) {
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    let settings = await this.userSettingsRepository.findOne({
      where: { user_id: userId, user_type: userType }
    });

    if (!settings) {
      // Créer des paramètres par défaut
      settings = this.userSettingsRepository.create({
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
      settings = await this.userSettingsRepository.save(settings);
    }

    return settings;
  }

  async updateUserSettings(settingsData: any, currentUser: any) {
    if (!this.canAccessUser(currentUser, settingsData.userId, settingsData.userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    let settings = await this.userSettingsRepository.findOne({
      where: { user_id: settingsData.userId, user_type: settingsData.userType }
    });

    if (!settings) {
      settings = this.userSettingsRepository.create({
        user_id: settingsData.userId,
        user_type: settingsData.userType,
      });
    }

    // Mettre à jour les champs fournis
    Object.assign(settings, settingsData);

    return await this.userSettingsRepository.save(settings);
  }

  // === Service Statistiques ===

  async getChatStatistics(userId: number, userType: 'personnel' | 'client', currentUser: any) {
    if (!this.canAccessUser(currentUser, userId, userType)) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Statistiques des messages envoyés
    const sentMessages = await this.messageRepository.count({
      where: { sender_id: userId, sender_type: userType }
    });

    // Statistiques des messages reçus
    const receivedMessages = await this.messageRepository.count({
      where: { receiver_id: userId, receiver_type: userType }
    });

    // Statistiques des conversations
    const conversations = await this.conversationRepository.count({
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

  private async updateConversationAfterMessage(message: VechatMessage) {
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

    let conversation = await this.conversationRepository.findOne({
      where: {
        participant1_id: participant1Id,
        participant1_type: participant1Type,
        participant2_id: participant2Id,
        participant2_type: participant2Type,
      }
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
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

    await this.conversationRepository.save(conversation);
  }

  private async getUserDetails(userId: number, userType: 'personnel' | 'client') {
    // TODO: Implémenter avec vos vraies entités
    // Pour l'instant, retourner des données mock
    return {
      id: userId,
      nom: 'Utilisateur',
      prenom: `${userType} ${userId}`,
      email: `user${userId}@example.com`,
      chat_avatar: null,
      avatar: null,
      role: userType === 'personnel' ? this.getUserRole(userId) : null,
      charge_com: userType === 'client' ? this.getClientChargeComm(userId) : null
    };
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
      const allowedTypes = ['images', 'videos', 'files'];
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
      
      // Si c'est une image ou vidéo, permettre l'affichage inline
      if (type === 'images' || type === 'videos') {
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

  async getMessagesByIds(messageIds: number[]): Promise<VechatMessage[]> {
    return await this.messageRepository.find({
      where: { id: In(messageIds) }
    });
  }

  async getUnreadCountsForUser(userId: number, userType: 'personnel' | 'client'): Promise<{ [conversationId: number]: number }> {
    console.log('🔢 Calcul compteurs non lus pour:', userId, userType);
    
    // Récupérer toutes les conversations de cet utilisateur
    const conversations = await this.conversationRepository.find({
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

  async getConversationById(conversationId: number): Promise<VechatConversation | null> {
    return await this.conversationRepository.findOne({
      where: { id: conversationId }
    });
  }

  async getConversationsForUser(userId: number, userType: 'personnel' | 'client'): Promise<any[]> {
    console.log('📋 Récupération conversations complètes pour:', userId, userType);
    
    // Récupérer toutes les conversations de l'utilisateur avec détails
    const conversations = await this.conversationRepository
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
        const participant1 = await this.getUserDetails(conv.participant1_id, conv.participant1_type);
        const participant2 = await this.getUserDetails(conv.participant2_id, conv.participant2_type);
        
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
    userType: 'personnel' | 'client'
  ): Promise<VechatMessage[]> {
    console.log('🔍 Recherche messages non lus pour utilisateur:', { conversationId, userId, userType });
    
    // Récupérer la conversation pour connaître les participants
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      console.log('⚠️ Conversation non trouvée:', conversationId);
      return [];
    }

    // Chercher les messages non lus reçus par cet utilisateur dans cette conversation
    const unreadMessages = await this.messageRepository.find({
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
}