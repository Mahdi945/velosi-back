# 🌟 Configuration Cloudinary pour Railway (Production)

## 📋 Étapes pour Configurer Cloudinary

### 1️⃣ Créer un Compte Cloudinary (Gratuit)

1. Aller sur: **https://cloudinary.com/users/register_free**
2. S'inscrire avec votre email
3. Vérifier votre email
4. Accéder au Dashboard Cloudinary

### 2️⃣ Récupérer les Credentials Cloudinary

Une fois connecté au Dashboard Cloudinary:

1. Cliquer sur **Dashboard** (en haut à gauche)
2. Vous verrez un encadré **"Account Details"** avec:
   - **Cloud Name**: `votre-cloud-name` (exemple: `velosi-erp`)
   - **API Key**: `123456789012345` (15 chiffres)
   - **API Secret**: `xxxx-xxxxxxxxx_xxxx` (cliquer sur "Reveal" pour voir)

**Copier ces 3 valeurs** - vous en aurez besoin! 📝

### 3️⃣ Configurer Railway avec Cloudinary

#### Option A: Via le Dashboard Railway (Recommandé)

1. Aller sur **https://railway.app/**
2. Se connecter et sélectionner le projet **velosi-back**
3. Cliquer sur l'onglet **Variables**
4. Cliquer sur **+ New Variable**
5. Ajouter les 3 variables suivantes:

```
CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxx-xxxxxxxxx_xxxx
```

6. Cliquer sur **Deploy** pour redémarrer le service

#### Option B: Via Railway CLI

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Ajouter les variables
railway variables set CLOUDINARY_CLOUD_NAME=votre-cloud-name
railway variables set CLOUDINARY_API_KEY=123456789012345
railway variables set CLOUDINARY_API_SECRET=xxxx-xxxxxxxxx_xxxx

# Redéployer
railway up
```

### 4️⃣ Vérifier la Configuration

Une fois les variables ajoutées sur Railway, regardez les logs de déploiement:

```bash
# Dans Railway Dashboard → Deployments → View Logs
# Vous devriez voir:
☁️ [Cloudinary] Configuration avec cloud: velosi-erp
☁️ [Storage] Utilisation de Cloudinary pour les images de profil
```

### 5️⃣ Tester l'Upload en Production

1. Aller sur **https://velosi-front.vercel.app/user-profile**
2. Se connecter
3. Cliquer sur **Modifier le profil**
4. Choisir une image de profil
5. Uploader l'image

**Résultat attendu:**
- L'image est uploadée sur Cloudinary
- L'URL retournée ressemble à: `https://res.cloudinary.com/velosi-erp/image/upload/v1699000000/velosi/profiles/user-1234567890.jpg`
- L'image reste **persistante** même après redéploiement Railway

### 6️⃣ Vérifier sur Cloudinary

1. Aller sur le **Dashboard Cloudinary**
2. Cliquer sur **Media Library** (menu de gauche)
3. Aller dans le dossier **velosi/profiles/**
4. Vous devriez voir les images uploadées

---

## 🔍 Comment ça Marche?

### En Localhost (sans Cloudinary configuré)

```
┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│   Upload    │──────▶│  diskStorage │──────▶│ uploads/       │
│   Image     │      │  (multer)    │      │ profiles/      │
└─────────────┘      └──────────────┘      └────────────────┘
                                                    │
                                                    ▼
                                            user-1-123456.jpg
```

**Chemin retourné:** `uploads/profiles/user-1-123456.jpg`

### En Production Railway (avec Cloudinary)

```
┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│   Upload    │──────▶│ Cloudinary   │──────▶│  Cloud CDN     │
│   Image     │      │  Storage     │      │  (permanent)   │
└─────────────┘      └──────────────┘      └────────────────┘
                                                    │
                                                    ▼
                        https://res.cloudinary.com/.../user-1.jpg
```

**URL retournée:** `https://res.cloudinary.com/velosi-erp/image/upload/.../user-1.jpg`

---

## ✅ Avantages de la Solution Hybride

| Critère | Localhost (diskStorage) | Railway (Cloudinary) |
|---------|-------------------------|----------------------|
| **Configuration** | ✅ Aucune config nécessaire | ☁️ Variables d'environnement |
| **Stockage** | 💾 Dossier `uploads/` | ☁️ Cloud permanent |
| **Persistence** | ✅ Permanent en local | ✅ Permanent même après redéploiement |
| **Performance** | 🚀 Rapide (local) | 🌍 CDN global (encore plus rapide) |
| **Coût** | 💰 Gratuit | 💰 Gratuit jusqu'à 25 Go/mois |
| **Transformations** | ❌ Manuelles | ✅ Automatiques (resize, crop, optimize) |
| **Backup** | ⚠️ Manuel | ✅ Automatique |

---

## 🚨 Résolution de Problèmes

### Problème: "Storage local utilisé au lieu de Cloudinary"

**Cause:** Variables d'environnement non configurées sur Railway

**Solution:**
1. Vérifier que les 3 variables existent dans Railway Variables
2. Vérifier qu'il n'y a pas d'espaces avant/après les valeurs
3. Redéployer le service

### Problème: "Cloudinary invalid credentials"

**Cause:** Credentials incorrects

**Solution:**
1. Revérifier les credentials sur le Dashboard Cloudinary
2. S'assurer que API_SECRET est bien révélé (cliquer sur "Reveal")
3. Copier-coller sans espaces

### Problème: "Images toujours perdues après redéploiement"

**Cause:** Cloudinary n'est pas configuré

**Solution:**
1. Vérifier les logs Railway: chercher `☁️ [Cloudinary]`
2. Si vous voyez `💾 [Storage] Utilisation du stockage local`, Cloudinary n'est pas activé
3. Ajouter les variables d'environnement

---

## 📝 Exemple de Log Réussi

```bash
[INFO] Starting application...
☁️ [Cloudinary] Configuration avec cloud: velosi-erp
☁️ [Storage] Utilisation de Cloudinary pour les images de profil
[INFO] Auth module initialized
[INFO] Application listening on port 3000

# Lors d'un upload:
📤 [Upload] Début upload image de profil
📤 [Upload] Fichier reçu: { filename: 'user-1699000000.jpg', ... }
☁️ [Storage] Image uploadée sur Cloudinary: https://res.cloudinary.com/velosi-erp/...
✅ [Upload] Image de profil mise à jour avec succès
```

---

## 🎯 Checklist de Vérification

- [ ] Compte Cloudinary créé
- [ ] Cloud Name récupéré
- [ ] API Key récupéré
- [ ] API Secret récupéré (révélé)
- [ ] Variables ajoutées dans Railway
- [ ] Service redéployé
- [ ] Logs Railway montrent "☁️ [Cloudinary]"
- [ ] Upload d'image testé en production
- [ ] Image visible dans Cloudinary Media Library
- [ ] Image persiste après redéploiement

---

**Date:** 4 novembre 2025  
**Version:** 1.0.0  
**Status:** ✅ Prêt pour la production
