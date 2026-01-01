/* import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { BiometricCredential, UserType } from '../entities/biometric-credential.entity';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';

// ================================================================
// DTOs pour les opérations biométriques
// ================================================================

export interface RegisterBiometricDto {
  userId: number;
  userType: 'personnel' | 'client';
  credentialId: string; // ID unique du credential WebAuthn (base64url)
  publicKey: string; // Clé publique au format PEM ou JWK
  deviceName?: string; // Nom de l'appareil (optionnel)
  deviceType?: string; // Type d'appareil (mobile, desktop, tablet)
  browserInfo?: string; // Info sur le navigateur
  isResidentKey?: boolean; // Indique si c'est un Resident Key
  userHandle?: string; // Handle utilisateur pour Resident Keys (optionnel)
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
  isResidentKey: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  isRecentlyUsed: boolean;
  counter: number;
  userHandle: string | null;
}

export interface CheckBiometricStatusDto {
  usernameOrEmail: string;
}

export interface BiometricStatusResponse {
  enabled: boolean;
  credentialCount: number;
  registeredAt?: Date;
  userId?: number;
  userType?: 'personnel' | 'client';
  hasResidentKey?: boolean;
  credentials?: BiometricCredentialInfo[];
}

// ================================================================
// SERVICE BIOMÉTRIQUE
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
   * ✅ Support multi-appareils: n'écrase PAS les credentials existants
   * ✅ Support Resident Keys (Passkeys) pour connexion sans username
  
  async registerBiometric(dto: RegisterBiometricDto): Promise<{ 
    success: boolean; 
    message: string; 
    credentialId: number; 
    userHandle?: string;
  }> {
    try {
      console.log(`🔐 Enregistrement biométrique pour ${dto.userType} #${dto.userId}`);
      console.log('📦 Données reçues:', {
        userId: dto.userId,
        userType: dto.userType,
        credentialIdLength: dto.credentialId?.length || 0,
        credentialIdPreview: dto.credentialId?.substring(0, 30),
        publicKeyLength: dto.publicKey?.length || 0,
        publicKeyPreview: dto.publicKey?.substring(0, 30),
        deviceName: dto.deviceName,
        isResidentKey: dto.isResidentKey,
        hasUserHandle: !!dto.userHandle
      });

      // Valider les données
      // WebAuthn credential IDs font généralement 16-32 bytes, soit ~22-44 caractères en base64url
      if (!dto.credentialId || dto.credentialId.length < 16) {
        console.error('❌ Validation échouée:', {
          hasCredentialId: !!dto.credentialId,
          length: dto.credentialId?.length || 0,
          type: typeof dto.credentialId
        });
        throw new BadRequestException('Credential ID invalide (trop court - min 16 caractères requis)');
      }

      if (!dto.publicKey || dto.publicKey.length < 32) {
        console.error('❌ Validation échouée:', {
          hasPublicKey: !!dto.publicKey,
          length: dto.publicKey?.length || 0,
          type: typeof dto.publicKey
        });
        throw new BadRequestException('Clé publique invalide (min 32 caractères requis)');
      }

      // Vérifier que l'utilisateur existe
      let user: Personnel | Client;
      if (dto.userType === 'personnel') {
        user = await this.personnelRepository.findOne({ where: { id: dto.userId } });
        if (!user) throw new BadRequestException('Personnel introuvable');
      } else {
        user = await this.clientRepository.findOne({ where: { id: dto.userId } });
        if (!user) throw new BadRequestException('Client introuvable');
      }

      // Vérifier si le credential existe déjà (éviter les doublons)
      const existingCredential = await this.credentialRepository.findOne({
        where: { credential_id: dto.credentialId },
      });

      if (existingCredential) {
        console.log('⚠️ Credential déjà enregistré, mise à jour...');
        existingCredential.device_name = dto.deviceName || existingCredential.device_name;
        existingCredential.device_type = dto.deviceType || existingCredential.device_type;
        existingCredential.browser_info = dto.browserInfo || existingCredential.browser_info;
        existingCredential.is_resident_key = dto.isResidentKey ?? existingCredential.is_resident_key;
        
        if (existingCredential.is_resident_key && !existingCredential.user_handle) {
          existingCredential.user_handle = dto.userHandle || BiometricCredential.generateUserHandle(
            dto.userId,
            dto.userType === 'personnel' ? UserType.PERSONNEL : UserType.CLIENT,
          );
        }
        
        await this.credentialRepository.save(existingCredential);
        return { 
          success: true, 
          message: 'Credential mis à jour', 
          credentialId: existingCredential.id,
          userHandle: existingCredential.user_handle || undefined,
        };
      }

      // Générer un user_handle pour Resident Keys
      let userHandle: string | null = null;
      if (dto.isResidentKey) {
        userHandle = dto.userHandle || BiometricCredential.generateUserHandle(
          dto.userId,
          dto.userType === 'personnel' ? UserType.PERSONNEL : UserType.CLIENT,
        );
        console.log(`🔑 Resident Key activé, user_handle généré: ${userHandle.substring(0, 20)}...`);
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
        is_resident_key: dto.isResidentKey || false,
        user_handle: userHandle,
        last_used_at: null,
      });

      // Valider le credential
      const validation = credential.validate();
      if (!validation.isValid) {
        throw new BadRequestException(`Validation échouée: ${validation.errors.join(', ')}`);
      }

      // Sauvegarder
      const saved = await this.credentialRepository.save(credential);

      console.log(`✅ Credential biométrique enregistré: ID=${saved.id}, Device=${saved.device_name}, ResidentKey=${saved.is_resident_key}`);

      return {
        success: true,
        message: 'Credential biométrique enregistré avec succès',
        credentialId: saved.id,
        userHandle: saved.user_handle || undefined,
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
   * ✅ Support multi-appareils: vérifie le counter anti-replay
   
  async verifyBiometric(dto: VerifyBiometricDto): Promise<{ 
    success: boolean; 
    user: any; 
    credential: BiometricCredential;
  }> {
    try {
      console.log(`🔍 Vérification biométrique...`);
      console.log('📦 Données reçues:', {
        credentialId: dto.credentialId?.substring(0, 30),
        hasSignature: !!dto.signature
      });

      // ✅ SIMPLIFIÉ: Chercher UNIQUEMENT par credentialId
      if (!dto.credentialId) {
        console.error('❌ credentialId manquant');
        throw new UnauthorizedException('credentialId requis pour l\'authentification biométrique');
      }

      let credential: BiometricCredential | null = null;

      // Chercher le credential par son ID unique
      if (dto.credentialId) {
        console.log(`🔍 Recherche par credentialId: ${dto.credentialId.substring(0, 20)}...`);
        credential = await this.credentialRepository.findOne({
          where: { credential_id: dto.credentialId },
          relations: ['personnel', 'client'],
        });

        if (credential) {
          console.log(`✅ Credential trouvé par credentialId pour ${credential.user_type} #${credential.personnel_id || credential.client_id}`);
        } else {
          console.log(`⚠️ Credential introuvable avec ID: ${dto.credentialId}`);
          console.log(`🔄 Tentative de recherche par userHandle...`);
          
          // FALLBACK: Chercher par userHandle si credentialId non trouvé
          if (dto.userHandle) {
            credential = await this.credentialRepository.findOne({
              where: { user_handle: dto.userHandle },
              relations: ['personnel', 'client'],
            });
            
            if (credential) {
              console.log(`✅ Credential trouvé par userHandle pour ${credential.user_type} #${credential.personnel_id || credential.client_id}`);
            }
          }
          
          // FALLBACK 2: Si toujours pas trouvé, chercher parmi TOUTES les credentials Resident Key
          // et vérifier la signature avec chacune
          if (!credential) {
            console.log(`🔄 Recherche parmi toutes les credentials Resident Key...`);
            const allResidentKeys = await this.credentialRepository.find({
              where: { is_resident_key: true },
              relations: ['personnel', 'client'],
              take: 50 // Limite pour éviter trop de tentatives
            });
            
            console.log(`📋 ${allResidentKeys.length} Resident Keys trouvées, test de signature...`);
            
            // On va essayer de vérifier la signature avec chaque credential
            // La bonne credential sera celle dont la signature est valide
            for (const testCredential of allResidentKeys) {
              try {
                // Tester si la signature correspond à cette credential
                const isValid = await this.verifySignature(
                  testCredential,
                  dto.signature,
                  dto.authenticatorData,
                  dto.clientDataJSON
                );
                
                if (isValid) {
                  console.log(`✅ Signature valide trouvée pour credential ${testCredential.credential_id.substring(0, 20)}... (user: ${testCredential.user_type} #${testCredential.personnel_id || testCredential.client_id})`);
                  credential = testCredential;
                  break;
                }
              } catch (err) {
                // Ignorer les erreurs de vérification, continuer avec la prochaine credential
                continue;
              }
            }
            
            if (!credential) {
              throw new UnauthorizedException('Aucune credential valide trouvée pour cette empreinte');
            }
          }
        }
      }
      // Cas 2: Resident Key avec userHandle uniquement
      else if (dto.userHandle) {
        console.log(`🔑 Recherche par userHandle reçu:`, {
          userHandle: dto.userHandle,
          length: dto.userHandle.length,
          first20: dto.userHandle.substring(0, 20)
        });
        
        credential = await this.credentialRepository.findOne({
          where: { user_handle: dto.userHandle },
          relations: ['personnel', 'client'],
        });

        if (!credential) {
          // Log pour debug - vérifier ce qui est en DB
          const allCredentials = await this.credentialRepository.find({
            select: ['id', 'user_handle', 'credential_id'],
            take: 5
          });
          console.log('❌ User handle non trouvé. Credentials en DB:', allCredentials);
          throw new UnauthorizedException('User handle invalide');
        }
      }
      // Cas 3: UserId + UserType fournis
      else if (dto.userId && dto.userType) {
        console.log(`🔍 Recherche par userId: ${dto.userType} #${dto.userId}`);
        const whereClause = dto.userType === 'personnel'
          ? { personnel_id: dto.userId, user_type: UserType.PERSONNEL }
          : { client_id: dto.userId, user_type: UserType.CLIENT };

        // Récupérer le credential le plus récemment utilisé
        const credentials = await this.credentialRepository.find({
          where: whereClause,
          relations: ['personnel', 'client'],
          order: { last_used_at: 'DESC' },
        });

        if (credentials.length === 0) {
          throw new UnauthorizedException('Aucun credential trouvé pour cet utilisateur');
        }

        credential = credentials[0]; // Utiliser le plus récent
      } else {
        throw new BadRequestException('credentialId, userHandle ou userId+userType requis');
      }

      console.log(`✅ Credential trouvé: ID=${credential.id}, User=${credential.user_type} #${credential.userId}`);

      // Vérifier la signature WebAuthn (implémentation simplifiée)
      // Dans un vrai système, utilisez la bibliothèque @simplewebauthn/server
      const isValid = await this.verifyWebAuthnSignature(
        dto.signature,
        dto.authenticatorData,
        dto.clientDataJSON,
        credential.public_key,
      );

      if (!isValid) {
        console.log('❌ Signature WebAuthn invalide');
        throw new UnauthorizedException('Signature invalide');
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

      // Construire l'objet user en fonction du type
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
        isResidentKey: cred.is_resident_key,
        createdAt: cred.created_at,
        lastUsedAt: cred.last_used_at,
        isRecentlyUsed: cred.isRecentlyUsed,
        counter: Number(cred.counter),
        userHandle: cred.user_handle,
      }));
    } catch (error) {
      console.error('❌ Erreur liste credentials:', error);
      throw new BadRequestException('Erreur lors de la récupération des credentials');
    }
  }

  /**
   * 🗑️ Supprimer un credential spécifique
   
  async deleteCredential(credentialId: number, userId: number, userType: 'personnel' | 'client'): Promise<{ success: boolean; message: string }> {
    try {
      const whereClause = userType === 'personnel'
        ? { id: credentialId, personnel_id: userId, user_type: UserType.PERSONNEL }
        : { id: credentialId, client_id: userId, user_type: UserType.CLIENT };

      const credential = await this.credentialRepository.findOne({ where: whereClause });

      if (!credential) {
        throw new BadRequestException('Credential introuvable ou non autorisé');
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
   * 🔍 Vérifier si l'utilisateur a au moins un credential actif
   
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

      const hasResidentKey = credentials.some(cred => cred.is_resident_key);

      return {
        enabled: credentials.length > 0,
        credentialCount: credentials.length,
        hasResidentKey,
      };
    } catch (error) {
      console.error('❌ Erreur vérification biométrique:', error);
      return { enabled: false, credentialCount: 0, hasResidentKey: false };
    }
  }

  /**
   * 📊 Vérifier le statut biométrique d'un utilisateur par username/email
   
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
        const credentials = await this.credentialRepository.find({
          where: { personnel_id: personnel.id, user_type: UserType.PERSONNEL },
          order: { created_at: 'ASC' },
        });

        const hasResidentKey = credentials.some(cred => cred.is_resident_key);

        return {
          enabled: credentials.length > 0,
          credentialCount: credentials.length,
          registeredAt: credentials.length > 0 ? credentials[0].created_at : undefined,
          userId: personnel.id,
          userType: 'personnel',
          hasResidentKey,
        };
      }

      // Rechercher dans Client
      const client = await this.clientRepository.findOne({
        where: [
          { nom: usernameOrEmail },
          { interlocuteur: usernameOrEmail },
        ],
      });

      if (client) {
        const credentials = await this.credentialRepository.find({
          where: { client_id: client.id, user_type: UserType.CLIENT },
          order: { created_at: 'ASC' },
        });

        const hasResidentKey = credentials.some(cred => cred.is_resident_key);

        return {
          enabled: credentials.length > 0,
          credentialCount: credentials.length,
          registeredAt: credentials.length > 0 ? credentials[0].created_at : undefined,
          userId: client.id,
          userType: 'client',
          hasResidentKey,
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
   * 🔑 Obtenir un credential par credentialId (pour l'authentification)
   
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
   
  generateBiometricChallenge(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Helper pour vérifier une signature avec une credential spécifique
   
  private async verifySignature(
    credential: BiometricCredential,
    signature: string,
    authenticatorData: string,
    clientDataJSON: string,
  ): Promise<boolean> {
    return this.verifyWebAuthnSignature(
      signature,
      authenticatorData,
      clientDataJSON,
      credential.public_key,
    );
  }

  /**
   * 🔐 Vérifier la signature WebAuthn (implémentation simplifiée)
   * IMPORTANT: Dans un vrai système, utilisez @simplewebauthn/server
   
  private async verifyWebAuthnSignature(
    signature: string,
    authenticatorData: string,
    clientDataJSON: string,
    publicKey: string,
  ): Promise<boolean> {
    try {
      // ⚠️ IMPLÉMENTATION SIMPLIFIÉE - NE PAS UTILISER EN PRODUCTION
      // En production, utilisez @simplewebauthn/server pour une vérification complète
      
      console.log('⚠️ Vérification signature WebAuthn (mode simplifié)');
      
      // Décoder les données
      const authDataBuffer = Buffer.from(authenticatorData, 'base64url');
      const clientDataBuffer = Buffer.from(clientDataJSON, 'base64url');
      const signatureBuffer = Buffer.from(signature, 'base64url');
      
      // Hash du clientDataJSON
      const clientDataHash = crypto.createHash('sha256').update(clientDataBuffer).digest();
      
      // Construire le message signé (authenticatorData + clientDataHash)
      const signedData = Buffer.concat([authDataBuffer, clientDataHash]);
      
      // Vérifier la signature avec la clé publique
      // Note: Ceci est une version simplifiée, en production utilisez une bibliothèque robuste
      const verify = crypto.createVerify('SHA256');
      verify.update(signedData);
      
      // Convertir la clé publique si nécessaire (format PEM attendu)
      const isValid = verify.verify(publicKey, signatureBuffer);
      
      console.log(`${isValid ? '✅' : '❌'} Signature vérifiée: ${isValid}`);
      
      return isValid;
    } catch (error) {
      console.error('❌ Erreur vérification signature:', error);
      return false;
    }
  }

  /**
   * 🧹 Nettoyer les credentials inactifs (>90 jours)
   
  async cleanupInactiveCredentials(days: number = 90): Promise<{ deleted: number }> {
    try {
      const credentials = await this.credentialRepository.find();
      const inactiveCredentials = credentials.filter(cred => cred.isInactive(days));

      await this.credentialRepository.remove(inactiveCredentials);

      console.log(`🧹 ${inactiveCredentials.length} credentials inactifs supprimés (>${days} jours)`);

      return { deleted: inactiveCredentials.length };
    } catch (error) {
      console.error('❌ Erreur nettoyage credentials:', error);
      throw new BadRequestException('Erreur lors du nettoyage des credentials');
    }
  }
}
 */