# 🚀 DÉPLOIEMENT KEYCLOAK EN 10 MINUTES

## Option Recommandée : Render.com (100% Gratuit)

---

## ✅ ÉTAPE 1 : Créer un Compte Render (2 min)

1. Allez sur **https://render.com**
2. Cliquez sur **"Get Started for Free"**
3. Inscrivez-vous avec GitHub (recommandé) ou Email
4. Vérifiez votre email
5. ✅ Compte créé !

---

## ✅ ÉTAPE 2 : Créer une Base PostgreSQL (2 min)

1. Dans votre Dashboard Render, cliquez sur **"New +"**
2. Sélectionnez **"PostgreSQL"**
3. Remplissez :
   - **Name** : `keycloak-db`
   - **Database** : `keycloak`
   - **User** : `keycloak`
   - **Region** : `Frankfurt (EU Central)` (le plus proche)
   - **Plan** : **Free** ✅
4. Cliquez sur **"Create Database"**
5. Attendez 30 secondes (création automatique)
6. ✅ Base de données créée !

**📋 Notez ces informations (onglet "Info")** :
```
Internal Database URL: postgresql://keycloak:xxxxx@dpg-xxxxx/keycloak
```

---

## ✅ ÉTAPE 3 : Déployer Keycloak (3 min)

### 3.1 Créer le Service Web

1. Retournez au Dashboard Render
2. Cliquez sur **"New +"**
3. Sélectionnez **"Web Service"**

### 3.2 Configurer le Source

**Option A : Depuis Docker Hub (Plus Rapide)**
1. Sélectionnez **"Deploy an existing image from a registry"**
2. Image URL : `quay.io/keycloak/keycloak:26.0.7`
3. Cliquez sur **"Next"**

**Option B : Depuis votre Repo GitHub**
1. Connectez votre compte GitHub
2. Sélectionnez le repo `velosi-back`
3. Branch : `main`
4. Root Directory : `/`
5. Dockerfile Path : `Dockerfile.keycloak`

### 3.3 Configuration du Service

- **Name** : `keycloak-velosi`
- **Region** : `Frankfurt (EU Central)`
- **Instance Type** : **Free** ✅

### 3.4 Variables d'Environnement

Cliquez sur **"Advanced"** puis ajoutez ces variables :

```bash
# 1. Admin Credentials
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=Admin123456!

# 2. Database (Copier l'URL de l'étape 2)
KC_DB=postgres
KC_DB_URL=postgresql://keycloak:xxxxx@dpg-xxxxx/keycloak

# 3. Server Configuration
KC_HOSTNAME_STRICT=false
KC_HTTP_ENABLED=true
KC_PROXY=edge

# 4. Features
KC_HEALTH_ENABLED=true
KC_METRICS_ENABLED=true
```

### 3.5 Start Command

Dans **"Start Command"**, entrez :
```bash
/opt/keycloak/bin/kc.sh start --optimized
```

### 3.6 Déployer

1. Cliquez sur **"Create Web Service"**
2. Attendez 2-3 minutes (build + déploiement)
3. ✅ Keycloak est déployé !

---

## ✅ ÉTAPE 4 : Configurer Keycloak (3 min)

### 4.1 Accéder à Keycloak

1. Dans Render, copiez l'URL de votre service : `https://keycloak-velosi.onrender.com`
2. Ouvrez cette URL dans votre navigateur
3. Allez sur `/admin` : `https://keycloak-velosi.onrender.com/admin`
4. Connectez-vous avec :
   - **Username** : `admin`
   - **Password** : `Admin123456!`

### 4.2 Créer le Realm 'velosi'

1. En haut à gauche, cliquez sur **"master"**
2. Cliquez sur **"Create Realm"**
3. Realm name : `velosi`
4. Enabled : ✅ ON
5. Cliquez sur **"Create"**

### 4.3 Créer le Client 'velosi-erp'

1. Dans le menu de gauche, cliquez sur **"Clients"**
2. Cliquez sur **"Create client"**
3. Remplissez :
   - **Client type** : `OpenID Connect`
   - **Client ID** : `velosi-erp`
4. Cliquez sur **"Next"**
5. Activez :
   - ✅ **Client authentication** : ON
   - ✅ **Authorization** : ON
   - ✅ **Standard flow** : ON
   - ✅ **Direct access grants** : ON
6. Cliquez sur **"Next"**
7. Valid redirect URIs :
   ```
   http://localhost:4200/*
   https://votre-frontend-url.vercel.app/*
   ```
8. Web origins :
   ```
   http://localhost:4200
   https://votre-frontend-url.vercel.app
   ```
9. Cliquez sur **"Save"**

### 4.4 Récupérer le Client Secret

1. Restez sur la page du client `velosi-erp`
2. Allez dans l'onglet **"Credentials"**
3. Copiez le **"Client secret"** 
4. 📋 Notez-le : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 4.5 Créer les Rôles

1. Menu de gauche → **"Realm roles"**
2. Cliquez sur **"Create role"**
3. Créez ces rôles un par un :
   - `administratif`
   - `commercial`
   - `financier`
   - `exploiteur`
   - `chauffeur`
   - `client`

### 4.6 Importer vos Utilisateurs

**Option A : Manuellement**
1. Menu de gauche → **"Users"**
2. Cliquez sur **"Add user"**
3. Remplissez les infos
4. Dans "Role mapping", assignez les rôles

**Option B : Script d'import (voir GUIDE_MIGRATION_KEYCLOAK.md)**

---

## ✅ ÉTAPE 5 : Configurer le Backend (2 min)

### 5.1 Mettre à jour `.env.production`

```bash
# Base de données Supabase (inchangé)
DATABASE_URL=votre-url-supabase

# Keycloak Production
KEYCLOAK_REALM=velosi
KEYCLOAK_CLIENT_ID=velosi-erp
KEYCLOAK_CLIENT_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
KEYCLOAK_SERVER_URL=https://keycloak-velosi.onrender.com
KEYCLOAK_AUTH_SERVER_URL=https://keycloak-velosi.onrender.com

# JWT
JWT_SECRET=votre-jwt-secret-super-securise-123456789
JWT_EXPIRATION=8h

# CORS
CORS_ORIGIN=https://votre-frontend.vercel.app

# API
PORT=3000
NODE_ENV=production
```

### 5.2 Mettre à jour `.env` (local)

```bash
# Keycloak Local (développement)
KEYCLOAK_REALM=velosi
KEYCLOAK_CLIENT_ID=velosi-erp
KEYCLOAK_CLIENT_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
KEYCLOAK_SERVER_URL=https://keycloak-velosi.onrender.com
KEYCLOAK_AUTH_SERVER_URL=https://keycloak-velosi.onrender.com
```

---

## ✅ ÉTAPE 6 : Déployer le Backend sur Railway (2 min)

### 6.1 Créer un Projet Railway

1. Allez sur **https://railway.app**
2. Connectez-vous avec GitHub
3. Cliquez sur **"New Project"**
4. Sélectionnez **"Deploy from GitHub repo"**
5. Choisissez **`velosi-back`**

### 6.2 Configurer les Variables

Railway détecte automatiquement `.env.production` mais vérifiez :

1. Dans Railway, cliquez sur votre service
2. Allez dans **"Variables"**
3. Vérifiez que toutes les variables de `.env.production` sont présentes
4. Ajoutez manuellement celles qui manquent

### 6.3 Déployer

1. Railway déploie automatiquement
2. Attendez 2-3 minutes
3. Copiez l'URL de votre backend : `https://velosi-back-production.up.railway.app`
4. ✅ Backend déployé !

---

## ✅ ÉTAPE 7 : Tester l'Authentification (1 min)

### 7.1 Test API

```bash
# Obtenir un token
curl -X POST https://keycloak-velosi.onrender.com/realms/velosi/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=velosi-erp" \
  -d "client_secret=VOTRE_SECRET" \
  -d "grant_type=password" \
  -d "username=admin" \
  -d "password=votre_password"
```

### 7.2 Test Backend

```bash
# Health check
curl https://velosi-back-production.up.railway.app/health

# Test auth
curl https://velosi-back-production.up.railway.app/api/users/profile \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

---

## ✅ ÉTAPE 8 : Mettre à jour le Frontend (1 min)

### 8.1 Mettre à jour `environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://velosi-back-production.up.railway.app/api',
  keycloak: {
    url: 'https://keycloak-velosi.onrender.com',
    realm: 'velosi',
    clientId: 'velosi-erp'
  }
};
```

### 8.2 Déployer sur Vercel

```bash
cd velosi-front
npm run build
vercel --prod
```

---

## 🎉 TERMINÉ !

### ✅ Vérifications Finales

- [ ] Keycloak accessible : https://keycloak-velosi.onrender.com/admin
- [ ] Backend accessible : https://velosi-back-production.up.railway.app/health
- [ ] Frontend accessible : https://velosi-front.vercel.app
- [ ] Login fonctionne
- [ ] Tokens JWT générés
- [ ] API protégées fonctionnent

---

## 📊 Architecture Finale

```
┌─────────────────┐
│   Frontend      │
│   (Vercel)      │
└────────┬────────┘
         │
         ↓ HTTPS
┌─────────────────┐
│   Backend       │
│   (Railway)     │
└────┬──────┬─────┘
     │      │
     │      ↓ Auth
     │  ┌──────────────┐
     │  │  Keycloak    │
     │  │  (Render)    │
     │  └──────┬───────┘
     │         │
     ↓         ↓ DB
┌─────────────────┐
│   PostgreSQL    │
│   (Supabase)    │
│   (Render)      │
└─────────────────┘
```

---

## 💰 Coûts Mensuels

- **Render PostgreSQL** : Gratuit (1 Go)
- **Render Keycloak** : Gratuit (750h/mois)
- **Railway Backend** : $5/mois (500h)
- **Vercel Frontend** : Gratuit
- **TOTAL** : **$5/mois** 🎉

---

## 🆘 Support

**Keycloak ne démarre pas ?**
- Vérifiez les logs dans Render : "Logs" tab
- Vérifiez que KC_DB_URL est correcte
- Attendez 2-3 minutes (premier démarrage)

**Erreur 401 sur le backend ?**
- Vérifiez que KEYCLOAK_SERVER_URL est correct
- Vérifiez le client secret
- Testez le token manuellement (curl)

**Frontend ne se connecte pas ?**
- Vérifiez environment.prod.ts
- Vérifiez CORS dans le backend
- Vérifiez les redirect URIs dans Keycloak

---

## 🎯 Prochaines Étapes

1. ✅ Configurer un domaine personnalisé (optionnel)
2. ✅ Activer 2FA dans Keycloak
3. ✅ Configurer les emails (SMTP)
4. ✅ Backup automatique (Render fait ça)
5. ✅ Monitoring (Render Dashboard)

---

**TOUT EST PRÊT ! Bonne chance avec votre déploiement ! 🚀**
