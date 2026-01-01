import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from './auth.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.extractJWTFromHeader,
        JwtStrategy.extractJWTFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure',
    });
  }

  private static extractJWTFromCookie(req: Request): string | null {
    console.log('JWT Strategy - Extraction depuis cookie (PRIORITÉ 2 - FALLBACK)');
    console.log('JWT Strategy - Cookies disponibles:', Object.keys(req.cookies || {}));
    
    if (req.cookies) {
      // CORRECTION : Chercher d'abord le cookie générique
      if ('access_token' in req.cookies && req.cookies.access_token.length > 0) {
        const token = req.cookies.access_token;
        console.log('JWT Strategy - Token trouvé dans cookie générique (preview):', token.substring(0, 50) + '...');
        
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(token);
          console.log('JWT Strategy - Utilisateur du cookie générique (UTILISÉ):', decoded?.username, 'Rôle:', decoded?.role);
        } catch (e) {
          console.warn('JWT Strategy - Impossible de décoder le token cookie générique');
        }
        
        return token;
      }
      
      // NOUVEAU : Chercher les cookies spécifiques aux utilisateurs (access_token_ID_TYPE)
      const cookieNames = Object.keys(req.cookies);
      const userSpecificCookie = cookieNames.find(name => name.startsWith('access_token_') && name.includes('_client'));
      
      if (userSpecificCookie && req.cookies[userSpecificCookie].length > 0) {
        const token = req.cookies[userSpecificCookie];
        console.log('JWT Strategy - Token trouvé dans cookie spécifique:', userSpecificCookie, '(preview):', token.substring(0, 50) + '...');
        
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(token);
          console.log('JWT Strategy - Utilisateur du cookie spécifique (UTILISÉ):', decoded?.username, 'Rôle:', decoded?.role);
        } catch (e) {
          console.warn('JWT Strategy - Impossible de décoder le token cookie spécifique');
        }
        
        return token;
      }
    }
    
    console.log('JWT Strategy - Aucun token dans cookie (générique ou spécifique)');
    return null;
  }

  private static extractJWTFromHeader(req: Request): string | null {
    console.log('JWT Strategy - Extraction depuis header Authorization (PRIORITÉ 1)');
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('JWT Strategy - Token trouvé dans header (preview):', token.substring(0, 50) + '...');
      
      // Décoder le token pour voir l'utilisateur
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        console.log('JWT Strategy - Utilisateur du header (UTILISÉ):', decoded?.username, 'Rôle:', decoded?.role);
      } catch (e) {
        console.warn('JWT Strategy - Impossible de décoder le token header');
      }
      
      return token;
    }
    
    console.log('JWT Strategy - Aucun token dans header, fallback vers cookies');
    return null;
  }

  async validate(payload: JwtPayload) {
    console.log('JWT Strategy - Payload reçu:', JSON.stringify(payload, null, 2));
    
    if (!payload || !payload.sub) {
      console.error('JWT Strategy - Payload invalide: aucun sub trouvé');
      return null;
    }

    // NOUVELLE SÉCURITÉ : Vérification anti-conflit multi-utilisateur
    const currentTimestamp = Math.floor(Date.now() / 1000);
    console.log('🔍 Vérification anti-conflit utilisateur:', {
      userId: payload.sub,
      username: payload.username,
      userType: payload.userType,
      tokenAge: currentTimestamp - (payload.iat || 0),
      remainingTime: (payload.exp || 0) - currentTimestamp
    });

    // Vérifier l'expiration du token côté application
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && currentTime > payload.exp) {
      console.error('JWT Strategy - Token expiré:', {
        exp: payload.exp,
        currentTime,
        expiredSince: currentTime - payload.exp
      });
      return null;
    }
    
    try {
      const user = await this.authService.validateJwtPayload(payload);
      console.log('JWT Strategy - Utilisateur validé:', user ? {
        id: user.id,
        username: user.username,
        role: user.role
      } : 'null');
      
      if (!user) {
        console.error('JWT Strategy - Utilisateur non trouvé pour le payload');
        return null;
      }
      
      // Ajouter les informations du payload au user pour debug
      user.tokenInfo = {
        iat: payload.iat,
        exp: payload.exp,
        remainingTime: payload.exp ? payload.exp - currentTime : 0
      };
      
      return user;
    } catch (error) {
      console.error('JWT Strategy - Erreur de validation:', error.message);
      console.error('JWT Strategy - Stack trace:', error.stack);
      return null; // Retourner null au lieu de throw pour permettre un meilleur handling
    }
  }
}
