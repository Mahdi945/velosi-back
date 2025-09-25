import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { KeycloakSyncService } from '../services/keycloak-sync.service';

async function syncAllUsers() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const keycloakSyncService = app.get(KeycloakSyncService);

  try {
    console.log('🔄 Début de la synchronisation complète vers Keycloak...');
    
    // Synchroniser tous les utilisateurs
    await keycloakSyncService.syncPersonnelToKeycloak();
    await keycloakSyncService.syncClientsToKeycloak();
    
    console.log('✅ Synchronisation terminée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  syncAllUsers();
}

export { syncAllUsers };
