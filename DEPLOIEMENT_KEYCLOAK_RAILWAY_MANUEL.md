# 🚀 Guide Manuel : Déploiement Keycloak sur Railway

## 📋 PRÉREQUIS

- Compte GitHub
- Compte Railway.app (gratuit)
- Votre Keycloak local dans `C:/keycloak-old/bin`

---

## 🎯 ÉTAPES À FAIRE MANUELLEMENT SUR RAILWAY

### **ÉTAPE 1️⃣ : Créer un compte Railway**

1. Allez sur **https://railway.app**
2. Cliquez sur **"Login"** en haut à droite
3. Sélectionnez **"Login with GitHub"**
4. Autorisez Railway à accéder à votre GitHub
5. Vous arrivez sur votre Dashboard Railway

---

### **ÉTAPE 2️⃣ : Créer un nouveau projet Keycloak**

1. Sur le Dashboard Railway, cliquez sur **"New Project"**
2. Sélectionnez **"Empty Project"**
3. Donnez un nom au projet : **"velosi-keycloak"**
4. Cliquez sur **"Create"**

---

### **ÉTAPE 3️⃣ : Ajouter une base de données PostgreSQL**

1. Dans votre projet "velosi-keycloak", cliquez sur **"+ New"**
2. Sélectionnez **"Database"**
3. Choisissez **"Add PostgreSQL"**
4. Railway va créer automatiquement une base PostgreSQL

⏳ **Attendez 1-2 minutes** que la base soit créée

5. Cliquez sur le service PostgreSQL créé
6. Allez dans l'onglet **"Variables"**
7. **NOTEZ CES VALEURS** (vous en aurez besoin) :
   - `PGHOST`
   - `PGPORT`
   - `PGDATABASE`
   - `PGUSER`
   - `PGPASSWORD`

---

### **ÉTAPE 4️⃣ : Créer le service Keycloak**

1. Retournez à la vue principale du projet
2. Cliquez sur **"+ New"**
3. Sélectionnez **"GitHub Repo"**
4. **Autorisez Railway** à accéder à vos repos GitHub
5. Sélectionnez le repo **"velosi-back"** (ou créez-en un nouveau pour Keycloak)
6. Railway va détecter automatiquement le `Dockerfile.keycloak`

---

### **ÉTAPE 5️⃣ : Configurer les variables d'environnement Keycloak**

1. Cliquez sur le service **Keycloak** que vous venez de créer
2. Allez dans l'onglet **"Variables"**
3. Cliquez sur **"New Variable"** et ajoutez **UNE PAR UNE** :

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
KC_HOSTNAME_STRICT_HTTPS=false
KC_HTTP_ENABLED=true
KC_PROXY=edge

KC_HEALTH_ENABLED=true
KC_METRICS_ENABLED=true
```

**💡 ASTUCE** : Les variables `${{Postgres.XXX}}` seront automatiquement remplacées par Railway avec les valeurs de votre base PostgreSQL.

4. Cliquez sur **"Add"** pour chaque variable

---

### **ÉTAPE 6️⃣ : Configurer le Dockerfile et la commande de démarrage**

1. Toujours dans le service Keycloak, allez dans l'onglet **"Settings"**
2. Trouvez la section **"Build"**
3. Vérifiez que **"Builder"** est sur **"Dockerfile"**
4. Dans **"Dockerfile Path"**, mettez : `Dockerfile.keycloak`

5. Trouvez la section **"Deploy"**
6. Dans **"Custom Start Command"**, mettez :
   ```bash
   start --optimized
   ```

---

### **ÉTAPE 7️⃣ : Générer un domaine public**

1. Toujours dans **"Settings"** du service Keycloak
2. Trouvez la section **"Networking"**
3. Cliquez sur **"Generate Domain"**
4. Railway va créer une URL publique du type :
   ```
   keycloak-production-xxxx.up.railway.app
   ```

5. **✅ NOTEZ CETTE URL** - Vous en aurez besoin pour configurer votre backend !

---

### **ÉTAPE 8️⃣ : Déployer Keycloak**

1. Retournez à la vue principale de votre projet
2. Railway va automatiquement **déployer** Keycloak
3. Vous verrez les logs de déploiement en temps réel
4. Attendez le message : **"Keycloak 26.0.7 started"**

⏳ **Le premier déploiement prend 3-5 minutes**

---

### **ÉTAPE 9️⃣ : Vérifier que Keycloak fonctionne**

1. Ouvrez l'URL générée à l'étape 7 :
   ```
   https://keycloak-production-xxxx.up.railway.app
   ```

2. Vous devriez voir la page d'accueil de Keycloak

3. Allez sur `/admin` :
   ```
   https://keycloak-production-xxxx.up.railway.app/admin
   ```

4. Connectez-vous avec :
   - **Username** : `admin`
   - **Password** : `87Eq8384`

5. ✅ **Si vous voyez le Dashboard Keycloak, c'est bon !**

---

## 🔧 CONFIGURATION KEYCLOAK (Dans l'interface web)

Maintenant que Keycloak est déployé, vous devez configurer votre Realm et Client :

### **ÉTAPE 10 : Créer le Realm**

1. Dans l'interface admin de Keycloak, cliquez sur la dropdown **"Master"** en haut à gauche
2. Cliquez sur **"Create Realm"**
3. Remplissez :
   - **Realm name** : `ERP_Velosi`
   - **Enabled** : ✅ ON
4. Cliquez sur **"Create"**

---

### **ÉTAPE 11 : Créer le Client**

1. Dans le menu de gauche, cliquez sur **"Clients"**
2. Cliquez sur **"Create client"**
3. **General Settings** :
   - **Client type** : `OpenID Connect`
   - **Client ID** : `velosi_auth`
4. Cliquez sur **"Next"**

5. **Capability config** :
   - **Client authentication** : ✅ ON
   - **Authorization** : ✅ ON
   - **Standard flow** : ✅ ON
   - **Direct access grants** : ✅ ON
   - **Service accounts roles** : ✅ ON
6. Cliquez sur **"Next"**

7. **Login settings** :
   - **Root URL** : `https://votre-frontend.vercel.app`
   - **Home URL** : `https://votre-frontend.vercel.app`
   - **Valid redirect URIs** :
     ```
     https://votre-frontend.vercel.app/*
     http://localhost:4200/*
     ```
   - **Valid post logout redirect URIs** :
     ```
     https://votre-frontend.vercel.app/*
     http://localhost:4200/*
     ```
   - **Web origins** :
     ```
     https://votre-frontend.vercel.app
     http://localhost:4200
     ```
8. Cliquez sur **"Save"**

---

### **ÉTAPE 12 : Récupérer le Client Secret**

1. Dans la page du client `velosi_auth`, allez dans l'onglet **"Credentials"**
2. Vous verrez **"Client secret"**
3. Cliquez sur **"Copy"** pour copier le secret
4. **✅ NOTEZ CE SECRET** - Vous en aurez besoin !

---

### **ÉTAPE 13 : Créer le Client Admin**

Répétez l'étape 11 avec ces paramètres :

- **Client ID** : `admin-cli`
- **Client authentication** : ✅ ON
- **Service accounts roles** : ✅ ON
- Tout le reste : ❌ OFF

Récupérez aussi son **Client Secret**

---

### **ÉTAPE 14 : Configurer les Roles**

1. Dans le menu de gauche, cliquez sur **"Realm roles"**
2. Cliquez sur **"Create role"**
3. Créez ces 3 rôles :
   - **Role name** : `ADMIN` → Save
   - **Role name** : `COMMERCIAL` → Save
   - **Role name** : `OPERATIONS` → Save

---

## 📝 RÉCAPITULATIF DES VALEURS À NOTER

À la fin de ces étapes, vous devez avoir noté :

```
✅ URL KEYCLOAK : https://keycloak-production-xxxx.up.railway.app
✅ REALM : ERP_Velosi
✅ CLIENT_ID : velosi_auth
✅ CLIENT_SECRET : xxxxxxxxxxxxxxxxxxxxxxxxxx
✅ ADMIN_CLIENT_SECRET : yyyyyyyyyyyyyyyyyyyyyyyyyy
✅ ADMIN_USERNAME : admin
✅ ADMIN_PASSWORD : 87Eq8384
```

---

## 🎯 PROCHAINE ÉTAPE

Dites-moi quand vous avez terminé ces étapes manuelles, et je configurerai automatiquement votre backend avec les nouvelles valeurs ! 🚀

---

## ❓ PROBLÈMES COURANTS

### Keycloak ne démarre pas

**Vérifiez les logs Railway** :
1. Cliquez sur le service Keycloak
2. Allez dans l'onglet **"Deployments"**
3. Cliquez sur le dernier déploiement
4. Regardez les logs pour voir l'erreur

**Solutions communes** :
- Vérifiez que toutes les variables d'environnement sont bien définies
- Assurez-vous que PostgreSQL est bien démarré
- Attendez 5 minutes (le premier démarrage est long)

### Erreur "Database connection failed"

**Solution** :
1. Vérifiez que les variables `KC_DB_URL_*` utilisent bien la syntaxe `${{Postgres.XXX}}`
2. Redéployez le service Keycloak

### Impossible d'accéder à /admin

**Solution** :
1. Vérifiez que `KC_HTTP_ENABLED=true`
2. Vérifiez que `KC_HOSTNAME_STRICT=false`
3. Attendez 2-3 minutes après le démarrage

---

## 💰 COÛTS RAILWAY

- **PostgreSQL** : $5/mois (500 MB)
- **Keycloak** : $5-10/mois (selon l'utilisation)
- **Total estimé** : $10-15/mois

Railway offre **$5 gratuits/mois** pour commencer !

---

**Bon déploiement ! 🚀**
