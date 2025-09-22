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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthService, LoginDto } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CreatePersonnelDto, CreateClientDto } from '../dto/register.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

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
interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: string;
  userType: 'client' | 'personnel';
  [key: string]: any; // Pour d'autres propriétés éventuelles
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Définir les cookies sécurisés
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
    };

    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    };

    response.cookie('access_token', result.access_token, cookieOptions);
    response.cookie(
      'refresh_token',
      result.refresh_token,
      refreshCookieOptions,
    );

    return {
      message: 'Connexion réussie',
      user: result.user,
      access_token: result.access_token, // Pour compatibilité avec le frontend
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refresh_token = req.cookies?.refresh_token;

    if (!refresh_token) {
      throw new UnauthorizedException('Token de rafraîchissement manquant');
    }

    const result = await this.authService.refreshToken(refresh_token);

    // Mettre à jour les cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000,
    };

    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    response.cookie('access_token', result.access_token, cookieOptions);
    response.cookie(
      'refresh_token',
      result.refresh_token,
      refreshCookieOptions,
    );

    return {
      message: 'Token rafraîchi avec succès',
      user: result.user,
      access_token: result.access_token,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const fullUserProfile = await this.authService.getFullUserProfile(req.user.id, req.user.userType);
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
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    // Supprimer les cookies
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');

    return {
      message: 'Déconnexion réussie',
    };
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  check(@Request() req) {
    return {
      authenticated: true,
      user: req.user,
    };
  }

  @Post('register/personnel')
  @HttpCode(HttpStatus.CREATED)
  async registerPersonnel(
    @Body() createPersonnelDto: CreatePersonnelDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.registerPersonnel(createPersonnelDto);

    // Définir les cookies sécurisés
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
    };

    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    };

    response.cookie('access_token', result.access_token, cookieOptions);
    response.cookie(
      'refresh_token',
      result.refresh_token,
      refreshCookieOptions,
    );

    return {
      message: 'Personnel créé avec succès',
      user: result.user,
      access_token: result.access_token,
    };
  }

  @Post('register/client')
  @HttpCode(HttpStatus.CREATED)
  async registerClient(
    @Body() createClientDto: CreateClientDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.registerClient(createClientDto);

    // Définir les cookies sécurisés
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
    };

    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
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
      sameSite: 'strict' as const,
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
   */
  @UseGuards(JwtAuthGuard)
  @Post('upload-profile-image')
  @UseInterceptors(
    FileInterceptor('profile', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          // Générer un nom unique avec timestamp
          const timestamp = Date.now();
          const userId = (req.user as AuthenticatedUser)?.id || 'unknown';
          const ext = extname(file.originalname);
          cb(null, `profile_${userId}_${timestamp}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Vérifier le type de fichier
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
          return cb(null, true);
        } else {
          cb(new BadRequestException('Seuls les fichiers JPG, PNG et WebP sont autorisés'), false);
        }
      },
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
    file: any, // Utiliser any au lieu de Express.Multer.File pour éviter les erreurs de type
    @Request() req,
  ) {
    try {
      // Mettre à jour le profil utilisateur avec la nouvelle image
      const user = req.user as AuthenticatedUser;
      const result = await this.authService.updateUserProfileImage(
        user.id,
        user.userType,
        `uploads/profiles/${file.filename}`,
      );

      return {
        success: true,
        message: 'Image de profil mise à jour avec succès',
        filePath: `uploads/profiles/${file.filename}`,
        fileName: file.filename,
      };
    } catch (error) {
      // Supprimer le fichier en cas d'erreur
      if (file && file.path) {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Erreur lors de la suppression du fichier:', unlinkError);
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
}
