# 🔐 GUIDE DE DÉPLOIEMENT KEYCLOAK SUR RENDER (SANS DOCKER)

## 📋 PRÉREQUIS

- Keycloak installé dans : `C:\keycloak\bin`
- Compte GitHub : Mahdi945
- Compte Render : https://render.com
- Base de données Supabase déjà configurée

---

## 🎯 ÉTAPE 1 : PRÉPARER KEYCLOAK POUR LE DÉPLOIEMENT

### 1.1 Vérifier la version de Keycloak

```powershell
cd C:\keycloak\bin
.\kc.bat --version
```

### 1.2 Créer un dossier de déploiement

```powershell
# Créer un nouveau dossier pour le déploiement
New-Item -ItemType Directory -Path "C:\keycloak-deploy" -Force
cd C:\keycloak-deploy

# Copier les fichiers nécessaires de Keycloak
Copy-Item -Path "C:\keycloak\*" -Destination "." -Recurse -Force
```

### 1.3 Créer le fichier package.json

Render nécessite un `package.json` même pour déployer Keycloak :

```powershell
cd C:\keycloak-deploy
```

Créez le fichier `package.json` :

```json
{
  "name": "velosi-keycloak",
  "version": "26.0.0",
  "description": "Keycloak pour Velosi ERP",
  "scripts": {
    "start": "bash start-keycloak.sh"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 1.4 Créer le script de démarrage start-keycloak.sh

```powershell
cd C:\keycloak-deploy
```

Créez le fichier `start-keycloak.sh` :

```bash
#!/bin/bash
set -e

echo "🚀 Démarrage de Keycloak..."

# Variables d'environnement
export KC_DB=postgres
export KC_DB_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"
export KC_DB_USERNAME="${DB_USER}"
export KC_DB_PASSWORD="${DB_PASSWORD}"
export KC_HOSTNAME="${KEYCLOAK_HOSTNAME}"
export KC_HTTP_ENABLED=true
export KC_HTTP_PORT=${PORT:-8080}
export KC_PROXY=edge
export KC_HEALTH_ENABLED=true

# Build de Keycloak (première fois seulement)
if [ ! -f "./bin/kc.sh" ]; then
    echo "❌ Erreur : kc.sh non trouvé !"
    exit 1
fi

echo "🔨 Configuration de Keycloak..."
./bin/kc.sh build --db=postgres

echo "✅ Démarrage de Keycloak en mode production..."
./bin/kc.sh start \
    --optimized \
    --http-enabled=true \
    --http-port=${PORT:-8080} \
    --proxy=edge \
    --hostname=${KEYCLOAK_HOSTNAME} \
    --db=postgres \
    --db-url="${KC_DB_URL}" \
    --db-username="${DB_USER}" \
    --db-password="${DB_PASSWORD}"
```

### 1.5 Créer le fichier .gitignore

```powershell
cd C:\keycloak-deploy
```

Créez le fichier `.gitignore` :

```
# Keycloak data
data/
log/
tmp/
*.log

# Environnement
.env
.env.local
.env.production

# OS
.DS_Store
Thumbs.db
```

---

## 🎯 ÉTAPE 2 : POUSSER SUR GITHUB

### 2.1 Initialiser Git

```powershell
cd C:\keycloak-deploy

git init
git add .
git commit -m "Configuration initiale Keycloak pour Render"
```

### 2.2 Créer le repository sur GitHub

1. Aller sur **https://github.com/Mahdi945**
2. Cliquer sur **"New repository"**
3. **Repository name** : `velosi-keycloak`
4. **Description** : `Keycloak pour Velosi ERP`
5. **Public ou Private** : Private (recommandé)
6. Ne pas cocher "Add README"
7. Cliquer sur **"Create repository"**

### 2.3 Pousser le code

```powershell
cd C:\keycloak-deploy

git remote add origin https://github.com/Mahdi945/velosi-keycloak.git
git branch -M main
git push -u origin main
```

---

## 🎯 ÉTAPE 3 : DÉPLOYER SUR RENDER

### 3.1 Créer le service Web sur Render

1. Aller sur **https://render.com**
2. Se connecter avec GitHub
3. Cliquer sur **"New +"** → **"Web Service"**
4. Sélectionner le repository **velosi-keycloak**

### 3.2 Configuration du service

**Paramètres de base** :
- **Name** : `velosi-keycloak`
- **Region** : `Frankfurt (EU Central)`
- **Branch** : `main`
- **Runtime** : `Shell` (pas Node !)
- **Build Command** : `chmod +x start-keycloak.sh`
- **Start Command** : `./start-keycloak.sh`
- **Instance Type** : `Starter` ($7/mois - Keycloak nécessite au moins 512MB RAM)

⚠️ **IMPORTANT** : Le plan gratuit de Render (256MB RAM) n'est PAS suffisant pour Keycloak !

### 3.3 Variables d'environnement

Ajouter ces variables d'environnement dans Render :

| Key | Value | Description |
|-----|-------|-------------|
| `DB_HOST` | `aws-1-eu-north-1.pooler.supabase.com` | Hôte Supabase |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DB_NAME` | `postgres` | Nom de la base |
| `DB_USER` | `postgres.aswqsbrpkofmhgqjmyuw` | Utilisateur Supabase |
| `DB_PASSWORD` | `87Eq8384` | Mot de passe Supabase |
| `KEYCLOAK_HOSTNAME` | `velosi-keycloak.onrender.com` | Hostname Render (sera généré) |
| `KEYCLOAK_ADMIN` | `admin` | Username admin Keycloak |
| `KEYCLOAK_ADMIN_PASSWORD` | `VotrMotDePasseAdmin123!` | Mot de passe admin (à changer) |
| `PORT` | `10000` | Port Render (automatique) |

### 3.4 Déployer

1. Cliquer sur **"Create Web Service"**
2. **Attendre le déploiement** (10-15 minutes - première fois plus long)
3. Suivre les logs en temps réel

### 3.5 Vérifier le déploiement

Une fois déployé, aller sur :
```
https://velosi-keycloak.onrender.com
```

Vous devriez voir la page d'accueil de Keycloak.

---

## 🎯 ÉTAPE 4 : CONFIGURER KEYCLOAK EN PRODUCTION

### 4.1 Se connecter à l'admin console

1. Aller sur : `https://velosi-keycloak.onrender.com/admin`
2. Username : `admin`
3. Password : celui défini dans `KEYCLOAK_ADMIN_PASSWORD`

### 4.2 Importer le realm ERP_Velosi

**Option A : Exporter depuis Keycloak local**

```powershell
cd C:\keycloak\bin

# Exporter le realm
.\kc.bat export --dir C:\keycloak-export --realm ERP_Velosi
```

Puis :
1. Copier le fichier `C:\keycloak-export\ERP_Velosi-realm.json`
2. Dans Keycloak Render : Admin Console → Create Realm → Import
3. Sélectionner le fichier JSON

**Option B : Recréer manuellement**

1. Créer un nouveau realm : `ERP_Velosi`
2. Créer le client : `velosi_auth`
3. Configurer les redirects URLs :
   - `https://velosi-front.vercel.app/*`
   - `http://localhost:4200/*` (pour dev local)
4. Activer "Direct Access Grants"
5. Copier le client secret

### 4.3 Créer les utilisateurs de test

Dans Keycloak Render :
1. Aller dans **Users**
2. Créer les utilisateurs de test
3. Définir les mots de passe

---

## 🎯 ÉTAPE 5 : METTRE À JOUR LE BACKEND ET FRONTEND

### 5.1 Mettre à jour le backend (velosi-back)

**Fichier : .env.production**

```env
KEYCLOAK_URL=https://velosi-keycloak.onrender.com
KEYCLOAK_REALM=ERP_Velosi
KEYCLOAK_CLIENT_ID=velosi_auth
KEYCLOAK_CLIENT_SECRET=<nouveau_secret_depuis_keycloak_render>
```

Puis :
```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"

git add .env.production
git commit -m "Mise à jour Keycloak vers Render"
git push origin main
```

Render redéploie automatiquement le backend !

### 5.2 Mettre à jour le frontend (velosi-front)

**Fichier : src/environments/environment.prod.ts**

```typescript
export const environment = {
  production: true,
  maintenance: false,
  apiUrl: 'https://velosi-backend.onrender.com/api',
  keycloak: {
    url: 'https://velosi-keycloak.onrender.com',  // ← Changé ici
    realm: 'ERP_Velosi',
    clientId: 'velosi_auth',
    clientSecret: '<nouveau_secret_depuis_keycloak_render>'
  }
};
```

Puis :
```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-front"

git add src/environments/environment.prod.ts
git commit -m "Mise à jour Keycloak vers Render"
git push origin main
```

Vercel redéploie automatiquement le frontend !

---

## 🎯 ÉTAPE 6 : TESTER L'AUTHENTIFICATION

### 6.1 Tester en local d'abord

```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"

# Basculer vers production (Supabase + Keycloak Render)
.\switch-env.ps1 -Environment prod

# Démarrer le backend
npm run start:dev

# Dans un autre terminal
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-front"

# Modifier temporairement environment.ts pour pointer vers Keycloak Render
npm start
```

### 6.2 Tester en production

1. Aller sur : `https://velosi-front.vercel.app`
2. Essayer de se connecter
3. Vérifier que la redirection vers Keycloak fonctionne
4. Se connecter avec un utilisateur de test
5. Vérifier que vous êtes redirigé vers l'application

---

## ⚠️ PROBLÈMES COURANTS

### "Cannot connect to database"

**Solution** : Vérifier que Supabase accepte les connexions depuis Render

1. Aller sur Supabase Dashboard
2. Settings → Database → Connection Pooling
3. Vérifier que le pooler est actif

### "Keycloak Admin Console not accessible"

**Solution** : Vérifier les logs Render

```bash
# Dans les logs Render, chercher :
ERROR: Failed to start Keycloak
```

Possible causes :
- RAM insuffisante (besoin du plan Starter)
- Variables d'environnement mal configurées

### "Realm not found"

**Solution** : Le realm n'a pas été importé

1. Aller sur `https://velosi-keycloak.onrender.com/admin`
2. Importer le realm ERP_Velosi

---

## 💰 COÛTS

- **Render (Keycloak)** : $7/mois (Starter plan - 512MB RAM)
- **Render (Backend)** : Gratuit (avec sommeil) ou $7/mois
- **Vercel (Frontend)** : Gratuit
- **Supabase (Database)** : Gratuit (500MB)

**Total minimum** : $7/mois (uniquement Keycloak)
**Total recommandé** : $14/mois (Keycloak + Backend)

---

## 🔄 ALTERNATIVE : GARDER KEYCLOAK EN LOCAL

Si vous ne voulez pas payer $7/mois pour Keycloak, vous pouvez :

### Option 1 : Utiliser Keycloak local uniquement

- ✅ Gratuit
- ❌ L'application déployée ne fonctionnera pas (pas d'authentification)
- ✅ Parfait pour le développement local

### Option 2 : Utiliser ngrok pour exposer Keycloak local

```powershell
# Installer ngrok : https://ngrok.com/download

# Démarrer Keycloak local
cd C:\keycloak\bin
.\kc.bat start-dev

# Dans un autre terminal, exposer le port 8080
ngrok http 8080
```

Puis utiliser l'URL ngrok dans vos configurations.

⚠️ **Inconvénient** : L'URL ngrok change à chaque redémarrage (version gratuite)

### Option 3 : Désactiver Keycloak temporairement

Pour les tests sans authentification :

**Backend** : Commenter les guards Keycloak
**Frontend** : Désactiver Keycloak dans `app.config.ts`

---

## 📊 RÉCAPITULATIF

### AVEC KEYCLOAK SUR RENDER

- ✅ Application complète déployée
- ✅ Authentification fonctionnelle partout
- ✅ Pas besoin de Keycloak local
- ❌ Coût : $7/mois minimum

### SANS KEYCLOAK SUR RENDER

- ✅ Gratuit
- ✅ Backend et frontend déployés
- ❌ Authentification non fonctionnelle en production
- ✅ Keycloak local pour le développement

---

## 🎯 RECOMMANDATION

Pour votre cas (test avec encadrant) :

1. **Déployer SANS Keycloak d'abord** (gratuit)
2. Montrer l'application à l'encadrant
3. Si besoin d'authentification en production, déployer Keycloak plus tard

**Workflow de démonstration** :
- Encadrant teste sur : `https://velosi-front.vercel.app`
- Vous sur votre PC : Keycloak local + backend/frontend locaux
- Vous pouvez partager votre écran pour montrer l'authentification

---

**Voulez-vous que je vous aide à déployer Keycloak sur Render maintenant, ou préférez-vous garder Keycloak en local pour économiser les coûts ?**
