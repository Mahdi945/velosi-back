import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminAuthService } from '../admin-auth.service';
import { Request } from 'express';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private configService: ConfigService,
    private adminAuthService: AdminAuthService,
  ) {
    const secret = configService.get<string>('JWT_SECRET') || 'velosi-secret-key-2025-ultra-secure';
    console.log('🔧 [AdminJwtStrategy] JWT_SECRET utilisé:', secret);
    
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        AdminJwtStrategy.extractJWTFromHeader,
        AdminJwtStrategy.extractJWTFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  private static extractJWTFromHeader(req: Request): string | null {
    console.log('🔍 [AdminJWT] Extraction depuis header Authorization (PRIORITÉ 1)');
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('✅ [AdminJWT] Token trouvé dans header (preview):', token.substring(0, 50) + '...');
      return token;
    }
    
    console.log('⚠️ [AdminJWT] Pas de token dans header Authorization');
    return null;
  }

  private static extractJWTFromCookie(req: Request): string | null {
    console.log('🔍 [AdminJWT] Extraction depuis cookie (PRIORITÉ 2 - FALLBACK)');
    
    if (req.cookies && req.cookies.admin_token) {
      const token = req.cookies.admin_token;
      console.log('✅ [AdminJWT] Token trouvé dans cookie admin_token (preview):', token.substring(0, 50) + '...');
      return token;
    }
    
    console.log('⚠️ [AdminJWT] Pas de cookie admin_token');
    return null;
  }

  async validate(payload: any) {
    console.log('🔍 [AdminJwtStrategy] Validation du payload:', payload);
    
    // Vérifier que c'est un token admin MSP
    if (payload.type !== 'admin_msp') {
      console.error('❌ [AdminJwtStrategy] Type invalide:', payload.type);
      throw new UnauthorizedException('Token non valide pour l\'administration MSP');
    }

    console.log('✅ [AdminJwtStrategy] Type valide: admin_msp');
    console.log('👤 [AdminJwtStrategy] Validation admin ID:', payload.sub);
    
    try {
      // Valider que l'admin existe toujours et est actif
      const admin = await this.adminAuthService.validateAdmin(payload.sub);
      console.log('✅ [AdminJwtStrategy] Admin validé:', { id: admin.id, nom_utilisateur: admin.nom_utilisateur });

      return {
        id: admin.id,
        nom_utilisateur: admin.nom_utilisateur,
        role: admin.role,
        type: 'admin_msp',
      };
    } catch (error) {
      console.error('❌ [AdminJwtStrategy] Erreur validation admin:', error.message);
      throw error;
    }
  }
}
