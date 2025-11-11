# 🎯 COMMANDES RAPIDES - Keycloak Railway

## 📋 COMMANDES ESSENTIELLES

### 1️⃣ Vérifier le déploiement Keycloak
```powershell
# Remplacez l'URL par celle de votre Railway
.\verify-keycloak-railway.ps1 -KeycloakUrl "https://keycloak-production-xxxx.up.railway.app"
```

### 2️⃣ Configurer le backend après déploiement
```powershell
# Commande complète
.\configure-backend-railway.ps1 `
    -KeycloakUrl "https://keycloak-production-xxxx.up.railway.app" `
    -ClientSecret "votre-client-secret" `
    -AdminClientSecret "votre-admin-secret" `
    -FrontendUrl "https://votre-frontend.vercel.app"

# Version minimale (Admin secret à configurer manuellement)
.\configure-backend-railway.ps1 `
    -KeycloakUrl "https://keycloak-production-xxxx.up.railway.app" `
    -ClientSecret "votre-client-secret"
```

### 3️⃣ Tester localement avec la config production
```powershell
# Utiliser .env.production
$env:NODE_ENV="production"
npm run start:prod

# Ou directement
node dist/main.js
```

### 4️⃣ Synchroniser les utilisateurs vers Keycloak
```powershell
npm run sync:keycloak
```

### 5️⃣ Vérifier les utilisateurs Keycloak
```powershell
.\verify-keycloak-users.ps1
```

---

## 🚀 DÉPLOIEMENT SUR RAILWAY

### Option A : Déploiement via Git (Recommandé)
```powershell
# 1. Ajouter les changements
git add .

# 2. Commit
git commit -m "Configure Keycloak production on Railway"

# 3. Push (Railway redéploiera automatiquement)
git push
```

### Option B : Déploiement via Railway CLI
```powershell
# 1. Installer Railway CLI (première fois seulement)
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link au projet
railway link

# 4. Déployer
railway up

# 5. Voir les logs
railway logs
```

---

## 🔧 CONFIGURATION DES VARIABLES RAILWAY

### Pour le service Keycloak
```powershell
# Via l'interface Railway (Recommandé)
# Railway Dashboard → Keycloak Service → Variables
```

Variables à configurer :
```bash
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384
KC_DB=postgres
KC_DB_URL_HOST=${{Postgres.PGHOST}}
KC_DB_URL_PORT=${{Postgres.PGPORT}}
KC_DB_URL_DATABASE=${{Postgres.PGDATABASE}}
KC_DB_USERNAME=${{Postgres.PGUSER}}
KC_DB_PASSWORD=${{Postgres.PGPASSWORD}}
KC_HOSTNAME_STRICT=false
KC_HTTP_ENABLED=true
KC_PROXY=edge
KC_HEALTH_ENABLED=true
KC_METRICS_ENABLED=true
```

### Pour le service Backend (velosi-back)
```powershell
# Via l'interface Railway
# Railway Dashboard → velosi-back Service → Variables
```

Variables à configurer :
```bash
NODE_ENV=production
KEYCLOAK_URL=https://keycloak-production-xxxx.up.railway.app
KEYCLOAK_SERVER_URL=https://keycloak-production-xxxx.up.railway.app
KEYCLOAK_AUTH_SERVER_URL=https://keycloak-production-xxxx.up.railway.app
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=votre-client-secret
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_CLIENT_SECRET=votre-admin-client-secret
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384
```

---

## 🔍 DEBUGGING

### Voir les logs Keycloak sur Railway
```powershell
# Via Railway CLI
railway logs --service keycloak

# Ou via l'interface web
# Railway Dashboard → Keycloak Service → Deployments → Logs
```

### Voir les logs Backend sur Railway
```powershell
# Via Railway CLI
railway logs --service velosi-back

# Ou via l'interface web
# Railway Dashboard → velosi-back Service → Deployments → Logs
```

### Test de connexion directe à Keycloak
```powershell
# Test d'accessibilité
curl https://keycloak-production-xxxx.up.railway.app

# Test du health check
curl https://keycloak-production-xxxx.up.railway.app/health/ready

# Test OpenID configuration
curl https://keycloak-production-xxxx.up.railway.app/realms/ERP_Velosi/.well-known/openid-configuration
```

### Test d'authentification
```powershell
# Test avec PowerShell
$body = @{
    username = "admin"
    password = "87Eq8384"
    grant_type = "password"
    client_id = "admin-cli"
}

$response = Invoke-RestMethod `
    -Uri "https://keycloak-production-xxxx.up.railway.app/realms/master/protocol/openid-connect/token" `
    -Method POST `
    -Body $body `
    -ContentType "application/x-www-form-urlencoded"

$response.access_token
```

---

## 📊 MONITORING

### Vérifier le statut des services Railway
```powershell
# Via Railway CLI
railway status

# Via l'interface web
# Railway Dashboard → Project Overview
```

### Vérifier l'utilisation des ressources
```powershell
# Via l'interface Railway
# Railway Dashboard → Service → Metrics
```

---

## 🛠️ MAINTENANCE

### Redémarrer le service Keycloak
```powershell
# Via Railway CLI
railway restart --service keycloak

# Ou via l'interface web
# Railway Dashboard → Keycloak Service → Settings → Restart
```

### Redéployer Keycloak (avec rebuild)
```powershell
# Via Railway CLI
railway redeploy --service keycloak

# Ou via l'interface web
# Railway Dashboard → Keycloak Service → Deployments → Redeploy
```

### Rollback à un déploiement précédent
```powershell
# Via l'interface web uniquement
# Railway Dashboard → Service → Deployments → Click sur ancien déploiement → Rollback
```

---

## 🔒 SÉCURITÉ

### Changer le mot de passe admin Keycloak
```powershell
# 1. Dans Railway, modifier la variable
KEYCLOAK_ADMIN_PASSWORD=NouveauMotDePasse123!

# 2. Redémarrer le service
railway restart --service keycloak
```

### Régénérer le client secret
```powershell
# 1. Dans Keycloak admin, aller dans Clients → velosi_auth → Credentials
# 2. Cliquer sur "Regenerate Secret"
# 3. Copier le nouveau secret
# 4. Mettre à jour dans Railway Backend variables :
KEYCLOAK_CLIENT_SECRET=nouveau-secret
```

---

## 📁 FICHIERS IMPORTANTS

| Fichier | Description |
|---------|-------------|
| `Dockerfile.keycloak` | Configuration Docker pour Keycloak |
| `DEPLOIEMENT_KEYCLOAK_RAILWAY_MANUEL.md` | Guide complet étape par étape |
| `README_KEYCLOAK_RAILWAY.md` | Guide de démarrage rapide |
| `.env.production.keycloak.template` | Template de configuration |
| `verify-keycloak-railway.ps1` | Script de vérification |
| `configure-backend-railway.ps1` | Script de configuration automatique |
| `railway.keycloak.json` | Configuration Railway pour Keycloak |

---

## 🆘 LIENS UTILES

- **Railway Dashboard** : https://railway.app/dashboard
- **Railway Docs** : https://docs.railway.app
- **Keycloak Admin** : https://keycloak-production-xxxx.up.railway.app/admin
- **Railway Discord** : https://discord.gg/railway
- **Keycloak Docs** : https://www.keycloak.org/docs/latest

---

## ✅ CHECKLIST RAPIDE

Avant de déployer :
- [ ] Compte Railway créé
- [ ] PostgreSQL ajouté au projet
- [ ] Dockerfile.keycloak prêt
- [ ] Variables d'environnement notées

Après déploiement :
- [ ] URL Keycloak générée
- [ ] Script de vérification exécuté avec succès
- [ ] Realm créé dans Keycloak
- [ ] Client créé dans Keycloak
- [ ] Client secret récupéré
- [ ] Backend configuré avec nouvelle URL
- [ ] Tests de connexion réussis

---

**Gardez ce fichier à portée de main pour les commandes quotidiennes ! 📌**
