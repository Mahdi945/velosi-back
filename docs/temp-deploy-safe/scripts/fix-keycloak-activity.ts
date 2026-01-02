#!/usr/bin/env ts-node

/**
 * Script pour réparer les données d'activité Keycloak existantes
 * Ce script initialise les attributs d'activité pour tous les utilisateurs existants
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { KeycloakService } from '../auth/keycloak.service';
import { UsersService } from '../users/users.service';

async function fixKeycloakActivity() {
  console.log('🔧 Démarrage du script de réparation des activités Keycloak...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const keycloakService = app.get(KeycloakService);
  const usersService = app.get(UsersService);

  try {
    // Récupérer tous les utilisateurs avec un keycloak_id
    console.log('📝 Récupération de tous les utilisateurs...');
    const personnel = await usersService.getAllPersonnel();
    const clients = await usersService.getAllClients();
    
    const allUsers = [
      ...personnel.filter(p => p.keycloak_id),
      ...clients.filter(c => c.keycloak_id)
    ];

    console.log(`👥 ${allUsers.length} utilisateurs trouvés avec un keycloak_id`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const user of allUsers) {
      try {
        console.log(`🔄 Traitement de ${user.nom_utilisateur || user.nom}...`);
        
        // Initialiser les attributs d'activité
        await initializeUserActivityAttributes(keycloakService, user.keycloak_id);
        
        fixedCount++;
        console.log(`✅ Utilisateur ${user.nom_utilisateur || user.nom} réparé`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Erreur pour ${user.nom_utilisateur || user.nom}:`, error.message);
      }
    }

    console.log('\n📊 Résultats:');
    console.log(`✅ Utilisateurs réparés: ${fixedCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    
  } catch (error) {
    console.error('💥 Erreur globale:', error);
  } finally {
    await app.close();
  }
}

async function initializeUserActivityAttributes(keycloakService: KeycloakService, keycloakId: string) {
  const keycloakBaseUrl = (keycloakService as any).keycloakBaseUrl;
  const realm = (keycloakService as any).realm;
  const getAccessToken = (keycloakService as any).getAccessToken.bind(keycloakService);
  
  const token = await getAccessToken();
  const userUrl = `${keycloakBaseUrl}/admin/realms/${realm}/users/${keycloakId}`;
  
  // D'abord, récupérer les données existantes
  const getUserResponse = await fetch(userUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!getUserResponse.ok) {
    throw new Error(`Impossible de récupérer l'utilisateur: ${getUserResponse.status}`);
  }

  const userData = await getUserResponse.json();
  const existingAttributes = userData.attributes || {};
  
  // Préparer les nouveaux attributs en gardant les existants
  const currentTime = new Date().toISOString();
  const newAttributes = {
    ...existingAttributes,
    // N'initialiser que si pas déjà présent
    totalSessions: existingAttributes.totalSessions || ['0'],
    accountCreated: existingAttributes.accountCreated || [userData.createdTimestamp ? new Date(userData.createdTimestamp).toISOString() : currentTime],
    lastActivity: existingAttributes.lastActivity || [currentTime],
    lastActivityType: existingAttributes.lastActivityType || ['initialized'],
    sessionActive: existingAttributes.sessionActive || ['false']
  };

  // Mettre à jour l'utilisateur avec les nouveaux attributs
  const updateResponse = await fetch(userUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...userData,
      attributes: newAttributes
    }),
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Erreur mise à jour utilisateur: ${updateResponse.status} - ${errorText}`);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  fixKeycloakActivity().catch(console.error);
}

export { fixKeycloakActivity };