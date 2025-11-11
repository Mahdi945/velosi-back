# 🗑️ Système de Suppression Automatique - ERP Velosi

## Vue d'ensemble

Le système ERP Velosi intègre un mécanisme de suppression automatique des comptes désactivés/suspendus après **7 jours** pour maintenir la sécurité et la conformité des données.

## 🎯 Fonctionnalités

### 1. Suppression Automatique Personnel
- **Délai** : 7 jours après désactivation/suspension
- **Cible** : Comptes personnel avec statut `inactif`, `desactive`, ou `suspendu`
- **Actions** :
  - Suppression du compte Keycloak
  - Suppression de la base de données
  - Email de notification de suppression

### 2. Suppression Automatique Clients
- **Délai** : 7 jours après désactivation/suspension
- **Cible** : Comptes clients avec statut `inactif`, `desactive`, ou `suspendu`
- **Actions** :
  - Suppression du compte Keycloak
  - Suppression de la base de données
  - Email de notification de suppression

### 3. Système d'Avertissement
- **Délai** : 2 jours avant suppression (soit 5 jours après désactivation)
- **Contenu** : Email d'avertissement avec délai restant
- **But** : Permettre la réactivation si nécessaire

## 📅 Planning d'Exécution

| Tâche | Heure | Fréquence | Description |
|-------|-------|-----------|-------------|
| Nettoyage Personnel | 02:00 | Quotidienne | Suppression des comptes personnel après 7j |
| Avertissement Personnel | 08:00 | Quotidienne | Emails d'avertissement à 2j de la suppression |
| Nettoyage Clients | 03:00 | Quotidienne | Suppression des comptes clients après 7j |
| Avertissement Clients | 09:00 | Quotidienne | Emails d'avertissement à 2j de la suppression |

## 🚀 Installation et Configuration

### Prérequis
```bash
npm install @nestjs/schedule
```

### 1. Configuration du Module
Dans `src/app.module.ts` :
```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // ... autres imports
    ScheduleModule.forRoot(),
  ],
  // ...
})
```

### 2. Activation des Cron Jobs
Dans `src/services/scheduler.service.ts`, décommenter les décorateurs :
```typescript
// Personnel
@Cron('0 2 * * *') // Tous les jours à 2h00
async cleanupDeactivatedAccounts() { ... }

@Cron('0 8 * * *') // Tous les jours à 8h00
async sendDeletionWarnings() { ... }

// Clients
@Cron('0 3 * * *') // Tous les jours à 3h00
async cleanupDeactivatedClients() { ... }

@Cron('0 9 * * *') // Tous les jours à 9h00
async sendClientDeletionWarnings() { ... }
```

## 🛠️ Tests et Maintenance

### Test Manuel
```bash
# Tester le système complet
./test-cleanup.ps1

# Tester uniquement le personnel
curl -X POST http://localhost:3000/admin/cleanup/manual

# Tester uniquement les clients
curl -X POST http://localhost:3000/admin/cleanup/manual-clients

# Vérifier le statut
curl -X GET http://localhost:3000/admin/cleanup/status
```

### APIs Administrateur

#### `GET /admin/cleanup/status`
Retourne le statut du service de nettoyage.

#### `POST /admin/cleanup/manual`
Déclenche manuellement le nettoyage des comptes personnel.

#### `POST /admin/cleanup/manual-clients`
Déclenche manuellement le nettoyage des comptes clients.

## ⚠️ Alertes Frontend

### Personnel Management
Le modal de désactivation affiche automatiquement une alerte quand "désactivé" est sélectionné, informant de la suppression après 7 jours.

### Client Management
Le modal de désactivation client affiche une alerte similaire avec les détails de la suppression automatique.

## 📧 Notifications Email

### Email d'Avertissement (J-2)
- **Objet** : "⚠️ Suppression définitive de votre compte dans 2 jours"
- **Contenu** : Détails du compte, date de suppression prévue, actions à entreprendre
- **Design** : HTML responsive avec couleurs d'alerte

### Email de Suppression (J-7)
- **Objet** : "🗑️ Votre compte a été supprimé définitivement"
- **Contenu** : Confirmation de suppression, informations du compte supprimé
- **Design** : HTML responsive avec style de notification finale

## 🔒 Sécurité et Conformité

### Politiques de Rétention
- **Délai de grâce** : 7 jours pour permettre la réactivation
- **Avertissement préalable** : 2 jours avant suppression
- **Suppression complète** : Base de données + Keycloak
- **Traçabilité** : Logs complets de toutes les opérations

### Protection des Données
- Suppression définitive après le délai
- Impossibilité de récupération après suppression
- Notification obligatoire avant suppression
- Respect des politiques de gestion des accès

## 📊 Monitoring et Logs

### Logs de Service
```
[SchedulerService] Début du nettoyage des comptes désactivés...
[SchedulerService] 3 comptes à supprimer
[SchedulerService] Personnel john.doe (ID: 123) supprimé définitivement
[SchedulerService] Nettoyage terminé: 3 comptes supprimés
```

### Métriques
- Nombre de comptes supprimés par jour
- Erreurs de suppression
- Emails d'avertissement envoyés
- Taux de réactivation après avertissement

## 🔧 Dépannage

### Problèmes Courants

#### "Repository not found"
```bash
# Vérifier que les entités sont bien importées dans app.module.ts
TypeOrmModule.forFeature([Personnel, Client])
```

#### "Keycloak deletion failed"
```bash
# Vérifier la configuration Keycloak
# Vérifier les permissions admin
# Contrôler les logs de connexion
```

#### "Email sending failed"
```bash
# Vérifier la configuration SMTP
# Contrôler les adresses email des comptes
# Vérifier les logs du EmailService
```

## 📈 Évolutions Futures

### Fonctionnalités Prévues
- [ ] Configuration flexible des délais via interface admin
- [ ] Statistiques de suppression dans le dashboard
- [ ] Export des comptes supprimés pour audit
- [ ] Notifications Slack/Teams pour les administrateurs
- [ ] Système de quarantaine avant suppression définitive

### Améliorations Techniques
- [ ] Système de retry pour les échecs Keycloak
- [ ] Parallélisation des suppressions pour les gros volumes
- [ ] Archivage des données avant suppression
- [ ] API de restauration d'urgence (dans les 24h)

---

**⚠️ Important** : Cette fonctionnalité supprime définitivement les données. Assurez-vous que vos politiques de sauvegarde et de rétention sont en place avant l'activation en production.