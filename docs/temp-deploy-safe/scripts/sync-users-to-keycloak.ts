import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';
import { KeycloakService } from '../auth/keycloak.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContactClient } from '../entities/contact-client.entity';

// Polyfill pour crypto.randomUUID si nécessaire
if (!global.crypto) {
  const nodeCrypto = require('crypto');
  (global as any).crypto = {
    randomUUID: () => nodeCrypto.randomUUID(),
  };
}

/**
 * Script de migration pour synchroniser les utilisateurs existants avec Keycloak
 * 
 * Ce script va :
 * 1. Récupérer tous les personnels actifs
 * 2. Récupérer tous les clients avec is_permanent = true
 * 3. Créer les utilisateurs dans Keycloak
 * 4. Assigner les rôles appropriés
 * 5. Mettre à jour les keycloak_id dans PostgreSQL
 * 
 * Usage : npm run sync:keycloak
 */

async function bootstrap() {
  console.log('🚀 Démarrage de la synchronisation avec Keycloak...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  const personnelRepository = app.get<Repository<Personnel>>(
    getRepositoryToken(Personnel),
  );
  const clientRepository = app.get<Repository<Client>>(
    getRepositoryToken(Client),
  );
  const contactClientRepository = app.get<Repository<ContactClient>>(
    getRepositoryToken(ContactClient),
  );
  const keycloakService = app.get(KeycloakService);

  let totalPersonnelSynced = 0;
  let totalPersonnelSkipped = 0;
  let totalClientsSynced = 0;
  let totalClientsSkipped = 0;
  let totalErrors = 0;

  // ========================================
  // 1. Synchroniser le Personnel
  // ========================================
  console.log('\n📋 SYNCHRONISATION DU PERSONNEL');
  console.log('═'.repeat(50));

  const personnelList = await personnelRepository.find({
    where: { statut: 'actif' },
  });

  console.log(`\nPersonnel actif trouvé : ${personnelList.length}\n`);

  for (const personnel of personnelList) {
    try {
      // Vérifier si déjà synchronisé
      if (personnel.keycloak_id) {
        console.log(`⏭️  ${personnel.nom_utilisateur} (${personnel.role}) - Déjà synchronisé (${personnel.keycloak_id})`);
        totalPersonnelSkipped++;
        continue;
      }

      // Vérifier si l'email est valide
      if (!personnel.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personnel.email)) {
        console.log(`⚠️  ${personnel.nom_utilisateur} - Email invalide ou manquant : "${personnel.email}" - IGNORÉ`);
        totalPersonnelSkipped++;
        continue;
      }

      // Créer l'utilisateur dans Keycloak
      console.log(`🔄 Création de ${personnel.nom_utilisateur} (${personnel.role})...`);
      
      const keycloakUser = {
        username: personnel.nom_utilisateur,
        email: personnel.email,
        firstName: personnel.prenom,
        lastName: personnel.nom,
        enabled: personnel.statut === 'actif',
        password: undefined, // Ne pas définir de mot de passe (sera défini par l'utilisateur)
      };

      const keycloakUserId = await keycloakService.createUser(keycloakUser);
      
      if (keycloakUserId) {
        // Assigner le rôle
        await keycloakService.assignRoleToUser(keycloakUserId, personnel.role);
        
        // Mettre à jour la base de données
        personnel.keycloak_id = keycloakUserId;
        await personnelRepository.save(personnel);
        
        console.log(`   ✅ Créé avec succès - ID Keycloak: ${keycloakUserId}`);
        totalPersonnelSynced++;
      } else {
        console.log(`   ❌ Échec de la création`);
        totalErrors++;
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
      totalErrors++;
    }
  }

  // ========================================
  // 2. Synchroniser les Clients Permanents
  // ========================================
  console.log('\n\n📋 SYNCHRONISATION DES CLIENTS PERMANENTS');
  console.log('═'.repeat(50));

  const permanentClients = await clientRepository.find({
    where: { 
      is_permanent: true,
      statut: 'actif'
    },
  });

  console.log(`\nClients permanents actifs trouvés : ${permanentClients.length}\n`);

  for (const client of permanentClients) {
    try {
      // Vérifier si déjà synchronisé
      if (client.keycloak_id) {
        console.log(`⏭️  ${client.nom} - Déjà synchronisé (${client.keycloak_id})`);
        totalClientsSkipped++;
        continue;
      }

      // Récupérer l'email depuis contact_client
      let contactEmail = '';
      try {
        const contact = await contactClientRepository.findOne({
          where: { id_client: client.id },
        });
        
        if (contact && contact.mail1) {
          contactEmail = contact.mail1;
        }
      } catch (contactError) {
        console.log(`   ⚠️  Impossible de récupérer le contact pour ${client.nom}`);
      }

      // Nettoyer et valider l'email
      let cleanedEmail = contactEmail.trim();
      // Remplacer les doubles points par un seul point
      cleanedEmail = cleanedEmail.replace(/\.{2,}/g, '.');
      // Enlever les points avant @
      cleanedEmail = cleanedEmail.replace(/\.+@/, '@');
      
      if (!cleanedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
        console.log(`⚠️  ${client.nom} - Email invalide ou manquant : "${contactEmail}" → "${cleanedEmail}" - IGNORÉ`);
        totalClientsSkipped++;
        continue;
      }

      // Créer l'utilisateur dans Keycloak
      console.log(`🔄 Création de ${client.nom} (client permanent)...`);
      
      // Normaliser le username : enlever espaces, caractères spéciaux, convertir en minuscules
      const normalizedUsername = client.nom
        .toLowerCase()
        .replace(/\s+/g, '-')           // Remplacer espaces par tirets
        .replace(/[^a-z0-9\-_.]/g, '')  // Enlever caractères spéciaux
        .replace(/^-+|-+$/g, '')        // Enlever tirets au début/fin
        .substring(0, 50);              // Limiter à 50 caractères
      
      const keycloakUser = {
        username: normalizedUsername,
        email: cleanedEmail,  // Utiliser l'email nettoyé
        firstName: client.interlocuteur || client.nom,
        lastName: '',
        enabled: client.statut === 'actif' && !client.blocage,
        password: undefined, // Ne pas définir de mot de passe (sera défini par l'utilisateur)
      };

      const keycloakUserId = await keycloakService.createUser(keycloakUser);
      
      if (keycloakUserId) {
        // Assigner le rôle client
        await keycloakService.assignRoleToUser(keycloakUserId, 'client');
        
        // Mettre à jour la base de données
        client.keycloak_id = keycloakUserId;
        await clientRepository.save(client);
        
        console.log(`   ✅ Créé avec succès - ID Keycloak: ${keycloakUserId}`);
        totalClientsSynced++;
      } else {
        console.log(`   ❌ Échec de la création`);
        totalErrors++;
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
      totalErrors++;
    }
  }

  // ========================================
  // 3. Récapitulatif
  // ========================================
  console.log('\n\n📊 RÉCAPITULATIF DE LA SYNCHRONISATION');
  console.log('═'.repeat(50));
  console.log(`\n✅ Personnel synchronisé : ${totalPersonnelSynced}`);
  console.log(`⏭️  Personnel déjà synchronisé : ${totalPersonnelSkipped}`);
  console.log(`\n✅ Clients synchronisés : ${totalClientsSynced}`);
  console.log(`⏭️  Clients déjà synchronisés : ${totalClientsSkipped}`);
  console.log(`\n❌ Erreurs totales : ${totalErrors}`);
  console.log(`\n✨ Total synchronisé : ${totalPersonnelSynced + totalClientsSynced}`);
  console.log('═'.repeat(50));

  await app.close();
  console.log('\n🏁 Synchronisation terminée !');
}

bootstrap().catch((error) => {
  console.error('\n💥 Erreur fatale lors de la synchronisation:', error);
  process.exit(1);
});
