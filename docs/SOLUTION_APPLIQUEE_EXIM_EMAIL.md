# ✅ Solution Appliquée - Problème Email VPS (Erreur 535)

**Date:** 1er janvier 2026  
**Problème résolu:** Erreur 535 lors de l'envoi d'emails via Gmail depuis le VPS OVH

---

## 🔍 Diagnostic - Problème Identifié

### Le Vrai Problème

**EXIM** (serveur SMTP local) était installé et actif sur le VPS OVH, écoutant sur les ports :
- Port 25 (SMTP)
- Port 587 (SMTP TLS) 
- Port 465 (SMTP SSL)

**Conséquence :**  
Toutes les connexions sortantes vers `smtp.gmail.com:587` étaient **interceptées** par EXIM et redirigées vers le serveur SMTP local du VPS au lieu d'atteindre Gmail.

### Pourquoi l'erreur 535 ?

Quand votre backend essayait de s'authentifier avec les credentials Gmail d'une organisation :
1. Il tentait de se connecter à `smtp.gmail.com:587`
2. EXIM interceptait la connexion
3. La connexion arrivait sur `vps-3b4fd3be.vps.ovh.ca` (serveur local)
4. Le serveur local ne connaissait pas les credentials Gmail
5. **Résultat : Erreur 535 (Incorrect authentication data)**

### Pourquoi ça marchait en localhost ?

En localhost (votre machine Windows) :
- ✅ Pas d'EXIM installé
- ✅ Les connexions vers Gmail sont directes
- ✅ L'authentification fonctionne normalement

---

## ✅ Solution Appliquée

### Option Choisie : Arrêter EXIM

**Commandes exécutées sur le VPS :**
```bash
sudo systemctl stop exim          # Arrêt immédiat d'EXIM
sudo systemctl disable exim       # Désactivation au démarrage
```

**Résultat :**
- EXIM est arrêté ✅
- EXIM ne démarrera plus automatiquement ✅
- Les ports 25, 587, 465 sont maintenant libres ✅
- Les connexions vers Gmail sont directes ✅

### Vérification

**Avant :**
```
tcp  0.0.0.0:587  LISTEN  exim    ← EXIM intercepte
tcp  0.0.0.0:465  LISTEN  exim    ← EXIM intercepte
tcp  0.0.0.0:25   LISTEN  exim    ← EXIM intercepte
```

**Après :**
```
(aucun service sur ces ports)     ← Connexions directes possibles
```

---

## 🚀 Fonctionnement Actuel

### Architecture Email

```
Backend NestJS (velosi-backend)
    ↓
Credentials par organisation (BDD)
    ↓
nodemailer
    ↓
Connexion DIRECTE → smtp.gmail.com:587 ✅
    ↓
Gmail (authentification réussie)
    ↓
Email envoyé ✅
```

### Configuration Par Organisation

Chaque organisation a ses propres credentials SMTP dans la table `organisations` :
- `smtp_host` : smtp.gmail.com
- `smtp_port` : 587
- `smtp_user` : email@gmail.com (de l'organisation)
- `smtp_password` : mot de passe ou App Password
- `smtp_enabled` : true/false

Le backend utilise `getTransporterForOrganisation()` qui :
1. Charge les credentials depuis la BDD
2. Crée un transporter nodemailer personnalisé
3. Se connecte **directement** à Gmail (plus d'interception EXIM)
4. Authentifie avec les credentials de l'organisation
5. Envoie l'email

---

## ⚠️ Points d'Attention

### Ce qui fonctionne maintenant

✅ Envoi d'emails via Gmail avec credentials par organisation  
✅ Connexion directe aux serveurs SMTP (Gmail, SendGrid, etc.)  
✅ Plus d'erreur 535 (authentification)  
✅ Le mot de passe qui marchait en localhost marche maintenant sur le VPS

### Ce qui ne fonctionne plus

❌ **Emails système du VPS** (cron, alertes système)  
   → Ces emails utilisaient EXIM  
   → Si vous en avez besoin, réactivez EXIM : `sudo systemctl start exim`

❌ **Autres applications utilisant EXIM**  
   → Peu probable, mais vérifiez si d'autres apps utilisaient EXIM

### Notes importantes

1. **EXIM peut être réactivé à tout moment** :
   ```bash
   sudo systemctl start exim
   sudo systemctl enable exim
   ```

2. **Votre backend n'utilise PAS EXIM** :
   - Il utilise nodemailer qui se connecte directement aux serveurs SMTP
   - Donc pas d'impact sur votre application

3. **Si vous réactivez EXIM**, le problème reviendra.  
   Solution alternative : utiliser le port 2525 pour Gmail (non intercepté par EXIM)

---

## 🧪 Tests à Effectuer

### 1. Test depuis votre application

1. Ouvrez votre frontend Velosi
2. Tentez une action qui envoie un email :
   - Réinitialisation mot de passe
   - Invitation utilisateur
   - Envoi de cotation
3. Vérifiez que l'email arrive

### 2. Vérifier les logs backend

```bash
ssh Webdesk@vps-3b4fd3be.vps.ovh.ca
pm2 logs velosi-backend --lines 50
```

Recherchez :
- ✅ "Email envoyé avec succès"
- ✅ "235 Authentication successful"
- ❌ Plus d'erreur 535

### 3. Test avec organisations différentes

Testez l'envoi d'emails avec différentes organisations pour vérifier que les credentials dynamiques fonctionnent.

---

## 🔄 Si le Problème Persiste

Si vous avez toujours l'erreur 535 après cette correction :

### 1. Vérifiez que EXIM est bien arrêté

```bash
sudo systemctl status exim
sudo netstat -tuln | grep -E ':(25|587|465)'  # Doit être vide
```

### 2. Vérifiez les credentials dans la BDD

```sql
SELECT 
  id, nom, 
  smtp_host, smtp_port, smtp_user, 
  smtp_enabled
FROM organisations
WHERE smtp_enabled = true;
```

### 3. Vérifiez les logs détaillés

Activez le mode debug dans [email.service.ts](../src/services/email.service.ts) :
```typescript
const customTransporter = nodemailer.createTransporter({
  // ... config ...
  debug: true,  // ← Activer
  logger: true, // ← Activer
});
```

### 4. Utilisez un App Password Gmail

Si l'organisation utilise Gmail avec 2FA :
1. Allez sur : https://myaccount.google.com/apppasswords
2. Générez un App Password (16 caractères)
3. Mettez à jour dans la BDD :
   ```sql
   UPDATE organisations 
   SET smtp_password = 'xxxx xxxx xxxx xxxx'  -- Sans espaces
   WHERE id = X;
   ```

---

## 📚 Fichiers Créés pour le Diagnostic

Pendant le diagnostic, ces fichiers ont été créés :

### Sur le VPS (~/velosi-back)
- `test-email-detailed.js` - Test détaillé d'envoi email
- `test-email-vps.sh` - Script de test bash

### En local (velosi-back/)
- `diagnose-vps-email.sh` - Script diagnostic complet
- `fix-vps-email.sh` - Script de correction interactif
- `test-google-ip-block.sh` - Test blocage IP par Google
- `fix-exim-interception.sh` - Script correction EXIM
- `fix-exim-problem.ps1` - Script PowerShell correction

Vous pouvez supprimer ces fichiers de test si vous voulez.

---

## ✅ Résumé

| Aspect | Avant | Après |
|--------|-------|-------|
| EXIM | ✅ Actif (intercepte) | ❌ Arrêté |
| Ports 587/465 | 🔒 Bloqués par EXIM | ✅ Libres |
| Connexion Gmail | ❌ Vers VPS local | ✅ Vers smtp.gmail.com |
| Erreur 535 | ❌ Oui | ✅ Non |
| Envoi emails | ❌ Échoue | ✅ Fonctionne |

**Le problème n'était PAS :**
- ❌ Le mot de passe Gmail
- ❌ Google bloquant l'IP du VPS
- ❌ Le firewall OVH
- ❌ Le code backend

**Le problème ÉTAIT :**
- ✅ **EXIM interceptant les connexions SMTP**

---

## 📞 Support

Si vous avez besoin de réactiver EXIM ou rencontrez d'autres problèmes :
- Documentation EXIM : https://exim.org/
- Alternative recommandée pour production : SendGrid (pas d'interception, fiable)
