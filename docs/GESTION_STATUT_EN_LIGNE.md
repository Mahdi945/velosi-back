# Système de Gestion de Statut En Ligne et Session

## Vue d'ensemble

Ce système permet de gérer le statut en ligne des utilisateurs (Personnel et Clients) avec un contrôle strict de la durée de session de 24 heures maximum.

## 🗄️ Structure de la Base de Données

### Nouveaux Champs Ajoutés

**Tables concernées:** `personnel` et `client`

```sql
-- Champ pour indiquer si l'utilisateur est connecté
statut_en_ligne BOOLEAN DEFAULT false

-- Timestamp de la dernière activité
last_activity TIMESTAMP
```

### Script de Migration

Le script SQL se trouve dans : `migrations/add_statut_en_ligne_to_personnel.sql`

**Pour exécuter la migration :**

```bash
# Connexion à PostgreSQL
psql -U votre_user -d velosi_db

# Exécuter le script
\i migrations/add_statut_en_ligne_to_personnel.sql
```

Ou via un client PostgreSQL (pgAdmin, DBeaver, etc.)

## 🔐 Fonctionnement du Système

### 1. **Connexion (Login)**

Lors de la connexion d'un utilisateur :
- ✅ `statut_en_ligne` est mis à `true`
- ✅ `last_activity` est mis à jour avec l'heure actuelle
- ✅ Un JWT avec expiration de 24h est généré

**Code :** `src/auth/auth.service.ts` - méthode `login()`

### 2. **Validation de Session**

À chaque requête authentifiée :
- ✅ Vérification que `last_activity` n'a pas dépassé 24 heures
- ✅ Si dépassé : session expirée → déconnexion automatique
- ✅ Si valide : mise à jour de `last_activity`

**Code :** `src/auth/auth.service.ts` - méthode `validateJwtPayload()`

### 3. **Tracking d'Activité**

Un intercepteur met à jour `last_activity` automatiquement à chaque requête :
- ✅ Exécution asynchrone (ne bloque pas les requêtes)
- ✅ Logs de debug pour suivi
- ✅ Gestion des erreurs silencieuse

**Code :** `src/auth/activity-tracker.interceptor.ts`

### 4. **Déconnexion (Logout)**

Lors de la déconnexion :
- ✅ `statut_en_ligne` est mis à `false`
- ✅ Fermeture des sessions Keycloak (si configuré)
- ✅ Suppression des cookies

**Code :** `src/auth/auth.service.ts` - méthode `logout()`

## 📊 Méthodes Utiles sur les Entités

### Pour Personnel et Client

```typescript
// Vérifier si l'utilisateur est en ligne
user.isOnline // boolean

// Vérifier si la session est valide (< 24h)
user.isSessionValid // boolean

// Obtenir le temps restant avant expiration (en millisecondes)
user.sessionExpiresIn // number | null
```

**Exemple d'utilisation :**

```typescript
const personnel = await personnelRepository.findOne({ where: { id: 1 } });

if (personnel.isOnline && personnel.isSessionValid) {
  console.log(`Utilisateur en ligne, session expire dans ${personnel.sessionExpiresIn / 1000 / 60} minutes`);
} else if (personnel.isOnline && !personnel.isSessionValid) {
  console.log('Session expirée, déconnexion requise');
  // Marquer comme hors ligne
  await personnelRepository.update(personnel.id, { statut_en_ligne: false });
}
```

## 🔧 Configuration

### Durée de Session JWT

Dans `.env` ou `auth.module.ts` :

```bash
# Durée du token d'accès (défaut: 24h)
JWT_EXPIRES_IN=24h

# Durée du refresh token (défaut: 30j)
JWT_REFRESH_EXPIRES_IN=30d
```

### Activation de l'Intercepteur (Optionnel)

Pour activer l'intercepteur globalement dans `app.module.ts` :

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActivityTrackerInterceptor } from './auth/activity-tracker.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityTrackerInterceptor,
    },
  ],
})
export class AppModule {}
```

**Note :** L'intercepteur est déjà actif via la validation JWT, cette étape est optionnelle.

## 🛡️ Sécurité et Comportement

### Scénarios Gérés

#### 1. **Utilisateur reste connecté après fermeture du navigateur**
- ✅ Le cookie persiste jusqu'à 24h
- ✅ À la réouverture, si < 24h → reconnexion automatique
- ✅ Si > 24h → page de déconnexion affichée

#### 2. **Session expirée pendant l'utilisation**
- ✅ La prochaine requête détecte l'expiration
- ✅ Erreur 401 retournée
- ✅ Frontend redirige vers la page de login

#### 3. **Déconnexion manuelle**
- ✅ `statut_en_ligne` = false
- ✅ Cookies supprimés
- ✅ Session Keycloak fermée

#### 4. **Multiple connexions**
- ✅ Chaque connexion met à jour `last_activity`
- ✅ Si plusieurs onglets : tous partagent la même session
- ✅ La déconnexion sur un onglet déconnecte tous les onglets

## 📋 API Endpoints

### POST `/auth/logout`
**Protégé par JwtAuthGuard**

Déconnecte l'utilisateur actuel.

**Réponse :**
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

## 🔍 Requêtes SQL Utiles

### Voir tous les utilisateurs en ligne

```sql
-- Personnel en ligne
SELECT id, nom, prenom, nom_utilisateur, statut_en_ligne, last_activity
FROM personnel
WHERE statut_en_ligne = true;

-- Clients en ligne
SELECT id, nom, interlocuteur, statut_en_ligne, last_activity
FROM client
WHERE statut_en_ligne = true;
```

### Déconnecter tous les utilisateurs (maintenance)

```sql
-- Déconnecter tout le personnel
UPDATE personnel SET statut_en_ligne = false;

-- Déconnecter tous les clients
UPDATE client SET statut_en_ligne = false;
```

### Nettoyer les sessions expirées (> 24h)

```sql
-- Personnel avec session expirée
UPDATE personnel
SET statut_en_ligne = false
WHERE statut_en_ligne = true
  AND last_activity < NOW() - INTERVAL '24 hours';

-- Clients avec session expirée
UPDATE client
SET statut_en_ligne = false
WHERE statut_en_ligne = true
  AND last_activity < NOW() - INTERVAL '24 hours';
```

### Statistiques de connexion

```sql
-- Nombre d'utilisateurs en ligne par type
SELECT 
  'personnel' as type,
  COUNT(*) as online_count
FROM personnel
WHERE statut_en_ligne = true
UNION ALL
SELECT 
  'client' as type,
  COUNT(*) as online_count
FROM client
WHERE statut_en_ligne = true;

-- Utilisateurs avec session active dans les dernières 2 heures
SELECT 
  nom, 
  prenom, 
  last_activity,
  EXTRACT(EPOCH FROM (NOW() - last_activity))/60 as minutes_ago
FROM personnel
WHERE last_activity > NOW() - INTERVAL '2 hours'
ORDER BY last_activity DESC;
```

## 🧪 Tests

### Tester l'expiration de session

1. **Connectez-vous** normalement
2. **Modifiez manuellement** `last_activity` dans la DB :
   ```sql
   UPDATE personnel 
   SET last_activity = NOW() - INTERVAL '25 hours'
   WHERE id = <votre_id>;
   ```
3. **Faites une requête** authentifiée
4. **Résultat attendu :** Erreur 401 "Session expirée"

### Tester le statut en ligne

```typescript
// Avant login
const user = await personnelRepository.findOne({ where: { id: 1 } });
console.log(user.statut_en_ligne); // false

// Après login
console.log(user.statut_en_ligne); // true

// Après logout
console.log(user.statut_en_ligne); // false
```

## 📝 Notes Importantes

1. **Performance :** L'intercepteur effectue une requête UPDATE à chaque requête authentifiée. Pour des volumes élevés, envisager un cache Redis.

2. **Clustering :** Si vous utilisez plusieurs instances Node.js, assurez-vous que tous les serveurs partagent la même base de données pour la cohérence du statut.

3. **WebSockets :** Pour une mise à jour en temps réel du statut en ligne côté frontend, intégrer Socket.IO ou similaire.

4. **Keycloak :** La fermeture de session Keycloak est optionnelle et ne bloque pas la déconnexion si elle échoue.

## 🚀 Prochaines Améliorations

- [ ] Notification en temps réel via WebSocket quand un utilisateur se connecte/déconnecte
- [ ] Dashboard admin pour voir tous les utilisateurs en ligne
- [ ] Historique des connexions (login_history table)
- [ ] Forcer la déconnexion d'un utilisateur spécifique (endpoint admin)
- [ ] Limiter le nombre de sessions simultanées par utilisateur

## 📞 Support

En cas de problème, vérifiez :
1. ✅ Migration SQL exécutée
2. ✅ Entités TypeORM synchronisées
3. ✅ Logs du serveur pour les erreurs
4. ✅ JWT_EXPIRES_IN configuré correctement
