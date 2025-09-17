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
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService, LoginDto } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CreatePersonnelDto, CreateClientDto } from '../dto/register.dto';

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
}
