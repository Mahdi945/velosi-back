# Guide Complet : Déploiement Keycloak sur Railway (Sans Docker)

## 🎯 Objectif
Déployer Keycloak 26.0.7 sur Railway en utilisant un buildpack Java, sans Docker.

---

## ⚠️ IMPORTANT : Limitations de Railway

Railway **ne supporte PAS nativement** le déploiement de Keycloak sans Docker pour les raisons suivantes :

1. **Keycloak nécessite Java 17+** et des dépendances système spécifiques
2. **Railway utilise des buildpacks** qui ne sont pas optimisés pour Keycloak standalone
3. **La structure de Keycloak** (avec /bin, /lib, /conf) n'est pas compatible avec les buildpacks standard

---

## ✅ SOLUTIONS RECOMMANDÉES

### Solution 1 : Utiliser un Service Keycloak Hébergé (RECOMMANDÉ)

#### Option A : Keycloak Cloud (Officiel - Payant)
- **URL** : https://www.keycloak.org/getting-started/getting-started-cloud
- **Prix** : À partir de $0.015/heure (~$10/mois)
- **Avantages** : 
  - Géré par Red Hat
  - Mises à jour automatiques
  - Haute disponibilité
  - Support officiel

#### Option B : Auth0 (Alternative Populaire)
- **URL** : https://auth0.com
- **Prix** : Gratuit jusqu'à 7,000 utilisateurs actifs/mois
- **Avantages** :
  - Compatible avec les protocoles OAuth2/OIDC
  - Facile à intégrer
  - UI moderne
  - Support excellent

#### Option C : Supabase Auth
- **URL** : https://supabase.com
- **Prix** : Gratuit jusqu'à 50,000 utilisateurs actifs/mois
- **Avantages** :
  - Déjà utilisé pour votre base de données
  - Authentification intégrée
  - JWT natif
  - API simple

---

### Solution 2 : Déployer Keycloak avec Docker sur Railway (SOLUTION VIABLE)

Si vous tenez absolument à héberger votre propre instance Keycloak, voici la **seule méthode viable** sur Railway :

#### Étape 1 : Créer un Dockerfile pour Keycloak

Créez un fichier `Dockerfile.keycloak` dans votre projet backend :

```dockerfile
FROM quay.io/keycloak/keycloak:26.0.7 as builder

# Configuration du mode production
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_DB=postgres

# Build optimisé
WORKDIR /opt/keycloak
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.0.7
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Créer un utilisateur non-root
RUN useradd -r -u 1000 -g 0 keycloak && \
    chown -R 1000:0 /opt/keycloak && \
    chmod -R g=u /opt/keycloak

USER 1000

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
```

#### Étape 2 : Créer un Projet Séparé sur Railway

**IMPORTANT** : Keycloak doit être dans un projet Railway séparé de votre backend NestJS.

1. Allez sur https://railway.app
2. Cliquez sur "New Project"
3. Sélectionnez "Deploy from GitHub repo"
4. Ou sélectionnez "Empty Project" pour upload manuel

#### Étape 3 : Ajouter une Base de Données PostgreSQL

Railway nécessite une base PostgreSQL pour Keycloak :

1. Dans votre projet Railway, cliquez sur "+ New"
2. Sélectionnez "Database" → "PostgreSQL"
3. Railway créera automatiquement une base de données
4. Notez l'URL de connexion (format : `postgresql://user:pass@host:port/db`)

#### Étape 4 : Configurer les Variables d'Environnement

Dans Railway, ajoutez ces variables pour votre service Keycloak :

```bash
# Admin Keycloak
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=VotreMotDePasseSecurise123!

# Base de données (Railway fournit DATABASE_URL automatiquement)
KC_DB=postgres
KC_DB_URL_HOST=${PGHOST}
KC_DB_URL_DATABASE=${PGDATABASE}
KC_DB_URL_PORT=${PGPORT}
KC_DB_USERNAME=${PGUSER}
KC_DB_PASSWORD=${PGPASSWORD}

# Configuration serveur
KC_HOSTNAME_STRICT=false
KC_HOSTNAME_STRICT_HTTPS=false
KC_HTTP_ENABLED=true
KC_PROXY=edge

# Production
KC_HEALTH_ENABLED=true
KC_METRICS_ENABLED=true
```

#### Étape 5 : Déployer sur Railway

**Option A : Via GitHub**

1. Créez un nouveau repo GitHub avec juste le Dockerfile.keycloak
2. Dans Railway, sélectionnez "Deploy from GitHub"
3. Choisissez le repo
4. Railway détectera automatiquement le Dockerfile

**Option B : Via Railway CLI**

```bash
# Installer Railway CLI
npm i -g @railway/cli

# Login
railway login

# Créer un nouveau projet
railway init

# Déployer
railway up
```

#### Étape 6 : Configurer le Domaine

1. Dans Railway, allez dans les settings du service Keycloak
2. Cliquez sur "Generate Domain"
3. Vous obtiendrez une URL type : `keycloak-production-xxxx.up.railway.app`
4. Notez cette URL pour configurer votre backend

#### Étape 7 : Accéder à Keycloak

1. Ouvrez `https://votre-keycloak.up.railway.app`
2. Allez sur `/admin`
3. Connectez-vous avec les credentials (KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD)

---

### Solution 3 : Déployer sur Render.com (Plus Simple)

Render supporte mieux Keycloak que Railway :

#### Étape 1 : Créer un compte Render

1. Allez sur https://render.com
2. Créez un compte gratuit

#### Étape 2 : Créer une Base PostgreSQL

1. Dashboard Render → "New" → "PostgreSQL"
2. Nom : `keycloak-db`
3. Plan : Free
4. Notez l'URL interne

#### Étape 3 : Créer un Web Service

1. Dashboard Render → "New" → "Web Service"
2. Connectez votre repo GitHub (avec Dockerfile.keycloak)
3. Ou sélectionnez "Deploy from Docker Hub"
4. Image : `quay.io/keycloak/keycloak:26.0.7`

#### Étape 4 : Variables d'Environnement Render

```bash
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=VotreMotDePasseSecurise123!

KC_DB=postgres
KC_DB_URL=postgresql://user:pass@host:5432/db

KC_HOSTNAME_STRICT=false
KC_HTTP_ENABLED=true
KC_PROXY=edge

JAVA_OPTS_APPEND=-Dkeycloak.profile.feature.upload_scripts=enabled
```

#### Étape 5 : Commande de Démarrage

Dans Render, définissez la commande de démarrage :

```bash
/opt/keycloak/bin/kc.sh start --optimized
```

---

## 🔧 Configuration de votre Backend NestJS

Une fois Keycloak déployé, mettez à jour votre `.env.production` :

```bash
# Keycloak Production
KEYCLOAK_REALM=velosi
KEYCLOAK_CLIENT_ID=velosi-erp
KEYCLOAK_CLIENT_SECRET=votre-secret-keycloak
KEYCLOAK_SERVER_URL=https://votre-keycloak.up.railway.app
KEYCLOAK_AUTH_SERVER_URL=https://votre-keycloak.up.railway.app

# Ou pour Render
KEYCLOAK_SERVER_URL=https://keycloak-velosi.onrender.com
```

---

## 📊 Comparaison des Solutions

| Solution | Difficulté | Coût/mois | Avantages | Inconvénients |
|----------|-----------|-----------|-----------|---------------|
| **Keycloak Cloud** | ⭐ Facile | ~$10 | Géré, Fiable | Payant |
| **Auth0** | ⭐ Facile | Gratuit | UI moderne | Limite gratuite |
| **Supabase Auth** | ⭐⭐ Moyen | Gratuit | Déjà utilisé | Moins de features |
| **Railway + Docker** | ⭐⭐⭐ Difficile | $5 | Contrôle total | Configuration complexe |
| **Render + Docker** | ⭐⭐ Moyen | Gratuit | Plus simple | Performance limitée |

---

## 🎯 RECOMMANDATION FINALE

Pour votre projet Velosi ERP, je recommande **Render.com avec Docker** pour les raisons suivantes :

### ✅ Avantages
1. **Plan gratuit suffisant** pour développement/staging
2. **Supporte Docker nativement**
3. **PostgreSQL gratuit inclus**
4. **Plus simple que Railway** pour Keycloak
5. **Domaines HTTPS automatiques**
6. **Pas de carte bancaire requise** pour commencer

### 📝 Étapes Simplifiées pour Render

```bash
# 1. Créer Dockerfile.keycloak (voir ci-dessus)

# 2. Créer compte Render.com

# 3. Créer PostgreSQL Database sur Render

# 4. Créer Web Service sur Render :
#    - Docker Image: quay.io/keycloak/keycloak:26.0.7
#    - Start Command: /opt/keycloak/bin/kc.sh start
#    - Variables d'env: Voir ci-dessus

# 5. Copier l'URL de votre Keycloak

# 6. Mettre à jour .env.production dans velosi-back

# 7. Déployer velosi-back sur Railway

# C'EST TOUT ! 🎉
```

---

## 🚀 Alternative Recommandée : Migration vers Supabase Auth

Si vous voulez simplifier votre architecture, Supabase Auth est **la meilleure option** :

### Pourquoi Supabase Auth ?

1. ✅ **Déjà utilisé** pour votre base de données
2. ✅ **Gratuit** jusqu'à 50,000 utilisateurs
3. ✅ **JWT natif** compatible avec NestJS
4. ✅ **API simple** - Moins de code
5. ✅ **UI authentification** prête à l'emploi
6. ✅ **Politiques RLS** pour la sécurité

### Migration en 3 étapes

#### 1. Activer Supabase Auth

Dans votre projet Supabase :
1. Allez dans Authentication
2. Activez Email/Password provider
3. Notez votre `SUPABASE_URL` et `SUPABASE_ANON_KEY`

#### 2. Installer le SDK Supabase

```bash
cd velosi-back
npm install @supabase/supabase-js
```

#### 3. Remplacer Keycloak par Supabase

Créer `src/auth/supabase-auth.guard.ts` :

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) return false;

    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    
    if (error || !user) return false;

    request.user = user;
    return true;
  }
}
```

**Avantages** :
- 🔥 **90% moins de code**
- 🚀 **Plus rapide** à déployer
- 💰 **Gratuit**
- 🛡️ **Sécurité intégrée**

---

## 📞 Support

Si vous avez des questions pendant le déploiement :

1. **Documentation Render** : https://render.com/docs
2. **Documentation Keycloak** : https://www.keycloak.org/docs/latest
3. **Forum Render** : https://community.render.com

---

## ✅ Checklist de Déploiement

- [ ] Choix de la solution (Render recommandé)
- [ ] Compte créé sur la plateforme
- [ ] Base PostgreSQL créée
- [ ] Dockerfile.keycloak créé
- [ ] Service Keycloak déployé
- [ ] Variables d'environnement configurées
- [ ] URL Keycloak testée (accès à /admin)
- [ ] Realm 'velosi' créé
- [ ] Client 'velosi-erp' configuré
- [ ] Backend mis à jour avec nouvelle URL
- [ ] Tests de connexion réussis
- [ ] Frontend mis à jour avec nouvelle URL

---

**Quelle solution préférez-vous ?**

1. 🔵 **Render + Docker Keycloak** (Recommandé - Simple)
2. 🟣 **Railway + Docker Keycloak** (Plus complexe)
3. 🟢 **Supabase Auth** (Le plus simple - Migration requise)

Dites-moi votre choix et je vous guiderai étape par étape ! 🚀
