# 🔧 Guide de Résolution - Erreur 535 Email VPS OVH

## 🚨 Le Problème

**Erreur 535** = Authentification SMTP échouée avec Gmail

Votre backend sur le VPS OVH ne peut pas envoyer d'emails via Gmail car :
- ❌ Gmail refuse l'authentification (erreur 535)
- ❌ Le mot de passe utilisé est probablement invalide
- ❌ Les ports SMTP peuvent être bloqués par OVH

## 📊 Configuration Actuelle

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=shipnologyerp@gmail.com
SMTP_PASSWORD=vjemuvjayxkrskr  ← PROBLÈME ICI
```

## ✅ Solutions (par ordre de préférence)

---

### 🥇 Solution 1 : Gmail avec App Password (Si vous voulez garder Gmail)

#### Pourquoi ça ne marche pas actuellement ?
Gmail **n'accepte plus** les mots de passe normaux pour les applications tierces depuis 2022.
Vous **DEVEZ** utiliser un "App Password" (mot de passe d'application).

#### Étapes pour corriger :

1. **Allez sur votre compte Google :**
   - Ouvrez : https://myaccount.google.com/apppasswords
   - Connectez-vous avec `shipnologyerp@gmail.com`

2. **Activez la validation en 2 étapes** (si ce n'est pas fait) :
   - https://myaccount.google.com/signinoptions/two-step-verification
   - Suivez les étapes pour activer la 2FA

3. **Générez un App Password :**
   - Retournez sur : https://myaccount.google.com/apppasswords
   - Nom de l'application : "Velosi Backend VPS"
   - Cliquez sur "Générer"
   - **Copiez le mot de passe de 16 caractères** (ex: `abcd efgh ijkl mnop`)
   - ⚠️ **Enlevez les espaces** → `abcdefghijklmnop`

4. **Appliquez sur le VPS :**
   
   Lancez le script de diagnostic :
   ```powershell
   cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
   .\diagnose-email-vps.ps1
   ```
   
   Puis connectez-vous au VPS :
   ```bash
   ssh Webdesk@vps-3b4fd3be.vps.ovh.ca
   # Mot de passe: Offline25$$
   ```
   
   Lancez le script de correction :
   ```bash
   bash ~/fix-vps-email.sh
   ```
   
   Choisissez **Option 1** (Gmail) et entrez :
   - Email: `shipnologyerp@gmail.com`
   - App Password: `abcdefghijklmnop` (celui que vous venez de générer)

5. **Vérifiez** :
   ```bash
   pm2 logs velosi-backend --lines 20
   ```

---

### 🥇 Solution 2 : SendGrid (RECOMMANDÉ pour VPS)

#### Pourquoi SendGrid ?
- ✅ **Gratuit** : 100 emails/jour
- ✅ **Fiable** sur les VPS OVH
- ✅ **Pas de soucis de ports bloqués**
- ✅ **Meilleure délivrabilité** qu'avec Gmail
- ✅ **Pas besoin de 2FA**

#### Étapes :

1. **Créez un compte SendGrid :**
   - Allez sur : https://sendgrid.com/
   - Inscrivez-vous avec votre email
   - Vérifiez votre email

2. **Vérifiez votre domaine ou email expéditeur :**
   - Dans SendGrid : **Settings** → **Sender Authentication**
   - Option A : Vérifiez un email unique (plus simple)
   - Option B : Vérifiez votre domaine (meilleure délivrabilité)
   - Utilisez : `noreply@msp.com` ou `contact@velosi.com`

3. **Créez une API Key :**
   - Dans SendGrid : **Settings** → **API Keys**
   - Cliquez sur **Create API Key**
   - Nom : "Velosi Backend VPS"
   - Permissions : **Full Access** ou **Mail Send**
   - Cliquez sur **Create & View**
   - **COPIEZ LA CLÉ** (vous ne pourrez plus la voir après) :
     ```
     SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     ```

4. **Appliquez sur le VPS :**
   
   ```bash
   ssh Webdesk@vps-3b4fd3be.vps.ovh.ca
   bash ~/fix-vps-email.sh
   ```
   
   Choisissez **Option 2** (SendGrid) et entrez :
   - API Key : `SG.xxxxx...`
   - Email expéditeur : `noreply@msp.com` (ou celui vérifié dans SendGrid)

5. **Configuration finale dans SendGrid :**
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASSWORD=SG.xxxxx...
   SMTP_FROM=noreply@msp.com
   ```

---

### 🥈 Solution 3 : AWS SES (Si vous avez déjà AWS)

Amazon Simple Email Service - 62,000 emails/mois gratuits.

#### Étapes :

1. Allez sur : https://console.aws.amazon.com/ses/
2. Vérifiez votre email/domaine
3. Créez des identifiants SMTP :
   - **Account Dashboard** → **Create SMTP credentials**
4. Notez le **SMTP username** et **SMTP password**

5. Configurez sur le VPS :
   ```bash
   bash ~/fix-vps-email.sh
   # Option 3 - AWS SES
   ```

---

## 🔍 Diagnostic

### Vérifier si les ports SMTP sont bloqués

Lancez depuis PowerShell :
```powershell
.\diagnose-email-vps.ps1
```

Le script vous dira :
- ✅ Port 587 OUVERT → OK
- ❌ Port 587 BLOQUÉ → OVH bloque les emails

### Si les ports sont bloqués par OVH :

1. **Solution immédiate** : Utilisez SendGrid (ne passe pas par les ports bloqués)

2. **Solution à long terme** : Contactez OVH pour débloquer les ports :
   - Créez un ticket sur : https://www.ovh.com/manager/
   - Demandez le déblocage des ports 587 et 465
   - Justifiez l'usage légitime (envoi d'emails transactionnels)
   - ⚠️ Peut prendre 24-48h

---

## 🧪 Tester l'envoi d'email

### Depuis le VPS :

```bash
ssh Webdesk@vps-3b4fd3be.vps.ovh.ca
bash ~/fix-vps-email.sh
# Choisir Option 5 - Tester
```

### Depuis votre application :

1. Ouvrez votre frontend
2. Tentez une action qui envoie un email :
   - Réinitialisation de mot de passe
   - Invitation utilisateur
   - Envoi de cotation
3. Vérifiez les logs :
   ```bash
   pm2 logs velosi-backend --lines 30
   ```

---

## 📋 Checklist de Résolution

- [ ] J'ai lancé `.\diagnose-email-vps.ps1` pour voir le diagnostic
- [ ] J'ai identifié le problème (ports bloqués / mauvais mot de passe)
- [ ] J'ai choisi ma solution (Gmail App Password / SendGrid / AWS SES)
- [ ] J'ai créé les identifiants nécessaires (App Password / API Key)
- [ ] J'ai lancé `bash ~/fix-vps-email.sh` sur le VPS
- [ ] J'ai configuré les nouveaux identifiants
- [ ] J'ai testé l'envoi d'email (Option 5 du script)
- [ ] J'ai vérifié les logs : `pm2 logs velosi-backend`
- [ ] ✅ Les emails sont envoyés avec succès !

---

## 🆘 Si ça ne marche toujours pas

### Vérifiez les logs détaillés :

```bash
pm2 logs velosi-backend --lines 50
```

Recherchez :
- `535` → Authentification échouée (mauvais mot de passe)
- `ETIMEDOUT` → Port bloqué
- `ECONNREFUSED` → Service SMTP inaccessible
- `Invalid login` → Identifiants incorrects

### Testez manuellement la connexion SMTP :

```bash
openssl s_client -connect smtp.gmail.com:587 -starttls smtp
# Puis tapez : EHLO localhost
# Puis tapez : QUIT
```

Si ça fonctionne → Le port n'est pas bloqué, c'est un problème d'authentification.
Si ça ne fonctionne pas → Le port est bloqué par OVH.

---

## 📞 Contacts

- **Support OVH** : https://www.ovh.com/manager/ (pour déblocage ports)
- **SendGrid Support** : https://support.sendgrid.com/
- **Gmail Support** : https://support.google.com/accounts/answer/185833

---

## 🎯 Recommandation Finale

**Pour un VPS en production, utilisez SendGrid ou AWS SES.**

Gmail est bien pour le développement local, mais pas optimal pour un serveur de production :
- Limites d'envoi strictes (500 emails/jour)
- Risque de blocage par Google
- Peut être considéré comme spam

SendGrid/AWS SES sont conçus pour les serveurs et offrent :
- Meilleure délivrabilité
- Statistiques d'envoi
- Pas de limite quotidienne restrictive
- Support technique dédié
