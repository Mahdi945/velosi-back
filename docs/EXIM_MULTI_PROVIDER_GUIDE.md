# SYSTÈME MULTI-PROVIDER EMAIL AVEC EXIM

## 🎯 OBJECTIF
Permettre à chaque organisation d'utiliser son propre compte Gmail via un relais Exim local, contournant le blocage OVH des ports SMTP.

## 📊 ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOTRE BACKEND (Node.js)                      │
│                                                                  │
│  ┌────────────────┐         ┌────────────────┐                 │
│  │ Organisation 1 │         │ Organisation 2 │                 │
│  │ Velosi         │         │ Delice         │                 │
│  │ velosierp@     │         │ mahdibey2002@  │                 │
│  └───────┬────────┘         └───────┬────────┘                 │
│          │                          │                           │
│          └──────────┬───────────────┘                           │
│                     │                                           │
│                     ▼                                           │
│          ┌─────────────────────┐                                │
│          │  email.service.ts   │                                │
│          │  host: localhost    │  ← Envoie vers Exim local     │
│          │  port: 587          │                                │
│          └──────────┬──────────┘                                │
└─────────────────────┼──────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────┐
        │   EXIM (Relais Local)   │
        │   127.0.0.1:587         │
        │                         │
        │  • Reçoit email         │
        │  • Identifie org        │
        │  • Utilise credentials  │
        └────────┬────────────────┘
                 │
                 │ Relaye vers Gmail
                 │ (contourne blocage OVH)
                 │
                 ▼
    ┌────────────────────────────┐
    │   GMAIL SMTP (Internet)    │
    │   smtp.gmail.com:587       │
    │                            │
    │  Organisation 1 →          │
    │  velosierp@gmail.com       │
    │                            │
    │  Organisation 2 →          │
    │  mahdibey2002@gmail.com    │
    └────────────────────────────┘
```

## 🔧 COMMENT ÇA FONCTIONNE

### 1. Backend envoie à Exim local
```typescript
// email.service.ts
const transporter = nodemailer.createTransport({
  host: 'localhost',  // ← Exim local, pas Gmail direct
  port: 587,
  auth: {
    user: organisation.smtp_user,     // velosierp@gmail.com
    pass: organisation.smtp_password, // qaasamaktyqqrzet
  }
});
```

### 2. Exim reçoit et authentifie
```
Backend → Exim (localhost:587)
         • Exim vérifie les credentials
         • Accepte l'email car vient de localhost
```

### 3. Exim relaye vers Gmail
```
Exim → Gmail (smtp.gmail.com:587)
      • Utilise les credentials de l'organisation
      • Gmail reçoit l'email
      • Email envoyé avec le bon expéditeur
```

## ⚙️ CONFIGURATION

### Étape 1: Configurer Exim

Exécutez le script:
```bash
bash configure-exim-multi-provider.sh
```

### Étape 2: Modifier le Backend

Dans `src/services/email.service.ts`:

```typescript
private async createTransporter(organisation: Organisation) {
  // AU LIEU DE:
  // host: organisation.smtp_host,  // smtp.gmail.com (bloqué par OVH)
  
  // UTILISEZ:
  host: 'localhost',  // Exim local qui relayera
  port: 587,
  secure: false,
  auth: {
    user: organisation.smtp_user,
    pass: organisation.smtp_password,
  },
  tls: {
    rejectUnauthorized: false,
  }
}
```

### Étape 3: Configuration dans la base de données

Chaque organisation garde ses credentials Gmail:

```sql
-- Organisation Velosi
smtp_host = 'smtp.gmail.com'  -- ← Gardez Gmail (pour référence)
smtp_port = 587
smtp_user = 'velosierp@gmail.com'
smtp_password = 'qaasamaktyqqrzet'

-- Organisation Delice
smtp_host = 'smtp.gmail.com'
smtp_port = 587
smtp_user = 'mahdibey2002@gmail.com'
smtp_password = 'wgblqbzuzdmqlggy'
```

**Important:** Dans le code, remplacez dynamiquement `smtp_host` par `localhost`.

## 🔒 SÉCURITÉ

### Pourquoi c'est sûr?

1. **Exim n'écoute que sur localhost**
   - Pas accessible depuis Internet
   - Seul votre backend peut y accéder

2. **Authentification requise**
   - Exim vérifie les credentials avant de relayer
   - Empêche l'utilisation non autorisée

3. **Credentials chiffrés**
   - Connexion TLS vers Gmail
   - Mots de passe App Password (pas le vrai mot de passe Gmail)

## 📝 CONFIGURATION AVANCÉE: Multi-Organisation

### Option A: Un authenticator par organisation

```exim
# Dans /etc/exim/exim.conf - section authenticators

# Organisation Velosi
gmail_velosi:
  driver = plaintext
  public_name = LOGIN
  server_condition = ${if eq{$auth2}{velosierp@gmail.com}{yes}{no}}
  client_send = : velosierp@gmail.com : qaasamaktyqqrzet

# Organisation Delice
gmail_delice:
  driver = plaintext
  public_name = LOGIN
  server_condition = ${if eq{$auth2}{mahdibey2002@gmail.com}{yes}{no}}
  client_send = : mahdibey2002@gmail.com : wgblqbzuzdmqlggy
```

### Option B: Lookup dans un fichier (RECOMMANDÉ)

Créez `/etc/exim/smtp_credentials/gmail_accounts`:
```
# Format: sender_email:smtp_user:smtp_password
velosierp@gmail.com:velosierp@gmail.com:qaasamaktyqqrzet
mahdibey2002@gmail.com:mahdibey2002@gmail.com:wgblqbzuzdmqlggy
```

Configuration Exim:
```exim
gmail_auth:
  driver = plaintext
  public_name = LOGIN
  client_send = : ${lookup{$sender_address}lsearch{/etc/exim/smtp_credentials/gmail_accounts}{$value}{}}
```

## 🧪 TESTS

### Test 1: Connexion à Exim local
```bash
telnet localhost 587
# Devrait répondre: 220 ... ESMTP Exim
```

### Test 2: Envoi via commande mail
```bash
echo "Test email" | mail -s "Test Exim" -r "velosierp@gmail.com" destination@example.com
```

### Test 3: Logs Exim
```bash
tail -f /var/log/exim_mainlog
```

Vous devriez voir:
```
=> destination@example.com R=gmail_relay T=gmail_smtp H=smtp.gmail.com [...]
```

### Test 4: Depuis votre application
```typescript
// Testez l'envoi depuis votre backend
await emailService.sendEmail({
  to: 'test@example.com',
  subject: 'Test multi-provider',
  organisationId: 1  // Velosi
});
```

## 🐛 TROUBLESHOOTING

### Erreur: "Connection refused" vers localhost
```bash
# Vérifier qu'Exim écoute sur 587
netstat -tuln | grep :587

# Devrait afficher:
# tcp  0  0  127.0.0.1:587  0.0.0.0:*  LISTEN
```

**Solution:** Redémarrer Exim
```bash
sudo systemctl restart exim
```

### Erreur: "Authentication failed"
```bash
# Vérifier les credentials dans le fichier
cat /etc/exim/smtp_credentials/gmail_accounts

# Tester l'authentification manuellement
exim -bP authenticators
```

**Solution:** Vérifier que les credentials sont corrects

### Erreur: "Relay access denied"
```bash
# Vérifier la configuration ACL
exim -bP acl_smtp_rcpt
```

**Solution:** S'assurer que localhost est dans `relay_from_hosts`

### Emails bloqués par Gmail
```bash
# Consulter les logs Exim
tail -100 /var/log/exim_mainlog | grep "smtp.gmail.com"
```

**Causes possibles:**
1. App Password invalide → Régénérer
2. IP VPS bloquée par Google → Attendre 24h ou contacter Google
3. Limite d'envoi dépassée → Attendre reset quotidien

## 🚀 ALTERNATIVES SI EXIM NE FONCTIONNE PAS

### Alternative 1: Proxy SOCKS5
```typescript
// Dans email.service.ts
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  proxy: 'socks5://proxy-server:1080',  // Via proxy externe
  auth: { ... }
});
```

### Alternative 2: API Gmail directe
```typescript
import { google } from 'googleapis';

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
await gmail.users.messages.send({ ... });
```

### Alternative 3: Service tiers (Mailgun, SendGrid)
```typescript
// Déjà configuré et fonctionnel sur votre VPS
host: 'smtp.sendgrid.net',
port: 2525,  // Non bloqué par OVH!
```

## 📌 RÉSUMÉ

✅ **Avantages du système multi-provider avec Exim:**
- Chaque organisation utilise son propre Gmail
- Contourne le blocage OVH
- Centralisé et facile à gérer
- Support de multiples providers

❌ **Inconvénients:**
- Configuration Exim complexe (surtout avec cPanel)
- Nécessite accès root au serveur
- Dépend d'un service local

💡 **Recommandation:**
- **Court terme:** Utilisez SendGrid (déjà configuré, fonctionne)
- **Moyen terme:** Configurez Exim pour multi-provider
- **Long terme:** Demandez à OVH de débloquer Gmail

Voulez-vous que je vous aide à implémenter une de ces solutions dans votre backend ?
