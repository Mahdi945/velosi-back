# 🔄 GUIDE COMPLET : Développement Local + Production

Ce guide explique comment basculer facilement entre :
- 🏠 **Développement local** (localhost)
- ☁️ **Production** (Railway + Vercel + Keycloak Railway)

---

## 🎯 STRATÉGIE : Deux Environnements Séparés

```
📁 velosi-back/
├── .env                    ← 🏠 LOCAL (localhost, jamais commité)
├── .env.production         ← ☁️ PRODUCTION (Railway/Vercel, jamais commité)
└── .env.example            ← 📝 Template pour l'équipe
```

**Principe** : NestJS charge automatiquement le bon fichier selon `NODE_ENV`

---

## 📋 CONFIGURATION DES FICHIERS

### 1️⃣ `.env` - Développement Local (LOCALHOST)

```bash
# ============================================
# DÉVELOPPEMENT LOCAL
# ============================================

# Base de données LOCALE
DB_VENDOR=postgres
DB_ADDR=localhost
DB_PORT=5432
DB_DATABASE=velosi
DB_USER=msp
DB_PASSWORD=87Eq8384

# JWT
JWT_SECRET=velosi-secret-key-2025-ultra-secure
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# Keycloak LOCAL (C:/keycloak-old ou Docker)
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=0SW8TshHXXdLEjpsBVCnQ4HvcSBbc2mN

# Keycloak Admin
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_CLIENT_SECRET=
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384

# Environment
NODE_ENV=development

# Frontend LOCAL
FRONTEND_URL=http://localhost:4200
ALLOWED_ORIGINS=http://localhost:4200

# Port Backend
PORT=3000
```

---

### 2️⃣ `.env.production` - Production (RAILWAY + VERCEL)

```bash
# ============================================
# PRODUCTION (Railway + Vercel)
# ============================================

# Base de données SUPABASE (Production)
DB_VENDOR=postgres
DB_ADDR=aws-0-eu-central-1.pooler.supabase.com
DB_PORT=6543
DB_DATABASE=postgres
DB_USER=postgres.xxxxxxxxxxxxxxx
DB_PASSWORD=VOTRE_PASSWORD_SUPABASE

# JWT (MÊME SECRET QUE LOCAL pour compatibilité)
JWT_SECRET=velosi-secret-key-2025-ultra-secure
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# Keycloak PRODUCTION (Railway)
KEYCLOAK_URL=https://keycloak-production-xxxx.up.railway.app
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=VOTRE_CLIENT_SECRET_RAILWAY

# Keycloak Admin
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_CLIENT_SECRET=VOTRE_ADMIN_SECRET_RAILWAY
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384

# Environment
NODE_ENV=production

# Frontend PRODUCTION (Vercel)
FRONTEND_URL=https://votre-app.vercel.app
ALLOWED_ORIGINS=https://votre-app.vercel.app,http://localhost:4200

# Port Backend (Railway l'attribue automatiquement)
PORT=${PORT:-3000}
```

---

## 🔧 COMMANDES POUR BASCULER

### 🏠 Développer en LOCAL

```powershell
# 1. S'assurer que .env existe
# 2. Lancer le backend en mode développement
npm run start:dev

# Ou en mode watch
npm run start

# ✅ Utilise automatiquement .env
# ✅ Keycloak : http://localhost:8080
# ✅ Backend : http://localhost:3000
# ✅ Frontend : http://localhost:4200
```

---

### ☁️ Tester la PRODUCTION localement

```powershell
# 1. S'assurer que .env.production existe et est configuré
# 2. Lancer en mode production local
$env:NODE_ENV="production"
npm run start:prod

# ✅ Utilise automatiquement .env.production
# ✅ Keycloak : https://keycloak-xxx.up.railway.app
# ✅ Backend : http://localhost:3000 (mais avec config prod)
# ✅ Frontend : Tester avec l'URL Vercel
```

---

### 🚀 Déployer en PRODUCTION (Railway)

```powershell
# Railway utilise automatiquement .env.production
# Ou mieux : configurer les variables directement dans Railway

git add .
git commit -m "Deploy to production"
git push

# ✅ Railway détecte NODE_ENV=production
# ✅ Utilise les variables d'environnement Railway
# ✅ Backend : https://velosi-back-xxx.up.railway.app
# ✅ Frontend : https://votre-app.vercel.app
```

---

## 🔄 SCRIPTS AUTOMATISÉS

Je vais créer des scripts pour faciliter le basculement.

### Script 1 : `start-local.ps1`
```powershell
# Lancer en mode LOCAL
$env:NODE_ENV="development"
Write-Host "🏠 Démarrage en mode LOCAL (localhost)" -ForegroundColor Green
Write-Host "   Keycloak : http://localhost:8080" -ForegroundColor Cyan
Write-Host "   Backend  : http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Frontend : http://localhost:4200" -ForegroundColor Cyan
Write-Host ""
npm run start:dev
```

### Script 2 : `test-production.ps1`
```powershell
# Tester en mode PRODUCTION localement
$env:NODE_ENV="production"
Write-Host "☁️ Test mode PRODUCTION localement" -ForegroundColor Yellow
Write-Host "   Keycloak : Railway" -ForegroundColor Cyan
Write-Host "   Backend  : http://localhost:3000 (config prod)" -ForegroundColor Cyan
Write-Host "   Frontend : Vercel" -ForegroundColor Cyan
Write-Host ""
npm run start:prod
```

---

## 🎯 WORKFLOW COMPLET

### 📅 Développement Quotidien (LOCAL)

```powershell
# 1. Travailler en local
npm run start:dev

# 2. Keycloak local
# Soit C:/keycloak-old/bin/kc.bat start-dev
# Soit Docker : docker-compose -f docker-compose.keycloak.yml up

# 3. Frontend local
cd ../velosi-front
npm start

# ✅ Tout fonctionne en localhost
# ✅ Base de données locale
# ✅ Keycloak local
```

---

### 🧪 Tester la Production (LOCAL + RAILWAY)

```powershell
# 1. Tester avec les services Railway
$env:NODE_ENV="production"
npm run start:prod

# 2. Tester avec frontend Vercel
# Ouvrir : https://votre-app.vercel.app

# ✅ Backend local utilise Keycloak Railway
# ✅ Base de données Supabase
# ✅ Frontend Vercel se connecte au backend local
```

---

### 🚀 Déployer en Production

```powershell
# 1. S'assurer que tout fonctionne en local
npm run start:dev

# 2. Tester en mode production localement
$env:NODE_ENV="production"
npm run start:prod

# 3. Si OK, déployer
git add .
git commit -m "Deploy: [description]"
git push

# 4. Railway redéploie automatiquement
# 5. Vérifier : https://velosi-back-xxx.up.railway.app

# ✅ Backend Railway
# ✅ Keycloak Railway
# ✅ Frontend Vercel
```

---

## 🔍 VÉRIFIER QUE LE BON FICHIER EST UTILISÉ

### Méthode 1 : Logs au démarrage

Ajoutez dans `src/main.ts` :

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Afficher l'environnement au démarrage
  console.log('🔧 Environment:', process.env.NODE_ENV);
  console.log('🔗 Keycloak URL:', process.env.KEYCLOAK_URL);
  console.log('🗄️ Database:', process.env.DB_ADDR);
  console.log('🌐 Frontend:', process.env.FRONTEND_URL);
  
  await app.listen(process.env.PORT || 3000);
}
```

### Méthode 2 : Endpoint de test

Créer `src/health/health.controller.ts` :

```typescript
@Controller('health')
export class HealthController {
  @Get('config')
  getConfig() {
    return {
      environment: process.env.NODE_ENV,
      keycloakUrl: process.env.KEYCLOAK_URL,
      database: process.env.DB_ADDR,
      frontendUrl: process.env.FRONTEND_URL,
      timestamp: new Date().toISOString(),
    };
  }
}
```

Puis testez :
```powershell
# Local
curl http://localhost:3000/health/config

# Production
curl https://velosi-back-xxx.up.railway.app/health/config
```

---

## 🔐 SÉCURITÉ : .gitignore

Assurez-vous que ces fichiers NE SONT JAMAIS commités :

```gitignore
# Secrets locaux
.env
.env.local
.env.development
.env.development.local

# Secrets production
.env.production
.env.production.local

# Templates OK (pas de secrets)
.env.example
.env.production.keycloak.template
```

---

## 📊 TABLEAU RÉCAPITULATIF

| Aspect | 🏠 LOCAL | ☁️ PRODUCTION |
|--------|---------|---------------|
| **Fichier** | `.env` | `.env.production` |
| **Keycloak** | http://localhost:8080 | https://keycloak-xxx.up.railway.app |
| **Backend** | http://localhost:3000 | https://velosi-back-xxx.up.railway.app |
| **Frontend** | http://localhost:4200 | https://votre-app.vercel.app |
| **Database** | PostgreSQL local | Supabase |
| **NODE_ENV** | development | production |
| **Commande** | `npm run start:dev` | Railway auto-deploy |

---

## 🆘 PROBLÈMES COURANTS

### ❌ Backend utilise mauvais Keycloak

**Problème** : Backend en mode dev utilise Keycloak Railway

**Solution** :
```powershell
# Vérifier NODE_ENV
$env:NODE_ENV

# Forcer développement
$env:NODE_ENV="development"
npm run start:dev
```

---

### ❌ Variables non chargées

**Problème** : `process.env.KEYCLOAK_URL` est undefined

**Solution** :
1. Vérifier que le fichier `.env` existe
2. Vérifier `@nestjs/config` dans `app.module.ts`
3. Redémarrer le serveur

```typescript
// app.module.ts
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' 
        ? '.env.production' 
        : '.env',
    }),
    // ...
  ],
})
```

---

### ❌ CORS Error en production

**Problème** : Frontend Vercel ne peut pas appeler backend Railway

**Solution** :
1. Vérifier `ALLOWED_ORIGINS` dans `.env.production`
2. S'assurer que le backend autorise l'origine Vercel

```typescript
// main.ts
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
});
```

---

## ✅ CHECKLIST FINALE

### Pour Développement Local
- [ ] `.env` configuré avec localhost
- [ ] Keycloak local lancé (C:/keycloak-old ou Docker)
- [ ] PostgreSQL local accessible
- [ ] `npm run start:dev` fonctionne
- [ ] Frontend local se connecte

### Pour Production
- [ ] `.env.production` configuré avec Railway/Vercel
- [ ] Variables Railway configurées
- [ ] Keycloak Railway déployé et accessible
- [ ] Backend Railway déployé
- [ ] Frontend Vercel déployé
- [ ] Tests end-to-end réussis

---

## 🎯 PROCHAINES ÉTAPES

1. **Créer les scripts** de basculement automatique
2. **Tester en local** avec les deux configurations
3. **Déployer sur Railway** pour votre encadrant
4. **Basculer facilement** entre local et prod selon besoin

---

**Besoin d'aide ?** Consultez les autres guides :
- [`COMMANDES_KEYCLOAK_RAILWAY.md`](./COMMANDES_KEYCLOAK_RAILWAY.md)
- [`DEPLOIEMENT_KEYCLOAK_RAILWAY_MANUEL.md`](./DEPLOIEMENT_KEYCLOAK_RAILWAY_MANUEL.md)
