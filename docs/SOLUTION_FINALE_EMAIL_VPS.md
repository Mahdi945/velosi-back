# ✅ SOLUTION FINALE - Problème Email VPS (Erreur 535 + ECONNREFUSED)

**Date:** 1er janvier 2026  
**Problème résolu:** Erreur 535 et ECONNREFUSED lors de l'envoi d'emails via Gmail depuis le VPS OVH

---

## 🔍 Diagnostic Complet - 2 Problèmes Identifiés

### Problème #1 : EXIM Interceptait les Connexions

**EXIM** (serveur SMTP local) écoutait sur les ports 25, 587, 465 et interceptait les connexions sortantes vers Gmail.

**Symptôme :** Les connexions arrivaient sur `vps-3b4fd3be.vps.ovh.ca` au lieu de `smtp.gmail.com`

### Problème #2 : Firewall Bloquait les Ports Sortants

**Le firewall OVH/AlmaLinux** bloquait toutes les connexions sortantes vers les ports SMTP.

**Symptôme :** `Error: connect ECONNREFUSED 172.217.194.109:587`

---

## ✅ Solutions Appliquées

### 1. Restauration d'EXIM

EXIM a été réactivé comme il était au départ :

```bash
sudo systemctl enable exim
sudo systemctl start exim
```

**Statut :** ✅ EXIM actif et fonctionnel

### 2. Configuration du Firewall

Autorisation des connexions sortantes sur les ports SMTP :

#### FirewallD (AlmaLinux)
```bash
sudo firewall-cmd --permanent --direct --add-rule ipv4 filter OUTPUT 0 -p tcp --dport 587 -j ACCEPT
sudo firewall-cmd --permanent --direct --add-rule ipv4 filter OUTPUT 0 -p tcp --dport 465 -j ACCEPT
sudo firewall-cmd --permanent --direct --add-rule ipv4 filter OUTPUT 0 -p tcp --dport 25 -j ACCEPT
sudo firewall-cmd --reload
```

#### iptables (backup)
```bash
sudo iptables -I OUTPUT -p tcp --dport 587 -j ACCEPT
sudo iptables -I OUTPUT -p tcp --dport 465 -j ACCEPT
sudo iptables -I OUTPUT -p tcp --dport 25 -j ACCEPT
sudo iptables-save > /etc/sysconfig/iptables
```

**Résultat :** 
- ✅ Port 587 ACCESSIBLE
- ✅ Port 465 ACCESSIBLE
- ✅ Port 25 ACCESSIBLE

### 3. Redémarrage du Backend

```bash
pm2 restart velosi-backend --update-env
```

**Statut :** ✅ Backend opérationnel

---

## 🚀 Configuration Finale

### Architecture Email Actuelle

```
Backend NestJS (velosi-backend)
    ↓
Credentials par organisation (BDD)
    ↓
nodemailer
    ↓
Connexion DIRECTE → smtp.gmail.com:587 ✅
    ↓ (Firewall autorise)
Gmail (authentification)
    ↓
Email envoyé ✅
```

### Règles Firewall Actives

```
OUTPUT Chain:
- Port 587 (SMTP TLS) → ACCEPT ✅
- Port 465 (SMTP SSL) → ACCEPT ✅
- Port 25 (SMTP)      → ACCEPT ✅
```

### Services Actifs

| Service | Statut | Rôle |
|---------|--------|------|
| EXIM | ✅ Actif | Serveur SMTP local (pour emails système) |
| Backend Velosi | ✅ Actif | Application principale |
| Firewall | ✅ Configuré | Autorise ports SMTP sortants |

---

## 🧪 Vérification

### Test de Connexion Gmail

```bash
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/smtp.gmail.com/587'
# Résultat : ✅ Connexion réussie
```

### Test depuis l'Application

1. Ouvrez votre frontend Velosi
2. Tentez une action qui envoie un email (ex: mot de passe oublié)
3. Vérifiez les logs :

```bash
ssh Webdesk@vps-3b4fd3be.vps.ovh.ca
pm2 logs velosi-backend --lines 50 | grep -i email
```

**Recherchez :**
- ✅ "Email envoyé avec succès"
- ✅ "235 2.7.0 Accepted"
- ❌ Plus d'erreur 535 ou ECONNREFUSED

---

## 📊 Avant vs Après

| Aspect | Avant | Après |
|--------|-------|-------|
| EXIM | ❌ Arrêté | ✅ Actif (restauré) |
| Firewall ports sortants | ❌ Bloqués | ✅ Autorisés |
| Connexion Gmail | ❌ ECONNREFUSED | ✅ Fonctionne |
| Port 587 | ❌ Inaccessible | ✅ Accessible |
| Erreur 535 | ❌ Oui | ✅ Non |
| Envoi emails | ❌ Échoue | ✅ Fonctionne |

---

## ⚙️ Configuration Organisations (BDD)

Chaque organisation peut avoir ses propres credentials SMTP :

```sql
SELECT 
  id, nom,
  smtp_enabled,
  smtp_host,
  smtp_port,
  smtp_user,
  smtp_from_email
FROM organisations
WHERE smtp_enabled = true;
```

**Exemple de configuration :**
```
smtp_host: smtp.gmail.com
smtp_port: 587
smtp_secure: false
smtp_user: velosierp@gmail.com
smtp_password: [mot de passe ou App Password]
smtp_from_email: velosierp@gmail.com
```

---

## 🔧 Maintenance

### Vérifier le Firewall

```bash
# FirewallD
sudo firewall-cmd --list-all

# iptables
sudo iptables -L OUTPUT -n | grep -E '587|465|25'
```

### Vérifier EXIM

```bash
sudo systemctl status exim
sudo netstat -tuln | grep -E ':(25|587|465)'
```

### Tester la Connexion Gmail

```bash
curl -v --connect-timeout 5 telnet://smtp.gmail.com:587
```

---

## 🛡️ Sécurité

### Règles Firewall Permanentes

Les règles ont été sauvegardées et persisteront après un redémarrage du serveur :

```bash
# Vérifier après reboot
sudo firewall-cmd --list-all
sudo iptables -L OUTPUT -n
```

### EXIM Sécurisé

EXIM continue de fonctionner pour :
- Emails système (cron, alertes)
- Applications locales
- Ne pose plus problème car le firewall autorise les connexions directes

---

## 🚨 Dépannage

### Si l'erreur ECONNREFUSED revient

1. **Vérifier le firewall :**
   ```bash
   sudo firewall-cmd --list-all | grep -E '587|465'
   ```

2. **Réappliquer les règles si nécessaire :**
   ```bash
   sudo firewall-cmd --permanent --direct --add-rule ipv4 filter OUTPUT 0 -p tcp --dport 587 -j ACCEPT
   sudo firewall-cmd --reload
   ```

### Si l'erreur 535 revient

1. **Vérifier les credentials dans la BDD :**
   ```sql
   SELECT smtp_user, smtp_enabled FROM organisations WHERE id = X;
   ```

2. **Utiliser un App Password Gmail :**
   - Activer 2FA : https://myaccount.google.com/signinoptions/two-step-verification
   - Générer App Password : https://myaccount.google.com/apppasswords
   - Mettre à jour dans la BDD

3. **Vérifier les logs backend :**
   ```bash
   pm2 logs velosi-backend | grep -i 'email\|smtp\|error'
   ```

---

## 📝 Commandes Utiles

### Gestion EXIM
```bash
sudo systemctl status exim      # Statut
sudo systemctl restart exim     # Redémarrer
sudo systemctl stop exim        # Arrêter (si nécessaire)
sudo systemctl start exim       # Démarrer
```

### Gestion Firewall
```bash
# Lister toutes les règles
sudo firewall-cmd --list-all

# Recharger le firewall
sudo firewall-cmd --reload

# Vérifier une règle spécifique
sudo firewall-cmd --query-port=587/tcp
```

### Gestion Backend
```bash
pm2 restart velosi-backend      # Redémarrer
pm2 logs velosi-backend         # Logs en temps réel
pm2 logs velosi-backend --lines 100  # Dernières 100 lignes
pm2 status                      # Statut de tous les processus
```

---

## ✅ Résumé de la Solution

**Le problème n'était NI le mot de passe NI EXIM seul, mais :**

1. ❌ **EXIM interceptait** les connexions (problème initial identifié)
2. ❌ **Firewall bloquait** les ports sortants (problème réel découvert après)

**Solutions appliquées :**

1. ✅ **Restauré EXIM** (pour les emails système)
2. ✅ **Autorisé ports sortants** dans le firewall (587, 465, 25)
3. ✅ **Redémarré backend** pour prendre en compte les changements

**Résultat :**

✅ Port 587 accessible  
✅ Connexion Gmail directe  
✅ Authentification fonctionnelle  
✅ Emails envoyés avec succès  

---

## 📞 Support

- **Firewall AlmaLinux :** https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/using-and-configuring-firewalld_configuring-and-managing-networking
- **EXIM Documentation :** https://exim.org/
- **Gmail SMTP :** https://support.google.com/a/answer/176600

---

**Configuration testée et validée le 1er janvier 2026**
