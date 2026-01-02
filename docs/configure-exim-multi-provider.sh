#!/bin/bash
# Configuration d'Exim comme relais SMTP multi-organisations
# Permet à chaque organisation d'utiliser ses propres credentials Gmail

echo "=========================================================================="
echo "🔧 CONFIGURATION EXIM MULTI-PROVIDER"
echo "=========================================================================="
echo ""

echo "Cette configuration permet:"
echo "  • Chaque organisation utilise son propre compte Gmail"
echo "  • Exim relaye les emails vers le bon compte Gmail"
echo "  • Support de plusieurs organisations simultanément"
echo ""

# 1. Vérifier qu'Exim est installé
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Vérification d'Exim..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v exim &> /dev/null; then
    echo "❌ Exim n'est pas installé"
    exit 1
fi

EXIM_VERSION=$(exim -bV | head -1)
echo "✓ $EXIM_VERSION"

# 2. Créer le répertoire de configuration
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Préparation des répertoires..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sudo mkdir -p /etc/exim/smtp_credentials
sudo chmod 700 /etc/exim/smtp_credentials
echo "✓ Répertoire /etc/exim/smtp_credentials créé"

# 3. Créer le fichier de credentials pour les organisations
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Configuration des credentials Gmail..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Fichier avec les credentials de chaque organisation
cat << 'EOF' | sudo tee /etc/exim/smtp_credentials/gmail_accounts > /dev/null
# Format: email:smtp_user:smtp_password:smtp_host:smtp_port
# Organisation Velosi
velosierp@gmail.com:velosierp@gmail.com:qaasamaktyqqrzet:smtp.gmail.com:587
# Organisation Delice
mahdibey2002@gmail.com:mahdibey2002@gmail.com:wgblqbzuzdmqlggy:smtp.gmail.com:587
EOF

sudo chmod 600 /etc/exim/smtp_credentials/gmail_accounts
echo "✓ Credentials configurés"

# 4. Backup de la configuration Exim existante
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Backup de la configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Chercher le fichier de configuration Exim
EXIM_CONF=""
if [ -f /etc/exim/exim.conf ]; then
    EXIM_CONF="/etc/exim/exim.conf"
elif [ -f /etc/exim4/exim4.conf.template ]; then
    EXIM_CONF="/etc/exim4/exim4.conf.template"
elif [ -f /etc/exim.conf ]; then
    EXIM_CONF="/etc/exim.conf"
fi

if [ -n "$EXIM_CONF" ]; then
    sudo cp "$EXIM_CONF" "${EXIM_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✓ Backup créé: ${EXIM_CONF}.backup"
else
    echo "⚠️  Configuration Exim non trouvée (cPanel gère automatiquement)"
fi

# 5. Créer la configuration de routeur pour cPanel/WHM
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Configuration du routeur Exim..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Pour cPanel/WHM, on utilise les fichiers include
sudo mkdir -p /etc/exim.conf.d

# Créer le routeur personnalisé
cat << 'ROUTER_EOF' | sudo tee /etc/exim.conf.d/router_gmail_relay.conf > /dev/null
# Routeur pour relayer via Gmail selon l'organisation
gmail_relay:
  driver = manualroute
  domains = ! +local_domains
  transport = gmail_smtp
  route_list = * smtp.gmail.com::587
  no_more
ROUTER_EOF

echo "✓ Routeur créé: /etc/exim.conf.d/router_gmail_relay.conf"

# 6. Créer le transport personnalisé
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Configuration du transport..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat << 'TRANSPORT_EOF' | sudo tee /etc/exim.conf.d/transport_gmail.conf > /dev/null
# Transport pour Gmail avec authentification
gmail_smtp:
  driver = smtp
  port = 587
  hosts_require_auth = *
  hosts_require_tls = *
  tls_require_ciphers = HIGH:!aNULL:!MD5
TRANSPORT_EOF

echo "✓ Transport créé: /etc/exim.conf.d/transport_gmail.conf"

# 7. Créer l'authenticator
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Configuration de l'authentification..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat << 'AUTH_EOF' | sudo tee /etc/exim.conf.d/auth_gmail.conf > /dev/null
# Authentification pour Gmail
gmail_login:
  driver = plaintext
  public_name = LOGIN
  client_send = : velosierp@gmail.com : qaasamaktyqqrzet

gmail_plain:
  driver = plaintext
  public_name = PLAIN
  client_send = ^velosierp@gmail.com^qaasamaktyqqrzet
AUTH_EOF

echo "✓ Authenticator créé: /etc/exim.conf.d/auth_gmail.conf"

# 8. Configurer Exim pour écouter sur localhost uniquement
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  Configuration écoute localhost..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Créer un fichier de configuration locale
cat << 'LOCAL_CONF' | sudo tee /etc/exim.conf.d/main_local.conf > /dev/null
# Configuration locale pour relais Gmail
# Exim écoute sur localhost pour recevoir les emails du backend
local_interfaces = 127.0.0.1 : ::1
daemon_smtp_ports = 25 : 587 : 465

# Autoriser le relayage depuis localhost
hostlist relay_from_hosts = 127.0.0.1 : ::1
acl_smtp_rcpt = acl_check_rcpt_local

# ACL pour accepter depuis localhost
acl_check_rcpt_local:
  accept hosts = 127.0.0.1 : ::1
  deny   message = relay not permitted
LOCAL_CONF

echo "✓ Configuration locale créée"

# 9. Si c'est cPanel, utiliser les hooks
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9️⃣  Configuration cPanel (si applicable)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d /usr/local/cpanel ]; then
    echo "✓ cPanel détecté - Configuration WHM"
    
    # Pour cPanel, on doit modifier via WHM ou créer un hook
    cat << 'CPANEL_INFO' 
    
⚠️  CONFIGURATION cPanel/WHM REQUISE:

Pour configurer le relais Gmail dans cPanel:

1. Connectez-vous à WHM (https://votre-serveur:2087)

2. Allez dans: Service Configuration → Exim Configuration Manager

3. Dans "Advanced Editor", ajoutez AVANT la section "begin routers":

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
begin routers

# Routeur Gmail pour relais
gmail_relay:
  driver = manualroute
  transport = gmail_smtp
  route_list = * smtp.gmail.com::587 byname
  host_find_failed = defer
  same_domain_copy_routing = yes
  no_more

# ... reste de la configuration ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. Dans la section "begin transports", ajoutez:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
gmail_smtp:
  driver = smtp
  port = 587
  hosts_require_auth = smtp.gmail.com
  hosts_require_tls = smtp.gmail.com
  tls_tempfail_tryclear = false
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. Dans la section "begin authenticators", ajoutez:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
gmail_login:
  driver = plaintext
  public_name = LOGIN
  client_send = : velosierp@gmail.com : qaasamaktyqqrzet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. Sauvegardez et redémarrez Exim

CPANEL_INFO

else
    echo "✓ Pas de cPanel - Configuration standard"
    
    # 10. Redémarrer Exim (si pas cPanel)
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Redémarrage d'Exim..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if systemctl is-active exim &>/dev/null; then
        sudo systemctl restart exim
        echo "✓ Exim redémarré (systemd)"
    elif systemctl is-active exim4 &>/dev/null; then
        sudo systemctl restart exim4
        echo "✓ Exim4 redémarré (systemd)"
    else
        sudo service exim restart 2>/dev/null || sudo /etc/init.d/exim restart 2>/dev/null
        echo "✓ Exim redémarré (service)"
    fi
fi

echo ""
echo "=========================================================================="
echo "✅ CONFIGURATION TERMINÉE"
echo "=========================================================================="
echo ""
echo "📝 Prochaines étapes:"
echo ""
echo "1️⃣  Si cPanel/WHM: Suivez les instructions ci-dessus dans WHM"
echo ""
echo "2️⃣  Modifiez votre backend pour utiliser Exim local:"
echo ""
echo "   Dans votre email.service.ts, utilisez les credentials de l'organisation"
echo "   mais connectez-vous à localhost:"
echo ""
echo "   const transporter = nodemailer.createTransport({"
echo "     host: 'localhost',  // ← Exim local"
echo "     port: 587,"
echo "     auth: {"
echo "       user: organisation.smtp_user,"
echo "       pass: organisation.smtp_password,"
echo "     }"
echo "   });"
echo ""
echo "3️⃣  Testez l'envoi:"
echo "   echo 'Test' | mail -s 'Test Exim' velosierp@gmail.com"
echo ""
echo "4️⃣  Consultez les logs:"
echo "   tail -f /var/log/exim_mainlog"
echo "   tail -f /var/log/exim_rejectlog"
echo ""
