# 🚀 GUIDE COMPLET : Déploiement Backend sur Railway

---

## ✅ RÉSUMÉ RAPIDE

Railway **NE lit PAS** automatiquement `.env.production`.  
Vous devez **configurer les variables manuellement** dans l'interface Railway.

---

## 📋 ÉTAPES COMPLÈTES

### 1️⃣ Préparer le Code

```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"

# Vérifier les fichiers
git status

# Ajouter les changements
git add .

# Commit
git commit -m "feat: Configure backend for Railway deployment"

# Push sur GitHub
git push origin main
```

**✅ Le code est maintenant sur GitHub**

---

### 2️⃣ Créer le Service Backend sur Railway

#### Option A : Interface Railway (RECOMMANDÉ)

1. **Allez sur** https://railway.app
2. **Cliquez sur** `+ New Service` (ou dans votre projet existant `+ New`)
3. **Sélectionnez** `GitHub Repo`
4. **Choisissez** `velosi-back`
5. Railway détecte automatiquement NestJS

**✅ Service créé !**

---

#### Option B : Railway CLI

```powershell
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Lier le projet (dans le dossier velosi-back)
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
railway link

# Déployer
railway up
```

---

### 3️⃣ Configurer les Variables d'Environnement

**⚠️ ÉTAPE CRUCIALE** : Railway ne lit PAS `.env.production`

#### Dans l'interface Railway :

1. **Cliquez sur** votre service `velosi-back`
2. **Allez dans** l'onglet `Variables`
3. **Cliquez sur** `New Variable`
4. **Ajoutez UNE PAR UNE** :

```bash
DB_VENDOR=postgres
DB_ADDR=aws-1-eu-north-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.aswqsbrpkofmhgqjmyuw
DB_PASSWORD=87Eq8384
DB_DATABASE=postgres

JWT_SECRET=velosi-secret-key-2025-ultra-secure
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

NODE_ENV=production

# ⚠️ À mettre à jour après déploiement Keycloak
KEYCLOAK_URL=https://keycloak-production-xxxx.up.railway.app
KEYCLOAK_SERVER_URL=https://keycloak-production-xxxx.up.railway.app
KEYCLOAK_AUTH_SERVER_URL=https://keycloak-production-xxxx.up.railway.app
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=SqW52BNjvjyvmaJyUx2TwzgFTeqzeBzF

KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_CLIENT_SECRET=
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384

# ⚠️ À mettre à jour après déploiement Vercel
FRONTEND_URL=https://votre-frontend.vercel.app
ALLOWED_ORIGINS=https://votre-frontend.vercel.app,http://localhost:4200
```

5. **Railway redéploie automatiquement** après chaque variable ajoutée

**✅ Variables configurées !**

---

### 4️⃣ Vérifier le Déploiement

1. **Allez dans** l'onglet `Deployments`
2. **Attendez** que le statut soit `✅ Success` (2-3 minutes)
3. **Allez dans** l'onglet `Settings` → `Networking`
4. **Cliquez sur** `Generate Domain`
5. **Copiez** l'URL générée : `https://velosi-back-xxx.up.railway.app`

**✅ Backend déployé !**

---

### 5️⃣ Tester le Backend

```powershell
# Test simple
curl https://velosi-back-xxx.up.railway.app/api

# Test health check (si vous avez créé l'endpoint)
curl https://velosi-back-xxx.up.railway.app/health/config
```

**✅ Backend fonctionne !**

---

## 🔍 CE QUE RAILWAY DÉTECTE AUTOMATIQUEMENT

### ✅ Détecté automatiquement :

| Élément | Comment |
|---------|---------|
| **Type de projet** | Via `package.json` (NestJS) |
| **Commande build** | `npm run build` (dans `package.json`) |
| **Commande start** | `npm run start:prod` (dans `package.json`) |
| **Port** | Railway injecte `PORT` automatiquement |
| **Node version** | Via `engines` dans `package.json` |

### ❌ PAS détecté automatiquement :

| Élément | Solution |
|---------|----------|
| **Variables `.env.production`** | Configurer manuellement dans Railway |
| **Secrets Keycloak** | Ajouter dans Variables Railway |
| **URL Frontend** | Ajouter dans Variables Railway |
| **Configuration base de données** | Ajouter dans Variables Railway |

---

## 📊 WORKFLOW COMPLET

```
1. LOCAL → GITHUB
   ├─ git add .
   ├─ git commit -m "Deploy"
   └─ git push origin main

2. GITHUB → RAILWAY
   ├─ Railway détecte le push
   ├─ Railway build le projet (npm run build)
   ├─ Railway injecte les variables d'environnement
   └─ Railway démarre (npm run start:prod)

3. RAILWAY → INTERNET
   ├─ Railway génère une URL publique
   ├─ Railway gère HTTPS automatiquement
   └─ Backend accessible via https://velosi-back-xxx.up.railway.app
```

---

## 🔄 REDÉPLOIEMENT

### Après modification du code :

```powershell
# 1. Modifier le code localement
# 2. Commit et push
git add .
git commit -m "fix: Update backend logic"
git push origin main

# ✅ Railway redéploie AUTOMATIQUEMENT
```

### Après modification d'une variable :

1. Railway Dashboard → Service → Variables
2. Modifier la variable
3. Railway redéploie AUTOMATIQUEMENT

---

## 🎯 ORDRE DE DÉPLOIEMENT RECOMMANDÉ

```
1. 🔐 Keycloak Railway      (DEPLOIEMENT_KEYCLOAK_RAILWAY_MANUEL.md)
   └─ Copier l'URL Keycloak

2. ⚙️ Backend Railway       (Ce guide)
   └─ Configurer avec URL Keycloak
   └─ Copier l'URL Backend

3. 📱 Frontend Vercel       (Guide Vercel)
   └─ Configurer avec URL Backend et Keycloak
   └─ Copier l'URL Frontend

4. 🔄 Mettre à jour Backend (Variables Railway)
   └─ Ajouter URL Frontend dans ALLOWED_ORIGINS
```

---

## 🆘 PROBLÈMES COURANTS

### ❌ Build Failed

**Symptôme** : Erreur pendant `npm run build`

**Solutions** :
1. Vérifier les logs Railway
2. Tester le build localement : `npm run build`
3. Vérifier les dépendances dans `package.json`

---

### ❌ Application Crashed

**Symptôme** : Deployment Success mais application crash

**Solutions** :
1. Vérifier les logs Railway (onglet `Logs`)
2. Vérifier les variables d'environnement
3. Tester localement : `npm run start:prod`

---

### ❌ Cannot connect to database

**Symptôme** : Erreur de connexion Supabase

**Solutions** :
1. Vérifier `DB_ADDR`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
2. Vérifier que Supabase autorise les connexions externes
3. Tester la connexion depuis Railway (voir logs)

---

### ❌ CORS Error

**Symptôme** : Frontend ne peut pas appeler le backend

**Solutions** :
1. Vérifier `ALLOWED_ORIGINS` dans Variables Railway
2. Ajouter l'URL Vercel : `https://votre-app.vercel.app`
3. Vérifier le code CORS dans `src/main.ts`

---

## ✅ CHECKLIST FINALE

### Avant déploiement :
- [ ] Code poussé sur GitHub
- [ ] `.env.production` configuré (pour référence locale)
- [ ] `.gitignore` exclut `.env.production`

### Pendant déploiement :
- [ ] Service Railway créé
- [ ] Toutes les variables configurées dans Railway
- [ ] Build réussi (logs verts)
- [ ] Domaine généré

### Après déploiement :
- [ ] URL Backend accessible
- [ ] Endpoint `/api` répond
- [ ] Connexion base de données OK
- [ ] Frontend peut appeler le backend
- [ ] Keycloak authentification fonctionne

---

## 📝 COMMANDES UTILES

```powershell
# Voir les logs en temps réel
railway logs

# Redéployer manuellement
railway up

# Voir les variables
railway variables

# Ajouter une variable
railway variables set KEY=VALUE

# Ouvrir le dashboard
railway open
```

---

## 🎯 RÉSUMÉ

1. **Code → GitHub** : `git push`
2. **GitHub → Railway** : Connexion automatique
3. **Variables** : Configuration manuelle dans Railway
4. **Déploiement** : Automatique après push ou modification

**✅ Votre backend est maintenant accessible en ligne pour votre encadrant !**

---

**🔗 URL Backend** : `https://velosi-back-xxx.up.railway.app`  
**🔗 Railway Dashboard** : https://railway.app
