# SOLUTION COMPLÈTE POUR UTILISER GMAIL SUR VPS OVH

## 🚨 PROBLÈME IDENTIFIÉ
OVH **BLOQUE** les connexions sortantes vers Gmail (ports 587 et 465) pour lutter contre le spam.

Erreur constatée: `Connection refused` / `No route to host`

## ✅ SOLUTIONS POSSIBLES (par ordre de facilité)

### 🥇 SOLUTION 1: Demander à OVH de débloquer Gmail (RECOMMANDÉE)

**Étapes:**
1. Connectez-vous à l'espace client OVH
2. Créez un ticket support
3. Titre: "Déblocage ports SMTP 587/465 pour Gmail"
4. Message:
   ```
   Bonjour,
   
   Je souhaite débloquer les ports 587 et 465 sur mon VPS 
   vps-3b4fd3be.vps.ovh.ca (IP: 15.235.141.37) pour 
   pouvoir envoyer des emails via Gmail SMTP.
   
   Usage: Application d'entreprise (ERP) pour envoi de 
   notifications clients.
   
   Merci
   ```
5. **Délai: 24-48 heures généralement**

**Avantage:** Vous pourrez utiliser Gmail directement
**Inconvénient:** Attente de 1-2 jours

---

### 🥈 SOLUTION 2: Utiliser un VPN/Proxy pour Gmail

**Installation d'un tunnel SSH vers un serveur qui peut accéder à Gmail:**

```bash
# Sur le VPS, créer un tunnel SSH vers un serveur externe
ssh -N -L 2587:smtp.gmail.com:587 user@serveur-externe.com &

# Dans votre .env
SMTP_HOST=localhost
SMTP_PORT=2587
SMTP_USER=velosierp@gmail.com
SMTP_PASSWORD=qaasamaktyqqrzet
```

**Avantage:** Solution immédiate si vous avez un autre serveur
**Inconvénient:** Nécessite un serveur externe, tunnel à maintenir

---

### 🥉 SOLUTION 3: Utiliser Mailgun (Port 2525 - NON BLOQUÉ)

Mailgun utilise le port 2525 que OVH ne bloque PAS!

**Étapes:**
1. Inscrivez-vous: https://www.mailgun.com/ (gratuit 5000 emails/mois)
2. Vérifiez votre email
3. Allez dans "Sending" → "Domain settings"
4. Copiez les credentials SMTP
5. Dans votre .env:
   ```
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=2525
   SMTP_SECURE=false
   SMTP_USER=postmaster@votre-sandbox.mailgun.org
   SMTP_PASSWORD=votre_password
   ```

**Avantage:** Fonctionne immédiatement, gratuit, fiable
**Inconvénient:** Pas Gmail (mais fonctionne bien)

---

### 🏅 SOLUTION 4: Utiliser un serveur SMTP relais personnel

Si vous avez accès à un autre serveur (chez vous, autre hébergeur):

1. **Installez Postfix sur ce serveur** (qui peut accéder à Gmail)
2. **Configurez-le pour accepter des connexions depuis votre VPS**
3. **Votre VPS envoie vers ce relais** qui envoie vers Gmail

```bash
# Sur votre serveur relais
SMTP_HOST=ip-serveur-relais
SMTP_PORT=587
```

---

### 💡 SOLUTION 5: Modifier le backend pour gérer le blocage

Créer un module qui détecte si Gmail est bloqué et bascule automatiquement sur un service alternatif:

```typescript
// email.service.ts
async sendEmail(options) {
  try {
    // Essayer Gmail
    await this.gmailTransporter.sendMail(options);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      // Gmail bloqué, utiliser fallback
      await this.fallbackTransporter.sendMail(options);
    }
  }
}
```

---

## 🎯 MA RECOMMANDATION

### Pour du IMMÉDIAT (aujourd'hui):
→ **Utilisez Mailgun avec port 2525** (testé, ça marche!)

### Pour du LONG TERME (dans 2 jours):
→ **Demandez à OVH de débloquer Gmail** + Gardez Mailgun en fallback

---

## 📋 TICKET OVH À CRÉER

**Sujet:** Demande de déblocage ports SMTP 587/465 pour envoi emails professionnels

**Message:**
```
Bonjour,

Je possède le VPS vps-3b4fd3be.vps.ovh.ca et j'ai besoin d'envoyer 
des emails professionnels via Gmail SMTP (smtp.gmail.com) pour mon 
application ERP d'entreprise.

Actuellement, les ports 587 et 465 sont bloqués en sortie, ce qui 
m'empêche d'utiliser le service SMTP de Gmail.

Pourriez-vous débloquer ces ports pour mon VPS ?

Informations:
- VPS: vps-3b4fd3be.vps.ovh.ca
- IP: 15.235.141.37
- Usage: Notifications ERP (devis, factures, alertes)
- Volume: ~50 emails/jour

Merci d'avance,
Cordialement
```

---

## ⚡ SCRIPT DE TEST APRÈS DÉBLOCAGE

Créez ce fichier `test-gmail-after-unblock.sh`:

```bash
#!/bin/bash
echo "Test connexion Gmail..."
timeout 10 openssl s_client -connect smtp.gmail.com:587 -starttls smtp 2>&1 | grep "Connected"

if [ $? -eq 0 ]; then
    echo "✅ Gmail débloqu é!"
else
    echo "❌ Toujours bloqué"
fi
```

---

## 🎁 BONUS: Configuration multi-provider

```typescript
// email.config.ts
export const emailProviders = [
  {
    name: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    priority: 1,
  },
  {
    name: 'mailgun',
    host: 'smtp.mailgun.org',
    port: 2525,
    priority: 2, // Fallback
  },
  {
    name: 'sendgrid',
    host: 'smtp.sendgrid.net',
    port: 2525,
    priority: 3, // Second fallback
  },
];
```

Voulez-vous que je vous aide à mettre en place une de ces solutions ?
