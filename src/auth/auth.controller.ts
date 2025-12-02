import {
  Controller,
  Post,
  Put,
  UseGuards,
  Request,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Get,
  Delete,
  UnauthorizedException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  NotFoundException,
  Req,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request as ExpressRequest } from 'express';
import { AuthService, LoginDto } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CreatePersonnelDto, CreateClientDto } from '../dto/register.dto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { imageFileFilter } from '../config/storage.config';
import { v2 as cloudinary } from 'cloudinary';

// DTOs pour la récupération de mot de passe
interface ForgotPasswordDto {
  email: string;
}

interface VerifyOtpDto {
  email: string;
  otpCode: string;
}

interface ResetPasswordDto {
  email: string;
  newPassword: string;
  otpToken?: string; // Token OTP pour validation
}

// Interface pour l'utilisateur authentifié dans les requêtes
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: string;
  userType: 'client' | 'personnel';
  [key: string]: any; // Pour d'autres propriétés éventuelles
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    // IMPORTANT: Nettoyer TOUS les cookies d'authentification avant la nouvelle connexion
    console.log('🧹 Nettoyage forcé des cookies avant nouvelle connexion');
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/'
    });
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/'
    });

    const result = await this.authService.login(loginDto);
    console.log('🔑 Nouvelle connexion pour:', result.user.username, 'Rôle:', result.user.role);

    // SOLUTION ALTERNATIVE : Cookies NON httpOnly pour permettre l'accès JavaScript
    const cookieOptions = {
      httpOnly: false, // CHANGEMENT CRITIQUE : Permettre l'accès JavaScript
      secure: false, // false en dev pour localhost
      sameSite: 'lax' as const, // lax pour les requêtes same-site
      maxAge: 8 * 60 * 60 * 1000, // 8 heures
      path: '/' // Accessible partout
    };    // NOUVELLE SÉCURITÉ : Ajouter l'ID utilisateur dans le nom du cookie pour éviter les conflits
    const userCookieSuffix = `_${result.user.id}_${result.user.userType}`;
    console.log('🔐 Création de cookies spécifiques à l\'utilisateur:', userCookieSuffix);

    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 8 * 60 * 60 * 1000, // 8 heures - même durée pour éviter les incohérences
    };

    // CORRECTION COMPLÈTE : Nettoyer TOUS les anciens cookies utilisateur 
    if (req.headers.cookie) {
      const existingCookies = req.headers.cookie.split(';');
      existingCookies.forEach(cookie => {
        const cookieName = cookie.split('=')[0].trim();
        if (cookieName.startsWith('access_token_') || cookieName.startsWith('refresh_token_')) {
          response.clearCookie(cookieName, cookieOptions);
          console.log('🧹 Cookie spécifique ancien supprimé:', cookieName);
        }
      });
    }

    // PRIORITÉ : Définir d'abord les cookies génériques (pour compatibilité)
    response.cookie('access_token', result.access_token, cookieOptions);
    response.cookie('refresh_token', result.refresh_token, refreshCookieOptions);
    
    // BONUS : Ajouter aussi les cookies spécifiques (pour éviter conflits futurs)
    response.cookie(`access_token${userCookieSuffix}`, result.access_token, cookieOptions);
    response.cookie(`refresh_token${userCookieSuffix}`, result.refresh_token, refreshCookieOptions);

    console.log('✅ Nouveaux cookies définis pour:', result.user.username);
    
    // DEBUG : Vérifier que les cookies sont bien définis
    console.log('🔍 DEBUG - Cookies définis dans la réponse:', {
      access_token: 'Cookie générique défini',
      [`access_token${userCookieSuffix}`]: 'Cookie spécifique défini',
      cookieOptions: {
        httpOnly: cookieOptions.httpOnly,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        maxAge: cookieOptions.maxAge,
        path: cookieOptions.path
      }
    });

    return {
      message: 'Connexion réussie',
      user: result.user,
      access_token: result.access_token, // Pour compatibilité avec le frontend
      refresh_token: result.refresh_token, // ✅ AJOUT: Retourner aussi le refresh_token dans le body
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    console.log('🔄 Endpoint refresh appelé');
    
    // ✅ AMÉLIORATION: Chercher le refresh_token dans plusieurs sources
    let refresh_token = req.cookies?.refresh_token;
    
    // Si pas dans les cookies, chercher dans le body
    if (!refresh_token && req.body?.refresh_token) {
      refresh_token = req.body.refresh_token;
      console.log('🔄 Refresh token trouvé dans le body');
    }
    
    // Si toujours pas trouvé, chercher dans localStorage via l'Authorization header
    if (!refresh_token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        refresh_token = authHeader.substring(7);
        console.log('🔄 Refresh token trouvé dans Authorization header');
      }
    }

    if (!refresh_token) {
      console.log('❌ Token de rafraîchissement manquant');
      throw new UnauthorizedException('Token de rafraîchissement manquant');
    }

    console.log('✅ Token de rafraîchissement trouvé, validation en cours...');
    const result = await this.authService.refreshToken(refresh_token);

    // Mettre à jour les cookies - Configuration 8 heures cohérente
    const cookieOptions = {
      httpOnly: false, // ✅ CHANGEMENT: Non httpOnly pour accès JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 8 * 60 * 60 * 1000, // 8 heures - cohérent avec la configuration initiale
      path: '/'
    };

    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 8 * 60 * 60 * 1000, // 8 heures - cohérent avec la configuration globale
    };

    response.cookie('access_token', result.access_token, cookieOptions);
    response.cookie(
      'refresh_token',
      result.refresh_token,
      refreshCookieOptions,
    );

    console.log('✅ Tokens refreshés et cookies mis à jour');

    return {
      message: 'Token rafraîchi avec succès',
      user: result.user,
      access_token: result.access_token,
      refresh_token: result.refresh_token, // ✅ AJOUT: Retourner aussi le refresh_token
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const fullUserProfile = await this.authService.getFullUserProfile(req.user.id, req.user.userType);
    // Retourner directement le profil sans wrapper
    return fullUserProfile;
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Request() req, @Body() updateData: any) {
    const updatedProfile = await this.authService.updateUserProfile(req.user.id, req.user.userType, updateData);
    return updatedProfile;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req, @Body() passwordData: { currentPassword: string; newPassword: string }) {
    const result = await this.authService.changeUserPassword(req.user.id, req.user.userType, passwordData);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password-first-login')
  async changePasswordFirstLogin(@Request() req, @Body() passwordData: { newPassword: string }) {
    const result = await this.authService.changePasswordFirstLogin(req.user.id, req.user.userType, passwordData.newPassword);
    return result;
  }

  @Get('debug-cookies')
  @HttpCode(HttpStatus.OK)
  debugCookies(@Request() req) {
    console.log('🍪 DEBUG - Analyse des cookies reçus');
    const cookieHeader = req.headers.cookie;
    const cookies = req.cookies || {};
    
    console.log('📋 Headers cookies bruts:', cookieHeader);
    console.log('📦 Cookies parsés:', cookies);
    
    return {
      message: 'Debug des cookies',
      cookieHeader,
      parsedCookies: cookies,
      availableCookies: Object.keys(cookies),
      hasAccessToken: 'access_token' in cookies,
      accessTokenPreview: cookies.access_token ? cookies.access_token.substring(0, 50) + '...' : 'Non trouvé'
    };
  }

  @Post('invalidate-sessions')
  @HttpCode(HttpStatus.OK)
  async invalidateServerSessions(@Res({ passthrough: true }) response: Response) {
    console.log('🧹 INVALIDATION FORCÉE DES SESSIONS SERVEUR');
    
    // Nettoyer TOUS les cookies d'authentification possibles
    const allCookiePatterns = [
      'access_token', 'refresh_token', 
      'access_token_*', 'refresh_token_*', // Cookies spécifiques aux utilisateurs
      'keycloak_token'
    ];
    
    allCookiePatterns.forEach(pattern => {
      response.clearCookie(pattern, { path: '/' });
      response.clearCookie(pattern, { path: '/', domain: 'localhost' });
      response.clearCookie(pattern, { path: '/', domain: '.localhost' });
    });
    
    console.log('✅ Sessions serveur invalidées pour tous les utilisateurs');
    return { message: 'Sessions invalidées avec succès' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req, @Res({ passthrough: true }) response: Response) {
    try {
      this.logger.log('🔴 ========== ENDPOINT LOGOUT APPELÉ ==========');
      
      // Récupérer les informations utilisateur depuis le token JWT
      const user = req.user;
      this.logger.log(`📋 User from JWT: ${JSON.stringify({ id: user?.id, username: user?.username, userType: user?.userType })}`);
      
      if (user && user.id && user.userType) {
        this.logger.log(`🔄 Appel authService.logout pour user ${user.id} (${user.userType})`);
        
        // Mettre à jour le statut en ligne dans la base de données
        const result = await this.authService.logout(user.id.toString(), user.userType);
        
        this.logger.log(`✅ Déconnexion de ${user.userType} ${user.username} (ID: ${user.id}) - Result: ${JSON.stringify(result)}`);
      } else {
        this.logger.warn('⚠️ User ou user.id ou user.userType manquant dans la requête');
      }

      // Supprimer les cookies
      response.clearCookie('access_token');
      response.clearCookie('refresh_token');
      this.logger.log('🍪 Cookies supprimés');

      this.logger.log('🔴 ========== FIN ENDPOINT LOGOUT ==========');
      return {
        success: true,
        message: 'Déconnexion réussie',
      };
    } catch (error) {
      this.logger.error('❌ ========== ERREUR DANS LOGOUT ==========');
      this.logger.error('Erreur lors de la déconnexion:', error);
      this.logger.error('Stack:', error.stack);
      
      // Même en cas d'erreur, supprimer les cookies
      response.clearCookie('access_token');
      response.clearCookie('refresh_token');
      
      this.logger.log('🔴 ========== FIN ENDPOINT LOGOUT (AVEC ERREUR) ==========');
      return {
        success: true, // On retourne quand même success car les cookies sont supprimés
        message: 'Déconnexion réussie',
      };
    }
  }

  /**
   * Heartbeat pour maintenir le statut en ligne
   * Appelé régulièrement par le frontend
   */
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Body() data: { userId: string; userType: 'personnel' | 'client' }) {
    try {
      const { userId, userType } = data;
      
      if (!userId || !userType) {
        this.logger.warn('❌ Heartbeat - Données manquantes');
        return { success: false, message: 'Données manquantes' };
      }

      const id = parseInt(userId);

      if (userType === 'personnel') {
        const result = await this.authService.personnelRepository
          .createQueryBuilder()
          .update()
          .set({ statut_en_ligne: true })
          .where('id = :id', { id })
          .execute();
        this.logger.debug(`💓 Heartbeat personnel ${id} - affected: ${result.affected}`);
      } else {
        const result = await this.authService.clientRepository
          .createQueryBuilder()
          .update()
          .set({ statut_en_ligne: true })
          .where('id = :id', { id })
          .execute();
        this.logger.debug(`💓 Heartbeat client ${id} - affected: ${result.affected}`);
      }

      return { success: true, message: 'Heartbeat reçu' };
    } catch (error) {
      this.logger.error('❌ Erreur heartbeat:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Mettre l'utilisateur hors ligne (appelé via sendBeacon lors de beforeunload)
   */
  @Post('set-offline')
  @HttpCode(HttpStatus.OK)
  async setOffline(@Body() data: { userId: string; userType: 'personnel' | 'client' }) {
    try {
      this.logger.log('🔴 ========== SET-OFFLINE APPELÉ ==========');
      const { userId, userType } = data;
      this.logger.log(`📋 Données reçues: userId=${userId}, userType=${userType}`);
      
      if (!userId || !userType) {
        this.logger.warn('❌ Données manquantes');
        return { success: false, message: 'Données manquantes' };
      }

      const id = parseInt(userId);
      this.logger.log(`🔢 ID parsé: ${id}`);

      if (userType === 'personnel') {
        const result = await this.authService.personnelRepository
          .createQueryBuilder()
          .update()
          .set({ statut_en_ligne: false })
          .where('id = :id', { id })
          .execute();
        
        this.logger.log(`✅ Personnel ${id} marqué hors ligne - affected: ${result.affected}`);
        
        // Vérification
        const personnel = await this.authService.personnelRepository.findOne({ where: { id } });
        this.logger.log(`📊 Vérification - statut_en_ligne: ${personnel?.statut_en_ligne}`);
      } else {
        const result = await this.authService.clientRepository
          .createQueryBuilder()
          .update()
          .set({ statut_en_ligne: false })
          .where('id = :id', { id })
          .execute();
        
        this.logger.log(`✅ Client ${id} marqué hors ligne - affected: ${result.affected}`);
        
        // Vérification
        const client = await this.authService.clientRepository.findOne({ where: { id } });
        this.logger.log(`📊 Vérification - statut_en_ligne: ${client?.statut_en_ligne}`);
      }

      this.logger.log('🔴 ========== FIN SET-OFFLINE ==========');
      return { success: true, message: 'Statut mis à jour' };
    } catch (error) {
      this.logger.error('❌ ========== ERREUR SET-OFFLINE ==========');
      this.logger.error('Erreur set-offline:', error);
      this.logger.error('Stack:', error.stack);
      return { success: false, message: error.message };
    }
  }

  @Get('check')
  @HttpCode(HttpStatus.OK)
  check(@Request() req) {
    console.log('🔍 Endpoint check appelé');
    
    // ✅ AMÉLIORATION: Vérifier le token dans plusieurs sources
    let access_token = req.cookies?.access_token;
    
    // Chercher dans l'Authorization header
    if (!access_token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        access_token = authHeader.substring(7);
        console.log('🔍 Token trouvé dans Authorization header');
      }
    }
    
    if (!access_token) {
      console.log('❌ Aucun token trouvé - Non authentifié');
      return {
        authenticated: false,
        message: 'Aucun token d\'authentification trouvé',
        requiresLogin: true,
        timestamp: new Date().toISOString()
      };
    }
    
    // Vérifier la validité du token
    try {
      const jwt = require('jsonwebtoken');
      const secret = this.configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
      const decoded = jwt.verify(access_token, secret);
      
      const currentTime = Math.floor(Date.now() / 1000);
      const remainingTime = decoded.exp - currentTime;
      
      console.log('✅ Token valide, expire dans', Math.floor(remainingTime / 60), 'minutes');
      
      return {
        authenticated: true,
        message: 'Session valide',
        user: {
          id: decoded.sub,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role,
          userType: decoded.userType
        },
        expiresIn: remainingTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.log('❌ Token invalide:', error.message);
      return {
        authenticated: false,
        message: 'Token invalide ou expiré',
        requiresLogin: true,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('register/personnel')
  @HttpCode(HttpStatus.CREATED)
  async registerPersonnel(
    @Body() createPersonnelDto: CreatePersonnelDto & { skipAutoLogin?: boolean },
    @Res({ passthrough: true }) response: Response,
    @Req() request: ExpressRequest,
  ) {
    const result = await this.authService.registerPersonnel(createPersonnelDto);

    // IMPORTANT: Ne générer des cookies QUE si c'est une vraie inscription
    // Si c'est une création par un admin (détectée par la présence d'un token dans la requête), ne pas générer de cookies
    const isCreatedByAdmin = (request.headers as any).authorization || (request as any).cookies?.access_token;
    const skipAutoLogin = createPersonnelDto.skipAutoLogin || isCreatedByAdmin;

    console.log('🔍 Création personnel - Context:', {
      isCreatedByAdmin: !!isCreatedByAdmin,
      skipAutoLogin,
      hasAuthHeader: !!(request.headers as any).authorization,
      hasCookie: !!(request as any).cookies?.access_token
    });

    if (!skipAutoLogin) {
      console.log('🔑 Génération cookies pour nouvelle inscription');
      // Définir les cookies sécurisés - Configuration 8 heures cohérente
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 8 * 60 * 60 * 1000, // 8 heures - cohérent avec Keycloak
        path: '/'
      };

      const refreshCookieOptions = {
        ...cookieOptions,
        maxAge: 8 * 60 * 60 * 1000, // 8 heures - cohérent avec la configuration globale
      };

      response.cookie('access_token', result.access_token, cookieOptions);
      response.cookie(
        'refresh_token',
        result.refresh_token,
        refreshCookieOptions,
      );
    } else {
      console.log('🚫 Création par admin - Pas de cookies générés');
    }

    return {
      message: 'Personnel créé avec succès',
      user: result.user,
      access_token: skipAutoLogin ? undefined : result.access_token, // Ne pas retourner le token si création par admin
      skipAutoLogin
    };
  }

  @Post('admin/create-personnel')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async adminCreatePersonnel(
    @Body() createPersonnelDto: CreatePersonnelDto,
  ) {
    console.log('👨‍💼 Création personnel par administrateur - SANS cookies');
    const result = await this.authService.registerPersonnel(createPersonnelDto);

    // Ne jamais générer de cookies lors de la création par un admin
    return {
      message: 'Personnel créé avec succès par l\'administrateur',
      user: result.user,
      // Pas de access_token retourné pour éviter confusion
    };
  }

  @Post('register/client')
  @HttpCode(HttpStatus.CREATED)
  async registerClient(
    @Body() createClientDto: CreateClientDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.registerClient(createClientDto);

    // Définir les cookies sécurisés - Configuration 8 heures cohérente
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 8 * 60 * 60 * 1000, // 8 heures - cohérent avec Keycloak
    };

    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 8 * 60 * 60 * 1000, // 8 heures - cohérent avec la configuration globale
    };

    response.cookie('access_token', result.access_token, cookieOptions);
    response.cookie(
      'refresh_token',
      result.refresh_token,
      refreshCookieOptions,
    );

    return {
      message: 'Client créé avec succès',
      user: result.user,
      access_token: result.access_token,
      data: {
        client: result.client
      },
      success: true
    };
  }

  // Routes de récupération de mot de passe
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.initiatePasswordReset(forgotPasswordDto.email);
    
    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    return {
      message: 'Code OTP envoyé par email',
      success: true,
      email: forgotPasswordDto.email,
    };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const result = await this.authService.verifyPasswordResetOtp(
      verifyOtpDto.email,
      verifyOtpDto.otpCode
    );

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    return {
      message: 'Code OTP vérifié avec succès',
      success: true,
      canResetPassword: true,
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    console.log('🔐 Reset password request received:', {
      email: resetPasswordDto.email,
      hasOtpToken: !!resetPasswordDto.otpToken,
      otpToken: resetPasswordDto.otpToken ? '***' + resetPasswordDto.otpToken.slice(-4) : 'none'
    });

    const result = await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.newPassword,
      resetPasswordDto.otpToken
    );

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    return {
      message: 'Mot de passe réinitialisé avec succès',
      success: true,
    };
  }

  // 🔐 Endpoints pour HTTP-Only Cookies - Sécurité renforcée pour reset password
  @Post('store-secure-session')
  @HttpCode(HttpStatus.OK)
  async storeSecureSession(
    @Body() data: { email?: string; otpToken?: string; sessionData?: any },
    @Res({ passthrough: true }) response: Response,
  ) {
    const { email, otpToken, sessionData } = data;

    // Stocker les données sensibles dans des cookies HTTP-Only
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 15 * 60 * 1000, // 15 minutes
    };

    if (email) {
      response.cookie('reset_session_email', email, cookieOptions);
    }

    if (otpToken) {
      response.cookie('reset_session_otp', otpToken, cookieOptions);
    }

    if (sessionData) {
      response.cookie('reset_session_data', JSON.stringify(sessionData), cookieOptions);
    }

    return {
      success: true,
      message: 'Session sécurisée stockée',
      stored: { hasEmail: !!email, hasOtpToken: !!otpToken, hasSessionData: !!sessionData }
    };
  }

  @Get('get-secure-session')
  @HttpCode(HttpStatus.OK)
  async getSecureSession(@Request() req) {
    const email = req.cookies?.reset_session_email;
    const otpToken = req.cookies?.reset_session_otp;
    const sessionDataStr = req.cookies?.reset_session_data;

    let sessionData = null;
    if (sessionDataStr) {
      try {
        sessionData = JSON.parse(sessionDataStr);
      } catch (e) {
        console.warn('Failed to parse session data from cookie');
      }
    }

    return {
      success: true,
      data: {
        email,
        otpToken,
        sessionData,
        hasData: !!(email || otpToken || sessionData)
      }
    };
  }

  /**
   * Endpoint de test pour les différentes méthodes d'affichage du logo
   */
  @Post('test-logo-email')
  @HttpCode(HttpStatus.OK)
  async testLogoEmail(@Body() body: { email: string; method?: string }) {
    const { email, method = 'cid' } = body;
    
    if (!email) {
      throw new BadRequestException('Email requis');
    }

    try {
      let result = false;
      
      switch (method) {
        case 'cid':
          // Méthode 1: CID (Content-ID)
          result = await this.authService.sendTestEmailCID(email);
          break;
        case 'url':
          // Méthode 2: URL publique
          result = await this.authService.sendTestEmailURL(email);
          break;
        case 'base64':
          // Méthode 3: Base64 (original)
          result = await this.authService.sendTestEmailBase64(email);
          break;
        default:
          throw new BadRequestException('Méthode non supportée: cid, url, base64');
      }

      return {
        success: result,
        message: result 
          ? `Email de test envoyé avec succès (méthode: ${method})` 
          : 'Erreur lors de l\'envoi de l\'email',
        method
      };
    } catch (error) {
      throw new BadRequestException(`Erreur: ${error.message}`);
    }
  }

  /**
   * Upload d'une image de profil pour l'utilisateur connecté
   * ✅ Solution Hybride:
   * - Localhost: Stockage dans uploads/profiles/ (diskStorage)
   * - Production/Railway: Stockage sur Cloudinary (cloud)
   */
  @UseGuards(JwtAuthGuard)
  @Post('upload-profile-image')
  @UseInterceptors(
    FileInterceptor('profile', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/profiles';
          // Créer le dossier s'il n'existe pas
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
            console.log('📁 [Upload] Dossier créé:', uploadPath);
          }
          cb(null, uploadPath);
        },
        filename: (req: any, file, cb) => {
          const userId = (req as any).user?.id || 'unknown';
          const timestamp = Date.now();
          const extension = file.originalname.split('.').pop();
          cb(null, `user-${userId}-${timestamp}.${extension}`);
        },
      }),
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadProfileImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
      }),
    )
    file: any,
    @Request() req,
  ) {
    let uploadedToCloudinary = false;
    let cloudinaryUrl: string | null = null;

    try {
      console.log('📤 [Upload] Début upload image de profil');
      console.log('📤 [Upload] Fichier reçu:', {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      });

      const user = req.user as AuthenticatedUser;
      let finalPath: string;

      // Vérifier si Cloudinary est configuré
      const hasCloudinary = 
        this.configService.get('CLOUDINARY_CLOUD_NAME') && 
        this.configService.get('CLOUDINARY_API_KEY') && 
        this.configService.get('CLOUDINARY_API_SECRET');

      console.log('🔍 [Upload] Vérification Cloudinary:', {
        hasCloudName: !!this.configService.get('CLOUDINARY_CLOUD_NAME'),
        hasApiKey: !!this.configService.get('CLOUDINARY_API_KEY'),
        hasApiSecret: !!this.configService.get('CLOUDINARY_API_SECRET'),
        configured: hasCloudinary
      });

      if (hasCloudinary) {
        console.log('☁️ [Upload] Upload vers Cloudinary...');
        
        // Configurer Cloudinary
        cloudinary.config({
          cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
          api_key: this.configService.get('CLOUDINARY_API_KEY'),
          api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
          secure: true,
        });

        // Upload vers Cloudinary
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: 'velosi/profiles',
          public_id: `user-${user.id}-${Date.now()}`,
          transformation: [
            { width: 800, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
          ],
        });

        cloudinaryUrl = uploadResult.secure_url;
        finalPath = cloudinaryUrl;
        uploadedToCloudinary = true;

        console.log('✅ [Upload] Image uploadée sur Cloudinary:', cloudinaryUrl);

        // Supprimer le fichier local temporaire après upload sur Cloudinary
        try {
          fs.unlinkSync(file.path);
          console.log('🗑️ [Upload] Fichier local temporaire supprimé');
        } catch (unlinkError) {
          console.warn('⚠️ [Upload] Impossible de supprimer le fichier temporaire:', unlinkError);
        }
      } else {
        // Utiliser le stockage local
        finalPath = `uploads/profiles/${file.filename}`;
        console.log('💾 [Upload] Utilisation du stockage local:', finalPath);
      }

      // Mettre à jour le profil utilisateur
      await this.authService.updateUserProfileImage(
        user.id,
        user.userType,
        finalPath,
      );

      console.log('✅ [Upload] Image de profil mise à jour avec succès');

      return {
        success: true,
        message: 'Image de profil mise à jour avec succès',
        filePath: finalPath,
        fileName: file.filename || file.originalname,
        isCloudinary: uploadedToCloudinary,
      };
    } catch (error) {
      console.error('❌ [Upload] Erreur:', error);
      
      // Supprimer le fichier local en cas d'erreur
      if (file && file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
          console.log('🗑️ [Upload] Fichier local supprimé après erreur');
        } catch (unlinkError) {
          console.error('⚠️ [Upload] Erreur lors de la suppression du fichier:', unlinkError);
        }
      }

      // Si l'upload Cloudinary a réussi mais une erreur s'est produite après, supprimer de Cloudinary
      if (uploadedToCloudinary && cloudinaryUrl) {
        try {
          const publicId = cloudinaryUrl.split('/').slice(-2).join('/').replace(/\.[^/.]+$/, '');
          await cloudinary.uploader.destroy(publicId);
          console.log('🗑️ [Upload] Image supprimée de Cloudinary après erreur');
        } catch (cloudinaryError) {
          console.error('⚠️ [Upload] Erreur suppression Cloudinary:', cloudinaryError);
        }
      }
      
      throw new BadRequestException(`Erreur lors de l'upload: ${error.message}`);
    }
  }

  /**
   * Suppression de l'image de profil de l'utilisateur connecté
   */
  @UseGuards(JwtAuthGuard)
  @Delete('profile-image')
  @HttpCode(HttpStatus.OK)
  async deleteProfileImage(@Request() req) {
    try {
      const user = req.user as AuthenticatedUser;
      const result = await this.authService.deleteUserProfileImage(
        user.id,
        user.userType,
      );

      return {
        success: true,
        message: 'Image de profil supprimée avec succès',
      };
    } catch (error) {
      throw new BadRequestException(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  /**
   * Route pour servir les images de profil
   * GET /api/auth/profile-image/:filename
   */
  @Get('profile-image/:filename')
  async getProfileImage(@Param('filename') filename: string, @Res() res: Response) {
    try {
      // Sécurité: vérifier que le nom de fichier ne contient pas de caractères dangereux
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new BadRequestException('Nom de fichier invalide');
      }

      // Construire le chemin vers le fichier
      const filePath = join(process.cwd(), 'uploads', 'profiles', filename);
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Image de profil introuvable');
      }

      // Déterminer le type MIME basé sur l'extension
      const ext = extname(filename).toLowerCase();
      let contentType = 'image/jpeg'; // par défaut
      
      switch (ext) {
        case '.png':
          contentType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.webp':
          contentType = 'image/webp';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
      }

      // Configurer les headers de cache
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache d'un an
        'ETag': filename,
      });

      // Envoyer le fichier
      return res.sendFile(filePath);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Erreur lors de la récupération de l'image: ${error.message}`);
    }
  }

  /**
   * Endpoint pour nettoyer les cookies d'authentification
   * Utile pour résoudre les conflits entre tokens dans cookies et headers
   */
  @Post('clear-cookies')
  @HttpCode(HttpStatus.OK)
  async clearAuthCookies(@Res() res: Response) {
    try {
      // Nettoyer tous les cookies d'authentification
      res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      console.log('Auth Cookies - Cookies d\'authentification nettoyés');
      
      return res.json({
        success: true,
        message: 'Cookies d\'authentification nettoyés avec succès',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      throw new BadRequestException(`Erreur lors du nettoyage des cookies: ${error.message}`);
    }
  }

  /**
   * Endpoint de diagnostic pour déboguer les problèmes d'authentification
   */
  @Get('debug')
  @HttpCode(HttpStatus.OK)
  async debugAuth(@Req() req: ExpressRequest) {
    return {
      headers: {
        authorization: req.headers.authorization || 'Absent',
        cookie: req.headers.cookie || 'Absent',
        origin: req.headers.origin || 'Absent',
        referer: req.headers.referer || 'Absent'
      },
      cookies: req.cookies || {},
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    };
  }

  /**
   * Endpoint pour créer des cookies de session avec des données utilisateur
   * Utilisé pour corriger les problèmes de transmission de cookies
   */
  @Post('set-session')
  @HttpCode(HttpStatus.OK)
  async setSessionCookies(
    @Body() sessionData: { 
      username: string;
      email: string;
      userType: 'personnel' | 'client';
      userId: string;
    },
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      console.log('🍪 Création forcée de cookies pour:', sessionData.username);

      // Chercher l'utilisateur pour générer un token valide
      let user = null;
      if (sessionData.userType === 'personnel') {
        user = await this.authService.findPersonnelByEmail(sessionData.email);
      } else {
        user = await this.authService.findClientByEmail(sessionData.email);
      }

      if (!user) {
        throw new BadRequestException('Utilisateur non trouvé');
      }

      // Générer un nouveau token
      const tokenPayload = {
        username: sessionData.username,
        sub: sessionData.userId,
        userType: sessionData.userType,
        role: user.role || 'client',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 heures
      };

      const jwt = require('jsonwebtoken');
      const secret = this.configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
      const access_token = jwt.sign(tokenPayload, secret);

      // Créer les cookies avec la configuration corrigée
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 8 * 60 * 60 * 1000, // 8 heures
        path: '/'
      };

      response.cookie('access_token', access_token, cookieOptions);
      response.cookie('refresh_token', access_token, cookieOptions); // Même token pour simplifier

      console.log('✅ Cookies créés avec succès pour:', sessionData.username);

      return {
        success: true,
        message: 'Cookies de session créés avec succès',
        user: {
          id: user.id,
          username: sessionData.username,
          email: sessionData.email,
          userType: sessionData.userType
        },
        cookieOptions: cookieOptions,
        tokenPreview: access_token.substring(0, 50) + '...'
      };

    } catch (error) {
      console.error('Erreur création cookies:', error);
      throw new BadRequestException(`Erreur création cookies: ${error.message}`);
    }
  }

  /**
   * Endpoint pour vérifier un token JWT sans cookies
   * Alternative au système de cookies défaillant
   */
  @Post('verify-token')
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Body() tokenData: { token: string }) {
    try {
      if (!tokenData.token) {
        throw new BadRequestException('Token requis');
      }

      const jwt = require('jsonwebtoken');
      const secret = this.configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
      
      try {
        const decoded = jwt.verify(tokenData.token, secret);
        console.log('✅ Token valide pour:', decoded.username);
        
        // Si c'est un utilisateur local, récupérer les infos complètes
        if (decoded.userType !== 'keycloak-only') {
          try {
            const user = await this.authService.validateJwtPayload(decoded);
            if (user) {
              const roles = await this.authService.getUserRoles(user.id, user.userType);
              
              return {
                authenticated: true,
                valid: true,
                user: {
                  id: user.id,
                  username: user.userType === 'personnel' ? user.nom_utilisateur : user.nom,
                  email: user.email,
                  userType: user.userType,
                  role: user.role
                },
                roles: roles,
                token_info: {
                  expires_at: decoded.exp,
                  remaining_time: decoded.exp - Math.floor(Date.now() / 1000)
                }
              };
            }
          } catch (userError) {
            console.log('⚠️ Erreur récupération utilisateur local:', userError.message);
          }
        }

        // Pour les utilisateurs Keycloak uniquement
        return {
          authenticated: true,
          valid: true,
          user: {
            keycloak_id: decoded.keycloak_id,
            username: decoded.username,
            userType: decoded.userType,
            role: decoded.role
          },
          roles: [],
          token_info: {
            expires_at: decoded.exp,
            remaining_time: decoded.exp - Math.floor(Date.now() / 1000)
          },
          source: 'keycloak-only'
        };

      } catch (verifyError) {
        console.log('❌ Token invalide:', verifyError.message);
        return {
          authenticated: false,
          valid: false,
          error: 'Token invalide ou expiré',
          message: 'Veuillez vous reconnecter via Keycloak'
        };
      }

    } catch (error) {
      console.error('❌ Erreur verify-token:', error);
      throw new BadRequestException(`Erreur vérification: ${error.message}`);
    }
  }

  /**
   * Endpoint pour récupérer l'utilisateur connecté avec token JWT
   * Remplace le système défaillant de cookies
   */
  @Post('current-user')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@Body() tokenData: { token: string }) {
    try {
      console.log('🔍 Récupération utilisateur avec token...');
      
      if (!tokenData.token) {
        throw new BadRequestException('Token requis pour récupérer l\'utilisateur');
      }

      // Valider le token JWT
      const jwt = require('jsonwebtoken');
      const secret = this.configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
      
      try {
        const decoded = jwt.verify(tokenData.token, secret);
        console.log('✅ Token valide pour utilisateur:', decoded.username);
        
        // Si c'est un utilisateur local, récupérer les infos complètes
        if (decoded.userType !== 'keycloak-only' && decoded.sub) {
          try {
            const fullUserProfile = await this.authService.getFullUserProfile(decoded.sub, decoded.userType);
            const roles = await this.authService.getUserRoles(decoded.sub, decoded.userType);
            
            return {
              success: true,
              message: 'Utilisateur récupéré avec succès',
              authenticated: true,
              user: {
                id: fullUserProfile.id,
                username: decoded.userType === 'personnel' ? fullUserProfile.nom_utilisateur : fullUserProfile.nom,
                email: fullUserProfile.email,
                userType: decoded.userType,
                role: fullUserProfile.role || 'user',
                ...fullUserProfile
              },
              roles: roles,
              source: 'local-with-token'
            };
            
          } catch (profileError) {
            console.log('⚠️ Erreur récupération profil complet:', profileError.message);
            
            // Fallback avec les données du token
            return {
              success: true,
              message: 'Utilisateur récupéré (données token uniquement)',
              authenticated: true,
              user: {
                id: decoded.sub,
                username: decoded.username,
                userType: decoded.userType,
                role: decoded.role,
                keycloak_id: decoded.keycloak_id
              },
              roles: [decoded.role],
              source: 'token-only'
            };
          }
        }

        // Pour les utilisateurs Keycloak uniquement
        return {
          success: true,
          message: 'Utilisateur Keycloak récupéré',
          authenticated: true,
          user: {
            keycloak_id: decoded.keycloak_id,
            username: decoded.username,
            userType: decoded.userType,
            role: decoded.role
          },
          roles: [decoded.role],
          source: 'keycloak-only'
        };

      } catch (verifyError) {
        console.log('❌ Token invalide:', verifyError.message);
        throw new UnauthorizedException('Token invalide ou expiré');
      }
      
    } catch (error) {
      console.error('❌ Erreur récupération utilisateur:', error);
      
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Erreur lors de la récupération: ${error.message}`);
    }
  }

  /**
   * Endpoint pour valider un token et récupérer l'utilisateur
   * Accepte un token directement sans authentication préalable
   */
  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Body() tokenData: { token: string }) {
    try {
      console.log('Validation de token demandée');
      
      if (!tokenData.token) {
        throw new BadRequestException('Token requis');
      }

      // Décoder et valider le token
      const jwt = require('jsonwebtoken');
      const secret = this.configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
      
      try {
        const decoded = jwt.verify(tokenData.token, secret);
        console.log('Token décodé:', decoded);
        
        // Récupérer l'utilisateur correspondant
        const user = await this.authService.validateJwtPayload(decoded);
        
        if (!user) {
          throw new UnauthorizedException('Utilisateur introuvable pour ce token');
        }

        // Récupérer les rôles
        const roles = await this.authService.getUserRoles(user.id, user.userType);

        return {
          success: true,
          message: 'Token valide',
          user: {
            id: user.id,
            username: user.userType === 'personnel' ? user.nom_utilisateur : user.nom,
            email: user.email,
            userType: user.userType
          },
          roles: roles,
          tokenInfo: {
            iat: decoded.iat,
            exp: decoded.exp,
            remainingTime: decoded.exp - Math.floor(Date.now() / 1000)
          }
        };

      } catch (verifyError) {
        console.log('Erreur validation token:', verifyError.message);
        throw new UnauthorizedException('Token invalide ou expiré');
      }

    } catch (error) {
      console.error('Erreur validate-token:', error);
      
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Erreur validation: ${error.message}`);
    }
  }

  /**
   * Endpoint principal d'authentification - remplace le système de cookies
   * Utilise uniquement les données Keycloak du frontend
   */
  @Post('keycloak-auth')
  @HttpCode(HttpStatus.OK)
  async authenticateWithKeycloak(@Body() authData: {
    keycloak_id: string;
    username: string;
    email: string;
    roles: string[];
    token?: string;
  }) {
    try {
      console.log('🔐 Authentification Keycloak directe:', authData.username);
      
      // Créer un objet compatible avec syncUserFromKeycloak
      const userInfo = {
        sub: authData.keycloak_id,
        preferred_username: authData.username,
        email: authData.email,
        realm_access: { roles: authData.roles || [] }
      };

      try {
        // Synchroniser avec notre base de données
        const syncResult = await this.authService.syncUserFromKeycloak(userInfo);
        
        // Générer un token JWT pour la session sans cookie
        const tokenPayload = {
          username: authData.username,
          sub: syncResult.user.id.toString(),
          userType: syncResult.user.userType,
          role: syncResult.user.userType === 'personnel' ? syncResult.user.role : 'client',
          keycloak_id: authData.keycloak_id,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 heures
        };

        const jwt = require('jsonwebtoken');
        const secret = this.configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
        const access_token = jwt.sign(tokenPayload, secret);
        
        return {
          success: true,
          message: 'Authentification Keycloak réussie',
          authenticated: true,
          user: {
            id: syncResult.user.id,
            username: syncResult.user.username,
            email: syncResult.user.email,
            userType: syncResult.user.userType,
            role: syncResult.user.userType === 'personnel' ? syncResult.user.role : 'client',
            keycloak_id: authData.keycloak_id,
            ...syncResult.user
          },
          roles: syncResult.roles || [],
          access_token: access_token, // Token pour les requêtes futures
          token_expires_in: 8 * 60 * 60, // 8 heures en secondes
          source: 'keycloak-direct'
        };
        
      } catch (syncError) {
        console.log('⚠️ Utilisateur non trouvé en base locale, création session Keycloak uniquement');
        
        // Si l'utilisateur n'existe pas en base, créer une session temporaire
        const tokenPayload = {
          username: authData.username,
          sub: authData.keycloak_id,
          userType: 'keycloak-only',
          role: authData.roles[0] || 'user',
          keycloak_id: authData.keycloak_id,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
        };

        const jwt = require('jsonwebtoken');
        const secret = this.configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
        const access_token = jwt.sign(tokenPayload, secret);

        return {
          success: true,
          message: 'Session Keycloak créée (utilisateur non en base locale)',
          authenticated: true,
          user: {
            keycloak_id: authData.keycloak_id,
            username: authData.username,
            email: authData.email,
            userType: 'keycloak-only',
            role: authData.roles[0] || 'user'
          },
          roles: authData.roles || [],
          access_token: access_token,
          token_expires_in: 8 * 60 * 60,
          source: 'keycloak-only',
          warning: 'Utilisateur non trouvé en base de données locale'
        };
      }

    } catch (error) {
      console.error('❌ Erreur authentification Keycloak:', error);
      throw new BadRequestException(`Erreur authentification: ${error.message}`);
    }
  }

  /**
   * Endpoint pour synchroniser l'utilisateur avec Keycloak
   * Accepte les données directement du frontend ou un token Keycloak
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncWithKeycloak(@Body() syncData: { 
    token?: string; 
    keycloak_id?: string;
    username?: string;
    email?: string;
    roles?: string[];
  }, @Req() req: ExpressRequest, @Res() res: Response) {
    try {
      console.log('Endpoint sync appelé avec:', syncData);
      
      // Mode 1: Données directes du frontend (Keycloak -> Frontend -> Backend)
      if (syncData.keycloak_id || syncData.username || syncData.email) {
        console.log('Mode synchronisation directe avec données frontend');
        
        // Créer un objet compatible avec syncUserFromKeycloak
        const userInfo = {
          sub: syncData.keycloak_id,
          preferred_username: syncData.username,
          email: syncData.email,
          realm_access: { roles: syncData.roles || [] }
        };

        try {
          // Synchroniser avec notre base de données
          const syncResult = await this.authService.syncUserFromKeycloak(userInfo);
          
          // Générer un token JWT pour la session avec les rôles Keycloak
          const userRole = syncResult.user.userType === 'personnel' ? 
            (syncResult.user.role || syncData.roles[0]) : 'client';
          
          const tokenPayload = {
            username: syncData.username,
            sub: syncResult.user.id.toString(),
            userType: syncResult.user.userType,
            role: userRole,
            keycloak_roles: syncData.roles, // Ajouter les rôles Keycloak
            keycloak_id: syncData.keycloak_id,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 heures
          };

          const jwt = require('jsonwebtoken');
          const secret = this.configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
          const access_token = jwt.sign(tokenPayload, secret);
          
          // Configurer le cookie avec le token JWT pour compatibilité frontend
          res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000, // 8 heures en millisecondes
            path: '/'
          });
          
          return res.json({
            success: true,
            message: 'Synchronisation réussie (données directes)',
            authenticated: true,
            user: syncResult.user,
            roles: syncResult.roles || [],
            access_token: access_token,
            token_expires_in: 8 * 60 * 60,
            source: 'frontend-data'
          });
        } catch (syncError) {
          console.log('Erreur sync avec données directes:', syncError.message);
          
          // Si l'utilisateur n'existe pas, créer une session Keycloak temporaire
          const tokenPayload = {
            username: syncData.username,
            sub: syncData.keycloak_id,
            userType: 'keycloak-only',
            role: syncData.roles[0] || 'user',
            keycloak_id: syncData.keycloak_id,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
          };

          const jwt = require('jsonwebtoken');
          const secret = this.configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
          const access_token = jwt.sign(tokenPayload, secret);
          
          // Configurer le cookie avec le token JWT pour compatibilité frontend
          res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000, // 8 heures en millisecondes
            path: '/'
          });
          
          return res.json({
            success: true,
            message: 'Session Keycloak créée (utilisateur non en base locale)',
            authenticated: true,
            user: {
              keycloak_id: syncData.keycloak_id,
              username: syncData.username,
              email: syncData.email,
              userType: 'keycloak-only'
            },
            roles: syncData.roles || [],
            access_token: access_token,
            token_expires_in: 8 * 60 * 60,
            source: 'keycloak-only',
            warning: 'Utilisateur non trouvé en base de données locale'
          });
        }
      }
      
      // Mode 2: Token Keycloak
      let token = syncData.token;
      
      // Si pas de token dans le body, essayer de le récupérer depuis les headers ou cookies
      if (!token) {
        // Depuis l'header Authorization
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
        
        // Depuis les cookies si pas dans l'header
        if (!token && req.cookies && req.cookies.access_token) {
          token = req.cookies.access_token;
        }
      }
      
      // Récupérer les informations depuis Keycloak si un token est disponible
      if (token) {
        console.log('Mode synchronisation avec token Keycloak');
        const keycloakUserInfo = await this.authService.getKeycloakUserInfo(token);
        
        if (!keycloakUserInfo) {
          throw new UnauthorizedException('Token invalide ou expiré');
        }

        // Synchroniser avec notre base de données
        const syncResult = await this.authService.syncUserFromKeycloak(keycloakUserInfo);
        
        // Générer un token JWT pour la session
        const userRole = syncResult.user.userType === 'personnel' ? 
          syncResult.user.role : 'client';
          
        const tokenPayload = {
          username: keycloakUserInfo.preferred_username,
          sub: syncResult.user.id.toString(),
          userType: syncResult.user.userType,
          role: userRole,
          keycloak_roles: keycloakUserInfo.realm_access?.roles || [],
          keycloak_id: keycloakUserInfo.sub,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 heures
        };

        const jwt = require('jsonwebtoken');
        const secret = this.configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
        const access_token = jwt.sign(tokenPayload, secret);
        
        // Configurer le cookie avec le token JWT pour compatibilité frontend
        res.cookie('access_token', access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 8 * 60 * 60 * 1000, // 8 heures en millisecondes
          path: '/'
        });
        
        return res.json({
          success: true,
          message: 'Synchronisation réussie (token)',
          user: syncResult.user,
          roles: syncResult.roles || [],
          access_token: access_token,
          token_expires_in: 8 * 60 * 60,
          source: 'keycloak-token'
        });
      }

      // Aucune méthode disponible
      throw new BadRequestException('Aucune donnée de synchronisation fournie (token ou données directes)');
      
    } catch (error) {
      console.error('Erreur sync endpoint:', error);
      
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Erreur lors de la synchronisation: ${error.message}`);
    }
  }

  /**
   * Endpoint temporaire pour migrer les avatars vers PNG
   * ATTENTION: Cet endpoint doit être supprimé après la migration
   */
  @Post('migrate-avatars')
  @HttpCode(HttpStatus.OK)
  async migrateAvatars() {
    try {
      const result = await this.authService.migrateAvatarsToPng();
      return {
        success: true,
        message: 'Migration des avatars terminée avec succès',
        ...result,
      };
    } catch (error) {
      throw new BadRequestException(`Erreur lors de la migration: ${error.message}`);
    }
  }

  /**
   * Endpoint de diagnostic pour vérifier le statut en ligne d'un utilisateur
   */
  @Get('check-online-status/:userType/:userId')
  @HttpCode(HttpStatus.OK)
  async checkOnlineStatus(
    @Param('userType') userType: 'personnel' | 'client',
    @Param('userId') userId: string
  ) {
    try {
      const id = parseInt(userId);
      this.logger.log(`🔍 Vérification statut pour ${userType} ID ${id}`);

      if (userType === 'personnel') {
        const personnel = await this.authService.personnelRepository.findOne({
          where: { id },
          select: ['id', 'nom_utilisateur', 'statut_en_ligne', 'last_activity']
        });

        if (!personnel) {
          return { success: false, message: 'Personnel non trouvé' };
        }

        this.logger.log(`📊 Personnel ${personnel.nom_utilisateur} - statut_en_ligne: ${personnel.statut_en_ligne}`);

        return {
          success: true,
          userType: 'personnel',
          userId: personnel.id,
          username: personnel.nom_utilisateur,
          statut_en_ligne: personnel.statut_en_ligne,
          last_activity: personnel.last_activity
        };
      } else {
        const client = await this.authService.clientRepository.findOne({
          where: { id },
          select: ['id', 'nom', 'statut_en_ligne', 'last_activity']
        });

        if (!client) {
          return { success: false, message: 'Client non trouvé' };
        }

        this.logger.log(`📊 Client ${client.nom} - statut_en_ligne: ${client.statut_en_ligne}`);

        return {
          success: true,
          userType: 'client',
          userId: client.id,
          username: client.nom,
          statut_en_ligne: client.statut_en_ligne,
          last_activity: client.last_activity
        };
      }
    } catch (error) {
      this.logger.error('Erreur check-online-status:', error);
      throw new BadRequestException(`Erreur: ${error.message}`);
    }
  }

  /**
   * Récupérer les sessions actives d'un personnel
   */
  @Get('personnel/:id/sessions')
  @UseGuards(JwtAuthGuard)
  async getPersonnelSessions(
    @Param('id') personnelId: string,
    @Request() req
  ) {
    try {
      const sessions = await this.authService.getPersonnelSessions(parseInt(personnelId));
      return {
        success: true,
        sessions,
      };
    } catch (error) {
      throw new BadRequestException(`Erreur récupération sessions: ${error.message}`);
    }
  }

  /**
   * Récupérer l'activité d'un personnel
   */
  @Get('personnel/:id/activity')
  @UseGuards(JwtAuthGuard)
  async getPersonnelActivity(
    @Param('id') personnelId: string,
    @Request() req
  ) {
    try {
      const activity = await this.authService.getPersonnelActivity(parseInt(personnelId));
      return {
        success: true,
        activity,
      };
    } catch (error) {
      throw new BadRequestException(`Erreur récupération activité: ${error.message}`);
    }
  }

  /**
   * Fermer toutes les sessions d'un personnel
   */
  @Delete('personnel/:id/sessions')
  @UseGuards(JwtAuthGuard)
  async closePersonnelSessions(
    @Param('id') personnelId: string,
    @Request() req
  ) {
    try {
      const result = await this.authService.closePersonnelSessions(parseInt(personnelId));
      return {
        success: true,
        message: 'Sessions fermées avec succès',
        ...result,
      };
    } catch (error) {
      throw new BadRequestException(`Erreur fermeture sessions: ${error.message}`);
    }
  }

  /**
   * Récupérer les sessions actives d'un client
   */
  @Get('client/:id/sessions')
  @UseGuards(JwtAuthGuard)
  async getClientSessions(
    @Param('id') clientId: string,
    @Request() req
  ) {
    try {
      const sessions = await this.authService.getClientSessions(parseInt(clientId));
      return {
        success: true,
        sessions,
      };
    } catch (error) {
      throw new BadRequestException(`Erreur récupération sessions: ${error.message}`);
    }
  }

  /**
   * Fermer toutes les sessions d'un client
   */
  @Delete('client/:id/sessions')
  @UseGuards(JwtAuthGuard)
  async closeClientSessions(
    @Param('id') clientId: string,
    @Request() req
  ) {
    try {
      const result = await this.authService.closeClientSessions(parseInt(clientId));
      return {
        success: true,
        message: 'Sessions fermées avec succès',
        ...result,
      };
    } catch (error) {
      throw new BadRequestException(`Erreur fermeture sessions: ${error.message}`);
    }
  }

  // ==========================================
  // ENDPOINTS D'AUTHENTIFICATION BIOMÉTRIQUE
  // ==========================================
  // NOTE: Les endpoints biométriques ont été déplacés vers BiometricController
  // pour supporter multi-appareils et Resident Keys (Passkeys)
}
