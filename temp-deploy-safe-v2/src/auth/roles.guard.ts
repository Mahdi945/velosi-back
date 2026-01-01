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
      role: user.role,
      roles: user.roles
    } : 'null');

    if (!user) {
      console.error('Roles Guard - Utilisateur non authentifié');
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // Récupérer les rôles de l'utilisateur (peut être un string ou un array)
    let userRoles: string[] = [];
    if (typeof user.role === 'string') {
      userRoles.push(user.role);
    } else if (Array.isArray(user.role)) {
      userRoles = user.role;
    }
    
    // Ajouter aussi user.roles s'il existe (Keycloak peut l'utiliser)
    if (Array.isArray(user.roles)) {
      userRoles = [...userRoles, ...user.roles];
    } else if (typeof user.roles === 'string') {
      userRoles.push(user.roles);
    }

    // Normaliser tous les rôles en minuscules pour une comparaison insensible à la casse
    const normalizedUserRoles = userRoles.map(r => r.toLowerCase());

    const hasRole = requiredRoles.some(
      (requiredRole) => normalizedUserRoles.includes(requiredRole.toLowerCase()),
    );

    console.log('Roles Guard - Vérification des rôles:', {
      userRoles: normalizedUserRoles,
      requiredRoles,
      hasRole
    });

    if (!hasRole) {
      console.error('Roles Guard - Accès refusé:', {
        userRoles: normalizedUserRoles,
        requiredRoles
      });
      throw new ForbiddenException(
        `Accès refusé. Rôles actuels: ${normalizedUserRoles.join(', ')}. Rôles requis: ${requiredRoles.join(', ')}`,
      );
    }

    console.log('Roles Guard - Accès autorisé');
    return true;
  }
}
