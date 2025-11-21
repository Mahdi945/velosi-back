# 🔒 Sécurisation du Service Email - Velosi ERP

## 📋 Résumé des modifications

Cette mise à jour sécurise le service email en supprimant toutes les credentials SMTP hardcodées et en les déplaçant vers le fichier `.env`.

---

## ✅ Modifications apportées

### 1. **Fichier `.env`** (Backend)

Ajout des variables SMTP manquantes :

```env
# Configuration SMTP pour l'envoi d'emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application
SMTP_FROM_EMAIL=noreply@velosi.com
SMTP_FROM_NAME=Velosi ERP
```

⚠️ **IMPORTANT :** Remplacez les valeurs placeholders par vos vraies informations SMTP.

---

### 2. **Service Email** (`src/services/email.service.ts`)

#### Changements majeurs :

1. **Validation stricte** : Le service refuse de démarrer si `SMTP_USER` ou `SMTP_PASSWORD` sont manquants
   ```typescript
   if (!smtpUser || !smtpPass) {
     throw new Error('🚨 SMTP_USER et SMTP_PASSWORD doivent être définis dans le fichier .env');
   }
   ```

2. **Méthodes helper** pour récupérer les emails expéditeur :
   ```typescript
   private getFromEmail(): string
   private getFromName(): string
   ```

3. **Suppression de toutes les credentials hardcodées** :
   - ❌ Avant : `'velosierp@gmail.com'`, `'qaas amak tyqq rzet'`
   - ✅ Après : `this.getFromEmail()`, récupéré depuis `.env`

4. **Toutes les méthodes email mises à jour** :
   - `sendOtpEmail()`
   - `sendPasswordResetSuccessEmail()`
   - `sendPersonnelCredentialsEmail()`
   - `sendPersonnelDeactivationEmail()`
   - `sendPersonnelReactivationEmail()`
   - `sendClientCredentialsEmail()`
   - `sendClientDeactivationEmail()`
   - `sendClientReactivationEmail()`
   - `sendContactEmail()`
   - `sendOtpEmailWithPublicLogo()`

---

### 3. **Documentation**

Ajout de `docs/CONFIGURATION_SMTP.md` avec :
- ✅ Guide de configuration pour Gmail, Outlook, SendGrid, Mailgun
- ✅ Instructions pour créer un mot de passe d'application Gmail
- ✅ Dépannage des erreurs courantes
- ✅ Comparatif des fournisseurs SMTP
- ✅ Bonnes pratiques de sécurité

---

### 4. **Script de test**

Ajout de `scripts/test-smtp.ts` pour :
- ✅ Vérifier la configuration SMTP
- ✅ Tester la connexion au serveur
- ✅ Envoyer un email de test
- ✅ Afficher des messages d'erreur détaillés

---

## 🚀 Utilisation

### Étape 1 : Configurer le fichier `.env`

1. Ouvrez `velosi-back/.env`
2. Complétez les variables SMTP :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application
SMTP_FROM_EMAIL=noreply@velosi.com
SMTP_FROM_NAME=Velosi ERP
```

### Étape 2 : Tester la configuration

```bash
cd velosi-back
npx ts-node scripts/test-smtp.ts
```

Vous devriez voir :
```
✅ Connexion SMTP réussie !
✅ Email de test envoyé avec succès !
🎉 Configuration SMTP validée avec succès !
```

### Étape 3 : Redémarrer le backend

```bash
npm run start:dev
```

Le service email devrait démarrer sans erreur.

---

## 🔐 Configuration Gmail (Recommandé pour développement)

### Créer un mot de passe d'application :

1. Allez sur https://myaccount.google.com/
2. Activez la **vérification en 2 étapes** (si pas déjà fait)
3. Allez dans **Sécurité** → **Mots de passe d'application**
4. Sélectionnez "Autre" et nommez "Velosi ERP"
5. Copiez le mot de passe généré (16 caractères)

### Configuration `.env` :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # Mot de passe d'application (sans espaces)
SMTP_FROM_EMAIL=noreply@velosi.com
SMTP_FROM_NAME=Velosi ERP
```

---

## 🌐 Configuration pour Production (Railway/Vercel)

### Option recommandée : SendGrid

1. Créez un compte sur https://signup.sendgrid.com/
2. Vérifiez votre email
3. Créez une API Key dans Settings → API Keys
4. Configurez `.env` :

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM_EMAIL=noreply@velosi.com
SMTP_FROM_NAME=Velosi ERP
```

**Avantages :**
- ✅ Gratuit jusqu'à 100 emails/jour
- ✅ Fiabilité professionnelle
- ✅ Statistiques détaillées

---

## 🛡️ Sécurité

### ✅ Points de sécurité mis en place :

1. **Credentials dans `.env` uniquement** :
   - ❌ Aucune credential hardcodée dans le code
   - ✅ Toutes les credentials dans `.env`

2. **Validation stricte** :
   - Le backend refuse de démarrer si les credentials manquent
   - Message d'erreur clair dans les logs

3. **`.env` ignoré par Git** :
   - Vérifiez que `.env` est dans `.gitignore`
   - Ne committez JAMAIS le `.env`

4. **Séparation environnements** :
   - Différents `.env` pour dev/staging/production
   - Credentials différentes par environnement

---

## ❌ Dépannage

### Erreur : "SMTP_USER et SMTP_PASSWORD doivent être définis"

**Cause :** Variables manquantes dans `.env`

**Solution :**
1. Ouvrez `velosi-back/.env`
2. Ajoutez `SMTP_USER` et `SMTP_PASSWORD`
3. Redémarrez le backend

---

### Erreur : "Invalid login" (Gmail)

**Cause :** Mot de passe normal au lieu d'un mot de passe d'application

**Solution :**
1. Créez un mot de passe d'application Gmail
2. Utilisez-le dans `SMTP_PASSWORD`
3. Guide : https://support.google.com/accounts/answer/185833

---

### Erreur : "ECONNREFUSED"

**Cause :** Serveur SMTP inaccessible

**Solutions :**
1. Vérifiez `SMTP_HOST` et `SMTP_PORT`
2. Vérifiez votre connexion Internet
3. Essayez `SMTP_PORT=465` avec `SMTP_SECURE=true`

---

## 📊 Checklist de sécurité

- [x] Credentials supprimées du code
- [x] Variables SMTP dans `.env`
- [x] `.env` dans `.gitignore`
- [x] Documentation créée
- [x] Script de test créé
- [x] Validation stricte ajoutée
- [x] Méthodes helper pour emails FROM
- [ ] **VOUS : Configurez vos vraies credentials SMTP**
- [ ] **VOUS : Testez avec `npx ts-node scripts/test-smtp.ts`**
- [ ] **VOUS : Vérifiez la réception de l'email de test**

---

## 📚 Ressources

- **Configuration SMTP** : `docs/CONFIGURATION_SMTP.md`
- **Test SMTP** : `scripts/test-smtp.ts`
- **Service Email** : `src/services/email.service.ts`

---

## 💡 Prochaines étapes

1. ✅ Complétez les variables SMTP dans `.env`
2. ✅ Testez avec le script : `npx ts-node scripts/test-smtp.ts`
3. ✅ Redémarrez le backend
4. ✅ Testez la fonctionnalité "Mot de passe oublié"
5. ✅ Vérifiez que les emails sont bien reçus

---

**Date de mise à jour :** ${new Date().toLocaleDateString('fr-FR')}
**Version :** 1.0.0
**Auteur :** GitHub Copilot
