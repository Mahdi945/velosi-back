import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Get,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService, LoginDto } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CreatePersonnelDto, CreateClientDto } from '../dto/register.dto';

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
  getProfile(@Request() req) {
    return {
      user: req.user,
      message: 'Profil utilisateur récupéré avec succès',
    };
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
}
