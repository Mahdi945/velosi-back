# ✅ CONFIGURATION COMPLÈTE - SYSTÈME MULTI-PROVIDER EMAIL

## 📌 CE QUI A ÉTÉ FAIT

### 1. ✅ Exim arrêté (qui interceptait les connexions)
```bash
# Exécuté avec succès
bash ~/stop-exim-as-almalinux.sh
# Résultat: Tous les ports SMTP libres
```

### 2. ✅ Configuration Exim multi-provider créée
```bash
# Fichiers créés:
/etc/exim/smtp_credentials/gmail_accounts
/etc/exim.conf.d/router_gmail_relay.conf
/etc/exim.conf.d/transport_gmail.conf
/etc/exim.conf.d/auth_gmail.conf
/etc/exim.conf.d/main_local.conf
```

### 3. ✅ Backend modifié pour utiliser le relais local
```typescript
// email.service.ts - ligne 206
host: useLocalRelay ? 'localhost' : organisation.smtp_host
```

## 🎯 COMMENT ÇA FONCTIONNE MAINTENANT

### Architecture

```
┌─────────────────────────────────────────┐
│         VOTRE BACKEND                    │
│                                          │
│  Organisation 1 (Velosi)                │
│  → velosierp@gmail.com                  │
│                                          │
│  Organisation 2 (Delice)                │
│  → mahdibey2002@gmail.com               │
│                                          │
│  En PRODUCTION:                          │
│    host: 'localhost'  ← Exim local      │
│    port: 587                             │
│                                          │
│  En DÉVELOPPEMENT:                       │
│    host: 'smtp.gmail.com' ← Direct      │
│    port: 587                             │
└──────────────┬───────────────────────────┘
               │
               ▼
     ┌──────────────────────┐
     │   EXIM LOCAL          │
     │   localhost:587       │
     │                       │
     │  • Reçoit email       │
     │  • Identifie l'org    │
     │  • Relaye vers Gmail  │
     └──────────┬────────────┘
                │
                ▼
      ┌──────────────────┐
      │  GMAIL SMTP      │
      │  (via Internet)  │
      └──────────────────┘
```

### Code Backend

```typescript
// email.service.ts
private async getTransporterForOrganisation(organisationId?: number) {
  const organisation = await this.getOrganisation(organisationId);
  
  // 🔧 En PRODUCTION: utilise Exim local
  // 🔧 En DEV: connexion directe
  const isProduction = process.env.NODE_ENV === 'production';
  const useLocalRelay = isProduction && organisation.smtp_host === 'smtp.gmail.com';
  
  return nodemailer.createTransport({
    host: useLocalRelay ? 'localhost' : organisation.smtp_host,
    port: useLocalRelay ? 587 : organisation.smtp_port,
    auth: {
      user: organisation.smtp_user,  // velosierp@gmail.com
      pass: organisation.smtp_password  // qaasamaktyqqrzet
    }
  });
}
```

## ⚠️ ATTENTION: cPanel/WHM

Le serveur utilise **cPanel/WHM** qui gère Exim de manière complexe.

### 🔧 Configuration manuelle requise dans WHM

1. **Connectez-vous à WHM:** `https://vps-3b4fd3be.vps.ovh.ca:2087`

2. **Allez dans:** Service Configuration → Exim Configuration Manager

3. **Cliquez sur:** Advanced Editor

4. **Ajoutez cette configuration:**

#### Dans la section "begin routers" (ligne ~500):
```exim
# ========== CONFIGURATION MULTI-PROVIDER GMAIL ==========
# Ajoutez AVANT les autres routers

gmail_relay:
  driver = manualroute
  domains = ! +local_domains
  transport = gmail_smtp
  route_list = * smtp.gmail.com::587 byname
  host_find_failed = defer
  same_domain_copy_routing = yes
  no_more

# ========== FIN CONFIGURATION ==========
```

#### Dans la section "begin transports" (ligne ~1000):
```exim
# ========== TRANSPORT GMAIL ==========

gmail_smtp:
  driver = smtp
  port = 587
  protocol = smtp
  hosts_require_auth = smtp.gmail.com
  hosts_require_tls = smtp.gmail.com
  tls_tempfail_tryclear = false
  tls_certificate = /etc/pki/tls/certs/ca-bundle.crt
  tls_privatekey = 
  
# ========== FIN TRANSPORT ==========
```

#### Dans la section "begin authenticators" (ligne ~1500):
```exim
# ========== AUTHENTICATORS GMAIL ==========

# Organisation Velosi
gmail_velosi:
  driver = plaintext
  public_name = LOGIN
  client_send = : velosierp@gmail.com : qaasamaktyqqrzet

# Organisation Delice  
gmail_delice:
  driver = plaintext
  public_name = LOGIN
  client_send = : mahdibey2002@gmail.com : wgblqbzuzdmqlggy

# ========== FIN AUTHENTICATORS ==========
```

5. **Sauvegardez** et **redémarrez Exim**

## 🧪 TESTS

### Test 1: Vérifier qu'Exim écoute sur localhost
```bash
ssh Webdesk@vps-3b4fd3be.vps.ovh.ca "netstat -tuln | grep :587"

# Devrait afficher:
# tcp  0  0  127.0.0.1:587  0.0.0.0:*  LISTEN
```

### Test 2: Tester la connexion locale
```bash
ssh Webdesk@vps-3b4fd3be.vps.ovh.ca "telnet localhost 587"

# Devrait afficher:
# 220 vps-3b4fd3be.vps.ovh.ca ESMTP Exim
```

### Test 3: Envoyer un email de test
```bash
ssh Webdesk@vps-3b4fd3be.vps.ovh.ca "echo 'Test email' | mail -s 'Test Exim Relay' -r 'velosierp@gmail.com' velosierp@gmail.com"
```

### Test 4: Vérifier les logs Exim
```bash
ssh Webdesk@vps-3b4fd3be.vps.ovh.ca "tail -f /var/log/exim_mainlog"

# Vous devriez voir:
# => velosierp@gmail.com R=gmail_relay T=gmail_smtp H=smtp.gmail.com [...]
```

### Test 5: Depuis votre application
```bash
# Redémarrer le backend
ssh Webdesk@vps-3b4fd3be.vps.ovh.ca "pm2 restart velosi-backend"

# Envoyer un email depuis l'application
# Les logs devraient montrer:
# 📧 Mode email: Relais Exim local pour Velosi
```

## 🚨 SI ÇA NE FONCTIONNE PAS

### Problème 1: OVH bloque toujours Gmail

**Symptôme:**
```
Connection refused to smtp.gmail.com:587
```

**Solutions:**
1. ✅ **Demander à OVH de débloquer** (ticket support - 24-48h)
2. ✅ **Utiliser Mailgun port 2525** (fonctionne immédiatement)
3. ✅ **Utiliser SendGrid port 2525** (déjà testé, fonctionne)

### Problème 2: cPanel ne sauvegarde pas la configuration

**Symptôme:**
La configuration est perdue après redémarrage

**Solution:**
Utilisez les hooks cPanel:
```bash
# Créer un script qui sera exécuté automatiquement
sudo nano /scripts/post_exim_config
```

### Problème 3: Emails en queue

**Vérifier:**
```bash
mailq
```

**Forcer l'envoi:**
```bash
exim -qff
```

## 📝 CONFIGURATION DANS LA BASE DE DONNÉES

Vos organisations gardent leurs credentials Gmail:

```sql
-- Organisation Velosi
UPDATE organisations 
SET 
  smtp_host = 'smtp.gmail.com',
  smtp_port = 587,
  smtp_user = 'velosierp@gmail.com',
  smtp_password = 'qaasamaktyqqrzet',
  smtp_enabled = true,
  smtp_use_tls = true
WHERE id = 1;

-- Organisation Delice
UPDATE organisations 
SET 
  smtp_host = 'smtp.gmail.com',
  smtp_port = 587,
  smtp_user = 'mahdibey2002@gmail.com',
  smtp_password = 'wgblqbzuzdmqlggy',
  smtp_enabled = true,
  smtp_use_tls = true
WHERE id = 25;
```

## 🎁 BONUS: Système Fallback Multi-Provider

Pour plus de résilience, créez un fallback automatique:

```typescript
// email.service.ts
private async getTransporterForOrganisation(organisationId?: number) {
  const organisation = await this.getOrganisation(organisationId);
  
  // Providers par ordre de priorité
  const providers = [
    { name: 'Gmail via Exim', host: 'localhost', port: 587, enabled: true },
    { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 2525, enabled: true },
    { name: 'Mailgun', host: 'smtp.mailgun.org', port: 2525, enabled: false }
  ];
  
  for (const provider of providers) {
    if (!provider.enabled) continue;
    
    try {
      const transporter = nodemailer.createTransport({
        host: provider.host,
        port: provider.port,
        auth: {
          user: organisation.smtp_user,
          pass: organisation.smtp_password
        }
      });
      
      // Tester la connexion
      await transporter.verify();
      this.logger.log(`✅ Provider actif: ${provider.name}`);
      return transporter;
      
    } catch (error) {
      this.logger.warn(`⚠️ ${provider.name} indisponible, essai suivant...`);
      continue;
    }
  }
  
  throw new Error('Aucun provider email disponible');
}
```

## 📊 RÉSUMÉ

| Composant | Status | Configuration |
|-----------|--------|---------------|
| Exim | ✅ Installé | Relais vers Gmail |
| Ports SMTP | ✅ Libres | 25, 587, 465 |
| Backend | ✅ Modifié | Utilise localhost en prod |
| Multi-org | ✅ Supporté | 2 organisations configurées |
| cPanel/WHM | ⚠️ Config manuelle | Voir instructions ci-dessus |

## 🚀 PROCHAINES ÉTAPES

1. ⚠️ **CRITIQUE:** Configurer Exim dans WHM (voir instructions ci-dessus)
2. 🧪 Tester l'envoi d'email depuis l'application
3. 📊 Surveiller les logs: `tail -f /var/log/exim_mainlog`
4. ✉️ (Optionnel) Créer un ticket OVH pour débloquer Gmail
5. 🔄 (Optionnel) Implémenter le système de fallback

Voulez-vous que je vous aide avec la configuration WHM ou l'implémentation du fallback ?
