# 🚀 Déploiement Backend sur Railway (SANS Keycloak)

## 📋 Prérequis

- ✅ Base de données Supabase configurée
- ✅ Code poussé sur GitHub

## ⚠️ Note importante

Pour simplifier, on déploie le backend **SANS Keycloak** pour l'instant.
Le backend utilisera l'authentification JWT locale (email/password).
Keycloak sera ajouté plus tard si nécessaire.

## 🎯 Étapes de déploiement

### 1️⃣ Créer un nouveau projet Railway

1. Allez sur [railway.app](https://railway.app)
2. Connectez-vous avec GitHub
3. Cliquez sur **"New Project"**
4. Choisissez **"Deploy from GitHub repo"**
5. Sélectionnez **`velosi-back`**
6. Railway va automatiquement détecter votre projet NestJS

### 2️⃣ Configurer les variables d'environnement

Allez dans **Settings → Variables** et ajoutez **SEULEMENT** ces variables :

#### 🗄️ Base de données
```
DB_VENDOR=postgres
DB_ADDR=aws-1-eu-north-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.aswqsbrpkofmhgqjmyuw
DB_PASSWORD=87Eq8384
DB_DATABASE=postgres
```

#### 🔐 JWT (Authentification locale)
```
JWT_SECRET=velosi-secret-key-2025-ultra-secure
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d
```

#### 🌐 Environnement
```
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://localhost:4200
ALLOWED_ORIGINS=http://localhost:4200,https://votre-frontend.vercel.app
```

⚠️ **NE PAS ajouter les variables Keycloak** (on les ajoutera plus tard si besoin)

### 3️⃣ Déployer

### 3️⃣ Déployer

1. Railway va automatiquement **build et déployer**
2. Attendez 3-5 minutes
3. Récupérez l'URL de votre backend : `https://votre-backend.up.railway.app`

### 4️⃣ Vérifier le déploiement

Testez l'API :
```powershell
curl https://votre-backend.up.railway.app/api
```

Ou ouvrez dans le navigateur : `https://votre-backend.up.railway.app/api`

### 5️⃣ Tester l'authentification

Le backend utilisera l'authentification locale (JWT). Pour tester :

```powershell
# S'inscrire (créer un utilisateur)
curl -X POST https://votre-backend.up.railway.app/auth/register -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"Test123!\"}"

# Se connecter
curl -X POST https://votre-backend.up.railway.app/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"Test123!\"}"
```

## 📊 Récapitulatif

✅ **Backend déployé sur Railway**
✅ **Base de données Supabase connectée**
✅ **Authentification JWT locale active**
❌ **Keycloak désactivé** (on peut l'ajouter plus tard)

## 🔄 Pour ajouter Keycloak plus tard

Si vous voulez utiliser Keycloak plus tard, vous avez 3 options :

### Option 1 : Keycloak sur Railway (recommandé)
- Déployer Keycloak sur Railway (projet séparé)
- Stable, accessible 24/7
- Coût : ~$5-10/mois

### Option 2 : Keycloak Cloud
- Utiliser un service managed (ex: Keycloak.ch, Red Hat SSO)
- Zéro maintenance
- Coût : ~$10-50/mois

### Option 3 : VPS externe
- Louer un petit VPS (ex: DigitalOcean, Hetzner)
- Installer Keycloak dessus
- Coût : ~$5/mois

## ⚠️ Limitations actuelles

Sans Keycloak :
- ❌ Pas de Single Sign-On (SSO)
- ❌ Pas de gestion centralisée des utilisateurs
- ✅ Authentification email/password fonctionne
- ✅ JWT et sessions fonctionnent
- ✅ Tous les endpoints CRUD fonctionnent

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
