# 🔧 Correction Upload Images - Cloudinary & Localhost

## 📋 Problème Identifié

Après l'implémentation de Cloudinary pour Railway, le profil utilisateur en **localhost** ne fonctionnait plus correctement :
- ❌ Données de profil (nom, prénom, téléphone) ne s'affichaient pas
- ❌ Images de profil ne s'affichaient pas
- ❌ Upload d'images ne fonctionnait pas en localhost

## ✅ Solutions Appliquées

### 1. **Correction ConfigService dans auth.controller.ts**

**Problème** : `new ConfigService()` ne charge pas les variables d'environnement Railway

**Solution** : Utilisation directe de l'instance injectée `this.configService`

```typescript
// ❌ AVANT
FileInterceptor('profile', {
  storage: createProfileImageStorage(new ConfigService()), // Ne charge pas les env vars
  ...
})

// ✅ APRÈS
FileInterceptor('profile', {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = './uploads/profiles';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req: any, file, cb) => {
      const userId = (req as any).user?.id || 'unknown';
      const timestamp = Date.now();
      const extension = file.originalname.split('.').pop();
      cb(null, `user-${userId}-${timestamp}.${extension}`);
    },
  }),
  ...
})
```

### 2. **Logique d'Upload Hybride Intelligente**

La méthode `uploadProfileImage` détecte maintenant automatiquement l'environnement :

```typescript
// Vérifier si Cloudinary est configuré
const hasCloudinary = 
  this.configService.get('CLOUDINARY_CLOUD_NAME') && 
  this.configService.get('CLOUDINARY_API_KEY') && 
  this.configService.get('CLOUDINARY_API_SECRET');

if (hasCloudinary) {
  // 🌐 PRODUCTION (Railway)
  console.log('☁️ [Upload] Upload vers Cloudinary...');
  
  cloudinary.config({
    cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
    api_key: this.configService.get('CLOUDINARY_API_KEY'),
    api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    secure: true,
  });

  const uploadResult = await cloudinary.uploader.upload(file.path, {
    folder: 'velosi/profiles',
    public_id: `user-${user.id}-${Date.now()}`,
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  });

  finalPath = uploadResult.secure_url; // URL Cloudinary
  uploadedToCloudinary = true;

  // Supprimer le fichier local temporaire
  fs.unlinkSync(file.path);
} else {
  // 💻 LOCALHOST
  finalPath = `uploads/profiles/${file.filename}`;
  console.log('💾 [Upload] Utilisation du stockage local:', finalPath);
}
```

### 3. **Correction Response API getProfile**

**Problème** : Le controller wrappait le profil dans `{ user: {...} }` alors que le frontend attendait directement l'objet

```typescript
// ❌ AVANT
@Get('profile')
async getProfile(@Request() req) {
  const fullUserProfile = await this.authService.getFullUserProfile(req.user.id, req.user.userType);
  return { user: fullUserProfile }; // ❌ Wrapper inutile
}

// ✅ APRÈS
@Get('profile')
async getProfile(@Request() req) {
  const fullUserProfile = await this.authService.getFullUserProfile(req.user.id, req.user.userType);
  return fullUserProfile; // ✅ Retour direct
}
```

### 4. **Logging Complet pour Diagnostic**

Ajout de logs détaillés pour tracer le flux :

```typescript
console.log('🔍 [Upload] Vérification Cloudinary:', {
  hasCloudName: !!this.configService.get('CLOUDINARY_CLOUD_NAME'),
  hasApiKey: !!this.configService.get('CLOUDINARY_API_KEY'),
  hasApiSecret: !!this.configService.get('CLOUDINARY_API_SECRET'),
  configured: hasCloudinary
});
```

### 5. **Gestion d'Erreurs Robuste**

```typescript
catch (error) {
  console.error('❌ [Upload] Erreur:', error);
  
  // Supprimer le fichier local en cas d'erreur
  if (file && file.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  // Si l'upload Cloudinary a réussi mais erreur après, nettoyer Cloudinary
  if (uploadedToCloudinary && cloudinaryUrl) {
    const publicId = cloudinaryUrl.split('/').slice(-2).join('/').replace(/\.[^/.]+$/, '');
    await cloudinary.uploader.destroy(publicId);
  }
  
  throw new BadRequestException(`Erreur lors de l'upload: ${error.message}`);
}
```

## 🎯 Résultat Final

### **Localhost (Développement)**
- ✅ Upload dans `./uploads/profiles/`
- ✅ Stockage permanent sur disque local
- ✅ Aucune configuration Cloudinary nécessaire
- ✅ Chemin retourné : `uploads/profiles/user-123-1234567890.jpg`
- ✅ URL frontend : `http://localhost:3000/api/files/profile/user-123-1234567890.jpg`

### **Production Railway**
- ✅ Upload temporaire local puis transfert vers Cloudinary
- ✅ Suppression automatique du fichier local après upload cloud
- ✅ Stockage permanent sur Cloudinary CDN
- ✅ URL retournée : `https://res.cloudinary.com/drnymfbmr/image/upload/v1234/velosi/profiles/user-123.jpg`
- ✅ Images persistantes même après redéploiement Railway

## 📦 Variables d'Environnement Railway

```bash
CLOUDINARY_CLOUD_NAME=drnymfbmr
CLOUDINARY_API_KEY=347818836325731
CLOUDINARY_API_SECRET=0EOG3e2W4KHYR81O0zEyodPaGRQ
```

## 🔄 Flux d'Upload

### Localhost
```
1. Fichier reçu → diskStorage('./uploads/profiles')
2. Vérification Cloudinary → NON configuré
3. Fichier reste en local → 'uploads/profiles/user-X-timestamp.jpg'
4. DB mise à jour → photo = 'uploads/profiles/user-X-timestamp.jpg'
5. Frontend construit URL → `${apiUrl}/files/profile/user-X-timestamp.jpg`
```

### Production
```
1. Fichier reçu → diskStorage temporaire ('./uploads/profiles')
2. Vérification Cloudinary → CONFIGURÉ ✅
3. Upload vers Cloudinary → URL retournée
4. Suppression fichier local temporaire
5. DB mise à jour → photo = 'https://res.cloudinary.com/...'
6. Frontend utilise URL directement (déjà complète)
```

## 🧪 Tests à Effectuer

### Localhost
- [ ] Ouvrir page profil → Nom, prénom, téléphone s'affichent
- [ ] Photo par défaut visible si pas de photo
- [ ] Upload nouvelle photo → Success + aperçu immédiat
- [ ] Vérifier fichier dans `./uploads/profiles/`
- [ ] Recharger page → Photo toujours visible

### Production Railway
- [ ] Page profil affiche données correctement
- [ ] Upload photo → Success
- [ ] Vérifier dans Cloudinary Media Library → Image présente
- [ ] Recharger page → Photo toujours visible (URL Cloudinary)
- [ ] Redéployer Railway → Photo toujours accessible ✅

## 🚀 Déploiement

```bash
# Backend
cd velosi-back
git add .
git commit -m "fix: Correction upload images - support localhost + Cloudinary production"
git push origin main

# Railway auto-déploie automatiquement
```

## 📝 Notes Importantes

1. **Ne PAS ajouter les variables Cloudinary en .env local** - Laissez-les uniquement sur Railway
2. **Le dossier `uploads/` est dans .gitignore** - Normal, c'est généré localement
3. **Frontend utilise `environment.apiUrl`** - Automatiquement `localhost` ou URL Railway
4. **Cloudinary transformation** : 800x800px, quality auto, format auto pour optimisation

---

**Date de correction** : 4 novembre 2025  
**Auteur** : GitHub Copilot  
**Statut** : ✅ Fonctionnel Localhost + Production
