#!/bin/bash
# Script de correction automatique pour les problèmes d'email sur VPS OVH

echo "=================================================="
echo "🔧 CORRECTION CONFIGURATION EMAIL VPS"
echo "=================================================="
echo ""

# Backup du .env actuel
if [ -f ~/velosi-back/.env ]; then
    cp ~/velosi-back/.env ~/velosi-back/.env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup .env créé"
fi

# Menu de choix
echo "Choisissez votre solution:"
echo "1) Utiliser Gmail avec App Password (recommandé si vous avez déjà un App Password)"
echo "2) Configurer SendGrid (gratuit, 100 emails/jour)"
echo "3) Configurer AWS SES"
echo "4) Débloquer les ports firewall seulement"
echo "5) Tester la configuration actuelle"
echo ""
read -p "Votre choix (1-5): " choice

case $choice in
    1)
        echo ""
        echo "📧 Configuration Gmail avec App Password"
        echo "----------------------------------------"
        echo "IMPORTANT: Vous devez d'abord créer un App Password sur:"
        echo "https://myaccount.google.com/apppasswords"
        echo ""
        read -p "Votre email Gmail: " gmail_email
        read -p "Votre App Password (16 caractères): " gmail_app_password
        
        # Mise à jour du .env
        sed -i "s/SMTP_HOST=.*/SMTP_HOST=smtp.gmail.com/" ~/velosi-back/.env
        sed -i "s/SMTP_PORT=.*/SMTP_PORT=587/" ~/velosi-back/.env
        sed -i "s/SMTP_SECURE=.*/SMTP_SECURE=false/" ~/velosi-back/.env
        sed -i "s/SMTP_USER=.*/SMTP_USER=${gmail_email}/" ~/velosi-back/.env
        sed -i "s/SMTP_PASSWORD=.*/SMTP_PASSWORD=${gmail_app_password}/" ~/velosi-back/.env
        sed -i "s/SMTP_FROM=.*/SMTP_FROM=${gmail_email}/" ~/velosi-back/.env
        
        echo "✅ Configuration Gmail mise à jour"
        ;;
        
    2)
        echo ""
        echo "📧 Configuration SendGrid"
        echo "----------------------------------------"
        echo "1. Créez un compte gratuit sur: https://sendgrid.com"
        echo "2. Allez dans Settings > API Keys"
        echo "3. Créez une nouvelle API Key avec permission 'Mail Send'"
        echo ""
        read -p "Votre API Key SendGrid: " sendgrid_key
        read -p "Votre email expéditeur vérifié sur SendGrid: " sendgrid_from
        
        # Mise à jour du .env
        sed -i "s/SMTP_HOST=.*/SMTP_HOST=smtp.sendgrid.net/" ~/velosi-back/.env
        sed -i "s/SMTP_PORT=.*/SMTP_PORT=587/" ~/velosi-back/.env
        sed -i "s/SMTP_SECURE=.*/SMTP_SECURE=false/" ~/velosi-back/.env
        sed -i "s/SMTP_USER=.*/SMTP_USER=apikey/" ~/velosi-back/.env
        sed -i "s/SMTP_PASSWORD=.*/SMTP_PASSWORD=${sendgrid_key}/" ~/velosi-back/.env
        sed -i "s/SMTP_FROM=.*/SMTP_FROM=${sendgrid_from}/" ~/velosi-back/.env
        
        echo "✅ Configuration SendGrid mise à jour"
        ;;
        
    3)
        echo ""
        echo "📧 Configuration AWS SES"
        echo "----------------------------------------"
        read -p "Région AWS (ex: eu-west-1): " aws_region
        read -p "SMTP Username AWS SES: " aws_user
        read -p "SMTP Password AWS SES: " aws_password
        read -p "Email expéditeur vérifié: " aws_from
        
        # Mise à jour du .env
        sed -i "s/SMTP_HOST=.*/SMTP_HOST=email-smtp.${aws_region}.amazonaws.com/" ~/velosi-back/.env
        sed -i "s/SMTP_PORT=.*/SMTP_PORT=587/" ~/velosi-back/.env
        sed -i "s/SMTP_SECURE=.*/SMTP_SECURE=false/" ~/velosi-back/.env
        sed -i "s/SMTP_USER=.*/SMTP_USER=${aws_user}/" ~/velosi-back/.env
        sed -i "s/SMTP_PASSWORD=.*/SMTP_PASSWORD=${aws_password}/" ~/velosi-back/.env
        sed -i "s/SMTP_FROM=.*/SMTP_FROM=${aws_from}/" ~/velosi-back/.env
        
        echo "✅ Configuration AWS SES mise à jour"
        ;;
        
    4)
        echo ""
        echo "🔓 Déblocage des ports firewall..."
        echo "----------------------------------------"
        
        # Vérifier si UFW est installé
        if command -v ufw &> /dev/null; then
            sudo ufw allow out 587/tcp
            sudo ufw allow out 465/tcp
            sudo ufw allow out 25/tcp
            sudo ufw reload
            echo "✅ Ports 587, 465, 25 autorisés en sortie (UFW)"
        else
            # Utiliser iptables directement
            sudo iptables -A OUTPUT -p tcp --dport 587 -j ACCEPT
            sudo iptables -A OUTPUT -p tcp --dport 465 -j ACCEPT
            sudo iptables -A OUTPUT -p tcp --dport 25 -j ACCEPT
            sudo iptables-save > /etc/iptables/rules.v4
            echo "✅ Ports 587, 465, 25 autorisés en sortie (iptables)"
        fi
        ;;
        
    5)
        echo ""
        echo "🧪 Test de la configuration actuelle..."
        echo "----------------------------------------"
        
        # Créer un script Node.js de test
        cat > /tmp/test-email.js << 'EOFTEST'
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('📧 Configuration SMTP:');
  console.log('  Host:', process.env.SMTP_HOST);
  console.log('  Port:', process.env.SMTP_PORT);
  console.log('  User:', process.env.SMTP_USER);
  console.log('  From:', process.env.SMTP_FROM);
  console.log('');
  
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    console.log('🔍 Vérification de la connexion SMTP...');
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie !');
    
    console.log('');
    console.log('📨 Envoi d\'un email de test...');
    const info = await transporter.sendMail({
      from: `"Test VPS" <${process.env.SMTP_FROM}>`,
      to: process.env.SMTP_USER,
      subject: 'Test Email VPS - ' + new Date().toLocaleString(),
      text: 'Si vous recevez cet email, la configuration SMTP fonctionne !',
      html: '<b>✅ Configuration SMTP fonctionnelle !</b><p>Email envoyé depuis le VPS.</p>',
    });
    
    console.log('✅ Email envoyé avec succès !');
    console.log('   Message ID:', info.messageId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code) console.error('   Code:', error.code);
    if (error.command) console.error('   Commande:', error.command);
    process.exit(1);
  }
}

testEmail();
EOFTEST

        cd ~/velosi-back
        node /tmp/test-email.js
        rm /tmp/test-email.js
        
        echo ""
        read -p "Le test a-t-il réussi ? (o/n): " test_ok
        if [ "$test_ok" != "o" ]; then
            echo ""
            echo "❌ Le test a échoué. Vérifiez:"
            echo "   1. Votre mot de passe d'application Gmail"
            echo "   2. Les ports ne sont pas bloqués par OVH"
            echo "   3. Les logs: pm2 logs velosi-backend"
        fi
        ;;
        
    *)
        echo "❌ Choix invalide"
        exit 1
        ;;
esac

# Redémarrer le backend si configuration modifiée
if [ "$choice" != "5" ] && [ "$choice" != "4" ]; then
    echo ""
    echo "🔄 Redémarrage du backend..."
    cd ~/velosi-back
    pm2 restart velosi-backend --update-env
    sleep 3
    pm2 logs velosi-backend --lines 10 --nostream
fi

echo ""
echo "=================================================="
echo "✅ Terminé !"
echo "=================================================="
echo ""
echo "Pour tester l'envoi d'email:"
echo "  1. Vérifiez les logs: pm2 logs velosi-backend"
echo "  2. Testez depuis votre application"
echo "  3. Relancez ce script avec l'option 5 pour tester"
echo ""
echo "Si le problème persiste:"
echo "  → Vérifiez que vous utilisez un App Password (pas votre mot de passe Gmail)"
echo "  → Contactez OVH pour vérifier si les ports SMTP sont bloqués"
echo "  → Envisagez d'utiliser SendGrid (gratuit, fiable sur VPS)"
echo ""
