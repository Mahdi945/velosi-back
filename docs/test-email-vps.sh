#!/bin/bash
# Script pour tester l'envoi d'email sur le VPS avec diagnostic détaillé

echo "=========================================="
echo "TEST DETAILLE ENVOI EMAIL VPS"
echo "=========================================="
echo ""

cd ~/velosi-back

# Vérifier que les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "Installation des dependances..."
    npm install
    echo ""
fi

# Vérifier que le fichier .env existe
if [ ! -f ".env" ]; then
    echo "ERREUR: Fichier .env non trouve !"
    echo "Verifiez que le fichier .env existe dans ~/velosi-back/"
    exit 1
fi

# Créer le fichier de test si nécessaire
cat > test-email-now.js << 'EOFTEST'
const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('Configuration SMTP:');
console.log('  Host:', process.env.SMTP_HOST);
console.log('  Port:', process.env.SMTP_PORT);
console.log('  User:', process.env.SMTP_USER);
console.log('  Password:', process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.slice(-4) : 'NON DEFINI');
console.log('');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  debug: true,
  logger: true,
  tls: {
    rejectUnauthorized: false,
  }
});

console.log('Test de connexion SMTP...');
transporter.verify()
  .then(() => {
    console.log('✓ Connexion SMTP reussie !');
    console.log('Envoi d\'un email de test...');
    
    return transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: 'Test Email VPS - ' + new Date().toLocaleString(),
      text: 'Test reussi !',
      html: '<h2>✓ Email envoye depuis le VPS</h2>',
    });
  })
  .then((info) => {
    console.log('✓ Email envoye avec succes !');
    console.log('  Message ID:', info.messageId);
    process.exit(0);
  })
  .catch((error) => {
    console.log('✗ ERREUR:', error.message);
    if (error.code) console.log('  Code:', error.code);
    if (error.response) console.log('  Response:', error.response);
    
    if (error.message.includes('535')) {
      console.log('');
      console.log('DIAGNOSTIC ERREUR 535:');
      console.log('  → Google bloque probablement l\'IP du VPS');
      console.log('  → Solution: Utiliser SendGrid ou AWS SES');
      console.log('  → Ou activer "Acces moins securise" sur Gmail');
    }
    
    process.exit(1);
  });
EOFTEST

echo "Execution du test..."
echo ""
node test-email-now.js

TEST_RESULT=$?

echo ""
echo "=========================================="
if [ $TEST_RESULT -eq 0 ]; then
    echo "RESULTAT: SUCCES"
    echo "La configuration email fonctionne !"
else
    echo "RESULTAT: ECHEC"
    echo ""
    echo "Le meme mot de passe fonctionne en localhost"
    echo "mais pas sur le VPS ?"
    echo ""
    echo "→ Google bloque probablement l'IP du VPS OVH"
    echo ""
    echo "SOLUTIONS:"
    echo "  1. Activer l'acces depuis le VPS sur Gmail:"
    echo "     https://myaccount.google.com/lesssecureapps"
    echo ""
    echo "  2. Utiliser SendGrid (RECOMMANDE):"
    echo "     bash ~/fix-vps-email.sh → Option 2"
    echo ""
    echo "  3. Utiliser AWS SES"
    echo ""
fi
echo "=========================================="

# Nettoyer
rm -f test-email-now.js
