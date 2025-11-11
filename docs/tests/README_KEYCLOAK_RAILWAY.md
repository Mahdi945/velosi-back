# 🚀 DÉMARRAGE RAPIDE : Keycloak sur Railway

## ✅ CE QUI A ÉTÉ FAIT AUTOMATIQUEMENT

Les fichiers suivants ont été créés/optimisés pour vous :

1. ✅ `Dockerfile.keycloak` - Optimisé pour Railway
2. ✅ `DEPLOIEMENT_KEYCLOAK_RAILWAY_MANUEL.md` - Guide complet étape par étape
3. ✅ `.env.production.keycloak.template` - Template de configuration
4. ✅ `railway.keycloak.json` - Configuration Railway
5. ✅ `verify-keycloak-railway.ps1` - Script de vérification

## 🎯 CE QUE VOUS DEVEZ FAIRE MAINTENANT

### **ÉTAPE 1 : Suivre le guide manuel**

Ouvrez et suivez le fichier :
```
DEPLOIEMENT_KEYCLOAK_RAILWAY_MANUEL.md
```

Ce guide vous explique comment :
- Créer un compte Railway
- Créer un projet Keycloak
- Ajouter PostgreSQL
- Configurer les variables d'environnement
- Déployer Keycloak
- Configurer le Realm et le Client

**⏱️ Temps estimé : 30-45 minutes**

---

### **ÉTAPE 2 : Après le déploiement Railway**

Une fois Keycloak déployé sur Railway, vous aurez une URL comme :
```
https://keycloak-production-xxxx.up.railway.app
```

**Testez votre déploiement avec le script PowerShell :**

```powershell
cd C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back

# Remplacez l'URL par celle de votre Railway
.\verify-keycloak-railway.ps1 -KeycloakUrl "https://keycloak-production-xxxx.up.railway.app"
```

Ce script va vérifier :
- ✅ Accessibilité de Keycloak
- ✅ Health check
- ✅ Admin console
- ✅ Configuration OpenID
- ✅ Authentification admin
- ✅ Existence du realm

---

### **ÉTAPE 3 : Configurer votre backend**

1. **Copiez le template de configuration :**
   ```powershell
   Copy-Item .env.production.keycloak.template .env.production
   ```

2. **Éditez `.env.production` et remplacez :**
   ```bash
   # URL de votre Keycloak Railway
   KEYCLOAK_URL=https://keycloak-production-xxxx.up.railway.app
   KEYCLOAK_SERVER_URL=https://keycloak-production-xxxx.up.railway.app
   KEYCLOAK_AUTH_SERVER_URL=https://keycloak-production-xxxx.up.railway.app
   
   # Client secret (obtenu dans Keycloak admin)
   KEYCLOAK_CLIENT_SECRET=votre-client-secret-ici
   KEYCLOAK_ADMIN_CLIENT_SECRET=votre-admin-client-secret-ici
   ```

3. **Testez localement :**
   ```powershell
   npm run start:prod
   ```

4. **Déployez sur Railway :**
   ```powershell
   git add .
   git commit -m "Configure Keycloak production on Railway"
   git push
   ```

---

## 📋 CHECKLIST DE DÉPLOIEMENT

Cochez au fur et à mesure :

### Sur Railway :
- [ ] Compte Railway créé
- [ ] Projet "velosi-keycloak" créé
- [ ] PostgreSQL ajouté
- [ ] Service Keycloak créé depuis GitHub
- [ ] Variables d'environnement configurées (12 variables)
- [ ] Domaine public généré
- [ ] Déploiement réussi (logs verts)
- [ ] URL Keycloak accessible

### Dans Keycloak (interface web) :
- [ ] Connexion admin réussie (/admin)
- [ ] Realm "ERP_Velosi" créé
- [ ] Client "velosi_auth" créé
- [ ] Client authentication activé
- [ ] Valid redirect URIs configurées
- [ ] Client secret copié
- [ ] Client "admin-cli" créé
- [ ] Admin client secret copié
- [ ] Roles créés (ADMIN, COMMERCIAL, OPERATIONS)

### Dans votre backend :
- [ ] .env.production créé et configuré
- [ ] Script de vérification exécuté avec succès
- [ ] Tests locaux réussis
- [ ] Backend déployé sur Railway
- [ ] Tests de connexion frontend OK

---

## 🆘 AIDE RAPIDE

### Problème : Keycloak ne démarre pas sur Railway

**Solution :**
1. Vérifiez les logs dans Railway → Service Keycloak → Deployments
2. Assurez-vous que PostgreSQL est démarré
3. Vérifiez les variables d'environnement (surtout les `KC_DB_*`)
4. Attendez 5 minutes (premier démarrage long)

### Problème : Cannot connect to database

**Solution :**
1. Vérifiez que les variables utilisent bien la syntaxe Railway :
   ```
   KC_DB_URL_HOST=${{Postgres.PGHOST}}
   ```
2. Redéployez le service

### Problème : 401 Unauthorized sur /admin

**Solution :**
1. Vérifiez `KEYCLOAK_ADMIN` et `KEYCLOAK_ADMIN_PASSWORD`
2. Attendez 2-3 minutes après le démarrage
3. Essayez en navigation privée

### Problème : Script verify-keycloak-railway.ps1 échoue

**Solution :**
```powershell
# Autoriser l'exécution de scripts PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Puis réessayez
.\verify-keycloak-railway.ps1 -KeycloakUrl "https://votre-url.up.railway.app"
```

---

## 📚 RESSOURCES

- **Guide complet** : `DEPLOIEMENT_KEYCLOAK_RAILWAY_MANUEL.md`
- **Documentation Railway** : https://docs.railway.app
- **Documentation Keycloak** : https://www.keycloak.org/docs/latest
- **Support Railway** : https://railway.app/discord

---

## 💡 CONSEILS

1. **Sauvegardez vos secrets** : Notez tous les secrets dans un gestionnaire de mots de passe
2. **Testez localement d'abord** : Avant de déployer en production
3. **Surveillez les logs** : Railway vous montre les logs en temps réel
4. **Utilisez des variables Railway** : Pour référencer PostgreSQL automatiquement

---

## 🎯 PROCHAINES ÉTAPES

Après avoir déployé Keycloak :

1. Configurer votre frontend Angular avec la nouvelle URL
2. Synchroniser les utilisateurs existants vers Keycloak
3. Tester l'authentification end-to-end
4. Activer les logs d'audit Keycloak
5. Configurer les sauvegardes PostgreSQL

---

**Bon déploiement ! 🚀**

Si vous avez des questions, consultez le guide complet ou créez un ticket sur Railway Discord.
