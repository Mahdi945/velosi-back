# 📧 Configuration SMTP pour Velosi ERP

## 📌 Vue d'ensemble

Le service email de Velosi ERP nécessite des credentials SMTP valides pour fonctionner. Ces informations **DOIVENT** être définies dans le fichier `.env` pour des raisons de sécurité.

## 🔐 Variables d'environnement requises

Ajoutez ces variables dans votre fichier `.env` :

```env
# Configuration SMTP pour l'envoi d'emails
SMTP_HOST=smtp.gmail.com          # Serveur SMTP
SMTP_PORT=587                     # Port SMTP (587 pour TLS, 465 pour SSL)
SMTP_SECURE=false                 # true pour port 465, false pour port 587
SMTP_USER=votre-email@gmail.com   # Email expéditeur
SMTP_PASSWORD=votre-mot-de-passe  # Mot de passe ou mot de passe d'application
SMTP_FROM_EMAIL=noreply@velosi.com # Email FROM (optionnel, par défaut = SMTP_USER)
SMTP_FROM_NAME=Velosi ERP         # Nom de l'expéditeur (optionnel, par défaut = "Velosi ERP")
```

## 📮 Fournisseurs SMTP supportés

### 1. Gmail

**Configuration :**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application
```

**⚠️ IMPORTANT : Mot de passe d'application requis**

Gmail requiert un **mot de passe d'application** (App Password) pour les applications tierces :

1. Accédez à votre compte Google : https://myaccount.google.com/
2. Activez la **vérification en 2 étapes** si ce n'est pas déjà fait
3. Allez dans **Sécurité** → **Mots de passe d'application**
4. Sélectionnez "Autre" et nommez l'application "Velosi ERP"
5. Copiez le mot de passe généré (16 caractères sans espaces)
6. Utilisez ce mot de passe dans `SMTP_PASSWORD`

📚 Guide officiel : https://support.google.com/accounts/answer/185833

---

### 2. Outlook / Office 365

**Configuration :**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@outlook.com
SMTP_PASSWORD=votre-mot-de-passe
```

**Notes :**
- Utilisez votre mot de passe de compte Outlook normal
- Si vous avez activé l'authentification à 2 facteurs, créez un mot de passe d'application

📚 Guide officiel : https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353

---

### 3. SendGrid (Recommandé pour production)

**Configuration :**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Avantages :**
- ✅ Gratuit jusqu'à 100 emails/jour
- ✅ Fiabilité professionnelle
- ✅ Statistiques détaillées
- ✅ Deliverability élevée

**Inscription :**
1. Créez un compte : https://signup.sendgrid.com/
2. Vérifiez votre email
3. Créez une API Key dans Settings → API Keys
4. Utilisez `apikey` comme username et votre API Key comme password

📚 Documentation : https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api

---

### 4. Mailgun

**Configuration :**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@votre-domaine.mailgun.org
SMTP_PASSWORD=votre-api-key
```

**Avantages :**
- ✅ Gratuit jusqu'à 5,000 emails/mois pendant 3 mois
- ✅ Validation d'emails
- ✅ Logs détaillés

📚 Documentation : https://documentation.mailgun.com/en/latest/user_manual.html#sending-via-smtp

---

## 🚀 Configuration recommandée par environnement

### 🛠️ Développement (localhost)

**Option 1 : Gmail** (Simple, gratuit)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-dev-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application
SMTP_FROM_EMAIL=noreply@velosi.com
SMTP_FROM_NAME=Velosi ERP [DEV]
```

**Option 2 : Mailtrap** (Testing SMTP - capture tous les emails)
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-mailtrap-username
SMTP_PASSWORD=votre-mailtrap-password
```

📚 Mailtrap : https://mailtrap.io/ (Gratuit, parfait pour le développement)

---

### 🌐 Production (Railway/Vercel)

**Option recommandée : SendGrid**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM_EMAIL=noreply@velosi.com
SMTP_FROM_NAME=Velosi ERP
```

**Alternative : Mailgun**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@votre-domaine.mailgun.org
SMTP_PASSWORD=votre-api-key
SMTP_FROM_EMAIL=noreply@velosi.com
SMTP_FROM_NAME=Velosi ERP
```

---

## 🧪 Tester la configuration SMTP

### Méthode 1 : Via l'API backend

1. Démarrez le backend :
```bash
npm run start:dev
```

2. Appelez l'endpoint de test (créez-en un temporaire) :
```typescript
// Dans un controller de test
@Get('test-email')
async testEmail(@Query('to') to: string) {
  const result = await this.emailService.sendEmail(
    to,
    'Test Email Velosi ERP',
    '<h1>Configuration SMTP réussie !</h1><p>Votre serveur email fonctionne correctement.</p>'
  );
  return { success: result };
}
```

### Méthode 2 : Via le script de test

Créez un fichier `test-smtp.ts` :
```typescript
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

async function testSMTP() {
  const transporter = nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'votre-email@gmail.com',
      pass: 'votre-mot-de-passe-application'
    }
  });

  try {
    // Vérifier la connexion
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie !');

    // Envoyer un email de test
    const info = await transporter.sendMail({
      from: 'votre-email@gmail.com',
      to: 'destinataire@example.com',
      subject: 'Test SMTP Velosi ERP',
      html: '<h1>Test réussi !</h1><p>Configuration SMTP fonctionnelle.</p>'
    });

    console.log('✅ Email envoyé avec succès !');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Erreur SMTP:', error);
  }
}

testSMTP();
```

Exécutez :
```bash
npx ts-node test-smtp.ts
```

---

## ❌ Dépannage des erreurs courantes

### Erreur : "SMTP_USER et SMTP_PASSWORD doivent être définis"

**Cause :** Variables d'environnement manquantes

**Solution :**
1. Vérifiez que le fichier `.env` existe dans `velosi-back/`
2. Ajoutez les variables `SMTP_USER` et `SMTP_PASSWORD`
3. Redémarrez le serveur backend

---

### Erreur : "Invalid login" ou "Authentication failed"

**Cause :** Identifiants incorrects ou mot de passe d'application requis

**Solutions :**
- **Gmail :** Utilisez un mot de passe d'application (App Password)
- **Outlook :** Vérifiez que l'authentification 2FA n'est pas bloquée
- Vérifiez qu'il n'y a pas d'espaces dans le mot de passe

---

### Erreur : "ECONNREFUSED" ou "Connection timeout"

**Cause :** Impossible de se connecter au serveur SMTP

**Solutions :**
1. Vérifiez que le serveur SMTP est correct (`SMTP_HOST`)
2. Vérifiez le port (`587` pour TLS, `465` pour SSL)
3. Vérifiez votre connexion Internet
4. Vérifiez que votre firewall n'est pas bloqué le port SMTP
5. Essayez avec `SMTP_PORT=465` et `SMTP_SECURE=true`

---

### Erreur : "Sender address rejected"

**Cause :** L'email FROM n'est pas autorisé par le serveur SMTP

**Solutions :**
- Utilisez l'email du compte SMTP comme `SMTP_FROM_EMAIL`
- Pour Gmail : l'email FROM doit correspondre à votre compte Gmail
- Pour SendGrid/Mailgun : vérifiez votre domaine expéditeur

---

## 🔒 Bonnes pratiques de sécurité

### ✅ À FAIRE

1. **Toujours utiliser le fichier `.env`** pour stocker les credentials
2. **Ne jamais committer le `.env`** dans Git (vérifiez `.gitignore`)
3. **Utiliser des mots de passe d'application** pour Gmail
4. **Changer les credentials régulièrement** (tous les 3-6 mois)
5. **Utiliser SendGrid/Mailgun en production** pour plus de fiabilité

### ❌ À NE PAS FAIRE

1. ❌ Ne jamais hardcoder les credentials dans le code
2. ❌ Ne jamais partager les mots de passe d'application
3. ❌ Ne jamais utiliser votre email personnel en production
4. ❌ Ne jamais committer les fichiers `.env` dans Git

---

## 📊 Comparatif des fournisseurs

| Fournisseur | Gratuit | Limite gratuite | Fiabilité | Recommandé pour |
|------------|---------|-----------------|-----------|-----------------|
| **Gmail** | ✅ | 500/jour | Bonne | Développement |
| **Outlook** | ✅ | 300/jour | Bonne | Développement |
| **SendGrid** | ✅ | 100/jour | Excellente | Production |
| **Mailgun** | ✅ | 5000/mois (3 mois) | Excellente | Production |
| **Mailtrap** | ✅ | 500/mois | N/A (testing) | Tests/Dev |

---

## 📚 Ressources supplémentaires

- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [Outlook SMTP Settings](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353)
- [SendGrid SMTP Guide](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)
- [Mailgun SMTP Guide](https://documentation.mailgun.com/en/latest/user_manual.html#sending-via-smtp)

---

## 💡 Support

Si vous rencontrez des problèmes de configuration SMTP :

1. Consultez les logs du backend dans la console
2. Vérifiez les logs de votre fournisseur SMTP
3. Testez avec un service comme Mailtrap pour isoler le problème
4. Contactez le support de votre fournisseur SMTP si nécessaire

---

**Dernière mise à jour :** ${new Date().toLocaleDateString('fr-FR')}
**Version :** 1.0.0
