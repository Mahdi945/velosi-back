#!/bin/bash
# Configuration de Postfix comme relais SMTP vers Gmail
# Permet d'utiliser Gmail même quand OVH bloque les ports 587/465

echo "=========================================================================="
echo "🔧 CONFIGURATION POSTFIX COMME RELAIS GMAIL"
echo "=========================================================================="
echo ""

GMAIL_USER="velosierp@gmail.com"
GMAIL_PASS="qaasamaktyqqrzet"

echo "Cette configuration va:"
echo "  1. Installer Postfix"
echo "  2. Le configurer comme relais vers Gmail"
echo "  3. Votre backend enverra vers localhost:25"
echo "  4. Postfix relayera vers Gmail"
echo ""

# 1. Installer Postfix
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Installation de Postfix..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v postfix &> /dev/null; then
    echo "Installation de Postfix..."
    echo "Offline2025" | sudo -S yum install -y postfix cyrus-sasl-plain mailx
    echo "✓ Postfix installé"
else
    echo "✓ Postfix déjà installé"
fi

# 2. Arrêter Postfix pour configuration
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Arrêt de Postfix pour configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Offline2025" | sudo -S systemctl stop postfix

# 3. Backup configuration existante
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Sauvegarde configuration existante..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Offline2025" | sudo -S cp /etc/postfix/main.cf /etc/postfix/main.cf.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
echo "✓ Backup créé"

# 4. Créer la configuration Postfix
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Configuration de Postfix pour Gmail..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat << 'POSTFIX_CONFIG' | sudo tee /etc/postfix/main.cf > /dev/null
# Configuration Postfix comme relais Gmail
# Généré automatiquement

# Paramètres de base
myhostname = vps-3b4fd3be.vps.ovh.ca
mydomain = vps.ovh.ca
myorigin = $mydomain
inet_interfaces = localhost
inet_protocols = ipv4
mydestination =

# Taille maximale des messages (50 MB)
message_size_limit = 52428800

# Relais via Gmail
relayhost = [smtp.gmail.com]:587

# Authentification SASL
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_sasl_mechanism_filter = plain

# TLS/SSL
smtp_use_tls = yes
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-bundle.crt
smtp_tls_loglevel = 1

# Headers
smtp_header_checks = regexp:/etc/postfix/header_checks

# Logs
maillog_file = /var/log/postfix.log
POSTFIX_CONFIG

echo "✓ Configuration Postfix créée"

# 5. Créer le fichier de mots de passe
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Configuration des credentials Gmail..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "[smtp.gmail.com]:587 $GMAIL_USER:$GMAIL_PASS" | sudo tee /etc/postfix/sasl_passwd > /dev/null
echo "Offline2025" | sudo -S chmod 600 /etc/postfix/sasl_passwd
echo "Offline2025" | sudo -S postmap /etc/postfix/sasl_passwd
echo "✓ Credentials configurés et hashés"

# 6. Créer header_checks pour éviter les problèmes
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Configuration des headers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat << 'HEADER_CHECKS' | sudo tee /etc/postfix/header_checks > /dev/null
# Nettoyer les headers sensibles
/^Received:/            IGNORE
/^X-Originating-IP:/    IGNORE
/^X-Mailer:/            IGNORE
/^User-Agent:/          IGNORE
HEADER_CHECKS

echo "✓ Headers configurés"

# 7. Démarrer Postfix
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Démarrage de Postfix..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Offline2025" | sudo -S systemctl start postfix
echo "Offline2025" | sudo -S systemctl enable postfix

sleep 3

if systemctl is-active postfix &>/dev/null; then
    echo "✅ Postfix démarré avec succès"
else
    echo "❌ Erreur au démarrage de Postfix"
    echo "Offline2025" | sudo -S journalctl -u postfix -n 20 --no-pager
    exit 1
fi

# 8. Test de la configuration
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  Test de la configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Test envoi email via Postfix..."
echo "Test email depuis VPS via Postfix relay Gmail - $(date)" | mail -s "Test Postfix Relay Gmail" velosierp@gmail.com

if [ $? -eq 0 ]; then
    echo "✅ Email de test envoyé"
    echo ""
    echo "Vérifiez votre boîte mail: velosierp@gmail.com"
    echo ""
    echo "Consultez les logs:"
    echo "  tail -f /var/log/postfix.log"
else
    echo "❌ Erreur lors de l'envoi"
fi

# 9. Mettre à jour le backend
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9️⃣  Configuration backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "IMPORTANT: Mettez à jour votre .env avec:"
echo ""
echo "  SMTP_HOST=localhost"
echo "  SMTP_PORT=25"
echo "  SMTP_SECURE=false"
echo "  SMTP_USER="
echo "  SMTP_PASSWORD="
echo ""
echo "Ou gardez les credentials Gmail pour que Postfix les utilise:"
echo "  SMTP_HOST=smtp.gmail.com"
echo "  SMTP_PORT=587"
echo "  SMTP_USER=velosierp@gmail.com"
echo "  SMTP_PASSWORD=qaasamaktyqqrzet"
echo ""

echo ""
echo "=========================================================================="
echo "✅ CONFIGURATION TERMINÉE !"
echo "=========================================================================="
echo ""
echo "📝 Résumé:"
echo "  • Postfix installé et configuré"
echo "  • Relais vers Gmail activé"
echo "  • Email de test envoyé"
echo ""
echo "🔍 Pour vérifier:"
echo "  • Logs Postfix: tail -f /var/log/postfix.log"
echo "  • Logs mail: tail -f /var/log/maillog"
echo "  • Status: systemctl status postfix"
echo "  • Queue: mailq"
echo ""
echo "🎯 Prochaines étapes:"
echo "  1. Vérifiez que l'email de test est arrivé"
echo "  2. Redémarrez votre backend: pm2 restart velosi-backend"
echo "  3. Testez l'envoi depuis votre application"
echo ""
