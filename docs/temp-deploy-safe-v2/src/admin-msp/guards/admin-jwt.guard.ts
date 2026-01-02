import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    console.log('🔐 [AdminJwtAuthGuard] Header Authorization:', authHeader ? `${authHeader.substring(0, 50)}...` : 'ABSENT');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('🎯 [AdminJwtAuthGuard] handleRequest:', { err: err?.message, user, info: info?.message });
    
    if (err || !user) {
      console.error('❌ [AdminJwtAuthGuard] Erreur ou pas d\'utilisateur');
      throw err || new UnauthorizedException('Token invalide ou expiré');
    }
    
    // Vérifier que c'est bien un admin MSP
    if (user.type !== 'admin_msp') {
      console.error('❌ [AdminJwtAuthGuard] Type incorrect:', user.type);
      throw new UnauthorizedException('Accès réservé aux administrateurs MSP');
    }

    console.log('✅ [AdminJwtAuthGuard] User validé:', user);
    return user;
  }
}
