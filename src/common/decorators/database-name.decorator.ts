import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * Décorateur pour extraire le databaseName du JWT
 * Lève une erreur si le databaseName n'est pas présent
 * 
 * Usage: @DatabaseName() databaseName: string
 */
export const DatabaseName = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    
    if (!user.databaseName) {
      console.error('❌ [DatabaseName Decorator] databaseName manquant dans le JWT!', {
        userId: user.id,
        username: user.username,
        userType: user.userType,
        organisationId: user.organisationId,
        availableKeys: Object.keys(user),
      });
      throw new UnauthorizedException(
        'Informations multi-tenant manquantes dans le token. Veuillez vous reconnecter.'
      );
    }
    
    console.log('🏢 [DatabaseName Decorator] Database extraite:', {
      databaseName: user.databaseName,
      organisationId: user.organisationId,
      username: user.username,
    });
    
    return user.databaseName;
  },
);

/**
 * Décorateur pour extraire l'organisationId du JWT
 * Lève une erreur si l'organisationId n'est pas présent
 * 
 * Usage: @OrganisationId() organisationId: number
 */
export const OrganisationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    
    if (!user.organisationId) {
      throw new UnauthorizedException(
        'Informations d\'organisation manquantes dans le token. Veuillez vous reconnecter.'
      );
    }
    
    return user.organisationId;
  },
);
