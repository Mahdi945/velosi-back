#!/bin/bash
# Test d'envoi d'email réel avec les credentials Gmail de Velosi

GMAIL_USER="velosierp@gmail.com"
GMAIL_PASS="qaasamaktyqqrzet"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"

echo "=========================================="
echo "TEST ENVOI EMAIL GMAIL - Organisation Velosi"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  SMTP: $SMTP_HOST:$SMTP_PORT"
echo "  User: $GMAIL_USER"
echo "  Pass: ${GMAIL_PASS:0:4}************${GMAIL_PASS: -4}"
echo ""

# Vérifier que les ports sont libres
echo "1. Vérification des ports SMTP locaux..."
PORTS_USED=$(ss -tuln | grep -E ":(25|587|465) ")
if [ -z "$PORTS_USED" ]; then
    echo "✅ Aucun service local n'intercepte les ports SMTP"
else
    echo "❌ ATTENTION: Services locaux encore actifs:"
    echo "$PORTS_USED"
    exit 1
fi

echo ""
echo "2. Test de connexion à Gmail..."
GMAIL_CONNECT=$(timeout 10 bash -c "echo QUIT | openssl s_client -connect smtp.gmail.com:587 -starttls smtp 2>&1" | grep "Connected")
if [ -n "$GMAIL_CONNECT" ]; then
    echo "✅ Connexion à Gmail réussie"
    echo "$GMAIL_CONNECT"
else
    echo "❌ Impossible de se connecter à Gmail"
    exit 1
fi

echo ""
echo "3. Test d'authentification Gmail..."

# Encoder en base64
GMAIL_USER_B64=$(echo -n "$GMAIL_USER" | base64 -w 0)
GMAIL_PASS_B64=$(echo -n "$GMAIL_PASS" | base64 -w 0)

AUTH_RESULT=$(
    (
        echo "EHLO localhost"
        sleep 1
        echo "AUTH LOGIN"
        sleep 1
        echo "$GMAIL_USER_B64"
        sleep 1
        echo "$GMAIL_PASS_B64"
        sleep 1
        echo "QUIT"
    ) | timeout 15 openssl s_client -connect smtp.gmail.com:587 -starttls smtp -quiet 2>&1
)

echo "Résultat authentification:"
echo "$AUTH_RESULT" | grep -E "250|235|535|534|554"

if echo "$AUTH_RESULT" | grep -q "235.*Accepted"; then
    echo ""
    echo "✅ AUTHENTIFICATION RÉUSSIE !"
else
    echo ""
    echo "❌ Authentification échouée"
    if echo "$AUTH_RESULT" | grep -q "535"; then
        echo "   Erreur 535 - App Password invalide ou IP bloquée"
    fi
    exit 1
fi

echo ""
echo "4. Test d'envoi d'email via Node.js..."
echo ""

# Créer un script Node.js pour tester l'envoi
cat > /tmp/test-email.js << 'ENDJS'
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'velosierp@gmail.com',
    pass: 'qaasamaktyqqrzet',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const mailOptions = {
  from: '"Velosi ERP" <velosierp@gmail.com>',
  to: 'velosierp@gmail.com',
  subject: 'Test Email - VPS Velosi',
  html: `
    <h2>Test d'envoi d'email depuis le VPS</h2>
    <p>Cet email confirme que l'envoi fonctionne correctement.</p>
    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Serveur:</strong> VPS OVH</p>
    <p><strong>Status:</strong> ✅ Email envoyé avec succès</p>
  `,
};

console.log('📧 Envoi de l\'email de test...');
console.log('   De:', mailOptions.from);
console.log('   À:', mailOptions.to);
console.log('');

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ ERREUR:', error.message);
    process.exit(1);
  } else {
    console.log('✅ EMAIL ENVOYÉ AVEC SUCCÈS !');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('');
    console.log('🎉 Le système d\'envoi d\'emails fonctionne correctement !');
    process.exit(0);
  }
});
ENDJS

# Exécuter le script Node.js
cd ~/velosi-back
node /tmp/test-email.js

# Cleanup
rm /tmp/test-email.js

echo ""
echo "=========================================="
echo "✅ Test terminé !"
echo "=========================================="
