# 🚀 Déploiement Backend sur Railway (SIMPLE)

## 📋 Prérequis

- ✅ Keycloak tourne **en local** sur `http://localhost:8080`
- ✅ Base de données Supabase configurée
- ✅ Code poussé sur GitHub

## 🎯 Étapes de déploiement

### 1️⃣ Créer un nouveau projet Railway

1. Allez sur [railway.app](https://railway.app)
2. Cliquez sur **"New Project"**
3. Choisissez **"Deploy from GitHub repo"**
4. Sélectionnez **`velosi-back`**
5. Railway va automatiquement détecter votre projet NestJS

### 2️⃣ Configurer les variables d'environnement

Allez dans **Settings → Variables** et ajoutez :

#### 🗄️ Base de données
```
DB_VENDOR=postgres
DB_ADDR=aws-1-eu-north-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.aswqsbrpkofmhgqjmyuw
DB_PASSWORD=87Eq8384
DB_DATABASE=postgres
```

#### 🔐 JWT
```
JWT_SECRET=velosi-secret-key-2025-ultra-secure
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d
```

#### 🔑 Keycloak Local (TEMPORAIRE - voir section ngrok)
```
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384
```

#### 🌐 Environnement
```
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://localhost:4200
ALLOWED_ORIGINS=http://localhost:4200,https://votre-frontend.vercel.app
```

### 3️⃣ Exposer Keycloak local avec ngrok

⚠️ **IMPORTANT** : Railway ne peut pas accéder à `localhost:8080` !

Vous devez exposer votre Keycloak local sur Internet avec **ngrok** :

1. **Installer ngrok** :
   ```powershell
   # Télécharger depuis https://ngrok.com/download
   # Ou avec winget :
   winget install ngrok
   ```

2. **Démarrer Keycloak en local** :
   ```powershell
   cd C:\keycloak-old\bin
   $env:KEYCLOAK_ADMIN="admin"
   $env:KEYCLOAK_ADMIN_PASSWORD="87Eq8384"
   .\kc.bat start-dev
   ```

3. **Exposer Keycloak avec ngrok** (dans un nouveau terminal) :
   ```powershell
   ngrok http 8080
   ```

4. **Copier l'URL ngrok** (ex: `https://abc123.ngrok.io`)

5. **Mettre à jour les variables Railway** :
   ```
   KEYCLOAK_URL=https://abc123.ngrok.io
   KEYCLOAK_SERVER_URL=https://abc123.ngrok.io
   KEYCLOAK_AUTH_SERVER_URL=https://abc123.ngrok.io
   ```

### 4️⃣ Déployer

1. Railway va automatiquement **build et déployer**
2. Attendez 3-5 minutes
3. Récupérez l'URL de votre backend : `https://votre-backend.up.railway.app`

### 5️⃣ Vérifier le déploiement

Testez l'API :
```powershell
curl https://votre-backend.up.railway.app/api
```

## ⚠️ Limitations avec Keycloak local

### Problèmes potentiels :
- ❌ **ngrok gratuit** : URL change à chaque redémarrage
- ❌ **Connexion requise** : Votre PC doit rester allumé
- ❌ **Performance** : Latence entre Railway et votre PC

### Solutions :
1. **Ngrok Pro** : URL fixe ($8/mois)
2. **VPS pas cher** : Héberger Keycloak sur un VPS (~$5/mois)
3. **Keycloak Cloud** : Utiliser un service managed
4. **Railway Keycloak** : Revenir au déploiement Keycloak sur Railway (recommandé)

## 🎯 Alternative recommandée : Keycloak sur Railway

Si vous changez d'avis, on peut :
1. Déployer Keycloak sur Railway (projet séparé)
2. Le backend pointera vers l'URL Railway de Keycloak
3. Tout sera stable et accessible 24/7

## 📝 Commandes utiles

### Voir les logs Railway
```bash
# Dans Railway Dashboard → Deployments → View Logs
```

### Tester en local avant Railway
```powershell
cd C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back
npm run build
npm run start:prod
```

### Mettre à jour le déploiement
```powershell
git add .
git commit -m "update: Configuration backend"
git push origin main
# Railway redéploie automatiquement
```

## 🆘 Support

En cas de problème :
1. Vérifiez les logs dans Railway Dashboard
2. Testez la connexion Supabase
3. Vérifiez que ngrok est actif
4. Testez Keycloak en local : `http://localhost:8080/admin`
