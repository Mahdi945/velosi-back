#!/bin/bash
# Script de diagnostic complet pour les problèmes d'envoi d'emails sur VPS OVH
# Erreur 535 = Authentification SMTP échouée

echo "=================================================="
echo "🔍 DIAGNOSTIC EMAIL VPS OVH - Erreur 535"
echo "=================================================="
echo ""

# 1. Vérifier les ports SMTP
echo "1️⃣  Vérification des ports SMTP..."
echo "-----------------------------------"
echo "Test port 587 (TLS - Gmail):"
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/smtp.gmail.com/587' 2>/dev/null && echo "✅ Port 587 OUVERT" || echo "❌ Port 587 BLOQUÉ"

echo ""
echo "Test port 465 (SSL - Gmail):"
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/smtp.gmail.com/465' 2>/dev/null && echo "✅ Port 465 OUVERT" || echo "❌ Port 465 BLOQUÉ"

echo ""
echo "Test port 25 (SMTP standard - souvent bloqué par OVH):"
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/smtp.gmail.com/25' 2>/dev/null && echo "✅ Port 25 OUVERT" || echo "❌ Port 25 BLOQUÉ (normal sur OVH)"

# 2. Vérifier la connexion à Gmail SMTP
echo ""
echo "2️⃣  Test de connexion SMTP Gmail..."
echo "-----------------------------------"
(echo "QUIT" | openssl s_client -connect smtp.gmail.com:587 -starttls smtp 2>/dev/null | grep "Verify return code") || echo "❌ Impossible de se connecter à Gmail SMTP"

# 3. Vérifier le firewall
echo ""
echo "3️⃣  Vérification du firewall UFW/iptables..."
echo "-----------------------------------"
if command -v ufw &> /dev/null; then
    echo "UFW installé:"
    sudo ufw status | grep -E "(Status|587|465|25)"
else
    echo "UFW non installé"
fi

echo ""
echo "Règles iptables pour ports SMTP:"
sudo iptables -L OUTPUT -n -v | grep -E "(587|465|25)" || echo "Aucune règle spécifique trouvée"

# 4. Vérifier les logs du backend
echo ""
echo "4️⃣  Logs récents du backend (erreurs email)..."
echo "-----------------------------------"
pm2 logs velosi-backend --lines 30 --nostream | grep -i -E "(email|smtp|535|auth)" || echo "Aucune erreur email trouvée dans les logs récents"

# 5. Vérifier les DNS et reverse DNS
echo ""
echo "5️⃣  Vérification DNS et réputation du serveur..."
echo "-----------------------------------"
echo "IP publique du serveur:"
curl -s ifconfig.me
echo ""
echo "Reverse DNS (important pour la réputation):"
host $(curl -s ifconfig.me)

# 6. Tester l'envoi via telnet/openssl
echo ""
echo "6️⃣  Test manuel SMTP..."
echo "-----------------------------------"
echo "Vous pouvez tester manuellement avec:"
echo "  openssl s_client -connect smtp.gmail.com:587 -starttls smtp"
echo "  Puis tapez: EHLO localhost"
echo "  Puis tapez: AUTH LOGIN"

# 7. Vérifier les variables d'environnement
echo ""
echo "7️⃣  Variables d'environnement SMTP (masquées)..."
echo "-----------------------------------"
if [ -f ~/velosi-back/.env ]; then
    echo "Fichier .env trouvé:"
    grep -E "SMTP_" ~/velosi-back/.env | sed 's/=.*/=***masked***/'
else
    echo "❌ Fichier .env non trouvé"
fi

# 8. Recommandations
echo ""
echo "=================================================="
echo "📋 RECOMMANDATIONS POUR CORRIGER L'ERREUR 535"
echo "=================================================="
echo ""
echo "L'erreur 535 = Authentification échouée. Vérifiez:"
echo ""
echo "1. Gmail - Mot de passe d'application:"
echo "   ❌ N'utilisez PAS votre mot de passe Gmail normal"
echo "   ✅ Créez un 'App Password' sur: https://myaccount.google.com/apppasswords"
echo "   → Activez la validation en 2 étapes d'abord"
echo "   → Générez un mot de passe d'application (16 caractères)"
echo "   → Utilisez ce mot de passe dans SMTP_PASSWORD"
echo ""
echo "2. Si ports bloqués par OVH:"
echo "   🔧 Solution A: Utiliser un service SMTP dédié (SendGrid, Mailgun, SES)"
echo "   🔧 Solution B: Demander déblocage ports à OVH (peut prendre 48h)"
echo "   🔧 Solution C: Utiliser un relais SMTP (comme Postfix local)"
echo ""
echo "3. Alternative recommandée pour VPS OVH:"
echo "   ✅ SendGrid (100 emails/jour gratuits)"
echo "      SMTP_HOST=smtp.sendgrid.net"
echo "      SMTP_PORT=587"
echo "      SMTP_USER=apikey"
echo "      SMTP_PASSWORD=<votre_clé_api_sendgrid>"
echo ""
echo "   ✅ AWS SES (si compte AWS)"
echo "      SMTP_HOST=email-smtp.eu-west-1.amazonaws.com"
echo "      SMTP_PORT=587"
echo ""
echo "4. Configuration .env sur le VPS:"
echo "   → Éditez: nano ~/velosi-back/.env"
echo "   → Modifiez SMTP_PASSWORD avec le mot de passe d'application"
echo "   → Redémarrez: pm2 restart velosi-backend"
echo ""
echo "5. Débloquer les ports sortants (si nécessaire):"
echo "   sudo ufw allow out 587/tcp"
echo "   sudo ufw allow out 465/tcp"
echo ""
echo "=================================================="
echo "✅ Diagnostic terminé"
echo "=================================================="
