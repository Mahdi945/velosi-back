# 🔧 Guide de Résolution - Erreurs Keycloak 401

## 🎯 Problème
Erreurs d'authentification Keycloak 401 lors de la création d'utilisateurs.

## 🔍 Diagnostic

### 1. Exécuter le script de vérification :
```bash
cd "c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
node check-keycloak.js
```

### 2. Problèmes possibles :

#### ❌ **Keycloak non démarré**
**Solution :**
```bash
# Démarrer Keycloak avec Docker
docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=87Eq8384 quay.io/keycloak/keycloak:latest start-dev
```

#### ❌ **Identifiants admin incorrects**
**Vérifier dans `.env` :**
```properties
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384
```

#### ❌ **Realm ERP_Velosi manquant**
**Solutions :**
1. **Interface Web :** http://localhost:8080/admin
   - Connectez-vous avec admin/admin
   - Créer realm "ERP_Velosi"

2. **Script automatique :** Le script `check-keycloak.js` essaiera de le créer

#### ❌ **Client velosi_auth manquant**
**Dans l'interface Keycloak :**
1. Aller dans le realm ERP_Velosi
2. Clients → Create client
3. Client ID: `velosi_auth`
4. Activer le client

## 🛠️ Solutions Rapides

### Option 1: Utiliser les identifiants par défaut
```bash
# Modifier .env
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=87Eq8384
```

### Option 2: Créer l'utilisateur MAHDI dans Keycloak
1. Interface admin → Master realm → Users
2. Add user → Username: MAHDI
3. Set password: 123
4. Assign admin roles

### Option 3: Désactiver temporairement
```bash
# Dans .env
KEYCLOAK_ENABLED=false
```

## 🔄 Redémarrage requis
Après modification de `.env` :
```bash
# Arrêter le serveur (Ctrl+C)
npm run start:dev
```

## ✅ Vérification finale
```bash
# Tester après correction
node check-keycloak.js
node test-auth.js
```

---
*Guide mis à jour : 12 septembre 2025*
