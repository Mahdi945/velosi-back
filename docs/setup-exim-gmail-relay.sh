#!/bin/bash
# Configuration d'Exim (cPanel) comme relais SMTP vers Gmail
# Permet d'utiliser Gmail même quand OVH bloque les ports 587/465

echo "=========================================================================="
echo "🔧 CONFIGURATION EXIM (cPanel) COMME RELAIS GMAIL"
echo "=========================================================================="
echo ""

GMAIL_USER="velosierp@gmail.com"
GMAIL_PASS="qaasamaktyqqrzet"

echo "Configuration détectée: cPanel avec Exim"
echo ""
echo "Cette configuration va:"
echo "  1. Configurer Exim pour relayer via Gmail"
echo "  2. Votre backend enverra vers localhost:587"
echo "  3. Exim relayera vers Gmail"
echo ""

# 1. Créer le fichier de configuration pour le smarthost
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Configuration du smarthost Gmail..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Créer le fichier de configuration du smarthost
cat << 'SMARTHOST_CONFIG' | sudo tee /etc/exim.conf.local > /dev/null
# Configuration Exim pour relayer via Gmail
# Route tous les emails via Gmail SMTP

# Définir Gmail comme smarthost
RELAY_TO_SMARTHOST=1
SMARTHOST=smtp.gmail.com::587

# Authentification
SMTP_AUTH=yes
SMTP_AUTH_USER=${quote:velosierp@gmail.com}
SMTP_AUTH_PASS=${quote:qaasamaktyqqrzet}

# TLS
REQUIRE_TLS=yes
SMARTHOST_CONFIG

echo "✓ Configuration smarthost créée"

# 2. Alternative: Configuration manuelle d'Exim
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Backup de la configuration Exim..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f /etc/exim.conf ]; then
    sudo cp /etc/exim.conf /etc/exim.conf.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Backup créé"
else
    echo "⚠️  Fichier /etc/exim.conf non trouvé (normal pour cPanel)"
fi

# 3. Créer le fichier de passwords pour Exim
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Configuration des credentials..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Créer le fichier passwd pour l'authentification SMTP
sudo mkdir -p /etc/exim
echo "smtp.gmail.com:velosierp@gmail.com:qaasamaktyqqrzet" | sudo tee /etc/exim/passwd.client > /dev/null
sudo chmod 600 /etc/exim/passwd.client
echo "✓ Credentials configurés"

# 4. Redémarrer Exim
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Redémarrage d'Exim..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v /scripts/restartsrv_exim &> /dev/null; then
    sudo /scripts/restartsrv_exim
    echo "✓ Exim redémarré (cPanel)"
elif systemctl is-active exim &>/dev/null; then
    sudo systemctl restart exim
    echo "✓ Exim redémarré (systemd)"
elif systemctl is-active exim4 &>/dev/null; then
    sudo systemctl restart exim4
    echo "✓ Exim4 redémarré (systemd)"
else
    echo "⚠️  Service Exim non trouvé"
fi

echo ""
echo "=========================================================================="
echo "⚠️  PROBLÈME: cPanel gère Exim de manière complexe"
echo "=========================================================================="
echo ""
echo "📝 SOLUTION ALTERNATIVE (plus simple et fiable):"
echo ""
echo "Au lieu de configurer Exim, modifiez votre backend pour utiliser"
echo "un tunnel SSH ou un proxy SOCKS vers un serveur qui peut accéder à Gmail."
echo ""
echo "OU MIEUX: Utilisez un service SMTP tiers qui fonctionne:"
echo ""
echo "1️⃣  MAILGUN (recommandé pour OVH):"
echo "   • Gratuit: 5000 emails/mois"
echo "   • Port: 587 ou 2525 (non bloqué)"
echo "   • Inscription: https://www.mailgun.com/"
echo ""
echo "2️⃣  SENDGRID (déjà configuré sur votre VPS):"
echo "   • Gratuit: 100 emails/jour"
echo "   • Port: 2525 (fonctionne!)"
echo "   • Déjà testé: ✅ Connexion OK"
echo ""
echo "3️⃣  AWS SES (si vous avez AWS):"
echo "   • Très bon taux de délivrabilité"
echo "   • Port: 587 ou 2525"
echo ""
echo "4️⃣  DEMANDER À OVH de débloquer Gmail:"
echo "   • Créez un ticket support OVH"
echo "   • Demandez le déblocage des ports 587/465"
echo "   • Délai: 24-48h généralement"
echo ""
echo "=========================================================================="
echo "🎯 RECOMMANDATION:"
echo "=========================================================================="
echo ""
echo "Utilisez MAILGUN avec le port 2525:"
echo ""
echo "1. Inscrivez-vous sur https://www.mailgun.com/"
echo "2. Vérifiez votre domaine (ou utilisez le sandbox)"
echo "3. Obtenez vos credentials SMTP"
echo "4. Dans votre .env:"
echo "   SMTP_HOST=smtp.mailgun.org"
echo "   SMTP_PORT=2525"
echo "   SMTP_USER=postmaster@votre-domaine.mailgun.org"
echo "   SMTP_PASSWORD=votre_password_mailgun"
echo ""
echo "Mailgun utilise le port 2525 qui n'est PAS bloqué par OVH!"
echo ""
