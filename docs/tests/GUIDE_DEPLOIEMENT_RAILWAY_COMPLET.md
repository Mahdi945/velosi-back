# Guide de Déploiement ERP Velosi sur Railway + Supabase

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Configuration Supabase](#configuration-supabase)
3. [Déploiement Keycloak sur Railway](#déploiement-keycloak)
4. [Déploiement Backend NestJS sur Railway](#déploiement-backend)
5. [Déploiement Frontend Angular sur Vercel](#déploiement-frontend)
6. [Configuration Finale](#configuration-finale)
7. [Tests et Vérification](#tests)

---

## 🎯 Prérequis

### Comptes à créer

- ✅ Compte **Railway** (https://railway.app)
- ✅ Compte **Supabase** (https://supabase.com)
- ✅ Compte **Vercel** (https://vercel.com) - pour le frontend

### Fichiers locaux requis

- ✅ Dossier `C:/keycloak-old/bin` avec Keycloak configuré
- ✅ Backend NestJS dans `velosi-back/`
- ✅ Frontend Angular dans `velosi-front/`

---

## 1️⃣ Configuration Supabase

### Étape 1.1 : Créer le projet Supabase

1. Connectez-vous à https://supabase.com
2. Cliquez sur "New Project"
3. Remplissez :
   - **Name**: `velosi-erp`
   - **Database Password**: Notez-le bien (ex: `87Eq8384`)
   - **Region**: `Europe (Frankfurt)` ou plus proche
4. Attendez la fin de la création (2-3 minutes)

### Étape 1.2 : Récupérer les informations de connexion

1. Allez dans **Settings** > **Database**
2. Notez les informations de **Connection Pooling** :
   ```
   Host: aws-0-eu-central-1.pooler.supabase.com
   Port: 6543 (Transaction mode) ou 5432 (Session mode)
   Database: postgres
   User: postgres.aswqsbrpkofmhgqjmyuw
   Password: [Votre mot de passe]
   ```

### Étape 1.3 : Importer la base de données

#### Option A : Via l'interface Supabase SQL Editor

1. Allez dans **SQL Editor**
2. Créez une nouvelle query
3. Copiez le contenu de `backup_velosi_supabase_final.sql`
4. Exécutez (RUN)

#### Option B : Via psql (recommandé pour gros fichiers)

```powershell
# Installer psql si nécessaire
# Depuis PowerShell

$env:PGPASSWORD="87Eq8384"
psql -h aws-0-eu-central-1.pooler.supabase.com `
     -p 6543 `
     -U postgres.aswqsbrpkofmhgqjmyuw `
     -d postgres `
     -f backup_velosi_supabase_final.sql
```

### Étape 1.4 : Vérifier l'import

```sql
-- Dans SQL Editor de Supabase
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Vous devriez voir toutes les tables : `personnel`, `client`, `crm_leads`, `crm_opportunities`, etc.

---

## 2️⃣ Déploiement Keycloak sur Railway

### Étape 2.1 : Préparer Keycloak

#### Créer un fichier standalone.xml pour production

1. Ouvrez `C:\keycloak-old\bin\standalone\configuration\standalone.xml`
2. Cherchez la section `<http-listener>`
3. Modifiez pour accepter les connexions externes :

```xml
<http-listener name="default" 
               socket-binding="http" 
               redirect-socket="https" 
               proxy-address-forwarding="true"/>
```

#### Exporter le realm ERP_Velosi

```powershell
cd C:\keycloak-old\bin

# Exporter le realm
.\kc.bat export --dir=./export --realm=ERP_Velosi
```

Cela créera `export/ERP_Velosi-realm.json`

### Étape 2.2 : Créer le projet Keycloak sur Railway

1. Connectez-vous à https://railway.app
2. Créez un nouveau projet : "**Velosi Keycloak**"
3. Cliquez sur "**New**" > "**Empty Service**"

#### Configuration via GitHub (Recommandé)

1. Créez un repo GitHub pour Keycloak :

```powershell
# Dans C:\keycloak-old
git init
git add .
git commit -m "Initial Keycloak setup"
gh repo create velosi-keycloak --private --source=. --push
```

2. Dans Railway, connectez le repo GitHub

#### Configuration directe (Alternative)

1. Créez un `Dockerfile` dans `C:\keycloak-old` :

```dockerfile
FROM quay.io/keycloak/keycloak:23.0.0

# Copier la configuration
COPY standalone/configuration /opt/keycloak/standalone/configuration

# Copier le realm exporté
COPY export/ERP_Velosi-realm.json /opt/keycloak/data/import/

# Variables d'environnement
ENV KEYCLOAK_ADMIN=admin
ENV KC_PROXY=edge
ENV KC_HOSTNAME_STRICT=false
ENV KC_HTTP_ENABLED=true

# Importer le realm au démarrage
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]
```

2. Déployez avec Railway CLI :

```powershell
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Lier au projet
railway link

# Déployer
railway up
```

### Étape 2.3 : Configurer les variables d'environnement Keycloak

Dans Railway, ajoutez les variables :

```env
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384
KC_PROXY=edge
KC_HOSTNAME_STRICT=false
KC_HTTP_ENABLED=true
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://[SUPABASE_HOST]:6543/postgres
KC_DB_USERNAME=postgres.aswqsbrpkofmhgqjmyuw
KC_DB_PASSWORD=87Eq8384
```

### Étape 2.4 : Récupérer l'URL Keycloak

Après déploiement, Railway génère une URL comme :
```
https://velosi-keycloak-production.up.railway.app
```

Notez cette URL pour la configuration du backend.

### Étape 2.5 : Configurer le realm

1. Accédez à l'URL Keycloak
2. Connectez-vous avec admin/87Eq8384
3. Sélectionnez le realm **ERP_Velosi**
4. Allez dans **Clients** > **velosi_auth** > **Settings**
5. Mettez à jour les **Valid Redirect URIs** :
   ```
   https://[VOTRE-BACKEND-URL]/*
   https://[VOTRE-FRONTEND-URL]/*
   http://localhost:3000/*
   http://localhost:4200/*
   ```
6. Mettez à jour les **Web Origins** :
   ```
   https://[VOTRE-BACKEND-URL]
   https://[VOTRE-FRONTEND-URL]
   http://localhost:3000
   http://localhost:4200
   ```

---

## 3️⃣ Déploiement Backend NestJS sur Railway

### Étape 3.1 : Préparer le backend

#### Mettre à jour .env.production

```env
# Base de données Supabase
DB_VENDOR=postgres
DB_ADDR=aws-0-eu-central-1.pooler.supabase.com
DB_PORT=6543
DB_DATABASE=postgres
DB_USER=postgres.aswqsbrpkofmhgqjmyuw
DB_PASSWORD=87Eq8384

# Configuration JWT
JWT_SECRET=velosi-secret-key-2025-ultra-secure-PRODUCTION
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# Configuration Keycloak
KEYCLOAK_URL=https://velosi-keycloak-production.up.railway.app
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF

# Configuration Keycloak Admin
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384

# Environment
NODE_ENV=production

# CORS
CORS_ORIGIN=https://[VOTRE-FRONTEND-URL]

# Logging
LOG_LEVEL=info

# SSL pour Supabase
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

### Étape 3.2 : Créer le projet Railway

1. Dans Railway, créez un nouveau projet : "**Velosi Backend**"
2. Cliquez sur "**New**" > "**GitHub Repo**"
3. Sélectionnez votre repo `velosi-back`

### Étape 3.3 : Configurer les variables d'environnement

Dans Railway, ajoutez toutes les variables de `.env.production` :

```
DB_VENDOR=postgres
DB_ADDR=aws-0-eu-central-1.pooler.supabase.com
DB_PORT=6543
DB_DATABASE=postgres
DB_USER=postgres.aswqsbrpkofmhgqjmyuw
DB_PASSWORD=87Eq8384
JWT_SECRET=velosi-secret-key-2025-ultra-secure-PRODUCTION
KEYCLOAK_URL=https://velosi-keycloak-production.up.railway.app
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF
NODE_ENV=production
PORT=${{PORT}}
CORS_ORIGIN=https://[VOTRE-FRONTEND-URL]
```

**Note** : Railway remplace automatiquement `${{PORT}}` par le port dynamique.

### Étape 3.4 : Déployer

Le déploiement se fait automatiquement à chaque push. Railway :

1. Détecte Node.js
2. Exécute `npm ci --legacy-peer-deps`
3. Exécute `npm run build`
4. Lance `node dist/main.js`

### Étape 3.5 : Récupérer l'URL Backend

Après déploiement, Railway génère une URL comme :
```
https://velosi-backend-production.up.railway.app
```

Notez cette URL pour la configuration du frontend.

---

## 4️⃣ Déploiement Frontend Angular sur Vercel

### Étape 4.1 : Préparer le frontend

#### Mettre à jour environment.prod.ts

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://velosi-backend-production.up.railway.app/api',
  keycloakUrl: 'https://velosi-keycloak-production.up.railway.app',
  keycloakRealm: 'ERP_Velosi',
  keycloakClientId: 'velosi_auth'
};
```

### Étape 4.2 : Configurer Vercel

1. Créez un fichier `vercel.json` dans `velosi-front/` :

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/velosi-front"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "buildCommand": "npm run build -- --configuration production"
}
```

2. Créez un fichier `package.json` script :

```json
{
  "scripts": {
    "vercel-build": "ng build --configuration production"
  }
}
```

### Étape 4.3 : Déployer sur Vercel

#### Via Vercel Dashboard

1. Connectez-vous à https://vercel.com
2. Cliquez sur "**Add New**" > "**Project**"
3. Importez votre repo GitHub `velosi-front`
4. Configuration :
   - **Framework Preset**: Angular
   - **Build Command**: `npm run build -- --configuration production`
   - **Output Directory**: `dist/velosi-front`
5. Ajoutez les variables d'environnement (si nécessaire)
6. Cliquez sur "**Deploy**"

#### Via Vercel CLI

```powershell
cd velosi-front

# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel --prod
```

### Étape 4.4 : Récupérer l'URL Frontend

Vercel génère une URL comme :
```
https://velosi-front.vercel.app
```

---

## 5️⃣ Configuration Finale

### Étape 5.1 : Mettre à jour Keycloak

1. Connectez-vous à Keycloak : `https://velosi-keycloak-production.up.railway.app`
2. Realm **ERP_Velosi** > **Clients** > **velosi_auth**
3. Mettez à jour les **Valid Redirect URIs** :
   ```
   https://velosi-backend-production.up.railway.app/*
   https://velosi-front.vercel.app/*
   ```
4. Mettez à jour les **Web Origins** :
   ```
   https://velosi-backend-production.up.railway.app
   https://velosi-front.vercel.app
   ```

### Étape 5.2 : Mettre à jour Backend CORS

Dans Railway, mettez à jour la variable :

```
CORS_ORIGIN=https://velosi-front.vercel.app
```

Redéployez le backend (ou attendez le redémarrage automatique).

### Étape 5.3 : Vérifier les connexions SSL

#### Test connexion Supabase

```powershell
# Depuis PowerShell local
$env:PGPASSWORD="87Eq8384"
psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 -U postgres.aswqsbrpkofmhgqjmyuw -d postgres -c "SELECT version();"
```

#### Test connexion Keycloak

```powershell
# Tester l'URL Keycloak
curl https://velosi-keycloak-production.up.railway.app/realms/ERP_Velosi/.well-known/openid-configuration
```

#### Test connexion Backend

```powershell
# Tester l'URL Backend
curl https://velosi-backend-production.up.railway.app/api
```

---

## 6️⃣ Tests et Vérification

### Test 1 : Connexion Frontend → Backend

1. Ouvrez `https://velosi-front.vercel.app`
2. Ouvrez la console (F12)
3. Vérifiez les requêtes :
   - ✅ Appels vers `https://velosi-backend-production.up.railway.app/api`
   - ✅ Pas d'erreurs CORS
   - ✅ Pas d'erreurs 401/403

### Test 2 : Authentification Keycloak

1. Cliquez sur "**Connexion**"
2. Vérifiez la redirection vers Keycloak
3. Connectez-vous avec un compte test
4. Vérifiez la redirection vers l'application
5. Vérifiez que le token JWT est présent dans localStorage

### Test 3 : Dashboard Administratif

1. Connectez-vous en tant qu'administratif
2. Ouvrez la console (F12)
3. Vérifiez les logs :
   ```
   📊 [loadAdministratifStats] Début chargement stats administratif
   ✅ Stats utilisateurs reçues
   ✅ Stats dashboard reçues
   ```
4. Vérifiez que les graphiques s'affichent correctement

### Test 4 : Performance Backend

```powershell
# Tester le temps de réponse
Measure-Command {
  curl https://velosi-backend-production.up.railway.app/api/dashboard/stats
}
```

Temps acceptable : < 2 secondes

---

## 📊 Récapitulatif des URL

Après déploiement complet :

| Service | URL Locale | URL Production |
|---------|-----------|----------------|
| **Frontend** | http://localhost:4200 | https://velosi-front.vercel.app |
| **Backend** | http://localhost:3000 | https://velosi-backend-production.up.railway.app |
| **Keycloak** | http://localhost:8080 | https://velosi-keycloak-production.up.railway.app |
| **Supabase** | localhost:5432 | aws-0-eu-central-1.pooler.supabase.com:6543 |

---

## 🔧 Commandes Utiles

### Logs Railway

```powershell
# Backend
railway logs --service velosi-backend

# Keycloak
railway logs --service velosi-keycloak
```

### Redéploiement

```powershell
# Backend
cd velosi-back
git push origin main  # Déclenche un redéploiement automatique

# Frontend
cd velosi-front
vercel --prod
```

### Rollback

```powershell
# Dans Railway Dashboard
# 1. Sélectionnez le service
# 2. Allez dans "Deployments"
# 3. Cliquez sur "Redeploy" sur un ancien déploiement
```

---

## 🚨 Dépannage

### Erreur : Cannot connect to database

**Cause** : Mauvaises credentials Supabase ou SSL mal configuré.

**Solution** :
1. Vérifiez les variables d'environnement Railway
2. Assurez-vous que `DB_SSL=true`
3. Testez la connexion depuis local

### Erreur : CORS policy blocked

**Cause** : CORS mal configuré.

**Solution** :
1. Vérifiez `CORS_ORIGIN` dans Railway
2. Redémarrez le backend
3. Videz le cache du navigateur (Ctrl+Shift+Delete)

### Erreur : Keycloak redirect_uri mismatch

**Cause** : URLs non configurées dans Keycloak.

**Solution** :
1. Connectez-vous à Keycloak admin
2. Mettez à jour les Redirect URIs
3. Mettez à jour les Web Origins

---

## 📝 Checklist Finale

Avant de marquer le déploiement comme terminé :

- [ ] ✅ Supabase : Base de données importée
- [ ] ✅ Keycloak : Déployé et accessible
- [ ] ✅ Keycloak : Realm configuré avec bonnes URLs
- [ ] ✅ Backend : Déployé sur Railway
- [ ] ✅ Backend : Variables d'environnement configurées
- [ ] ✅ Backend : Logs sans erreurs
- [ ] ✅ Frontend : Déployé sur Vercel
- [ ] ✅ Frontend : environment.prod.ts à jour
- [ ] ✅ Tests : Authentification fonctionne
- [ ] ✅ Tests : Dashboard s'affiche correctement
- [ ] ✅ Tests : Pas d'erreurs CORS
- [ ] ✅ Tests : Performance acceptable (< 2s)

---

## 🎉 Félicitations !

Votre ERP Velosi est maintenant déployé en production ! 🚀

**URLs importantes** :
- 🌐 Application : https://velosi-front.vercel.app
- 🔐 Keycloak Admin : https://velosi-keycloak-production.up.railway.app
- 📊 Supabase Dashboard : https://supabase.com/dashboard

Date de déploiement : 4 novembre 2025
