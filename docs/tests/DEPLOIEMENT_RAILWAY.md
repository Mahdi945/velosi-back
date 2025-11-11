# 🚀 Déploiement Rapide - Backend Velosi ERP

## 📦 Prérequis

- Node.js 20+
- PostgreSQL (Supabase pour production)
- Keycloak (hébergé sur Railway)

## 🔧 Installation Locale

```powershell
# Cloner le repo
git clone <repo-url>
cd velosi-back

# Installer les dépendances
npm install --legacy-peer-deps

# Copier .env.local vers .env
cp .env.local .env

# Lancer en développement
npm run start:dev
```

## 🌐 Déploiement sur Railway

### Étape 1 : Préparer Supabase

1. Créer un projet Supabase
2. Importer `backup_velosi_supabase_final.sql`
3. Noter les credentials de connexion

### Étape 2 : Déployer Keycloak

Voir `GUIDE_DEPLOIEMENT_RAILWAY_COMPLET.md` section Keycloak

### Étape 3 : Déployer le Backend

1. Connecter Railway à votre repo GitHub
2. Configurer les variables d'environnement (voir `.env.production`)
3. Railway déploie automatiquement à chaque push

## 📋 Variables d'Environnement Railway

```env
DB_VENDOR=postgres
DB_ADDR=<SUPABASE_HOST>
DB_PORT=6543
DB_DATABASE=postgres
DB_USER=<SUPABASE_USER>
DB_PASSWORD=<SUPABASE_PASSWORD>
JWT_SECRET=<VOTRE_SECRET>
KEYCLOAK_URL=<KEYCLOAK_RAILWAY_URL>
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=<CLIENT_SECRET>
NODE_ENV=production
CORS_ORIGIN=<FRONTEND_URL>
PORT=${{PORT}}
```

## 📖 Documentation Complète

Voir `GUIDE_DEPLOIEMENT_RAILWAY_COMPLET.md` pour le guide détaillé.

## 🛠️ Commandes Utiles

```powershell
# Développement
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Tests
npm run test

# Logs Railway
railway logs
```

## 🔗 Liens

- [Guide Déploiement Complet](./GUIDE_DEPLOIEMENT_RAILWAY_COMPLET.md)
- [Documentation Keycloak](./KEYCLOAK_IMPLEMENTATION_COMPLETE.md)
- [Railway](https://railway.app)
- [Supabase](https://supabase.com)

Date: 4 novembre 2025
