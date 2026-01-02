#!/bin/bash
# Configuration Exim cPanel pour relayer vers Gmail UNIQUEMENT
# Script complet pour contourner le blocage OVH

echo "=========================================================================="
echo "🔧 CONFIGURATION EXIM POUR GMAIL - cPanel/WHM"
echo "=========================================================================="
echo ""

echo "⚠️  Ce script configure Exim pour relayer TOUS les emails via Gmail"
echo ""
echo "✓ Configuration automatique activée"

# Credentials Gmail
GMAIL_USER="velosierp@gmail.com"
GMAIL_PASS="qaasamaktyqqrzet"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Configuration du smarthost Gmail..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Créer le fichier de configuration du smarthost
sudo mkdir -p /etc/exim.conf.d

cat << 'EOF' | sudo tee /etc/exim.conf.d/smarthost_gmail > /dev/null
# Configuration smarthost Gmail
# Ce fichier force Exim à relayer via Gmail

# Définir Gmail comme smarthost pour tous les domaines externes
EOF

echo "route_list = * smtp.gmail.com::587 byname" | sudo tee -a /etc/exim.conf.d/smarthost_gmail > /dev/null

echo "✓ Smarthost configuré"

# Créer le fichier de mot de passe
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Configuration des credentials..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Créer le fichier passwd.client pour l'authentification
echo "smtp.gmail.com:$GMAIL_USER:$GMAIL_PASS" | sudo tee /etc/exim/passwd.client > /dev/null
sudo chmod 600 /etc/exim/passwd.client

echo "✓ Credentials configurés"

# Pour cPanel, on doit utiliser l'API WHM ou modifier via les hooks
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Modification configuration Exim cPanel..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backup de la configuration
if [ -f /etc/exim.conf ]; then
    sudo cp /etc/exim.conf /etc/exim.conf.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Backup créé"
fi

# Créer un hook qui sera exécuté après chaque mise à jour d'Exim par cPanel
sudo mkdir -p /scripts/post_exim_config

cat << 'HOOK_SCRIPT' | sudo tee /scripts/post_exim_config/configure_gmail_relay.sh > /dev/null
#!/bin/bash
# Hook automatique pour forcer le relay Gmail après config cPanel

EXIM_CONF="/etc/exim.conf"

if [ ! -f "$EXIM_CONF" ]; then
    exit 0
fi

# Ajouter la configuration Gmail si elle n'existe pas déjà
if ! grep -q "# GMAIL RELAY CONFIGURATION" "$EXIM_CONF"; then
    
    # Ajouter dans la section routers (avant le premier router)
    sed -i '/^begin routers/a\
\
# GMAIL RELAY CONFIGURATION - AUTO GENERATED\
gmail_relay:\
  driver = manualroute\
  domains = !+local_domains\
  transport = remote_smtp_gmail\
  route_list = * smtp.gmail.com::587 byname\
  host_find_failed = defer\
  same_domain_copy_routing = yes\
  no_more' "$EXIM_CONF"
    
    # Ajouter le transport Gmail
    sed -i '/^begin transports/a\
\
# GMAIL TRANSPORT - AUTO GENERATED\
remote_smtp_gmail:\
  driver = smtp\
  port = 587\
  hosts_require_auth = smtp.gmail.com\
  hosts_require_tls = smtp.gmail.com\
  tls_tempfail_tryclear = false' "$EXIM_CONF"
    
    # Ajouter l'authenticator
    sed -i '/^begin authenticators/a\
\
# GMAIL AUTH - AUTO GENERATED\
gmail_login:\
  driver = plaintext\
  public_name = LOGIN\
  client_send = : velosierp@gmail.com : qaasamaktyqqrzet' "$EXIM_CONF"
    
fi
HOOK_SCRIPT

sudo chmod +x /scripts/post_exim_config/configure_gmail_relay.sh
echo "✓ Hook créé: /scripts/post_exim_config/configure_gmail_relay.sh"

# Exécuter le hook maintenant
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Application de la configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sudo bash /scripts/post_exim_config/configure_gmail_relay.sh
echo "✓ Configuration appliquée"

# Redémarrer Exim
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Redémarrage d'Exim..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v /scripts/restartsrv_exim &> /dev/null; then
    sudo /scripts/restartsrv_exim
    echo "✓ Exim redémarré (cPanel)"
else
    sudo systemctl restart exim 2>/dev/null || sudo service exim restart 2>/dev/null
    echo "✓ Exim redémarré"
fi

sleep 3

# Test de la configuration
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Test de la configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Vérifier qu'Exim fonctionne
if pgrep -x exim > /dev/null; then
    echo "✅ Exim en cours d'exécution"
else
    echo "❌ Exim ne fonctionne pas"
    exit 1
fi

# Test de connexion Gmail
echo ""
echo "Test connexion Gmail depuis le serveur..."
GMAIL_TEST=$(timeout 10 bash -c "echo QUIT | openssl s_client -connect smtp.gmail.com:587 -starttls smtp 2>&1" | grep "Connected")

if [ -n "$GMAIL_TEST" ]; then
    echo "✅ Connexion à Gmail possible"
else
    echo "❌ OVH BLOQUE TOUJOURS GMAIL!"
    echo ""
    echo "⚠️  PROBLÈME: OVH bloque les connexions sortantes vers Gmail"
    echo ""
    echo "📝 SOLUTIONS:"
    echo ""
    echo "1️⃣  SOLUTION IMMÉDIATE: Demander déblocage OVH"
    echo "   → Créez un ticket support OVH"
    echo "   → Demandez le déblocage des ports 587/465"
    echo "   → Délai: 24-48h généralement"
    echo ""
    echo "2️⃣  SOLUTION ALTERNATIVE: Tunnel SSH"
    echo "   → Utilisez un autre serveur comme proxy"
    echo "   → ssh -L 2587:smtp.gmail.com:587 user@autre-serveur"
    echo ""
    echo "3️⃣  SOLUTION TEMPORAIRE: API Gmail directe"
    echo "   → Utilisez l'API Gmail au lieu de SMTP"
    echo "   → OAuth2 + API REST"
    echo ""
    exit 1
fi

echo ""
echo "=========================================================================="
echo "✅ CONFIGURATION TERMINÉE"
echo "=========================================================================="
echo ""
echo "📧 Test d'envoi d'email..."
echo ""

# Envoyer un email de test
echo "Test email depuis VPS via Exim → Gmail - $(date)" | mail -s "Test Exim Gmail Relay" -r "velosierp@gmail.com" velosierp@gmail.com

if [ $? -eq 0 ]; then
    echo "✅ Email de test envoyé"
    echo ""
    echo "📬 Vérifiez votre boîte mail: velosierp@gmail.com"
    echo ""
    echo "📋 Consultez les logs:"
    echo "   tail -f /var/log/exim_mainlog"
    echo ""
else
    echo "❌ Erreur lors de l'envoi du test"
    echo ""
    echo "Vérifiez les logs:"
    echo "   tail -100 /var/log/exim_mainlog"
    echo "   tail -100 /var/log/exim_rejectlog"
fi

echo ""
echo "🎯 Prochaines étapes:"
echo "  1. Vérifiez que l'email de test est arrivé"
echo "  2. Testez depuis votre application Node.js"
echo "  3. Surveillez les logs Exim"
echo ""
