# 🎯 GUIDE RAPIDE : Passer de Local à Production

Ce guide explique comment le backend peut fonctionner **à la fois** en local ET en production.

---

## ✅ CE QUI A ÉTÉ FAIT

Le backend est maintenant configuré pour supporter **deux modes** :

### 🏠 MODE LOCAL (Développement)
- Keycloak : `http://localhost:8080`
- Database : PostgreSQL local
- Frontend : `http://localhost:4200`
- Fichier : `.env`

### ☁️ MODE PRODUCTION (Railway + Vercel)
- Keycloak : `https://keycloak-xxx.up.railway.app`
- Database : Supabase
- Frontend : `https://votre-app.vercel.app`
- Fichier : `.env.production`

---

## 🔧 COMMENT BASCULER

### 1️⃣ Développement Local

```powershell
# Méthode 1 : Script automatique (RECOMMANDÉ)
.\start-local.ps1

# Méthode 2 : Manuel
$env:NODE_ENV="development"
npm run start:dev
```

**✅ Utilise automatiquement `.env` avec localhost**

---

### 2️⃣ Tester Production Localement

```powershell
# Méthode 1 : Script automatique (RECOMMANDÉ)
.\test-production.ps1

# Méthode 2 : Manuel
$env:NODE_ENV="production"
npm run build
npm run start:prod
```

**✅ Utilise automatiquement `.env.production` avec Railway/Vercel**

---

### 3️⃣ Vérifier la Configuration Active

```powershell
.\check-config.ps1
```

**Affiche :**
- Quel fichier `.env` est utilisé
- Les URLs Keycloak, Database, Frontend
- Les tests de connectivité

---

## 📋 CHECKLIST DE CONFIGURATION

### Pour le Développement Local

1. **Créer `.env`** avec localhost :
```bash
# Copiez .env.example vers .env
# Configurez avec localhost
KEYCLOAK_URL=http://localhost:8080
DB_ADDR=localhost
FRONTEND_URL=http://localhost:4200
NODE_ENV=development
```

2. **Lancer Keycloak local** :
```powershell
# Option 1 : ZIP
cd C:\keycloak-old\bin
.\kc.bat start-dev

# Option 2 : Docker
.\test-keycloak-local.ps1
```

3. **Démarrer le backend** :
```powershell
.\start-local.ps1
```

**✅ Tout fonctionne en localhost !**

---

### Pour la Production (Railway + Vercel)

1. **Créer `.env.production`** avec Railway/Vercel :
```bash
# Utilisez le script automatique
.\configure-backend-railway.ps1 `
    -KeycloakUrl "https://keycloak-xxx.up.railway.app" `
    -ClientSecret "votre-secret" `
    -FrontendUrl "https://votre-app.vercel.app"

# Ou copiez manuellement .env.production.keycloak.template
```

2. **Tester localement avec config production** :
```powershell
.\test-production.ps1
```

3. **Déployer sur Railway** :
```powershell
# Railway utilise automatiquement .env.production
git add .
git commit -m "Deploy to production"
git push
```

**✅ Backend déployé sur Railway !**

---

## 🔍 COMMENT ÇA MARCHE

### Chargement Automatique du Fichier

Le backend détecte automatiquement quel fichier utiliser :

```typescript
// src/app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  // Si NODE_ENV=production → charge .env.production
  // Sinon → charge .env
  envFilePath: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env',
})
```

### Logs au Démarrage

Au démarrage, le backend affiche :

```
========================================
🚀 Démarrage de l'application Velosi ERP
========================================

📋 Configuration :
  - Mode          : 🏠 DÉVELOPPEMENT
  - NODE_ENV      : development
  - Fichier .env  : .env

🔐 Keycloak :
  - URL           : http://localhost:8080
  - Realm         : ERP_Velosi
  - Client ID     : velosi_auth

🗄️ Base de données :
  - Host          : localhost
  - Port          : 5432
  - Database      : velosi

🌐 Frontend :
  - URL           : http://localhost:4200
```

**Vous voyez immédiatement quelle configuration est active ! ✅**

---

## 🎯 SCÉNARIOS D'UTILISATION

### Scénario 1 : Développer Normalement

```powershell
# 1. Lancer Keycloak local
cd C:\keycloak-old\bin ; .\kc.bat start-dev

# 2. Lancer backend local
cd C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back
.\start-local.ps1

# 3. Lancer frontend local
cd ..\velosi-front
npm start

# ✅ Tout en localhost
```

---

### Scénario 2 : Montrer à l'Encadrant (Production)

```powershell
# 1. Déployer Keycloak sur Railway (une fois)
# Suivre : DEPLOIEMENT_KEYCLOAK_RAILWAY_MANUEL.md

# 2. Configurer .env.production
.\configure-backend-railway.ps1 -KeycloakUrl "..." -ClientSecret "..."

# 3. Déployer le backend
git add .
git commit -m "Deploy backend to Railway"
git push

# 4. Déployer le frontend
cd ..\velosi-front
git push # Vercel déploie automatiquement

# ✅ Encadrant accède via :
# https://votre-app.vercel.app
```

---

### Scénario 3 : Continuer à Développer (après déploiement)

```powershell
# Le déploiement production n'affecte PAS le développement local

# Développer en local comme avant
.\start-local.ps1

# ✅ Utilise automatiquement .env (localhost)
# ✅ La production continue de fonctionner sur Railway
```

---

## 🔒 SÉCURITÉ

### Fichiers à NE JAMAIS COMMITTER

```gitignore
# ❌ NE JAMAIS COMMITTER
.env
.env.production
.env.local
.env.*.local

# ✅ OK de committer
.env.example
.env.production.keycloak.template
```

### Variables sur Railway

**Option 1 (Recommandée)** : Variables d'environnement Railway

Au lieu de committer `.env.production`, configurez les variables directement dans Railway :

```
Railway Dashboard → velosi-back → Variables
```

**Option 2** : Utiliser `.env.production` (mais ne pas le committer)

---

## 📊 TABLEAU COMPARATIF

| Action | Local | Production |
|--------|-------|------------|
| **Démarrer** | `.\start-local.ps1` | Push → Railway auto-déploie |
| **Keycloak** | localhost:8080 | Railway URL |
| **Database** | PostgreSQL local | Supabase |
| **Frontend** | localhost:4200 | Vercel URL |
| **Fichier .env** | `.env` | `.env.production` ou Variables Railway |
| **Modifier** | Direct | Commit + Push |

---

## 🆘 PROBLÈMES COURANTS

### ❌ Backend utilise mauvaise config

**Symptôme** : Backend en local essaie de se connecter à Keycloak Railway

**Solution** :
```powershell
# Vérifier la config
.\check-config.ps1

# Forcer mode local
$env:NODE_ENV="development"
.\start-local.ps1
```

---

### ❌ Variables non chargées

**Symptôme** : `process.env.KEYCLOAK_URL` est `undefined`

**Solution** :
1. Vérifier que `.env` existe
2. Redémarrer le backend
3. Vérifier les logs au démarrage

---

### ❌ CORS Error en production

**Symptôme** : Frontend Vercel ne peut pas appeler backend Railway

**Solution** :
1. Ajouter l'URL Vercel dans `ALLOWED_ORIGINS` :
```bash
# .env.production
ALLOWED_ORIGINS=https://votre-app.vercel.app,http://localhost:4200
```

2. Redéployer le backend

---

## ✅ RÉSUMÉ

### Pour Vous (Développeur)

```powershell
# Développement quotidien
.\start-local.ps1

# ✅ Travaillez normalement en localhost
```

### Pour Votre Encadrant

```
Frontend : https://votre-app.vercel.app
Backend  : https://velosi-back-xxx.up.railway.app
Keycloak : https://keycloak-xxx.up.railway.app

✅ Tout fonctionne en ligne sans localhost
```

### Le Meilleur des Deux Mondes

- ✅ **Vous développez en local** (rapide, pas de coûts)
- ✅ **Encadrant voit en production** (accessible de partout)
- ✅ **Basculement automatique** (selon NODE_ENV)
- ✅ **Pas d'interférence** (deux environnements séparés)

---

## 📝 COMMANDES RAPIDES

```powershell
# Développer en local
.\start-local.ps1

# Tester production localement
.\test-production.ps1

# Vérifier quelle config est active
.\check-config.ps1

# Configurer .env.production
.\configure-backend-railway.ps1 -KeycloakUrl "..." -ClientSecret "..."

# Déployer sur Railway
git push
```

---

**🎉 Maintenant vous pouvez travailler en local ET montrer la production à votre encadrant ! 🎉**
