import { UnauthorizedException } from '@nestjs/common';

/**
 * Extrait le databaseName de la requête de manière sécurisée
 * 
 * PRIORITÉ:
 * 1. req.organisationDatabase (écrit par MultiTenantInterceptor depuis JWT décodé)
 * 2. req.user?.databaseName (après validation par AuthGuard)
 * 
 * Cette approche garantit que même si req.user n'est pas encore peuplé,
 * on peut récupérer l'organisation depuis le JWT décodé par l'interceptor.
 * 
 * @param req - Objet requête Express
 * @returns databaseName de l'organisation
 * @throws UnauthorizedException si aucun databaseName n'est trouvé
 */
export function getDatabaseName(req: any): string {
  // PRIORITÉ 1: Valeur extraite par MultiTenantInterceptor (depuis JWT décodé)
  let databaseName = req.organisationDatabase;
  
  // PRIORITÉ 2: Valeur depuis req.user (après validation AuthGuard)
  if (!databaseName) {
    databaseName = req.user?.databaseName;
  }
  
  if (!databaseName) {
    console.error('❌ [getDatabaseName] databaseName manquant!', {
      hasUser: !!req.user,
      hasOrganisationDatabase: !!req.organisationDatabase,
      userId: req.user?.id,
      username: req.user?.username,
      organisationId: req.user?.organisationId,
      organisationIdFromInterceptor: req.organisationId,
      url: req.url,
      method: req.method,
    });
    
    throw new UnauthorizedException(
      'Informations multi-tenant manquantes. Veuillez vous reconnecter.'
    );
  }
  
  console.log('🏢 [getDatabaseName] Database extraite:', {
    databaseName,
    source: req.organisationDatabase ? 'MultiTenantInterceptor' : 'req.user',
    organisationId: req.organisationId || req.user?.organisationId,
    username: req.user?.username,
    url: req.url,
  });
  
  return databaseName;
}

/**
 * Extrait l'organisationId de la requête de manière sécurisée
 * 
 * PRIORITÉ:
 * 1. req.organisationId (écrit par MultiTenantInterceptor depuis JWT décodé)
 * 2. req.user?.organisationId (après validation par AuthGuard)
 * 
 * @param req - Objet requête Express
 * @returns organisationId
 * @throws UnauthorizedException si aucun organisationId n'est trouvé
 */
export function getOrganisationId(req: any): number {
  // PRIORITÉ 1: Valeur extraite par MultiTenantInterceptor (depuis JWT décodé)
  let organisationId = req.organisationId;
  
  // PRIORITÉ 2: Valeur depuis req.user (après validation AuthGuard)
  if (!organisationId) {
    organisationId = req.user?.organisationId;
  }
  
  if (!organisationId) {
    console.error('❌ [getOrganisationId] organisationId manquant!', {
      hasUser: !!req.user,
      hasOrganisationId: !!req.organisationId,
      url: req.url,
      method: req.method,
    });
    
    throw new UnauthorizedException(
      'Informations d\'organisation manquantes. Veuillez vous reconnecter.'
    );
  }
  
  return organisationId;
}
