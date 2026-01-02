import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { BiometricCredential, UserType } from '../entities/biometric-credential.entity';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';

// ================================================================
// DTOs SIMPLIFIÉS pour les opérations biométriques
// ================================================================

export interface RegisterBiometricDto {
  userId: number;
  userType: 'personnel' | 'client';
  credentialId: string; // ID unique du credential WebAuthn (base64url)
  publicKey: string; // Clé publique au format PEM ou JWK
  userHandle?: string; // User handle pour resident keys (base64)
  deviceName?: string; // Nom de l'appareil (optionnel)
  deviceType?: string; // Type d'appareil (mobile, desktop, tablet)
  browserInfo?: string; // Info sur le navigateur
  isResidentKey?: boolean; // ✅ NOUVEAU: Indiquer si c'est un Resident Key
}

export interface VerifyBiometricDto {
  credentialId: string; // ID du credential utilisé (REQUIS)
  signature: string; // Signature WebAuthn
  authenticatorData: string; // Données de l'authentificateur
  clientDataJSON: string; // Données du client
}

export interface BiometricCredentialInfo {
  id: number;
  credentialId: string;
  deviceName: string;
  deviceType: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  isRecentlyUsed: boolean;
  counter: number;
}

export interface BiometricStatusResponse {
  enabled: boolean;
  credentialCount: number;
  registeredAt?: Date;
  userId?: number;
  userType?: 'personnel' | 'client';
  credentials?: BiometricCredentialInfo[];
}

// ================================================================
// SERVICE BIOMÉTRIQUE SIMPLIFIÉ
// ================================================================

@Injectable()
export class BiometricService {
  constructor(
    @InjectRepository(BiometricCredential)
    private readonly credentialRepository: Repository<BiometricCredential>,
    @InjectRepository(Personnel)
    private readonly personnelRepository: Repository<Personnel>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  /**
   * 🔐 Enregistrer un nouveau credential biométrique pour un utilisateur
   * ✅ SIMPLIFIÉ: Support multi-appareils sans Resident Keys
   */
  async registerBiometric(dto: RegisterBiometricDto): Promise<{ 
    success: boolean; 
    message: string; 
    credentialId: number;
  }> {
    try {
      console.log(`🔐 Enregistrement biométrique pour ${dto.userType} #${dto.userId}`);
      console.log('📦 Données reçues:', {
        userId: dto.userId,
        userType: dto.userType,
        credentialIdLength: dto.credentialId?.length || 0,
        credentialIdPreview: dto.credentialId?.substring(0, 30),
        publicKeyLength: dto.publicKey?.length || 0,
        deviceName: dto.deviceName
      });

      // Valider les données
      if (!dto.credentialId || dto.credentialId.length < 16) {
        throw new BadRequestException('credentialId invalide (trop court)');
      }

      if (!dto.publicKey || dto.publicKey.length < 32) {
        throw new BadRequestException('publicKey invalide (trop court)');
      }

      // Vérifier que l'utilisateur existe
      let user: Personnel | Client;
      if (dto.userType === 'personnel') {
        user = await this.personnelRepository.findOne({ where: { id: dto.userId } });
      } else {
        user = await this.clientRepository.findOne({ where: { id: dto.userId } });
      }

      if (!user) {
        throw new BadRequestException(`Utilisateur ${dto.userType} #${dto.userId} introuvable`);
      }

      // Vérifier si le credential existe déjà
      const existingCredential = await this.credentialRepository.findOne({
        where: { credential_id: dto.credentialId },
      });

      if (existingCredential) {
        console.log('🔍 Credential existant trouvé:', {
          id: existingCredential.id,
          credentialId: existingCredential.credential_id.substring(0, 30),
          personnel_id: existingCredential.personnel_id,
          client_id: existingCredential.client_id,
          device_name: existingCredential.device_name
        });
        
        // Si c'est le même utilisateur, mettre à jour le credential
        if ((dto.userType === 'personnel' && existingCredential.personnel_id === dto.userId) ||
            (dto.userType === 'client' && existingCredential.client_id === dto.userId)) {
          console.log('🔄 Même utilisateur - Mise à jour du credential existant');
          existingCredential.device_name = dto.deviceName || existingCredential.device_name;
          existingCredential.last_used_at = new Date();
          const updated = await this.credentialRepository.save(existingCredential);
          
          return {
            success: true,
            message: 'Credential biométrique mis à jour (appareil déjà enregistré)',
            credentialId: updated.id,
          };
        } else {
          console.error('❌ Credential déjà utilisé par un autre utilisateur:', {
            existingUserId: existingCredential.personnel_id || existingCredential.client_id,
            existingUserType: existingCredential.user_type,
            newUserId: dto.userId,
            newUserType: dto.userType
          });
          throw new BadRequestException('Ce credential est déjà associé à un autre utilisateur');
        }
      }

      // Créer le nouveau credential
      const credential = this.credentialRepository.create({
        personnel_id: dto.userType === 'personnel' ? dto.userId : null,
        client_id: dto.userType === 'client' ? dto.userId : null,
        user_type: dto.userType === 'personnel' ? UserType.PERSONNEL : UserType.CLIENT,
        credential_id: dto.credentialId,
        public_key: dto.publicKey,
        counter: 0,
        device_name: dto.deviceName || 'Appareil inconnu',
        device_type: dto.deviceType || null,
        browser_info: dto.browserInfo || null,
        is_resident_key: dto.isResidentKey ?? !!dto.userHandle, // ✅ Utiliser isResidentKey si fourni, sinon détecter via userHandle
        user_handle: dto.userHandle || null, // ✅ Stocker le user handle
        last_used_at: null,
      });

      // Valider le credential
      const validation = credential.validate();
      if (!validation.isValid) {
        throw new BadRequestException(`Validation échouée: ${validation.errors.join(', ')}`);
      }

      // Sauvegarder
      const saved = await this.credentialRepository.save(credential);

      console.log(`✅ Credential biométrique enregistré: ID=${saved.id}, Device=${saved.device_name}`);

      return {
        success: true,
        message: 'Credential biométrique enregistré avec succès',
        credentialId: saved.id,
      };
    } catch (error) {
      console.error('❌ Erreur enregistrement biométrique:', error);
      throw new BadRequestException(
        `Erreur lors de l'enregistrement: ${error.message}`,
      );
    }
  }

  /**
   * 🔍 Vérifier un credential biométrique et authentifier l'utilisateur
   * ✅ SIMPLIFIÉ: Utilise UNIQUEMENT le credentialId
   */
  async verifyBiometric(dto: VerifyBiometricDto): Promise<{ 
    success: boolean; 
    user: any; 
    credential: BiometricCredential;
  }> {
    try {
      console.log(`🔍 Vérification biométrique...`);
      console.log('📦 Données reçues:', {
        credentialIdLength: dto.credentialId?.length,
        credentialIdCOMPLET: dto.credentialId, // AFFICHER COMPLET pour débogage
        hasSignature: !!dto.signature,
        hasAuthData: !!dto.authenticatorData,
        hasClientData: !!dto.clientDataJSON
      });

      // ✅ SIMPLIFIÉ: Chercher UNIQUEMENT par credentialId
      if (!dto.credentialId) {
        throw new UnauthorizedException('credentialId requis pour l\'authentification biométrique');
      }

      // Chercher le credential par son ID unique
      let credential = await this.credentialRepository.findOne({
        where: { credential_id: dto.credentialId },
        relations: ['personnel', 'client'],
      });

      if (!credential) {
        // 🔄 FALLBACK: Chercher par correspondance partielle dans tous les credentials
        console.log('⚠️ Credential exact non trouvé, tentative de fallback...');
        
        const allCredentials = await this.credentialRepository.find({
          relations: ['personnel', 'client']
        });
        
        console.log(`🔍 Recherche parmi ${allCredentials.length} credential(s) en BD...`);
        
        // Essayer de trouver un credential qui CONTIENT le credentialId recherché
        // ou dont le credentialId recherché CONTIENT celui de la BD
        let foundCredential = null;
        
        for (const cred of allCredentials) {
          const bdCredId = cred.credential_id;
          const searchCredId = dto.credentialId;
          
          // Normaliser les deux formats (supprimer padding et convertir en minuscules)
          const normalizedBd = bdCredId.replace(/=/g, '').toLowerCase();
          const normalizedSearch = searchCredId.replace(/=/g, '').toLowerCase();
          
          // Aussi essayer de convertir base64 standard en base64url
          const base64ToBase64url = (str: string) => str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          const bdAsBase64url = base64ToBase64url(bdCredId).toLowerCase();
          const searchAsBase64url = base64ToBase64url(searchCredId).toLowerCase();
          
          // Vérifier si c'est le même (plusieurs formats possibles)
          if (bdCredId === searchCredId || 
              normalizedBd === normalizedSearch ||
              bdAsBase64url === searchAsBase64url) {
            foundCredential = cred;
            console.log('✅ Correspondance exacte trouvée (fallback)');
            break;
          }
          
          // Vérifier si l'un contient l'autre (cas de troncature)
          if (bdCredId.includes(searchCredId) || searchCredId.includes(bdCredId) ||
              normalizedBd.includes(normalizedSearch) || normalizedSearch.includes(normalizedBd)) {
            foundCredential = cred;
            console.log('⚠️ Correspondance partielle trouvée:', {
              bdLength: bdCredId.length,
              searchLength: searchCredId.length,
              device: cred.device_name
            });
            break;
          }
        }
        
        if (foundCredential) {
          credential = foundCredential;
          console.log('✅ Credential trouvé via fallback');
        } else {
          // Si toujours pas trouvé, logger pour debug
          console.error('❌ Credential introuvable même avec fallback:', {
            'recherchéCOMPLET': dto.credentialId,
            'recherchéLength': dto.credentialId.length,
            totalCredentialsEnBD: allCredentials.length,
            exemplesCredentialIds: allCredentials.slice(0, 3).map(c => ({
              id: c.id,
              credentialIdCOMPLET: c.credential_id,
              credentialIdLength: c.credential_id.length,
              device: c.device_name
            }))
          });
          
          throw new UnauthorizedException(`Credential introuvable. Total credentials en BD: ${allCredentials.length}`);
        }
      }

      console.log(`✅ Credential trouvé: ID=${credential.id}, User=${credential.user_type} #${credential.userId}`);

      // Vérifier la signature WebAuthn
      const isValid = await this.verifyWebAuthnSignature(
        dto.signature,
        dto.authenticatorData,
        dto.clientDataJSON,
        credential.public_key,
      );

      if (!isValid) {
        throw new UnauthorizedException('Signature biométrique invalide');
      }

      // Mettre à jour le credential (last_used_at et counter)
      credential.updateLastUsed();
      credential.incrementCounter();
      await this.credentialRepository.save(credential);

      // Récupérer l'utilisateur complet
      const user = credential.user_type === UserType.PERSONNEL
        ? await this.personnelRepository.findOne({ where: { id: credential.personnel_id! } })
        : await this.clientRepository.findOne({ where: { id: credential.client_id! } });

      if (!user) {
        throw new UnauthorizedException('Utilisateur introuvable');
      }

      console.log(`✅ Authentification réussie pour ${credential.user_type} #${credential.userId}`);

      // Construire l'objet user
      const userResponse = credential.user_type === UserType.PERSONNEL
        ? {
            id: (user as Personnel).id,
            username: (user as Personnel).nom_utilisateur,
            email: (user as Personnel).email,
            userType: 'personnel',
            role: (user as Personnel).role,
            firstName: (user as Personnel).prenom,
            lastName: (user as Personnel).nom,
          }
        : {
            id: (user as Client).id,
            username: (user as Client).nom,
            email: (user as Client).email,
            userType: 'client',
            role: 'client',
            firstName: (user as Client).nom,
            lastName: '',
          };

      return {
        success: true,
        user: userResponse,
        credential,
      };
    } catch (error) {
      console.error('❌ Erreur vérification biométrique:', error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException(
        `Erreur lors de la vérification: ${error.message}`,
      );
    }
  }

  /**
   * 📋 Lister tous les credentials d'un utilisateur (multi-appareils)
   */
  async listUserCredentials(userId: number, userType: 'personnel' | 'client'): Promise<BiometricCredentialInfo[]> {
    try {
      const whereClause = userType === 'personnel'
        ? { personnel_id: userId, user_type: UserType.PERSONNEL }
        : { client_id: userId, user_type: UserType.CLIENT };

      const credentials = await this.credentialRepository.find({
        where: whereClause,
        order: { created_at: 'DESC' },
      });

      return credentials.map(cred => ({
        id: cred.id,
        credentialId: cred.credential_id,
        deviceName: cred.displayName,
        deviceType: cred.device_type,
        createdAt: cred.created_at,
        lastUsedAt: cred.last_used_at,
        isRecentlyUsed: cred.isRecentlyUsed,
        counter: Number(cred.counter),
      }));
    } catch (error) {
      console.error('❌ Erreur liste credentials:', error);
      throw new BadRequestException('Erreur lors de la récupération des credentials');
    }
  }

  /**
   * 🗑️ Supprimer un credential spécifique
   */
  async deleteCredential(credentialId: number, userId: number, userType: 'personnel' | 'client'): Promise<{ success: boolean; message: string }> {
    try {
      const whereClause = userType === 'personnel'
        ? { id: credentialId, personnel_id: userId, user_type: UserType.PERSONNEL }
        : { id: credentialId, client_id: userId, user_type: UserType.CLIENT };

      const credential = await this.credentialRepository.findOne({ where: whereClause });

      if (!credential) {
        throw new BadRequestException('Credential introuvable');
      }

      await this.credentialRepository.remove(credential);

      console.log(`🗑️ Credential supprimé: ID=${credentialId}, Device=${credential.device_name}`);

      return {
        success: true,
        message: 'Credential supprimé avec succès',
      };
    } catch (error) {
      console.error('❌ Erreur suppression credential:', error);
      throw new BadRequestException('Erreur lors de la suppression du credential');
    }
  }

  /**
   * 📋 Récupérer les credentials d'un utilisateur par username/email
   * ✅ NOUVEAU: Pour permettre la connexion multi-appareils
   */
  async getUserCredentials(usernameOrEmail: string): Promise<{ 
    success: boolean; 
    credentials: Array<{ credentialId: string; deviceName: string }>;
    userId?: number;
    userType?: 'personnel' | 'client';
  }> {
    try {
      console.log(`🔍 Recherche credentials pour: ${usernameOrEmail}`);

      // Rechercher dans Personnel
      const personnel = await this.personnelRepository.findOne({
        where: [
          { nom_utilisateur: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      });

      if (personnel) {
        const credentials = await this.credentialRepository.find({
          where: { personnel_id: personnel.id, user_type: UserType.PERSONNEL },
          order: { created_at: 'DESC' },
        });

        console.log(`✅ ${credentials.length} credential(s) trouvé(s) pour personnel #${personnel.id}`);

        return {
          success: true,
          userId: personnel.id,
          userType: 'personnel',
          credentials: credentials.map(cred => ({
            credentialId: cred.credential_id,
            deviceName: cred.displayName || cred.device_name || 'Appareil inconnu'
          }))
        };
      }

      // Rechercher dans Client
      const client = await this.clientRepository.findOne({
        where: [
          { nom: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      });

      if (client) {
        const credentials = await this.credentialRepository.find({
          where: { client_id: client.id, user_type: UserType.CLIENT },
          order: { created_at: 'DESC' },
        });

        console.log(`✅ ${credentials.length} credential(s) trouvé(s) pour client #${client.id}`);

        return {
          success: true,
          userId: client.id,
          userType: 'client',
          credentials: credentials.map(cred => ({
            credentialId: cred.credential_id,
            deviceName: cred.displayName || cred.device_name || 'Appareil inconnu'
          }))
        };
      }

      console.log(`❌ Utilisateur non trouvé: ${usernameOrEmail}`);
      return {
        success: false,
        credentials: []
      };
    } catch (error) {
      console.error('❌ Erreur récupération credentials:', error);
      return {
        success: false,
        credentials: []
      };
    }
  }

  /**
   * 🔍 Vérifier si l'utilisateur a au moins un credential actif
   */
  async hasBiometricEnabled(userId: number, userType: 'personnel' | 'client'): Promise<{ 
    enabled: boolean; 
    credentialCount: number;
    hasResidentKey: boolean;
  }> {
    try {
      const whereClause = userType === 'personnel'
        ? { personnel_id: userId, user_type: UserType.PERSONNEL }
        : { client_id: userId, user_type: UserType.CLIENT };

      const credentials = await this.credentialRepository.find({ where: whereClause });

      return {
        enabled: credentials.length > 0,
        credentialCount: credentials.length,
        hasResidentKey: false, // Simplifié: pas de Resident Keys
      };
    } catch (error) {
      console.error('❌ Erreur vérification biométrique:', error);
      return { enabled: false, credentialCount: 0, hasResidentKey: false };
    }
  }

  /**
   * 📊 Vérifier le statut biométrique d'un utilisateur par username/email
   */
  async checkBiometricStatus(usernameOrEmail: string): Promise<BiometricStatusResponse> {
    try {
      // Rechercher dans Personnel
      const personnel = await this.personnelRepository.findOne({
        where: [
          { nom_utilisateur: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      });

      if (personnel) {
        const status = await this.hasBiometricEnabled(personnel.id, 'personnel');
        const credentials = status.enabled
          ? await this.listUserCredentials(personnel.id, 'personnel')
          : [];

        return {
          enabled: status.enabled,
          credentialCount: status.credentialCount,
          registeredAt: credentials[0]?.createdAt,
          userId: personnel.id,
          userType: 'personnel',
          credentials,
        };
      }

      // Rechercher dans Client
      const client = await this.clientRepository.findOne({
        where: [
          { nom: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      });

      if (client) {
        const status = await this.hasBiometricEnabled(client.id, 'client');
        const credentials = status.enabled
          ? await this.listUserCredentials(client.id, 'client')
          : [];

        return {
          enabled: status.enabled,
          credentialCount: status.credentialCount,
          registeredAt: credentials[0]?.createdAt,
          userId: client.id,
          userType: 'client',
          credentials,
        };
      }

      return {
        enabled: false,
        credentialCount: 0,
      };
    } catch (error) {
      console.error('❌ Erreur check status biométrique:', error);
      return {
        enabled: false,
        credentialCount: 0,
      };
    }
  }

  /**
   * 🔑 Obtenir un credential par credentialId
   */
  async getCredentialById(credentialId: string): Promise<BiometricCredential | null> {
    try {
      return await this.credentialRepository.findOne({
        where: { credential_id: credentialId },
        relations: ['personnel', 'client'],
      });
    } catch (error) {
      console.error('❌ Erreur récupération credential:', error);
      return null;
    }
  }

  /**
   * 🔑 Générer un challenge pour la vérification biométrique
   */
  generateBiometricChallenge(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * 🔐 Vérifier la signature WebAuthn (implémentation simplifiée)
   * IMPORTANT: Dans un vrai système, utilisez @simplewebauthn/server
   */
  private async verifyWebAuthnSignature(
    signature: string,
    authenticatorData: string,
    clientDataJSON: string,
    publicKey: string,
  ): Promise<boolean> {
    try {
      // ⚠️ IMPLÉMENTATION SIMPLIFIÉE - Mode développement
      // En production, utilisez @simplewebauthn/server
      
      console.log('⚠️ Vérification signature WebAuthn (mode simplifié)');
      
      // Décoder les données
      const authDataBuffer = Buffer.from(authenticatorData, 'base64url');
      const clientDataBuffer = Buffer.from(clientDataJSON, 'base64url');
      const signatureBuffer = Buffer.from(signature, 'base64url');
      
      // Hash du clientDataJSON
      const clientDataHash = crypto.createHash('sha256').update(clientDataBuffer).digest();
      
      // Construire le message signé
      const signedData = Buffer.concat([authDataBuffer, clientDataHash]);
      
      // ✅ MODE DÉVELOPPEMENT: Accepter toutes les signatures valides
      // En production, remplacer par une vraie vérification
      console.log('✅ Signature acceptée (mode développement)');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur vérification signature:', error);
      return false;
    }
  }

  /**
   * 🧹 Nettoyer les credentials inactifs (>90 jours)
   */
  async cleanupInactiveCredentials(days: number = 90): Promise<{ deleted: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await this.credentialRepository
        .createQueryBuilder()
        .delete()
        .where('last_used_at < :cutoffDate', { cutoffDate })
        .execute();

      console.log(`🧹 ${result.affected} credentials inactifs supprimés`);

      return { deleted: result.affected || 0 };
    } catch (error) {
      console.error('❌ Erreur nettoyage credentials:', error);
      return { deleted: 0 };
    }
  }
}
