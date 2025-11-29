import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BiometricService, RegisterBiometricDto, VerifyBiometricDto, BiometricStatusResponse } from './biometric.service';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * 🔐 Contrôleur d'authentification biométrique
 * Gère les opérations WebAuthn multi-appareils avec Resident Keys
 * 
 * ROUTES:
 * - POST /auth/biometric/register - Enregistrer un nouveau credential
 * - POST /auth/biometric/verify - Vérifier et se connecter avec biométrie
 * - POST /auth/biometric/check-status - Vérifier statut par username/email
 * - POST /auth/biometric/get-credentials - Récupérer credentials par username/email
 * - GET /auth/biometric/status - Obtenir statut utilisateur connecté
 * - GET /auth/biometric/credentials - Lister tous les appareils
 * - DELETE /auth/biometric/credentials/:id - Supprimer un appareil
 * - POST /auth/biometric/disable - Désactiver la biométrie
 * - GET /auth/biometric/challenge - Générer un challenge
 */
@Controller('auth/biometric')
export class BiometricController {
  constructor(
    private readonly biometricService: BiometricService,
    private readonly jwtService: JwtService
  ) {}

  /**
   * 📝 Enregistrer un nouveau credential biométrique
   * Requiert une authentification JWT
   */
  @Post('register')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterBiometricDto, @Request() req: any) {
    try {
      // Vérifier que l'utilisateur enregistre pour lui-même
      const currentUser = req.user;
      
      if (!currentUser) {
        throw new BadRequestException('Utilisateur non authentifié');
      }

      // Extraire userId et userType depuis le JWT
      const userId = currentUser.sub || currentUser.id;
      const userType = currentUser.userType || (currentUser.isPersonnel ? 'personnel' : 'client');

      // Vérifier que l'utilisateur ne tente pas d'enregistrer pour quelqu'un d'autre
      if (dto.userId !== userId || dto.userType !== userType) {
        throw new BadRequestException('Vous ne pouvez enregistrer que vos propres credentials');
      }

      console.log(`📝 Enregistrement credential pour ${userType} #${userId}`);

      const result = await this.biometricService.registerBiometric(dto);

      return {
        success: true,
        message: result.message,
        credentialId: result.credentialId,
        registeredAt: new Date(),
      };
    } catch (error) {
      console.error('❌ Erreur register endpoint:', error);
      throw error;
    }
  }

  /**
   * 🔓 Vérifier un credential biométrique et se connecter
   * PAS de garde JWT (authentification biométrique)
   * ✅ Génère un token JWT pour la session
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifyBiometricDto) {
    try {
      console.log('🔓 Tentative de connexion biométrique...');

      const result = await this.biometricService.verifyBiometric(dto);

      // ✅ Générer un token JWT pour l'utilisateur authentifié
      const payload = {
        username: result.user.username,
        sub: result.user.id,
        email: result.user.email,
        userType: result.user.userType,
        role: result.user.role,
      };

      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

      console.log('✅ Tokens JWT générés pour:', result.user.username);

      return {
        success: true,
        message: 'Authentification biométrique réussie',
        user: result.user,
        access_token,
        refresh_token,
      };
    } catch (error) {
      console.error('❌ Erreur verify endpoint:', error);
      throw error;
    }
  }

  /**
   * 📊 Vérifier le statut biométrique d'un utilisateur (par username/email)
   * PAS de garde JWT (utilisé avant connexion)
   */
  @Post('check-status')
  @HttpCode(HttpStatus.OK)
  async checkStatus(@Body() body: { usernameOrEmail: string }): Promise<BiometricStatusResponse> {
    try {
      if (!body.usernameOrEmail) {
        throw new BadRequestException('usernameOrEmail requis');
      }

      console.log(`📊 Vérification statut biométrique pour: ${body.usernameOrEmail}`);

      return await this.biometricService.checkBiometricStatus(body.usernameOrEmail);
    } catch (error) {
      console.error('❌ Erreur check-status endpoint:', error);
      throw error;
    }
  }

  /**
   * 📋 Récupérer les credentials d'un utilisateur (par username/email)
   * PAS de garde JWT (utilisé avant connexion)
   * ✅ NOUVEAU: Pour permettre connexion multi-appareils
   */
  @Post('get-credentials')
  @HttpCode(HttpStatus.OK)
  async getCredentials(@Body() body: { usernameOrEmail: string }) {
    try {
      if (!body.usernameOrEmail) {
        throw new BadRequestException('usernameOrEmail requis');
      }

      console.log(`📋 Récupération credentials pour: ${body.usernameOrEmail}`);

      return await this.biometricService.getUserCredentials(body.usernameOrEmail);
    } catch (error) {
      console.error('❌ Erreur get-credentials endpoint:', error);
      throw error;
    }
  }

  /**
   * 📊 Obtenir le statut biométrique de l'utilisateur connecté
   * Requiert une authentification JWT
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Request() req: any): Promise<BiometricStatusResponse> {
    try {
      const currentUser = req.user;
      const userId = currentUser.sub || currentUser.id;
      const userType = currentUser.userType || (currentUser.isPersonnel ? 'personnel' : 'client');

      console.log(`📊 Récupération statut pour ${userType} #${userId}`);

      const status = await this.biometricService.hasBiometricEnabled(userId, userType);
      const credentials = await this.biometricService.listUserCredentials(userId, userType);

      return {
        enabled: status.enabled,
        credentialCount: status.credentialCount,
        registeredAt: credentials.length > 0 ? credentials[0].createdAt : undefined,
        userId,
        userType,
        credentials,
      };
    } catch (error) {
      console.error('❌ Erreur status endpoint:', error);
      throw error;
    }
  }

  /**
   * 📋 Lister tous les credentials/appareils de l'utilisateur
   * Requiert une authentification JWT
   */
  @Get('credentials')
  @UseGuards(JwtAuthGuard)
  async listCredentials(@Request() req: any) {
    try {
      const currentUser = req.user;
      const userId = currentUser.sub || currentUser.id;
      const userType = currentUser.userType || (currentUser.isPersonnel ? 'personnel' : 'client');

      console.log(`📋 Liste des credentials pour ${userType} #${userId}`);

      const credentials = await this.biometricService.listUserCredentials(userId, userType);

      return {
        success: true,
        count: credentials.length,
        credentials,
      };
    } catch (error) {
      console.error('❌ Erreur list credentials endpoint:', error);
      throw error;
    }
  }

  /**
   * 🗑️ Supprimer un credential/appareil spécifique
   * Requiert une authentification JWT
   */
  @Delete('credentials/:id')
  @UseGuards(JwtAuthGuard)
  async deleteCredential(@Param('id') credentialId: string, @Request() req: any) {
    try {
      const currentUser = req.user;
      const userId = currentUser.sub || currentUser.id;
      const userType = currentUser.userType || (currentUser.isPersonnel ? 'personnel' : 'client');

      console.log(`🗑️ Suppression credential #${credentialId} pour ${userType} #${userId}`);

      const result = await this.biometricService.deleteCredential(
        parseInt(credentialId),
        userId,
        userType,
      );

      return result;
    } catch (error) {
      console.error('❌ Erreur delete credential endpoint:', error);
      throw error;
    }
  }

  /**
   * ❌ Désactiver complètement l'authentification biométrique
   * Supprime TOUS les credentials de l'utilisateur
   * Requiert une authentification JWT
   */
  @Post('disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disable(@Request() req: any) {
    try {
      const currentUser = req.user;
      const userId = currentUser.sub || currentUser.id;
      const userType = currentUser.userType || (currentUser.isPersonnel ? 'personnel' : 'client');

      console.log(`❌ Désactivation biométrie pour ${userType} #${userId}`);

      // Récupérer tous les credentials
      const credentials = await this.biometricService.listUserCredentials(userId, userType);

      // Supprimer tous les credentials
      for (const cred of credentials) {
        await this.biometricService.deleteCredential(cred.id, userId, userType);
      }

      console.log(`✅ ${credentials.length} credentials supprimés`);

      return {
        success: true,
        message: 'Authentification biométrique désactivée',
        deletedCount: credentials.length,
      };
    } catch (error) {
      console.error('❌ Erreur disable endpoint:', error);
      throw error;
    }
  }

  /**
   * 🔑 Générer un challenge pour l'authentification WebAuthn
   * PAS de garde JWT (utilisé pour la connexion)
   */
  @Get('challenge')
  async generateChallenge() {
    try {
      const challenge = this.biometricService.generateBiometricChallenge();

      console.log(`🔑 Challenge généré: ${challenge.substring(0, 20)}...`);

      return {
        success: true,
        challenge,
      };
    } catch (error) {
      console.error('❌ Erreur challenge endpoint:', error);
      throw error;
    }
  }

  /**
   * 🧹 Nettoyer les credentials inactifs (>90 jours)
   * Admin uniquement (à protéger avec un guard Admin)
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanup(@Body() body: { days?: number }) {
    try {
      const days = body.days || 90;

      console.log(`🧹 Nettoyage des credentials inactifs (>${days} jours)...`);

      const result = await this.biometricService.cleanupInactiveCredentials(days);

      return {
        success: true,
        message: `${result.deleted} credentials inactifs supprimés`,
        deleted: result.deleted,
      };
    } catch (error) {
      console.error('❌ Erreur cleanup endpoint:', error);
      throw error;
    }
  }

  /**
   * 🔍 Récupérer un credential par son ID (pour l'authentification)
   * Route utilisée par le frontend lors de la connexion biométrique
   * PAS de garde JWT (utilisé pour la connexion)
   */
  @Post('get-credential')
  @HttpCode(HttpStatus.OK)
  async getCredential(@Body() body: { credentialId: string }) {
    try {
      if (!body.credentialId) {
        throw new BadRequestException('credentialId requis');
      }

      console.log(`🔍 Récupération credential: ${body.credentialId.substring(0, 20)}...`);

      const credential = await this.biometricService.getCredentialById(body.credentialId);

      if (!credential) {
        return {
          success: false,
          found: false,
          message: 'Credential non trouvé',
        };
      }

      // Retourner les informations nécessaires pour la vérification
      return {
        success: true,
        found: true,
        credential: {
          id: credential.id,
          credentialId: credential.credential_id,
          userId: credential.userId,
          userType: credential.user_type,
          deviceName: credential.device_name,
          isResidentKey: credential.is_resident_key,
          publicKey: credential.public_key, // Nécessaire pour vérifier la signature
        },
      };
    } catch (error) {
      console.error('❌ Erreur get-credential endpoint:', error);
      throw error;
    }
  }
}
