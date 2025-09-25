import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log('Roles Guard - Rôles requis:', requiredRoles);

    if (!requiredRoles) {
      console.log('Roles Guard - Aucun rôle requis, accès autorisé');
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    console.log('Roles Guard - Utilisateur:', user ? {
      id: user.id,
      username: user.username,
      role: user.role
    } : 'null');

    if (!user) {
      console.error('Roles Guard - Utilisateur non authentifié');
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const hasRole = requiredRoles.some(
      (role) => user.role?.toLowerCase() === role.toLowerCase(),
    );

    console.log('Roles Guard - Vérification des rôles:', {
      userRole: user.role,
      requiredRoles,
      hasRole
    });

    if (!hasRole) {
      console.error('Roles Guard - Accès refusé:', {
        userRole: user.role,
        requiredRoles
      });
      throw new ForbiddenException(
        `Accès refusé. Rôle actuel: ${user.role}. Rôles requis: ${requiredRoles.join(', ')}`,
      );
    }

    console.log('Roles Guard - Accès autorisé');
    return true;
  }
}
