# 🚀 GUIDE DE DÉPLOIEMENT COMPLET - VELOSI ERP
## Avec configuration LOCALE + HÉBERGEMENT

---

## 📋 ORDRE DE DÉPLOIEMENT

1. ✅ **PostgreSQL** → Supabase (DÉJÀ FAIT ✓)
2. 🔵 **BACKEND NestJS** → Render (À FAIRE)
3. 🟢 **FRONTEND Angular** → Vercel (À FAIRE APRÈS LE BACKEND)

**⚠️ IMPORTANT** : On déploie le backend AVANT le frontend car le frontend a besoin de l'URL du backend !

---

## 🎯 ÉTAPE 1 : PRÉPARER LE BACKEND (NestJS)

### 1.1 Créer le fichier .env.production dans velosi-back

```env
# Base de données Supabase (PRODUCTION)
DB_ADDR=aws-1-eu-north-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.aswqsbrpkofmhgqjmyuw
DB_PASSWORD=87Eq8384
DB_DATABASE=postgres

# Configuration NestJS
NODE_ENV=production
PORT=3000

# JWT (gardez le même pour éviter les problèmes)
JWT_SECRET=votre_secret_jwt_tres_securise_ici

# Keycloak (on mettra l'URL Render après déploiement)
KEYCLOAK_URL=https://velosi-keycloak.onrender.com
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF

# Email (optionnel pour les notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre_email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_app
```

### 1.2 Créer le fichier .env.local (pour garder votre config locale)

```env
# Base de données LOCALE
DB_ADDR=localhost
DB_PORT=5432
DB_USER=msp
DB_PASSWORD=87Eq8384
DB_DATABASE=velosi

# Configuration NestJS
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=votre_secret_jwt_tres_securise_ici

# Keycloak LOCAL
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF
```

### 1.3 Modifier main.ts pour accepter VERCEL et LOCAL

**Fichier : src/main.ts**

Remplacer la configuration CORS :

```typescript
// Configuration CORS pour permettre les requêtes depuis le frontend
app.enableCors({
  origin: [
    'http://localhost:4200',  // LOCAL Angular
    'http://localhost:3000',  // LOCAL test
    'https://velosi-front.vercel.app',  // PRODUCTION Vercel
    'https://*.vercel.app'  // Tous les domaines Vercel (previews)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'x-user-id',
  ],
});
```

### 1.4 Créer le fichier de déploiement Render

**Fichier : render.yaml** (à la racine de velosi-back)

```yaml
services:
  - type: web
    name: velosi-backend
    env: node
    region: frankfurt # Plus proche de l'Europe
    plan: free # Plan gratuit pour le test
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: DB_ADDR
        value: aws-1-eu-north-1.pooler.supabase.com
      - key: DB_PORT
        value: 5432
      - key: DB_USER
        value: postgres.aswqsbrpkofmhgqjmyuw
      - key: DB_PASSWORD
        sync: false # On mettra le mot de passe manuellement
      - key: DB_DATABASE
        value: postgres
      - key: PORT
        value: 3000
      - key: JWT_SECRET
        sync: false # Secret à définir manuellement
      - key: KEYCLOAK_URL
        value: https://velosi-keycloak.onrender.com
      - key: KEYCLOAK_REALM
        value: ERP_Velosi
      - key: KEYCLOAK_CLIENT_ID
        value: velosi_auth
      - key: KEYCLOAK_CLIENT_SECRET
        sync: false # Secret à définir manuellement
```

### 1.5 Script pour basculer entre LOCAL et PRODUCTION

**Fichier : switch-env.ps1** (à la racine de velosi-back)

```powershell
# Script pour basculer entre environnement LOCAL et PRODUCTION

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("local", "prod")]
    [string]$Environment
)

$sourceFile = ""
$targetFile = ".env"

if ($Environment -eq "local") {
    $sourceFile = ".env.local"
    Write-Host "🏠 Basculement vers l'environnement LOCAL" -ForegroundColor Green
} else {
    $sourceFile = ".env.production"
    Write-Host "🚀 Basculement vers l'environnement PRODUCTION" -ForegroundColor Cyan
}

if (Test-Path $sourceFile) {
    Copy-Item -Path $sourceFile -Destination $targetFile -Force
    Write-Host "✅ Fichier .env mis à jour depuis $sourceFile" -ForegroundColor Green
    
    # Afficher les variables importantes
    Write-Host "`n📋 Configuration active :" -ForegroundColor Yellow
    Get-Content $targetFile | Select-String "DB_ADDR", "NODE_ENV", "KEYCLOAK_URL"
} else {
    Write-Host "❌ Erreur : Le fichier $sourceFile n'existe pas !" -ForegroundColor Red
    exit 1
}
```

**Usage :**
```powershell
# Pour travailler en LOCAL
.\switch-env.ps1 -Environment local

# Pour déployer en PRODUCTION (test avec Supabase)
.\switch-env.ps1 -Environment prod
```

---

## 🎯 ÉTAPE 2 : DÉPLOYER LE BACKEND SUR RENDER

### 2.1 Préparer le repository GitHub

```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"

# Initialiser Git si pas encore fait
git init
git add .
git commit -m "Préparation pour déploiement Render"

# Créer un repo sur GitHub : velosi-back
# Puis pousser le code
git remote add origin https://github.com/Mahdi945/velosi-back.git
git branch -M main
git push -u origin main
```

### 2.2 Créer le service sur Render

1. Aller sur **https://render.com** et se connecter avec GitHub
2. Cliquer sur **"New +"** → **"Web Service"**
3. Sélectionner le repository **velosi-back**
4. Configuration :
   - **Name** : `velosi-backend`
   - **Region** : `Frankfurt (EU Central)` (plus proche)
   - **Branch** : `main`
   - **Runtime** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm run start:prod`
   - **Instance Type** : `Free`

5. **Variables d'environnement** (très important !) :
   - `NODE_ENV` = `production`
   - `DB_ADDR` = `aws-1-eu-north-1.pooler.supabase.com`
   - `DB_PORT` = `5432`
   - `DB_USER` = `postgres.aswqsbrpkofmhgqjmyuw`
   - `DB_PASSWORD` = `87Eq8384`
   - `DB_DATABASE` = `postgres`
   - `PORT` = `3000`
   - `JWT_SECRET` = `votre_secret_jwt_tres_securise_ici`
   - `KEYCLOAK_URL` = `http://localhost:8080` (on changera plus tard)
   - `KEYCLOAK_REALM` = `ERP_Velosi`
   - `KEYCLOAK_CLIENT_ID` = `velosi_auth`
   - `KEYCLOAK_CLIENT_SECRET` = `SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF`

6. Cliquer sur **"Create Web Service"**

7. Attendre le déploiement (5-10 minutes)

8. **Noter l'URL du backend** : `https://velosi-backend.onrender.com`

### 2.3 Tester le backend déployé

```powershell
# Test de santé
curl https://velosi-backend.onrender.com/api

# Test des clients
curl https://velosi-backend.onrender.com/api/clients
```

---

## 🎯 ÉTAPE 3 : DÉPLOYER LE FRONTEND SUR VERCEL

### 3.1 Mettre à jour environment.prod.ts

**Fichier : src/environments/environment.prod.ts**

```typescript
export const environment = {
  production: true,
  maintenance: false,
  apiUrl: 'https://velosi-backend.onrender.com/api', // URL Render du backend
  keycloak: {
    url: 'http://localhost:8080', // On garde local pour l'instant
    realm: 'ERP_Velosi',
    clientId: 'velosi_auth',
    clientSecret: 'SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF'
  }
};
```

### 3.2 Créer le fichier vercel.json

**Fichier : vercel.json** (à la racine de velosi-front)

```json
{
  "version": 2,
  "name": "velosi-front",
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist/velosi-front/browser",
  "routes": [
    {
      "src": "/(.*\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json))",
      "dest": "/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3.3 Tester le build en local

```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-front"

# Build de production
npm run build

# Vérifier que le dossier dist est créé
ls dist/velosi-front
```

### 3.4 Déployer sur Vercel

```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-front"

# Pousser les modifications sur GitHub
git add .
git commit -m "Configuration pour déploiement Vercel"
git push origin main
```

1. Aller sur **https://vercel.com** et se connecter avec GitHub
2. Cliquer sur **"Add New..."** → **"Project"**
3. Sélectionner **velosi-front**
4. Configuration :
   - **Framework Preset** : `Angular`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist/velosi-front/browser`
   - **Install Command** : `npm install`

5. **Variables d'environnement** (optionnel car déjà dans environment.prod.ts) :
   Laisser vide pour l'instant

6. Cliquer sur **"Deploy"**

7. Attendre le déploiement (3-5 minutes)

8. **Noter l'URL du frontend** : `https://velosi-front.vercel.app`

### 3.5 Mettre à jour CORS du backend

Retourner sur Render → velosi-backend → Settings → Environment Variables

Modifier `FRONTEND_URL` (si existe) ou main.ts a déjà l'URL Vercel

---

## 🎯 ÉTAPE 4 : BASCULER ENTRE LOCAL ET PRODUCTION

### Pour le BACKEND

```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"

# Travailler en LOCAL (avec PostgreSQL local + Keycloak local)
.\switch-env.ps1 -Environment local
npm run start:dev

# Tester avec Supabase (avant de pousser sur Render)
.\switch-env.ps1 -Environment prod
npm run start:dev
```

### Pour le FRONTEND

**Option 1 : Modifier environment.ts temporairement**
```typescript
// Pour tester avec le backend Render en local
apiUrl: 'https://velosi-backend.onrender.com/api'
```

**Option 2 : Utiliser Angular CLI**
```powershell
# Build local
ng serve

# Build production (avec environment.prod.ts)
ng build --configuration production
```

---

## 📊 RÉSUMÉ DES URLs

### PRODUCTION (Hébergement)
- **Frontend** : `https://velosi-front.vercel.app`
- **Backend** : `https://velosi-backend.onrender.com/api`
- **Database** : `aws-1-eu-north-1.pooler.supabase.com:5432`
- **Keycloak** : `http://localhost:8080` (pour l'instant)

### LOCAL (Développement)
- **Frontend** : `http://localhost:4200`
- **Backend** : `http://localhost:3000/api`
- **Database** : `localhost:5432` (PostgreSQL local)
- **Keycloak** : `http://localhost:8080`

---

## ⚠️ NOTES IMPORTANTES

1. **Base de données** : 
   - Supabase contient TOUTES vos données (4480 aéroports, 3958 ports, etc.)
   - Vous pouvez continuer à utiliser PostgreSQL local pour le développement

2. **Keycloak** :
   - Pour l'instant reste en LOCAL (localhost:8080)
   - On peut le déployer plus tard si nécessaire

3. **Fichiers uploadés** :
   - Les fichiers (logos, documents) ne sont PAS hébergés
   - Solution : utiliser Supabase Storage ou Cloudinary

4. **Plan gratuit Render** :
   - Le backend s'endort après 15 min d'inactivité
   - Première requête après sommeil : ~30 secondes
   - Pour éviter : upgrade vers plan payant ($7/mois)

5. **Tests** :
   - Testez TOUJOURS en local avant de déployer
   - Utilisez `switch-env.ps1` pour basculer facilement

---

## 🔄 WORKFLOW DE DÉVELOPPEMENT

```powershell
# 1. Développer en LOCAL
cd velosi-back
.\switch-env.ps1 -Environment local
npm run start:dev

# 2. Tester avec Supabase (simulation production)
.\switch-env.ps1 -Environment prod
npm run start:dev

# 3. Si OK, pousser sur GitHub
git add .
git commit -m "Nouvelle fonctionnalité"
git push origin main

# 4. Render redéploie automatiquement !
# 5. Vercel redéploie automatiquement !
```

---

## 🆘 DÉPANNAGE

### Backend ne démarre pas sur Render
- Vérifier les logs : Render Dashboard → Logs
- Vérifier les variables d'environnement
- Vérifier la connexion à Supabase

### Frontend ne se connecte pas au backend
- Vérifier environment.prod.ts
- Vérifier CORS dans main.ts
- Vérifier l'URL du backend (https, pas http)

### Base de données vide
- Vérifier les variables DB_* sur Render
- Tester la connexion avec psql

---

## 📝 PROCHAINES ÉTAPES (Optionnel)

1. ✅ Déployer Keycloak sur Render (Dockerfile)
2. ✅ Configurer Supabase Storage pour les fichiers
3. ✅ Activer HTTPS sur toutes les URLs
4. ✅ Configurer un nom de domaine personnalisé
5. ✅ Monitorer les performances (Sentry, LogRocket)
